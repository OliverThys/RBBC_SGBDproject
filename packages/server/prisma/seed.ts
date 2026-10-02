import { CodePermission, FonctionStaff, Prisma, PrismaClient, StatutRencontre } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const SAISON = '2026-2027';

// ─────────────────────────────────────────────
// Permissions & groupes
// ─────────────────────────────────────────────

const TOUTES_PERMISSIONS = Object.values(CodePermission);

const SAUF_GESTIONNAIRE: CodePermission[] = [
  CodePermission.UTILISATEURS_SUPPRIMER,
  CodePermission.PERMISSIONS_GERER,
  CodePermission.GROUPES_GERER,
];

const GROUPES: Record<string, CodePermission[]> = {
  Administrateur: TOUTES_PERMISSIONS,
  Gestionnaire: TOUTES_PERMISSIONS.filter((p) => !SAUF_GESTIONNAIRE.includes(p)),
  Entraîneur: [
    CodePermission.JOUEURS_LIRE,
    CodePermission.EQUIPES_LIRE,
    CodePermission.ENTRAINEMENTS_LIRE,
    CodePermission.ENTRAINEMENTS_ECRIRE,
    CodePermission.ENTRAINEMENTS_SUPPRIMER,
    CodePermission.PRESENCES_LIRE,
    CodePermission.PRESENCES_ECRIRE,
    CodePermission.RENCONTRES_LIRE,
    CodePermission.STATISTIQUES_LIRE,
  ],
  Consultation: TOUTES_PERMISSIONS.filter((p) => p.endsWith('_LIRE')),
};

async function seedPermissionsEtGroupes() {
  const permissions = new Map<CodePermission, string>();
  for (const code of TOUTES_PERMISSIONS) {
    const p = await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
    permissions.set(code, p.id);
  }

  const groupes = new Map<string, string>();
  for (const [nom, codes] of Object.entries(GROUPES)) {
    const groupe = await prisma.groupe.upsert({ where: { nom }, update: {}, create: { nom } });
    groupes.set(nom, groupe.id);
    await prisma.groupePermission.createMany({
      data: codes.map((code) => ({ groupeId: groupe.id, permissionId: permissions.get(code)! })),
      skipDuplicates: true,
    });
  }
  return groupes;
}

// ─────────────────────────────────────────────
// Tarifs de cotisation (par catégorie)
// ─────────────────────────────────────────────

const TARIFS: Record<string, number> = {
  U10: 120,
  U12: 130,
  U14: 140,
  U16: 150,
  U18: 160,
  Seniors: 200,
  Dames: 180,
};

async function seedTarifs() {
  for (const [categorie, montant] of Object.entries(TARIFS)) {
    await prisma.tarifCotisation.upsert({
      where: { categorie },
      update: {},
      create: { categorie, montant },
    });
  }
}

// ─────────────────────────────────────────────
// Compte administrateur (depuis .env)
// ─────────────────────────────────────────────

async function seedAdmin(groupeAdminId: string) {
  const login = process.env.ADMIN_LOGIN;
  const motDePasse = process.env.ADMIN_PASSWORD;
  if (!login || !motDePasse) {
    throw new Error('ADMIN_LOGIN et ADMIN_PASSWORD doivent être définis dans .env');
  }

  const existant = await prisma.utilisateur.findUnique({ where: { login } });
  // Le mot de passe d'un admin existant n'est jamais écrasé par un re-seed.
  const admin =
    existant ??
    (await prisma.utilisateur.create({
      data: {
        login,
        motDePasseHash: await bcrypt.hash(motDePasse, BCRYPT_ROUNDS),
        nom: 'Administrateur',
        prenom: 'RBBC',
        email: process.env.ADMIN_EMAIL ?? 'admin@rbbc.local',
      },
    }));

  await prisma.utilisateurGroupe.upsert({
    where: { utilisateurId_groupeId: { utilisateurId: admin.id, groupeId: groupeAdminId } },
    update: {},
    create: { utilisateurId: admin.id, groupeId: groupeAdminId },
  });
}

// ─────────────────────────────────────────────
// Jeu de démo
// ─────────────────────────────────────────────

const EQUIPES = [
  { nom: 'U10 Mixte', categorie: 'U10' },
  { nom: 'U12 Garçons', categorie: 'U12' },
  { nom: 'U14 Garçons', categorie: 'U14' },
  { nom: 'U16 Garçons', categorie: 'U16' },
  { nom: 'U18 Garçons', categorie: 'U18' },
  { nom: 'Seniors A', categorie: 'Seniors' },
  { nom: 'Seniors B', categorie: 'Seniors' },
  { nom: 'Dames', categorie: 'Dames' },
];

// [nom, prénom, naissance, [équipe, maillot][]]
// Léo Peeters (U18) est surclassé : il joue aussi en Seniors B.
const JOUEURS: [string, string, string, [string, number][]][] = [
  ['Dubois', 'Lucas', '2016-03-12', [['U10 Mixte', 4]]],
  ['Martin', 'Emma', '2016-07-30', [['U10 Mixte', 7]]],
  ['Lambert', 'Noah', '2014-01-18', [['U12 Garçons', 5]]],
  ['Janssens', 'Théo', '2014-09-02', [['U12 Garçons', 8]]],
  ['Maes', 'Arthur', '2012-05-21', [['U14 Garçons', 6]]],
  ['Claes', 'Hugo', '2012-11-09', [['U14 Garçons', 10]]],
  ['Willems', 'Nathan', '2010-02-14', [['U16 Garçons', 9]]],
  ['Jacobs', 'Ethan', '2010-08-27', [['U16 Garçons', 11]]],
  ['Peeters', 'Léo', '2008-04-03', [['U18 Garçons', 7], ['Seniors B', 17]]],
  ['Mertens', 'Gabriel', '2008-10-16', [['U18 Garçons', 12]]],
  ['Goossens', 'Maxime', '2000-06-25', [['Seniors A', 4]]],
  ['Pauwels', 'Julien', '1998-12-08', [['Seniors A', 8]]],
  ['Wouters', 'Antoine', '1995-03-19', [['Seniors B', 5]]],
  ['Hermans', 'Sarah', '2001-01-11', [['Dames', 6]]],
  ['Dupont', 'Chloé', '1999-09-23', [['Dames', 10]]],
  ['Renard', 'Camille', '2002-05-05', [['Dames', 14]]],
];

// [nom, prénom, fonction, équipes encadrées]
// Marc Vandenberghe encadre deux équipes à la fois.
const STAFF: [string, string, FonctionStaff, string[]][] = [
  ['Vandenberghe', 'Marc', FonctionStaff.ENTRAINEUR, ['U14 Garçons', 'U16 Garçons']],
  ['Lemaire', 'Sophie', FonctionStaff.ENTRAINEUR, ['Dames']],
  ['Declercq', 'Pierre', FonctionStaff.ENTRAINEUR, ['Seniors A']],
  ['Michiels', 'Karim', FonctionStaff.ASSISTANT, ['Seniors A']],
  ['Verhaegen', 'Anne', FonctionStaff.DELEGUE, ['U10 Mixte']],
];

function joursDepuisAujourdhui(jours: number, heure: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(heure, 0, 0, 0);
  return d;
}

async function seedDemo() {
  // Le jeu de démo n'est créé qu'une seule fois (base vierge).
  if ((await prisma.equipe.count()) > 0) {
    console.log('Données de démo déjà présentes - ignorées.');
    return;
  }

  const equipes = new Map<string, string>();
  for (const e of EQUIPES) {
    const equipe = await prisma.equipe.create({ data: { ...e, saison: SAISON } });
    equipes.set(e.nom, equipe.id);
  }

  const joueursParEquipe = new Map<string, string[]>();
  const joueursIds: { id: string; categorie: string }[] = [];
  for (const [nom, prenom, naissance, appartenances] of JOUEURS) {
    const joueur = await prisma.joueur.create({
      data: {
        nom,
        prenom,
        dateNaissance: new Date(naissance),
        equipes: {
          create: appartenances.map(([equipe, numeroMaillot]) => ({
            equipeId: equipes.get(equipe)!,
            numeroMaillot,
          })),
        },
      },
    });
    const [premiereEquipe] = appartenances[0]!;
    joueursIds.push({
      id: joueur.id,
      categorie: EQUIPES.find((e) => e.nom === premiereEquipe)!.categorie,
    });
    for (const [equipe] of appartenances) {
      joueursParEquipe.set(equipe, [...(joueursParEquipe.get(equipe) ?? []), joueur.id]);
    }
  }

  for (const [nom, prenom, fonction, encadre] of STAFF) {
    await prisma.staff.create({
      data: {
        nom,
        prenom,
        fonction,
        equipes: { create: encadre.map((e) => ({ equipeId: equipes.get(e)! })) },
      },
    });
  }

  // Entraînements passés (avec présences) et à venir, pour trois équipes.
  const entrainements: [string, number, number, string][] = [
    ['Seniors A', -9, 20, 'Salle omnisports de Blaregnies'],
    ['Seniors A', -2, 20, 'Salle omnisports de Blaregnies'],
    ['Seniors A', 5, 20, 'Salle omnisports de Blaregnies'],
    ['Dames', -7, 19, 'Salle omnisports de Blaregnies'],
    ['Dames', 0, 19, 'Salle omnisports de Blaregnies'],
    ['U16 Garçons', -4, 18, 'Hall des sports de Quévy'],
  ];
  for (const [equipe, decalage, heure, lieu] of entrainements) {
    const joueurs = joueursParEquipe.get(equipe) ?? [];
    const passe = decalage < 0;
    await prisma.entrainement.create({
      data: {
        equipeId: equipes.get(equipe)!,
        dateHeure: joursDepuisAujourdhui(decalage, heure),
        dureeMinutes: 90,
        lieu,
        presences: passe
          ? {
              // Un joueur sur quatre est absent, dont un absent justifié sur deux.
              create: joueurs.map((joueurId, i) => {
                const absent = i % 4 === 3;
                return { joueurId, present: !absent, justifie: absent && i % 8 === 3 };
              }),
            }
          : undefined,
      },
    });
  }

  // Rencontres : une jouée avec score, un forfait, des matchs à venir.
  const rencontres: Prisma.RencontreUncheckedCreateInput[] = [
    {
      equipeId: equipes.get('Seniors A')!,
      adversaire: 'BC Mons-Hainaut',
      domicile: true,
      dateHeure: joursDepuisAujourdhui(-8, 20),
      lieu: 'Salle omnisports de Blaregnies',
      scoreNous: 78,
      scoreAdversaire: 71,
      statut: StatutRencontre.JOUEE,
    },
    {
      equipeId: equipes.get('Dames')!,
      adversaire: 'Dames Quiévrain BC',
      domicile: false,
      dateHeure: joursDepuisAujourdhui(-6, 15),
      lieu: 'Hall des sports de Quiévrain',
      statut: StatutRencontre.FORFAIT_ADVERSAIRE,
    },
    {
      equipeId: equipes.get('U16 Garçons')!,
      adversaire: 'Pâturages BBC',
      domicile: false,
      dateHeure: joursDepuisAujourdhui(-3, 14),
      lieu: 'Salle de Pâturages',
      scoreNous: 54,
      scoreAdversaire: 62,
      statut: StatutRencontre.JOUEE,
    },
    {
      equipeId: equipes.get('Seniors A')!,
      adversaire: 'Dour Basket',
      domicile: false,
      dateHeure: joursDepuisAujourdhui(6, 20),
      lieu: 'Salle de Dour',
    },
    {
      equipeId: equipes.get('U18 Garçons')!,
      adversaire: 'Frameries BC',
      domicile: true,
      dateHeure: joursDepuisAujourdhui(9, 16),
      lieu: 'Salle omnisports de Blaregnies',
    },
  ];
  for (const data of rencontres) {
    await prisma.rencontre.create({ data });
  }

  // Cotisations : montant du = tarif de la catégorie du joueur.
  const statuts = [
    { paye: 1, statut: 'PAYE' },
    { paye: 0.5, statut: 'PARTIEL' },
    { paye: 0, statut: 'NON_PAYE' },
  ] as const;
  for (const [i, { id, categorie }] of joueursIds.entries()) {
    const du = TARIFS[categorie]!;
    const { paye, statut } = statuts[i % statuts.length]!;
    await prisma.cotisation.create({
      data: { joueurId: id, saison: SAISON, montantDu: du, montantPaye: du * paye, statut },
    });
  }
}

async function main() {
  const groupes = await seedPermissionsEtGroupes();
  await seedTarifs();
  await seedAdmin(groupes.get('Administrateur')!);
  await seedDemo();
  console.log('Seed terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
