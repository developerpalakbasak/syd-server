import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { createHmac, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Admin, AdminDocument, AdminRole } from './schemas/admin.schema.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { UpdateAdminDto } from './dto/update-admin.dto.js';
import { QueryAdminDto } from './dto/query-admin.dto.js';
import { LoginAdminDto } from './dto/login-admin.dto.js';

// JWT payload structure for authenticated administrators
export interface AdminJwtPayload {
  sub?: string;
  email: string;
  role: string;
  name: string;
  type?: 'access' | 'refresh';
}

// Result of login or token refresh operations
export interface AdminAuthResult {
  admin: AdminDocument;
  accessToken: string;
  refreshToken: string;
  accessCookieMaxAge: number;
  refreshCookieMaxAge: number;
}

// Safely strips inline comments (e.g. "# In Minutes") from .env values
function cleanEnvValue(val?: string | number): string {
  if (val === undefined || val === null) return '';
  return String(val).split('#')[0].trim();
}

// Hashes a plain-text password using HMAC-SHA256 with BCRYPT_SECRET as the secret key
export function hashPassword(password: string, secret?: string): string {
  const hashSecret =
    secret || process.env.BCRYPT_SECRET || 'e02aae1446705f422aadbc3c5bd92749';
  return createHmac('sha256', hashSecret).update(password).digest('hex');
}

// Verifies a plain-text password against a stored hash using BCRYPT_SECRET
export function verifyPassword(
  password: string,
  storedHash: string,
  secret?: string,
): boolean {
  try {
    const computed = hashPassword(password, secret);
    return timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

// Helper to escape special regex characters for search queries
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Safely parses duration strings (e.g. "1d", "7d", "15m", "1h", "15s") into milliseconds
export function parseDurationMs(val?: string | number, defaultMs = 24 * 60 * 60 * 1000): number {
  if (val === undefined || val === null) return defaultMs;
  const cleaned = String(val).split('#')[0].trim().toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)?$/);
  if (!match) {
    const num = parseFloat(cleaned);
    return isNaN(num) || num <= 0 ? defaultMs : num * 1000;
  }
  const amount = parseFloat(match[1]);
  const unit = match[2] || 's';
  switch (unit) {
    case 'ms': return amount;
    case 's': return amount * 1000;
    case 'm': return amount * 60 * 1000;
    case 'h': return amount * 60 * 60 * 1000;
    case 'd': return amount * 24 * 60 * 60 * 1000;
    case 'w': return amount * 7 * 24 * 60 * 60 * 1000;
    case 'y': return amount * 365 * 24 * 60 * 60 * 1000;
    default: return defaultMs;
  }
}

// Service managing administrative user accounts (Admin and Manager roles)
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
    private readonly configService: ConfigService,
  ) { }

  private getPasswordSecret(): string {
    return (
      cleanEnvValue(this.configService.get('BCRYPT_SECRET')) ||
      process.env.BCRYPT_SECRET ||
      'e02aae1446705f422aadbc3c5bd92749'
    );
  }

  getJwtSecret(): string {
    return (
      cleanEnvValue(this.configService.get('JWT_SECRET')) ||
      process.env.JWT_SECRET ||
      'd641a32b4da8a1cd5f915b536c4af85b'
    );
  }

  getAccessTokenValidity(): string {
    return cleanEnvValue(this.configService.get('ACCESS_TOKEN_VALIDITY')) || '15m';
  }

  getRefreshTokenValidity(): string {
    return cleanEnvValue(this.configService.get('REFRESH_TOKEN_VALIDITY')) || '7d';
  }

  // Parses ACCESS_TOKEN_VALIDITY (e.g. "15m") into milliseconds
  getAccessValidityMs(): number {
    return parseDurationMs(this.getAccessTokenValidity(), 15 * 60 * 1000);
  }

  // Parses REFRESH_TOKEN_VALIDITY (e.g. "7d") into milliseconds
  getRefreshValidityMs(): number {
    return parseDurationMs(this.getRefreshTokenValidity(), 7 * 24 * 60 * 60 * 1000);
  }

  // Cookie maxAge for accessToken derived from ACCESS_TOKEN_VALIDITY
  getAccessCookieMaxAge(): number {
    return this.getAccessValidityMs();
  }

  // Cookie maxAge for refreshToken derived from REFRESH_TOKEN_VALIDITY
  getRefreshCookieMaxAge(): number {
    return this.getRefreshValidityMs();
  }

  // Computes the raw hash of a MongoDB _id to use as a secure refresh token (not a JWT)
  hashMongoId(id: string): string {
    return createHmac('sha256', this.getJwtSecret())
      .update(id)
      .digest('hex');
  }

  // Generates a signed access token JWT without _id / sub
  generateAccessToken(admin: AdminDocument): string {
    const payload: AdminJwtPayload = {
      email: admin.email,
      role: admin.role,
      name: admin.name,
      type: 'access',
    };

    return jwt.sign(
      payload,
      this.getJwtSecret(),
      { expiresIn: this.getAccessTokenValidity() as jwt.SignOptions['expiresIn'] },
    );
  }

  // Authenticates an administrator or manager and returns generated JWT tokens with cookie validity settings
  async login(loginDto: LoginAdminDto): Promise<AdminAuthResult> {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const admin = await this.adminModel
      .findOne({ email: normalizedEmail })
      .select('+password')
      .exec();

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = verifyPassword(
      loginDto.password,
      admin.password,
      this.getPasswordSecret(),
    );
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException(
        'Your administrator account has been deactivated. Please contact dispatch.',
      );
    }

    // Update last login timestamp
    admin.lastLoginAt = new Date();

    const accessToken = this.generateAccessToken(admin);
    const refreshToken = this.hashMongoId(admin._id.toString());
    const refreshValidityMs = this.getRefreshValidityMs();

    // Store raw hash refreshToken and 7-day expiration timestamp in MongoDB
    admin.refreshToken = refreshToken;
    admin.refreshTokenExpiresAt = new Date(Date.now() + refreshValidityMs);
    await admin.save();

    const sanitizedAdmin = await this.findById(admin._id.toString());

    return {
      admin: sanitizedAdmin,
      accessToken,
      refreshToken,
      accessCookieMaxAge: this.getAccessCookieMaxAge(),
      refreshCookieMaxAge: this.getRefreshCookieMaxAge(),
    };
  }

  // Refreshes access and refresh tokens using a valid raw hash refresh token stored in MongoDB
  async refreshTokens(refreshToken?: string): Promise<AdminAuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let admin = await this.adminModel
      .findOne({ refreshToken })
      .select('+refreshToken +refreshTokenExpiresAt')
      .exec();

    // Backwards-compatibility for existing JWT refresh tokens
    if (!admin) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          this.getJwtSecret(),
        ) as AdminJwtPayload;
        if (decoded?.sub) {
          admin = await this.adminModel
            .findById(decoded.sub)
            .select('+refreshToken +refreshTokenExpiresAt')
            .exec();
        }
      } catch {
        // Not a valid legacy JWT
      }
    }

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if the refreshToken has expired (older than 7 days)
    if (
      admin.refreshTokenExpiresAt &&
      admin.refreshTokenExpiresAt.getTime() < Date.now()
    ) {
      admin.refreshToken = null;
      admin.refreshTokenExpiresAt = null;
      await admin.save();
      throw new UnauthorizedException(
        'Refresh token has expired. Please log in again.',
      );
    }

    const newAccessToken = this.generateAccessToken(admin);
    const newRefreshToken = this.hashMongoId(admin._id.toString());
    const refreshValidityMs = this.getRefreshValidityMs();

    // Rotate/extend refreshToken validity for another 7 days
    admin.refreshToken = newRefreshToken;
    admin.refreshTokenExpiresAt = new Date(Date.now() + refreshValidityMs);
    await admin.save();

    const sanitizedAdmin = await this.findById(admin._id.toString());

    return {
      admin: sanitizedAdmin,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessCookieMaxAge: this.getAccessCookieMaxAge(),
      refreshCookieMaxAge: this.getRefreshCookieMaxAge(),
    };
  }

  // Invalidates a refresh token in MongoDB on logout
  async clearRefreshToken(refreshToken: string): Promise<void> {
    try {
      await this.adminModel
        .updateOne(
          { refreshToken },
          { $set: { refreshToken: null, refreshTokenExpiresAt: null } },
        )
        .exec();
    } catch {
      // Ignore if not found
    }
  }

  // Creates a new administrative user with a password hashed using BCRYPT_SECRET
  async create(createAdminDto: CreateAdminDto): Promise<AdminDocument> {
    const normalizedEmail = createAdminDto.email.trim().toLowerCase();

    const existing = await this.adminModel.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      throw new ConflictException(
        `An administrator with email "${normalizedEmail}" already exists`,
      );
    }

    const hashedPassword = hashPassword(
      createAdminDto.password,
      this.getPasswordSecret(),
    );

    const createdAdmin = new this.adminModel({
      name: createAdminDto.name,
      email: normalizedEmail,
      password: hashedPassword,
      role: createAdminDto.role || AdminRole.ADMIN,
      phone: createAdminDto.phone || '',
      isActive:
        createAdminDto.isActive !== undefined ? createAdminDto.isActive : true,
    });

    const saved = await createdAdmin.save();
    // Return sanitized document without password
    return this.findById(saved._id.toString());
  }

  // Retrieves all administrative accounts with optional search, role, status filtering and pagination
  async findAll(query?: QueryAdminDto) {
    const filter: Record<string, any> = {};

    if (query?.role) {
      filter.role = query.role;
    }

    if (query?.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query?.search?.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      const regex = new RegExp(sanitized, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const [admins, total] = await Promise.all([
      this.adminModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.adminModel.countDocuments(filter).exec(),
    ]);

    return {
      admins,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // Finds a single admin/manager by MongoDB ObjectId
  async findById(id: string): Promise<AdminDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid administrator ID: "${id}"`);
    }

    const admin = await this.adminModel.findById(id).select('-password').exec();
    if (!admin) {
      throw new NotFoundException(`Administrator with ID "${id}" was not found`);
    }

    return admin;
  }

  // Finds an admin by email; optionally includes the hashed password (used for authentication workflows)
  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<AdminDocument | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const query = this.adminModel.findOne({ email: normalizedEmail });

    if (includePassword) {
      query.select('+password');
    }

    return query.exec();
  }

  // Updates an administrative user's details, role, or password
  async update(id: string, updateAdminDto: UpdateAdminDto): Promise<AdminDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid administrator ID: "${id}"`);
    }

    const admin = await this.adminModel.findById(id).exec();
    if (!admin) {
      throw new NotFoundException(`Administrator with ID "${id}" was not found`);
    }

    if (updateAdminDto.email) {
      const normalizedEmail = updateAdminDto.email.trim().toLowerCase();
      if (normalizedEmail !== admin.email) {
        const duplicate = await this.adminModel
          .findOne({ email: normalizedEmail })
          .exec();
        if (duplicate) {
          throw new ConflictException(
            `An administrator with email "${normalizedEmail}" already exists`,
          );
        }
        admin.email = normalizedEmail;
      }
    }

    if (updateAdminDto.password) {
      admin.password = hashPassword(
        updateAdminDto.password,
        this.getPasswordSecret(),
      );
    }

    if (updateAdminDto.name !== undefined) admin.name = updateAdminDto.name;
    if (updateAdminDto.role !== undefined) admin.role = updateAdminDto.role;
    if (updateAdminDto.phone !== undefined) admin.phone = updateAdminDto.phone;
    if (updateAdminDto.isActive !== undefined) admin.isActive = updateAdminDto.isActive;

    await admin.save();
    return this.findById(id);
  }

  // Deletes an admin/manager by ID
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid administrator ID: "${id}"`);
    }

    const deleted = await this.adminModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Administrator with ID "${id}" was not found`);
    }

    return {
      success: true,
      message: `Administrator "${deleted.name}" (${deleted.email}) deleted successfully`,
    };
  }

  // Utility to seed initial default admin if database collection is empty
  async seedInitialAdmin() {
    const count = await this.adminModel.countDocuments().exec();
    if (count > 0) {
      return {
        success: true,
        message: `Admin collection already initialized with ${count} record(s).`,
      };
    }

    const defaultAdmin = await this.create({
      name: 'System Administrator',
      email: 'admin@sydtransport.com.au',
      password: 'AdminPassword123!',
      role: AdminRole.ADMIN,
      phone: '+61 400 000 000',
      isActive: true,
    });

    const defaultManager = await this.create({
      name: 'Operations Manager',
      email: 'manager@sydtransport.com.au',
      password: 'ManagerPassword123!',
      role: AdminRole.MANAGER,
      phone: '+61 400 111 222',
      isActive: true,
    });

    return {
      success: true,
      message: 'Default admin and manager accounts seeded successfully',
      seeded: [defaultAdmin, defaultManager],
    };
  }
}
