import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

@Module({
  imports: [UserModule],
  providers: [NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
