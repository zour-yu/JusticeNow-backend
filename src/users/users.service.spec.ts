import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole, UserStatus } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  const mockPendingInvestigator = {
    _id: 'user-mongo-1',
    firebaseUid: 'inv-uid-pending',
    firstName: 'Alex',
    lastName: 'Murphy',
    email: 'alex.murphy@justicenow.org',
    phone: '+94 77 123 9999',
    role: UserRole.INVESTIGATOR,
    status: UserStatus.PENDING,
    isProfileComplete: true,
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
  };

  const mockActiveInvestigator = {
    _id: 'user-mongo-2',
    firebaseUid: 'inv-uid-active',
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah.connor@justicenow.org',
    phone: '+94 77 111 2222',
    role: UserRole.INVESTIGATOR,
    status: UserStatus.ACTIVE,
    isProfileComplete: true,
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
  };

  beforeEach(async () => {
    mockUserModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: 'new-id' }),
    }));

    mockUserModel.find = jest.fn();
    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();
    mockUserModel.findOneAndUpdate = jest.fn();
    mockUserModel.findByIdAndUpdate = jest.fn();
    mockUserModel.findOneAndDelete = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findPendingInvestigators', () => {
    it('should find all investigators with PENDING status', async () => {
      const mockResult = [mockPendingInvestigator];
      const sort = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult),
      });
      mockUserModel.find.mockReturnValue({ sort });

      const result = await service.findPendingInvestigators();

      expect(mockUserModel.find).toHaveBeenCalledWith({
        role: UserRole.INVESTIGATOR,
        status: UserStatus.PENDING,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('approveInvestigator', () => {
    it('should change investigator status from PENDING to ACTIVE', async () => {
      const pendingDoc = { ...mockPendingInvestigator, status: UserStatus.PENDING };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(pendingDoc),
      });

      const approvedUser = await service.approveInvestigator('user-mongo-1');

      expect(approvedUser.status).toBe(UserStatus.ACTIVE);
      expect(pendingDoc.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if investigator does not exist', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.approveInvestigator('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rejectInvestigator', () => {
    it('should change investigator status to INACTIVE', async () => {
      const pendingDoc = { ...mockPendingInvestigator, status: UserStatus.PENDING };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(pendingDoc),
      });

      const rejectedUser = await service.rejectInvestigator('user-mongo-1');

      expect(rejectedUser.status).toBe(UserStatus.INACTIVE);
      expect(pendingDoc.save).toHaveBeenCalled();
    });
  });
});
