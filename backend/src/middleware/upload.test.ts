/**
 * Tests for validateImageContent — the magic-byte check that backs up multer's
 * (spoofable) Content-Type filter. The attack it stops: a payload labelled
 * image/png whose bytes are actually HTML/SVG/script.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { validateImageContent } from './upload.js';

// Minimal magic-byte prefixes for the three accepted formats.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const WEBP = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP', 'ascii'),
]);
// A spoofed "image" that is really an HTML/script payload.
const SPOOF = Buffer.from('<script>alert(1)</script>', 'utf8');

function file(buffer: Buffer, originalname = 'x'): Express.Multer.File {
    return { buffer, originalname } as Express.Multer.File;
}

function mockRes() {
    const res = {} as Response & { statusCode?: number; body?: unknown };
    res.status = vi.fn((n: number) => { res.statusCode = n; return res; }) as never;
    res.json = vi.fn((b: unknown) => { res.body = b; return res; }) as never;
    return res;
}

describe('validateImageContent', () => {
    it('passes real PNG/JPEG/WebP buffers through', () => {
        const next = vi.fn();
        const res = mockRes();
        validateImageContent({ files: [file(PNG), file(JPEG), file(WEBP)] } as unknown as Request, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects a spoofed Content-Type whose bytes are not an image', () => {
        const next = vi.fn();
        const res = mockRes();
        validateImageContent({ files: [file(SPOOF, 'evil.png')] } as unknown as Request, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
        expect((res.body as { error: string }).error).toContain('evil.png');
    });

    it('rejects the whole batch if any one file is not a real image', () => {
        const next = vi.fn();
        const res = mockRes();
        validateImageContent({ files: [file(PNG), file(SPOOF, 'bad.webp')] } as unknown as Request, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
    });

    it('is a no-op when there are no files', () => {
        const next = vi.fn();
        const res = mockRes();
        validateImageContent({} as Request, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
    });
});
