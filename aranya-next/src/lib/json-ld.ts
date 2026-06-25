// Serialises a JSON-LD object for safe inlining inside a <script type="application/ld+json">.
//
// The classic JSON-LD injection: a DB-sourced field (product name, article
// title, author) containing the literal string "</script>" breaks out of the
// script element. JSON.stringify does NOT escape "<", so we escape it (and the
// other HTML-significant chars) to their \uXXXX forms. The result is still valid
// JSON-LD — JSON parsers decode the escapes — but can no longer terminate the
// script tag or start an HTML comment.
export function jsonLdHtml(data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
}
