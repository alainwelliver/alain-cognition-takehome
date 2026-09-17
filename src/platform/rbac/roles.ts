export const ACTIONS = [
  "refund.view",
  "refund.propose",
  "refund.approve",
  "flag.view",
  "flag.edit.dev",
  "flag.edit.staging",
  "flag.propose.prod",
  "flag.approve.prod",
] as const;

export type Action = (typeof ACTIONS)[number];

export const ROLES = {
  support: ["refund.view", "refund.propose"],
  ops_lead: ["refund.view", "refund.propose", "refund.approve"],
  engineer: ["flag.view", "flag.edit.dev", "flag.edit.staging", "flag.propose.prod"],
  eng_lead: [
    "flag.view",
    "flag.edit.dev",
    "flag.edit.staging",
    "flag.propose.prod",
    "flag.approve.prod",
  ],
} as const satisfies Record<string, readonly Action[]>;

export type Role = keyof typeof ROLES;

export function isRole(value: string): value is Role {
  return value in ROLES;
}

export function actionsForRole(role: Role): readonly Action[] {
  return ROLES[role];
}
