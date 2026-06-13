// Shared styles for the auth forms (login / register).
export const authCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  background: "var(--surface)",
  borderRadius: "var(--radius)",
  padding: 28,
};

export const authLabel: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui), sans-serif",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 6,
};

export const authInput: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  background: "#fff",
  fontFamily: "var(--font-ui), sans-serif",
  fontSize: 14,
  color: "var(--ink)",
};
