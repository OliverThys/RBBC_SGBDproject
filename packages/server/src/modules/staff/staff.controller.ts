import type { Request, Response } from "express";
import {
  appartenanceParamSchema,
  creerAppartenanceSchema,
  creerStaffSchema,
  idParamSchema,
  listeStaffQuerySchema,
  modifierStaffSchema,
} from "./staff.schemas";
import * as service from "./staff.service";

export async function lister(req: Request, res: Response) {
  res.json({ data: await service.lister(listeStaffQuerySchema.parse(req.query)) });
}

export async function obtenir(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.obtenir(id) });
}

export async function creer(req: Request, res: Response) {
  const staff = await service.creer(creerStaffSchema.parse(req.body));
  res.status(201).location(`/api/v1/staff/${staff.id}`).json({ data: staff });
}

export async function modifier(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.modifier(id, modifierStaffSchema.parse(req.body)) });
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
    .location(`/api/v1/staff/${id}/equipes/${appartenance.equipeId}`)
    .json({ data: appartenance });
}

export async function retirerEquipe(req: Request, res: Response) {
  const { id, idEquipe } = appartenanceParamSchema.parse(req.params);
  await service.retirerEquipe(id, idEquipe);
  res.status(204).end();
}
