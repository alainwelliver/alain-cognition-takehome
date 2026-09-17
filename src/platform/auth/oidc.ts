import type { AuthProvider, Principal } from "./types";

/**
 * Production shape of the same interface. Swapping the seeded provider for a
 * real one is a single-file change: Clerk or WorkOS both expose the session
 * lookup this interface needs, so nothing outside src/platform/auth moves.
 */
export class OidcAuthProvider implements AuthProvider {
  async currentUser(): Promise<Principal | null> {
    throw new Error("not implemented: wire up Clerk or WorkOS here");
  }

  async switchableUsers(): Promise<Principal[]> {
    throw new Error("not implemented: wire up Clerk or WorkOS here");
  }
}
