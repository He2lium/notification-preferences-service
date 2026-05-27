import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserSettingsEntity } from './entities/user-settings.entity';
import { DbService } from '../db/db.service';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

const DEFAULT_SETTINGS_JSON =
  '{"quiet_start":"10:00:00","quiet_end":"18:00:00","timezone_offset":180,"kind_delivery_status":true,"kind_marketing":false,"kind_transactional":true,"channel_email":true,"channel_push":true,"channel_sms":false,"channel_telegram":false,"channel_vk":false}';

const defaultSettings = JSON.parse(DEFAULT_SETTINGS_JSON);

function makeMockManager(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

type Manager = ReturnType<typeof makeMockManager>;

function setupDbServiceMock(manager: Manager) {
  return {
    transaction: jest
      .fn()
      .mockImplementation(
        async <R>(fn: (qr: { manager: Manager }) => Promise<R>) =>
          fn({ manager }),
      ),
  };
}

describe('UserService', () => {
  let service: UserService;
  let manager: Manager;

  const mockRepo = {
    findOneOrFail: jest.fn(),
    findOne: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    manager = makeMockManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserSettingsEntity),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepo,
        },
        {
          provide: DbService,
          useValue: setupDbServiceMock(manager),
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(DEFAULT_SETTINGS_JSON),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('modify_settings', () => {
    const userId = 1;
    const user = { id: userId, createdAt: new Date(), updatedAt: new Date() };

    const existingSettings = {
      user_id: userId,
      ...defaultSettings,
    };

    it('должен обновить только переданные поля в существующих настройках', async () => {
      const partialDto = { channel_sms: true, quiet_start: '22:00:00' };

      manager.findOne.mockResolvedValue(existingSettings);
      manager.save.mockResolvedValue({ ...existingSettings, ...partialDto });
      manager.findOneOrFail.mockResolvedValue({
        ...user,
        settings: { ...existingSettings, ...partialDto },
      });

      const result = await service.modify_settings(userId, partialDto);

      expect(manager.save).toHaveBeenCalledWith(UserSettingsEntity, {
        ...existingSettings,
        ...partialDto,
      });
      expect(result.settings.channel_sms).toBe(true);
      expect(result.settings.quiet_start).toBe('22:00:00');
      expect(result.settings.channel_email).toBe(defaultSettings.channel_email);
    });

    it('должен создать настройки из дефолтов + partial, если настроек нет', async () => {
      const partialDto = { kind_marketing: true };

      manager.findOne.mockResolvedValue(null);
      manager.save.mockResolvedValue({
        user_id: userId,
        ...defaultSettings,
        ...partialDto,
      });
      manager.findOneOrFail.mockResolvedValue({
        ...user,
        settings: { user_id: userId, ...defaultSettings, ...partialDto },
      });

      const result = await service.modify_settings(userId, partialDto);

      expect(manager.save).toHaveBeenCalledWith(UserSettingsEntity, {
        user_id: userId,
        ...defaultSettings,
        ...partialDto,
      });
      expect(result.settings.kind_marketing).toBe(true);
      expect(result.settings.kind_delivery_status).toBe(
        defaultSettings.kind_delivery_status,
      );
    });

    it('должен выбросить ошибку, если findOneOrFail не находит пользователя', async () => {
      const notFoundErr = new NotFoundException('UserNotFound');

      manager.findOne.mockResolvedValue(null);
      manager.save.mockResolvedValue({ user_id: userId, ...defaultSettings });
      manager.findOneOrFail.mockRejectedValue(notFoundErr);

      await expect(
        service.modify_settings(userId, { channel_sms: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getById', () => {
    const userId = 1;
    const user = { id: userId, createdAt: new Date(), updatedAt: new Date() };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('должен вернуть дефолтные настройки, если у пользователя нет settings', async () => {
      mockRepo.findOneOrFail.mockResolvedValue({ ...user });

      const result = await service.getById(userId);

      expect(mockRepo.findOneOrFail).toHaveBeenCalledWith({
        where: { id: userId },
        relations: { settings: true },
      });
      expect(result.settings.quiet_start).toBe(defaultSettings.quiet_start);
      expect(result.settings.quiet_end).toBe(defaultSettings.quiet_end);
      expect(result.settings.timezone_offset).toBe(defaultSettings.timezone_offset);
      expect(result.settings.channel_email).toBe(defaultSettings.channel_email);
      expect(result.settings.kind_marketing).toBe(defaultSettings.kind_marketing);
    });

    it('должен вернуть существующие настройки пользователя', async () => {
      const customSettings = {
        user_id: userId,
        ...defaultSettings,
        quiet_start: '23:00:00',
        channel_sms: true,
      };
      mockRepo.findOneOrFail.mockResolvedValue({
        ...user,
        settings: customSettings,
      });

      const result = await service.getById(userId);

      expect(result.settings.quiet_start).toBe('23:00:00');
      expect(result.settings.channel_sms).toBe(true);
    });

    it('должен выбросить NotFoundException если пользователь не найден', async () => {
      mockRepo.findOneOrFail.mockRejectedValue(new Error('not found'));

      await expect(service.getById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsert', () => {
    const userId = 1;
    const user = { id: userId, createdAt: new Date(), updatedAt: new Date() };
    const fullSettings = { ...defaultSettings, user_id: userId };

    it('должен создать пользователя с настройками', async () => {
      const dto = { id: userId, settings: { channel_sms: true } };
      manager.findOneOrFail.mockResolvedValue({
        ...user,
        settings: { user_id: userId, ...defaultSettings, channel_sms: true },
      });

      await service.upsert(dto);

      expect(manager.upsert).toHaveBeenCalledWith(
        UserEntity,
        { id: userId },
        ['id'],
      );
      expect(manager.upsert).toHaveBeenCalledWith(
        UserSettingsEntity,
        { user_id: userId, channel_sms: true },
        ['user_id'],
      );
      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('должен создать пользователя без настроек (удалить существующие)', async () => {
      const dto = { id: userId };
      manager.findOneOrFail.mockResolvedValue({ ...user });

      await service.upsert(dto);

      expect(manager.upsert).toHaveBeenCalledWith(
        UserEntity,
        { id: userId },
        ['id'],
      );
      expect(manager.delete).toHaveBeenCalledWith(UserSettingsEntity, {
        user_id: userId,
      });
      expect(manager.upsert).toHaveBeenCalledTimes(1);
    });

    it('должен быть идемпотентным: два вызова с одинаковыми данными дают одинаковый результат', async () => {
      const dto = { id: userId, settings: { channel_email: false } };
      const resultUser = {
        ...user,
        settings: { user_id: userId, ...defaultSettings, channel_email: false },
      };
      manager.findOneOrFail.mockResolvedValue(resultUser);

      const r1 = await service.upsert(dto);
      const r2 = await service.upsert(dto);

      expect(r1).toEqual(r2);
      expect(manager.upsert).toHaveBeenCalledTimes(4); // 2 × (UserEntity + UserSettingsEntity)
    });

    it('должен выбросить NotFoundException если пользователь не найден после upsert', async () => {
      const dto = { id: userId, settings: { channel_sms: true } };
      manager.findOneOrFail.mockRejectedValue(
        new NotFoundException('UserNotFound'),
      );

      await expect(service.upsert(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    const userId = 1;
    const user = { id: userId, createdAt: new Date(), updatedAt: new Date() };

    it('должен удалить пользователя и вернуть его с дефолтными настройками', async () => {
      manager.findOne.mockResolvedValue({ ...user });

      const result = await service.delete(userId);

      expect(manager.delete).toHaveBeenCalledWith(UserEntity, { id: userId });
      expect(result.id).toBe(userId);
      expect(result.settings.quiet_start).toBe(defaultSettings.quiet_start);
    });

    it('должен вернуть настройки пользователя перед удалением', async () => {
      const customSettings = {
        user_id: userId,
        ...defaultSettings,
        quiet_start: '21:00:00',
      };
      manager.findOne.mockResolvedValue({
        ...user,
        settings: customSettings,
      });

      const result = await service.delete(userId);

      expect(result.settings.quiet_start).toBe('21:00:00');
    });

    it('должен выбросить NotFoundException если пользователь не найден', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(manager.delete).not.toHaveBeenCalled();
    });
  });
});
