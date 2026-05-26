import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UserIdDto {
  @ApiProperty({ type: 'integer', format: 'bigint' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  user_id: number;
}
