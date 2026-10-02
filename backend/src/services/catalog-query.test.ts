import {describe,it,expect} from 'vitest';
import {catalogFilterSchema,productFilterSchema} from '@aranya/shared';
import {buildCatalogPageQuery,buildLegacyProductPageQuery,decodeCatalogCursor,encodeCatalogCursor,buildProductNameLookupQuery} from './catalog-query.js';
describe('catalog SQL boundaries',()=>{
  it('ingredient names are bound parameters with stable active-market selection',()=>{
    const name="Cinnamon, ground'); DROP TABLE Product;--";
    const query=buildProductNameLookupQuery([name],'LOCAL');
    expect(query.text).not.toContain('DROP TABLE');expect(query.values).toContain(name);
    expect(query.text).toContain('DISTINCT ON (p.name)');expect(query.text).toContain('ORDER BY p.name ASC, p.id ASC');
  });
  it('binds a cursor to normalized filters, sort and market but permits a different page size',()=>{const filters=catalogFilterSchema.parse({view:'cards',flavour:'Warm,Floral,Warm',sort:'rating'});const cursor=encodeCatalogCursor('p','4.8',filters,'LOCAL',0,12);expect(decodeCatalogCursor({...filters,cursor,limit:2},'LOCAL')).toMatchObject({id:'p',secondary:12});expect(()=>decodeCatalogCursor({...filters,cursor},'INTERNATIONAL')).toThrow(/cursor/);expect(()=>decodeCatalogCursor({...filters,cursor,sort:'best'},'LOCAL')).toThrow(/cursor/);});
  it('orders numeric source keys instead of the serialized output alias and retains rating review ties',()=>{const f=catalogFilterSchema.parse({view:'cards',sort:'rating'}),q=buildCatalogPageQuery({...f,cursor:encodeCatalogCursor('p','4.8',f,'LOCAL',0,12)},'LOCAL');expect(q.text).toContain('ORDER BY ordered.priority DESC, ordered.key DESC, ordered.secondary DESC, ordered.id ASC');expect(q.values).toContain(12);expect(q.text).toContain('ordered.secondary <');});
  it('parameterizes untrusted facet values and bounds page size rather than scanning 500 products',()=>{const f=catalogFilterSchema.parse({view:'cards',origin:"x'); DROP TABLE Product;--"}),q=buildCatalogPageQuery(f,'LOCAL');expect(q.text).not.toContain('DROP TABLE');expect(q.values).toContain("x'); DROP TABLE Product;--");expect(q.values.at(-1)).toBe(9);expect(()=>catalogFilterSchema.parse({view:'cards',limit:41})).toThrow();});
  it('legacy search applies category, featured and both price bounds before rank/cursor',()=>{const f=productFilterSchema.parse({search:'cinnamon',category:'ground',featured:'false',minPrice:5,maxPrice:20,cursor:'old'}),q=buildLegacyProductPageQuery(f,'INTERNATIONAL');expect(q.values).toEqual(expect.arrayContaining(['cinnamon','ground',false,5,20,'old']));expect(q.text).toContain('EXISTS (SELECT 1 FROM "Variant"');expect(q.text).toContain('ts_rank');expect(q.text).not.toContain('500');});
  it('rejects malformed and foreign cursor payloads as safe client errors',()=>{const f=catalogFilterSchema.parse({view:'cards'});try{decodeCatalogCursor({...f,cursor:'garbage'},'LOCAL');throw new Error('Expected rejection');}catch(e){expect(e).toMatchObject({status:400,expose:true});}});
});
