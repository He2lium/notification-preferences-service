import { OmitType } from '@nestjs/swagger';
import { UserSettingsDto } from '../origin/user-settings.dto';

export class UserCreateSettingsDto extends OmitType(UserSettingsDto, [
  'user_id',
]) {}
