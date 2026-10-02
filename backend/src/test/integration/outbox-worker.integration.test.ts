// Provider transports are mocked; all database effects use only the owned integration cluster.
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
const delivery = vi.hoisted(() => ({ email: vi.fn(), revalidation: vi.fn() }));
vi.mock('../../services/email.service.js', async original => ({ ...await original<Record<string, unknown>>(), deliverQueuedEmail: delivery.email }));
vi.mock('../../lib/revalidate.js', async original => ({ ...await original<Record<string, unknown>>(), deliverRevalidation: delivery.revalidation }));
import { enqueueOutbox } from '../../lib/outbox.js';
import { claimOutboxBatch, processOutboxMessage } from '../../jobs/outboxWorker.js';
import { prisma, resetIntegrationDatabase } from './helpers.js';
beforeEach(async () => { await resetIntegrationDatabase(); vi.stubEnv('OUTBOX_ENABLED','true'); vi.stubEnv('OUTBOX_ACTIVE_KEY','test'); vi.stubEnv('OUTBOX_ENCRYPTION_KEYS',JSON.stringify({test:Buffer.alloc(32,6).toString('base64')})); delivery.email.mockReset().mockResolvedValue('fixture-receipt'); delivery.revalidation.mockReset().mockResolvedValue(undefined); });
afterAll(async () => { vi.unstubAllEnvs(); await resetIntegrationDatabase(); await prisma.$disconnect(); });
async function seed(n=3) { for(let i=0;i<n;i++) await prisma.$transaction(tx=>enqueueOutbox(tx,{kind:'EMAIL',dedupeKey:`worker-fixture:${i}`,payload:{mail:{from:'fixture@example.invalid',to:'fixture@example.invalid',subject:'Fixture',html:'Frozen fixture'}}})); }
it('claims disjoint rows using SKIP LOCKED and fences a reclaimed old owner',async()=>{
 await seed(); const[first,second]=await Promise.all([claimOutboxBatch(),claimOutboxBatch()]); expect(new Set([...first,...second].map(row=>row.id)).size).toBe(3);
 const row=first[0]!; await prisma.outboxMessage.update({where:{id:row.id},data:{leaseExpiresAt:new Date(0)}});
 const[reclaimed]=await claimOutboxBatch(1); expect(reclaimed!.leaseToken).not.toBe(row.leaseToken);
 await processOutboxMessage(row); expect(delivery.email).not.toHaveBeenCalled(); await processOutboxMessage(reclaimed!);
 expect(delivery.email).toHaveBeenCalledOnce(); expect((await prisma.outboxMessage.findUniqueOrThrow({where:{id:row.id}})).status).toBe('DELIVERED');
});
it('reuses the exact provider key and frozen payload after an ambiguous delivery',async()=>{
 await seed(1); const[row]=await claimOutboxBatch(); delivery.email.mockRejectedValueOnce(new Error('Mock interrupted after acceptance'));
 await processOutboxMessage(row!); expect((await prisma.outboxMessage.findUniqueOrThrow({where:{id:row!.id}})).status).toBe('PENDING');
 await prisma.outboxMessage.update({where:{id:row!.id},data:{availableAt:new Date(0)}}); const[retry]=await claimOutboxBatch(); await processOutboxMessage(retry!);
 expect(delivery.email.mock.calls[1]).toEqual(delivery.email.mock.calls[0]); expect((await prisma.outboxMessage.findUniqueOrThrow({where:{id:row!.id}})).attempts).toBe(2);
});
it('dead-letters expired authentication messages before transport',async()=>{
 await prisma.$transaction(tx=>enqueueOutbox(tx,{kind:'EMAIL',dedupeKey:'expired-fixture',payload:{mail:{html:'token'}},expiresAt:new Date(0)})); const[row]=await claimOutboxBatch(); await processOutboxMessage(row!);
 expect(delivery.email).not.toHaveBeenCalled(); expect((await prisma.outboxMessage.findUniqueOrThrow({where:{id:row!.id}})).lastErrorCode).toBe('EXPIRED');
});
