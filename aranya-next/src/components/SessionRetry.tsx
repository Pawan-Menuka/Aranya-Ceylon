"use client";

import { useAuth } from "./AuthContext";

export function SessionRetry() {
  const { sessionError, retrySession } = useAuth();
  return (
    <div role="alert" data-session-error style={{ padding: "120px 24px", textAlign: "center", minHeight: "60vh" }}>
      <p style={{ color: "var(--muted)" }}>{sessionError}</p>
      <button className="btn btn-intl" onClick={retrySession}>Try again</button>
    </div>
  );
}
