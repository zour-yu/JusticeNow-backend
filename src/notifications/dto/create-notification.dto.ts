import { NotificationType } from '../schemas/notification.schema';

export class CreateNotificationDto {
  userId: string;
  caseId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}
