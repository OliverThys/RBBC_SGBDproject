-- Contraintes d'intégrité, vues et trigger non exprimables directement
-- dans le schema.prisma (CHECK, VIEW, TRIGGER).

-- ─────────────────────────────────────────────
-- Contraintes CHECK
-- ─────────────────────────────────────────────

ALTER TABLE "joueur"
  ADD CONSTRAINT "chk_joueur_date_naissance" CHECK ("date_naissance" <= CURRENT_DATE);

ALTER TABLE "equipe"
  ADD CONSTRAINT "chk_equipe_saison" CHECK ("saison" ~ '^\d{4}-\d{4}$');

ALTER TABLE "rencontre"
  ADD CONSTRAINT "chk_rencontre_score_pas_de_nul"
  CHECK ("score_nous" IS NULL OR "score_adversaire" IS NULL OR "score_nous" <> "score_adversaire");

ALTER TABLE "presence"
  ADD CONSTRAINT "chk_presence_justifie" CHECK (NOT "justifie" OR NOT "present");

-- ─────────────────────────────────────────────
-- Vues
-- ─────────────────────────────────────────────

-- Classement au barème FIBA : victoire jouée = 2 pts, défaite jouée = 1 pt,
-- forfait de notre équipe = 0 pt, forfait de l'adversaire = victoire (2 pts).
CREATE VIEW "v_classement_equipes" AS
SELECT
  e."id" AS "equipe_id",
  e."nom" AS "equipe_nom",
  e."categorie",
  e."saison",
  COUNT(r."id") FILTER (WHERE r."statut" IN ('JOUEE', 'FORFAIT_NOUS', 'FORFAIT_ADVERSAIRE')) AS "matchs_joues",
  COUNT(r."id") FILTER (WHERE r."statut" = 'JOUEE' AND r."score_nous" > r."score_adversaire") AS "victoires",
  COUNT(r."id") FILTER (WHERE r."statut" = 'JOUEE' AND r."score_nous" < r."score_adversaire") AS "defaites",
  COUNT(r."id") FILTER (WHERE r."statut" = 'FORFAIT_NOUS') AS "forfaits_nous",
  COUNT(r."id") FILTER (WHERE r."statut" = 'FORFAIT_ADVERSAIRE') AS "forfaits_adversaire",
  COALESCE(SUM(
    CASE
      WHEN r."statut" = 'JOUEE' AND r."score_nous" > r."score_adversaire" THEN 2
      WHEN r."statut" = 'JOUEE' AND r."score_nous" < r."score_adversaire" THEN 1
      WHEN r."statut" = 'FORFAIT_ADVERSAIRE' THEN 2
      WHEN r."statut" = 'FORFAIT_NOUS' THEN 0
      ELSE 0
    END
  ), 0) AS "points"
FROM "equipe" e
LEFT JOIN "rencontre" r ON r."equipe_id" = e."id"
GROUP BY e."id", e."nom", e."categorie", e."saison";

-- Taux de présence par (joueur, équipe) - un joueur en double appartenance
-- a un taux distinct par équipe, pas agrégé.
CREATE VIEW "v_taux_presence" AS
SELECT
  je."joueur_id",
  je."equipe_id",
  COUNT(p."id") AS "seances_totales",
  COUNT(p."id") FILTER (WHERE p."present") AS "seances_presentes",
  ROUND(
    COUNT(p."id") FILTER (WHERE p."present")::numeric / NULLIF(COUNT(p."id"), 0) * 100,
    1
  ) AS "taux_presence_pct"
FROM "joueur_equipe" je
LEFT JOIN "entrainement" en ON en."equipe_id" = je."equipe_id"
LEFT JOIN "presence" p ON p."entrainement_id" = en."id" AND p."joueur_id" = je."joueur_id"
GROUP BY je."joueur_id", je."equipe_id";

-- Joueurs actifs par équipe (appartenance active, joueur actif, équipe active).
CREATE VIEW "v_joueurs_par_equipe" AS
SELECT
  je."equipe_id",
  e."nom" AS "equipe_nom",
  e."categorie",
  j."id" AS "joueur_id",
  j."nom" AS "joueur_nom",
  j."prenom" AS "joueur_prenom",
  je."numero_maillot"
FROM "joueur_equipe" je
JOIN "joueur" j ON j."id" = je."joueur_id" AND j."actif"
JOIN "equipe" e ON e."id" = je."equipe_id" AND e."actif"
WHERE je."actif";

-- ─────────────────────────────────────────────
-- Trigger d'audit des scores
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "fn_audit_rencontre"() RETURNS TRIGGER AS $$
BEGIN
  IF (NEW."score_nous" IS DISTINCT FROM OLD."score_nous")
     OR (NEW."score_adversaire" IS DISTINCT FROM OLD."score_adversaire") THEN
    INSERT INTO "audit_log" (
      "id", "rencontre_id",
      "ancien_score_nous", "ancien_score_adversaire",
      "nouveau_score_nous", "nouveau_score_adversaire",
      "modifie_le"
    ) VALUES (
      gen_random_uuid()::text, NEW."id",
      OLD."score_nous", OLD."score_adversaire",
      NEW."score_nous", NEW."score_adversaire",
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_audit_rencontre"
AFTER UPDATE ON "rencontre"
FOR EACH ROW
EXECUTE FUNCTION "fn_audit_rencontre"();
