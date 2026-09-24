import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  INVESTIGATOR_ASSIGNED = 'INVESTIGATOR_ASSIGNED',
  CASE_STATUS_CHANGED = 'CASE_STATUS_CHANGED',
  COMPLAINT_STATUS_CHANGED = 'COMPLAINT_STATUS_CHANGED',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, index: true })
  userId: string; // The user who should receive this notification

  @Prop({ required: true })
  caseId: string; // The case this notification belongs to

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
