// ---- Star rating (ported from shared.jsx) ----
export function Stars({
  rating = 4.8,
  reviews,
  size = 13,
  showNum = true,
}: {
  rating?: number;
  reviews?: number | null;
  size?: number;
  showNum?: boolean;
}) {
  const full = Math.floor(rating);
  const frac = rating - full;
  const star = (fill: string) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <defs>
        <linearGradient id={"g" + fill} x1="0" x2="1" y1="0" y2="0">
          <stop offset={fill} stopColor="#BA7517" />
          <stop offset={fill} stopColor="#D9CDBA" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 18l-6 3.4 1.4-6.8L2.3 9.9l6.9-.8z"
        fill={fill === "100%" ? "#BA7517" : fill === "0%" ? "#D9CDBA" : `url(#g${fill})`}
      />
    </svg>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const f = i < full ? "100%" : i === full && frac > 0 ? Math.round(frac * 100) + "%" : "0%";
          return <span key={i}>{star(f)}</span>;
        })}
      </div>
      {showNum && (
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
          {rating.toFixed(1)}
          {reviews != null && <span style={{ fontWeight: 500 }}> ({reviews})</span>}
        </span>
      )}
    </div>
  );
}
