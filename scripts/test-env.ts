import { config } from "dotenv";
import { existsSync } from "node:fs";

/** The real process environment, captured before any dotenv file fills it in. */
const shellEnv = { ...process.env };

if (existsSync(".env")) config({ path: ".env" });
config({ path: ".env.example" });

/**
 * The test database URLs. Locally they come from .env (with .env.example as
 * the default); in CI only a single superuser DATABASE_URL pointing at the
 * service container exists, so the app_user URL is derived from it (and the
 * role is created by scripts/prepare-test-db.ts). Values set in the shell win
 * over the dotenv files, otherwise CI would talk to the compose ports.
 */
export function testDatabaseUrls(): { admin: string; app: string } {
  const admin =
    shellEnv.TEST_ADMIN_DATABASE_URL ??
    shellEnv.DATABASE_URL ??
    process.env.TEST_ADMIN_DATABASE_URL ??
    process.env.ADMIN_DATABASE_URL;
  if (!admin) throw new Error("TEST_ADMIN_DATABASE_URL is not set");

  const fromShell = admin === shellEnv.TEST_ADMIN_DATABASE_URL || admin === shellEnv.DATABASE_URL;
  const app =
    shellEnv.TEST_DATABASE_URL ??
    (fromShell ? asAppUser(admin) : (process.env.TEST_DATABASE_URL ?? asAppUser(admin)));
  return { admin, app };
}

export const APP_ROLE = "app_user";
export const APP_ROLE_PASSWORD = "app_user";

function asAppUser(adminUrl: string): string {
  const url = new URL(adminUrl);
  url.username = APP_ROLE;
  url.password = APP_ROLE_PASSWORD;
  return url.toString();
}

export function applyTestEnv(): { admin: string; app: string } {
  const urls = testDatabaseUrls();
  process.env.TEST_ADMIN_DATABASE_URL = urls.admin;
  process.env.TEST_DATABASE_URL = urls.app;
  return urls;
}
