/**
 * #1 — a direct browser navigation (the email-verification link) sends no
 * Origin header at all, and production CORS was rejecting it as if it were
 * a disallowed cross-origin fetch.
 */
import { describe, it, expect } from 'vitest';
import { isOriginAllowed } from './cors.js';

const ALLOWED = ['https://aranyaceylon.com', 'http://localhost:3000'];

describe('isOriginAllowed', () => {
    it('allows a missing origin in production (direct navigation, e.g. an email link)', () => {
        expect(isOriginAllowed(undefined, ALLOWED, false)).toBe(true);
    });

    it('allows a missing origin in development too', () => {
        expect(isOriginAllowed(undefined, ALLOWED, true)).toBe(true);
    });

    it('allows an origin on the allowlist in production', () => {
        expect(isOriginAllowed('https://aranyaceylon.com', ALLOWED, false)).toBe(true);
    });

    it('rejects an origin not on the allowlist in production', () => {
        expect(isOriginAllowed('https://evil.example', ALLOWED, false)).toBe(false);
    });

    it('allows any present origin in development', () => {
        expect(isOriginAllowed('https://evil.example', ALLOWED, true)).toBe(true);
    });
});
