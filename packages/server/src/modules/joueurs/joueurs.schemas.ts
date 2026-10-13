import { z } from "zod";
import { booleenQuery, telephoneBelge } from "../../core/validation";

const dateNaissance = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ")
  .transform((s) => new Date(`${s}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Date invalide")
  .refine((d) => d.getTime() <= Date.now(), "La date de naissance ne peut pas être dans le futur");

const joueurBase = z.object({
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  dateNaissance,
  email: z.email().nullish(),
  telephone: telephoneBelge.nullish(),
  actif: z.boolean().optional(),
});

export const creerJoueurSchema = joueurBase;
export const modifierJoueurSchema = joueurBase.partial();

export const listeJoueursQuerySchema = z.object({
  equipe: z.uuid().optional(),
  actif: booleenQuery.optional(),
});

export const idParamSchema = z.object({ id: z.uuid() });
export const appartenanceParamSchema = z.object({ id: z.uuid(), idEquipe: z.uuid() });

const numeroMaillot = z.number().int().min(0).max(99);

export const creerAppartenanceSchema = z.object({
  idEquipe: z.uuid(),
  numeroMaillot,
});

export const modifierAppartenanceSchema = z
  .object({ numeroMaillot: numeroMaillot.optional(), actif: z.boolean().optional() })
  .refine((v) => v.numeroMaillot !== undefined || v.actif !== undefined, {
    message: "Au moins un champ à modifier (numeroMaillot, actif)",
  });
