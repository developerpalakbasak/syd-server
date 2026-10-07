import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Guest Booking Creation (No authentication required)
   * Receives: from, to, date-time / isNow, passenger count, vehicle type, and passenger contact details.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBookingDto: CreateBookingDto) {
    const booking = await this.bookingsService.create(createBookingDto);
    return {
      success: true,
      message: 'Booking confirmed successfully',
      booking: {
        id: booking._id,
        number: booking.bookingNumber,
        status: booking.status,
        service: booking.service,
        vehicleType: booking.vehicleType,
        pickup: booking.pickup,
        destination: booking.destination,
        pickupAt: booking.pickupAt,
        isNow: booking.isNow,
        passengers: booking.passengers,
        passengerName: booking.passengerName,
        passengerPhone: booking.passengerPhone,
        fare: booking.fare,
        createdAt: (booking as any).createdAt,
      },
    };
  }

  /**
   * List bookings (supports filtering by phone, status, service)
   */
  @Get()
  async findAll(
    @Query('phone') phone?: string,
    @Query('status') status?: string,
    @Query('service') service?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const data = await this.bookingsService.findAll({
      phone,
      status,
      service,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
    return { success: true, ...data };
  }

  /**
   * Look up booking by reference number (e.g. SYD-ABC123) or MongoDB ID
   */
  @Get(':refOrId')
  async findOne(@Param('refOrId') refOrId: string) {
    const booking = await this.bookingsService.findByReferenceOrId(refOrId);
    return { success: true, booking };
  }

  /**
   * Update booking status or payment status
   */
  @Patch(':refOrId/status')
  async updateStatus(
    @Param('refOrId') refOrId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.bookingsService.updateStatus(refOrId, dto);
    return {
      success: true,
      message: 'Booking status updated successfully',
      booking,
    };
  }

  /**
   * Cancel booking
   */
  @Post(':refOrId/cancel')
  async cancel(
    @Param('refOrId') refOrId: string,
    @Body('reason') reason?: string,
  ) {
    const booking = await this.bookingsService.cancel(refOrId, reason);
    return {
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    };
  }
}
