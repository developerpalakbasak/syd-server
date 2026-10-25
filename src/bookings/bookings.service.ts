import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Subject } from 'rxjs';
import { Booking, BookingDocument } from './schemas/booking.schema.js';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema.js';
import { Passenger, PassengerDocument } from '../passengers/schemas/passenger.schema.js';
import { QuotesService } from '../quotes/quotes.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

// Service managing booking creation, queries, status transitions, and reference generation.
@Injectable()
export class BookingsService implements OnModuleInit {
  // Real-time broadcast channel for passenger booking status updates
  public readonly bookingEvents$ = new Subject<{
    bookingNumber: string;
    bookingId: string;
    status: string;
    driver?: any;
    message: string;
  }>();

  // Real-time dispatch broadcast channel for online drivers
  public readonly driverDispatchEvents$ = new Subject<{
    type: 'new_job' | 'job_taken';
    bookingId: string;
    bookingNumber: string;
    service: string;
    pickup: any;
    destination: any;
    fare: any;
    passengers: number;
    message: string;
  }>();

  // Injects Mongoose Models for Booking and Vehicle collections and QuotesService.
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
    @InjectModel(Passenger.name)
    private readonly passengerModel: Model<PassengerDocument>,
    private readonly quotesService: QuotesService,
  ) {}

  // Broadcast an update to connected passengers
  broadcastBookingUpdate(update: {
    bookingNumber: string;
    bookingId: string;
    status: string;
    driver?: any;
    message: string;
  }) {
    this.bookingEvents$.next(update);
  }

  // Broadcast dispatch job to online drivers
  broadcastDriverDispatch(event: {
    type: 'new_job' | 'job_taken';
    bookingId: string;
    bookingNumber: string;
    service: string;
    pickup: any;
    destination: any;
    fare: any;
    passengers: number;
    message: string;
  }) {
    this.driverDispatchEvents$.next(event);
  }

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
    // 0. If quoteToken is provided, extract verified details
    const quotePayload = dto.quoteToken
      ? this.quotesService.verifyQuoteToken(dto.quoteToken)
      : null;

    // 1. Resolve Pickup and Destination (supporting HeroBookingForm aliases or quoteToken)
    const pickup = dto.pickup ?? dto.from ?? quotePayload?.pickup;
    if (!pickup || typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number') {
      throw new BadRequestException('Pickup location (from) is required with valid coordinates');
    }

    const destination = dto.destination ?? dto.to ?? quotePayload?.destination;
    const service = dto.service ?? quotePayload?.service ?? 'airport';

    // 2. Resolve Timing & Passengers
    const isNow = dto.isNow ?? false;
    let pickupAt: Date | undefined;
    if (!isNow) {
      const rawDate = dto.pickupAt ?? dto.when ?? quotePayload?.pickupAt;
      if (rawDate) {
        pickupAt = new Date(rawDate);
      }
    }

    const passengers = dto.passengers ?? dto.pax ?? quotePayload?.passengers ?? 1;

    // 3. Resolve Vehicle Details
    const vehicleTypeSlug = (dto.vehicleType ?? quotePayload?.vehicleType ?? 'taxi').toLowerCase();
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

    // 4.5 Lookup registered passenger if matches phone or email
    let matchedPassengerId: Types.ObjectId | undefined;
    const phone = dto.passengerPhone.trim();
    const email = dto.passengerEmail?.trim().toLowerCase();
    const orCond: any[] = [{ phone }];
    if (email) orCond.push({ email });
    const foundPassenger = await this.passengerModel.findOne({ $or: orCond }).exec();
    if (foundPassenger) {
      matchedPassengerId = foundPassenger._id as Types.ObjectId;
    }

    // 5. Construct and Save Guest Booking
    const newBooking = new this.bookingModel({
      bookingNumber,
      service,
      passengerId: matchedPassengerId,
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
      fare: dto.fare ?? quotePayload?.price ?? {
        currency: 'AUD',
        total: vehicleDoc ? vehicleDoc.basePrice : 0,
        gstIncluded: vehicleDoc ? Math.round(vehicleDoc.basePrice / 11) : 0,
        distanceKm: 0,
        durationMin: 0,
        lines: [],
      },
      quoteToken: dto.quoteToken ?? '',
      notes: dto.notes ?? '',
      paymentStatus: 'pending',
    });

    const saved = await newBooking.save();

    // Broadcast new dispatch request in real time to all online drivers
    this.broadcastDriverDispatch({
      type: 'new_job',
      bookingId: saved._id.toString(),
      bookingNumber: saved.bookingNumber,
      service: saved.service,
      pickup: saved.pickup,
      destination: saved.destination,
      fare: saved.fare,
      passengers: saved.passengers,
      message: `New ${saved.service.toUpperCase()} request: from ${saved.pickup?.name} to ${saved.destination?.name || 'As Directed'} (${saved.fare?.total ? '$' + (saved.fare.total / 100).toFixed(2) : ''})`,
    });

    return saved;
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

  // Finds booking by MongoDB ObjectId or reference number, populating vehicle and driver relations.
  async findByReferenceOrId(refOrId: string): Promise<BookingDocument> {
    let booking: BookingDocument | null = null;
    if (isValidObjectId(refOrId)) {
      booking = await this.bookingModel
        .findById(refOrId)
        .populate('vehicle')
        .populate('driver', 'name phone vehicle rating')
        .exec();
    }
    if (!booking) {
      booking = await this.bookingModel
        .findOne({ bookingNumber: refOrId.toUpperCase() })
        .populate('vehicle')
        .populate('driver', 'name phone vehicle rating')
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
