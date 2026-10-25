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
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PassengersService, PassengerJwtPayload } from './passengers.service.js';
import {
  RegisterPassengerDto,
  LoginPassengerDto,
  RequestOtpDto,
  VerifyOtpDto,
  UpdatePassengerProfileDto,
  SavePlaceDto,
} from './dto/passenger.dto.js';

@Controller('passengers')
export class PassengersController {
  constructor(private readonly passengersService: PassengersService) {}

  // Helper to extract passenger JWT from Authorization header or cookie
  private extractPassenger(req: Request): PassengerJwtPayload {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.syd_passenger_token) {
      token = req.cookies.syd_passenger_token;
    }
    if (!token) {
      throw new UnauthorizedException('Authentication token missing or malformed');
    }
    return this.passengersService.verifyToken(token);
  }

  // POST /api/v1/passengers/register
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterPassengerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passengersService.register(dto);
    if (result.token) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('syd_passenger_token', result.token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: this.passengersService.getTokenValidityMs(),
        path: '/',
      });
    }
    return result;
  }

  // POST /api/v1/passengers/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginPassengerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passengersService.login(dto);
    if (result.token) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('syd_passenger_token', result.token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: this.passengersService.getTokenValidityMs(),
        path: '/',
      });
    }
    return result;
  }

  // POST /api/v1/passengers/send-otp
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: RequestOtpDto) {
    return this.passengersService.requestOtp(dto);
  }

  // POST /api/v1/passengers/verify-otp
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passengersService.verifyOtp(dto);
    if (result.token) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('syd_passenger_token', result.token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: this.passengersService.getTokenValidityMs(),
        path: '/',
      });
    }
    return result;
  }

  // POST /api/v1/passengers/logout
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('syd_passenger_token', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }

  // GET /api/v1/passengers/me
  @Get('me')
  async getProfile(@Req() req: Request) {
    const passenger = this.extractPassenger(req);
    return this.passengersService.getProfile(passenger.sub);
  }

  // PATCH /api/v1/passengers/me
  @Patch('me')
  async updateProfile(@Req() req: Request, @Body() dto: UpdatePassengerProfileDto) {
    const passenger = this.extractPassenger(req);
    return this.passengersService.updateProfile(passenger.sub, dto);
  }

  // GET /api/v1/passengers/trips
  @Get('trips')
  async getTrips(@Req() req: Request) {
    const passenger = this.extractPassenger(req);
    return this.passengersService.getPassengerTrips(passenger.sub);
  }

  // POST /api/v1/passengers/saved-places
  @Post('saved-places')
  async addSavedPlace(@Req() req: Request, @Body() dto: SavePlaceDto) {
    const passenger = this.extractPassenger(req);
    return this.passengersService.addSavedPlace(passenger.sub, dto);
  }

  // DELETE /api/v1/passengers/saved-places/:index
  @Delete('saved-places/:index')
  async deleteSavedPlace(@Req() req: Request, @Param('index') index: string) {
    const passenger = this.extractPassenger(req);
    return this.passengersService.removeSavedPlace(passenger.sub, parseInt(index, 10));
  }
}
