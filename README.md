# Internal tools foundation

The shared foundation that every internal tool reuses: stubbed sign-in, one
authorization function, a hash-chained audit log the database itself keeps
append-only, and maker-checker approvals that execute exactly once. No apps are
built on it yet — this branch is the foundation only.

## Try it

```bash
cp .env.example .env
npm install
npm run demo          # docker compose up, migrate as admin, seed, next dev on :3000
```

Open http://localhost:3000/controls. Switch users with the header dropdown.

Tamper demo (runs as the `admin` role, because `app_user` is not allowed to):

```bash
npm run verify-audit  # chain ok (4 rows)
npm run demo:tamper   # rewrites the third audit row and saves the original
npm run verify-audit  # chain broken at row 3   (and /controls shows it in red)
npm run demo:reset    # restores the row
```

Tests run against a real Postgres test database, with one command:

```bash
npm test
```

## How it fits together

- `src/platform/auth` — `AuthProvider` interface. `SeededAuthProvider` reads a
  seeded user id from a cookie; `OidcAuthProvider` is the one file to fill in
  for Clerk or WorkOS.
- `src/platform/rbac` — `roles.ts` holds every role and action; `authorize()` is
  the only place in the codebase that decides permissions and throws 403.
- `src/platform/mutate.ts` — `mutate(user, action, fn)`: authorize, open one
  transaction, run the change, append its audit row before commit. A failed
  write leaves no audit row; a successful one leaves exactly one.
- `src/platform/audit` — `hash = sha256(prev_hash + canonical JSON of actor,
  action, entity, before, after, at)`. Inserts serialise on a transaction-scoped
  Postgres advisory lock, so the chain cannot fork. `app_user` has INSERT and
  SELECT on `audit_log`; UPDATE, DELETE and TRUNCATE are revoked in the
  migration, so append-only is the database's guarantee, not a convention.
- `src/platform/approvals` — `propose`, `approve`, `reject`, `execute`. The
  proposer can never decide their own proposal (checked on the server).
  `execute` takes `SELECT ... FOR UPDATE`, returns the stored result if it has
  already run, otherwise runs the registered executor once with
  `idempotencyKey = approvalId`. App-specific fields live in the `payload` JSON
  column, so a new form field needs no migration.
- Apps import from `src/platform/index.ts` only; a test scans `src/apps/**` for
  database imports and fails if one appears.

## Database roles

`docker-compose.yml` starts Postgres 16 on port 5433 and runs
`docker/init/01-roles.sql`, which creates the `app_test` database and the
`app_user` login role. `admin` is the superuser: migrations, seeds and the
tamper demo only. The app runs as `app_user`.

## Not in this branch

The refunds and feature-flag apps, `scripts/classify/`, and CI workflows. The
`/controls` page therefore reports zero payment-provider calls.
