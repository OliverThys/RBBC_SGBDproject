import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET doit faire au moins 16 caractères"),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // On liste uniquement les noms des variables fautives, jamais leurs valeurs.
  const champs = Object.keys(z.flattenError(parsed.error).fieldErrors).join(", ");
  console.error(`Configuration invalide - variables à corriger : ${champs}`);
  process.exit(1);
}

export const config = parsed.data;
