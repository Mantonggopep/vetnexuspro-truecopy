
import z from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(4001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  DIRECT_URL: z.string().optional(), // Required for Supabase migrations
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  API_KEY: z.string().optional(), // Google Gemini API Key
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 4));
  (process as any).exit(1);
}

export const env = parsed.data!;
