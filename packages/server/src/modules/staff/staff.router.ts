import { Router } from "express";
import { authGuard, requirePermission } from "../../core/auth/middleware";
import { asyncHandler } from "../../core/errors";
import * as c from "./staff.controller";

export const staffRouter = Router();

staffRouter.use(authGuard);

staffRouter.get("/", requirePermission("STAFF_LIRE"), asyncHandler(c.lister));
staffRouter.post("/", requirePermission("STAFF_ECRIRE"), asyncHandler(c.creer));
staffRouter.get("/:id", requirePermission("STAFF_LIRE"), asyncHandler(c.obtenir));
staffRouter.put("/:id", requirePermission("STAFF_ECRIRE"), asyncHandler(c.modifier));
staffRouter.delete("/:id", requirePermission("STAFF_SUPPRIMER"), asyncHandler(c.supprimer));

staffRouter.get("/:id/equipes", requirePermission("STAFF_LIRE"), asyncHandler(c.listerEquipes));
staffRouter.post("/:id/equipes", requirePermission("STAFF_ECRIRE"), asyncHandler(c.ajouterEquipe));
staffRouter.delete("/:id/equipes/:idEquipe", requirePermission("STAFF_ECRIRE"), asyncHandler(c.retirerEquipe));
