import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminDocument = HydratedDocument<Admin>;

// Role types for administrative and managerial staff
export enum AdminRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
}

// Mongoose schema for administrative users (Admin & Manager).
// Collection is explicitly named 'admins' to leave the 'users' collection open for future public/customer accounts.
@Schema({ timestamps: true, collection: 'admins' })
export class Admin {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  email: string;

  // Stored as secure hash; excluded from normal queries by default
  @Prop({ required: true, select: false })
  password: string;

  // Role can be 'admin' or 'manager'
  @Prop({
    required: true,
    enum: Object.values(AdminRole),
    default: AdminRole.ADMIN,
    index: true,
  })
  role: AdminRole;

  @Prop({ trim: true, default: '' })
  phone?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date | null;

  // Stored as raw hash of admin MongoDB _id; excluded from normal queries by default
  @Prop({ type: String, default: null, select: false, index: true })
  refreshToken?: string | null;

  // Timestamp when the stored refreshToken expires (7 days by default)
  @Prop({ type: Date, default: null, select: false })
  refreshTokenExpiresAt?: Date | null;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
