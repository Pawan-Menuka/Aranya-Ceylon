// Shared order-status presentation + the transitions an admin can apply.
export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const STATUS_COLOR: Record<string, string> = {
  PAID: "var(--brand)",
  PROCESSING: "var(--accent)",
  SHIPPED: "var(--brand-2)",
  DELIVERED: "var(--brand-2)",
  PENDING: "var(--muted)",
  CANCELLED: "#B23B3B",
  REFUNDED: "#B23B3B",
};

// Values the backend updateOrderSchema accepts.
export const SETTABLE_STATUSES = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;

// Refund is only allowed by the backend for PAID/PROCESSING orders.
export const REFUNDABLE = ["PAID", "PROCESSING"];
