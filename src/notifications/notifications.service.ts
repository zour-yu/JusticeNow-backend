import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const newNotification = new this.notificationModel(createNotificationDto);
    const savedNotification = await newNotification.save();

    this.sendPushNotification(createNotificationDto).catch(err => {
      this.logger.error('Failed to send push notification', err);
    });

    return savedNotification;
  }

  private async sendPushNotification(dto: CreateNotificationDto) {
    const user = await this.usersService.findByIdentifier(dto.userId);
    if (!user || !user.pushToken) {
      return;
    }

    try {
      await axios.post('https://exp.host/--/api/v2/push/send', {
        to: user.pushToken,
        title: dto.title,
        body: dto.message,
        data: dto.metadata,
      });
      this.logger.log(`Push notification sent to ${user.pushToken}`);
    } catch (error) {
      this.logger.error('Error sending push notification to Expo', error);
    }
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
