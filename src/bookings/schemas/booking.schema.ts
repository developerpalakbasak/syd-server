import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Vehicle } from '../../vehicles/schemas/vehicle.schema.js';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ _id: false })
export class BookingPlace {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  address?: string;

  @Prop({ required: true, type: Number })
  lat: number;

  @Prop({ required: true, type: Number })
  lng: number;

  @Prop({ default: '', trim: true })
  code?: string;

  @Prop({ default: '', trim: true })
  type?: string;
}
export const BookingPlaceSchema = SchemaFactory.createForClass(BookingPlace);

@Schema({ _id: false })
export class FareBreakdown {
  @Prop({ default: 'AUD' })
  currency: string;

  @Prop({ required: true, default: 0 })
  total: number; // in cents or AUD

  @Prop({ default: 0 })
  gstIncluded: number;

  @Prop({ default: 0 })
  distanceKm: number;

  @Prop({ default: 0 })
  durationMin: number;

  @Prop({ type: [{ label: String, amount: Number }], default: [] })
  lines: { label: string; amount: number }[];
}
export const FareBreakdownSchema = SchemaFactory.createForClass(FareBreakdown);

@Schema({ timestamps: true })
export class Booking {
  // Unique human-readable booking reference e.g., "SYD-K9J4M2"
  @Prop({ required: true, unique: true, index: true, uppercase: true })
  bookingNumber: string;

  // Service mode: taxi, airport, chauffeur
  @Prop({
    required: true,
    enum: ['taxi', 'airport', 'chauffeur'],
    default: 'airport',
    index: true,
  })
  service: string;

  // 1. Pickup location (from HeroBookingForm: 'from')
  @Prop({ type: BookingPlaceSchema, required: true })
  pickup: BookingPlace;

  // 2. Destination location (from HeroBookingForm: 'to')
  @Prop({ type: BookingPlaceSchema, required: false })
  destination?: BookingPlace;

  // 3. Date & Time / Immediate dispatch (from HeroBookingForm: 'date-time' / 'now')
  @Prop({ default: false })
  isNow: boolean;

  @Prop({ type: Date, required: false })
  pickupAt?: Date;

  // 4. Passenger Count (from HeroBookingForm: 'passenger count')
  @Prop({ required: true, min: 1, max: 14, default: 1 })
  passengers: number;

  // 5. Vehicle Type & reference
  @Prop({ required: true, trim: true, index: true })
  vehicleType: string; // e.g. "taxi", "executive", "luxury", "suv", "mpv", "van"

  @Prop({ type: Types.ObjectId, ref: Vehicle.name, required: false })
  vehicle?: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  vehicleDetails?: {
    name?: string;
    slug?: string;
    exampleModels?: string[];
    image?: string;
    luggage?: number;
  };

  // 6. Guest user contact info (No user login required)
  @Prop({ required: true, trim: true, index: true })
  passengerName: string;

  @Prop({ required: true, trim: true, index: true })
  passengerPhone: string;

  @Prop({ trim: true, default: '' })
  passengerEmail?: string;

  // Optional airport transfer extras
  @Prop({ trim: true, default: '' })
  flightNumber?: string;

  @Prop({ enum: ['pickup', 'dropoff', null], default: null })
  airportTripType?: string;

  // Booking lifecycle status
  @Prop({
    required: true,
    enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'confirmed',
    index: true,
  })
  status: string;

  // Pricing snapshot
  @Prop({ type: FareBreakdownSchema, default: () => ({}) })
  fare?: FareBreakdown;

  // Payment status & notes
  @Prop({
    enum: ['pending', 'paid', 'cash_to_driver', 'card'],
    default: 'pending',
  })
  paymentStatus: string;

  @Prop({ default: '' })
  notes?: string;

  @Prop({ default: '' })
  cancellationReason?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Index to easily lookup bookings by phone or reference
BookingSchema.index({ passengerPhone: 1, createdAt: -1 });
