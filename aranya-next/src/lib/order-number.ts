// Orders are keyed by cuid in the database and there is no separate order-number
// column, so the customer-facing number is derived from the id. Every surface
// that shows an order identifier must go through this helper — a customer quotes
// "AC-7XFLYS" in a support email, and the audit log has to match it.
export function formatOrderNumber(orderId: string): string {
  return `AC-${orderId.slice(-6).toUpperCase()}`;
}
