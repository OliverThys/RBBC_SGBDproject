import { Router } from "express";
import { authGuard, requirePermission } from "../../core/auth/middleware";
import { asyncHandler } from "../../core/errors";
import * as c from "./entrainements.controller";

export const entrainementsRouter = Router();

entrainementsRouter.use(authGuard);

entrainementsRouter.get("/", requirePermission("ENTRAINEMENTS_LIRE"), asyncHandler(c.lister));
entrainementsRouter.post("/", requirePermission("ENTRAINEMENTS_ECRIRE"), asyncHandler(c.creer));
entrainementsRouter.get("/:id", requirePermission("ENTRAINEMENTS_LIRE"), asyncHandler(c.obtenir));
entrainementsRouter.put("/:id", requirePermission("ENTRAINEMENTS_ECRIRE"), asyncHandler(c.modifier));
entrainementsRouter.delete("/:id", requirePermission("ENTRAINEMENTS_SUPPRIMER"), asyncHandler(c.supprimer));

entrainementsRouter.get("/:id/presences", requirePermission("PRESENCES_LIRE"), asyncHandler(c.listerPresences));
entrainementsRouter.put("/:id/presences", requirePermission("PRESENCES_ECRIRE"), asyncHandler(c.sauvegarderPresences));
