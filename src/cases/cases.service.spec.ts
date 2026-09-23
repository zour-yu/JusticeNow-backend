import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CasesService } from './cases.service';
import { Case, CaseStatus, CasePriority } from './schemas/case.schema';
import { Complaint, ComplaintStatus } from '../complaints/schemas/complaint.schema';
import { User, UserRole, UserStatus } from '../users/schemas/user.schema';
import { ComplaintCategory } from '../complaints/schemas/complaint.schema';
import { UsersService } from '../users/users.service';

describe('CasesService', () => {
  let service: CasesService;
  let mockCaseModel: any;
  let mockComplaintModel: any;
  let mockUsersService: any;

  const mockInvestigator1: User = {
    firebaseUid: 'inv-uid-1',
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah.connor@justicenow.org',
    phone: '+1234567890',
    role: UserRole.INVESTIGATOR,
    status: UserStatus.ACTIVE,
    isProfileComplete: true,
  };

  const mockInvestigator2: User = {
    firebaseUid: 'inv-uid-2',
    firstName: 'John',
    lastName: 'Rambo',
    email: 'john.rambo@justicenow.org',
    phone: '+1234567899',
    role: UserRole.INVESTIGATOR,
    status: UserStatus.ACTIVE,
    isProfileComplete: true,
  };

  const mockAdmin: User = {
    firebaseUid: 'admin-uid-1',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@justicenow.org',
    phone: '+1111111111',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    isProfileComplete: true,
  };

  const createMockCaseDoc = (assignedUid = 'inv-uid-1') => ({
    _id: 'case-mongo-id-1',
    caseNumber: 'CASE-2026-123456',
    complaintId: 'JN-2026-0001',
    title: 'Police Brutality at Protest',
    description: 'Protester was unlawfully detained and assaulted.',
    category: ComplaintCategory.POLICE_MISCONDUCT,
    priority: CasePriority.HIGH,
    status: CaseStatus.PENDING,
    assignedInvestigatorId: assignedUid,
    assignedInvestigatorName: 'Sarah Connor',
    assignedInvestigatorEmail: 'sarah.connor@justicenow.org',
    assignedBy: 'Admin User',
    assignedAt: new Date(),
    complaintDetails: {
      trackingNumber: 'JN-2026-0001',
      citizenName: 'Jane Doe',
      citizenEmail: 'jane@example.com',
      citizenPhone: '+1987654321',
      isAnonymous: false,
      incidentDate: new Date(),
      incidentLocation: { city: 'Colombo', address: 'Main Street' },
      description: 'Incident narrative description',
      witnessInfo: '2 witnesses',
    },
    evidence: [],
    investigationNotes: [],
    statusTimeline: [],
    findings: '',
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
  });

  const createMockComplaintDoc = () => ({
    _id: 'complaint-mongo-id-1',
    trackingNumber: 'JN-2026-999999',
    title: 'Unlawful Eviction',
    description: 'Tenant forcibly evicted without court order.',
    category: ComplaintCategory.HOUSING_RIGHTS || ComplaintCategory.OTHER,
    priority: CasePriority.HIGH,
    status: ComplaintStatus.APPROVED,
    citizenName: 'Citizen Mark',
    citizenEmail: 'mark@example.com',
    citizenPhone: '+12345',
    isAnonymous: false,
    incidentDate: new Date(),
    incidentLocation: { city: 'Kandy', address: 'Lake Road' },
    evidence: [],
    statusTimeline: [],
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
  });

  beforeEach(async () => {
    mockCaseModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: 'new-id' }),
    }));

    mockCaseModel.find = jest.fn();
    mockCaseModel.findOne = jest.fn();
    mockCaseModel.findById = jest.fn();
    mockCaseModel.countDocuments = jest.fn();
    mockCaseModel.aggregate = jest.fn().mockResolvedValue([]);

    mockComplaintModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: 'new-comp-id' }),
    }));
    mockComplaintModel.find = jest.fn();
    mockComplaintModel.findOne = jest.fn();
    mockComplaintModel.findById = jest.fn();

    mockUsersService = {
      findInvestigators: jest.fn().mockResolvedValue([mockInvestigator1, mockInvestigator2]),
      findByFirebaseUid: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        {
          provide: getModelToken(Case.name),
          useValue: mockCaseModel,
        },
        {
          provide: getModelToken(Complaint.name),
          useValue: mockComplaintModel,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<CasesService>(CasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Administrator Case Assignment', () => {
    it('should retrieve available investigators with active case workloads', async () => {
      mockCaseModel.aggregate.mockResolvedValue([
        { _id: 'inv-uid-1', count: 3 },
      ]);

      const investigators = await service.getAvailableInvestigators();

      expect(mockUsersService.findInvestigators).toHaveBeenCalled();
      expect(investigators.length).toBe(2);
      expect(investigators[0].name).toBe('Sarah Connor');
      expect(investigators[0].activeCasesCount).toBe(3);
      expect(investigators[1].name).toBe('John Rambo');
      expect(investigators[1].activeCasesCount).toBe(0);
    });

    it('should assign an investigator to an existing case and record audit in timeline', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1');
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const updatedCase = await service.assignInvestigator(
        'CASE-2026-123456',
        {
          investigatorId: 'inv-uid-2',
          investigatorName: 'John Rambo',
          investigatorEmail: 'john.rambo@justicenow.org',
          note: 'Urgent priority, please expedite interviews',
        },
        mockAdmin,
      );

      expect(updatedCase.assignedInvestigatorId).toBe('inv-uid-2');
      expect(updatedCase.assignedInvestigatorName).toBe('John Rambo');
      expect(updatedCase.assignedInvestigatorEmail).toBe('john.rambo@justicenow.org');
      expect(updatedCase.assignedBy).toBe('Admin User');

      // Verify audit timeline record
      const lastTimelineEvent = updatedCase.statusTimeline[updatedCase.statusTimeline.length - 1];
      expect(lastTimelineEvent.title).toBe('Investigator Assigned');
      expect(lastTimelineEvent.note).toContain('John Rambo');
      expect(lastTimelineEvent.note).toContain('Urgent priority');
      expect(lastTimelineEvent.updatedBy).toBe('Admin User');
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should assign an investigator to an approved complaint and create linked case', async () => {
      const mockComplaint = createMockComplaintDoc();
      mockComplaintModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockComplaint),
      });

      const resultCase = await service.assignInvestigatorToComplaint(
        'JN-2026-999999',
        {
          investigatorId: 'inv-uid-1',
          investigatorName: 'Sarah Connor',
          investigatorEmail: 'sarah.connor@justicenow.org',
          note: 'Proceed with field visit',
        },
        mockAdmin,
      );

      expect(resultCase.assignedInvestigatorId).toBe('inv-uid-1');
      expect(resultCase.assignedInvestigatorName).toBe('Sarah Connor');
      expect(mockComplaint.status).toBe(ComplaintStatus.CONVERTED_TO_CASE);
      expect(mockComplaint.assignedInvestigatorId).toBe('inv-uid-1');
      expect(mockComplaint.save).toHaveBeenCalled();
    });
  });

  describe('findAssignedCases', () => {
    it('should find cases assigned to the investigator', async () => {
      const mockResult = [createMockCaseDoc('inv-uid-1')];
      const exec = jest.fn().mockResolvedValue(mockResult);
      const sort = jest.fn().mockReturnValue({ exec });
      mockCaseModel.find.mockReturnValue({ sort });

      const result = await service.findAssignedCases(mockInvestigator1);

      expect(mockCaseModel.find).toHaveBeenCalledWith({
        $or: [
          { assignedInvestigatorId: 'inv-uid-1' },
          { assignedInvestigatorEmail: 'sarah.connor@justicenow.org' },
        ],
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('findById', () => {
    it('should retrieve a case by caseNumber or ID', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1');
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await service.findById('CASE-2026-123456', mockInvestigator1);
      expect(result).toBe(mockDoc);
    });

    it('should throw NotFoundException if case does not exist', async () => {
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findById('CASE-2026-999999', mockInvestigator1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authorization: updateStatus', () => {
    it('should allow the assigned investigator to update case status', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1');
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await service.updateStatus(
        'CASE-2026-123456',
        { status: CaseStatus.UNDER_INVESTIGATION, note: 'Started field work' },
        mockInvestigator1,
      );

      expect(result.status).toBe(CaseStatus.UNDER_INVESTIGATION);
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should reject modification from an investigator NOT assigned to the case', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1'); // assigned to inv 1
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      // inv 2 attempts to modify
      await expect(
        service.updateStatus(
          'CASE-2026-123456',
          { status: CaseStatus.CLOSED, note: 'Unauthorized close attempt' },
          mockInvestigator2,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to modify even if not assigned', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1');
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await service.updateStatus(
        'CASE-2026-123456',
        { status: CaseStatus.RESOLVED, findings: 'Case concluded by Admin' },
        mockAdmin,
      );

      expect(result.status).toBe(CaseStatus.RESOLVED);
    });
  });

  describe('Authorization: addEvidence & addNote', () => {
    it('should allow assigned investigator to add evidence', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1');
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await service.addEvidence(
        'CASE-2026-123456',
        {
          name: 'cctv_footage.mp4',
          type: 'video',
          url: 'https://example.com/cctv.mp4',
          size: 5000000,
        },
        mockInvestigator1,
      );

      expect(result.evidence.length).toBe(1);
      expect(result.evidence[0].name).toBe('cctv_footage.mp4');
    });

    it('should reject adding evidence from an unassigned investigator', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1');
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      await expect(
        service.addEvidence(
          'CASE-2026-123456',
          { name: 'illegal_evidence.jpg', type: 'image', url: 'https://example.com/pic.jpg' },
          mockInvestigator2,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow assigned investigator to add note', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1');
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await service.addNote(
        'CASE-2026-123456',
        { note: 'Interviewed key eyewitness' },
        mockInvestigator1,
      );

      expect(result.investigationNotes.length).toBe(1);
      expect(result.investigationNotes[0].note).toBe('Interviewed key eyewitness');
    });

    it('should reject adding note from an unassigned investigator', async () => {
      const mockDoc = createMockCaseDoc('inv-uid-1');
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      await expect(
        service.addNote(
          'CASE-2026-123456',
          { note: 'Unauthorized note' },
          mockInvestigator2,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
