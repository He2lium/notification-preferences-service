import { TimestampsDto } from '@global/dto/timestamps.dto';
import { UserSettingsDto } from '../origin/user-settings.dto';
import { IntersectionType } from '@nestjs/swagger';

export class UserSettingsResponseDto extends IntersectionType(
  UserSettingsDto,
  TimestampsDto,
) {}
