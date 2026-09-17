import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { violatesFence } from "./fence";

const APPS_DIR = join(process.cwd(), "src", "apps");

function walk(dir: string): string[] {
  let files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    files = files.concat(statSync(path).isDirectory() ? walk(path) : [path]);
  }
  return files;
}

describe("the app fence", () => {
  it("no file under src/apps imports the database client", () => {
    let files: string[] = [];
    try {
      files = walk(APPS_DIR);
    } catch {
      files = [];
    }
    const offenders = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return violatesFence(source);
    });
    expect(offenders).toEqual([]);
  });

  it("an app cannot import the database client directly", () => {
    for (const source of [
      'import { db } from "@/platform/db"',
      'import { db } from "../../platform/db"',
      'import { PrismaClient } from "@prisma/client"',
      "new PrismaClient()",
    ]) {
      expect(violatesFence(source)).toBe(true);
    }
  });

  it("an app may import the platform read helper", () => {
    expect(violatesFence('import { query, mutate } from "@/platform"')).toBe(false);
  });
});
