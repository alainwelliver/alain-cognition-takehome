import { ROLES, isRole, type Action, type Role } from "./roles";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface Principal {
  id: string;
  name: string;
  role: string;
}

/** The only place in the codebase that decides permissions. */
export function authorize(user: Principal, action: Action): void {
  if (!isRole(user.role)) {
    throw new ForbiddenError(`403: unknown role ${user.role}`);
  }
  const granted = ROLES[user.role as Role] as readonly Action[];
  if (!granted.includes(action)) {
    throw new ForbiddenError(`403: ${user.role} may not ${action}`);
  }
}

export function can(user: Principal, action: Action): boolean {
  try {
    authorize(user, action);
    return true;
  } catch {
    return false;
  }
}
