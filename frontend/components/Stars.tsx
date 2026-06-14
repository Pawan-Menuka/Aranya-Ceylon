// Simple star rating display (filled/half/empty) in amber.
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span aria-label={`${rating.toFixed(1)} out of 5`} style={{ display: "inline-flex", gap: 2, color: "var(--accent)" }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = i < full ? "full" : i === full && half ? "half" : "empty";
        return <Star key={i} size={size} fill={fill} />;
      })}
    </span>
  );
}

function Star({ size, fill }: { size: number; fill: "full" | "half" | "empty" }) {
  const id = `half-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {fill === "half" && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="var(--accent)" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8z"
        fill={fill === "full" ? "var(--accent)" : fill === "half" ? `url(#${id})` : "none"}
        stroke="var(--accent)"
        strokeWidth="1.2"
      />
    </svg>
  );
}
