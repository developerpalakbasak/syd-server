import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlaceDocument = HydratedDocument<Place>;

// Optional geographic or address metadata for a location point
@Schema({ _id: false })
export class PlaceLocationDetails {
  @Prop({ default: '', trim: true })
  address?: string;

  @Prop({ type: Number, required: false })
  lat?: number;

  @Prop({ type: Number, required: false })
  lng?: number;

  @Prop({ default: '', trim: true })
  code?: string;
}

export const PlaceLocationDetailsSchema =
  SchemaFactory.createForClass(PlaceLocationDetails);

// Main Place model representing route fares between firstPlace and lastPlace
@Schema({ timestamps: true })
export class Place {
  @Prop({ required: true, trim: true, index: true })
  firstPlace: string;

  @Prop({ required: true, trim: true, index: true })
  lastPlace: string;

  // Fare amount (supporting both 'fair' and 'fare' naming conventions)
  @Prop({ required: true, min: 0 })
  fair: number;

  @Prop({ required: false, min: 0 })
  fare?: number;

  @Prop({ default: 'AUD', trim: true, uppercase: true })
  currency: string;

  @Prop({ type: Number, required: false, default: null })
  distanceKm?: number;

  @Prop({ type: Number, required: false, default: null })
  durationMin?: number;

  @Prop({ default: 'all', trim: true })
  vehicleType?: string;

  @Prop({ type: Map, of: Number, default: {} })
  vehicleFares?: Record<string, number>;

  @Prop({ type: PlaceLocationDetailsSchema, required: false })
  firstPlaceDetails?: PlaceLocationDetails;

  @Prop({ type: PlaceLocationDetailsSchema, required: false })
  lastPlaceDetails?: PlaceLocationDetails;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: '', trim: true })
  notes?: string;
}

export const PlaceSchema = SchemaFactory.createForClass(Place);

// Compound index to quickly find routes matching pickup and dropoff places
PlaceSchema.index({ firstPlace: 1, lastPlace: 1 });

// Synchronize fair and fare before save
PlaceSchema.pre('save', function () {
  if (this.fair !== undefined && this.fare === undefined) {
    this.fare = this.fair;
  } else if (this.fare !== undefined && this.fair === undefined) {
    this.fair = this.fare;
  }
});
