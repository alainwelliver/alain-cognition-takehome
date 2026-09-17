import type { ReasonCode } from "./reasons";

export const REASON_LABELS: Record<ReasonCode, string> = {
  duplicate_charge: "Charged twice for the same thing",
  item_not_received: "Customer never received the item",
  product_defective: "Product was faulty or damaged",
  customer_goodwill: "Goodwill gesture to keep the customer happy",
};

export const NOTE_LABEL = "Notes for the approver: why this refund is justified (optional)";
