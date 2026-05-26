import { ConfigModuleOptions } from '@nestjs/config';
import { validationSchema } from '@global/config/validation-schema.config';

export const ConfigProvider: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema,
};
