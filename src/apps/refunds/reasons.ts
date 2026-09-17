export const REASON_CODES = [
  "duplicate_charge",
  "item_not_received",
  "product_defective",
  "customer_goodwill",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export function isReasonCode(value: string): value is ReasonCode {
  return (REASON_CODES as readonly string[]).includes(value);
}
