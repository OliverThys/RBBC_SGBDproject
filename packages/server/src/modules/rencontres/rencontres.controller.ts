import type { Request, Response } from "express";
import {
  creerRencontreSchema,
  idParamSchema,
  listeRencontresQuerySchema,
  modifierRencontreSchema,
  scoreSchema,
} from "./rencontres.schemas";
import * as service from "./rencontres.service";

export async function lister(req: Request, res: Response) {
  res.json({ data: await service.lister(listeRencontresQuerySchema.parse(req.query)) });
}

export async function obtenir(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.obtenir(id) });
}

export async function creer(req: Request, res: Response) {
  const rencontre = await service.creer(creerRencontreSchema.parse(req.body));
  res.status(201).location(`/api/v1/rencontres/${rencontre.id}`).json({ data: rencontre });
}

export async function modifier(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.modifier(id, modifierRencontreSchema.parse(req.body)) });
}

export async function supprimer(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await service.supprimer(id);
  res.status(204).end();
}

export async function enregistrerScore(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.enregistrerScore(id, scoreSchema.parse(req.body)) });
}
