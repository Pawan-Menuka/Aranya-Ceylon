import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
export const frontendRequire = createRequire(new URL("../../aranya-next/package.json", import.meta.url));
const ts = frontendRequire("typescript") as typeof import("typescript");
export function loadFrontend<T>(relative: string, imports: Record<string, unknown>, globals: Record<string, unknown> = {}): T {
  const source = readFileSync(new URL("../../aranya-next/src/" + relative, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  const module = { exports: {} };
  runInNewContext(compiled, { ...globals, module, exports: module.exports, Error, AbortController, setTimeout, clearTimeout,
    require: (name: string) => { if (!(name in imports)) throw new Error(`Unexpected frontend import: ${name}`); return imports[name]; } });
  return module.exports as T;
}
// Controlled hooks run the real component/controller source. This follows the
// existing auth/cart regression harness, avoiding browsers or extra packages.
export function hookHost() {
  const host = { cells: [] as any[], index: 0, effects: [] as (() => void)[], dirty: false };
  const same = (a?: unknown[], b?: unknown[]) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (fn: () => unknown, deps: unknown[]) => { const i = host.index++, old = host.cells[i]; if (!old || !same(old.deps, deps)) host.cells[i] = { deps, value: fn() }; return host.cells[i].value; };
  const react = {
    createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props: { ...(props as object), children } }), Fragment: Symbol("Fragment"),
    useMemo: memo, useCallback: (fn: unknown, deps: unknown[]) => memo(() => fn, deps),
    useRef: (initial: unknown) => { const i = host.index++; if (!(i in host.cells)) host.cells[i] = { current: initial }; return host.cells[i]; },
    useState: (initial: any) => { const i = host.index++; if (!(i in host.cells)) host.cells[i] = typeof initial === "function" ? initial() : initial; return [host.cells[i], (next: any) => { host.cells[i] = typeof next === "function" ? next(host.cells[i]) : next; host.dirty = true; }]; },
    useEffect: (effect: () => void | (() => void), deps?: unknown[]) => { const i = host.index++, old = host.cells[i]; if (!old || !same(old.deps, deps)) { host.cells[i] = { deps, cleanup: old?.cleanup }; host.effects.push(() => { old?.cleanup?.(); host.cells[i].cleanup = effect(); }); } },
  };
  let render: () => unknown;
  let value: unknown;
  const settle = () => { for (let i = 0; i < 30; i++) { host.dirty = false; host.index = 0; value = render(); for (const effect of host.effects.splice(0)) effect(); if (!host.dirty) return; } throw new Error("Frontend hooks did not settle."); };
  return { react, mount: <T>(fn: () => T) => { render = fn; settle(); return value as T; }, render: settle,
    value: <T>() => value as T,
    flush: async () => { for (let i = 0; i < 20; i++) { await Promise.resolve(); if (host.dirty) settle(); } },
    unmount: () => { for (const cell of host.cells) cell?.cleanup?.(); },
  };
}
export function nodes(tree: any, predicate: (node: any) => boolean): any[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(item => nodes(item, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
export function text(tree: any): string { return typeof tree === "string" || typeof tree === "number" ? String(tree) : Array.isArray(tree) ? tree.map(text).join("") : tree?.props ? text(tree.props.children) : ""; }
