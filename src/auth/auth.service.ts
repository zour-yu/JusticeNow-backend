import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserDocument, UserRole, UserStatus } from '../users/schemas/user.schema';
import { SyncUserDto } from './dto/sync-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseService } from '../config/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async syncUser(
    firebaseUser: DecodedIdToken,
    dto: SyncUserDto,
  ): Promise<UserDocument> {
    const existingUser = await this.usersService.findByFirebaseUid(firebaseUser.uid);
    if (existingUser) {
      return existingUser;
    }

    if (!dto.firstName || !dto.lastName) {
      throw new BadRequestException('First name and last name are required for registration.');
    }

    const hasPhone = Boolean(dto.phone && dto.phone.trim() !== '');
    
    let role = UserRole.CITIZEN;
    let status = UserStatus.ACTIVE;

    if (dto.role === 'INVESTIGATOR') {
      role = UserRole.INVESTIGATOR;
      status = UserStatus.PENDING;
    }

    return this.usersService.createUser({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || '',
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone || '',
      role,
      status,
      isProfileComplete: hasPhone,
    });
  }

  async updateProfile(
    user: UserDocument,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    const updatePayload: Record<string, any> = {};

    if (dto.firstName) updatePayload.firstName = dto.firstName;
    if (dto.lastName) updatePayload.lastName = dto.lastName;
    if (dto.phone) {
      updatePayload.phone = dto.phone;
      updatePayload.isProfileComplete = true;
    }

    const userId = (user as any)._id?.toString() || (user as any).id;
    const updatedUser = await this.usersService.updateUserProfile(
      userId,
      updatePayload,
    );

    if (!updatedUser) {
      throw new NotFoundException('User profile not found.');
    }

    return updatedUser;
  }
  async deleteAccount(firebaseUser: DecodedIdToken): Promise<void> {
    // 1. Delete from MongoDB
    await this.usersService.deleteByFirebaseUid(firebaseUser.uid);
    // 2. Delete from Firebase Auth
    await this.firebaseService.getAuth().deleteUser(firebaseUser.uid);
  }
}
