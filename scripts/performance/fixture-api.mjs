import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cardProduct, catalogFixture, categoryFixture } from './catalog-fixture.mjs';
import { phaseNineData, adminPageFixture, searchFixture } from './page-fixture.mjs';
export const fixtureSecret = 'performance-fixtures-only-no-production-access';
export function signedMarket(market, claims={}) {
  const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const p=Buffer.from(JSON.stringify({market,exp:4102444800,...claims})).toString('base64url');
  return `${h}.${p}.${crypto.createHmac('sha256',fixtureSecret).update(`${h}.${p}`).digest('base64url')}`;
}
function verifiedMarket(token) {
  try {
    const [header,payload,signature]=token.split('.');
    if(JSON.parse(Buffer.from(header,'base64url')).alg!=='HS256')return 'INTERNATIONAL';
    const expected=crypto.createHmac('sha256',fixtureSecret).update(`${header}.${payload}`).digest();
    const supplied=Buffer.from(signature,'base64url');
    if(supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected))return 'INTERNATIONAL';
    const claims=JSON.parse(Buffer.from(payload,'base64url'));
    if(claims.exp!==undefined&&claims.exp<=Date.now()/1000)return 'INTERNATIONAL';
    return claims.market==='local'?'LOCAL':'INTERNATIONAL';
  } catch { return 'INTERNATIONAL'; }
}
export async function startFixtureApi({port=4101,delayMs=0,faults=new Map(),phase9Rows=0,admin=false}={}) {
  const source=JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'fixtures/catalog.json'),'utf8'));
  const data=phase9Rows?phaseNineData(source,phase9Rows):source;
  const carts=new Map();
  const cartStats={created:0,bootstrapReads:0,shoppingWrites:0};
  const calls=[];
  let sequence=0;
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const cookie=Object.fromEntries((req.headers.cookie||'').split(';').map(v=>v.trim().split('=')));
    const market=verifiedMarket(cookie['x-market']);
    const currency=market==='LOCAL'?'LKR':'USD';
    calls.push({path:url.pathname,query:url.search,method:req.method,market,cookieNames:Object.keys(cookie).filter(Boolean).sort(),hasAuthorization:!!req.headers.authorization});
    const fault=faults.get(url.pathname);
    let raw='';try{for await(const chunk of req)raw+=chunk;}catch{return;}
    if(delayMs)await new Promise(r=>setTimeout(r,delayMs));
    if(fault?.delayMs)await new Promise(r=>setTimeout(r,fault.delayMs));
    let input={};try{input=JSON.parse(raw||'{}')}catch{}
    function send(body,status=200){if(res.destroyed)return;res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));}
    if(fault?.status)return send({error:'Controlled performance fixture failure'},fault.status);
    function project(p){return {...p,variants:p.variants.filter(v=>v.market===market||v.market==='BOTH')};}
    let products=data.products.filter(p=>p.status==='ACTIVE'&&(p.market===market||p.market==='BOTH')).map(project);
    if(url.pathname==='/health')return send({status:'fixture',database:'none'});
    if(url.pathname==='/market/override'&&req.method==='POST'){
      if(!['local','international'].includes(input.market))return send({error:'Invalid market'},400);
      res.setHeader('set-cookie',`x-market=${signedMarket(input.market)}; Path=/; HttpOnly; SameSite=Lax`);return send({market:input.market});
    }
    const adminToken=signedMarket('international',{sub:'fixture-admin',role:'ADMIN'});
    const fixtureAdmin=admin&&(cookie['phase9-admin']===fixtureSecret||req.headers.authorization===`Bearer ${adminToken}`);
    if(url.pathname==='/auth/refresh'&&req.method==='POST'&&fixtureAdmin)return send({accessToken:adminToken});
    if(url.pathname==='/auth/me'&&req.method==='GET'&&fixtureAdmin)return send({user:{id:'fixture-admin',name:'Admin Fixture',email:'admin@example.invalid',role:'ADMIN',verified:true}});
    if(url.pathname.startsWith('/auth/'))return send({error:'Anonymous performance fixture'},401);
    if(url.pathname==='/search'&&(req.method==='GET'||req.method==='HEAD')){
      try{return send(searchFixture(data,url.searchParams,market));}catch{return send({error:'Invalid search query/cursor'},400);}
    }
    if(url.pathname.startsWith('/admin/')){
      if(!fixtureAdmin)return send({error:'Protected performance fixture'},401);
      if(req.method!=='GET')return send({error:'Fixture mutations are disabled'},405);
      const resource=({'/admin/products':'products','/admin/blogs':'blogs','/admin/recipes':'recipes','/admin/gifts':'gifts','/admin/audit-logs':'audit'})[url.pathname];
      if(resource){
        try{return send(adminPageFixture(data,resource,url.searchParams));}catch{return send({error:'Invalid admin page query/cursor'},400);}
      }
      return send({error:'Unsupported protected fixture route'},404);
    }
    if(url.pathname==='/products/featured')return send({products:products.filter(p=>p.featured).slice(0,4).map(p=>url.searchParams.get('view')==='cards'?cardProduct(p):p),market});
    if(url.pathname==='/products/bestsellers')return send({products:products.sort((a,b)=>(b._count?.orderItems||0)-(a._count?.orderItems||0)).slice(0,8).map(p=>url.searchParams.get('view')==='cards'?cardProduct(p):p),market});
    if(url.pathname==='/categories'&&url.searchParams.get('view')==='summary')return send(categoryFixture(products));
    if(url.pathname==='/categories')return send({categories:[...new Map(products.filter(p=>p.category).map(p=>[p.category.id,p.category])).values()]});
    if(url.pathname==='/products'){
      if(url.searchParams.get('view')==='lookup'){
        let names;try{names=JSON.parse(url.searchParams.get('names'));}catch{return send({error:'Invalid names'},400);}
        if(!Array.isArray(names)||!names.length||names.length>40||names.some(n=>typeof n!=='string'||!n.trim()||n.length>200))return send({error:'Invalid names'},400);
        const unique=[...new Set(names.map(n=>n.trim()))];
        return send({products:unique.flatMap(name=>{const p=products.filter(p=>p.name===name).sort((a,b)=>a.id.localeCompare(b.id))[0];return p?[cardProduct(p)]:[];}),market});
      }
      if(url.searchParams.get('view')==='cards'){try{return send(catalogFixture(products,url.searchParams,market));}catch{return send({error:'Invalid catalog query/cursor'},400);}}
      if(url.searchParams.get('category'))products=products.filter(p=>p.category?.slug===url.searchParams.get('category'));
      if(url.searchParams.get('sort')==='bestselling')products.sort((a,b)=>(b._count?.orderItems||0)-(a._count?.orderItems||0));
      if(url.searchParams.get('search')){const tokens=url.searchParams.get('search').toLowerCase().split(/\s+/).filter(Boolean);products=products.filter(p=>tokens.every(t=>(p.name+' '+p.description).toLowerCase().includes(t)));}
      const limit=Number(url.searchParams.get('limit')||12),cursor=url.searchParams.get('cursor');
      const start=cursor?products.findIndex(p=>p.id===cursor)+1:0,items=products.slice(start,start+limit),hasNextPage=start+limit<products.length;
      return send({items,nextCursor:hasNextPage?items.at(-1)?.id:null,hasNextPage,market});
    }
    if(url.pathname.startsWith('/products/')){const p=products.find(p=>p.slug===decodeURIComponent(url.pathname.split('/')[2]));return p?send({product:p,market}):send({error:'Product not found'},404);}
    const publishedBlogs=data.blogs.filter(row=>!row.status||row.status==='PUBLISHED');
    if(url.pathname==='/blog'||url.pathname==='/blog/recent'){
      if(url.pathname.endsWith('/recent'))return send({blogs:publishedBlogs.slice(0,3)});
      const limit=Number(url.searchParams.get('limit')||10),cursor=url.searchParams.get('cursor'),start=cursor?publishedBlogs.findIndex(p=>p.id===cursor)+1:0,items=publishedBlogs.slice(start,start+limit),hasNextPage=start+limit<publishedBlogs.length;
      return send({items,nextCursor:hasNextPage?items.at(-1)?.id:null,hasNextPage});
    }
    if(url.pathname.startsWith('/blog/')){const blog=publishedBlogs.find(b=>b.slug===url.pathname.split('/')[2]);return blog?send({blog}):send({error:'Not found'},404);}
    if(url.pathname==='/recipes')return send({recipes:data.recipes.filter(row=>!row.status||row.status==='PUBLISHED')});
    if(url.pathname.startsWith('/recipes/'))return send({recipe:data.recipes.find(r=>(!r.status||r.status==='PUBLISHED')&&r.slug===url.pathname.split('/')[2])});
    if(url.pathname==='/gifts')return send({gifts:data.gifts.filter(row=>!row.status||row.status==='PUBLISHED')});
    if(url.pathname.startsWith('/cart')){
      if(url.pathname==='/cart/bootstrap'){cartStats.bootstrapReads++;return send({cart:carts.get(cookie.guestCartToken)||null,market});}
      if(url.pathname==='/cart/items'&&req.method==='POST'){
        const candidate=products.find(p=>p.id===input.productId)?.variants.find(v=>v.id===input.variantId);
        if(!candidate||!Number.isInteger(input.quantity)||input.quantity<1)return send({error:'Invalid fixture item'},400);
      }
      let token=cookie.guestCartToken;
      if(req.method==='DELETE'&&url.pathname==='/cart'){
        const existing=carts.get(token);if(existing){existing.items=[];existing.promo=null;cartStats.shoppingWrites++;}res.writeHead(204,{'cache-control':'no-store'});return res.end();
      }
      const readOnly=url.pathname==='/cart/totals';
      if(!token||!carts.has(token)){
        if(readOnly)token=null;
        else {token='fixture-'+(++sequence);carts.set(token,{id:token,items:[]});cartStats.created++;res.setHeader('set-cookie',`guestCartToken=${token}; Path=/; HttpOnly; SameSite=Lax`);}
      }
      const cart=token?carts.get(token):{id:null,items:[]};
      if(url.pathname==='/cart/items'&&req.method==='POST'){
        const product=products.find(p=>p.id===input.productId);const variant=product?.variants.find(v=>v.id===input.variantId);
        if(!variant)return send({error:'Fixture variant missing'},400);
        let item=cart.items.find(i=>i.variant.id===variant.id);
        if(item)item.quantity+=input.quantity||1;
        else {item={id:token+'-item-'+cart.items.length,productId:product.id,quantity:input.quantity||1,product,variant};cart.items.push(item);}
        cartStats.shoppingWrites++;return send({item},201);
      }
      if(url.pathname.startsWith('/cart/items/')){
        const id=decodeURIComponent(url.pathname.split('/').pop()),item=cart.items.find(i=>i.id===id);
        if(req.method==='PATCH'){if(!item)return send({error:'Missing fixture item'},404);item.quantity=input.quantity;cartStats.shoppingWrites++;return send({item});}
        if(req.method==='DELETE'){cart.items=cart.items.filter(i=>i.id!==id);cartStats.shoppingWrites++;res.writeHead(204,{'cache-control':'no-store'});return res.end();}
      }
      if(url.pathname==='/cart/coupon'){
        if(req.method==='POST'){if(input.code!=='CEYLON10')return send({error:'Invalid fixture coupon'},400);cart.promo=input.code;cartStats.shoppingWrites++;return send({discount:{}});}
        if(req.method==='DELETE'){cart.promo=null;cartStats.shoppingWrites++;res.writeHead(204,{'cache-control':'no-store'});return res.end();}
      }
      if(url.pathname==='/cart/totals'){
        const subtotal=cart.items.reduce((n,i)=>n+Number(i.variant.price)*i.quantity,0);
        const shippingCost=subtotal?(market==='LOCAL'?350:4.99):0;
        const gift=url.searchParams.get('giftWrap')==='true'?(market==='LOCAL'?400:4.5):0;
        const total=subtotal+shippingCost+gift;
        return send({totals:{subtotal,shippingCost,gift,discount:0,total,subtotalCents:Math.round(subtotal*100),shippingCents:Math.round(shippingCost*100),giftCents:Math.round(gift*100),discountCents:0,totalCents:Math.round(total*100),shippingLabel:'Fixture standard delivery',currency,couponId:null}});
      }
      return send({cart,market});
    }
    // Baseline stops at checkout arrival; no order, account, mail or payment mutations.
    return send({error:'Unsupported fixture route'},404);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
  return {server,data,calls,cartStats,close:()=>new Promise(r=>server.close(r))};
}
