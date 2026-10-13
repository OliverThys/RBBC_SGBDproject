import { z } from "zod";
import { notFound, unprocessable } from "../../core/errors";
import { prisma } from "../../core/prisma";
import type {
  creerEntrainementSchema,
  listeEntrainementsQuerySchema,
  modifierEntrainementSchema,
  sauvegarderPresencesSchema,
} from "./entrainements.schemas";

type CreerEntrainement = z.output<typeof creerEntrainementSchema>;
type ModifierEntrainement = z.output<typeof modifierEntrainementSchema>;
type ListeQuery = z.output<typeof listeEntrainementsQuerySchema>;
type Presences = z.output<typeof sauvegarderPresencesSchema>["presences"];

const avecEquipe = { equipe: { select: { nom: true, categorie: true } } } as const;

const JOUR_MS = 24 * 60 * 60 * 1000;

interface LignePresence {
  joueurId: string;
  nom: string;
  prenom: string;
  numeroMaillot: number | null;
  present: boolean;
  justifie: boolean;
  enregistre: boolean;
}

/** Fenêtre [lundi 00:00, lundi suivant 00:00[ (UTC) de la semaine contenant `jour`. */
function fenetreSemaine(jour: Date) {
  const decalageLundi = (jour.getUTCDay() + 6) % 7;
  const debut = new Date(jour.getTime() - decalageLundi * JOUR_MS);
  return { gte: debut, lt: new Date(debut.getTime() + 7 * JOUR_MS) };
}

async function assurerEquipe(id: string) {
  const equipe = await prisma.equipe.findUnique({ where: { id }, select: { id: true } });
  if (!equipe) throw notFound("Équipe introuvable");
}

async function assurerEntrainement(id: string) {
  const entrainement = await prisma.entrainement.findUnique({
    where: { id },
    select: { id: true, equipeId: true },
  });
  if (!entrainement) throw notFound("Entraînement introuvable");
  return entrainement;
}

export function lister({ equipe, semaine }: ListeQuery) {
  return prisma.entrainement.findMany({
    where: {
      equipeId: equipe,
      dateHeure: semaine ? fenetreSemaine(semaine) : undefined,
    },
    include: avecEquipe,
    orderBy: { dateHeure: "asc" },
  });
}

export async function obtenir(id: string) {
  const entrainement = await prisma.entrainement.findUnique({
    where: { id },
    include: avecEquipe,
  });
  if (!entrainement) throw notFound("Entraînement introuvable");
  return entrainement;
}

export async function creer(data: CreerEntrainement) {
  await assurerEquipe(data.equipeId);
  return prisma.entrainement.create({ data, include: avecEquipe });
}

export async function modifier(id: string, data: ModifierEntrainement) {
  await assurerEntrainement(id);
  if (data.equipeId) await assurerEquipe(data.equipeId);
  return prisma.entrainement.update({ where: { id }, data, include: avecEquipe });
}

/** Suppression définitive : les présences de la séance partent avec (cascade). */
export async function supprimer(id: string) {
  await assurerEntrainement(id);
  await prisma.entrainement.delete({ where: { id } });
}

/**
 * Feuille de présence : joueurs actifs de l'équipe (appartenance active) plus
 * ceux qui ont déjà une présence enregistrée (ex. départ de l'équipe depuis).
 * Un joueur sans ligne est renvoyé absent / non justifié, `enregistre: false`.
 */
export async function listerPresences(entrainementId: string) {
  const { equipeId } = await assurerEntrainement(entrainementId);

  const [effectif, enregistrees] = await Promise.all([
    prisma.joueurEquipe.findMany({
      where: { equipeId, actif: true, joueur: { actif: true } },
      select: { numeroMaillot: true, joueur: { select: { id: true, nom: true, prenom: true } } },
    }),
    prisma.presence.findMany({
      where: { entrainementId },
      select: {
        present: true,
        justifie: true,
        joueur: { select: { id: true, nom: true, prenom: true } },
      },
    }),
  ]);

  const parJoueur = new Map(enregistrees.map((p) => [p.joueur.id, p]));
  const lignes: LignePresence[] = effectif.map(({ numeroMaillot, joueur }) => {
    const p = parJoueur.get(joueur.id);
    parJoueur.delete(joueur.id);
    return {
      joueurId: joueur.id,
      nom: joueur.nom,
      prenom: joueur.prenom,
      numeroMaillot,
      present: p?.present ?? false,
      justifie: p?.justifie ?? false,
      enregistre: p !== undefined,
    };
  });
  for (const p of parJoueur.values()) {
    lignes.push({
      joueurId: p.joueur.id,
      nom: p.joueur.nom,
      prenom: p.joueur.prenom,
      numeroMaillot: null,
      present: p.present,
      justifie: p.justifie,
      enregistre: true,
    });
  }

  return lignes.sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom));
}

/** Upsert en bloc, atomique. Seuls les joueurs de l'effectif actif de l'équipe sont acceptés. */
export async function sauvegarderPresences(entrainementId: string, presences: Presences) {
  const { equipeId } = await assurerEntrainement(entrainementId);

  const effectif = await prisma.joueurEquipe.findMany({
    where: { equipeId, actif: true },
    select: { joueurId: true },
  });
  const autorises = new Set(effectif.map((e) => e.joueurId));
  const intrus = presences.filter((p) => !autorises.has(p.joueurId));
  if (intrus.length > 0) {
    throw unprocessable(
      "Certains joueurs n'appartiennent pas à l'effectif actif de l'équipe",
      intrus.map((p) => ({ path: "presences.joueurId", message: p.joueurId })),
    );
  }

  await prisma.$transaction(
    presences.map((p) =>
      prisma.presence.upsert({
        where: { entrainementId_joueurId: { entrainementId, joueurId: p.joueurId } },
        create: { entrainementId, joueurId: p.joueurId, present: p.present, justifie: p.justifie },
        update: { present: p.present, justifie: p.justifie },
      }),
    ),
  );

  return listerPresences(entrainementId);
}
