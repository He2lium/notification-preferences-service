import { UserEntity } from '../../entities/user.entity';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto implements Omit<UserEntity, 'createdAt' | 'updatedAt'> {
  @ApiProperty({ type: String, format: 'bigint', example: '246', minimum: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  id: number;
}
