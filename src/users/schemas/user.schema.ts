import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  CITIZEN = 'CITIZEN',
  INVESTIGATOR = 'INVESTIGATOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true, trim: true })
  firebaseUid: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: '', trim: true })
  phone: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.CITIZEN })
  role: UserRole;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ default: false })
  isProfileComplete: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
