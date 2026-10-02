import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
const audit = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../../services/audit.service.js', () => ({ writeAuditLog: audit }));
vi.mock('../../lib/revalidate.js', () => ({ revalidateFrontend: vi.fn(async () => undefined) }));
import { createRecipe, updateRecipe } from '../../controllers/admin/recipe.admin.controller.js';
import { decryptOutboxPayload } from '../../lib/outbox.js';
import { assertIntegrationDatabase, prisma, resetIntegrationDatabase, responseRecorder } from './helpers.js';
import { requestDouble } from '../httpDoubles.js';
const input = { title: 'Fixture recipe', slug: 'fixture-recipe', dek: 'Fixture recipe summary', course: 'Mains', status: 'PUBLISHED' };
beforeEach(async () => {
    assertIntegrationDatabase(); await resetIntegrationDatabase(); audit.mockReset().mockResolvedValue(undefined);
    vi.stubEnv('OUTBOX_ENABLED', 'true'); vi.stubEnv('OUTBOX_ACTIVE_KEY', 'fixture');
    vi.stubEnv('OUTBOX_ENCRYPTION_KEYS', JSON.stringify({ fixture: Buffer.alloc(32, 7).toString('base64') }));
});
afterAll(async () => { vi.unstubAllEnvs(); await resetIntegrationDatabase(); await prisma.$disconnect(); });
describe('transactional public mutation invalidation', () => {
    it('keeps a committed queue event when the subsequent audit fails', async () => {
        audit.mockRejectedValueOnce(new Error('audit offline'));
        await expect(createRecipe(requestDouble({ body: input }), responseRecorder().response)).rejects.toThrow('audit offline');
        expect(await prisma.recipe.count()).toBe(1);
        const row = await prisma.outboxMessage.findFirstOrThrow();
        expect(row.kind).toBe('REVALIDATION');
        expect(decryptOutboxPayload(row.encryptedPayload, `${row.id}:REVALIDATION:1`)).toEqual({ paths: ['/recipes', '/search', '/recipes/fixture-recipe'] });
    });
    it('freezes old and new slug dependencies inside the successful update transaction', async () => {
        await createRecipe(requestDouble({ body: input }), responseRecorder().response);
        const recipe = await prisma.recipe.findFirstOrThrow();
        await updateRecipe(requestDouble({ params: { id: recipe.id }, body: { slug: 'renamed-recipe' } }), responseRecorder().response);
        const rows = await prisma.outboxMessage.findMany();
        expect(rows).toHaveLength(2);
        const payloads = rows.map(row => decryptOutboxPayload(row.encryptedPayload, `${row.id}:REVALIDATION:1`));
        expect(payloads).toContainEqual({ paths: ['/recipes', '/search', '/recipes/fixture-recipe', '/recipes/renamed-recipe'] });
    });
    it('rolls back the business write if durable enqueue fails', async () => {
        // Deliberately reject only this event kind on the disposable test database.
        await prisma.$executeRaw`ALTER TABLE "OutboxMessage" ADD CONSTRAINT fixture_revalidation_reject CHECK (kind <> 'REVALIDATION')`;
        try {
            await expect(createRecipe(requestDouble({ body: input }), responseRecorder().response)).rejects.toThrow();
            expect(await prisma.recipe.count()).toBe(0); expect(await prisma.outboxMessage.count()).toBe(0);
            expect(audit).not.toHaveBeenCalled();
        } finally {
            await prisma.$executeRaw`ALTER TABLE "OutboxMessage" DROP CONSTRAINT fixture_revalidation_reject`;
        }
    });
});
