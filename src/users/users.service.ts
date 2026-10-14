import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole, UserStatus } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByFirebaseUid(firebaseUid: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ firebaseUid }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async createUser(userData: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async updateUserProfile(
    userId: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .exec();
  }

  async updateByFirebaseUid(
    firebaseUid: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate({ firebaseUid }, { $set: updateData }, { new: true })
      .exec();
  }

  async findInvestigators(): Promise<UserDocument[]> {
    return this.userModel
      .find({
        role: UserRole.INVESTIGATOR,
        status: { $in: [UserStatus.ACTIVE, UserStatus.PENDING] },
      } as any)
      .sort({ firstName: 1 })
      .exec();
  }

  async findPendingInvestigators(): Promise<UserDocument[]> {
    return this.userModel
      .find({
        role: UserRole.INVESTIGATOR,
        status: UserStatus.PENDING,
      } as any)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllInvestigators(): Promise<UserDocument[]> {
    return this.userModel
      .find({
        role: UserRole.INVESTIGATOR,
      } as any)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllUsers(filters?: {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  }): Promise<UserDocument[]> {
    const query: any = {};
    if (filters?.role) {
      query.role = filters.role;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim();
      query.$or = [
        { firstName: { $regex: term, $options: 'i' } },
        { lastName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ];
    }
    return this.userModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findUserById(idOrUid: string): Promise<UserDocument> {
    const user = await this.findByIdentifier(idOrUid);
    if (!user) {
      throw new NotFoundException(`User not found with identifier: ${idOrUid}`);
    }
    return user;
  }

  async updateUserByAdmin(
    idOrUid: string,
    updateData: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.findUserById(idOrUid);

    if (updateData.firstName !== undefined) user.firstName = updateData.firstName.trim();
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName.trim();
    if (updateData.phone !== undefined) user.phone = updateData.phone.trim();
    if (updateData.role !== undefined) user.role = updateData.role;
    if (updateData.status !== undefined) user.status = updateData.status;

    return await user.save();
  }

  async deactivateUser(idOrUid: string): Promise<UserDocument> {
    return this.updateUserStatus(idOrUid, UserStatus.INACTIVE);
  }

  async reactivateUser(idOrUid: string): Promise<UserDocument> {
    return this.updateUserStatus(idOrUid, UserStatus.ACTIVE);
  }

  async approveInvestigator(idOrUid: string): Promise<UserDocument> {
    return this.updateUserStatus(idOrUid, UserStatus.ACTIVE);
  }

  async rejectInvestigator(idOrUid: string): Promise<UserDocument> {
    return this.updateUserStatus(idOrUid, UserStatus.INACTIVE);
  }

  async updateUserStatus(idOrUid: string, status: UserStatus): Promise<UserDocument> {
    let user: UserDocument | null = null;

    try {
      user = await this.userModel.findById(idOrUid).exec();
    } catch {
      // not a mongo id
    }

    if (!user) {
      user = await this.userModel.findOne({ firebaseUid: idOrUid }).exec();
    }

    if (!user) {
      user = await this.userModel.findOne({ email: idOrUid.toLowerCase() }).exec();
    }

    if (!user) {
      throw new NotFoundException(`User not found with identifier: ${idOrUid}`);
    }

    user.status = status;
    return await user.save();
  }

  async findByIdentifier(identifier: string): Promise<UserDocument | null> {
    if (!identifier) return null;
    let user = await this.userModel.findOne({ firebaseUid: identifier }).exec();
    if (!user) {
      try {
        user = await this.userModel.findById(identifier).exec();
      } catch {
        // Not a Mongo ObjectId
      }
    }
    if (!user) {
      user = await this.userModel.findOne({ email: identifier.toLowerCase() }).exec();
    }
    return user;
  }

  async deleteByFirebaseUid(firebaseUid: string): Promise<void> {
    await this.userModel.findOneAndDelete({ firebaseUid }).exec();
  }
}

