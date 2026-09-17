import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APPS_DIR = join(process.cwd(), "src", "apps");
const FORBIDDEN = [/@prisma\/client/, /from\s+["'].*platform\/db["']/, /\bnew PrismaClient\b/];

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
      return FORBIDDEN.some((pattern) => pattern.test(source));
    });
    expect(offenders).toEqual([]);
  });
});
