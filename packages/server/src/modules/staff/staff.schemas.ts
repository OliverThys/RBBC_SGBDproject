import { z } from "zod";
import { booleenQuery, telephoneBelge } from "../../core/validation";

const fonction = z.enum(["ENTRAINEUR", "ASSISTANT", "DELEGUE", "KINE"]);

const staffBase = z.object({
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  fonction,
  email: z.email().nullish(),
  telephone: telephoneBelge.nullish(),
  actif: z.boolean().optional(),
});

export const creerStaffSchema = staffBase;
export const modifierStaffSchema = staffBase.partial();

export const listeStaffQuerySchema = z.object({
  equipe: z.uuid().optional(),
  fonction: fonction.optional(),
  actif: booleenQuery.optional(),
});

export const idParamSchema = z.object({ id: z.uuid() });
export const appartenanceParamSchema = z.object({ id: z.uuid(), idEquipe: z.uuid() });

export const creerAppartenanceSchema = z.object({ idEquipe: z.uuid() });
