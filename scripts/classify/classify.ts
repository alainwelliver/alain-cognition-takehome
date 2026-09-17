import fs from "node:fs";
import path from "node:path";

export type Tier = 0 | 1 | 2;

export interface ClassifyResult {
  tier: Tier;
  reasons: string[];
}

export interface ClassifyOptions {
  /** Returns true when `src/apps/<app>` already exists on the base branch. */
  appExists?: (app: string) => boolean;
  /** Repo root used by the default `appExists` implementation. */
  repoRoot?: string;
}

const APP_FILE = /^src\/apps\/([^/]+)\/(.+)$/;
const TIER_0_APP_FILE = /(\.tsx|(^|\/)copy\.ts|\.test\.ts)$/;

/**
 * Tier 2: code owner approval. Matched first, so a code-owned path always wins.
 */
const TIER_2_PATTERNS: Array<{ test: RegExp; reason: string }> = [
  { test: /^src\/platform\//, reason: "platform layer" },
  { test: /^prisma\/schema\.prisma$/, reason: "prisma schema" },
  { test: /^prisma\/migrations\//, reason: "database migration" },
  { test: /^\.github\//, reason: "repo automation" },
  { test: /^scripts\//, reason: "repo scripts" },
  { test: /^package\.json$/, reason: "package.json" },
  { test: /^(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock)$/, reason: "lockfile" },
  { test: /^docker-compose\.ya?ml$/, reason: "docker compose" },
  { test: /^\.env\.example$/, reason: "environment contract" },
];

/** Tier 0 outside of `src/apps/`. */
const TIER_0_PATTERNS: Array<{ test: RegExp; reason: string }> = [
  { test: /^prisma\/seed\.ts$/, reason: "seed data" },
  { test: /^docs\//, reason: "documentation" },
];

function defaultAppExists(repoRoot: string): (app: string) => boolean {
  return (app: string) => fs.existsSync(path.join(repoRoot, "src", "apps", app));
}

function classifyPath(
  file: string,
  appExists: (app: string) => boolean,
): { tier: Tier; reason: string } {
  for (const { test, reason } of TIER_2_PATTERNS) {
    if (test.test(file)) return { tier: 2, reason: `${file}: ${reason} (code owner approval)` };
  }

  const app = APP_FILE.exec(file);
  if (app) {
    const [, appName, rest] = app;
    if (!appExists(appName)) {
      return { tier: 1, reason: `${file}: new app directory src/apps/${appName}` };
    }
    if (/(^|\/)actions\.ts$/.test(rest)) {
      return { tier: 1, reason: `${file}: server actions in existing app ${appName}` };
    }
    if (TIER_0_APP_FILE.test(rest)) {
      return { tier: 0, reason: `${file}: page, component, copy or test in existing app ${appName}` };
    }
    return { tier: 2, reason: `${file}: matches no tier rule` };
  }

  for (const { test, reason } of TIER_0_PATTERNS) {
    if (test.test(file)) return { tier: 0, reason: `${file}: ${reason}` };
  }

  return { tier: 2, reason: `${file}: matches no tier rule` };
}

export function classify(files: string[], options: ClassifyOptions = {}): ClassifyResult {
  const normalized = files
    .map((f) => f.trim().replace(/^\.\//, ""))
    .filter((f) => f.length > 0);

  if (normalized.length === 0) {
    return { tier: 2, reasons: ["no changed files detected"] };
  }

  const appExists = options.appExists ?? defaultAppExists(options.repoRoot ?? process.cwd());

  let tier: Tier = 0;
  const reasons: string[] = [];
  for (const file of normalized) {
    const result = classifyPath(file, appExists);
    reasons.push(`tier ${result.tier} - ${result.reason}`);
    if (result.tier > tier) tier = result.tier;
  }

  return { tier, reasons };
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const files = Buffer.concat(chunks).toString("utf8").split("\n");
  const result = classify(files, { repoRoot: process.env.CLASSIFY_REPO_ROOT });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedDirectly =
  process.argv[1] !== undefined && /classify\.(ts|js|mjs)$/.test(process.argv[1]);

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
