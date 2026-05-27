import { ApiProperty } from '@nestjs/swagger';

export class NotificationEvaluationAllowResponseDto {
  @ApiProperty({ type: String, enum: ['allow'], example: 'allow' })
  decision: 'allow';
}

export class NotificationEvaluationDenyResponseDto {
  @ApiProperty({ type: String, enum: ['deny'], example: 'deny' })
  decision: 'deny';

  @ApiProperty({
    type: String,
    example: 'blocked_by_quiet_policy',
  })
  reason: string;
}
