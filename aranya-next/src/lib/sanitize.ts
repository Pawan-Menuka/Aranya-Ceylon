import DOMPurify from "isomorphic-dompurify";

// Sanitises rich-text HTML before it is handed to dangerouslySetInnerHTML.
//
// Our long-form fields (blog/journal body, product story) are authored in the
// admin and may legitimately contain light formatting. They are still untrusted
// at render time — a compromised admin, or a DB field interpolated with product
// data, must not be able to inject <script>, event handlers, or javascript:
// URLs. DOMPurify strips all of that while keeping the allowed tags below.
//
// isomorphic-dompurify runs on both the Node server (SSR) and the browser, so
// the markup is cleaned before it ever reaches the initial HTML — not just on
// the client.
const ALLOWED_TAGS = [
    "p", "br", "b", "strong", "i", "em", "u",
    "a", "ul", "ol", "li", "blockquote", "span",
];
const ALLOWED_ATTR = ["href", "title", "target", "rel"];

export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        // Block javascript:/data: URIs in href; allow normal links + mailto/tel.
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
}
