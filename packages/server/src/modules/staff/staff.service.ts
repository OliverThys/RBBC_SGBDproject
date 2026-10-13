import { Prisma } from "@prisma/client";
import { z } from "zod";
import { conflict, notFound } from "../../core/errors";
import { prisma } from "../../core/prisma";
import type {
  creerAppartenanceSchema,
  creerStaffSchema,
  listeStaffQuerySchema,
  modifierStaffSchema,
} from "./staff.schemas";

type CreerStaff = z.output<typeof creerStaffSchema>;
type ModifierStaff = z.output<typeof modifierStaffSchema>;
type ListeQuery = z.output<typeof listeStaffQuerySchema>;
type CreerAppartenance = z.output<typeof creerAppartenanceSchema>;

const selectAppartenance = {
  equipeId: true,
  actif: true,
  equipe: { select: { nom: true, categorie: true, saison: true } },
} satisfies Prisma.StaffEquipeSelect;

const avecEquipes = {
  equipes: { select: selectAppartenance, orderBy: { createdAt: "asc" } },
} satisfies Prisma.StaffInclude;

async function assurerStaff(id: string) {
  const staff = await prisma.staff.findUnique({ where: { id }, select: { id: true } });
  if (!staff) throw notFound("Membre du staff introuvable");
}

export function lister({ equipe, fonction, actif }: ListeQuery) {
  return prisma.staff.findMany({
    where: {
      actif,
      fonction,
      // Filtre équipe : appartenance active uniquement.
      equipes: equipe ? { some: { equipeId: equipe, actif: true } } : undefined,
    },
    include: avecEquipes,
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
}

export async function obtenir(id: string) {
  const staff = await prisma.staff.findUnique({ where: { id }, include: avecEquipes });
  if (!staff) throw notFound("Membre du staff introuvable");
  return staff;
}

export function creer(data: CreerStaff) {
  return prisma.staff.create({ data, include: avecEquipes });
}

export async function modifier(id: string, data: ModifierStaff) {
  await assurerStaff(id);
  return prisma.staff.update({ where: { id }, data, include: avecEquipes });
}

/** Soft delete : le membre est désactivé, ses appartenances restent consultables. */
export async function desactiver(id: string) {
  await assurerStaff(id);
  await prisma.staff.update({ where: { id }, data: { actif: false } });
}

export async function listerEquipes(staffId: string) {
  await assurerStaff(staffId);
  return prisma.staffEquipe.findMany({
    where: { staffId },
    select: selectAppartenance,
    orderBy: { createdAt: "asc" },
  });
}

export async function ajouterEquipe(staffId: string, { idEquipe }: CreerAppartenance) {
  await assurerStaff(staffId);
  const equipe = await prisma.equipe.findUnique({ where: { id: idEquipe }, select: { id: true } });
  if (!equipe) throw notFound("Équipe introuvable");

  try {
    return await prisma.staffEquipe.create({
      data: { staffId, equipeId: idEquipe },
      select: selectAppartenance,
    });
  } catch (e) {
    // Contrainte unique (staffId, equipeId) du schéma.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("Ce membre du staff encadre déjà cette équipe");
    }
    throw e;
  }
}

export async function retirerEquipe(staffId: string, idEquipe: string) {
  const { count } = await prisma.staffEquipe.deleteMany({
    where: { staffId, equipeId: idEquipe },
  });
  if (count === 0) throw notFound("Appartenance introuvable");
}
