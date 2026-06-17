import * as React from "react";

// ---- Small stroke icon set (ported from shared.jsx) ----
type IconName = "search" | "user" | "bag" | "heart" | "chevron" | "eye" | "globe";

export function Icon({
  name,
  size = 19,
  stroke = "currentColor",
  w = 1.7,
}: {
  name: IconName;
  size?: number;
  stroke?: string;
  w?: number;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
    user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
    bag: (<><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
    heart: (<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />),
    chevron: <path d="M6 9l6 6 6-6" />,
    eye: (<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
    globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></>),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
