import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // CuraGenesis API - Intake
  CURAGENESIS_API_BASE: z.string().url(),
  CURAGENESIS_API_KEY: z.string().min(1),
  CURAGENESIS_API_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()),

  // CuraGenesis API - Metrics
  CG_METRICS_API_KEY: z.string().min(1),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Client-side env (NEXT_PUBLIC_* vars)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_CG_METRICS_BASE: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// Validate server env
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  CURAGENESIS_API_BASE: process.env.CURAGENESIS_API_BASE,
  CURAGENESIS_API_KEY: process.env.CURAGENESIS_API_KEY,
  CURAGENESIS_API_TIMEOUT_MS: process.env.CURAGENESIS_API_TIMEOUT_MS,
  CG_METRICS_API_KEY: process.env.CG_METRICS_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

// Validate client env
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_CG_METRICS_BASE: process.env.NEXT_PUBLIC_CG_METRICS_BASE,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
