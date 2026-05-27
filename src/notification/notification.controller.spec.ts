import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { MetricsModule } from '../metrics/metrics.module';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockNotificationService = {
    evaluate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [MetricsModule],
      controllers: [NotificationController],
      providers: [NotificationService],
    })
      .overrideProvider(NotificationService)
      .useValue(mockNotificationService)
      .compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('должен делегировать evaluate в NotificationService', () => {
    const dto = {
      user_id: 1,
      channel: 'email' as const,
      kind: 'marketing' as const,
      region: 'eu' as const,
      datetime: '2026-01-01T09:00:00Z',
    };

    controller.evaluate(dto);

    expect(service.evaluate).toHaveBeenCalledWith(dto);
  });
});
