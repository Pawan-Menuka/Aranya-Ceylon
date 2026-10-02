// Only the server sanitizer can construct this value. It serializes as text.
export type SanitizedHtml = string & { readonly __sanitizedHtml: unique symbol };
