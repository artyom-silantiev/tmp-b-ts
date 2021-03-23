import * as path from 'path';
import * as _ from 'lodash';

export enum EnvType {
  development = 'development',
  production = 'production'
}

export enum SendEmailType {
  sync = 'sync',
  task = 'task'
};

const env = process.env;

function toString (envParam: string, defaultValue: string) {
  return envParam ? envParam : defaultValue;
}

function toInt (envParam: string, defaultValue: number) {
  if (envParam) {
    const tmp = parseInt(envParam);
    if (Number.isInteger(tmp)) {
      return tmp;
    } else {
      return defaultValue;
    }
  } else {
    return defaultValue;
  }
}

function toBool (envParam: string, defaultValue: boolean) {
  if (envParam === '0' || envParam === 'false') {
    return false;
  } else if (envParam === '1' || envParam === 'true') {
    return true;
  } else {
    return defaultValue;
  }
}

function toEnum (envParam: string, enumValues: string[], defaultValue: string) {
  return enumValues.indexOf(envParam) !== -1 ? envParam : defaultValue;
}

function _parsePath (pathParam: string) {
  if (_.startsWith(pathParam, './') ) {
    return path.resolve(process.cwd(), pathParam);
  } else if (_.startsWith(pathParam, '/')) {
    return pathParam;
  } else {
    return null;
  }
}
function toPath (envParam: string, defaultPathValue) {
  if (envParam) {
    const tmp = _parsePath(envParam);
    if (tmp) {
      return tmp;
    } else {
      return _parsePath(defaultPathValue);
    }
  } else {
    return _parsePath(defaultPathValue);
  }
}

export default {
  ENV: toEnum(env.ENV, Object.values(EnvType), EnvType.development) as EnvType,

  NODE_PORT: toInt(env.NODE_PORT, 3000),
  NODE_HOST: toString(env.NODE_HOST, 'localhost'),
  NODE_PROTOCOL: toString(env.NODE_PROTOCOL, 'http:'),

  PASSWORD_SALT: toString(env.PASSWORD_SALT, 'passwordSalt'),

  JWT_SECRET: toString(env.JWT_SECRET, 'jwtSecret'),

  DATABASE_URL: toString(env.DATABASE_URL, 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'),

  DIR_TEMP_FILES: toPath(env.DIR_TEMP_FILES, './data/temp'),
  DIR_IMAGES: toPath(env.DIR_IMAGES, './data/images'),

  IMAGE_MIN_PREVEIW_LOG_SIZE: toInt(env.IMAGE_MIN_PREVEIW_LOG_SIZE, 5),
  IMAGE_ENABLED_CREATE_IMAGE_TASK: toBool(env.IMAGE_ENABLED_CREATE_IMAGE_TASK, true),

  GOOGLE_RECAPTCHA: toString(env.GOOGLE_RECAPTCHA, 'xxxxxxxxxxxxxxxxxxxx'),

  REDIS_HOST: toString(env.REDIS_HOST, 'localhost'),
  REDIS_PORT: toInt(env.REDIS_PORT, 6379),
  REDIS_DB: toInt(env.REDIS_DB, 0),

  MAILER_SEND_EMAIL_TYPE: toEnum(env.MAILER_SEND_EMAIL_TYPE, Object.values(SendEmailType), SendEmailType.sync) as SendEmailType,
  MAILER_TASK_DELAY: toInt(env.MAILER_TASK_DELAY, 5000),
  MAILER_DEFAULT_FROM_EMAIL: toString(env.MAILER_DEFAULT_FROM_EMAIL, 'noreply@example.com'),
  MAILER_DEFAULT_FROM_NAME: toString(env.MAILER_DEFAULT_FROM_NAME, 'Project Name'),
  MAILER_SMTP_HOST: toString(env.MAILER_SMTP_HOST, 'smtp.example.com'),
  MAILER_SMTP_PORT: toInt(env.MAILER_SMTP_PORT, 587),
  MAILER_SMTP_IS_SECURE: toBool(env.MAILER_SMTP_IS_SECURE, true),
  MAILER_SMTP_AUTH_USER: toString(env.MAILER_SMTP_AUTH_USER, 'noreply@example.com'),
  MAILER_SMTP_AUTH_PASS: toString(env.MAILER_SMTP_AUTH_PASS, 'password')
}