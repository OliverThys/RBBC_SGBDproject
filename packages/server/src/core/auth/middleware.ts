import type { CodePermission } from "@prisma/client";
import type { RequestHandler } from "express";
import { asyncHandler, forbidden, unauthorized } from "../errors";
import { prisma } from "../prisma";
import { getPermissionsEffectives } from "./permissions";
import { COOKIE_NAME, verifierToken } from "./token";

/**
 * Authentifie la requête via le cookie JWT. L'utilisateur et ses permissions
 * sont relus en base à chaque requête : un compte désactivé ou une permission
 * retirée/expirée prend effet immédiatement, sans attendre l'expiration du token.
 */
export const authGuard: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  const utilisateurId = typeof token === "string" ? verifierToken(token) : null;
  if (!utilisateurId) throw unauthorized();

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    select: { id: true, login: true, nom: true, prenom: true, email: true, actif: true },
  });
  if (!utilisateur?.actif) throw unauthorized();

  const permissions = await getPermissionsEffectives(utilisateur.id);
  req.user = {
    id: utilisateur.id,
    login: utilisateur.login,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    email: utilisateur.email,
    permissions: new Set(permissions.map((p) => p.code)),
  };
  next();
});

/** À placer après `authGuard`. Exige toutes les permissions listées. */
export const requirePermission =
  (...codes: CodePermission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    const user = req.user;
    if (!codes.every((c) => user.permissions.has(c))) return next(forbidden());
    next();
  };
