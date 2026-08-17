import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ComplaintDocument = Complaint & Document;

export enum ComplaintCategory {
  POLICE_MISCONDUCT = 'POLICE_MISCONDUCT',
  DISCRIMINATION = 'DISCRIMINATION',
  ARBITRARY_DETENTION = 'ARBITRARY_DETENTION',
  FREEDOM_OF_EXPRESSION = 'FREEDOM_OF_EXPRESSION',
  LABOR_RIGHTS = 'LABOR_RIGHTS',
  GENDER_BASED_VIOLENCE = 'GENDER_BASED_VIOLENCE',
  CHILD_RIGHTS = 'CHILD_RIGHTS',
  OTHER = 'OTHER',
}

export enum ComplaintStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED_TO_CASE = 'CONVERTED_TO_CASE',
}

export enum ComplaintPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Schema({ _id: false })
export class LocationDetails {
  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ default: '', trim: true })
  details?: string;
}

@Schema({ _id: false })
export class EvidenceItem {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string; // 'image', 'document', 'audio', 'video'

  @Prop({ required: true })
  url: string;

  @Prop({ default: 0 })
  size?: number;

  @Prop({ default: Date.now })
  uploadedAt: Date;
}

@Schema({ _id: false })
export class TimelineEvent {
  @Prop({ type: String, enum: ComplaintStatus, required: true })
  status: ComplaintStatus;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  note: string;

  @Prop({ default: 'System' })
  updatedBy: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

@Schema({ timestamps: true })
export class Complaint {
  @Prop({ required: true, unique: true, index: true, uppercase: true, trim: true })
  trackingNumber: string;

  @Prop({ required: true, index: true })
  citizenId: string;

  @Prop({ required: true, trim: true })
  citizenName: string;

  @Prop({ required: true, trim: true })
  citizenEmail: string;

  @Prop({ default: '', trim: true })
  citizenPhone: string;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ type: String, enum: ComplaintCategory, required: true })
  category: ComplaintCategory;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true })
  incidentDate: Date;

  @Prop({ type: LocationDetails, required: true })
  incidentLocation: LocationDetails;

  @Prop({ default: '', trim: true })
  witnessInfo: string;

  @Prop({ type: [EvidenceItem], default: [] })
  evidence: EvidenceItem[];

  @Prop({
    type: String,
    enum: ComplaintStatus,
    default: ComplaintStatus.SUBMITTED,
    index: true,
  })
  status: ComplaintStatus;

  @Prop({
    type: String,
    enum: ComplaintPriority,
    default: ComplaintPriority.MEDIUM,
  })
  priority: ComplaintPriority;

  @Prop({ type: [TimelineEvent], default: [] })
  statusTimeline: TimelineEvent[];

  @Prop({ default: null })
  assignedInvestigatorId?: string;

  @Prop({ default: null })
  caseId?: string;

  @Prop({ default: '' })
  adminReviewNotes?: string;
}

export const ComplaintSchema = SchemaFactory.createForClass(Complaint);
