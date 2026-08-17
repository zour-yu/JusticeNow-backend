import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Complaint,
  ComplaintDocument,
  ComplaintStatus,
} from './schemas/complaint.schema';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { User, UserRole } from '../users/schemas/user.schema';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectModel(Complaint.name)
    private readonly complaintModel: Model<ComplaintDocument>,
  ) {}

  private generateTrackingNumber(): string {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `JN-${year}-${randomDigits}`;
  }

  async create(user: User, dto: CreateComplaintDto): Promise<Complaint> {
    const trackingNumber = this.generateTrackingNumber();

    const citizenIdentifier = user.firebaseUid || (user as any)._id?.toString() || 'anonymous';
    const citizenFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Citizen';

    const newComplaint = new this.complaintModel({
      trackingNumber,
      citizenId: citizenIdentifier,
      citizenName: dto.isAnonymous ? 'Anonymous Citizen' : citizenFullName,
      citizenEmail: dto.isAnonymous ? 'anonymous@justicenow.org' : user.email,
      citizenPhone: dto.isAnonymous ? '' : user.phone || '',
      isAnonymous: !!dto.isAnonymous,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      incidentDate: new Date(dto.incidentDate),
      incidentLocation: dto.incidentLocation,
      witnessInfo: dto.witnessInfo || '',
      evidence: dto.evidence || [],
      status: ComplaintStatus.SUBMITTED,
      statusTimeline: [
        {
          status: ComplaintStatus.SUBMITTED,
          title: 'Complaint Submitted',
          note: 'Complaint officially submitted and logged in the Justice Now system.',
          updatedBy: 'Citizen',
          timestamp: new Date(),
        },
      ],
    });

    return await newComplaint.save();
  }

  async findMyComplaints(user: User): Promise<Complaint[]> {
    const citizenIdentifier = user.firebaseUid || (user as any)._id?.toString();
    return await this.complaintModel
      .find({ citizenId: citizenIdentifier })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(idOrTracking: string, user?: User): Promise<Complaint> {
    let complaint: ComplaintDocument | null = null;

    if (idOrTracking.startsWith('JN-')) {
      complaint = await this.complaintModel.findOne({ trackingNumber: idOrTracking }).exec();
    } else {
      try {
        complaint = await this.complaintModel.findById(idOrTracking).exec();
      } catch {
        complaint = await this.complaintModel.findOne({ trackingNumber: idOrTracking }).exec();
      }
    }

    if (!complaint) {
      throw new NotFoundException(`Complaint not found: ${idOrTracking}`);
    }

    // Role-based access control check
    if (user && user.role === UserRole.CITIZEN) {
      const citizenIdentifier = user.firebaseUid || (user as any)._id?.toString();
      if (complaint.citizenId !== citizenIdentifier) {
        throw new ForbiddenException('You are not authorized to view this complaint.');
      }
    }

    return complaint;
  }

  async findAll(status?: ComplaintStatus): Promise<Complaint[]> {
    const filter = status ? { status } : {};
    return await this.complaintModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async updateStatus(
    id: string,
    dto: UpdateComplaintStatusDto,
    adminUser: User,
  ): Promise<Complaint> {
    const complaint = await this.complaintModel.findById(id).exec();
    if (!complaint) {
      throw new NotFoundException(`Complaint not found with ID: ${id}`);
    }

    complaint.status = dto.status;
    if (dto.priority) complaint.priority = dto.priority;
    if (dto.assignedInvestigatorId) complaint.assignedInvestigatorId = dto.assignedInvestigatorId;
    if (dto.caseId) complaint.caseId = dto.caseId;

    const updaterName = `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Administrator';
    
    complaint.statusTimeline.push({
      status: dto.status,
      title: `Status Updated to ${dto.status.replace(/_/g, ' ')}`,
      note: dto.note || `Complaint status was updated by ${updaterName}.`,
      updatedBy: updaterName,
      timestamp: new Date(),
    });

    return await complaint.save();
  }

  async getMetrics(): Promise<any> {
    const total = await this.complaintModel.countDocuments().exec();
    const submitted = await this.complaintModel.countDocuments({ status: ComplaintStatus.SUBMITTED }).exec();
    const underReview = await this.complaintModel.countDocuments({ status: ComplaintStatus.UNDER_REVIEW }).exec();
    const approved = await this.complaintModel.countDocuments({ status: ComplaintStatus.APPROVED }).exec();
    const converted = await this.complaintModel.countDocuments({ status: ComplaintStatus.CONVERTED_TO_CASE }).exec();
    const rejected = await this.complaintModel.countDocuments({ status: ComplaintStatus.REJECTED }).exec();

    return {
      total,
      submitted,
      underReview,
      approved,
      converted,
      rejected,
    };
  }
}
