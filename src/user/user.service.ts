import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserSettingsEntity } from './entities/user-settings.entity';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { DbService } from '../db/db.service';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UserSettingFieldsType } from '@global/types/user-setting-fields.type';
import { ConfigService } from '@nestjs/config';
import { UserCreateDto } from './dto/create/user-create.dto';

@Injectable()
export class UserService {
  private readonly _default_settings: UserSettingFieldsType;

  constructor(
    @InjectRepository(UserSettingsEntity)
    private _settingsRepository: Repository<UserSettingsEntity>,
    @InjectRepository(UserEntity)
    private _usersRepository: Repository<UserEntity>,
    private readonly _dbService: DbService,
    private readonly _env: ConfigService,
  ) {
    this._default_settings = JSON.parse(
      this._env.getOrThrow('DEFAULT_SETTINGS_JSON'),
    );
  }

  private _setDefaultSettingsIfNull(user: UserEntity): UserResponseDto {
    if (!user.settings)
      return {
        ...user,
        settings: {
          user_id: user.id,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          ...this._default_settings,
        },
      };
    return { ...user } as UserResponseDto;
  }

  async getById(user_id: number) {
    try {
      const user = await this._usersRepository.findOneOrFail({
        where: { id: user_id },
        relations: { settings: true },
      });
      return this._setDefaultSettingsIfNull(user);
    } catch {
      throw new NotFoundException('UserNotFound');
    }
  }

  async upsert(data: UserCreateDto): Promise<UserResponseDto> {
    const { id: user_id, settings } = data;
    return this._dbService.transaction<UserResponseDto>(async (q) => {
      await q.manager.upsert(UserEntity, { id: user_id }, ['id']);

      if (settings)
        await q.manager.upsert(UserSettingsEntity, { user_id, ...settings }, [
          'user_id',
        ]);
      else await q.manager.delete(UserSettingsEntity, { user_id });

      const user = await q.manager.findOneOrFail(UserEntity, {
        where: { id: user_id },
        relations: { settings: true },
      });

      return this._setDefaultSettingsIfNull(user);
    });
  }

  async delete(user_id: number): Promise<UserResponseDto> {
    return this._dbService.transaction<UserResponseDto>(async (q) => {
      const user = await q.manager.findOne(UserEntity, {
        where: { id: user_id },
        relations: { settings: true },
      });
      if (!user) throw new NotFoundException('UserNotFound');
      await q.manager.delete(UserEntity, { id: user_id });
      return this._setDefaultSettingsIfNull(user);
    });
  }
}
