import jwt from "jsonwebtoken";
import { config } from "../config";

export const COOKIE_NAME = "rbbc_token";

const ALGORITHM = "HS256";

export function signerToken(utilisateurId: string): string {
  return jwt.sign({}, config.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: utilisateurId,
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/** Retourne l'id de l'utilisateur, ou null si le token est invalide/expiré. */
export function verifierToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: [ALGORITHM] });
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
