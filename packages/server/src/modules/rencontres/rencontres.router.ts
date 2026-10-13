import { Router } from "express";
import { authGuard, requirePermission } from "../../core/auth/middleware";
import { asyncHandler } from "../../core/errors";
import * as c from "./rencontres.controller";

export const rencontresRouter = Router();

rencontresRouter.use(authGuard);

rencontresRouter.get("/", requirePermission("RENCONTRES_LIRE"), asyncHandler(c.lister));
rencontresRouter.post("/", requirePermission("RENCONTRES_ECRIRE"), asyncHandler(c.creer));
rencontresRouter.get("/:id", requirePermission("RENCONTRES_LIRE"), asyncHandler(c.obtenir));
rencontresRouter.put("/:id", requirePermission("RENCONTRES_ECRIRE"), asyncHandler(c.modifier));
rencontresRouter.delete("/:id", requirePermission("RENCONTRES_SUPPRIMER"), asyncHandler(c.supprimer));
rencontresRouter.post("/:id/score", requirePermission("RENCONTRES_ECRIRE"), asyncHandler(c.enregistrerScore));
