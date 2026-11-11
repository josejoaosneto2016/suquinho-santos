const test=require('node:test');
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {canonicalOrder,validFile,hash}=require('../server/checkout-api');
const {createApi}=require('../server/family-api');
const id='11111111-1111-4111-8111-111111111111';
const receiptId='22222222-2222-4222-8222-222222222222';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test',CHECKOUT_TOKEN_SECRET:'x'.repeat(64),APP_ORIGIN:'https://site.example',PIX_KEY:'recebedor@example.invalid',PIX_RECEIVER:'Recebedor de teste',BOTTLE_ML:'500'};
const input=()=>({cycle_id:id,customer:{name:' Pessoa de teste ',phone:'(11) 99999-9999'},delivery_notes:' Entrega combinada ',items:[{product_id:'laranja',quantity:2}],expected_total_cents:2400});
const ok=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
async function request(fetchImpl,path,body,extra={}){
 const req=Readable.from([Buffer.from(JSON.stringify(body))]);Object.assign(req,{method:'POST',url:path,headers:{origin:env.APP_ORIGIN,'content-type':'application/json','idempotency-key':id,...extra},socket:{remoteAddress:'127.0.0.1'}});
 const res={headers:{},setHeader(key,value){this.headers[key.toLowerCase()]=value;},end(value){this.body=JSON.parse(value);}};
 await createApi({env,fetchImpl})(req,res);return res;
}
test('normaliza contato e campos; rejeita quantidades, total e sabores duplicados',()=>{
 const result=canonicalOrder(input());assert.equal(result.customer.phone,'+5511999999999');assert.equal(result.customer.name,'Pessoa de teste');assert.equal(result.delivery_notes,'Entrega combinada');
 for(const quantity of [0,100,1.5,'2',null]){
  const data=input();data.items[0].quantity=quantity;assert.throws(()=>canonicalOrder(data));
 }
 const duplicate=input();duplicate.items.push(duplicate.items[0]);assert.throws(()=>canonicalOrder(duplicate));
 const invalid=input();invalid.expected_total_cents=1.5;assert.throws(()=>canonicalOrder(invalid));
});
test('valida conteúdo, tamanho e tipo; renomear HTML para PNG não passa',()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
 assert(validFile(png,'image/png',png.length));assert(!validFile(png,'image/png',png.length+1));assert(!validFile(Buffer.from('<html>fake</html>'),'image/png',17));assert(!validFile(png,'image/heic',png.length));
 const pdf=Buffer.from('%PDF-1.4\nfixture\n%%EOF');assert(validFile(pdf,'application/pdf',pdf.length));assert(!validFile(Buffer.from('%PDF-'),'application/pdf',5));
});
test('checkout usa cálculo do servidor e mantém token fora de logs e dados privados',async()=>{
 let rpcCalls=0;
 const provider=async(url,options)=>{
  assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);assert.equal(options.headers.Authorization,undefined);
  if(url.endsWith('/checkout_limit'))return ok(true);
  if(url.endsWith('/create_checkout_order')){
   rpcCalls++;const body=JSON.parse(options.body);assert.equal(body.p_expected,2400);assert.equal(body.p_name,'Pessoa de teste');assert.equal(body.p_token_hash.length,64);
   return ok({id,reference:'SQ-TEST',total_cents:2400,pix_key:env.PIX_KEY});
  }throw Error('Unexpected request');
 };
 const first=await request(provider,'/api/orders',input()),second=await request(provider,'/api/orders',input());
 assert.equal(first.statusCode,201);assert.equal(first.body.upload_token,second.body.upload_token);assert.equal(rpcCalls,2);
 assert(!JSON.stringify(first.body).includes(env.SUPABASE_SECRET_KEY));assert(!JSON.stringify(first.body).includes('Pessoa de teste'));
});
test('limite persistente bloqueia antes de criar encomenda',async()=>{
 const res=await request(async url=>{assert(url.endsWith('/checkout_limit'));return ok(false);},'/api/orders',input());
 assert.equal(res.statusCode,429);
});
test('mudança de preço retorna conflito sem aprovar pedido',async()=>{
 const res=await request(async url=>url.endsWith('/checkout_limit')?ok(true):new Response(JSON.stringify({message:'PRICE_CHANGED'}),{status:400}),'/api/orders',input());
 assert.equal(res.statusCode,409);assert.equal(res.body.error.code,'PRICE_CHANGED');
});
test('token de outro pedido não autoriza upload nem leitura de comprovante',async()=>{
 const res=await request(async url=>{
  if(url.endsWith('/checkout_limit'))return ok(true);
  if(url.includes('/orders?'))return ok([{id,upload_token_hash:hash('a'.repeat(64))}]);
  throw Error('Must not access storage');
 },'/api/orders/'+id+'/receipt-upload',{mime_type:'image/png',size_bytes:100},{'x-order-token':'b'.repeat(64)});
 assert.equal(res.statusCode,403);
});
test('upload maior que o limite é rejeitado antes de reservar arquivo',async()=>{
 const res=await request(async url=>{
  if(url.endsWith('/checkout_limit'))return ok(true);
  if(url.includes('/orders?'))return ok([{id,upload_token_hash:hash('a'.repeat(64))}]);
  throw Error('Must not reserve');
 },'/api/orders/'+id+'/receipt-upload',{mime_type:'image/png',size_bytes:5242881},{'x-order-token':'a'.repeat(64)});
 assert.equal(res.statusCode,400);assert.equal(res.body.error.code,'INVALID_FILE');
});
test('visitante não executa confirmação financeira ou gestão de rodadas',async()=>{
 const res=await request(async()=>{throw Error('No provider request allowed');},'/api/admin/orders/'+id+'/confirm-payment',{});
 assert.equal(res.statusCode,401);
 const cycles=await request(async()=>{throw Error('No provider request allowed');},'/api/admin/cycles',{status:'open',id});
 assert.equal(cycles.statusCode,401);
});
test('comprovante recebido novamente é idempotente sem alterar caixa',async()=>{
 const res=await request(async url=>{
  if(url.endsWith('/checkout_limit'))return ok(true);
  if(url.includes('/orders?'))return ok([{id,reference:'SQ-TEST',upload_token_hash:hash('a'.repeat(64))}]);
  if(url.includes('/payment_receipts?'))return ok([{id:receiptId,validation_status:'valid'}]);
  throw Error('Should not download or create receipt twice');
 },'/api/orders/'+id+'/receipt-complete',{receipt_id:receiptId},{'x-order-token':'a'.repeat(64)});
 assert.equal(res.statusCode,200);assert.equal(res.body.received,true);
});
