import { UserDto } from '../origin/user.dto';
import { UserCreateSettingsDto } from './user-create-settings.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserCreateDto extends UserDto {
  @ApiPropertyOptional({ type: UserCreateSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserCreateSettingsDto)
  settings?: UserCreateSettingsDto;
}
