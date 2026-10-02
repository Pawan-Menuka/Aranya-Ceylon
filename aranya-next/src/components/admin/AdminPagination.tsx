"use client";
import { AIcon } from "./AdminPrimitives";
export function AdminPagination({ page, size, label }: { page: {
  total: number; pageIndex: number; loading: boolean; nextCursor: string | null;
  previous: () => void; next: () => void; refresh: () => void; error: string | null;
}; size: number; label: string }) {
  return <>
    {page.error && <div role="alert" style={{ marginTop: 16, color: "var(--neg)", fontSize: 13 }}>{page.error} <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => page.refresh()}>Try again</button></div>}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 12.5, color: "var(--ad-faint)" }}>
      <span>{page.loading ? `Loading ${label}…` : `Showing ${page.total === 0 ? 0 : page.pageIndex * 20 + 1}–${page.pageIndex * 20 + size} of ${page.total} ${label}`}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={page.pageIndex === 0 || page.loading} style={{ opacity: page.pageIndex === 0 ? 0.5 : 1 }} onClick={page.previous}><AIcon name="chevronL" size={14} stroke="var(--ad-muted)" />Prev</button>
        <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={!page.nextCursor || page.loading} onClick={page.next}>Next<AIcon name="chevronR" size={14} stroke="var(--ad-muted)" /></button>
      </div>
    </div>
  </>;
}
