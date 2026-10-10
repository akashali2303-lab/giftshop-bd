import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((v) => parseInt(v, 10)).default('5000'),
  APP_URL: z.string().default('http://localhost:5000'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  ADMIN_URL: z.string().optional().default('http://localhost:5174'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ADMIN_DEFAULT_EMAIL: z.string().email(),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default('./storage/uploads'),
  MAX_FILE_SIZE_BYTES: z.string().transform((v) => parseInt(v, 10)).default('20971520'),
  WHATSAPP_SUPPORT_NUMBER: z.string().default('8801700000000')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}
export const env = parsed.data;
