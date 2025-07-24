import { env } from './env.js';

interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
  };
}

interface SessionConfig {
  secret: string;
  maxAge: number;
  secure: boolean;
  httpOnly: boolean;
  rolling: boolean;
}

interface EmailConfig {
  user: string;
  pass: string;
}

interface AWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  s3BucketName: string;
}

interface AppConfig {
  port: number;
  nodeEnv: string;
  clientUrl: string;
  database: DatabaseConfig;
  session: SessionConfig;
  email: EmailConfig;
  aws: AWSConfig;
}

const createConfig = (): AppConfig => ({
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  clientUrl: env.CLIENT_URL,

  database: {
    uri: env.MONGODB_URI,
    options: {
      maxPoolSize: env.NODE_ENV === 'production' ? 20 : 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  session: {
    secret: env.SESSION_SECRET,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    rolling: true,
  },

  email: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_APP_PASSWORD,
  },

  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_DEFAULT_REGION,
    s3BucketName: env.AWS_BUCKET,
  },
});

export const config = createConfig();
export type Config = AppConfig;
