"use client";

import * as React from "react";
import type { Market } from "@/lib/types";
import { MarketProvider } from "./MarketContext";
import { CartProvider } from "./CartContext";
import { AuthProvider } from "./AuthContext";
import { CartDrawer } from "./cart/CartDrawer";
import { SignInModal } from "./cart/SignInModal";

// One commerce shell for every page: market + cart + auth context, with the
// global cart drawer + sign-in modal mounted once so any component can open
// them. Home and inner pages both wrap their content in this.
export function CommerceProvider({ initialMarket, children }: { initialMarket: Market; children: React.ReactNode }) {
  return (
    <MarketProvider initial={initialMarket}>
      <CartProvider>
        <AuthProvider>
          {children}
          <CartDrawer />
          <SignInModal />
        </AuthProvider>
      </CartProvider>
    </MarketProvider>
  );
}
