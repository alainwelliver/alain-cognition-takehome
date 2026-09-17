import { existsSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("created .env from .env.example");
}

if (!existsSync("node_modules")) {
  console.log("installing dependencies");
  execSync("npm install", { stdio: "inherit" });
}
