import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Case,
  CaseDocument,
  CaseStatus,
  CasePriority,
} from './schemas/case.schema';
import {
  Complaint,
  ComplaintDocument,
  ComplaintStatus,
} from '../complaints/schemas/complaint.schema';
import { CreateCaseDto } from './dto/create-case.dto';
import {
  UpdateCaseStatusDto,
  AddCaseEvidenceDto,
  AddCaseNoteDto,
  UpdateCaseDetailsDto,
} from './dto/update-case.dto';
import { AssignInvestigatorDto } from './dto/assign-investigator.dto';
import { User, UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class CasesService {
  constructor(
    @InjectModel(Case.name)
    private readonly caseModel: Model<CaseDocument>,
    @InjectModel(Complaint.name)
    private readonly complaintModel: Model<ComplaintDocument>,
    private readonly usersService: UsersService,
  ) {}

  private generateCaseNumber(): string {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `CASE-${year}-${randomDigits}`;
  }

  private getUserIdentifier(user: User): string {
    return user.firebaseUid || (user as any)._id?.toString() || (user as any).id || '';
  }

  private getUserFullName(user: User): string {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Officer';
  }

  private verifyCaseModificationPermission(caseDoc: CaseDocument, user: User): void {
    const userIdentifier = this.getUserIdentifier(user);
    const isAssigned =
      caseDoc.assignedInvestigatorId === userIdentifier ||
      (user.email && caseDoc.assignedInvestigatorEmail && caseDoc.assignedInvestigatorEmail.toLowerCase() === user.email.toLowerCase());
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAssigned && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to modify this case because it is not assigned to you.',
      );
    }
  }

  async create(dto: CreateCaseDto, creatorUser: User): Promise<Case> {
    const caseNumber = this.generateCaseNumber();
    const creatorName = this.getUserFullName(creatorUser);

    const newCase = new this.caseModel({
      caseNumber,
      complaintId: dto.complaintId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority: dto.priority || CasePriority.MEDIUM,
      status: dto.assignedInvestigatorId ? CaseStatus.PENDING : CaseStatus.NEW,
      assignedInvestigatorId: dto.assignedInvestigatorId,
      assignedInvestigatorName: dto.assignedInvestigatorName,
      assignedInvestigatorEmail: dto.assignedInvestigatorEmail || '',
      assignedBy: creatorName,
      assignedAt: new Date(),
      complaintDetails: dto.complaintDetails,
      evidence: dto.evidence || [],
      investigationNotes: dto.initialNote
        ? [
            {
              id: `note-${Date.now()}`,
              note: dto.initialNote,
              authorName: creatorName,
              authorId: this.getUserIdentifier(creatorUser),
              createdAt: new Date(),
            },
          ]
        : [],
      statusTimeline: [
        {
          status: dto.assignedInvestigatorId ? CaseStatus.PENDING : CaseStatus.NEW,
          title: dto.assignedInvestigatorId ? 'Case Created and Investigator Assigned' : 'New Case Created',
          note: dto.assignedInvestigatorId
            ? `Case assigned to ${dto.assignedInvestigatorName} by ${creatorName}.`
            : `Case created and awaiting investigator assignment by ${creatorName}.`,
          updatedBy: creatorName,
          timestamp: new Date(),
        },
      ],
      findings: '',
    });

    return await newCase.save();
  }

  async getAvailableInvestigators(): Promise<any[]> {
    const investigators = await this.usersService.findInvestigators();

    // Query active case counts for each investigator
    const activeCaseAggregations = await this.caseModel.aggregate([
      {
        $match: {
          status: {
            $in: [
              CaseStatus.PENDING,
              CaseStatus.UNDER_INVESTIGATION,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$assignedInvestigatorId',
          count: { $sum: 1 },
        },
      },
    ]);

    const activeCountMap = new Map<string, number>();
    for (const item of activeCaseAggregations) {
      if (item._id) {
        activeCountMap.set(String(item._id), item.count);
      }
    }

    return investigators.map((inv) => {
      const id = (inv as any)._id?.toString();
      const uid = inv.firebaseUid || id;
      const count = activeCountMap.get(uid) || activeCountMap.get(id) || (inv.email ? activeCountMap.get(inv.email.toLowerCase()) : 0) || 0;

      return {
        _id: id,
        firebaseUid: inv.firebaseUid,
        firstName: inv.firstName,
        lastName: inv.lastName,
        name: `${inv.firstName || ''} ${inv.lastName || ''}`.trim() || 'Investigator',
        email: inv.email,
        phone: inv.phone || '',
        status: inv.status,
        activeCasesCount: count,
      };
    });
  }

  async assignInvestigator(
    idOrCaseNumber: string,
    dto: AssignInvestigatorDto,
    adminUser: User,
  ): Promise<Case> {
    const caseDoc = await this.findById(idOrCaseNumber, adminUser);
    const adminName = this.getUserFullName(adminUser);

    const previousInvestigator = caseDoc.assignedInvestigatorName;

    // Link investigator to case
    caseDoc.assignedInvestigatorId = dto.investigatorId;
    caseDoc.assignedInvestigatorName = dto.investigatorName;
    if (dto.investigatorEmail) {
      caseDoc.assignedInvestigatorEmail = dto.investigatorEmail;
    }
    if (dto.priority) {
      caseDoc.priority = dto.priority;
    }
    caseDoc.assignedBy = adminName;
    caseDoc.assignedAt = new Date();

    if (caseDoc.status === CaseStatus.RESOLVED || caseDoc.status === CaseStatus.CLOSED) {
      caseDoc.status = CaseStatus.PENDING;
    }

    const assignmentNote = dto.note
      ? `Case assigned to ${dto.investigatorName} by ${adminName}. Special instructions: ${dto.note}`
      : previousInvestigator && previousInvestigator !== dto.investigatorName
      ? `Case reassigned from ${previousInvestigator} to ${dto.investigatorName} by ${adminName}.`
      : `Case assigned to ${dto.investigatorName} by ${adminName}.`;

    // Record assignment in timeline audit log
    caseDoc.statusTimeline.push({
      status: caseDoc.status,
      title: 'Investigator Assigned',
      note: assignmentNote,
      updatedBy: adminName,
      timestamp: new Date(),
    });

    return await caseDoc.save();
  }

  async assignInvestigatorToComplaint(
    complaintId: string,
    dto: AssignInvestigatorDto,
    adminUser: User,
  ): Promise<Case> {
    let complaint: ComplaintDocument | null = null;
    if (complaintId.startsWith('JN-')) {
      complaint = await this.complaintModel.findOne({ trackingNumber: complaintId }).exec();
    } else {
      try {
        complaint = await this.complaintModel.findById(complaintId).exec();
      } catch {
        complaint = await this.complaintModel.findOne({ trackingNumber: complaintId }).exec();
      }
    }

    if (!complaint) {
      throw new NotFoundException(`Complaint not found with ID: ${complaintId}`);
    }

    const adminName = this.getUserFullName(adminUser);

    // If already converted to case, re-assign existing case
    if (complaint.caseId) {
      return this.assignInvestigator(complaint.caseId, dto, adminUser);
    }

    const caseNumber = this.generateCaseNumber();

    const newCase = new this.caseModel({
      caseNumber,
      complaintId: complaint.trackingNumber || (complaint as any)._id?.toString(),
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: dto.priority || (complaint.priority as any) || CasePriority.MEDIUM,
      status: CaseStatus.PENDING,
      assignedInvestigatorId: dto.investigatorId,
      assignedInvestigatorName: dto.investigatorName,
      assignedInvestigatorEmail: dto.investigatorEmail || '',
      assignedBy: adminName,
      assignedAt: new Date(),
      complaintDetails: {
        trackingNumber: complaint.trackingNumber,
        citizenName: complaint.citizenName,
        citizenEmail: complaint.citizenEmail,
        citizenPhone: complaint.citizenPhone,
        isAnonymous: complaint.isAnonymous,
        incidentDate: complaint.incidentDate,
        incidentLocation: complaint.incidentLocation,
        description: complaint.description,
        witnessInfo: complaint.witnessInfo || '',
      },
      evidence: complaint.evidence || [],
      investigationNotes: dto.note
        ? [
            {
              id: `note-${Date.now()}`,
              note: `Initial instructions: ${dto.note}`,
              authorName: adminName,
              authorId: this.getUserIdentifier(adminUser),
              createdAt: new Date(),
            },
          ]
        : [],
      statusTimeline: [
        {
          status: CaseStatus.PENDING,
          title: 'Case Created and Investigator Assigned',
          note: `Case created from approved complaint ${complaint.trackingNumber} and assigned to ${dto.investigatorName} by ${adminName}.${dto.note ? ` Notes: ${dto.note}` : ''}`,
          updatedBy: adminName,
          timestamp: new Date(),
        },
      ],
      findings: '',
    });

    const savedCase = await newCase.save();

    // Update Complaint with case reference & assignment
    complaint.status = ComplaintStatus.CONVERTED_TO_CASE;
    complaint.caseId = savedCase.caseNumber;
    complaint.assignedInvestigatorId = dto.investigatorId;
    complaint.statusTimeline.push({
      status: ComplaintStatus.CONVERTED_TO_CASE,
      title: 'Converted to Case & Investigator Assigned',
      note: `Complaint assigned to ${dto.investigatorName} (Case Ref: ${savedCase.caseNumber}).`,
      updatedBy: adminName,
      timestamp: new Date(),
    });

    await complaint.save();
    return savedCase;
  }

  async findAssignedCases(user: User, status?: CaseStatus): Promise<Case[]> {
    const userIdentifier = this.getUserIdentifier(user);
    const filter: Record<string, any> = {
      $or: [
        { assignedInvestigatorId: userIdentifier },
        { assignedInvestigatorEmail: user.email?.toLowerCase() },
      ],
    };

    if (status) {
      filter.status = status;
    }

    return await this.caseModel.find(filter).sort({ updatedAt: -1 }).exec();
  }

  async findAll(user: User, status?: CaseStatus): Promise<any[]> {
    if (user.role === UserRole.INVESTIGATOR) {
      return this.findAssignedCases(user, status);
    }

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const cases = await this.caseModel.find(filter).sort({ updatedAt: -1 }).exec();

    // Also include approved complaints awaiting assignment
    if (!status || status === CaseStatus.NEW) {
      const approvedComplaints = await this.complaintModel
        .find({
          status: ComplaintStatus.APPROVED,
          $or: [{ caseId: { $exists: false } }, { caseId: '' }, { caseId: null }],
        })
        .sort({ updatedAt: -1 })
        .exec();

      const virtualUnassignedCases = approvedComplaints.map((comp) => {
        const createdAt = (comp as any).createdAt || new Date();
        const updatedAt = (comp as any).updatedAt || createdAt;

        return {
          _id: (comp as any)._id?.toString(),
          caseNumber: comp.trackingNumber,
          complaintId: comp.trackingNumber,
          title: comp.title,
          description: comp.description,
          category: comp.category,
          priority: comp.priority || CasePriority.MEDIUM,
          status: CaseStatus.NEW,
          assignedInvestigatorId: '',
          assignedInvestigatorName: '',
          assignedInvestigatorEmail: '',
          assignedBy: '',
          assignedAt: updatedAt,
          complaintDetails: {
            trackingNumber: comp.trackingNumber,
            citizenName: comp.citizenName,
            citizenEmail: comp.citizenEmail,
            citizenPhone: comp.citizenPhone,
            isAnonymous: comp.isAnonymous,
            incidentDate: comp.incidentDate,
            incidentLocation: comp.incidentLocation,
            description: comp.description,
            witnessInfo: comp.witnessInfo,
          },
          evidence: comp.evidence || [],
          investigationNotes: [],
          statusTimeline: comp.statusTimeline || [],
          createdAt,
          updatedAt,
        };
      });

      return [...virtualUnassignedCases, ...cases];
    }

    return cases;
  }

  async findById(idOrCaseNumber: string, user?: User): Promise<CaseDocument> {
    let caseDoc: CaseDocument | null = null;

    if (idOrCaseNumber.startsWith('CASE-')) {
      caseDoc = await this.caseModel.findOne({ caseNumber: idOrCaseNumber }).exec();
    } else {
      try {
        caseDoc = await this.caseModel.findById(idOrCaseNumber).exec();
      } catch {
        caseDoc = await this.caseModel.findOne({ caseNumber: idOrCaseNumber }).exec();
      }
    }

    if (!caseDoc) {
      throw new NotFoundException(`Case not found with identifier: ${idOrCaseNumber}`);
    }

    return caseDoc;
  }

  async updateStatus(
    idOrCaseNumber: string,
    dto: UpdateCaseStatusDto,
    user: User,
  ): Promise<Case> {
    const caseDoc = await this.findById(idOrCaseNumber, user);
    this.verifyCaseModificationPermission(caseDoc, user);

    const updaterName = this.getUserFullName(user);
    caseDoc.status = dto.status;

    if (dto.findings) {
      caseDoc.findings = dto.findings;
    }

    const statusTitleMap: Record<CaseStatus, string> = {
      [CaseStatus.NEW]: 'New Case Created',
      [CaseStatus.PENDING]: 'Investigator Assigned — Pending Start',
      [CaseStatus.UNDER_INVESTIGATION]: 'Investigation Commenced',
      [CaseStatus.RESOLVED]: 'Case Resolved',
      [CaseStatus.CLOSED]: 'Case Closed',
    };

    caseDoc.statusTimeline.push({
      status: dto.status,
      title: statusTitleMap[dto.status] || `Status Changed to ${dto.status}`,
      note: dto.note || `Case status updated to ${dto.status.replace(/_/g, ' ')} by ${updaterName}.`,
      updatedBy: updaterName,
      timestamp: new Date(),
    });

    return await caseDoc.save();
  }

  async addEvidence(
    idOrCaseNumber: string,
    dto: AddCaseEvidenceDto,
    user: User,
  ): Promise<Case> {
    const caseDoc = await this.findById(idOrCaseNumber, user);
    this.verifyCaseModificationPermission(caseDoc, user);

    const updaterName = this.getUserFullName(user);
    const evidenceId = `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newEvidence = {
      id: evidenceId,
      name: dto.name,
      type: dto.type,
      url: dto.url,
      size: dto.size || 0,
      uploadedAt: new Date(),
    };

    caseDoc.evidence.push(newEvidence);

    caseDoc.statusTimeline.push({
      status: caseDoc.status,
      title: 'New Evidence Attached',
      note: `Evidence "${dto.name}" (${dto.type}) added by ${updaterName}.${dto.description ? ` Details: ${dto.description}` : ''}`,
      updatedBy: updaterName,
      timestamp: new Date(),
    });

    return await caseDoc.save();
  }

  async addNote(
    idOrCaseNumber: string,
    dto: AddCaseNoteDto,
    user: User,
  ): Promise<Case> {
    const caseDoc = await this.findById(idOrCaseNumber, user);
    this.verifyCaseModificationPermission(caseDoc, user);

    const updaterName = this.getUserFullName(user);
    const userIdentifier = this.getUserIdentifier(user);

    caseDoc.investigationNotes.push({
      id: `note-${Date.now()}`,
      note: dto.note,
      authorName: updaterName,
      authorId: userIdentifier,
      createdAt: new Date(),
    });

    return await caseDoc.save();
  }

  async updateDetails(
    idOrCaseNumber: string,
    dto: UpdateCaseDetailsDto,
    user: User,
  ): Promise<Case> {
    const caseDoc = await this.findById(idOrCaseNumber, user);
    this.verifyCaseModificationPermission(caseDoc, user);

    if (dto.title) caseDoc.title = dto.title;
    if (dto.description) caseDoc.description = dto.description;
    if (dto.priority) caseDoc.priority = dto.priority;
    if (dto.findings !== undefined) caseDoc.findings = dto.findings;

    return await caseDoc.save();
  }

  async getMetrics(user: User): Promise<any> {
    const userIdentifier = this.getUserIdentifier(user);
    const isInvestigator = user.role === UserRole.INVESTIGATOR;

    const baseFilter = isInvestigator
      ? {
          $or: [
            { assignedInvestigatorId: userIdentifier },
            { assignedInvestigatorEmail: user.email?.toLowerCase() },
          ],
        }
      : {};

    const total = await this.caseModel.countDocuments(baseFilter).exec();
    const newCases = await this.caseModel.countDocuments({ ...baseFilter, status: CaseStatus.NEW }).exec();
    const pending = await this.caseModel.countDocuments({ ...baseFilter, status: CaseStatus.PENDING }).exec();
    const underInvestigation = await this.caseModel.countDocuments({ ...baseFilter, status: CaseStatus.UNDER_INVESTIGATION }).exec();
    const resolved = await this.caseModel.countDocuments({ ...baseFilter, status: CaseStatus.RESOLVED }).exec();
    const closed = await this.caseModel.countDocuments({ ...baseFilter, status: CaseStatus.CLOSED }).exec();

    return {
      total,
      newCases,
      pending,
      underInvestigation,
      resolved,
      closed,
      active: newCases + pending + underInvestigation,
    };
  }
}
