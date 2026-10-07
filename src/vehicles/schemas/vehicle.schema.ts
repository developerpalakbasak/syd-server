import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true, index: true })
  slug: string;

  @Prop({ type: [String], default: ['taxi', 'airport', 'chauffeur'] })
  supportedServices: string[];

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 'Standard' })
  group: string;

  @Prop({ default: 1, min: 1 })
  passengersMin: number;

  @Prop({ required: true, min: 1, max: 50 })
  passengersMax: number;

  @Prop({ default: 2, min: 0 })
  luggage: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ type: [String], default: [] })
  exampleModels: string[];

  @Prop({ default: '' })
  image: string;

  @Prop({ default: 0, min: 0 })
  basePrice: number; // In cents (e.g., 5500 = $55.00)

  @Prop({ default: 0, min: 0 })
  pricePerKm: number; // In cents

  @Prop({ default: 0, min: 0 })
  pricePerMinute: number; // In cents

  @Prop({ default: 0, min: 0 })
  minimumFare: number; // In cents

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
