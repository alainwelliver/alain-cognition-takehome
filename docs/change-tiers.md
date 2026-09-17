# Change tiers

Tier 0: pages, components, `copy.ts` and tests under an existing `src/apps/<app>/`, plus `prisma/seed.ts` and `docs/**`. Auto-approved on green CI.

Tier 1: a new directory under `src/apps/`, or any `src/apps/**/actions.ts`. One human approval.

Tier 2: `src/platform/`, `prisma/schema.prisma`, `prisma/migrations/`, `.github/`, `scripts/`, `package.json`, the lockfile, `docker-compose.yml`, `.env.example`, and any path matching no rule. Code owner approval.
