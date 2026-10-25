import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { map } from 'rxjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { DriversService, DriverJwtPayload } from './drivers.service.js';
import {
  RegisterDriverDto,
  LoginDriverDto,
  UpdateDriverStatusDto,
} from './dto/driver.dto.js';

@Controller('drivers')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly configService: ConfigService,
  ) {}

  private extractDriverFromReq(req: Request): DriverJwtPayload {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const token = authHeader.split(' ')[1];
    const secret =
      this.configService.get<string>('JWT_SECRET')?.split('#')[0].trim() ||
      'supersecretjwtkey_sydtransfer_2026';
    try {
      const decoded = jwt.verify(token, secret) as DriverJwtPayload;
      if (decoded.role !== 'driver') {
        throw new UnauthorizedException('Invalid token role');
      }
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  // GET /api/v1/drivers/online - Public endpoint for passengers
  @Get('online')
  async getOnlineDrivers(@Req() req: Request) {
    const service = req.query.service as string | undefined;
    return this.driversService.getOnlineDrivers(service);
  }

  // GET /api/v1/drivers/online-stream - Real-time SSE stream for instant driver updates
  @Get('online-stream')
  async streamOnlineDrivers(@Req() req: Request, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const service = req.query.service as string | undefined;

    // Send initial snapshot immediately
    const initialData = await this.driversService.getOnlineDrivers(service);
    const initialPayload = JSON.stringify(initialData);
    res.write(`event: online_drivers\ndata: ${initialPayload}\n\n`);
    res.write(`data: ${initialPayload}\n\n`);

    // Listen to real-time events and push immediately to passenger
    const subscription = this.driversService.driverEvents$.subscribe(async () => {
      const freshData = await this.driversService.getOnlineDrivers(service);
      const freshPayload = JSON.stringify(freshData);
      res.write(`event: online_drivers\ndata: ${freshPayload}\n\n`);
      res.write(`data: ${freshPayload}\n\n`);
    });

    // Keep connection alive with heartbeat ping every 25 seconds
    const pingInterval = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 25000);

    req.on('close', () => {
      subscription.unsubscribe();
      clearInterval(pingInterval);
    });
  }

  // POST /api/v1/drivers/register
  @Post('register')
  async register(@Body() dto: RegisterDriverDto) {
    return this.driversService.register(dto);
  }

  // POST /api/v1/drivers/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDriverDto) {
    return this.driversService.login(dto);
  }

  // GET /api/v1/drivers/me
  @Get('me')
  async getProfile(@Req() req: Request) {
    const driver = this.extractDriverFromReq(req);
    return this.driversService.getProfile(driver.sub);
  }

  // PATCH /api/v1/drivers/status
  @Patch('status')
  async updateStatus(@Req() req: Request, @Body() dto: UpdateDriverStatusDto) {
    const driver = this.extractDriverFromReq(req);
    return this.driversService.updateStatus(driver.sub, dto);
  }

  // GET /api/v1/drivers/trips
  @Get('trips')
  async getTrips(@Req() req: Request) {
    const driver = this.extractDriverFromReq(req);
    return this.driversService.getDriverTrips(driver.sub);
  }

  // POST /api/v1/drivers/trips/:id/accept
  @Post('trips/:id/accept')
  async acceptTrip(@Req() req: Request, @Param('id') id: string) {
    const driver = this.extractDriverFromReq(req);
    return this.driversService.acceptTrip(driver.sub, id);
  }

  // PATCH /api/v1/drivers/trips/:id/status
  @Patch('trips/:id/status')
  async updateTripStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('status') status: 'on_the_way' | 'arrived' | 'in_progress' | 'completed',
  ) {
    const driver = this.extractDriverFromReq(req);
    return this.driversService.updateTripStatus(driver.sub, id, status);
  }

  // GET /api/v1/drivers/events - Real-time SSE dispatch notification stream for online drivers
  @Sse('events')
  driverEventsStream() {
    return this.driversService.dispatchEvents$.pipe(
      map((event) => ({
        data: event,
      })),
    );
  }
}
