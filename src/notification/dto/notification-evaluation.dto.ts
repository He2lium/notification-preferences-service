import { NotificationKindEnum } from '@global/types/notification-kind.enum';
import { NotificationChannelEnum } from '@global/types/notification-channel.enum';
import { RegionEnum } from '@global/types/region.enum';
import { UserIdDto } from '@global/dto/user-id.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';
import { applyDecorators } from '@nestjs/common';

const EnumProperty = (_enum: object) =>
  applyDecorators(
    ApiProperty({ type: String, enum: _enum }),
    IsNotEmpty(),
    IsEnum(_enum),
  );

export class NotificationEvaluationDto extends UserIdDto {
  @EnumProperty(NotificationKindEnum)
  kind: NotificationKindEnum;

  @EnumProperty(NotificationChannelEnum)
  channel: NotificationChannelEnum;

  @EnumProperty(RegionEnum)
  region: RegionEnum;

  @ApiProperty({ type: String, format: 'ISO 8601' })
  @IsNotEmpty()
  @IsDateString()
  datetime: string;
}
