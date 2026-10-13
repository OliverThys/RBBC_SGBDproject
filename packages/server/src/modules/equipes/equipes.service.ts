import { z } from "zod";
import { notFound } from "../../core/errors";
import { prisma } from "../../core/prisma";
import type {
  creerEquipeSchema,
  listeEquipesQuerySchema,
  modifierEquipeSchema,
} from "./equipes.schemas";

type CreerEquipe = z.output<typeof creerEquipeSchema>;
type ModifierEquipe = z.output<typeof modifierEquipeSchema>;
type ListeQuery = z.output<typeof listeEquipesQuerySchema>;

async function assurerEquipe(id: string) {
  const equipe = await prisma.equipe.findUnique({ where: { id }, select: { id: true } });
  if (!equipe) throw notFound("Équipe introuvable");
}

export function lister({ actif, saison }: ListeQuery) {
  return prisma.equipe.findMany({
    where: { actif, saison },
    orderBy: [{ saison: "desc" }, { nom: "asc" }],
  });
}

export async function obtenir(id: string) {
  const equipe = await prisma.equipe.findUnique({ where: { id } });
  if (!equipe) throw notFound("Équipe introuvable");
  return equipe;
}

export function creer(data: CreerEquipe) {
  return prisma.equipe.create({ data });
}

export async function modifier(id: string, data: ModifierEquipe) {
  await assurerEquipe(id);
  return prisma.equipe.update({ where: { id }, data });
}

/** Soft delete : rencontres, entraînements et appartenances restent consultables. */
export async function desactiver(id: string) {
  await assurerEquipe(id);
  await prisma.equipe.update({ where: { id }, data: { actif: false } });
}

/** Joueurs actifs ayant une appartenance active à l'équipe, triés par maillot. */
export async function effectif(id: string) {
  await assurerEquipe(id);
  const appartenances = await prisma.joueurEquipe.findMany({
    where: { equipeId: id, actif: true, joueur: { actif: true } },
    select: {
      numeroMaillot: true,
      joueur: { select: { id: true, nom: true, prenom: true, dateNaissance: true } },
    },
    orderBy: { numeroMaillot: "asc" },
  });
  return appartenances.map(({ numeroMaillot, joueur }) => ({ ...joueur, numeroMaillot }));
}
