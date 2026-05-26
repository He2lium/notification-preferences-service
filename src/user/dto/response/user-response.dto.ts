import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { UserDto } from '../origin/user.dto';
import { TimestampsDto } from '@global/dto/timestamps.dto';
import { UserSettingsResponseDto } from './user-settings-response.dto';

export class UserResponseDto extends IntersectionType(UserDto, TimestampsDto) {
  @ApiProperty({ type: UserSettingsResponseDto })
  settings: UserSettingsResponseDto;
}
