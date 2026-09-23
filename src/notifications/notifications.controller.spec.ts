jest.mock('../common/guards/firebase-auth.guard', () => ({
  FirebaseAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: () => true,
  })),
}));

jest.mock('../common/guards/roles.guard', () => ({
  RolesGuard: jest.fn().mockImplementation(() => ({
    canActivate: () => true,
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockNotificationsService: any;

  beforeEach(async () => {
    mockNotificationsService = {
      getNotificationsForUser: jest.fn().mockResolvedValue([]),
      getUnreadCount: jest.fn().mockResolvedValue(0),
      markAsRead: jest.fn().mockResolvedValue({}),
      markAllAsRead: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
