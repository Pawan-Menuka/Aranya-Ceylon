// Content itself identifies a version: edits cannot reuse an older clean value.
// Both entry and byte bounds prevent arbitrary authored text growing memory.
export function cachedContent(clean: (dirty: string) => string, maxEntries = 128, maxChars = 524288) {
  const cache = new Map<string, string>();
  let chars = 0;
  return (dirty: string): string => {
    const previous = cache.get(dirty);
    if (previous !== undefined) {
      cache.delete(dirty); cache.set(dirty, previous);
      return previous;
    }
    const value = clean(dirty);
    const cost = dirty.length + value.length;
    if (cost > maxChars || maxEntries < 1) return value;
    while (cache.size && (cache.size >= maxEntries || chars + cost > maxChars)) {
      const oldest = cache.keys().next().value as string;
      chars -= oldest.length + cache.get(oldest)!.length;
      cache.delete(oldest);
    }
    cache.set(dirty, value); chars += cost;
    return value;
  };
}
