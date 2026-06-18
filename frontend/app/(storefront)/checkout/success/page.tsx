import { SuccessClient } from "./SuccessClient";

export const metadata = { title: "Order confirmed — Aranya Ceylon" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return <SuccessClient orderId={orderId ?? null} />;
}
