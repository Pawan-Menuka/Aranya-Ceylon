"use client";

import * as React from "react";

// Last-resort boundary — only fires when the ROOT layout itself throws (a
// font load failure, CommerceProvider crashing, etc.), which is exactly the
// scenario where nothing else in the tree can be trusted. Must define its
// own <html>/<body> (it replaces the root layout) and must not depend on
// globals.css, next/font, or any app component — those are the very things
// that may have just failed. Deliberately plain inline styles only.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#faf8f4",
          color: "#1a1a1a",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px" }}>
            Aranya Ceylon is having trouble loading.
          </h1>
          <p style={{ fontSize: 16, color: "#555", lineHeight: 1.5, margin: "0 0 24px" }}>
            Something went wrong at the page level. Please try again — if it
            keeps happening, come back in a few minutes.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              background: "#0f6e56",
              border: "none",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 12, color: "#888" }}>Reference: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
