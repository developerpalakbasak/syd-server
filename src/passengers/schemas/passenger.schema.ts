import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PassengerDocument = HydratedDocument<Passenger>;

@Schema({ _id: false })
export class SavedPlace {
  @Prop({ required: true, trim: true })
  label: string; // e.g. "Home", "Work", "Airport"

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  address: string;

  @Prop({ required: true, type: Number })
  lat: number;

  @Prop({ required: true, type: Number })
  lng: number;
}
export const SavedPlaceSchema = SchemaFactory.createForClass(SavedPlace);

@Schema({ timestamps: true })
export class Passenger {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  phone: string;

  @Prop({ default: '', select: false })
  passwordHash?: string;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  // Active OTP code and expiry for passwordless login
  @Prop({ default: '', select: false })
  otpCode?: string;

  @Prop({ type: Date, select: false })
  otpExpiresAt?: Date;

  @Prop({ type: [SavedPlaceSchema], default: [] })
  savedPlaces: SavedPlace[];

  @Prop({ enum: ['cash', 'card'], default: 'card' })
  preferredPaymentMethod: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PassengerSchema = SchemaFactory.createForClass(Passenger);
