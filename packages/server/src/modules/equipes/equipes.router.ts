import { Router } from "express";
import { authGuard, requirePermission } from "../../core/auth/middleware";
import { asyncHandler } from "../../core/errors";
import * as c from "./equipes.controller";

export const equipesRouter = Router();

equipesRouter.use(authGuard);

equipesRouter.get("/", requirePermission("EQUIPES_LIRE"), asyncHandler(c.lister));
equipesRouter.post("/", requirePermission("EQUIPES_ECRIRE"), asyncHandler(c.creer));
equipesRouter.get("/:id", requirePermission("EQUIPES_LIRE"), asyncHandler(c.obtenir));
equipesRouter.put("/:id", requirePermission("EQUIPES_ECRIRE"), asyncHandler(c.modifier));
equipesRouter.delete("/:id", requirePermission("EQUIPES_SUPPRIMER"), asyncHandler(c.supprimer));
equipesRouter.get("/:id/effectif", requirePermission("EQUIPES_LIRE"), asyncHandler(c.effectif));
