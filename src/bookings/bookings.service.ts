import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema.js';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

// Service managing booking creation, queries, status transitions, and reference generation.
@Injectable()
export class BookingsService implements OnModuleInit {
  // Injects Mongoose Models for Booking and Vehicle collections.
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
  ) {}

  // Synchronizes MongoDB indexes with the current schema, dropping any obsolete indexes.
  async onModuleInit() {
    try {
      await this.bookingModel.syncIndexes();
    } catch {
      // Ignore if collection does not exist yet
    }
  }

  // Generates a random uppercase 6-character alphanumeric reference code formatted as SYD-XXXXXX.
  private generateBookingNumber(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SYD-${code}`;
  }

  // Validates request data, resolves vehicle details, generates reference code, and creates guest booking.
  async create(dto: CreateBookingDto): Promise<BookingDocument> {
    // 1. Resolve Pickup and Destination (supporting HeroBookingForm aliases)
    const pickup = dto.pickup ?? dto.from;
    if (!pickup || typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number') {
      throw new BadRequestException('Pickup location (from) is required with valid coordinates');
    }

    const destination = dto.destination ?? dto.to;
    const service = dto.service ?? 'airport';

    // 2. Resolve Timing & Passengers
    const isNow = dto.isNow ?? false;
    let pickupAt: Date | undefined;
    if (!isNow) {
      const rawDate = dto.pickupAt ?? dto.when;
      if (rawDate) {
        pickupAt = new Date(rawDate);
      }
    }

    const passengers = dto.passengers ?? dto.pax ?? 1;

    // 3. Resolve Vehicle Details
    const vehicleTypeSlug = (dto.vehicleType ?? 'taxi').toLowerCase();
    let vehicleDoc: VehicleDocument | null = null;

    if (dto.vehicleId && isValidObjectId(dto.vehicleId)) {
      vehicleDoc = await this.vehicleModel.findById(dto.vehicleId).exec();
    } else {
      vehicleDoc = await this.vehicleModel.findOne({ slug: vehicleTypeSlug }).exec();
    }

    const vehicleDetails = vehicleDoc
      ? {
          name: vehicleDoc.name,
          slug: vehicleDoc.slug,
          exampleModels: vehicleDoc.exampleModels,
          image: vehicleDoc.image,
          luggage: vehicleDoc.luggage,
        }
      : {
          slug: vehicleTypeSlug,
          name: vehicleTypeSlug.toUpperCase(),
        };

    // 4. Generate unique Booking Reference
    let bookingNumber = this.generateBookingNumber();
    let exists = await this.bookingModel.exists({ bookingNumber });
    while (exists) {
      bookingNumber = this.generateBookingNumber();
      exists = await this.bookingModel.exists({ bookingNumber });
    }

    // 5. Construct and Save Guest Booking
    const newBooking = new this.bookingModel({
      bookingNumber,
      service,
      pickup: {
        name: pickup.name,
        address: pickup.address ?? '',
        lat: pickup.lat,
        lng: pickup.lng,
        code: pickup.code ?? '',
        type: pickup.type ?? '',
      },
      destination: destination
        ? {
            name: destination.name,
            address: destination.address ?? '',
            lat: destination.lat,
            lng: destination.lng,
            code: destination.code ?? '',
            type: destination.type ?? '',
          }
        : undefined,
      isNow,
      pickupAt,
      passengers,
      vehicleType: vehicleDoc ? vehicleDoc.slug : vehicleTypeSlug,
      vehicle: vehicleDoc ? (vehicleDoc._id as Types.ObjectId) : undefined,
      vehicleDetails,
      passengerName: dto.passengerName.trim(),
      passengerPhone: dto.passengerPhone.trim(),
      passengerEmail: dto.passengerEmail?.trim() ?? '',
      flightNumber: dto.flightNumber?.trim() ?? '',
      airportTripType: dto.airportTripType ?? null,
      status: 'confirmed',
      fare: dto.fare ?? {
        currency: 'AUD',
        total: vehicleDoc ? vehicleDoc.basePrice : 0,
        gstIncluded: vehicleDoc ? Math.round(vehicleDoc.basePrice / 11) : 0,
        distanceKm: 0,
        durationMin: 0,
        lines: [],
      },
      notes: dto.notes ?? '',
      paymentStatus: 'pending',
    });

    return newBooking.save();
  }

  // Retrieves paginated list of bookings with optional filtering by phone, status, and service.
  async findAll(query?: {
    service?: string;
    status?: string;
    phone?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ total: number; bookings: BookingDocument[] }> {
    const filter: Record<string, any> = {};

    if (query?.service) filter.service = query.service;
    if (query?.status) filter.status = query.status;
    if (query?.phone) filter.passengerPhone = new RegExp(query.phone, 'i');

    const limit = query?.limit ? Math.min(Number(query.limit), 100) : 50;
    const skip = query?.skip ? Number(query.skip) : 0;

    const [total, bookings] = await Promise.all([
      this.bookingModel.countDocuments(filter),
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('vehicle')
        .exec(),
    ]);

    return { total, bookings };
  }

  // Finds booking by MongoDB ObjectId or reference number, populating vehicle relations.
  async findByReferenceOrId(refOrId: string): Promise<BookingDocument> {
    let booking: BookingDocument | null = null;
    if (isValidObjectId(refOrId)) {
      booking = await this.bookingModel.findById(refOrId).populate('vehicle').exec();
    }
    if (!booking) {
      booking = await this.bookingModel
        .findOne({ bookingNumber: refOrId.toUpperCase() })
        .populate('vehicle')
        .exec();
    }

    if (!booking) {
      throw new NotFoundException(`Booking with reference '${refOrId}' not found`);
    }

    return booking;
  }

  // Updates booking lifecycle status, payment status, cancellation reasons, or notes.
  async updateStatus(
    refOrId: string,
    dto: UpdateBookingStatusDto,
  ): Promise<BookingDocument> {
    const booking = await this.findByReferenceOrId(refOrId);

    if (dto.status) booking.status = dto.status;
    if (dto.paymentStatus) booking.paymentStatus = dto.paymentStatus;
    if (dto.cancellationReason) booking.cancellationReason = dto.cancellationReason;
    if (dto.notes) booking.notes = dto.notes;

    return booking.save();
  }

  // Cancels a booking by reference or ID and stores optional cancellation reason.
  async cancel(refOrId: string, reason?: string): Promise<BookingDocument> {
    const booking = await this.findByReferenceOrId(refOrId);
    booking.status = 'cancelled';
    if (reason) booking.cancellationReason = reason;
    return booking.save();
  }
}
