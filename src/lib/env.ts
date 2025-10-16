import { z } from "zod";

const envSchema = z.object({
  // Database - always provide a default for build
  DATABASE_URL: z.string().url(),

  // CuraGenesis API - Intake - always provide defaults
  CURAGENESIS_API_BASE: z.string().url(),
  CURAGENESIS_API_KEY: z.string().min(1),
  CURAGENESIS_API_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()),

  // CuraGenesis API - Vendor Token for User Creation
  CURAGENESIS_VENDOR_TOKEN: z.string().min(1),

  // CuraGenesis API - Metrics - always provide default
  CG_METRICS_API_KEY: z.string().min(1),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Client-side env (NEXT_PUBLIC_* vars)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_CG_METRICS_BASE: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// Validate server env - provide defaults for build time
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://build:build@localhost:5432/build',
  CURAGENESIS_API_BASE: process.env.CURAGENESIS_API_BASE || 'https://api.curagenesis.com',
  CURAGENESIS_API_KEY: process.env.CURAGENESIS_API_KEY || 'build-key',
  CURAGENESIS_API_TIMEOUT_MS: process.env.CURAGENESIS_API_TIMEOUT_MS || '60000',
  CURAGENESIS_VENDOR_TOKEN: process.env.CURAGENESIS_VENDOR_TOKEN || 'build-key',
  CG_METRICS_API_KEY: process.env.CG_METRICS_API_KEY || 'build-key',
  NODE_ENV: process.env.NODE_ENV,
});

// Validate client env
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_CG_METRICS_BASE: process.env.NEXT_PUBLIC_CG_METRICS_BASE || 'https://api.curagenesis.com',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
