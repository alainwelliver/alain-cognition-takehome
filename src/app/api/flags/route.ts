import { NextResponse } from "next/server";
import { listFlags } from "@/apps/flags/queries";
import { ENVS, isEnv, type Env } from "@/apps/flags/types";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("env");
  if (value !== null && value !== "all" && !isEnv(value)) {
    return NextResponse.json({ error: "unknown env" }, { status: 400 });
  }

  const flags = await listFlags();
  if (value && value !== "all") {
    const env = value as Env;
    return NextResponse.json({
      env,
      flags: flags.map((flag) => ({ key: flag.key, description: flag.description, enabled: flag[env] })),
    });
  }
  return NextResponse.json({
    env: "all",
    flags: flags.map((flag) => ({
      key: flag.key,
      description: flag.description,
      dev: flag.dev,
      staging: flag.staging,
      prod: flag.prod,
      updatedAt: flag.updatedAt,
    })),
  });
}
