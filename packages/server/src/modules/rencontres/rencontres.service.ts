import { z } from "zod";
import { conflict, notFound, unprocessable } from "../../core/errors";
import { prisma } from "../../core/prisma";
import type {
  creerRencontreSchema,
  listeRencontresQuerySchema,
  modifierRencontreSchema,
  scoreSchema,
} from "./rencontres.schemas";

type CreerRencontre = z.output<typeof creerRencontreSchema>;
type ModifierRencontre = z.output<typeof modifierRencontreSchema>;
type ListeQuery = z.output<typeof listeRencontresQuerySchema>;
type Score = z.output<typeof scoreSchema>;

const avecEquipe = { equipe: { select: { nom: true, categorie: true } } } as const;

async function assurerEquipe(id: string) {
  const equipe = await prisma.equipe.findUnique({ where: { id }, select: { id: true } });
  if (!equipe) throw notFound("Équipe introuvable");
}

async function chargerRencontre(id: string) {
  const rencontre = await prisma.rencontre.findUnique({ where: { id } });
  if (!rencontre) throw notFound("Rencontre introuvable");
  return rencontre;
}

/** Fenêtre (UTC) du mois, de l'année entière, ou aucune borne. */
function fenetreDates({ mois, annee }: ListeQuery) {
  if (annee === undefined) return undefined;
  if (mois === undefined) {
    return { gte: new Date(Date.UTC(annee, 0, 1)), lt: new Date(Date.UTC(annee + 1, 0, 1)) };
  }
  return { gte: new Date(Date.UTC(annee, mois - 1, 1)), lt: new Date(Date.UTC(annee, mois, 1)) };
}

export function lister(query: ListeQuery) {
  return prisma.rencontre.findMany({
    where: { equipeId: query.equipe, dateHeure: fenetreDates(query) },
    include: avecEquipe,
    orderBy: { dateHeure: "asc" },
  });
}

export async function obtenir(id: string) {
  const rencontre = await prisma.rencontre.findUnique({ where: { id }, include: avecEquipe });
  if (!rencontre) throw notFound("Rencontre introuvable");
  return rencontre;
}

export async function creer(data: CreerRencontre) {
  await assurerEquipe(data.equipeId);
  return prisma.rencontre.create({ data, include: avecEquipe });
}

/**
 * Les scores ne se modifient jamais ici (voir `enregistrerScore`). Un changement
 * de statut garde la rencontre cohérente : JOUEE exige un score déjà saisi,
 * tout autre statut efface le score éventuel.
 */
export async function modifier(id: string, data: ModifierRencontre) {
  const existante = await chargerRencontre(id);
  if (data.equipeId) await assurerEquipe(data.equipeId);

  const scoreEfface =
    data.statut !== undefined && data.statut !== "JOUEE" && existante.scoreNous !== null;

  if (data.statut === "JOUEE" && existante.scoreNous === null) {
    throw unprocessable("Saisissez le score via POST /rencontres/:id/score pour marquer la rencontre jouée");
  }

  return prisma.rencontre.update({
    where: { id },
    data: {
      ...data,
      ...(scoreEfface ? { scoreNous: null, scoreAdversaire: null } : {}),
    },
    include: avecEquipe,
  });
}

export async function supprimer(id: string) {
  await chargerRencontre(id);
  await prisma.rencontre.delete({ where: { id } });
}

/** Saisie ou correction du score : la rencontre passe (ou reste) JOUEE. L'audit est fait par trigger SQL. */
export async function enregistrerScore(id: string, { scoreNous, scoreAdversaire }: Score) {
  const existante = await chargerRencontre(id);
  if (existante.statut === "FORFAIT_NOUS" || existante.statut === "FORFAIT_ADVERSAIRE") {
    throw conflict("Rencontre perdue ou gagnée par forfait : repassez-la à « À venir » avant de saisir un score");
  }
  return prisma.rencontre.update({
    where: { id },
    data: { scoreNous, scoreAdversaire, statut: "JOUEE" },
    include: avecEquipe,
  });
}
