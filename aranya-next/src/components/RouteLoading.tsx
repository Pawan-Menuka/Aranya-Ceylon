import { SiteChrome } from "./SiteChrome";

// Only the pending state uses this shell. Completed-page markup is unchanged.
export function RouteLoading({ label = "page", chrome = true }: { label?: string; chrome?: boolean }) {
  const content = (
    <main data-route-loading aria-busy="true" style={{ padding: "154px 24px 80px", minHeight: "100vh", maxWidth: 1180, margin: "0 auto" }}>
      <p role="status" style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>Loading {label}…</p>
      <div aria-hidden="true" style={{ height: 30, width: "min(320px, 65%)", background: "var(--surface)", borderRadius: "var(--radius)", margin: "28px 0" }} />
      <div aria-hidden="true" style={{ height: 180, background: "var(--surface)", borderRadius: "var(--radius)" }} />
    </main>
  );
  return chrome ? <SiteChrome>{content}</SiteChrome> : content;
}
