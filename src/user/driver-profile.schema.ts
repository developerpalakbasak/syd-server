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

  @Prop({
    type: {
      make: { type: String },
      model: { type: String },
      year: { type: Number },
      licensePlate: { type: String },
      color: { type: String },
      vehicleType: { type: String },
    },
    required: false,
  })
  vehicle?: {
    make?: string;
    model?: string;
    year?: number;
    licensePlate?: string;
    color?: string;
    vehicleType?: string;
  };
}

export const DriverProfileSchema = SchemaFactory.createForClass(DriverProfile);
