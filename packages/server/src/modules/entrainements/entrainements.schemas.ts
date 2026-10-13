import { z } from "zod";

const dateHeure = z.iso
  .datetime({ offset: true })
  .transform((s) => new Date(s));

const dureeMinutes = z.number().int().min(15).max(300);

const entrainementBase = z.object({
  equipeId: z.uuid(),
  dateHeure,
  dureeMinutes,
  lieu: z.string().trim().min(1).max(200),
});

export const creerEntrainementSchema = entrainementBase;
export const modifierEntrainementSchema = entrainementBase.partial();

export const listeEntrainementsQuerySchema = z.object({
  equipe: z.uuid().optional(),
  // Un jour quelconque de la semaine voulue (AAAA-MM-JJ), semaine du lundi au dimanche.
  semaine: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ")
    .transform((s) => new Date(`${s}T00:00:00.000Z`))
    .refine((d) => !Number.isNaN(d.getTime()), "Date invalide")
    .optional(),
});

export const idParamSchema = z.object({ id: z.uuid() });

const presenceSchema = z
  .object({
    joueurId: z.uuid(),
    present: z.boolean(),
    justifie: z.boolean().default(false),
  })
  // Règle métier : une absence seule peut être justifiée.
  .refine((p) => !(p.justifie && p.present), {
    message: "Une absence justifiée ne peut pas être marquée présente",
    path: ["justifie"],
  });

export const sauvegarderPresencesSchema = z
  .object({ presences: z.array(presenceSchema).max(100) })
  .refine((v) => new Set(v.presences.map((p) => p.joueurId)).size === v.presences.length, {
    message: "Un joueur ne peut apparaître qu'une fois",
    path: ["presences"],
  });
