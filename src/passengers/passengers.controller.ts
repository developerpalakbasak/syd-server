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
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
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

  // Helper to extract passenger JWT from Authorization header
  private extractPassenger(req: Request): PassengerJwtPayload {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token missing or malformed');
    }
    const token = authHeader.split(' ')[1];
    return this.passengersService.verifyToken(token);
  }

  // POST /api/v1/passengers/register
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterPassengerDto) {
    return this.passengersService.register(dto);
  }

  // POST /api/v1/passengers/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginPassengerDto) {
    return this.passengersService.login(dto);
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
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.passengersService.verifyOtp(dto);
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
