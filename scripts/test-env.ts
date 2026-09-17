import { config } from "dotenv";
import { existsSync } from "node:fs";

if (existsSync(".env")) config({ path: ".env" });
config({ path: ".env.example" });

/**
 * The test database URLs. Locally they come from .env; in CI only a single
 * superuser DATABASE_URL pointing at the service container exists, so the
 * app_user URL is derived from it (and the role is created by
 * scripts/prepare-test-db.ts).
 */
export function testDatabaseUrls(): { admin: string; app: string } {
  const admin =
    process.env.TEST_ADMIN_DATABASE_URL ??
    (process.env.CI ? process.env.DATABASE_URL : undefined) ??
    process.env.ADMIN_DATABASE_URL;
  if (!admin) throw new Error("TEST_ADMIN_DATABASE_URL is not set");

  const app = process.env.TEST_DATABASE_URL ?? asAppUser(admin);
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
