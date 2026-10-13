import { z } from "zod";

/** Normalise un numéro belge saisi librement (espaces, points, tirets, slashs). */
const normaliserTelephone = (brut: string) => brut.replace(/[\s./\-()]/g, "");

// Préfixe national (0) ou international (+32 / 0032), puis 8 chiffres (fixe) ou 9 (mobile).
const TELEPHONE_BELGE = /^(?:\+32|0032|0)[1-9]\d{7,8}$/;

const telephone = z
  .string()
  .transform(normaliserTelephone)
  .refine((t) => TELEPHONE_BELGE.test(t), "Numéro de téléphone belge invalide");

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
  telephone: telephone.nullish(),
  actif: z.boolean().optional(),
});

export const creerJoueurSchema = joueurBase;
export const modifierJoueurSchema = joueurBase.partial();

const booleenQuery = z.enum(["true", "false"]).transform((v) => v === "true");

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
