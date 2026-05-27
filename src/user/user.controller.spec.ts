import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    getById: jest.fn(),
    upsert: jest.fn(),
    modify_settings: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService],
    })
      .overrideProvider(UserService)
      .useValue(mockUserService)
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('должен делегировать getById в UserService', () => {
    controller.getById({ user_id: 1 });

    expect(service.getById).toHaveBeenCalledWith(1);
  });

  it('должен делегировать upsertUser в UserService', () => {
    const dto = { id: 1, settings: { channel_sms: true } };
    controller.upsertUser(dto);

    expect(service.upsert).toHaveBeenCalledWith(dto);
  });

  it('должен делегировать patchSettings в UserService.modify_settings', () => {
    const dto = { channel_sms: true };
    controller.patchSettings({ user_id: 1 }, dto);

    expect(service.modify_settings).toHaveBeenCalledWith(1, dto);
  });

  it('должен делегировать deleteById в UserService', () => {
    controller.deleteById({ user_id: 1 });

    expect(service.delete).toHaveBeenCalledWith(1);
  });
});
