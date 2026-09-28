# RBBC Gestion

SaaS de gestion interne pour le Royal Blaregnies Basket Club (RBBC). Remplace l'application desktop Java/JavaFX existante.

Voir `docs/cahier-des-charges.md` (spécification complète) et `docs/PLAN.md` (plan de développement par phases).

## Stack

- Frontend : React 18, TypeScript strict, Vite, Tailwind CSS v4
- Backend : Node.js, Express, TypeScript strict
- BDD : PostgreSQL 16, Prisma ORM
- Auth : JWT (cookie httpOnly), bcrypt
- Infra : Docker, docker-compose

## Démarrage (développement)

```bash
cp .env.example .env
docker compose up --build
```

- API : http://localhost:3001/api/v1/health
- Client : http://localhost:5173

## Sauvegarde de la base

À mettre en place (Phase 9) : `pg_dump` planifié quotidiennement, copié vers un stockage externe au PC-serveur.
