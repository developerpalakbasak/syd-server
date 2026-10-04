// Live Location is intentionally omitted from this schema as it must be kept in a fast-store like Redis per architectural guidelines.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema.js';

export type DriverProfileDocument = HydratedDocument<DriverProfile>;

export enum DriverStatus {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  IN_TRIP = 'IN_TRIP',
}

export enum BackgroundCheckStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class DriverProfile {
  /**
   * Using Types.ObjectId with `ref: 'User'` establishes the One-to-One link.
   * Like the CustomerProfile, keeping driver-specific data here allows the base
   * User collection to remain highly performant for authentication queries.
   */
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: DriverStatus, default: DriverStatus.OFFLINE })
  status: DriverStatus;

  @Prop({ required: true })
  licenceNumber: string;

  @Prop({ type: String, enum: BackgroundCheckStatus, default: BackgroundCheckStatus.PENDING })
  backgroundCheckStatus: BackgroundCheckStatus;

  @Prop({ type: Number, default: 5.0 })
  rating: number;
}

export const DriverProfileSchema = SchemaFactory.createForClass(DriverProfile);
