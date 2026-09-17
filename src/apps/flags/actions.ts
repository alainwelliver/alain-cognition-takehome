"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/platform";
import { isEnv } from "./types";
import { approveProd, createFlag, rejectProd, setFlag } from "./service";

async function currentUser() {
  const user = await auth.currentUser();
  if (!user) throw new Error("not signed in");
  return user;
}

export async function toggleFlag(formData: FormData) {
  const env = String(formData.get("env") ?? "");
  if (!isEnv(env)) throw new Error("invalid environment");
  await setFlag(
    await currentUser(),
    String(formData.get("key") ?? ""),
    env,
    String(formData.get("value")) === "true",
  );
  revalidatePath("/flags");
}

export async function approveProdAction(formData: FormData) {
  await approveProd(await currentUser(), String(formData.get("approvalId") ?? ""));
  revalidatePath("/flags");
}

export async function rejectProdAction(formData: FormData) {
  await rejectProd(
    await currentUser(),
    String(formData.get("approvalId") ?? ""),
    String(formData.get("reason") ?? ""),
  );
  revalidatePath("/flags");
}

export async function createFlagAction(formData: FormData) {
  await createFlag(
    await currentUser(),
    String(formData.get("key") ?? ""),
    String(formData.get("description") ?? ""),
  );
  revalidatePath("/flags");
}
