import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default(3000),

  // Database
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),

  // Session
  SESSION_SECRET: z
    .string()
    .min(32, 'Session secret must be at least 32 characters'),

  // Client
  CLIENT_URL: z.url('Must be a valid client URL'),

  // Email configuration
  EMAIL_USER: z.email('Must be a valid email address'),
  EMAIL_APP_PASSWORD: z.string().min(1, 'Email password is required'),

  // AWS S3 configuration
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS Access Key ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS Secret Access Key is required'),
  AWS_DEFAULT_REGION: z.string().min(1, 'AWS Region is required'),
  AWS_BUCKET: z.string().min(1, 'S3 Bucket name is required'),

  // Default admin credentials
  DEFAULT_ADMIN_EMAIL: z.email('Must be a valid admin email address'),
  DEFAULT_ADMIN_PASSWORD: z
    .string()
    .min(8, 'Default admin password must be at least 8 characters'),

  HUNTER_API_KEY: z.string().min(1, 'Hunter API Key is required'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment configuration:');
      error.issues.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      console.error(
        '\nPlease check your .env file and ensure all required variables are set.',
      );
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
