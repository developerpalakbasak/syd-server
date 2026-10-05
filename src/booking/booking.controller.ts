import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BookingService } from './booking.service.js';
import { CreateBookingDto, CancelBookingDto } from './dto/create-booking.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../user/user.enums.js';
import { BookingStatus } from './booking-status.enum.js';

@Controller({ path: 'bookings', version: '1' })
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * PUBLIC ENDPOINT: Create Booking
   * Guest passengers can book a ride immediately without creating an account.
   * Returns booking details along with a private trackingToken.
   */
  @Post()
  async createBooking(@Body() dto: CreateBookingDto) {
    return await this.bookingService.createBooking(dto);
  }

  /**
   * PUBLIC ENDPOINT: Live Ride Tracking
   * Guest passengers track their booking status and driver location using their trackingToken.
   */
  @Get('track/:token')
  async trackBooking(@Param('token') token: string) {
    return await this.bookingService.getBookingByTrackingToken(token);
  }

  /**
   * PUBLIC ENDPOINT: Cancel Booking by Guest
   * Guest passengers can cancel their ride using their trackingToken before the trip starts.
   */
  @Post('cancel/:token')
  async cancelBookingByGuest(
    @Param('token') token: string,
    @Body() dto: CancelBookingDto,
  ) {
    return await this.bookingService.cancelBookingByToken(token, dto);
  }

  /**
   * PROTECTED ENDPOINT: List Bookings
   * Accessible only to authenticated DRIVER or ADMIN accounts.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  async listBookings(@Query('status') status?: BookingStatus) {
    const filter = status ? { status } : {};
    return await this.bookingService.findAll(filter);
  }

  /**
   * PROTECTED ENDPOINT: View Single Booking by ID
   * Accessible to authenticated DRIVER and ADMIN accounts.
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  async viewBooking(@Param('id') id: string) {
    return await this.bookingService.findById(id);
  }

  /**
   * PROTECTED ENDPOINT: Accept Booking
   * Drivers accept an available ride request.
   */
  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async acceptBooking(@Param('id') id: string, @Req() req: any) {
    // In production, req.user._id is populated by JWT AuthGuard
    const driverId = req.user?._id || req.user?.id || req.body?.driverId;
    return await this.bookingService.acceptBooking(id, driverId);
  }

  /**
   * PROTECTED ENDPOINT: Update Booking Trip Status
   * Driver updates the ride status (e.g. ARRIVED, TRIP_STARTED, TRIP_COMPLETED).
   */
  @Post(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  async updateTripStatus(
    @Param('id') id: string,
    @Body('status') status: BookingStatus,
    @Req() req: any,
  ) {
    const driverId = req.user?._id || req.user?.id || req.body?.driverId;
    return await this.bookingService.updateStatus(id, driverId, status);
  }

  /**
   * PROTECTED ENDPOINT: Manually Assign Driver
   * Admin dispatches/assigns a driver to a booking.
   */
  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async assignDriver(
    @Param('id') id: string,
    @Body('driverId') driverId: string,
  ) {
    return await this.bookingService.assignDriver(id, driverId);
  }
}
