"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAuditLog, AdminAuditLogPage } from "@/lib/api/admin-types";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  // filters (applied)
  const [event, setEvent] = useState("");
  const [targetType, setTargetType] = useState("");

  const fetchPage = useCallback(
    async (after: string | null) => {
      const qs = new URLSearchParams({ limit: "50" });
      if (event) qs.set("event", event);
      if (targetType) qs.set("targetType", targetType);
      if (after) qs.set("cursor", after);
      const res = await fetch(`/api/admin/audit-logs?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as AdminAuditLogPage;
    },
    [event, targetType],
  );

  const load = useCallback(async () => {
    setState("loading");
    try {
      const data = await fetchPage(null);
      setLogs(data.items ?? []);
      setCursor(data.nextCursor);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [fetchPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(cursor);
      setLogs((prev) => [...prev, ...(data.items ?? [])]);
      setCursor(data.nextCursor);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <h1 className="disp" style={{ fontSize: "clamp(28px,3vw,40px)", margin: "0 0 20px", color: "var(--ink)" }}>
        Audit log
      </h1>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
        style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", marginBottom: 24 }}
      >
        <div>
          <label style={fLabel}>Event</label>
          <input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="e.g. ORDER_REFUND" style={fInput} />
        </div>
        <div>
          <label style={fLabel}>Target type</label>
          <input value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="e.g. Order" style={fInput} />
        </div>
        <button type="submit" className="btn btn-intl">Filter</button>
        {(event || targetType) && (
          <button
            type="button"
            onClick={() => {
              setEvent("");
              setTargetType("");
            }}
            style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}
          >
            Clear
          </button>
        )}
      </form>

      {state === "loading" && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {state === "error" && <p style={{ color: "#B23B3B" }}>Couldn’t load the audit log.</p>}
      {state === "ready" && logs.length === 0 && <p style={{ color: "var(--muted)" }}>No matching activity.</p>}

      {state === "ready" && logs.length > 0 && (
        <>
          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "var(--surface)", textAlign: "left" }}>
                  <Th>Event</Th>
                  <Th>Target</Th>
                  <Th>Actor</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <Td><strong>{log.event}</strong></Td>
                    <Td style={{ color: "var(--muted)" }}>
                      {log.targetType ?? "—"}
                      {log.targetId ? <code style={{ fontSize: 12 }}> · {log.targetId.slice(-8)}</code> : null}
                    </Td>
                    <Td>{log.actor ? log.actor.name : <span style={{ color: "var(--muted)" }}>system</span>}</Td>
                    <Td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{new Date(log.createdAt).toLocaleString("en-US")}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ marginTop: 18, fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 600, color: "var(--brand)", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 18px", cursor: loadingMore ? "default" : "pointer" }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const fLabel = { display: "block", fontFamily: "var(--font-ui), sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: ".04em" } as const;
const fInput = { fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" } as const;

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "11px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "11px 16px", ...style }}>{children}</td>;
}
