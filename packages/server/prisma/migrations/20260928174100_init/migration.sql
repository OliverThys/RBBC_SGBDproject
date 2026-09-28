-- CreateEnum
CREATE TYPE "CodePermission" AS ENUM ('JOUEURS_LIRE', 'JOUEURS_ECRIRE', 'JOUEURS_SUPPRIMER', 'EQUIPES_LIRE', 'EQUIPES_ECRIRE', 'EQUIPES_SUPPRIMER', 'ENTRAINEMENTS_LIRE', 'ENTRAINEMENTS_ECRIRE', 'ENTRAINEMENTS_SUPPRIMER', 'PRESENCES_LIRE', 'PRESENCES_ECRIRE', 'RENCONTRES_LIRE', 'RENCONTRES_ECRIRE', 'RENCONTRES_SUPPRIMER', 'STAFF_LIRE', 'STAFF_ECRIRE', 'STAFF_SUPPRIMER', 'STATISTIQUES_LIRE', 'COTISATIONS_LIRE', 'COTISATIONS_ECRIRE', 'UTILISATEURS_LIRE', 'UTILISATEURS_ECRIRE', 'UTILISATEURS_SUPPRIMER', 'GROUPES_GERER', 'PERMISSIONS_GERER', 'IMPORT_CALENDRIER');

-- CreateEnum
CREATE TYPE "FonctionStaff" AS ENUM ('ENTRAINEUR', 'ASSISTANT', 'DELEGUE', 'KINE');

-- CreateEnum
CREATE TYPE "StatutRencontre" AS ENUM ('A_VENIR', 'JOUEE', 'FORFAIT_NOUS', 'FORFAIT_ADVERSAIRE');

-- CreateEnum
CREATE TYPE "StatutCotisation" AS ENUM ('NON_PAYE', 'PARTIEL', 'PAYE');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "mot_de_passe_hash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "code" "CodePermission" NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groupe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groupe_permission" (
    "id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "groupe_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateur_groupe" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,

    CONSTRAINT "utilisateur_groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateur_permission" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "expire_le" TIMESTAMP(3),

    CONSTRAINT "utilisateur_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "saison" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "joueur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "date_naissance" DATE NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "joueur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "joueur_equipe" (
    "id" TEXT NOT NULL,
    "joueur_id" TEXT NOT NULL,
    "equipe_id" TEXT NOT NULL,
    "numero_maillot" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "joueur_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "fonction" "FonctionStaff" NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_equipe" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "equipe_id" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrainement" (
    "id" TEXT NOT NULL,
    "equipe_id" TEXT NOT NULL,
    "date_heure" TIMESTAMP(3) NOT NULL,
    "duree_minutes" INTEGER NOT NULL,
    "lieu" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrainement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presence" (
    "id" TEXT NOT NULL,
    "entrainement_id" TEXT NOT NULL,
    "joueur_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "justifie" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rencontre" (
    "id" TEXT NOT NULL,
    "equipe_id" TEXT NOT NULL,
    "adversaire" TEXT NOT NULL,
    "domicile" BOOLEAN NOT NULL,
    "date_heure" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "score_nous" INTEGER,
    "score_adversaire" INTEGER,
    "statut" "StatutRencontre" NOT NULL DEFAULT 'A_VENIR',
    "numero_federation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rencontre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "rencontre_id" TEXT NOT NULL,
    "ancien_score_nous" INTEGER,
    "ancien_score_adversaire" INTEGER,
    "nouveau_score_nous" INTEGER,
    "nouveau_score_adversaire" INTEGER,
    "modifie_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_equipe_federation" (
    "id" TEXT NOT NULL,
    "nom_federation" TEXT NOT NULL,
    "equipe_id" TEXT NOT NULL,

    CONSTRAINT "mapping_equipe_federation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarif_cotisation" (
    "id" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "montant" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "tarif_cotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotisation" (
    "id" TEXT NOT NULL,
    "joueur_id" TEXT NOT NULL,
    "saison" TEXT NOT NULL,
    "montant_du" DECIMAL(8,2) NOT NULL,
    "montant_paye" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "statut" "StatutCotisation" NOT NULL DEFAULT 'NON_PAYE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_login_key" ON "utilisateur"("login");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "groupe_nom_key" ON "groupe"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "groupe_permission_groupe_id_permission_id_key" ON "groupe_permission"("groupe_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_groupe_utilisateur_id_groupe_id_key" ON "utilisateur_groupe"("utilisateur_id", "groupe_id");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_permission_utilisateur_id_permission_id_key" ON "utilisateur_permission"("utilisateur_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "joueur_equipe_equipe_id_numero_maillot_key" ON "joueur_equipe"("equipe_id", "numero_maillot");

-- CreateIndex
CREATE UNIQUE INDEX "staff_equipe_staff_id_equipe_id_key" ON "staff_equipe"("staff_id", "equipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "presence_entrainement_id_joueur_id_key" ON "presence"("entrainement_id", "joueur_id");

-- CreateIndex
CREATE UNIQUE INDEX "mapping_equipe_federation_nom_federation_key" ON "mapping_equipe_federation"("nom_federation");

-- CreateIndex
CREATE UNIQUE INDEX "tarif_cotisation_categorie_key" ON "tarif_cotisation"("categorie");

-- AddForeignKey
ALTER TABLE "groupe_permission" ADD CONSTRAINT "groupe_permission_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupe_permission" ADD CONSTRAINT "groupe_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateur_groupe" ADD CONSTRAINT "utilisateur_groupe_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateur_groupe" ADD CONSTRAINT "utilisateur_groupe_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateur_permission" ADD CONSTRAINT "utilisateur_permission_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateur_permission" ADD CONSTRAINT "utilisateur_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joueur_equipe" ADD CONSTRAINT "joueur_equipe_joueur_id_fkey" FOREIGN KEY ("joueur_id") REFERENCES "joueur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joueur_equipe" ADD CONSTRAINT "joueur_equipe_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_equipe" ADD CONSTRAINT "staff_equipe_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_equipe" ADD CONSTRAINT "staff_equipe_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrainement" ADD CONSTRAINT "entrainement_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence" ADD CONSTRAINT "presence_entrainement_id_fkey" FOREIGN KEY ("entrainement_id") REFERENCES "entrainement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence" ADD CONSTRAINT "presence_joueur_id_fkey" FOREIGN KEY ("joueur_id") REFERENCES "joueur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rencontre" ADD CONSTRAINT "rencontre_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_equipe_federation" ADD CONSTRAINT "mapping_equipe_federation_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisation" ADD CONSTRAINT "cotisation_joueur_id_fkey" FOREIGN KEY ("joueur_id") REFERENCES "joueur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
