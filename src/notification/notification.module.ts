import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { NotificationService } from './notification.service';

@Module({
  imports: [UserModule],
  providers: [NotificationService],
})
export class NotificationModule {}
