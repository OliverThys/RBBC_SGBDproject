import { z } from "zod";

/** Normalise un numéro belge saisi librement (espaces, points, tirets, slashs). */
const normaliserTelephone = (brut: string) => brut.replace(/[\s./\-()]/g, "");

// Préfixe national (0) ou international (+32 / 0032), puis 8 chiffres (fixe) ou 9 (mobile).
const TELEPHONE_BELGE = /^(?:\+32|0032|0)[1-9]\d{7,8}$/;

export const telephoneBelge = z
  .string()
  .transform(normaliserTelephone)
  .refine((t) => TELEPHONE_BELGE.test(t), "Numéro de téléphone belge invalide");

export const booleenQuery = z.enum(["true", "false"]).transform((v) => v === "true");
