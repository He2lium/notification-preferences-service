import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const TypeOrmProvider: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (env: ConfigService) => ({
    type: 'postgres',
    host: env.getOrThrow('PG_HOST'),
    port: env.getOrThrow('PG_PORT'),
    username: env.getOrThrow('PG_USER'),
    password: env.getOrThrow('PG_PASSWORD'),
    database: env.getOrThrow('PG_DATABASE'),
    autoLoadEntities: true,
    synchronize: true,
  }),
};
