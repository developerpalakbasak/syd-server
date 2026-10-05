import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole, UserStatus } from './user.enums.js';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  /**
   * Accounts are strictly for authenticated system users (Drivers and Admins).
   * Customers/passengers book as guests without accounts.
   */
  @Prop({ type: [String], enum: UserRole, default: [UserRole.DRIVER] })
  roles: UserRole[];

  @Prop({ default: 'en' })
  language: string;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;
}

export const UserSchema = SchemaFactory.createForClass(User);
