import type { Request, Response } from "express";
import {
  appartenanceParamSchema,
  creerAppartenanceSchema,
  creerJoueurSchema,
  idParamSchema,
  listeJoueursQuerySchema,
  modifierAppartenanceSchema,
  modifierJoueurSchema,
} from "./joueurs.schemas";
import * as service from "./joueurs.service";

export async function lister(req: Request, res: Response) {
  const query = listeJoueursQuerySchema.parse(req.query);
  res.json({ data: await service.lister(query) });
}

export async function obtenir(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.obtenir(id) });
}

export async function creer(req: Request, res: Response) {
  const joueur = await service.creer(creerJoueurSchema.parse(req.body));
  res.status(201).location(`/api/v1/joueurs/${joueur.id}`).json({ data: joueur });
}

export async function modifier(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.modifier(id, modifierJoueurSchema.parse(req.body)) });
}

export async function supprimer(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await service.desactiver(id);
  res.status(204).end();
}

export async function listerEquipes(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.listerEquipes(id) });
}

export async function ajouterEquipe(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const appartenance = await service.ajouterEquipe(id, creerAppartenanceSchema.parse(req.body));
  res
    .status(201)
    .location(`/api/v1/joueurs/${id}/equipes/${appartenance.equipeId}`)
    .json({ data: appartenance });
}

export async function modifierEquipe(req: Request, res: Response) {
  const { id, idEquipe } = appartenanceParamSchema.parse(req.params);
  const data = modifierAppartenanceSchema.parse(req.body);
  res.json({ data: await service.modifierEquipe(id, idEquipe, data) });
}

export async function retirerEquipe(req: Request, res: Response) {
  const { id, idEquipe } = appartenanceParamSchema.parse(req.params);
  await service.retirerEquipe(id, idEquipe);
  res.status(204).end();
}
