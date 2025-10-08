import { z } from "zod";

// During build, env vars may not be set - use defaults to allow build to complete
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),

  // CuraGenesis API - Intake
  CURAGENESIS_API_BASE: z.string().url(),
  CURAGENESIS_API_KEY: z.string().min(1).optional(),
  CURAGENESIS_API_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()),

  // CuraGenesis API - Metrics
  CG_METRICS_API_KEY: z.string().min(1).optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Client-side env (NEXT_PUBLIC_* vars)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_CG_METRICS_BASE: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// Validate server env with build-time defaults
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || (isBuildTime ? 'postgresql://build:build@localhost:5432/build' : undefined),
  CURAGENESIS_API_BASE: process.env.CURAGENESIS_API_BASE || 'https://api.curagenesis.com',
  CURAGENESIS_API_KEY: process.env.CURAGENESIS_API_KEY || (isBuildTime ? 'build-key' : undefined),
  CURAGENESIS_API_TIMEOUT_MS: process.env.CURAGENESIS_API_TIMEOUT_MS || '10000',
  CG_METRICS_API_KEY: process.env.CG_METRICS_API_KEY || (isBuildTime ? 'build-key' : undefined),
  NODE_ENV: process.env.NODE_ENV,
});

// Validate client env
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_CG_METRICS_BASE: process.env.NEXT_PUBLIC_CG_METRICS_BASE || 'https://api.curagenesis.com',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
