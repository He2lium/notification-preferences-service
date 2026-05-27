import { OmitType, PartialType } from '@nestjs/swagger';
import { UserSettingsDto } from '../origin/user-settings.dto';

export class UserSettingsModificationDto extends PartialType(
  OmitType(UserSettingsDto, ['user_id']),
) {}
