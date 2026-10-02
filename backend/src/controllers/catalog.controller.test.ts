import {beforeEach,describe,it,expect,vi} from 'vitest';
import type {Request,Response} from 'express';
const mocks=vi.hoisted(()=>({cards:vi.fn(),legacy:vi.fn(),popular:vi.fn(),featured:vi.fn(),summary:vi.fn(),categories:vi.fn(),lookup:vi.fn()}));
vi.mock('../lib/prisma.js',()=>({prisma:{category:{findMany:mocks.categories}}}));
vi.mock('../services/product.service.js',()=>({listProducts:mocks.legacy,getFeaturedProducts:mocks.featured}));
vi.mock('../services/catalog.service.js',()=>({listProductCards:mocks.cards,getPopularProductCards:mocks.popular,getCategorySummary:mocks.summary,lookupProductCards:mocks.lookup}));
vi.mock('../services/cloudinary.service.js',()=>({uploadImage:vi.fn()}));
import {listProducts,getFeatured} from './product.controller.js';
import {listCategories} from './category.controller.js';
const request=(query:unknown)=>({query,market:'LOCAL'}) as Request;
const response=()=>({json:vi.fn()}) as unknown as Response;
beforeEach(()=>{vi.resetAllMocks();mocks.cards.mockResolvedValue({items:[],total:0,market:'LOCAL'});mocks.legacy.mockResolvedValue([{id:'a'},{id:'b'},{id:'extra'}]);mocks.popular.mockResolvedValue([{id:'card'}]);mocks.featured.mockResolvedValue([{id:'full',description:'Full detail'}]);mocks.summary.mockResolvedValue({groups:[]});});
describe('opt-in compact public contracts',()=>{
  it('bounds ingredient batches and preserves comma-containing names before any database work',async()=>{
    const names=['Cinnamon, ground','Pepper'];mocks.lookup.mockResolvedValue([{id:'card'}]);const res=response();
    await listProducts(request({view:'lookup',names:JSON.stringify(names)}),res);
    expect(mocks.lookup).toHaveBeenCalledWith(names,'LOCAL');
    expect(res.json).toHaveBeenCalledWith({products:[{id:'card'}],market:'LOCAL'});
    mocks.lookup.mockClear();
    for(const names of ['bad','[]',JSON.stringify(Array(41).fill('Pepper')),JSON.stringify([''])])await expect(listProducts(request({view:'lookup',names}),response())).rejects.toThrow();
    expect(mocks.lookup).not.toHaveBeenCalled();
  });
  it('routes card queries through normalized full-data filters and the resolved market',async()=>{const res=response();await listProducts(request({view:'cards',categoryName:'Whole Spices',flavour:'Warm,Floral,Warm',limit:'8'}),res);expect(mocks.cards).toHaveBeenCalledWith(expect.objectContaining({limit:8,categoryName:['Whole Spices'],flavour:['Floral','Warm']}),'LOCAL');expect(mocks.legacy).not.toHaveBeenCalled();expect(res.json).toHaveBeenCalledWith({items:[],total:0,market:'LOCAL'});});
  it('rejects excessive or fractional card pages before database work',async()=>{for(const limit of ['41','1.5'])await expect(listProducts(request({view:'cards',limit}),response())).rejects.toThrow();expect(mocks.cards).not.toHaveBeenCalled();});
  it('preserves legacy pagination and full-product response shape',async()=>{const res=response();await listProducts(request({limit:'2'}),res);expect(mocks.legacy).toHaveBeenCalled();expect(mocks.cards).not.toHaveBeenCalled();expect(res.json).toHaveBeenCalledWith({items:[{id:'a'},{id:'b'}],nextCursor:'b',hasNextPage:true,market:'LOCAL'});});
  it('homepage cards opt in while older spotlight clients retain full products',async()=>{const card=response(),legacy=response();await getFeatured(request({view:'cards'}),card);await getFeatured(request({}),legacy);expect(mocks.popular).toHaveBeenCalledWith('LOCAL',true,4);expect(card.json).toHaveBeenCalledWith({products:[{id:'card'}],market:'LOCAL'});expect(legacy.json).toHaveBeenCalledWith({products:[{id:'full',description:'Full detail'}],market:'LOCAL'});});
  it('categories use summary counts without loading their legacy model',async()=>{const res=response();await listCategories(request({view:'summary'}),res);expect(mocks.summary).toHaveBeenCalledWith('LOCAL');expect(mocks.categories).not.toHaveBeenCalled();});
});
