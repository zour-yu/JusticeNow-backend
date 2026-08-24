import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole, UserStatus } from './schemas/user.schema';

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

  async deleteByFirebaseUid(firebaseUid: string): Promise<void> {
    await this.userModel.findOneAndDelete({ firebaseUid }).exec();
  }
}
