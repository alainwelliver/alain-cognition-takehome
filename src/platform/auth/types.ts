import type { Principal } from "../rbac/authorize";

export type { Principal };

export interface AuthProvider {
  /** The signed-in user for the current request, or null. */
  currentUser(): Promise<Principal | null>;
  /** Users offered by the header switcher. Empty for real providers. */
  switchableUsers(): Promise<Principal[]>;
}
