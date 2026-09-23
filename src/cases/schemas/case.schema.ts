import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ComplaintCategory, LocationDetails, EvidenceItem } from '../../complaints/schemas/complaint.schema';

export type CaseDocument = Case & Document;

export enum CaseStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum CasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Schema({ _id: false })
export class CaseTimelineEvent {
  @Prop({ type: String, enum: CaseStatus, required: true })
  status: CaseStatus;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  note: string;

  @Prop({ default: 'System' })
  updatedBy: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

@Schema({ _id: false })
export class InvestigationNote {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  note: string;

  @Prop({ required: true })
  authorName: string;

  @Prop({ required: true })
  authorId: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ _id: false })
export class ComplaintSnapshot {
  @Prop({ required: true })
  trackingNumber: string;

  @Prop({ default: 'Citizen' })
  citizenName: string;

  @Prop({ default: '' })
  citizenEmail: string;

  @Prop({ default: '' })
  citizenPhone: string;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ required: true })
  incidentDate: Date;

  @Prop({ type: LocationDetails, required: true })
  incidentLocation: LocationDetails;

  @Prop({ required: true })
  description: string;

  @Prop({ default: '' })
  witnessInfo: string;
}

@Schema({ timestamps: true })
export class Case {
  @Prop({ required: true, unique: true, index: true, uppercase: true, trim: true })
  caseNumber: string;

  @Prop({ required: true, index: true })
  complaintId: string; // Mongo ID or Tracking Number of original complaint

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: String, enum: ComplaintCategory, required: true })
  category: ComplaintCategory;

  @Prop({
    type: String,
    enum: CasePriority,
    default: CasePriority.MEDIUM,
  })
  priority: CasePriority;

  @Prop({
    type: String,
    enum: CaseStatus,
    default: CaseStatus.NEW,
    index: true,
  })
  status: CaseStatus;

  @Prop({ default: '', index: true, trim: true })
  assignedInvestigatorId: string; // Firebase UID or Mongo User ID of investigator (empty when NEW)

  @Prop({ default: '', trim: true })
  assignedInvestigatorName: string;

  @Prop({ default: '', trim: true })
  assignedInvestigatorEmail: string;

  @Prop({ default: 'Admin' })
  assignedBy: string;

  @Prop({ default: Date.now })
  assignedAt: Date;

  @Prop({ type: ComplaintSnapshot, required: true })
  complaintDetails: ComplaintSnapshot;

  @Prop({ type: [EvidenceItem], default: [] })
  evidence: EvidenceItem[];

  @Prop({ type: [InvestigationNote], default: [] })
  investigationNotes: InvestigationNote[];

  @Prop({ type: [CaseTimelineEvent], default: [] })
  statusTimeline: CaseTimelineEvent[];

  @Prop({ default: '' })
  findings?: string;
}

export const CaseSchema = SchemaFactory.createForClass(Case);
