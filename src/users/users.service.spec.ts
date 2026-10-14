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

  describe('findAllUsers', () => {
    it('should return all users with optional filters', async () => {
      const mockUsers = [mockActiveInvestigator, mockPendingInvestigator];
      const sort = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUsers),
      });
      mockUserModel.find.mockReturnValue({ sort });

      const result = await service.findAllUsers({
        role: UserRole.INVESTIGATOR,
        status: UserStatus.ACTIVE,
        search: 'Sarah',
      });

      expect(mockUserModel.find).toHaveBeenCalledWith({
        role: UserRole.INVESTIGATOR,
        status: UserStatus.ACTIVE,
        $or: [
          { firstName: { $regex: 'Sarah', $options: 'i' } },
          { lastName: { $regex: 'Sarah', $options: 'i' } },
          { email: { $regex: 'Sarah', $options: 'i' } },
          { phone: { $regex: 'Sarah', $options: 'i' } },
        ],
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveInvestigator),
      });

      const user = await service.findUserById('inv-uid-active');
      expect(user).toEqual(mockActiveInvestigator);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findUserById('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserByAdmin', () => {
    it('should update permitted fields on user', async () => {
      const userDoc = {
        ...mockActiveInvestigator,
        firstName: 'Sarah',
        lastName: 'Connor',
        phone: '+94 77 111 2222',
        role: UserRole.INVESTIGATOR,
        status: UserStatus.ACTIVE,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userDoc),
      });

      const updated = await service.updateUserByAdmin('inv-uid-active', {
        firstName: 'Sarah Jane',
        phone: '+94 77 999 8888',
        role: UserRole.ADMIN,
      });

      expect(updated.firstName).toBe('Sarah Jane');
      expect(updated.phone).toBe('+94 77 999 8888');
      expect(updated.role).toBe(UserRole.ADMIN);
      expect(userDoc.save).toHaveBeenCalled();
    });
  });

  describe('deactivateUser and reactivateUser', () => {
    it('should deactivate user by setting status to INACTIVE', async () => {
      const userDoc = {
        ...mockActiveInvestigator,
        status: UserStatus.ACTIVE,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userDoc),
      });

      const deactivated = await service.deactivateUser('user-mongo-2');
      expect(deactivated.status).toBe(UserStatus.INACTIVE);
      expect(userDoc.save).toHaveBeenCalled();
    });

    it('should reactivate user by setting status to ACTIVE', async () => {
      const userDoc = {
        ...mockActiveInvestigator,
        status: UserStatus.INACTIVE,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userDoc),
      });

      const reactivated = await service.reactivateUser('user-mongo-2');
      expect(reactivated.status).toBe(UserStatus.ACTIVE);
      expect(userDoc.save).toHaveBeenCalled();
    });
  });
});

