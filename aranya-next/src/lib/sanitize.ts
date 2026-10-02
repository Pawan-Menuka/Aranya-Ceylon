
// Sanitises rich-text HTML before it is handed to dangerouslySetInnerHTML.
//
// Our long-form fields (blog/journal body, product story) are authored in the
// admin and may legitimately contain light formatting. They are still untrusted
// at render time — a compromised admin, or a DB field interpolated with product
// data, must not be able to inject <script>, event handlers, or javascript:
// URLs. DOMPurify strips all of that while keeping the allowed tags below.
//
// Called at server page boundaries only. Clients receive sanitized strings,
// keeping DOMPurify out of their bundles and avoiding work on each re-render.
import { cachedContent } from "./content-cache";
import type { SanitizedHtml } from "./sanitized-html";
const ALLOWED_TAGS = [
    "p", "br", "b", "strong", "i", "em", "u",
    "a", "ul", "ol", "li", "blockquote", "span",
];
const ALLOWED_ATTR = ["href", "title", "target", "rel"];

const cleanContent = cachedContent((dirty: string): string => {
    const DOMPurify = require("isomorphic-dompurify") as typeof import("isomorphic-dompurify");
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        // Block javascript:/data: URIs in href; allow normal links + mailto/tel.
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
});

export function sanitizeHtml(dirty: string): SanitizedHtml {
    if (typeof window !== "undefined") throw new Error("Rich text must be sanitized on the server.");
    return cleanContent(dirty) as SanitizedHtml;
}
