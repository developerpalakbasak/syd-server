import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BookingStatus } from './booking-status.enum.js';

// HydratedDocument represents a hydrated Mongoose document, with methods, virtuals, and other Mongoose-specific features.
export type BookingDocument = HydratedDocument<Booking>;

/**
 * @Schema decorator marks the class as a Mongoose schema definition.
 * We pass { timestamps: true } to automatically add createdAt and updatedAt fields.
 */
@Schema({ timestamps: true })
export class Booking {
  /**
   * @Prop decorator defines a property in the document.
   * We set enum to enforce valid values and index: true to improve query performance on this field, 
   * which is crucial for State Machine logic where we often query by state (e.g., finding all REQUESTED bookings).
   */
  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.REQUESTED, index: true })
  status: BookingStatus;

  /**
   * The customer ID must be provided. We set required: true to enforce this at the database level.
   */
  @Prop({ required: true })
  customerId: string;

  /**
   * driverId is optional because a booking starts in REQUESTED state without a driver.
   * No additional options are strictly needed here.
   */
  @Prop()
  driverId?: string;

  /**
   * idempotencyKey prevents processing the same action (like a payment or status change) multiple times.
   * We set unique: true to ensure no two documents can have the same idempotency key.
   */
  @Prop({ required: true, unique: true })
  idempotencyKey: string;

  /**
   * For nested objects that don't need their own distinct collection or full schema features,
   * we can use a raw nested object type in @Prop by specifying type: Object or defining the shape.
   */
  @Prop({
    type: {
      cancelledBy: { type: String },
      reason: { type: String },
      time: { type: Date },
      feeAmount: { type: Number },
      refundAmount: { type: Number },
    },
    // Required is false by default. We only populate this if the booking is cancelled.
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

// SchemaFactory generates the Mongoose Schema object based on the decorators we used above.
export const BookingSchema = SchemaFactory.createForClass(Booking);
