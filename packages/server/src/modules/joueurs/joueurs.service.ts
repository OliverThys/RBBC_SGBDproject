import { Prisma } from "@prisma/client";
import { z } from "zod";
import { conflict, notFound } from "../../core/errors";
import { prisma } from "../../core/prisma";
import type {
  creerAppartenanceSchema,
  creerJoueurSchema,
  listeJoueursQuerySchema,
  modifierAppartenanceSchema,
  modifierJoueurSchema,
} from "./joueurs.schemas";

type CreerJoueur = z.output<typeof creerJoueurSchema>;
type ModifierJoueur = z.output<typeof modifierJoueurSchema>;
type ListeQuery = z.output<typeof listeJoueursQuerySchema>;
type CreerAppartenance = z.output<typeof creerAppartenanceSchema>;
type ModifierAppartenance = z.output<typeof modifierAppartenanceSchema>;

const selectAppartenance = {
  equipeId: true,
  numeroMaillot: true,
  actif: true,
  equipe: { select: { nom: true, categorie: true, saison: true } },
} satisfies Prisma.JoueurEquipeSelect;

const avecEquipes = {
  equipes: { select: selectAppartenance, orderBy: { createdAt: "asc" } },
} satisfies Prisma.JoueurInclude;

const MSG_MAILLOT = "Ce numéro de maillot est déjà pris dans cette équipe";

const estViolationUnicite = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

async function assurerJoueur(id: string) {
  const joueur = await prisma.joueur.findUnique({ where: { id }, select: { id: true } });
  if (!joueur) throw notFound("Joueur introuvable");
}

export function lister({ equipe, actif }: ListeQuery) {
  return prisma.joueur.findMany({
    where: {
      actif,
      // Filtre équipe : appartenance active uniquement.
      equipes: equipe ? { some: { equipeId: equipe, actif: true } } : undefined,
    },
    include: avecEquipes,
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
}

export async function obtenir(id: string) {
  const joueur = await prisma.joueur.findUnique({ where: { id }, include: avecEquipes });
  if (!joueur) throw notFound("Joueur introuvable");
  return joueur;
}

export function creer(data: CreerJoueur) {
  return prisma.joueur.create({ data, include: avecEquipes });
}

export async function modifier(id: string, data: ModifierJoueur) {
  await assurerJoueur(id);
  return prisma.joueur.update({ where: { id }, data, include: avecEquipes });
}

/** Soft delete : le joueur est désactivé, ses présences et cotisations sont conservées. */
export async function desactiver(id: string) {
  await assurerJoueur(id);
  await prisma.joueur.update({ where: { id }, data: { actif: false } });
}

export async function listerEquipes(joueurId: string) {
  await assurerJoueur(joueurId);
  return prisma.joueurEquipe.findMany({
    where: { joueurId },
    select: selectAppartenance,
    orderBy: { createdAt: "asc" },
  });
}

export async function ajouterEquipe(joueurId: string, { idEquipe, numeroMaillot }: CreerAppartenance) {
  await assurerJoueur(joueurId);
  const equipe = await prisma.equipe.findUnique({ where: { id: idEquipe }, select: { id: true } });
  if (!equipe) throw notFound("Équipe introuvable");

  const existante = await prisma.joueurEquipe.findFirst({
    where: { joueurId, equipeId: idEquipe },
    select: { id: true },
  });
  if (existante) {
    throw conflict("Le joueur a déjà une appartenance à cette équipe (modifiez-la ou réactivez-la)");
  }

  try {
    return await prisma.joueurEquipe.create({
      data: { joueurId, equipeId: idEquipe, numeroMaillot },
      select: selectAppartenance,
    });
  } catch (e) {
    if (estViolationUnicite(e)) throw conflict(MSG_MAILLOT);
    throw e;
  }
}

export async function modifierEquipe(joueurId: string, idEquipe: string, data: ModifierAppartenance) {
  const existante = await prisma.joueurEquipe.findFirst({
    where: { joueurId, equipeId: idEquipe },
    select: { id: true },
  });
  if (!existante) throw notFound("Appartenance introuvable");

  try {
    return await prisma.joueurEquipe.update({
      where: { id: existante.id },
      data,
      select: selectAppartenance,
    });
  } catch (e) {
    if (estViolationUnicite(e)) throw conflict(MSG_MAILLOT);
    throw e;
  }
}

export async function retirerEquipe(joueurId: string, idEquipe: string) {
  const { count } = await prisma.joueurEquipe.deleteMany({ where: { joueurId, equipeId: idEquipe } });
  if (count === 0) throw notFound("Appartenance introuvable");
}
