// Fetch complete results without silently treating a capped first page as an
// index. Callers decide whether to display results progressively or all at once.
import { withRequestDeadline } from "./api/request-deadline";

export async function readPages<T>(load: (cursor: string | undefined, signal: AbortSignal) => Promise<{ items: T[]; nextCursor?: string | null }>, caller?: AbortSignal, budgetMs = 20000): Promise<T[]> {
  return withRequestDeadline(budgetMs, caller, async signal => {
  const result: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    signal?.throwIfAborted();
    const page = await load(cursor, signal);
    signal?.throwIfAborted();
    result.push(...page.items);
    const next = page.nextCursor;
    if (!next) return result;
    if (!page.items.length || seen.has(next)) throw new Error("The service returned an invalid next page.");
    seen.add(next); cursor = next;
  } while (cursor);
  return result;
  });
}
