import { ApiProperty } from '@nestjs/swagger';

const Timestamp = () =>
  ApiProperty({
    type: String,
    format: 'ISO 8601',
    example: '2024-01-15T07:30:45.123Z',
  });

export class TimestampsDto {
  @Timestamp()
  createdAt: Date;

  @Timestamp()
  updatedAt: Date;
}
