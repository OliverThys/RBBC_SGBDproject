import type { Request, Response } from "express";
import {
  creerEquipeSchema,
  idParamSchema,
  listeEquipesQuerySchema,
  modifierEquipeSchema,
} from "./equipes.schemas";
import * as service from "./equipes.service";

export async function lister(req: Request, res: Response) {
  res.json({ data: await service.lister(listeEquipesQuerySchema.parse(req.query)) });
}

export async function obtenir(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.obtenir(id) });
}

export async function creer(req: Request, res: Response) {
  const equipe = await service.creer(creerEquipeSchema.parse(req.body));
  res.status(201).location(`/api/v1/equipes/${equipe.id}`).json({ data: equipe });
}

export async function modifier(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.modifier(id, modifierEquipeSchema.parse(req.body)) });
}

export async function supprimer(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await service.desactiver(id);
  res.status(204).end();
}

export async function effectif(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.effectif(id) });
}
