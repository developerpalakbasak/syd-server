import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DriverDocument = HydratedDocument<Driver>;

export enum DriverStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  ON_TRIP = 'on_trip',
  OFFLINE = 'offline',
  SUSPENDED = 'suspended',
}

export enum DriverServiceType {
  TAXI = 'taxi',
  LIMOUSINE = 'limousine',
  BOTH = 'both',
}

@Schema({ _id: false })
export class DriverVehicleInfo {
  @Prop({ required: true, trim: true })
  make: string; // e.g. Toyota, Mercedes-Benz

  @Prop({ required: true, trim: true })
  model: string; // e.g. Camry Hybrid, E-Class

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, trim: true, uppercase: true })
  regoPlate: string; // NSW Registration Plate

  @Prop({ required: true, trim: true })
  color: string;

  @Prop({ required: true, enum: ['taxi', 'limousine', 'both'], default: 'taxi' })
  serviceType: string;

  @Prop({ default: 4 })
  passengerCapacity: number;

  @Prop({ default: 3 })
  luggageCapacity: number;
}
export const DriverVehicleInfoSchema = SchemaFactory.createForClass(DriverVehicleInfo);

@Schema({ _id: false })
export class DriverDocuments {
  @Prop({ default: '' })
  driverLicenseNumber: string;

  @Prop({ default: '' })
  driverLicenseExpiry?: string;

  @Prop({ default: '' })
  pointToPointCardNumber?: string; // NSW Driver Authority / P2P ID

  @Prop({ default: '' })
  abnNumber?: string;

  @Prop({ default: '' })
  insurancePolicyNumber?: string;

  @Prop({ default: '' })
  licensePhotoUrl?: string;

  @Prop({ default: '' })
  vehiclePhotoUrl?: string;
}
export const DriverDocumentsSchema = SchemaFactory.createForClass(DriverDocuments);

@Schema({ timestamps: true })
export class Driver {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, trim: true, index: true })
  phone: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({
    required: true,
    enum: Object.values(DriverStatus),
    default: DriverStatus.PENDING_VERIFICATION,
    index: true,
  })
  status: string;

  @Prop({ default: false, index: true })
  isOnline: boolean;

  @Prop({
    type: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    default: null,
  })
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };

  @Prop({ type: DriverVehicleInfoSchema, required: true })
  vehicle: DriverVehicleInfo;

  @Prop({ type: DriverDocumentsSchema, default: () => ({}) })
  documents: DriverDocuments;

  @Prop({ default: 5.0 })
  rating: number;

  @Prop({ default: 0 })
  totalTrips: number;

  @Prop({ default: 0 })
  totalEarningsCents: number; // in cents AUD

  @Prop({ default: 0 })
  walletBalanceCents: number; // pending payouts

  @Prop({ default: '' })
  adminNotes?: string;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
