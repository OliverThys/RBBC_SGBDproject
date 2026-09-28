# Stack technique - choix et justifications

> Document de préparation pour la soutenance : quoi, pourquoi, et pourquoi pas l'alternative.

---

## Vue d'ensemble

| Couche | Techno | Pourquoi |
|---|---|---|
| **Frontend** | React 18 + TypeScript strict + Vite + Tailwind CSS v4 | React = le plus employable/connu, écosystème riche (React Query, React Router, Recharts). Vite = démarrage et hot-reload quasi instantanés. Tailwind v4 = styling rapide et cohérent, configuration allégée via `@theme` en CSS pur. |
| **Backend** | Node.js + Express + TypeScript strict | Express = simple, direct, pas de magie (décorateurs/DI) à justifier. Node/TS partagent le langage avec le frontend - un seul écosystème à maîtriser. |
| **BDD** | PostgreSQL 16 + Prisma ORM | Postgres gère nativement vues SQL et triggers (classement FIBA, audit des scores). Prisma = typage TS généré depuis le schéma, migrations versionnées, tout en gardant la possibilité de SQL brut pour la logique fine. |
| **Auth** | JWT en cookie httpOnly + bcrypt | Cookie httpOnly = token inaccessible en JS, donc immunisé XSS. bcrypt = standard éprouvé (PBKDF2 initialement prévu pour compat Java, abandonné : pas de migration de comptes). |
| **Validation** | Zod côté serveur | Schémas typés réutilisables entre définition TS et validation runtime. |
| **Infra** | Docker + docker-compose | Contrainte réelle du déploiement : PC local → Cloudflare Tunnel → migration VPS plus tard. Environnement identique partout. |
| **Sécurité** | `express-rate-limit`, `cors` strict | Ajoutés après review (revue de sécurité) : anti brute-force login, CORS restreint au domaine client. |

**Exclus délibérément** : Next.js (pas de SSR nécessaire pour une app interne derrière login), NestJS (trop de cérémonie pour la taille du projet), WebSocket (React Query + cache suffit), tests automatisés (hors scope MVP, code structuré pour en accueillir).

---

## Justifications détaillées (comparaisons aux alternatives)

### React vs Angular / Vue
- **Choisi : React.** Le plus répandu en entreprise (employabilité directe), écosystème énorme, composants fonctionnels + hooks = courbe d'apprentissage raisonnable à documenter.
- **Pourquoi pas Angular ?** Trop lourd/opinionated (DI, modules, RxJS) pour une SPA de cette taille - sur-ingénierie disproportionnée.
- **Pourquoi pas Vue ?** Valable techniquement, mais moins demandé sur le marché belge, moins d'intégrations prêtes à l'emploi avec l'écosystème choisi.

### Vite vs Create React App / Webpack manuel
- **Choisi : Vite.** CRA est officiellement abandonné (plus maintenu) - ne jamais le proposer en 2026. Vite = build natif ESM, démarrage en millisecondes, config minimale.
- Argument : "outil standard actuel de l'écosystème React, pas un choix arbitraire."

### Express vs NestJS vs Fastify
- **Choisi : Express.** Le plus simple à justifier ligne par ligne - pas de magie (décorateurs, injection de dépendances) si le jury demande "comment ça marche exactement".
- **Pourquoi pas NestJS ?** Architecture calquée sur Angular (modules, providers, DI) - puissant sur un gros projet multi-équipe, disproportionné ici. Argument : "la complexité de NestJS se justifie à partir d'une certaine taille d'équipe/projet, pas pour un MVP mono-développeur."
- **Pourquoi pas Fastify ?** Plus rapide en benchmark brut, mais l'app tourne en interne pour 15-40 utilisateurs - la performance brute n'est pas un facteur limitant, alors que la lisibilité/documentation d'Express (plus de ressources, plus simple à déboguer) l'est.

### PostgreSQL vs MySQL/MariaDB vs MongoDB
- **Choisi : PostgreSQL.** Données fortement relationnelles (joueur↔équipe multi-appartenance, permissions↔groupes↔utilisateurs, contraintes d'intégrité métier) - cas d'école pour un SGBDR, pas pour du NoSQL.
- **Pourquoi pas MySQL/MariaDB (l'ancienne app Java l'utilisait) ?** Postgres a un support plus riche et standard des **vues** et **triggers** (classement FIBA, audit des scores) et des contraintes `CHECK` complexes - besoins réels du cahier des charges, pas un choix gratuit.
- **Pourquoi pas MongoDB ?** Aucune donnée n'est vraiment "document" - tout est relations et contraintes strictes (unicité de maillot par équipe, score jamais égal...). Un modèle NoSQL forcerait à réimplémenter ces contraintes en code applicatif, moins fiable.

### Prisma vs SQL brut / TypeORM
- **Choisi : Prisma.** Types TypeScript générés automatiquement depuis le schéma = zéro désynchronisation BDD/code. Migrations versionnées et traçables (bon pour un historique propre en soutenance).
- **Pourquoi pas TypeORM ?** Historiquement moins stable, syntaxe plus verbeuse (decorators). Prisma a une DX plus simple à défendre via `schema.prisma`, lisible même par un non-développeur.
- **Limite assumée à mentionner soi-même** : Prisma migre mal les objets SQL avancés (vues, triggers) - ajoutés en migrations SQL brutes à côté, choix conscient, pas une improvisation.

### JWT + cookie httpOnly vs Sessions serveur / localStorage
- **Choisi : JWT en cookie httpOnly.** Stateless (pas de table de sessions côté serveur), et **httpOnly = inaccessible en JavaScript**, donc immunisé contre le vol de token par une faille XSS - contrairement à `localStorage`, l'erreur classique que les jurys aiment piéger.
- **Pourquoi pas des sessions serveur classiques (`express-session`) ?** Valable aussi, mais ajoute un état serveur à synchroniser/sauvegarder ; JWT reste plus simple à faire tourner sur un PC local avec migration VPS prévue plus tard (pas de session store à migrer).

### bcrypt vs PBKDF2 / Argon2
- **Choisi : bcrypt.** Standard historique, bien documenté, implémentation Node.js mature et testée.
- **Pourquoi pas PBKDF2 (prévu initialement) ?** C'était pour compatibilité avec les hash de l'app Java existante - mais pas de migration de comptes (coupure nette, ressaisie), donc la contrainte tombe. bcrypt = standard actuel recommandé par l'OWASP pour ce cas d'usage.
- **Pourquoi pas Argon2 (le plus récent/recommandé) ?** Argument honnête si on te pousse : Argon2 est objectivement supérieur (gagnant du Password Hashing Competition), bcrypt reste "suffisant et largement utilisé en production" pour un projet de cette taille - compromis pragmatique assumé, pas la solution la plus pointue.

### Docker / docker-compose
- **Justification la plus solide de toute la stack** : contrainte réelle du déploiement (PC local → Cloudflare Tunnel → migration VPS plus tard). Docker garantit un environnement identique partout - critère de qualité explicite du cahier des charges (`docker compose up --build` doit fonctionner depuis un clone frais).

---

## Le fil conducteur à répéter en soutenance

Chaque choix est justifié soit par une **contrainte réelle du projet** (déploiement PC→VPS, données relationnelles avec contraintes fortes), soit par un **compromis explicite assumé** (bcrypt plutôt qu'Argon2, Express plutôt que NestJS) - jamais par une mode technique. C'est ce distinguo *contrainte vs compromis conscient* qui rassure un jury.
