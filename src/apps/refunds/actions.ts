"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approve, auth, execute, propose, reject, ForbiddenError } from "@/platform";
import { REFUND_KIND, parsePayload } from "./kind";

async function currentUser() {
  const user = await auth.currentUser();
  if (!user) throw new ForbiddenError("403: not signed in");
  return user;
}

function back(message: string): never {
  revalidatePath("/refunds");
  redirect(`/refunds?message=${encodeURIComponent(message)}`);
}

export async function proposeRefund(formData: FormData) {
  const user = await currentUser();
  const dollars = Number(formData.get("amount"));
  const payload = parsePayload({
    transactionId: String(formData.get("transactionId") ?? ""),
    amountCents: Math.round(dollars * 100),
    reasonCode: String(formData.get("reasonCode") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  try {
    const approval = await propose(user, REFUND_KIND, { ...payload });
    back(`proposed refund ${approval.id}`);
  } catch (error) {
    if (error instanceof ForbiddenError) back(error.message);
    throw error;
  }
}

export async function approveRefund(formData: FormData) {
  const user = await currentUser();
  const approvalId = String(formData.get("approvalId") ?? "");
  try {
    await approve(user, approvalId);
    await execute(approvalId);
    back(`executed refund ${approvalId}`);
  } catch (error) {
    if (error instanceof ForbiddenError) back(error.message);
    throw error;
  }
}

export async function rejectRefund(formData: FormData) {
  const user = await currentUser();
  const approvalId = String(formData.get("approvalId") ?? "");
  const reason = String(formData.get("reason") ?? "no reason given");
  try {
    await reject(user, approvalId, reason);
    back(`rejected refund ${approvalId}`);
  } catch (error) {
    if (error instanceof ForbiddenError) back(error.message);
    throw error;
  }
}
