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

  private getUserIdentifiers(user: User): string[] {
    const ids: string[] = [];
    if (user.firebaseUid) ids.push(user.firebaseUid);
    if ((user as any)._id) ids.push((user as any)._id.toString());
    if (user.email) ids.push(user.email.toLowerCase());
    return ids.length > 0 ? ids : [user.firebaseUid];
  }

  @Get()
  getNotificationsForUser(@CurrentUser() user: User) {
    return this.notificationsService.getNotificationsForUser(this.getUserIdentifiers(user));
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(this.getUserIdentifiers(user));
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(id, this.getUserIdentifiers(user));
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(this.getUserIdentifiers(user));
  }
}
