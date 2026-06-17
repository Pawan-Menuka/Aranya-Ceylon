// ---- Badge (ported from shared.jsx) ----
type BadgeKind = "Bestseller" | "GI Certified" | "In Stock" | "New";

export function Badge({ kind = "In Stock", solid = false }: { kind?: BadgeKind | string; solid?: boolean }) {
  const map: Record<string, { bg: string; fg: string; line: string; dot: string }> = {
    Bestseller: { bg: "#BA7517", fg: "#fff", line: "#BA7517", dot: "#fff" },
    "GI Certified": { bg: "#0F6E56", fg: "#fff", line: "#0F6E56", dot: "#fff" },
    "In Stock": { bg: "#1D9E75", fg: "#fff", line: "#1D9E75", dot: "#fff" },
    New: { bg: "#1A1A1A", fg: "#fff", line: "#1A1A1A", dot: "#fff" },
  };
  const c = map[kind] || map["In Stock"];
  const base: React.CSSProperties = {
    fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em",
    textTransform: "uppercase", padding: "5px 9px", borderRadius: 999, display: "inline-flex",
    alignItems: "center", gap: 5, lineHeight: 1, whiteSpace: "nowrap",
  };
  if (solid)
    return (
      <span style={{ ...base, background: c.bg, color: c.fg }}>
        {kind === "In Stock" && <span style={{ width: 5, height: 5, borderRadius: 9, background: c.dot }} />}
        {kind}
      </span>
    );
  return (
    <span style={{ ...base, background: "rgba(253,250,245,.92)", color: c.line, border: `1px solid ${c.line}`, backdropFilter: "blur(2px)" }}>
      {kind === "In Stock" && <span style={{ width: 5, height: 5, borderRadius: 9, background: c.line }} />}
      {kind}
    </span>
  );
}
