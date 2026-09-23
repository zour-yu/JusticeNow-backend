import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotificationsForUser(@CurrentUser() user: User) {
    // using firebaseUid as the userId to link notifications
    return this.notificationsService.getNotificationsForUser(user.firebaseUid);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.firebaseUid);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(id, user.firebaseUid);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.firebaseUid);
  }
}
