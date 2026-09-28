# Cahier des charges - Développement SaaS RBBC (Royal Blaregnies Basket Club)

## Contexte du projet

Tu vas développer une application web SaaS de gestion complète pour un club de basket belge : le **Royal Blaregnies Basket Club (RBBC)**. C'est un projet de fin d'études (dernière année informatique) qui sera mis en production réelle.

L'application est un outil de gestion interne **mono-club**, accessible uniquement aux membres autorisés. Elle remplace une application desktop Java/JavaFX existante en apportant : accès web, temps réel, gestion fine des permissions, et une expérience utilisateur moderne.

L'application tourne en local sur un PC faisant office de serveur (Docker), exposée via Cloudflare Tunnel sur un sous-domaine de rbbc.be (ex. `gestion.rbbc.be`). La zone DNS de `rbbc.be` est gérée chez OVH ; le domaine racine reste sur GitHub Pages (site vitrine existant), un seul enregistrement CNAME supplémentaire suffit pour le sous-domaine de gestion, sans toucher au reste. La migration vers un VPS est prévue plus tard - l'architecture doit le permettre sans friction.

**Volumétrie réelle du club :** ~6 à 15 équipes/catégories, 15 à 40 utilisateurs (entraîneurs, staff, administration). Un même entraîneur ou membre du staff encadre fréquemment plusieurs équipes à la fois - voir modèle de données multi-équipe ci-dessous.

**Transition depuis l'app Java :** coupure nette à la mise en production du SaaS (pas de cohabitation prolongée). Pas de migration automatisée des données existantes : à la bascule, l'admin ressaisit joueurs/équipes/staff via l'interface (volume raisonnable, pas de script de migration MariaDB à écrire).

---

## Stack technique - Non négociable

| Couche | Technologie |
|--------|------------|
| Frontend | React 18+, TypeScript strict, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express, TypeScript strict |
| BDD | PostgreSQL 16, Prisma ORM |
| Auth | JWT (httpOnly cookie), bcrypt |
| Validation | Zod (côté serveur) |
| Sécurité | `express-rate-limit`, `cors` (config stricte) |
| Infra | Docker, docker-compose |
| Versioning | GitHub (monorepo) |

**Aucune alternative à ces choix.** Ne pas proposer Next.js, NestJS, FXML, ou autre substitut non listé.

---

## Architecture du monorepo

```
rbbc-gestion/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── packages/
│   ├── client/                  # React SPA
│   │   ├── src/
│   │   │   ├── core/            # Layout, auth, routing, thème, providers
│   │   │   ├── modules/         # Un dossier par module métier
│   │   │   ├── shared/          # Composants UI réutilisables
│   │   │   └── types/
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── server/                  # API REST Express
│       ├── src/
│       │   ├── core/            # Auth middleware, error handler, config
│       │   ├── modules/         # Un dossier par domaine métier
│       │   └── shared/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── Dockerfile
│       └── package.json
```

### Règles d'architecture

- Pattern backend strict : `Router → Controller → Service → Prisma`
- Chaque module frontend : `components/`, `hooks/`, `services/`, `types.ts`, `index.ts`
- Pas de prop drilling au-delà de 2 niveaux → Context ou composition
- SPA stricte : **zéro rechargement de page**, navigation via React Router, transitions fluides
- Réponses API uniformes : `{ data: ... }` succès, `{ error: { code, message, details? } }` erreur (`details` = tableau `{ field, message }` pour les erreurs de validation Zod)
- Codes HTTP corrects : 200 (GET/PUT ok), 201 (POST création, header `Location`), 204 (DELETE), 400 (JSON malformé), 401 (non authentifié), 403 (permission refusée), 404, 409 (conflit, ex. maillot déjà pris), 422 (validation Zod échouée), 500 (erreur serveur générique, jamais de détail interne exposé)

---

## Système de permissions (priorité absolue)

C'est la fonctionnalité la plus critique. Tu dois implémenter un **mini Active Directory** gérable depuis l'interface d'administration.

### Modèle de permissions

```
Utilisateur → appartient à N Groupes → chaque Groupe a N Permissions
Utilisateur → peut avoir des Permissions directes (override groupe)
Chaque Permission (groupe ou directe) peut avoir une date d'expiration (nullable)
```

### Permissions granulaires (liste exhaustive)

```
JOUEURS_LIRE, JOUEURS_ECRIRE, JOUEURS_SUPPRIMER
EQUIPES_LIRE, EQUIPES_ECRIRE, EQUIPES_SUPPRIMER
ENTRAINEMENTS_LIRE, ENTRAINEMENTS_ECRIRE, ENTRAINEMENTS_SUPPRIMER
PRESENCES_LIRE, PRESENCES_ECRIRE
RENCONTRES_LIRE, RENCONTRES_ECRIRE, RENCONTRES_SUPPRIMER
STAFF_LIRE, STAFF_ECRIRE, STAFF_SUPPRIMER
STATISTIQUES_LIRE
COTISATIONS_LIRE, COTISATIONS_ECRIRE
UTILISATEURS_LIRE, UTILISATEURS_ECRIRE, UTILISATEURS_SUPPRIMER
GROUPES_GERER
PERMISSIONS_GERER      ← admin uniquement
IMPORT_CALENDRIER
```

### Groupes prédéfinis (seed)

| Groupe | Permissions incluses |
|--------|---------------------|
| Administrateur | Toutes |
| Gestionnaire | Tout sauf UTILISATEURS_SUPPRIMER, PERMISSIONS_GERER, GROUPES_GERER |
| Entraîneur | JOUEURS_LIRE, EQUIPES_LIRE, ENTRAINEMENTS_*, PRESENCES_*, RENCONTRES_LIRE, STATISTIQUES_LIRE |
| Consultation | Toutes les permissions *_LIRE uniquement |

### Interface d'administration des permissions

- Page dédiée accessible uniquement aux utilisateurs avec `PERMISSIONS_GERER`
- Gestion des groupes : créer, renommer, modifier les permissions du groupe, supprimer
- Gestion des utilisateurs : assigner/retirer des groupes, ajouter des permissions directes avec ou sans date d'expiration
- Vue "Permissions effectives" par utilisateur : liste toutes ses permissions réelles (union groupe + directes), avec source (quel groupe ou "direct") et expiration si applicable
- Permissions expirées retirées automatiquement à chaque vérification (pas de cron nécessaire - vérification au moment de la requête)

---

## Modules métier

### 1. Joueurs

> **Modèle multi-équipe** : un joueur peut appartenir à **plusieurs équipes simultanément** (ex. surclassement U18 → Seniors). L'appartenance à une équipe est une entité à part entière (`JoueurEquipe`), pas un simple champ sur le joueur.

- CRUD du joueur (nom, prénom, date naissance, email, téléphone format belge, actif) - **sans champ équipe ni numéro de maillot directement sur le joueur**
- Gestion des appartenances équipe : ajouter/retirer une équipe pour un joueur, avec un **numéro de maillot propre à chaque appartenance** (0-99, unique par équipe) et un statut actif/inactif par appartenance
- Filtre par équipe (liste des joueurs d'une équipe donnée)
- Vue maître-détail : sélectionner un joueur affiche la liste de ses équipes (avec maillot par équipe), ses présences et statistiques **par équipe**
- Pas de notion de "transfert" au sens strict - un changement d'équipe se fait en désactivant l'appartenance à l'ancienne équipe et en créant une nouvelle appartenance

### 2. Équipes
- CRUD (nom, catégorie, saison format `YYYY-YYYY`, actif)
- Vue maître-détail : affiche l'effectif complet (joueurs actifs dans cette équipe, avec leur numéro de maillot pour cette équipe) + bouton "ajouter un joueur à l'équipe" (recherche d'un joueur existant ou création)

### 3. Entraînements & Présences
- Calendrier **hebdomadaire statique** : la semaine en cours, 7 colonnes, les séances apparaissent dans leur jour
- CRUD des séances (date-heure, durée 15-300 min, équipe, lieu)
- Feuille de présence par séance : tableau joueurs de l'équipe, checkbox présent/absent, checkbox justifié (seulement si absent), sauvegarde en bloc
- Règle métier : justifié implique absent - refusé sinon

### 4. Rencontres & Calendrier

**Import calendrier fédération - format réel confirmé :**

Le fichier exporté par le site de la fédération a l'extension `.xls` mais c'est en réalité un **tableau HTML** (pratique courante des exports de fédérations sportives), pas un binaire Excel. La lib `xlsx` (SheetJS) le détecte et le parse correctement sans traitement spécial. Colonnes réelles observées :

```
Serie       - nom de la poule/division (ex. "CH Hommes - Poule L")
Num.        - identifiant de match fédération (ex. "HA212001")
Jour        - numéro de journée dans la poule
Salle       - lieu de la rencontre
Date        - format DD/MM/YYYY
Heure       - format HH:MM
Visités     - équipe domicile (nom complet fédération, ex. "P2H Royal Blaregnies BC A")
Score Home  - vide si match à venir
Score Away  - vide si match à venir
Visiteurs   - équipe extérieur (nom complet fédération)
Arbitres    - souvent vide
```

- Bouton "Importer calendrier" (permission `IMPORT_CALENDRIER`)
- Upload envoyé au backend ; accepter `.xls` (HTML table) et `.xlsx` réel - validation par contenu (parsing réussi), pas seulement par extension
- **Filtrage à l'import** : ne garder que les lignes où RBBC apparaît en `Visités` ou `Visiteurs` (le fichier peut contenir toute la poule)
- **Mapping équipe manuel** : les noms d'équipe fédération (ex. "P2H Royal Blaregnies BC A") ne correspondent pas directement aux équipes de l'app (ex. "Seniors A"). À la prévisualisation, l'utilisateur associe chaque nom fédération détecté à une équipe RBBC existante via un menu déroulant. **Ce mapping est mémorisé** (table `mapping_equipe_federation`) pour ne plus être redemandé lors des imports suivants pour la même équipe.
- Prévisualisation avant import : tableau des matchs détectés (avec mapping équipe résolu), l'utilisateur valide ou annule
- Import : crée les `Rencontre` sans score si `Score Home`/`Score Away` vides (match à venir), avec score sinon

**Calendrier interactif des rencontres :**
- Vue mensuelle (type Google Calendar) - navigation mois précédent/suivant
- Chaque rencontre = carte cliquable dans le calendrier
- Clic sur une rencontre → panneau latéral (pas de rechargement) : détails + formulaire de saisie du score si la rencontre est passée
- Enregistrement du score via la procédure PostgreSQL équivalente (refus du nul, message clair)
- Couleur différente : match à venir (gris), victoire (vert club), défaite (rouge club), match nul impossible

### 5. Staff

> Même modèle multi-équipe que les joueurs : un membre du staff peut encadrer plusieurs équipes (vivier d'entraîneurs limité dans un club de 6-15 équipes).

- CRUD de la personne (nom, prénom, fonction : ENTRAINEUR/ASSISTANT/DELEGUE/KINE, email, téléphone, actif) - sans champ équipe direct
- Gestion des appartenances équipe (`StaffEquipe`) : ajouter/retirer une équipe encadrée par ce membre du staff

### 6. Statistiques & Classement (lecture seule)
- Classement des équipes au barème FIBA (Victoire=2pts, Défaite jouée=1pt, Forfait=0pt) - vue PostgreSQL. Le statut `Forfait` est porté par un champ dédié sur `Rencontre` (voir modèle de données), distinct d'une défaite jouée, pour que le barème s'applique correctement.
- Taux de présence par (joueur, équipe) sur la saison en cours - vue PostgreSQL. **Calculé par équipe, pas agrégé entre les équipes d'un même joueur** (un joueur en double appartenance a un taux distinct par équipe).
- Bilan victoires/défaites par équipe - graphique en barres (Recharts)
- Courbe d'évolution du taux de présence mensuel (par équipe) - graphique linéaire (Recharts)
- Saison en cours uniquement au MVP (pas de sélecteur multi-saison ; les données historiques restent en base pour plus tard)
- **Uniquement des graphiques utiles à la gestion**, pas de gadgets

### 7. Cotisations
- Suivi des paiements par joueur et par saison (encaissement réel principalement par virement bancaire, pointé manuellement - pas de paiement en ligne)
- Statuts : Non payé / Partiel / Payé
- **Tarifs par catégorie** : table éditable par l'admin (`TarifCotisation` : catégorie → montant), appliquée par défaut à la création d'une cotisation pour un joueur de cette catégorie (modifiable au cas par cas)
- Vue récapitulative : liste des impayés + total encaissé vs attendu

### 8. Utilisateurs & Permissions
- CRUD des comptes utilisateurs (login, nom, prénom, email, actif) - **création exclusivement par l'admin**, pas d'auto-inscription
- Mot de passe haché en **bcrypt** (standard de la stack - voir note de cadrage dans PLAN.md)
- **Mot de passe oublié** : pas de flow self-service par email au MVP - l'admin réinitialise le mot de passe d'un utilisateur depuis l'interface (`PUT /utilisateurs/:id/password`, permission `UTILISATEURS_ECRIRE`), un mot de passe temporaire est généré et communiqué hors-ligne
- Interface de gestion des groupes et permissions (voir section dédiée ci-dessus) - **permissions globales au club**, pas de restriction par équipe assignée (décision validée : un entraîneur avec `ENTRAINEMENTS_ECRIRE` gère les entraînements de toutes les équipes, pas seulement les siennes)
- Compte admin créé via seed (email + mdp dans `.env`)

---

## Base de données PostgreSQL

### Migration depuis l'existant

Le projet part d'un schéma **vierge** (pas de migration automatisée depuis MariaDB - coupure nette, ressaisie manuelle des données à la bascule). Le schéma Prisma reproduit et améliore le modèle de données de l'app Java, avec le **modèle multi-équipe** comme évolution majeure.

**Tables cœur métier :**
- `utilisateur`, `equipe`, `joueur` (sans champ équipe/maillot direct), `staff` (sans champ équipe direct), `entrainement` (liée à une équipe), `presence`, `rencontre`

**Tables de liaison multi-équipe (nouvelles vs. app Java) :**
- `joueur_equipe` - appartenance joueur↔équipe : `idJoueur`, `idEquipe`, `numeroMaillot` (0-99), `actif`, dates. **Remplace le champ équipe + numéro de maillot autrefois sur `joueur`.**
- `staff_equipe` - appartenance staff↔équipe : `idStaff`, `idEquipe`, `actif`

**Tables permissions :** `groupe`, `permission`, `groupe_permission`, `utilisateur_groupe`, `utilisateur_permission` (avec `expire_le` nullable)

**Autres tables :** `cotisation`, `tarif_cotisation` (catégorie → montant, éditable admin), `audit_log`, `mapping_equipe_federation` (nom fédération détecté à l'import → `idEquipe`, mémorisé pour les imports suivants)

**Contraintes d'intégrité :**
- Numéro de maillot unique par équipe, porté par la liaison (`UNIQUE(id_equipe, numero_maillot)` sur `joueur_equipe`, pas sur `joueur`)
- Saison format `YYYY-YYYY` (CHECK ou validation Prisma)
- Score : impossible que les deux scores soient égaux (CHECK PostgreSQL)
- Date de naissance : ne peut pas être dans le futur (CHECK PostgreSQL)
- Justifié seulement si absent (CHECK PostgreSQL)
- `rencontre.statut` : enum `A_VENIR / JOUEE / FORFAIT_NOUS / FORFAIT_ADVERSAIRE` - pilote le barème FIBA dans la vue classement

**Vues PostgreSQL :**
- `v_classement_equipes` - barème FIBA, tient compte du statut forfait (0 pt) distinct d'une défaite jouée (1 pt)
- `v_taux_presence` - taux par **(joueur, équipe)**, pas par joueur seul (NULLIF pour éviter division par zéro)
- `v_joueurs_par_equipe` - via `joueur_equipe`, joueurs actifs avec équipe, catégorie et numéro de maillot

**Triggers PostgreSQL :**
- `trg_audit_rencontre` - journalise toute modification de score dans `audit_log`

**Seed (`seed.ts`) :**
- Groupes prédéfinis (Administrateur, Gestionnaire, Entraîneur, Consultation)
- Toutes les permissions
- Compte admin depuis `.env`
- Jeu de données de démo : ~8 équipes (cohérent avec le volume réel du club), une quinzaine de joueurs dont au moins un en double appartenance, quelques entraînements, rencontres (dont une avec statut forfait) et tarifs de cotisation par catégorie

### Sauvegardes

- `pg_dump` planifié quotidiennement (tâche planifiée Windows ou cron dans un conteneur dédié), poussé vers un stockage externe au PC-serveur (cloud, NAS, autre disque) - protège même en cas de panne matérielle du PC
- Documenté dans le `README.md` du repo : commande de restauration testée au moins une fois avant mise en production

---

## Interface utilisateur

### Design - identité "sportive", pas SaaS générique

**Palette (dark mode natif) :**

| Rôle | Nom Tailwind | Hex | Utilisation |
|------|-------------|-----|--------------|
| Fond principal | `bg-app-base` | `#1a1a2e` | Arrière-plan de l'application |
| Fond secondaire | `bg-app-surface` | `#252542` | Cartes, panneaux latéraux, modals, headers de tableaux |
| Fond tertiaire | `bg-app-elevated` | `#303056` | Éléments survolés, champs de formulaire |
| Couleur primaire | `text-primary` | `#d81e27` | Boutons principaux, icônes actives, badges de défaite, liens |
| Primaire hover | `bg-primary-hover` | `#b51820` | État de survol des boutons rouges |
| Couleur accent | `text-accent` | `#d2691e` | Éléments liés au basket, alertes, boutons secondaires |
| Texte principal | `text-content` | `#f8fafc` | Texte de base, titres, données de tableaux |
| Texte muet | `text-muted` | `#94a3b8` | Placeholders, dates, labels secondaires |
| Succès/victoire | `text-success` | `#10b981` | Badges de victoire, présences, cotisations payées |

- **Dark mode uniquement** dans un premier temps (toggle désactivé mais prévu dans le code)
- Logo RBBC (`rbbc_icon.jpg`) dans la sidebar et la page de connexion
- Sidebar de navigation fixe sur desktop, drawer hamburger sur mobile

**Typographie :**
- **Titres et chiffres clés (Display)** : Oswald ou Rajdhani - sans-serif condensées et géométriques, évoquent maillots de sport, chronomètres, affichage de scores. Toujours en bold, souvent en majuscules. Utilisation : titres de page, gros scores, numéros de maillots, stats clés dans les cartes.
- **Texte et données** : Inter ou Roboto - lisibilité pour tableaux de présence et listes de cotisations. Corps de texte, tableaux, menus, formulaires.

**Style des composants - approche "sportive", pas SaaS mou :**
- Angles très légèrement arrondis (`rounded-md`/`rounded-sm`), pas de gros arrondis
- Bordures d'accentuation épaisses sur un seul côté : carte de match gagné → `border-l-4 border-success`, match perdu → `border-l-4 border-primary`
- Pas d'ombres diffuses ; si besoin de détacher un élément, léger contour (`border border-app-elevated`)
- Boutons primaires : fond `#d81e27`, texte blanc, police condensée majuscule, couleur unie (pas de dégradé), `hover:scale-105 active:scale-95` pour un effet physique
- Boutons secondaires/ghost : transparent, bordure `#d81e27` ou `#d2691e`
- Badges : fond sombre, contour fort, texte coloré (ex. Payé → `border-success text-success uppercase`)
- Tableaux : lignes zébrées subtiles (`even:bg-app-base odd:bg-app-surface`), en-têtes en Oswald majuscule `text-muted`, séparation `border-b border-app-elevated`
- Icônes : lignes épaisses et tranchées (Lucide ou Phosphor Bold/Duotone), éviter les icônes fines/arrondies

### Layout général

```
┌─────────────────────────────────────────────┐
│ Sidebar fixe │ Header (titre + user info)   │
│ (navigation) ├─────────────────────────────│
│              │ Contenu principal            │
│              │ (SPA - pas de rechargement) │
│              │                             │
└─────────────────────────────────────────────┘
```

- Sur mobile (<768px) : sidebar devient drawer, contenu full-width
- Sur tablette (768-1024px) : sidebar icônes seules (tooltip au hover)
- Sur desktop (>1024px) : sidebar complète avec libellés
- **Pas de page dashboard/accueil dédiée au MVP** : après login, redirection directe vers le premier module accessible selon les permissions de l'utilisateur (typiquement Joueurs)

### Composants UI requis

- `Button` (primary, secondary, danger, ghost)
- `Input`, `Select`, `Checkbox`, `DatePicker`
- `Table` avec tri par colonne et filtre texte
- `Modal` (confirmation, formulaire)
- `Toast` (succès, erreur, info - disparaît après 4s)
- `Badge` (statut, rôle)
- `Card` (utilisée dans les listes/effectifs, pas de page dashboard dédiée)
- `Spinner` / `Skeleton` pour les états de chargement
- Panneau latéral glissant (`SlidePanel`) pour les détails sans rechargement

### Comportements UX obligatoires

- **Zéro rechargement de page** : toute navigation via React Router, toute mise à jour via appels API + invalidation cache React Query
- Les données des vues SQL (classement, taux de présence) sont chargées **une seule fois** au montage du composant et mises en cache (React Query, staleTime 5 minutes)
- Les formulaires gardent leur état en cas d'erreur API (pas de reset brutal)
- Chaque action destructive (supprimer, désactiver) demande confirmation dans une Modal
- Les boutons d'action sont masqués ou désactivés selon les permissions de l'utilisateur connecté (vérification côté client ET côté serveur)

---

## Authentification

- Page de login : champs login + mot de passe, validation non-vide avant envoi
- JWT stocké en **httpOnly cookie**, attributs `HttpOnly; Secure; SameSite=Strict` (expiration 7 jours) - jamais de token en `localStorage`
- Refresh token optionnel (prévoir la structure mais pas obligatoire au MVP)
- Route `GET /api/v1/auth/me` : retourne l'utilisateur courant + ses permissions effectives
- Toutes les routes API protégées sauf `POST /api/v1/auth/login`
- Message générique "Identifiants invalides" pour login inconnu, mot de passe faux, compte inactif (anti-énumération)
- **Rate limiting sur `/auth/login`** : ex. 10 tentatives / 15 min / IP (`express-rate-limit`), pour limiter le brute-force - le message anti-énumération ne suffit pas seul
- Déconnexion : supprime le cookie côté serveur + côté client

## Sécurité - checklist transverse

- **CORS** : `origin` restreint à `CLIENT_URL` (pas de wildcard `*`), `credentials: true` pour que le cookie httpOnly parte avec les requêtes
- **Rate limiting global** : limite raisonnable sur `/api/v1/*` (ex. 100 req/min/IP) en plus du rate limit dédié au login
- **Upload calendrier (`/rencontres/import`)** : valider taille max (ex. 5 Mo) et extension (`.xls` ou `.xlsx`) avant parsing ; le fichier fédération réel est un tableau HTML avec extension `.xls`, donc la validation ne peut pas se baser sur un type MIME strict - valider plutôt par succès du parsing (`xlsx`/SheetJS) et rejeter si aucune ligne exploitable n'est trouvée
- **Logs** : jamais de mot de passe, token JWT ou cookie en clair dans les logs serveur
- **Erreurs** : messages génériques côté client, détail complet uniquement dans les logs serveur (jamais de stack trace exposée au client)
- **Dépendances** : `npm audit` propre avant chaque livraison de phase, lock files toujours commités

---

## API REST

Préfixe : `/api/v1/`

### Endpoints principaux

```
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /joueurs          ?equipe=&actif=
POST   /joueurs
GET    /joueurs/:id
PUT    /joueurs/:id
DELETE /joueurs/:id      (soft delete)
GET    /joueurs/:id/equipes             (appartenances actuelles, avec maillot par équipe)
POST   /joueurs/:id/equipes             (ajouter une appartenance : idEquipe, numeroMaillot)
PUT    /joueurs/:id/equipes/:idEquipe   (modifier maillot / actif)
DELETE /joueurs/:id/equipes/:idEquipe   (retirer l'appartenance)

GET    /equipes
POST   /equipes
PUT    /equipes/:id
DELETE /equipes/:id
GET    /equipes/:id/effectif            (joueurs actifs de l'équipe + maillot)

GET    /entrainements    ?equipe=&semaine=
POST   /entrainements
PUT    /entrainements/:id
DELETE /entrainements/:id
GET    /entrainements/:id/presences
PUT    /entrainements/:id/presences  (upsert en bloc)

GET    /rencontres       ?mois=&annee=&equipe=
POST   /rencontres
PUT    /rencontres/:id
DELETE /rencontres/:id
POST   /rencontres/:id/score
POST   /rencontres/import              (multipart/form-data, .xls table HTML ou .xlsx)
POST   /rencontres/import/preview      (parse + résout mapping_equipe_federation, ne crée rien)

GET    /staff
POST   /staff
PUT    /staff/:id
DELETE /staff/:id
GET    /staff/:id/equipes
POST   /staff/:id/equipes               (ajouter une équipe encadrée)
DELETE /staff/:id/equipes/:idEquipe

GET    /statistiques/classement  ?equipe=
GET    /statistiques/presences   ?equipe=
GET    /statistiques/bilan       ?equipe=

GET    /cotisations      ?saison=&statut=
POST   /cotisations
PUT    /cotisations/:id
GET    /tarifs-cotisation
PUT    /tarifs-cotisation/:categorie

GET    /utilisateurs
POST   /utilisateurs
PUT    /utilisateurs/:id
DELETE /utilisateurs/:id
PUT    /utilisateurs/:id/password       (réinitialisation par l'admin, permission UTILISATEURS_ECRIRE)

GET    /groupes
POST   /groupes
PUT    /groupes/:id
DELETE /groupes/:id
GET    /permissions                  (liste toutes les permissions disponibles)
PUT    /utilisateurs/:id/groupes
PUT    /utilisateurs/:id/permissions (permissions directes avec expiration)
GET    /utilisateurs/:id/permissions/effectives
```

---

## Docker

### `docker-compose.yml` (développement)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD depuis .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  server:
    build: ./packages/server
    environment: variables depuis .env
    depends_on: [db]
    ports:
      - "3001:3001"
    volumes:
      - ./packages/server/src:/app/src  # hot reload dev

  client:
    build: ./packages/client
    ports:
      - "5173:5173"
    volumes:
      - ./packages/client/src:/app/src  # hot reload dev
```

### `.env.example`

```
# Base de données
DATABASE_URL=postgresql://rbbc_user:rbbc_pass@db:5432/rbbc_gestion

# Auth
JWT_SECRET=changeme_secret_very_long
JWT_EXPIRES_IN=7d

# Admin seed
ADMIN_LOGIN=admin
ADMIN_PASSWORD=admin123

# App
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
```

---

## Conventions de code

### Nommage
- Variables/fonctions : `camelCase`
- Composants React : `PascalCase`
- Fichiers composants : `PascalCase.tsx`
- Fichiers non-composants : `camelCase.ts`
- Colonnes BDD Prisma : `camelCase` (mappé snake_case via `@map`)
- Routes API : kebab-case, pluriel

### TypeScript
- `strict: true` partout
- Pas de `any` - `unknown` + type guard si nécessaire
- Interfaces pour objets de données, types pour unions/utilitaires

### React
- Composants fonctionnels uniquement
- Hooks custom pour logique réutilisable (`use` prefix)
- **React Query** (`@tanstack/react-query`) pour tout appel API (cache, loading states, invalidation)
- Pas de `useEffect` pour fetcher des données - passer par React Query

### Commentaires
- Aucun commentaire évident - uniquement les WHY non-obvieux
- Pas de docstrings multi-lignes
- Tout le texte visible en français

### Git
- Voir la section dédiée « Conventions Git & historique » dans `PLAN.md` : Conventional Commits, un commit par sous-tâche réelle, dates authentiques uniquement, identité `OliverThys`, pas de ligne `Co-Authored-By`.

---

## Ce qu'on ne fait PAS (hors scope MVP)

- SSR / Next.js
- WebSocket / temps réel push (React Query polling suffisant si besoin)
- Paiements en ligne
- Page vitrine publique
- i18n (tout hardcodé en français)
- PWA / Service Workers
- Tests automatisés (code structuré pour en ajouter facilement)
- Tâches récurrentes automatiques
- Light mode (prévu dans le code mais non activé)
- CI/CD GitHub Actions

---

## Ordre de développement recommandé

1. Monorepo GitHub + docker-compose + PostgreSQL qui démarre
2. Prisma schema complet + migrations + seed
3. Backend : auth (login/logout/me) + middleware permissions
4. Backend : modules métier dans l'ordre (joueurs → équipes → staff → entraînements → rencontres → statistiques → cotisations → utilisateurs/groupes)
5. Frontend : shell (layout, sidebar, routing, auth guard, thème)
6. Frontend : modules dans le même ordre
7. Import Excel calendrier
8. Polish UI (animations, skeleton loaders, responsive)

---

## Critères de qualité attendus

- Depuis un clone frais du repo, `docker compose up --build` doit fonctionner sans erreur
- Zéro secret en clair dans le code source (tout dans `.env`, `.env` dans `.gitignore`)
- Toutes les routes API vérifient les permissions côté serveur indépendamment du frontend
- Les vues SQL et données statiques sont mises en cache côté client (pas de requête à chaque changement de page)
- L'application reste utilisable si un module plante (error boundary par module)
- `npm audit` propre (aucune vulnérabilité connue), lock files (`package-lock.json`) commités
- CORS configuré strictement sur `CLIENT_URL`, rate limiting actif sur `/auth/login` et sur l'API globale
