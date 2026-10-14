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
  sub: string;
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

// Service managing administrative user accounts (Admin and Manager roles)
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
    private readonly configService: ConfigService,
  ) {}

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
    return cleanEnvValue(this.configService.get('ACCESS_TOKEN_VALIDITY')) || '1d';
  }

  getRefreshTokenValidity(): string {
    return cleanEnvValue(this.configService.get('REFRESH_TOKEN_VALIDITY')) || '15d';
  }

  // Parses ACCESS_COOKIES_VALIDITY in minutes (default 15 minutes) into milliseconds
  getAccessCookieMaxAge(): number {
    const raw = cleanEnvValue(this.configService.get('ACCESS_COOKIES_VALIDITY'));
    const minutes = raw ? parseInt(raw, 10) : 15;
    return (isNaN(minutes) || minutes <= 0 ? 15 : minutes) * 60 * 1000;
  }

  // Parses REFRESH_COOKIES_VALIDITY in days (default 1 day) into milliseconds
  getRefreshCookieMaxAge(): number {
    const raw = cleanEnvValue(this.configService.get('REFRESH_COOKIES_VALIDITY'));
    const days = raw ? parseInt(raw, 10) : 1;
    return (isNaN(days) || days <= 0 ? 1 : days) * 24 * 60 * 60 * 1000;
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
    await admin.save();

    const payload: AdminJwtPayload = {
      sub: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      name: admin.name,
    };

    const jwtSecret = this.getJwtSecret();
    const accessValidity = this.getAccessTokenValidity();
    const refreshValidity = this.getRefreshTokenValidity();

    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      jwtSecret,
      { expiresIn: accessValidity as jwt.SignOptions['expiresIn'] },
    );
    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      jwtSecret,
      { expiresIn: refreshValidity as jwt.SignOptions['expiresIn'] },
    );

    const sanitizedAdmin = await this.findById(admin._id.toString());

    return {
      admin: sanitizedAdmin,
      accessToken,
      refreshToken,
      accessCookieMaxAge: this.getAccessCookieMaxAge(),
      refreshCookieMaxAge: this.getRefreshCookieMaxAge(),
    };
  }

  // Resolves the authenticated admin from an access token
  async getProfileFromToken(token?: string): Promise<AdminDocument> {
    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    try {
      const decoded = jwt.verify(
        token,
        this.getJwtSecret(),
      ) as AdminJwtPayload;

      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const admin = await this.adminModel.findById(decoded.sub).select('-password').exec();
      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('Administrator account not found or deactivated');
      }

      return admin;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  // Refreshes access and refresh tokens using a valid refresh token
  async refreshTokens(refreshToken?: string): Promise<AdminAuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        this.getJwtSecret(),
      ) as AdminJwtPayload;

      if (!decoded || !decoded.sub || decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const admin = await this.adminModel.findById(decoded.sub).exec();
      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('Administrator account not found or deactivated');
      }

      const payload: AdminJwtPayload = {
        sub: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        name: admin.name,
      };

      const jwtSecret = this.getJwtSecret();
      const accessValidity = this.getAccessTokenValidity();
      const refreshValidity = this.getRefreshTokenValidity();

      const newAccessToken = jwt.sign(
        { ...payload, type: 'access' },
        jwtSecret,
        { expiresIn: accessValidity as jwt.SignOptions['expiresIn'] },
      );
      const newRefreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        jwtSecret,
        { expiresIn: refreshValidity as jwt.SignOptions['expiresIn'] },
      );

      const sanitizedAdmin = await this.findById(admin._id.toString());

      return {
        admin: sanitizedAdmin,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessCookieMaxAge: this.getAccessCookieMaxAge(),
        refreshCookieMaxAge: this.getRefreshCookieMaxAge(),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
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
