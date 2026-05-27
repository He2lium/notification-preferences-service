import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import {
  NotificationEvaluationAllowResponseDto,
  NotificationEvaluationDenyResponseDto,
} from './dto/notification-evaluation-response.dto';
import { NotificationEvaluationDto } from './dto/notification-evaluation.dto';

@Controller('notification')
@ApiTags('notification')
@ApiExtraModels(
  NotificationEvaluationAllowResponseDto,
  NotificationEvaluationDenyResponseDto,
)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate notification' })
  @ApiOkResponse({ type: NotificationEvaluationAllowResponseDto })
  @ApiForbiddenResponse({ type: NotificationEvaluationDenyResponseDto })
  evaluate(@Body() data: NotificationEvaluationDto) {
    return this.notificationService.evaluate(data);
  }
}
