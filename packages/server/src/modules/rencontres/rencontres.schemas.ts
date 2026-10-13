import { z } from "zod";

const dateHeure = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

/** Statuts acceptables sans score : le passage à JOUEE se fait via POST /:id/score. */
const statutSansScore = z.enum(["A_VENIR", "FORFAIT_NOUS", "FORFAIT_ADVERSAIRE"]);

const rencontreBase = z.object({
  equipeId: z.uuid(),
  adversaire: z.string().trim().min(1).max(150),
  domicile: z.boolean(),
  dateHeure,
  lieu: z.string().trim().min(1).max(200).nullish(),
  numeroFederation: z.string().trim().min(1).max(50).nullish(),
});

export const creerRencontreSchema = rencontreBase.extend({
  statut: statutSansScore.optional(),
});

export const modifierRencontreSchema = rencontreBase.partial().extend({
  statut: z.enum(["A_VENIR", "JOUEE", "FORFAIT_NOUS", "FORFAIT_ADVERSAIRE"]).optional(),
});

const points = z.number().int().min(0).max(300);

export const scoreSchema = z
  .object({ scoreNous: points, scoreAdversaire: points })
  .refine((s) => s.scoreNous !== s.scoreAdversaire, {
    message: "Le match nul n'existe pas en basket : les deux scores doivent être différents",
    path: ["scoreAdversaire"],
  });

export const listeRencontresQuerySchema = z
  .object({
    equipe: z.uuid().optional(),
    mois: z.coerce.number().int().min(1).max(12).optional(),
    annee: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .refine((q) => q.mois === undefined || q.annee !== undefined, {
    message: "L'année est obligatoire quand le mois est fourni",
    path: ["annee"],
  });

export const idParamSchema = z.object({ id: z.uuid() });
