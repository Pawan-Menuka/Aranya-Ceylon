// Independent in-memory oracle for public-fixture browser checks. No DB access.
import crypto from 'node:crypto';
const forms = p => /ground|powder|masala|blend/i.test(`${p.name} ${p.category?.name ?? ''}`) ? 'Ground' : 'Whole';
const category = p => p.category?.name || (forms(p) === 'Ground' ? 'Ground' : 'Whole Spices');
const origin = p => p.originLabel || p.category?.name || 'Sri Lanka';
const uniq = values => [...new Set(values.filter(Boolean))].sort();
const tokens = (q, key) => (q.get(key) || '').split(',').map(s=>s.trim()).filter(Boolean);
export function cardProduct(p) {
  const {id,name,slug,certifications,featured,latin,originLabel,flavour,color,category,createdAt,ratingAvg,_count} = p;
  const ignored = new Set([`https://res.cloudinary.com/aranya/image/upload/products/${slug}.jpg`, ...['cinnamon','pepper','tea'].map(s=>`https://res.cloudinary.com/demo/image/upload/${s}.jpg`)]);
  return {id,name,slug,certifications,featured,latin,originLabel,flavour,color,category,createdAt,ratingAvg,_count,
    variants:p.variants.map(({id,weight,price,sku,stock,market,currency})=>({id,weight,price,sku,stock,market,currency})),
    images:[...p.images].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).filter(i=>!ignored.has(i.url)).slice(0,1).map(({id,url,altText,position})=>({id,url,altText,position}))};
}
export function catalogFixture(all, query, market) {
  const q = new URLSearchParams(query), sort=q.get('sort')||'featured';
  const facets={category:uniq(all.map(category)),form:uniq(all.map(forms)),origin:uniq(all.map(origin)),flavour:uniq(all.flatMap(p=>p.flavour||[]))};
  const price = p => {const v=p.variants.filter(v=>v.currency===(market==='LOCAL'?'LKR':'USD'));return Number((v.find(v=>v.weight===100)||v.sort((a,b)=>Number(a.price)-Number(b.price)||a.id.localeCompare(b.id))[0])?.price||0);};
  const sales = p=>p._count?.orderItems||0;
  const compare = {
    featured:(a,b)=>Number(b.featured)-Number(a.featured)||sales(b)-sales(a),best:(a,b)=>sales(b)-sales(a),
    'price-asc':(a,b)=>price(a)-price(b),'price-desc':(a,b)=>price(b)-price(a),
    rating:(a,b)=>(b.ratingAvg||0)-(a.ratingAvg||0)||(b._count?.reviews||0)-(a._count?.reviews||0),new:(a,b)=>b.createdAt.localeCompare(a.createdAt)
  }[sort];
  if(!compare)throw new Error('Invalid catalog sort');
  const ordered = rows=>[...rows].sort((a,b)=>compare(a,b)||a.id.localeCompare(b.id));
  const filtered = all.filter(p=>(!q.get('categoryName')||category(p)===q.get('categoryName'))&&
    (!tokens(q,'form').length||tokens(q,'form').includes(forms(p)))&&(!tokens(q,'origin').length||tokens(q,'origin').includes(origin(p)))&&
    (!tokens(q,'flavour').length||tokens(q,'flavour').some(f=>(p.flavour||[]).includes(f)))&&
    (!q.get('search')||`${p.name} ${p.description}`.toLowerCase().includes(q.get('search').toLowerCase())));
  const rows=ordered(filtered), limit=Number(q.get('limit')||8);
  const identity = new URLSearchParams(q);identity.delete('cursor');identity.delete('limit');identity.sort();
  const signature=crypto.createHash('sha256').update(market+'|'+identity).digest('hex');
  let start=0;
  if(q.get('cursor')){const c=JSON.parse(Buffer.from(q.get('cursor'),'base64url'));if(c.key!==signature)throw new Error('Cursor belongs to another query');start=rows.findIndex(p=>p.id===c.id)+1;if(!start)throw new Error('Stale cursor');}
  const page=rows.slice(start,start+limit), hasNextPage=start+limit<rows.length;
  return {items:page.map(cardProduct),hasNextPage,nextCursor:hasNextPage?Buffer.from(JSON.stringify({id:page.at(-1).id,key:signature})).toString('base64url'):null,total:rows.length,facets,
    featured:[...all].filter(p=>p.featured).sort((a,b)=>sales(b)-sales(a)||a.id.localeCompare(b.id)).slice(0,3).map(cardProduct),market};
}
export function categoryFixture(products) {
  return {groups:uniq(products.map(category)).map(name=>({name,count:products.filter(p=>category(p)===name).length,spices:products.filter(p=>category(p)===name).slice(0,3).map(cardProduct)})),
    facets:{flavour:uniq(products.flatMap(p=>p.flavour||[])).map(name=>({name,count:products.filter(p=>(p.flavour||[]).includes(name)).length,sample:cardProduct(products.find(p=>(p.flavour||[]).includes(name)))}))}};
}
