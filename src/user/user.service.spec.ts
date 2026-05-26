import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserSettingsEntity } from './entities/user-settings.entity';
import { DbService } from '../db/db.service';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

describe('UserService', () => {
  let service: UserService;

  const mockRepo = {
    findOneOrFail: jest.fn(),
    findOne: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
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
          useValue: { transaction: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(
              '{"region":"ru","quiet_start":"10:00:00","quiet_end":"18:00:00","timezone_offset":180,"kind_delivery_status":true,"kind_marketing":false,"kind_transactional":true,"channel_email":true,"channel_push":true,"channel_sms":false,"channel_telegram":false,"channel_vk":false}',
            ),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
