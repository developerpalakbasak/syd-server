import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RouteDocument = HydratedDocument<Route>;

// Optional geographic or address metadata for a location point
@Schema({ _id: false })
export class RouteLocationDetails {
  @Prop({ default: '', trim: true })
  address?: string;

  @Prop({ type: Number, required: false })
  lat?: number;

  @Prop({ type: Number, required: false })
  lng?: number;

  @Prop({ default: '', trim: true })
  code?: string;
}

export const RouteLocationDetailsSchema =
  SchemaFactory.createForClass(RouteLocationDetails);

// Main Route model representing fares between firstPlace and lastPlace
@Schema({ collection: 'routes', timestamps: true })
export class Route {
  @Prop({ required: true, trim: true, index: true })
  firstPlace: string;

  @Prop({ required: true, trim: true, index: true })
  lastPlace: string;

  // Additional fare charged per passenger per vehicle type
  @Prop({ type: Map, of: Number, default: {} })
  increaseFarePerPerson?: Record<string, number>;

  @Prop({ default: 'AUD', trim: true, uppercase: true })
  currency: string;

  @Prop({ type: Number, required: false, default: null })
  distanceKm?: number;

  @Prop({ type: Number, required: false, default: null })
  durationMin?: number;

  // Vehicle types and their corresponding fixed fares. Must contain at least 1 entry.
  @Prop({
    type: Map,
    of: Number,
    required: true,
    validate: [
      (val: Map<string, number> | Record<string, number>) => {
        if (!val) return false;
        const size = val instanceof Map ? val.size : Object.keys(val).length;
        return size >= 1;
      },
      'vehicleAndFares must contain at least 1 vehicle fare',
    ],
  })
  vehicleAndFares: Record<string, number>;

  @Prop({ type: RouteLocationDetailsSchema, required: false })
  firstPlaceDetails?: RouteLocationDetails;

  @Prop({ type: RouteLocationDetailsSchema, required: false })
  lastPlaceDetails?: RouteLocationDetails;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: '', trim: true })
  notes?: string;
}

export const RouteSchema = SchemaFactory.createForClass(Route);

// Compound index to quickly find routes matching pickup and dropoff places
RouteSchema.index({ firstPlace: 1, lastPlace: 1 });
