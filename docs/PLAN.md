# Plan de développement - SaaS RBBC (Royal Blaregnies Basket Club)

> Plan dérivé de `cahier-des-charges.md`. Découpé en phases livrables et vérifiables.
> Chaque phase a un **objectif**, des **tâches**, et une **définition de terminé (DoD)**.
> Rien n'est codé tant que ce plan n'est pas validé.

---

## Notes de cadrage (déjà validées lors de la précédente tentative)

1. **Mot de passe : bcrypt** (décision validée). Le cahier des charges évoquait PBKDF2 pour compatibilité avec l'app Java, mais le projet part d'une base **vierge** (aucun hash à migrer depuis MariaDB). On retient donc **bcrypt**, standard de la stack, conforme au tableau technique. PBKDF2 abandonné.
2. **Critère qualité corrigé.** Le vrai critère : depuis un clone frais, **`docker compose up --build` démarre tout sans erreur** (pas de reliquat Java type `ant clean jar`).
3. **Tailwind CSS v4** : configuration via `@theme` dans le CSS (v4) plutôt que `tailwind.config.ts` classique. La charte graphique (couleurs, polices Oswald/Inter) sera traduite en variables CSS `@theme`.
4. **Pas de tests automatisés** au MVP, mais code structuré pour en accueillir (Router→Controller→Service, hooks isolés).
5. **Dark mode uniquement** ; le toggle est prévu dans le code mais désactivé.
6. **Sécurité (ajout revue sécurité, post-v1)** : CORS strict sur `CLIENT_URL`, cookie JWT `HttpOnly; Secure; SameSite=Strict`, rate limiting dédié sur `/auth/login` (brute-force) + rate limiting global API, validation taille/extension sur l'upload calendrier (parsing réussi plutôt que MIME strict, voir note 9), jamais de secret/token/stack trace dans les logs ou réponses d'erreur, `npm audit` propre à chaque phase livrée.
7. **Codes HTTP affinés (ajout bonnes pratiques API)** : 422 pour échec de validation Zod (distinct du 400 réservé au JSON malformé), 201 avec header `Location` sur les créations, format d'erreur `{ error: { code, message, details? } }`.
8. **Modèle multi-équipe (décision issue du cadrage métier).** Le cahier des charges initial avait un joueur → une équipe (avec transfert). Le club réel (~6-15 équipes, 15-40 utilisateurs) pratique le surclassement : un joueur peut être dans plusieurs équipes en même temps, de même pour le staff. **Changement de modèle de données** : `joueur` et `staff` n'ont plus de champ équipe direct ; deux tables de liaison `joueur_equipe` (avec numéro de maillot par appartenance) et `staff_equipe` les remplacent. Présences et statistiques sont calculées par (joueur, équipe), pas agrégées entre équipes.
9. **Format réel du fichier d'import fédération.** Vérifié sur un export réel (`data.xls` du club) : c'est un **tableau HTML** avec extension `.xls`, pas un binaire Excel. Colonnes réelles : `Serie, Num., Jour, Salle, Date, Heure, Visités, Score Home, Score Away, Visiteurs, Arbitres`. La lib `xlsx` (SheetJS) parse ce format nativement. Le mapping nom d'équipe fédération → équipe RBBC est **manuel à la première rencontre**, puis mémorisé (table `mapping_equipe_federation`). Seules les lignes où RBBC apparaît (domicile ou extérieur) sont importées.
10. **Pas de dashboard au MVP.** Après login, redirection directe vers le premier module accessible selon permissions (pas de page de synthèse/accueil dédiée).
11. **Reset mot de passe : géré par l'admin uniquement** (`PUT /utilisateurs/:id/password`), pas de flow self-service par email - évite de configurer un service d'envoi d'email pour le MVP.
12. **Permissions globales au club, confirmé** : pas de restriction par équipe assignée à un utilisateur (un entraîneur avec `ENTRAINEMENTS_ECRIRE` agit sur toutes les équipes).
13. **RGPD : hors scope pour l'instant**, pas de mécanisme dédié (consentement, export, anonymisation) au MVP.
14. **Sauvegardes PostgreSQL** : `pg_dump` planifié quotidiennement + copie vers un stockage externe au PC-serveur.
15. **Cotisations : tarif par catégorie dans une table dédiée** (`tarif_cotisation`), éditable par l'admin, appliqué par défaut à la création d'une cotisation.
16. **Historique Git : réel, pas de dates falsifiées.** Le v1 avait un historique de 8 commits avec des groupes committés à quelques secondes d'écart pour des phases entières - signe manifeste d'un historique reconstitué après coup plutôt que d'un vrai suivi de dev. Le v2 démarre un historique **authentique à partir d'aujourd'hui** : un commit par sous-tâche réellement terminée, à la date réelle du travail, poussé au fur et à mesure. Voir section dédiée « Conventions Git » ci-dessous.

---

## Phase 0 - Fondations du dépôt et infra

**Objectif :** un monorepo qui démarre proprement via Docker, BDD PostgreSQL accessible.

**Tâches :**
- Initialiser le repo Git + monorepo `rbbc-gestion/` (workspaces : `packages/client`, `packages/server`).
- `.gitignore` (node_modules, `.env`, dist, build), `.env.example`, `README.md`.
- `docker-compose.yml` : services `db` (postgres:16), `server`, `client` avec hot-reload (volumes `src`).
- `packages/server` : squelette Express + TypeScript strict + tsconfig + Dockerfile + nodemon/tsx.
- `packages/client` : squelette Vite + React 18 + TypeScript strict + Tailwind v4 + Dockerfile.
- Healthcheck : `GET /api/v1/health` renvoie `{ data: { status: 'ok' } }`.
- `cors` configuré strictement sur `CLIENT_URL` (`credentials: true`) dès le squelette Express.
- Script de sauvegarde `pg_dump` planifié (documenté dans `README.md`, pas nécessairement automatisé dès cette phase - voir Phase 9).

**DoD :** `docker compose up --build` depuis un clone frais → db up, API répond sur `:3001/api/v1/health`, client sert sur `:5173`. Zéro secret en clair.

---

## Phase 1 - Modèle de données Prisma (schéma + migrations + objets SQL)

**Objectif :** schéma PostgreSQL complet reproduisant et améliorant le modèle Java, avec contraintes, vues et triggers.

**Tâches :**
- `schema.prisma` - modèles métier : `utilisateur`, `equipe`, `joueur` (sans champ équipe/maillot), `staff` (sans champ équipe), `entrainement`, `presence`, `rencontre` (avec `statut` enum `A_VENIR/JOUEE/FORFAIT_NOUS/FORFAIT_ADVERSAIRE`).
- **Tables de liaison multi-équipe** : `joueur_equipe` (`idJoueur`, `idEquipe`, `numeroMaillot`, `actif`), `staff_equipe` (`idStaff`, `idEquipe`, `actif`).
- Modèles permissions : `groupe`, `permission`, `groupe_permission`, `utilisateur_groupe`, `utilisateur_permission` (`expireLe` nullable).
- Modèles : `cotisation`, `tarif_cotisation` (`categorie`, `montant`), `audit_log`, `mapping_equipe_federation` (`nomFederation`, `idEquipe`).
- Conventions : champs `camelCase` Prisma, `@map` vers snake_case en base.
- **Contraintes d'intégrité** (migrations SQL brutes via Prisma) :
  - `UNIQUE(idEquipe, numeroMaillot)` sur `joueur_equipe` (pas sur `joueur`).
  - CHECK saison `^\d{4}-\d{4}$`.
  - CHECK score : les deux scores ne peuvent être égaux.
  - CHECK date naissance ≤ aujourd'hui.
  - CHECK justifié seulement si absent.
- **Vues** : `v_classement_equipes` (barème FIBA V=2/D jouée=1/forfait=0, basé sur `rencontre.statut`), `v_taux_presence` (par joueur+équipe, NULLIF anti-division par zéro), `v_joueurs_par_equipe` (via `joueur_equipe`).
- **Trigger** : `trg_audit_rencontre` journalise toute modif de score dans `audit_log`.
- Migration initiale appliquée.

**DoD :** `prisma migrate dev` passe ; les vues et le trigger existent en base ; contraintes testées par insert invalide rejeté.

---

## Phase 2 - Seed

**Objectif :** base utilisable immédiatement après installation.

**Tâches :**
- Seed des **permissions** (liste exhaustive du cahier des charges).
- Seed des **groupes** : Administrateur (toutes), Gestionnaire (sauf UTILISATEURS_SUPPRIMER / PERMISSIONS_GERER / GROUPES_GERER), Entraîneur, Consultation (`*_LIRE`).
- Seed des **tarifs de cotisation** par catégorie.
- Compte **admin** depuis `.env` (login + mdp hachés bcrypt).
- Jeu de démo, cohérent avec le volume réel du club : ~8 équipes, une quinzaine de joueurs dont au moins un en double appartenance (`joueur_equipe`), quelques membres du staff dont un sur plusieurs équipes, quelques entraînements + présences, quelques rencontres (dont une avec score et une avec statut forfait).

**DoD :** `prisma db seed` crée l'admin + les groupes + la démo ; login admin possible après Phase 3.

---

## Phase 3 - Backend : Auth + middleware de permissions (cœur critique)

**Objectif :** authentification JWT httpOnly + moteur de permissions effectives (mini Active Directory).

**Tâches :**
- Hachage **bcrypt** (vérif + génération) dans `core/auth`.
- `POST /auth/login` (message générique anti-énumération + rate limiting `express-rate-limit` ~10 tentatives/15min/IP), `POST /auth/logout`, `GET /auth/me` (utilisateur + permissions effectives).
- JWT en cookie `HttpOnly; Secure; SameSite=Strict`, expiration 7j ; structure refresh prévue (non câblée).
- Rate limiting global sur `/api/v1/*` (ex. 100 req/min/IP) en plus de celui du login.
- Middleware `authGuard` (toutes routes sauf login).
- **Moteur de permissions effectives** : union (groupes + directes), **exclusion des permissions expirées au moment de la requête** (pas de cron).
- Middleware `requirePermission(PERMISSION)` réutilisable.
- Error handler global + réponses uniformes `{ data }` / `{ error: { message, code } }`.
- Config typée (`core/config.ts`) + validation des variables d'env.

**DoD :** login admin renvoie cookie + `/auth/me` liste les bonnes permissions ; une route protégée renvoie 401/403 correctement ; permission expirée ignorée.

---

## Phase 4 - Backend : modules métier

> Pattern strict `Router → Controller → Service → Prisma`, validation **Zod** dans le controller, permissions vérifiées par route.
> Ordre imposé par le cahier des charges.

**4.1 Joueurs** - CRUD joueur (sans champ équipe), soft delete, validation (tél belge, email) ; endpoints `joueurs/:id/equipes` (ajout/modif/retrait d'appartenance équipe avec numéro de maillot 0-99 unique par équipe).
**4.2 Équipes** - CRUD, `GET /equipes/:id/effectif` (jointure via `joueur_equipe`), validation saison `YYYY-YYYY`.
**4.3 Staff** - CRUD staff (sans champ équipe), fonction enum (ENTRAINEUR/ASSISTANT/DELEGUE/KINE) ; endpoints `staff/:id/equipes` (ajout/retrait d'équipe encadrée).
**4.4 Entraînements & Présences** - CRUD séances (durée 15-300), `GET/PUT /entrainements/:id/presences` (upsert en bloc), règle « justifié ⇒ absent ».
**4.5 Rencontres** - CRUD, `statut` (A_VENIR/JOUEE/FORFAIT_NOUS/FORFAIT_ADVERSAIRE), `POST /:id/score` (refus du nul, message clair), filtres `?mois=&annee=&equipe=`.
**4.6 Statistiques** - `classement` / `presences` / `bilan`, filtrables `?equipe=` (lecture des vues SQL, par équipe).
**4.7 Cotisations** - CRUD, statuts Non payé/Partiel/Payé, `tarifs-cotisation` CRUD (catégorie → montant), récap impayés.
**4.8 Utilisateurs & Groupes/Permissions** - CRUD utilisateurs (création admin uniquement), `PUT /utilisateurs/:id/password` (reset admin), `groupes` CRUD, `GET /permissions`, `PUT /utilisateurs/:id/groupes`, `PUT /utilisateurs/:id/permissions` (avec expiration), `GET /utilisateurs/:id/permissions/effectives`.

**DoD par sous-module :** endpoints conformes à la liste API du cahier des charges, codes HTTP corrects, permissions vérifiées côté serveur, validation Zod active.

---

## Phase 5 - Import Excel calendrier fédération

**Objectif :** import des rencontres depuis un `.xlsx`.

**Tâches :**
- `POST /rencontres/import/preview` puis `POST /rencontres/import` (multipart, permission `IMPORT_CALENDRIER`), parsing serveur avec `xlsx` (SheetJS gère nativement le format réel : tableau HTML avec extension `.xls`).
- Colonnes réelles à mapper : `Serie, Num., Jour, Salle, Date (DD/MM/YYYY), Heure (HH:MM), Visités, Score Home, Score Away, Visiteurs, Arbitres`.
- Validation de l'upload avant parsing : taille max (5 Mo), extension `.xls`/`.xlsx`, rejet si le parsing ne trouve aucune ligne exploitable.
- **Filtrage** : ne conserver que les lignes où RBBC apparaît en `Visités` ou `Visiteurs`.
- **Résolution du mapping équipe fédération → équipe RBBC** : lookup dans `mapping_equipe_federation` ; si absent, l'utilisateur choisit l'équipe RBBC correspondante à la prévisualisation et le mapping est enregistré pour la prochaine fois.
- Prévisualisation : tableau des matchs détectés avec équipe résolue, l'utilisateur valide ou annule.
- Import : création des `Rencontre` avec `statut = A_VENIR` si scores vides, `JOUEE` sinon.

**DoD :** upload d'un `data.xls` réel du club → filtrage correct (RBBC uniquement) → prévisualisation avec mapping équipe → validation crée les rencontres avec le bon statut.

---

## Phase 6 - Frontend : shell applicatif

**Objectif :** coquille SPA complète, charte graphique, auth guard.

**Tâches :**
- Tailwind v4 `@theme` : palette RBBC (`#d81e27`, `#d2691e`, `#1a1a2e`, surfaces `#252542`/`#303056`, success `#10b981`, etc.), polices Oswald/Rajdhani (titres/scores) + Inter (texte).
- `core/` : Layout, Sidebar (fixe desktop / icônes tablette / drawer mobile), Header, providers (Auth, Toast, Theme prévu).
- Routing React Router (zéro rechargement) + **AuthProvider** + route guard + redirection login.
- React Query configuré (staleTime 5 min pour vues SQL/données statiques).
- Page de **login** avec logo `rbbc_icon.jpg`.
- Pas de page dashboard/accueil dédiée : après login, redirection vers le premier module accessible selon permissions.
- Masquage/désactivation des actions selon permissions de l'utilisateur connecté.

**DoD :** login → redirection vers le premier module accessible ; navigation entre pages sans rechargement ; sidebar responsive aux 3 breakpoints.

---

## Phase 7 - Frontend : composants UI partagés (style sportif)

**Objectif :** bibliothèque de composants réutilisables conforme à la charte.

**Tâches :** `Button` (primary/secondary/danger/ghost, `hover:scale-105 active:scale-95`), `Input`/`Select`/`Checkbox`/`DatePicker`, `Table` (tri + filtre texte, lignes zébrées, en-têtes Oswald), `Modal`, `Toast` (auto-dismiss 4s), `Badge` (contours forts), `Card` (border-l-4 selon statut), `Spinner`/`Skeleton`, `SlidePanel` (détails sans rechargement).

**DoD :** chaque composant rendu et utilisable, conforme à la charte (angles `rounded-sm/md`, bordures d'accent, pas d'ombres diffuses).

---

## Phase 8 - Frontend : modules métier

> Même ordre que le backend. Chaque module : `components/ hooks/ services/ types.ts index.ts` + manifest sidebar. Tout passe par React Query (pas de `useEffect` de fetch).

**8.1 Joueurs** - liste + filtre équipe, formulaire joueur, gestion des appartenances équipe (ajout/retrait, maillot par équipe), maître-détail (équipes + présences + stats **par équipe**).
**8.2 Équipes** - liste + maître-détail (effectif via `joueur_equipe` + bouton "ajouter un joueur à l'équipe").
**8.3 Staff** - CRUD + gestion des appartenances équipe (multi-équipe).
**8.4 Entraînements & Présences** - calendrier hebdo statique (7 colonnes), CRUD séances, feuille de présence (présent/absent/justifié, sauvegarde en bloc).
**8.5 Rencontres & Calendrier** - vue mensuelle type Google Calendar, navigation mois, cartes colorées (gris/vert/rouge, statut forfait visible), `SlidePanel` détail + saisie score, écran d'import (upload → prévisualisation avec mapping équipe → validation).
**8.6 Statistiques** - classement (barème FIBA avec forfaits), taux de présence par équipe, bilan barres + courbe mensuelle (**Recharts**), données en cache.
**8.7 Cotisations** - suivi par joueur/saison, statuts, gestion des tarifs par catégorie, récap impayés / encaissé vs attendu.
**8.8 Administration permissions** - page `PERMISSIONS_GERER` : gestion groupes, assignation groupes/permissions directes (+ expiration), vue **« permissions effectives »** par utilisateur (source + expiration).

**DoD par module :** confirmation Modal sur actions destructives, formulaires conservant leur état en cas d'erreur API, actions masquées selon permissions, error boundary par module.

---

## Phase 9 - Polish & robustesse

**Objectif :** finition.

**Tâches :** error boundary par module, skeleton loaders, animations/transitions, vérif responsive (mobile/tablette/desktop), états vides, messages d'erreur clairs, relecture sécurité complète (checklist sécurité : permissions serveur sur toutes les routes, zéro secret en clair, `npm audit` propre, CORS strict, rate limiting actif, aucune donnée sensible dans les logs, aucune stack trace exposée au client), mise en place effective du `pg_dump` planifié + test de restauration.

**DoD :** application fluide, aucun rechargement, un module qui plante n'abat pas l'app, clone frais → `docker compose up --build` OK.

---

## Récapitulatif de l'ordre

| Phase | Contenu | Dépend de |
|------|---------|-----------|
| 0 | Monorepo + Docker + PostgreSQL | - |
| 1 | Prisma : schéma, contraintes, vues, triggers | 0 |
| 2 | Seed (permissions, groupes, admin, démo) | 1 |
| 3 | Auth + moteur de permissions | 2 |
| 4 | Modules métier backend (8 sous-modules) | 3 |
| 5 | Import Excel calendrier | 4.5 |
| 6 | Shell frontend (layout, charte, auth) | 3 |
| 7 | Composants UI partagés | 6 |
| 8 | Modules métier frontend (8 sous-modules) | 4, 7 |
| 9 | Polish & robustesse | 8 |

---

## Conventions Git & historique

**Objectif :** un historique lisible pour une soutenance/présentation, qui reflète honnêtement le vrai déroulé du travail - pas un historique reconstitué après coup.

### Identité des commits
- `git config user.name` / `user.email` réglés sur ton identité réelle (GitHub `OliverThys`) dès l'initialisation du repo - jamais de compte générique.
- Pas de ligne `Co-Authored-By` dans les messages de commit.

### Granularité
- **Un commit par sous-tâche réellement terminée et fonctionnelle**, pas un commit par phase entière. Une phase du plan (ex. Phase 4 - modules métier backend) donne naturellement plusieurs commits (un par sous-module 4.1, 4.2, etc.), pas un seul commit fourre-tout à la fin.
- Un commit doit laisser le repo dans un état cohérent (ça compile, ça démarre) - pas de commit "WIP cassé" sur la branche principale.
- Taille raisonnable : si un commit touche 40 fichiers et 3 modules différents sans lien logique, c'est probablement plusieurs commits déguisés en un seul.

### Messages de commit - Conventional Commits
```
<type>(<scope>): <description courte en français>

[corps optionnel : pourquoi, pas quoi]
```
Types : `feat` (nouvelle fonctionnalité), `fix` (correction), `chore` (config, dépendances), `docs` (documentation), `refactor`, `style` (formatage, pas de changement de comportement).

Exemples réalistes (pas un par phase, plusieurs par sous-tâche) :
```
feat(server): squelette Express + TypeScript strict + healthcheck
chore(infra): docker-compose db/server/client avec hot-reload
feat(db): schéma Prisma - utilisateur, equipe, joueur, staff
feat(db): tables de liaison joueur_equipe et staff_equipe (multi-équipe)
feat(db): vues SQL classement FIBA et taux de présence
feat(auth): login JWT httpOnly + bcrypt + rate limiting
feat(auth): moteur de permissions effectives (groupes + directes)
feat(joueurs): CRUD backend + endpoints appartenance équipe
fix(joueurs): validation téléphone belge rejetait les numéros mobiles
feat(client): shell SPA - sidebar, routing, auth guard
feat(client): composants partagés Button/Table/Modal/SlidePanel
feat(rencontres): import calendrier fédération avec mapping équipe
```

### Rythme et dates
- **Dates réelles uniquement.** On commit/pousse à la date où le travail a effectivement eu lieu - jamais de `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` forcés pour simuler un étalement dans le temps.
- Push vers GitHub à la fin de chaque session de travail (pas seulement des commits locaux qui restent invisibles côté remote) - c'est ce qui rend l'historique vérifiable, pas juste les dates de commit.
- Un historique court mais dense et réel (plusieurs vraies séances sur quelques semaines) est plus crédible et plus défendable en soutenance qu'un historique long mais artificiellement lissé.

### Branches
- `master`/`main` toujours dans un état qui build (`docker compose up --build` fonctionne).
- Pour une fonctionnalité un peu risquée ou longue, une branche `feat/xxx` mergée une fois stable - optionnel au MVP vu la taille du projet, mais utile à mentionner en soutenance si le temps le permet.

---

## Hors scope MVP (rappel)

SSR/Next.js · WebSocket · paiements en ligne · page vitrine · i18n · PWA · tests automatisés · tâches récurrentes auto · light mode actif · CI/CD GitHub Actions.
