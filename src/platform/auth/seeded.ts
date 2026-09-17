import { cookies } from "next/headers";
import { db } from "../db";
import type { AuthProvider, Principal } from "./types";

export const AUTH_COOKIE = "seeded_user_id";

/**
 * Development stand-in for a real identity provider: the header dropdown picks
 * one of the seeded users and the choice is stored in a cookie.
 */
export class SeededAuthProvider implements AuthProvider {
  async currentUser(): Promise<Principal | null> {
    const id = (await cookies()).get(AUTH_COOKIE)?.value;
    const users = await this.switchableUsers();
    return users.find((u) => u.id === id) ?? users[0] ?? null;
  }

  async switchableUsers(): Promise<Principal[]> {
    const users = await db.user.findMany({ orderBy: { name: "asc" } });
    return users.map((u) => ({ id: u.id, name: u.name, role: u.role }));
  }
}

export const auth: AuthProvider = new SeededAuthProvider();
