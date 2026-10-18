import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './schemas/admin.schema.js';
import { AdminService, AdminJwtPayload } from './admin.service.js';

// Extends Express Request to include authenticated admin (either full document or decoded token claims) and optional fresh access token
export interface AuthenticatedAdmin {
  _id?: string;
  email: string;
  role: string;
  name: string;
  isActive?: boolean;
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminDocument | AuthenticatedAdmin;
  accessToken?: string;
}

// Middleware guarding administrative routes; validates access token, auto-renews via refresh token if expired, or rejects with 401
@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
    private readonly adminService: AdminService,
  ) { }

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Skip public authentication endpoints (login, seed, and explicit refresh-token)
    const path = req.path || req.originalUrl || req.url;
    if (
      req.method === 'POST' &&
      (path.endsWith('/login') ||
        path.endsWith('/seed') ||
        path.endsWith('/refresh-token'))
    ) {
      return next();
    }

    const cookies = req.cookies as Record<string, string> | undefined;
    const accessToken =
      cookies?.accessToken ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const refreshToken =
      cookies?.refreshToken ||
      (req.headers['x-refresh-token'] as string | undefined);

    // 1. If accessToken is available, verify and decode it without hitting the database (zero DB queries)
    if (accessToken) {
      try {
        const decoded = jwt.verify(
          accessToken,
          this.adminService.getJwtSecret(),
        ) as AdminJwtPayload;

        if (decoded && decoded.email) {
          req.admin = {
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
            isActive: true,
            ...(decoded.sub ? { _id: decoded.sub } : {}),
          };
          req.accessToken = accessToken;
          return next();
        }
      } catch (err) {
        // Access token is expired or invalid; fall through to verify refreshToken
      }
    }

    // 2. If accessToken is not available or expired, verify refreshToken
    if (refreshToken) {
      let admin = await this.adminModel
        .findOne({ refreshToken })
        .select('-password +refreshTokenExpiresAt')
        .exec();

      // Backwards compatibility for existing legacy JWT refresh tokens
      if (!admin) {
        try {
          const decoded = jwt.verify(
            refreshToken,
            this.adminService.getJwtSecret(),
          ) as AdminJwtPayload;
          if (decoded?.sub) {
            admin = await this.adminModel
              .findById(decoded.sub)
              .select('-password +refreshTokenExpiresAt')
              .exec();
          }
        } catch {
          // Not a valid legacy JWT either
        }
      }

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException(
          'Administrator account not found or deactivated',
        );
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

      // Generate a fresh access token (valid for 1 day from ACCESS_TOKEN_VALIDITY)
      const newAccessToken = this.adminService.generateAccessToken(admin);

      // Slide/rotate refreshToken: extend validity back to 7 days from now
      const refreshValidityMs = this.adminService.getRefreshValidityMs();
      const newRefreshToken = this.adminService.hashMongoId(
        admin._id.toString(),
      );
      admin.refreshToken = newRefreshToken;
      admin.refreshTokenExpiresAt = new Date(Date.now() + refreshValidityMs);
      await admin.save();

      // Provide updated cookies: accessToken (1 day) and renewed refreshToken (7 days)
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: this.adminService.getAccessCookieMaxAge(),
        path: '/',
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: this.adminService.getRefreshCookieMaxAge(),
        path: '/',
      });

      req.admin = admin;
      req.accessToken = newAccessToken;
      return next();
    }

    // 3. If refreshToken is not available, return unauthenticated
    throw new UnauthorizedException('Authentication token missing or expired');
  }
}
