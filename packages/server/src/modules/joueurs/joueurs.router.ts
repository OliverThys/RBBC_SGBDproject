import { Router } from "express";
import { authGuard, requirePermission } from "../../core/auth/middleware";
import { asyncHandler } from "../../core/errors";
import * as c from "./joueurs.controller";

export const joueursRouter = Router();

joueursRouter.use(authGuard);

joueursRouter.get("/", requirePermission("JOUEURS_LIRE"), asyncHandler(c.lister));
joueursRouter.post("/", requirePermission("JOUEURS_ECRIRE"), asyncHandler(c.creer));
joueursRouter.get("/:id", requirePermission("JOUEURS_LIRE"), asyncHandler(c.obtenir));
joueursRouter.put("/:id", requirePermission("JOUEURS_ECRIRE"), asyncHandler(c.modifier));
joueursRouter.delete("/:id", requirePermission("JOUEURS_SUPPRIMER"), asyncHandler(c.supprimer));

joueursRouter.get("/:id/equipes", requirePermission("JOUEURS_LIRE"), asyncHandler(c.listerEquipes));
joueursRouter.post("/:id/equipes", requirePermission("JOUEURS_ECRIRE"), asyncHandler(c.ajouterEquipe));
joueursRouter.put("/:id/equipes/:idEquipe", requirePermission("JOUEURS_ECRIRE"), asyncHandler(c.modifierEquipe));
joueursRouter.delete("/:id/equipes/:idEquipe", requirePermission("JOUEURS_ECRIRE"), asyncHandler(c.retirerEquipe));
