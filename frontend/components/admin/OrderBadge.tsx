import { STATUS_LABEL, STATUS_COLOR } from "./orderStatus";

export function OrderBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "var(--muted)";
  return (
    <span
      style={{
        fontFamily: "var(--font-ui), sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
