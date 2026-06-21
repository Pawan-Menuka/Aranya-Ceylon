// Triggers Next.js on-demand ISR revalidation for a single path.
// Non-fatal: if the request fails, the page revalidates on its next ISR cycle.
// Secret is sent as a header (not a query param) so it doesn't appear in logs.
// FRONTEND_URL may be comma-separated (CORS list); only the first origin is used.
export async function revalidateFrontend(path: string): Promise<void> {
    const secret = process.env.REVALIDATION_SECRET;
    const baseUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
        .split(',')[0]!
        .trim();

    if (!secret) return;

    try {
        await fetch(`${baseUrl}/api/revalidate?path=${encodeURIComponent(path)}`, {
            headers: { 'x-revalidate-secret': secret },
        });
    } catch {
        // Non-fatal — page will revalidate on next ISR cycle regardless
    }
}
