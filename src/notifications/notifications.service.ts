import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const newNotification = new this.notificationModel(createNotificationDto);
    return newNotification.save();
  }

  private buildUserFilter(userId: string | string[]): any {
    if (Array.isArray(userId)) {
      const valid = userId.filter(Boolean);
      return valid.length === 1 ? valid[0] : { $in: valid };
    }
    return userId;
  }

  async getNotificationsForUser(userId: string | string[]): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId: this.buildUserFilter(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getUnreadCount(userId: string | string[]): Promise<number> {
    return this.notificationModel
      .countDocuments({ userId: this.buildUserFilter(userId), isRead: false })
      .exec();
  }

  async markAsRead(id: string, userId: string | string[]): Promise<Notification> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId: this.buildUserFilter(userId) },
      { isRead: true },
      { new: true },
    ).exec();

    if (!notification) {
      throw new NotFoundException(`Notification #${id} not found or doesn't belong to you`);
    }
    return notification;
  }

  async markAllAsRead(userId: string | string[]): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { userId: this.buildUserFilter(userId), isRead: false },
      { $set: { isRead: true } },
    ).exec();
    
    return { modifiedCount: result.modifiedCount };
  }
}
