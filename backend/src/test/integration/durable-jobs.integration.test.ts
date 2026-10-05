import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { confirmOrderPaid } from '../../controllers/webhook.controller.js';
import { runBoundedLowStock, runBoundedPublications } from '../../jobs/leasedScheduler.js';
import { acquireJobLease } from '../../jobs/jobLease.js';
import { decryptOutboxPayload } from '../../lib/outbox.js';
import { createCatalogItem, prisma, resetIntegrationDatabase, uniqueTestId } from './helpers.js';
beforeEach(async()=>{await resetIntegrationDatabase();vi.stubEnv('OUTBOX_ENABLED','true');vi.stubEnv('OUTBOX_ACTIVE_KEY','fixture');vi.stubEnv('OUTBOX_ENCRYPTION_KEYS',JSON.stringify({fixture:Buffer.alloc(32,9).toString('base64')}));vi.stubEnv('LOW_STOCK_THRESHOLD','10');vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('External transport forbidden in transaction tests')}));});
afterAll(async()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();await resetIntegrationDatabase();await prisma.$disconnect();});
it('queues exactly one customer and merchant email for20 concurrent payment confirmations',async()=>{
 const{product,variant}=await createCatalogItem({prefix:uniqueTestId('durable-payment'),stock:8});
 const order=await prisma.order.create({data:{status:'PENDING',guestEmail:'fixture@example.invalid',total:'20.00',shippingCost:'0',market:'INTERNATIONAL',currency:'USD',shippingAddress:{},items:{create:{productId:product.id,variantId:variant.id,quantity:2,unitPrice:'10.00'}}}});
 await Promise.all(Array.from({length:20},()=>confirmOrderPaid(order.id,'fixture-payment','stub')));
 expect((await prisma.order.findUniqueOrThrow({where:{id:order.id}})).status).toBe('PAID');expect(await prisma.orderEvent.count({where:{orderId:order.id,status:'PAID'}})).toBe(1);
 const rows=await prisma.outboxMessage.findMany();expect(rows).toHaveLength(2);expect(new Set(rows.map(row=>row.dedupeKey))).toEqual(new Set([`paid:${order.id}:customer`,`paid:${order.id}:merchant`]));
 for(const row of rows){expect(row.encryptedPayload).not.toContain('fixture@example.invalid');expect(decryptOutboxPayload(row.encryptedPayload,`${row.id}:EMAIL:1`)).toMatchObject({mail:{html:expect.any(String)}});}
 expect((await prisma.variant.findUniqueOrThrow({where:{id:variant.id}})).stock).toBe(8);expect(globalThis.fetch).not.toHaveBeenCalled();
});
it('resumes low-stock scans beyond2000 rows without requeuing completed pages',async()=>{
 const{product}=await createCatalogItem({prefix:uniqueTestId('bounded-stock'),stock:100});
 await prisma.variant.createMany({data:Array.from({length:2201},(_,i)=>({id:`fair-${String(i).padStart(5,'0')}`,productId:product.id,weight:200+i,price:'1',sku:`fair-sku-${i}`,stock:5,market:'INTERNATIONAL',currency:'USD'}))});
 const lease=(await acquireJobLease('fair-low-stock'))!;
 try{expect(await runBoundedLowStock(lease)).toBe(2000);expect(await prisma.outboxMessage.count()).toBe(10);expect(await runBoundedLowStock(lease)).toBe(201);expect(await prisma.outboxMessage.count()).toBe(12);expect(await runBoundedLowStock(lease)).toBe(0);expect(await prisma.outboxMessage.count()).toBe(12);expect((await prisma.jobCheckpoint.findUniqueOrThrow({where:{name:'low-stock'}})).cursor).toBeNull();}
 finally{await lease.release();}expect(globalThis.fetch).not.toHaveBeenCalled();
});
it('bounds due publications to200 and makes stale worker writes fail before changes',async()=>{
 const user=await prisma.user.create({data:{email:'fixture-author@example.invalid',name:'Fixture',passwordHash:'unused'}});
 await prisma.blog.createMany({data:Array.from({length:205},(_,i)=>({id:`scheduled-${String(i).padStart(4,'0')}`,title:'Fixture',slug:`scheduled-fixture-${i}`,content:'Fixture content',authorId:user.id,status:'SCHEDULED',scheduledAt:new Date(0)}))});
 const lease=(await acquireJobLease('bounded-publications'))!;
 try{expect(await runBoundedPublications(lease)).toBe(200);expect(await prisma.blog.count({where:{status:'PUBLISHED'}})).toBe(200);expect(await prisma.outboxMessage.count()).toBe(200);await prisma.jobLease.update({where:{name:lease.name},data:{expiresAt:new Date(0)}});const next=(await acquireJobLease(lease.name))!;try{await expect(runBoundedPublications(lease)).rejects.toThrow('JOB_LEASE_LOST');expect(await prisma.blog.count({where:{status:'SCHEDULED'}})).toBe(5);}finally{await next.release();}}
 finally{await lease.release();}
});
