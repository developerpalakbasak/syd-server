import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BookingStatus } from './booking-status.enum.js';
import { User } from '../user/user.schema.js';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.REQUESTED, index: true })
  status: BookingStatus;

  /**
   * Guest passenger details (no user account required to book a ride).
   */
  @Prop({
    type: {
      name: { type: String, required: true },
      phone: { type: String, required: true, index: true },
      email: { type: String },
    },
    required: true,
  })
  passenger: {
    name: string;
    phone: string;
    email?: string;
  };

  /**
   * Pickup address and GeoJSON coordinates [longitude, latitude].
   */
  @Prop({
    type: {
      address: { type: String, required: true },
      coordinates: { type: [Number], required: true },
    },
    required: true,
  })
  pickupLocation: {
    address: string;
    coordinates: number[];
  };

  /**
   * Dropoff destination address and GeoJSON coordinates [longitude, latitude].
   */
  @Prop({
    type: {
      address: { type: String, required: true },
      coordinates: { type: [Number], required: true },
    },
    required: true,
  })
  dropoffLocation: {
    address: string;
    coordinates: number[];
  };

  /**
   * Assigned driver (references User account of role DRIVER).
   */
  @Prop({ type: Types.ObjectId, ref: User.name, index: true })
  driverId?: Types.ObjectId;

  /**
   * Secure, random tracking token generated on booking creation.
   * Enables the guest passenger to track, view, and manage their ride without logging in.
   */
  @Prop({ required: true, unique: true, index: true })
  trackingToken: string;

  /**
   * Idempotency key prevents duplicate booking creation requests.
   */
  @Prop({ required: true, unique: true })
  idempotencyKey: string;

  @Prop({ type: String })
  vehicleType?: string;

  @Prop({ type: Number })
  estimatedFare?: number;

  @Prop({ type: Number })
  finalFare?: number;

  @Prop({
    type: {
      cancelledBy: { type: String },
      reason: { type: String },
      time: { type: Date },
      feeAmount: { type: Number },
      refundAmount: { type: Number },
    },
    required: false,
  })
  cancellationDetails?: {
    cancelledBy?: string;
    reason?: string;
    time?: Date;
    feeAmount?: number;
    refundAmount?: number;
  };
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

