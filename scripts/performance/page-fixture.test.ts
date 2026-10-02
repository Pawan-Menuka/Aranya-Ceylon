import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { phaseNineData, adminPageFixture, searchFixture } from './page-fixture.mjs';
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/catalog.json', import.meta.url), 'utf8'));
const data = phaseNineData(original, 625);
const query = (values: Record<string, string>) => new URLSearchParams(values);

describe('controlled625-row paging/search fixture oracle', () => {
  it('does not mutate the baseline snapshot and creates exact per-resource sizes', () => {
    expect(original.products[0].name).not.toMatch(/Phase Nine/);
    for (const key of ['products','blogs','recipes','gifts','audit']) expect(data[key]).toHaveLength(625);
  });
  it.each(['products','blogs','recipes','gifts','audit'])('exposes every %s row through stable bounded pages', resource => {
    const ids: string[] = []; let cursor: string | null = null;
    do {
      const response = adminPageFixture(data,resource,query({view:'page',limit:'100',...(cursor?{cursor}:{})}));
      const items = response[resource==='audit'?'items':resource];
      expect(items.length).toBeLessThanOrEqual(100);
      ids.push(...items.map((row:{id:string})=>row.id)); cursor=response.nextCursor;
      expect(ids.length).toBeLessThanOrEqual(625);
    } while(cursor);
    expect(ids).toHaveLength(625); expect(new Set(ids).size).toBe(625);
  });
  it('filters late category/status/SKU/stock rows and counts before limiting', () => {
    const rare=adminPageFixture(data,'products',query({view:'page',category:'Rare',status:'DRAFT'}));
    expect(rare.total).toBe(5);expect(rare.counts.all).toBe(25);expect(rare.products.map((row:{id:string})=>row.id)).toEqual(['p0621','p0622','p0623','p0624','p0625']);
    expect(adminPageFixture(data,'products',query({view:'page',lowStock:'true'})).total).toBe(25);
    expect(adminPageFixture(data,'products',query({view:'page',q:'EUR-0624'})).products[0].id).toBe('p0624');
    for(const resource of ['blogs','recipes','gifts']) expect(adminPageFixture(data,resource,query({view:'page',status:'DRAFT',q:'0625'})).total).toBe(1);
  });
  it('matches audit warning/job/actor/action/target semantics globally', () => {
    const all=adminPageFixture(data,'audit',query({view:'page'}));
    expect(all.counts).toEqual({all:625,admin:600,job:25,warn:12});
    expect(adminPageFixture(data,'audit',query({view:'page',q:'Order AC-000625',filter:'job'})).total).toBe(1);
    expect(adminPageFixture(data,'audit',query({view:'page',q:'order.refund',filter:'warn'})).total).toBe(12);
    expect(adminPageFixture(data,'audit',query({view:'page',actorId:'fixture-admin',q:'synthetic note'})).total).toBe(600);
  });
  it.each(['LOCAL','INTERNATIONAL'])('matches complete search/currency paging for %s', market => {
    for(const sort of ['relevance','price-asc','price-desc','rating']) {
      const ids:string[]=[];const prices:number[]=[];let cursor:string|null=null;
      do {
        const response=searchFixture(data,query({q:'warm cinn',sort,resource:'products',limit:'100',...(cursor?{productCursor:cursor}:{})}),market);
        expect(response.products.total).toBe(590);expect(response.journal.total).toBe(600);
        expect(response.products.items.length).toBeLessThanOrEqual(100);
        for(const item of response.products.items) {
          ids.push(item.id);expect(item.description).toBeUndefined();
          const price=Number(item.variants.find((v:{currency:string;weight:number})=>v.currency===(market==='LOCAL'?'LKR':'USD')&&v.weight===100)?.price??0);
          prices.push(market==='LOCAL'?Math.round(price):price);
        }
        cursor=response.products.nextCursor;expect(ids.length).toBeLessThanOrEqual(590);
      } while(cursor);
      expect(ids).toHaveLength(590);expect(new Set(ids).size).toBe(590);
      if(sort.startsWith('price'))expect(prices).toEqual([...prices].sort((a,b)=>sort==='price-asc'?a-b:b-a));
    }
  });
  it('returns initial20 matching cards and metadata, partial descriptions, fixed author, and no empty query catalogue', () => {
    const response=searchFixture(data,query({q:'warm cinn'}),'LOCAL');
    expect(response.products.items).toHaveLength(20);expect(response.journal.items).toHaveLength(20);
    expect(response.products.total).toBe(590);expect(response.journal.total).toBe(600);
    expect(response.journal.items[0].content).toBeUndefined();
    expect(searchFixture(data,query({q:'velv warm'}),'LOCAL').products.total).toBe(590);
    expect(searchFixture(data,query({q:'aranya cey'}),'LOCAL').journal.total).toBe(600);
    expect(searchFixture(data,query({}),'LOCAL').products.total).toBe(0);
  });
  it('rejects foreign cursors while allowing resource-only continuation and changed bounded page sizes', () => {
    const first=searchFixture(data,query({q:'warm cinn'}),'LOCAL');
    const cursor=first.products.nextCursor;
    expect(()=>searchFixture(data,query({q:'other',productCursor:cursor}),'LOCAL')).toThrow();
    expect(()=>searchFixture(data,query({q:'warm cinn',productCursor:cursor}),'INTERNATIONAL')).toThrow();
    expect(()=>searchFixture(data,query({q:'warm cinn',sort:'rating',productCursor:cursor}),'LOCAL')).toThrow();
    expect(()=>searchFixture(data,query({q:'warm cinn',journalCursor:cursor}),'LOCAL')).toThrow();
    const more=searchFixture(data,query({q:'warm cinn',resource:'products',limit:'100',productCursor:cursor}),'LOCAL');
    expect(more.products.items).toHaveLength(100);expect(more.journal.items).toHaveLength(0);
    expect(more.products.items.some((row:{id:string})=>first.products.items.some((previous:{id:string})=>previous.id===row.id))).toBe(false);
  });
});
