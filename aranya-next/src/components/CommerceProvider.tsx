"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Market } from "@/lib/types";
import { MarketProvider } from "./MarketContext";
import { CartProvider, useCart } from "./CartContext";
import { AuthProvider } from "./AuthContext";
const CartDrawer = dynamic(() => import("./cart/CartDrawer").then(module => module.CartDrawer), { ssr: false });
const SignInModal = dynamic(() => import("./cart/SignInModal").then(module => module.SignInModal), { ssr: false });

function CommerceDialogs() {
  const { open, signInOpen } = useCart();
  const [drawerRequested, setDrawerRequested] = React.useState(false);
  const [signInRequested, setSignInRequested] = React.useState(false);
  React.useEffect(() => {
    if (open) setDrawerRequested(true);
    if (signInOpen) setSignInRequested(true);
  }, [open, signInOpen]);
  // Keep a requested dialog mounted for closing transitions/form continuity.
  // Fresh visits neither render hidden cart rows nor request dialog chunks.
  return <>{(open || drawerRequested) && <CartDrawer />}{(signInOpen || signInRequested) && <SignInModal />}</>;
}

// One commerce shell for every page: market + cart + auth context, with the
// global cart drawer + sign-in modal mounted once so any component can open
// them. Home and inner pages both wrap their content in this.
export function CommerceProvider({ initialMarket, children }: { initialMarket: Market; children: React.ReactNode }) {
  return (
    <MarketProvider initial={initialMarket}>
      <AuthProvider>
        <CartProvider>
          {children}
          <CommerceDialogs />
        </CartProvider>
      </AuthProvider>
    </MarketProvider>
  );
}
