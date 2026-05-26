import * as Joi from 'joi';

const JsonValidate: Joi.CustomValidator = (value, helpers) => {
  try {
    JSON.parse(value);
  } catch {
    return helpers.error('any.invalid');
  }
  return value as unknown;
};

export const validationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  PG_HOST: Joi.string().hostname().required(),
  PG_PORT: Joi.number().port().required(),
  PG_USER: Joi.string().required(),
  PG_PASSWORD: Joi.string().required(),
  PG_DATABASE: Joi.string().required(),
  DEFAULT_SETTINGS_JSON: Joi.string()
    .custom(JsonValidate, 'JSON string validation')
    .required(),
  GLOBAL_POLICIES_JSON: Joi.string()
    .custom(JsonValidate, 'JSON string validation')
    .required(),
});
