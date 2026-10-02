"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js/pure";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { pollOrderPaid, type StripeIntent } from "@/lib/api/checkout";

function StripePayForm({ orderId, totalLabel, onPaid, onError }: {
  orderId: string;
  totalLabel: string;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [paying, setPaying] = React.useState(false);
  const work = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => { work.current?.abort(); work.current = null; };
  }, [orderId]);

  const handlePay = async () => {
    if (!stripe || !elements || work.current) return;
    const controller = new AbortController();
    work.current = controller;
    setPaying(true);
    let submitted = false;
    try {
      const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
      // Stripe confirmation cannot be cancelled, but an unmounted form must not
      // start order reads or publish a stale success when that call completes.
      if (controller.signal.aborted) return;
      if (error) {
        onError(error.message ?? "Payment failed. Please try again.");
        return;
      }
      submitted = true;
      const paid = await pollOrderPaid(orderId, 12, 1500, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (paid) onPaid();
      else router.replace(`/checkout/success?orderId=${encodeURIComponent(orderId)}`);
    } catch (error) {
      if (!controller.signal.aborted) {
        onError(error instanceof Error ? error.message : "Payment failed. Please try again.");
      }
    } finally {
      // Once Stripe accepts confirmation, keep the action disabled while the
      // webhook/success route resolves; a delayed navigation must not re-pay.
      if (!submitted && !controller.signal.aborted) {
        if (work.current === controller) work.current = null;
        setPaying(false);
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="button"
        className="btn btn-intl"
        onClick={handlePay}
        disabled={!stripe || paying}
        style={{ opacity: !stripe || paying ? 0.72 : 1 }}
      >
        {paying ? "Processing payment…" : `Pay now — ${totalLabel}`}
      </button>
    </div>
  );
}

// This entire SDK boundary is requested only after a Stripe intent exists.
// The pure loader does not inject Stripe.js as a module-import side effect.
export function StripePaymentForm({ intent, totalLabel, onPaid, onError }: {
  intent: StripeIntent;
  totalLabel: string;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const stripePromise = React.useMemo(
    () => intent.publishableKey ? loadStripe(intent.publishableKey) : null,
    [intent.publishableKey],
  );
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: intent.clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0F6E56",
            colorText: "#1A1A1A",
            borderRadius: "8px",
            fontFamily: "var(--font-ui), system-ui, sans-serif",
          },
        },
      }}
    >
      <StripePayForm orderId={intent.orderId} totalLabel={totalLabel} onPaid={onPaid} onError={onError} />
    </Elements>
  );
}
