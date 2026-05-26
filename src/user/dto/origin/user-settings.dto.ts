import { UserSettingsEntity } from '../../entities/user-settings.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { UserIdDto } from '@global/dto/user-id.dto';

export class UserSettingsDto
  extends UserIdDto
  implements Omit<UserSettingsEntity, 'createdAt' | 'updatedAt'>
{
  @ApiProperty({ description: 'Тип: уведомления о статусе доставки' })
  @IsBoolean()
  @IsNotEmpty()
  kind_delivery_status: boolean;

  @ApiProperty({ description: 'Тип: маркетинговые уведомления' })
  @IsBoolean()
  @IsNotEmpty()
  kind_marketing: boolean;

  @ApiProperty({ description: 'Тип: транзакционные уведомления' })
  @IsBoolean()
  @IsNotEmpty()
  kind_transactional: boolean;

  @ApiProperty({ description: 'Канал: email' })
  @IsBoolean()
  @IsNotEmpty()
  channel_email: boolean;

  @ApiProperty({ description: 'Канал: push' })
  @IsBoolean()
  @IsNotEmpty()
  channel_push: boolean;

  @ApiProperty({ description: 'Канал: sms' })
  @IsBoolean()
  @IsNotEmpty()
  channel_sms: boolean;

  @ApiProperty({ description: 'Канал: telegram' })
  @IsBoolean()
  @IsNotEmpty()
  channel_telegram: boolean;

  @ApiProperty({ description: 'Канал: vk' })
  @IsBoolean()
  @IsNotEmpty()
  channel_vk: boolean;

  @ApiProperty({ description: 'Начало тихого часа', example: '22:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Формат: HH:mm' })
  @IsNotEmpty()
  quiet_start: string;

  @ApiProperty({ description: 'Конец тихого часа', example: '08:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Формат: HH:mm' })
  @IsNotEmpty()
  quiet_end: string;

  @ApiProperty({
    description: 'Смещение часового пояса в минутах от UTC',
    example: 180,
    minimum: -720,
    maximum: 840,
  })
  @IsInt()
  @Min(-720)
  @Max(840)
  @IsNotEmpty()
  timezone_offset: number;
}
