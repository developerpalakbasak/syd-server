import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema.js';

export type CustomerProfileDocument = HydratedDocument<CustomerProfile>;

@Schema({ timestamps: true })
export class CustomerProfile {
  /**
   * We use Types.ObjectId and `ref: 'User'` to create a relation to the base User document.
   * This is a One-to-One relationship since the index is set to `unique: true`.
   * Separating Auth/Base data (User) from Profile data keeps the base User collection lean,
   * which is crucial for scalability when querying auth tokens and verifying logins.
   */
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true, index: true })
  userId: Types.ObjectId;

  /**
   * Nested objects for saved locations (e.g. Home, Work).
   */
  @Prop({
    type: [{
      name: { type: String },
      coordinates: { type: [Number] }, // Typically [longitude, latitude] for GeoJSON
    }],
    default: [],
  })
  savedLocations: Array<{ name: string; coordinates: number[] }>;

  /**
   * Tokens only, no raw card data per API spec.
   */
  @Prop({ type: [String], default: [] })
  paymentTokens: string[];
}

export const CustomerProfileSchema = SchemaFactory.createForClass(CustomerProfile);
