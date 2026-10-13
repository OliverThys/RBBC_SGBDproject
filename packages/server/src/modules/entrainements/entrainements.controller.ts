import type { Request, Response } from "express";
import {
  creerEntrainementSchema,
  idParamSchema,
  listeEntrainementsQuerySchema,
  modifierEntrainementSchema,
  sauvegarderPresencesSchema,
} from "./entrainements.schemas";
import * as service from "./entrainements.service";

export async function lister(req: Request, res: Response) {
  res.json({ data: await service.lister(listeEntrainementsQuerySchema.parse(req.query)) });
}

export async function obtenir(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.obtenir(id) });
}

export async function creer(req: Request, res: Response) {
  const entrainement = await service.creer(creerEntrainementSchema.parse(req.body));
  res.status(201).location(`/api/v1/entrainements/${entrainement.id}`).json({ data: entrainement });
}

export async function modifier(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.modifier(id, modifierEntrainementSchema.parse(req.body)) });
}

export async function supprimer(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await service.supprimer(id);
  res.status(204).end();
}

export async function listerPresences(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.listerPresences(id) });
}

export async function sauvegarderPresences(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const { presences } = sauvegarderPresencesSchema.parse(req.body);
  res.json({ data: await service.sauvegarderPresences(id, presences) });
}
