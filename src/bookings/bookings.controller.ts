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

// Controller handling public guest bookings, lookups, status updates, and cancellations.
@Controller('bookings')
export class BookingsController {
  // Injects BookingsService dependency for booking business logic and storage.
  constructor(private readonly bookingsService: BookingsService) {}

  // POST /api/v1/bookings - Creates a guest booking without requiring authentication.
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

  // GET /api/v1/bookings - Lists paginated bookings filtered by phone, status, or service category.
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

  // GET /api/v1/bookings/:refOrId - Looks up booking by human-readable reference (SYD-XXXXXX) or MongoDB ObjectId.
  @Get(':refOrId')
  async findOne(@Param('refOrId') refOrId: string) {
    const booking = await this.bookingsService.findByReferenceOrId(refOrId);
    return { success: true, booking };
  }

  // PATCH /api/v1/bookings/:refOrId/status - Updates booking lifecycle status, payment status, or internal notes.
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

  // POST /api/v1/bookings/:refOrId/cancel - Cancels a booking and records an optional cancellation reason.
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
