"use client";
import * as React from "react";
import type { AdminPageMeta } from "@/lib/api/admin";

export type AdminPage<T> = AdminPageMeta & { items: T[] };
type Position = { scope: string; cursor: string | undefined; history: (string | undefined)[] };

// A scope includes every filter. A changed scope starts at page one immediately,
// before effects run, and aborted requests can never overwrite newer results.
export function useAdminPage<T>(scope: string, load: (cursor: string | undefined, signal: AbortSignal) => Promise<AdminPage<T>>, onItems: React.Dispatch<React.SetStateAction<T[]>>) {
  const [position, setPosition] = React.useState<Position>({ scope, cursor: undefined, history: [] });
  const [revision, setRevision] = React.useState(0);
  const [result, setResult] = React.useState<AdminPageMeta & { scope: string } | null>(null);
  const [loadState, setLoadState] = React.useState<"loading" | "loaded" | "failed">("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const exportController = React.useRef<AbortController | null>(null);
  const current = position.scope === scope ? position : { scope, cursor: undefined, history: [] };
  const cursor = current.cursor;
  React.useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading"); setError(null);
    const timer = setTimeout(() => {
      load(cursor, controller.signal).then(page => {
        if (controller.signal.aborted) return;
        // Removing the last matching row on a later page returns to its previous
        // cursor. Re-query there so counts and filters remain authoritative.
        if (!page.items.length && cursor) {
          setPosition(previous => {
            const history = previous.scope === scope ? [...previous.history] : [];
            const previousCursor = history.pop();
            return { scope, cursor: previousCursor, history };
          });
          return;
        }
        onItems(page.items); setResult({ total: page.total, counts: page.counts, nextCursor: page.nextCursor, hasNextPage: page.hasNextPage, scope }); setLoadState("loaded");
      }).catch(failure => {
        if (controller.signal.aborted) return;
        setError(failure instanceof Error ? failure.message : "The list could not be loaded. Please try again.");
        setLoadState("failed");
      });
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [scope, cursor, load, onItems, revision]);
  React.useEffect(() => () => exportController.current?.abort(), []);
  const refresh = (first = false) => {
    if (first) setPosition({ scope, cursor: undefined, history: [] });
    setRevision(value => value + 1);
  };
  const previous = () => { const history = [...current.history]; const previousCursor = history.pop(); setPosition({ scope, cursor: previousCursor, history }); };
  const next = () => { if (result?.scope === scope && result.nextCursor) setPosition({ scope, cursor: result.nextCursor, history: [...current.history, cursor] }); };
  const exportAll = async <U,>(collect: (signal: AbortSignal) => Promise<U[]>, consume: (items: U[]) => void) => {
    exportController.current?.abort();
    const controller = new AbortController(); exportController.current = controller;
    setExporting(true); setError(null);
    try { const items = await collect(controller.signal); if (!controller.signal.aborted) consume(items); }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "The export could not be completed."); }
    finally { if (exportController.current === controller && !controller.signal.aborted) setExporting(false); }
  };
  const metadata = result?.scope === scope ? result : null;
  return { total: metadata?.total ?? 0, counts: metadata?.counts ?? {}, nextCursor: metadata?.nextCursor ?? null,
    hasLiveData: !!metadata, loadState, loading: loadState === "loading", error, exporting, exportAll, refresh, previous, next, pageIndex: current.history.length };
}
