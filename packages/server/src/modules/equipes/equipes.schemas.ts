import { z } from "zod";

const saison = z
  .string()
  .regex(/^\d{4}-\d{4}$/, "Format attendu : AAAA-AAAA")
  .refine((s) => Number(s.slice(5)) === Number(s.slice(0, 4)) + 1, {
    message: "La saison doit couvrir deux années consécutives (ex. 2026-2027)",
  });

const equipeBase = z.object({
  nom: z.string().trim().min(1).max(100),
  categorie: z.string().trim().min(1).max(50),
  saison,
  actif: z.boolean().optional(),
});

export const creerEquipeSchema = equipeBase;
export const modifierEquipeSchema = equipeBase.partial();

export const listeEquipesQuerySchema = z.object({
  actif: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  saison: saison.optional(),
});

export const idParamSchema = z.object({ id: z.uuid() });
