import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { Booking, BookingDocument } from './booking.schema.js';
import { BookingStatus } from './booking-status.enum.js';
import { CreateBookingDto, CancelBookingDto } from './dto/create-booking.dto.js';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
  ) {}

  /**
   * Public booking creation for guest passengers (no user account required).
   * Generates a unique tracking token and initial REQUESTED state.
   */
  async createBooking(dto: CreateBookingDto): Promise<BookingDocument> {
    if (!dto.passenger?.name || !dto.passenger?.phone) {
      throw new BadRequestException('Passenger name and phone are required to book a ride');
    }
    if (!dto.pickupLocation?.address || !dto.dropoffLocation?.address) {
      throw new BadRequestException('Pickup and dropoff addresses are required');
    }

    const idempotencyKey = dto.idempotencyKey || randomUUID();
    const existing = await this.bookingModel.findOne({ idempotencyKey });
    if (existing) {
      return existing;
    }

    const trackingToken = randomUUID();

    const newBooking = new this.bookingModel({
      status: BookingStatus.REQUESTED,
      passenger: dto.passenger,
      pickupLocation: dto.pickupLocation,
      dropoffLocation: dto.dropoffLocation,
      vehicleType: dto.vehicleType || 'Standard',
      trackingToken,
      idempotencyKey,
    });

    return await newBooking.save();
  }

  /**
   * Public tracking endpoint for guest passengers to view ride status and assigned driver.
   */
  async getBookingByTrackingToken(token: string): Promise<BookingDocument> {
    const booking = await this.bookingModel
      .findOne({ trackingToken: token })
      .populate('driverId', 'name phone')
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found with the provided tracking token');
    }

    return booking;
  }

  /**
   * Public cancellation endpoint for guest passengers using their tracking token.
   */
  async cancelBookingByToken(token: string, dto: CancelBookingDto): Promise<BookingDocument> {
    const booking = await this.bookingModel.findOne({ trackingToken: token });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Guests can only cancel before trip starts
    if (
      [
        BookingStatus.TRIP_STARTED,
        BookingStatus.TRIP_COMPLETED,
        BookingStatus.CANCELLED,
      ].includes(booking.status)
    ) {
      throw new BadRequestException(`Cannot cancel booking in ${booking.status} status`);
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancellationDetails = {
      cancelledBy: 'PASSENGER',
      reason: dto.reason || 'Cancelled by guest passenger',
      time: new Date(),
    };

    return await booking.save();
  }

  /**
   * Staff/Admin/Driver: List bookings with optional status filter.
   */
  async findAll(filter: Partial<Booking> = {}): Promise<BookingDocument[]> {
    return await this.bookingModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('driverId', 'name phone')
      .exec();
  }

  /**
   * Find booking by internal ID.
   */
  async findById(id: string): Promise<BookingDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid booking ID');
    }
    const booking = await this.bookingModel
      .findById(id)
      .populate('driverId', 'name phone')
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  /**
   * Driver: Accept an available requested booking.
   */
  async acceptBooking(bookingId: string, driverId: string): Promise<BookingDocument> {
    const booking = await this.findById(bookingId);

    if (booking.status !== BookingStatus.REQUESTED) {
      throw new ConflictException(`Booking is no longer available (current status: ${booking.status})`);
    }

    booking.driverId = new Types.ObjectId(driverId);
    booking.status = BookingStatus.DRIVER_ASSIGNED;
    return await booking.save();
  }

  /**
   * Driver: Update booking trip status.
   */
  async updateStatus(bookingId: string, driverId: string, status: BookingStatus): Promise<BookingDocument> {
    const booking = await this.findById(bookingId);

    if (booking.driverId?.toString() !== driverId) {
      throw new BadRequestException('You are not assigned to this booking');
    }

    booking.status = status;
    return await booking.save();
  }

  /**
   * Admin: Manually assign a driver to a booking.
   */
  async assignDriver(bookingId: string, driverId: string): Promise<BookingDocument> {
    const booking = await this.findById(bookingId);

    booking.driverId = new Types.ObjectId(driverId);
    booking.status = BookingStatus.DRIVER_ASSIGNED;
    return await booking.save();
  }
}
