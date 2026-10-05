import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  NotificationEvent,
  NotificationChannel,
  NotificationStatus,
  RecipientRole,
  NotificationLanguage,
} from './notification.enums.js';

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

/**
 * @Schema decorator marks this class as a Mongoose schema definition.
 * We include timestamps to audit when the notification was created (requested) and updated (delivered/failed).
 * This architecture choice ensures we have a permanent historical record of all communications,
 * which is critical for debugging, customer support, and system auditing.
 */
@Schema({ timestamps: true })
export class NotificationLog {
  /**
   * For Drivers and Admins, this holds the User ID.
   * For guest Passengers, this is optional or stores the bookingId.
   */
  @Prop({ required: false, index: true })
  recipientId?: string;

  /**
   * Phone number destination (crucial for guest passenger SMS/WhatsApp dispatch).
   */
  @Prop({ required: false, index: true })
  recipientPhone?: string;

  /**
   * Email destination (for guest receipts or admin alerts).
   */
  @Prop({ required: false })
  recipientEmail?: string;

  /**
   * Enum allows us to easily filter logs by role (e.g., PASSENGER, DRIVER, ADMIN).
   */
  @Prop({ type: String, enum: RecipientRole, required: true })
  recipientRole: RecipientRole;

  /**
   * Represents the business event that triggered this notification.
   */
  @Prop({ type: String, enum: NotificationEvent, required: true })
  event: NotificationEvent;

  /**
   * Represents the delivery medium.
   */
  @Prop({ type: String, enum: NotificationChannel, required: true })
  channel: NotificationChannel;

  /**
   * Tracks the delivery state. Defaults to PENDING when first logged before dispatch.
   */
  @Prop({ type: String, enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  /**
   * Language preference for the template rendering (English or Bangla).
   */
  @Prop({ type: String, enum: NotificationLanguage, required: true })
  language: NotificationLanguage;

  /**
   * We use MongooseSchema.Types.Mixed for flexible JSON payloads.
   * This allows us to store arbitrary dynamic data (like driverName, ETA, bookingId) 
   * without needing a strict schema for every possible notification template type.
   */
  @Prop({ type: MongooseSchema.Types.Mixed })
  payload: Record<string, any>;

  /**
   * If the delivery fails (e.g., invalid phone number or API error), we store the error reason here.
   */
  @Prop()
  errorMessage?: string;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
