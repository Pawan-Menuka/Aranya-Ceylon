// Minimal client-side CSV export used by the admin console export buttons.
// Builds a CSV from a header list + row objects and triggers a browser download.
// Values are quoted and internal quotes escaped so commas/newlines are safe.

function escapeCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  // Formula-injection guard (GAP-04): Excel/Sheets execute a cell that begins
  // with = + - @ (or a leading control char), so a value like a customer name
  // `=HYPERLINK(...)` would run on open. Prefix such cells with a single quote
  // so they render as literal text.
  if (/^[=+\-@\t\r\n]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>, keys?: string[]): string {
  const cols = keys ?? headers;
  const head = headers.map(escapeCell).join(",");
  const body = rows.map((r) => cols.map((k) => escapeCell(r[k])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Convenience: build + download in one call.
export function exportCsv(
  filename: string,
  headers: string[],
  rows: Array<Record<string, unknown>>,
  keys?: string[],
): void {
  downloadCsv(filename, toCsv(headers, rows, keys));
}
