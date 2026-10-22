import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminService } from './admin.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { UpdateAdminDto } from './dto/update-admin.dto.js';
import { QueryAdminDto } from './dto/query-admin.dto.js';
import { LoginAdminDto } from './dto/login-admin.dto.js';
import type { AuthenticatedRequest } from './admin-auth.middleware.js';

// Controller managing administrative staff accounts (Admin and Manager roles)
@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // POST /api/v1/admins/login - Authenticates admin/manager and sets accessToken and refreshToken cookies
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginAdminDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminService.login(loginDto);
    const isProduction = process.env.NODE_ENV === 'production';

    // Store accessToken in secure cookie with ACCESS_COOKIES_VALIDITY
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: result.accessCookieMaxAge,
      path: '/',
    });

    // Store refreshToken in secure cookie with REFRESH_COOKIES_VALIDITY
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: result.refreshCookieMaxAge,
      path: '/',
    });

    return {
      success: true,
      message: 'Login successful',
      admin: result.admin,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  // POST /api/v1/admins/logout - Clears accessToken and refreshToken cookies
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refreshToken;
    if (refreshToken) {
      await this.adminService.clearRefreshToken(refreshToken);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
    };

    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  // GET /api/v1/admins/me - Returns the authenticated administrator's profile (guarded and resolved by AdminAuthMiddleware)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      admin: req.admin,
    };
  }

  // POST /api/v1/admins/refresh-token - Issues fresh tokens using a valid refreshToken cookie or payload
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyRefreshToken?: string,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refreshToken || bodyRefreshToken;
    const result = await this.adminService.refreshTokens(refreshToken);
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: result.accessCookieMaxAge,
      path: '/',
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: result.refreshCookieMaxAge,
      path: '/',
    });

    return {
      success: true,
      message: 'Tokens refreshed successfully',
      admin: result.admin,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  // POST /api/v1/admins - Creates a new admin or manager user
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAdminDto: CreateAdminDto) {
    const admin = await this.adminService.create(createAdminDto);
    return {
      success: true,
      message: `${admin.role === 'manager' ? 'Manager' : 'Admin'} account created successfully`,
      admin,
    };
  }

  // GET /api/v1/admins - Lists administrative accounts with search and role filters
  @Get()
  async findAll(@Query() query: QueryAdminDto) {
    const result = await this.adminService.findAll(query);
    return {
      success: true,
      ...result,
    };
  }

  // POST /api/v1/admins/seed - Seeds default admin and manager accounts if collection is empty
  @Post('seed')
  async seed() {
    return this.adminService.seedInitialAdmin();
  }

  // GET /api/v1/admins/drivers - Lists drivers with optional query/search
  @Get('drivers')
  async getDrivers(@Query() query?: any) {
    return this.adminService.getDrivers(query);
  }

  // PATCH /api/v1/admins/drivers/:id/status - Approve, suspend, or update driver status
  @Patch('drivers/:id/status')
  async updateDriverStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.updateDriverStatus(id, status, notes);
  }

  // GET /api/v1/admins/:id - Retrieves details of an admin/manager by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const admin = await this.adminService.findById(id);
    return {
      success: true,
      admin,
    };
  }

  // PATCH /api/v1/admins/:id - Updates details or role of an existing administrator
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    const admin = await this.adminService.update(id, updateAdminDto);
    return {
      success: true,
      message: 'Administrator updated successfully',
      admin,
    };
  }

  // DELETE /api/v1/admins/:id - Removes an administrator account
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
