"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_COOKIE } from "@/platform";

export async function switchUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  (await cookies()).set(AUTH_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/");
}
