import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmProvider } from '@global/providers/type-orm.provider';
import { UserModule } from './user/user.module';
import { DbModule } from './db/db.module';
import { NotificationModule } from './notification/notification.module';
import { ConfigProvider } from '@global/providers/config.provider';

@Module({
  imports: [
    ConfigModule.forRoot(ConfigProvider),
    TypeOrmModule.forRootAsync(TypeOrmProvider),
    UserModule,
    DbModule,
    NotificationModule,
  ],
})
export class AppModule {}
