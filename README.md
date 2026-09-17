# Internal tools foundation

A shared foundation for internal tools: stubbed sign-in, one server-side `authorize()` function, a hash-chained audit log that Postgres itself keeps append-only, and maker-checker approvals that execute exactly once.
Two thin apps sit on top of it, refunds and feature flags, to show how little an app needs once the controls are shared.
Built in about two hours with Devin as a proof of concept for replacing Power Apps with code the team owns.

## Run it

```bash
git clone https://github.com/alainwelliver/alain-cognition-takehome.git
cd alain-cognition-takehome
npm run demo     # creates .env, installs deps, docker compose up, migrate as admin, seed, next dev on :3000
```

Then open http://localhost:3000 and pick a user from the header dropdown.

`npm test` starts Postgres if nothing is answering, resets the test schema and runs every test against a real database.

## Try it

| Flow | Pick this user | Then |
| --- | --- | --- |
| Propose a refund | Sam Support | Open `/refunds`, pick a transaction, enter an amount, reason and notes, click **Propose**. It appears under *Pending approvals*. |
| Approve it | Olivia Ops | Open `/refunds`, find Sam's proposal, click **Approve and execute**. It moves to *Executed refunds* and the payment-provider call count on `/controls` goes up by one. |
| Try to approve your own | Olivia Ops | Propose a refund yourself, then look at it under *Pending approvals*: the approve button is replaced by *your own proposal*. The server refuses too, so a hand-crafted request gets a 403. |
| Toggle a staging flag | Eli Engineer | Open `/flags`, click the **staging** button on any flag. It flips immediately and one audit row is written. |
| Propose a prod change | Eli Engineer | On `/flags`, click the **prod** button. Prod does not change; the proposal appears under *Pending production proposals*. |
| Approve the prod change | Lena Lead | On `/flags`, approve Eli's proposal. Prod flips once, and `GET /api/flags?env=prod` shows the new value. |
| See the controls | anyone | Open `/controls`: audit chain status, the Postgres grants on `audit_log`, pending and executed approvals, the role table, and the last twenty audit rows. |

Tamper demo, run as `admin` because `app_user` is not allowed to:

```bash
npm run verify-audit  # chain ok (N rows)
npm run demo:tamper   # rewrites the third audit row and saves the original
npm run verify-audit  # chain broken at row 3   (/controls shows it in red)
npm run demo:reset    # restores the row
```

## Prove it

| Control | Test (file and sentence) | What fails without it |
| --- | --- | --- |
| One place decides permissions | `src/platform/rbac/authorize.test.ts`: *a support user gets 403 on approving a refund* | Any role could approve a refund; a support agent could pay themselves. |
| Proposer cannot approve their own | `src/platform/approvals/approvals.test.ts`: *the proposer cannot approve their own refund* | One person could propose and approve, so two-person control is gone. |
| Money moves once per approval | `src/apps/refunds/refunds.test.ts`: *executing an approved refund twice records exactly one payment provider call* | A double click or a retried request refunds twice. |
| Concurrent executions still run once | `src/platform/approvals/approvals.test.ts`: *two concurrent executions of the same approval run the executor once* | Two approvers racing produce two refunds. |
| Rejected means never executed | `src/apps/refunds/refunds.test.ts`: *a rejected refund never reaches the payment provider* | A rejected proposal could still be executed later. |
| Every write leaves exactly one audit row | `src/platform/audit/audit.test.ts`: *a successful write leaves exactly one audit row* | Writes without a trace, or duplicate rows that make the log unreliable. |
| Failed writes leave no audit row | `src/platform/audit/audit.test.ts`: *a write inside a transaction that fails leaves no audit row* | The log claims a change happened that was rolled back. |
| Audit log is append-only in the database | `src/platform/audit/audit.test.ts`: *app_user cannot UPDATE an audit row* and *app_user cannot DELETE an audit row* | A compromised app could rewrite or erase history. |
| Tampering is detectable | `src/platform/audit/audit.test.ts`: *the verifier reports a break at the altered row after an admin edits it* | An admin edit to the log goes unnoticed. |
| Prod flags need a second person | `src/apps/flags/flags.test.ts`: *toggling prod does not change the flag until approved* and *the proposer cannot approve their own prod change* | One engineer flips production alone. |
| Apps cannot bypass the platform | `src/platform/imports.test.ts`: *no file under src/apps imports the database client* | An app could write to the database with no authorize call and no audit row. |
| Unknown paths get the strictest review | `scripts/classify/classify.test.ts`: *classifies a path that matches no rule as tier 2* | A file nobody wrote a rule for auto-merges. |

## Real

| Thing | Why it's real |
| --- | --- |
| Permission checks | Enforced on the server in one place, called by every action. Removing the check fails a test. |
| Audit log | Every write records who, what, when, in the same transaction as the change. The app's database user has no permission to update or delete audit rows, so the guarantee is the database's, not the code's. |
| Two-person approval | Refunds and production flag changes are proposals until a second person approves. The proposer cannot approve their own, enforced server-side and covered by a test. |
| One action, one effect | Approving twice results in one refund, using an idempotency key. Covered by a test. |
| Tests | Each control has a test written as a sentence, and each one fails if the control is removed. |
| Database | Real Postgres with real migrations, not an in-memory fake. |

## Stubbed

| Thing | What it is now | What real looks like | Why the stub is fine |
| --- | --- | --- | --- |
| Login | A dropdown that picks a seeded user | An OIDC provider (Clerk, WorkOS, Okta, Entra) behind the existing AuthProvider interface | The stub decides who you are. It doesn't decide what you're allowed to do, which is the part under test. Swapping it is configuration, about 30 minutes. |
| Payment provider | A fake that records calls and honors idempotency keys | The real payments API behind the existing PaymentProvider interface | The fake is what makes "approve twice, charge once" provable in a test. |
| Data | Seeded fake customers and payments | Their own records | No real customer data should ever be in a demo. |
| Look and feel | Plain forms | Their design system | Styling would have cost build time and proved nothing about the controls. |
| Deployment | Runs locally | Their own pipeline | Out of scope for a two hour proof of concept. |

## Not proven here

This prototype shows the controls hold and how quickly an app can be added on top of them. It does not prove that AI-written code is secure without review, that this scales to their traffic, or that non-engineers can build tools without engineering involvement. Those need a pilot on one real tool.

## Change tiers

Every PR is sorted into a tier by what it touches: tier 0 is pages, copy, tests and docs inside an existing app and auto-merges on green CI; tier 1 is a new app or a change to an app's `actions.ts` and needs one human approval; tier 2 is anything under `src/platform/`, the schema, migrations, CI, scripts, dependencies, or any path no rule names, and needs the code owner. The classifier in `scripts/classify/` reads the changed-file list, takes the highest tier present, defaults unknown paths to tier 2, and runs on every PR from `.github/workflows/classify.yml`; `.github/CODEOWNERS` makes GitHub itself block tier 2 paths until `@alainwelliver` approves, and tier 0 PRs get an automatic approving review so auto-merge can land them. In a real deployment the classifier would notify a Slack channel; in this repo there is no Slack, so the notification is a `tier-N` label and a comment on the PR explaining which paths set the tier. Details in [docs/change-tiers.md](docs/change-tiers.md).

## How Devin built this

All times UTC, 2026-09-17. "Started" is the first commit on the branch.

| Session | Asked for | Started | PR opened | Merged | Tier | Tests added | Where Alain intervened |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [#1](https://github.com/alainwelliver/alain-cognition-takehome/pull/1) | Change-tier classifier, CI and classify workflows | 21:24 | 21:24 | 21:28 | 2 | 13 (`scripts/classify/classify.test.ts`) | |
| [#2](https://github.com/alainwelliver/alain-cognition-takehome/pull/2) | Document the change tiers | 21:26 | 21:26 | 21:27 | 0 | 0 | |
| [#3](https://github.com/alainwelliver/alain-cognition-takehome/pull/3) | Placeholder KYC app page, to prove the tier 1 path | 21:28 | 21:28 | closed 21:33, not merged | 1 | 0 | |
| [#4](https://github.com/alainwelliver/alain-cognition-takehome/pull/4) | Foundation: auth stub, RBAC, hash-chained audit log, approvals, `/controls` | 21:33 | 21:33 | 21:59 | 2 | 30 (`rbac`, `audit`, `approvals`, `imports`, `query`, `auth/oidc`) | |
| [#5](https://github.com/alainwelliver/alain-cognition-takehome/pull/5) | Refunds app: search, propose, second-person approval, idempotent execution | 22:04 | 22:04 | 22:10 | 2 | 10 (`src/apps/refunds/refunds.test.ts`) | |
| [#6](https://github.com/alainwelliver/alain-cognition-takehome/pull/6) | Feature flags app: dev/staging via `mutate`, prod via approvals, `GET /api/flags` | 22:11 | 22:14 | 22:16 | 2 | 10 (`src/apps/flags/flags.test.ts`) | |
| [#7](https://github.com/alainwelliver/alain-cognition-takehome/pull/7) | Free-text notes on refund proposals, shown to the approver | 22:19 | 22:20 | 22:26 | 0 | 1 | |
| [#8](https://github.com/alainwelliver/alain-cognition-takehome/pull/8) | Let support approve refunds under $50 | 22:22 | 22:22 (last push 22:39) | open, blocked pending code owner review | 2 | | |
| [#10](https://github.com/alainwelliver/alain-cognition-takehome/pull/10) | Plain-English refund reason labels and a descriptive notes label | 22:35 | 22:35 | 22:36 | 0 | 1 | |
| this one | This README | | | | 0 | 0 | |

## Next

**KYC review queue** is the next ticket: a queue of applicants, each with a vendor verification result, where a reviewer proposes approve or decline and a second reviewer confirms. The vendor response would look roughly like this:

```json
{
  "status": "review",
  "riskScore": 62,
  "flags": ["address_mismatch", "recent_account_open"],
  "documentChecks": {
    "idFront": "pass",
    "idBack": "pass",
    "selfieMatch": "manual_review"
  },
  "watchlistHits": [
    { "list": "OFAC", "name": "J. Doe", "score": 0.41 }
  ]
}
```

It reuses the same approvals primitive because a KYC decision is exactly a proposal with a payload (the applicant and the vendor result) that a second person must approve, and the payload column means the vendor shape above needs no migration.

After that: real OIDC behind `AuthProvider` (Clerk or WorkOS, one file), a deployed URL so the VP can click through without Docker, and a two-week pilot on one real tool with real users.
