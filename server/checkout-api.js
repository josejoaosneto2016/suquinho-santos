const crypto=require('node:crypto');
const MAX_FILE=5242880;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES={'image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'};
class CheckoutError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const messages={
 CYCLE_CLOSED:'As encomendas desta rodada estão encerradas. Confira a próxima entrega.',
 ANOTHER_CYCLE_OPEN:'Já existe outra rodada aberta. Feche-a antes de abrir esta.',
 VALIDATION_ERROR:'Confira os dados informados.',
 IDEMPOTENCY_CONFLICT:'Esta tentativa já foi usada com outro pedido. Atualize e revise os itens.',
 PRODUCT_UNAVAILABLE:'Um sabor não está disponível. Atualize o cardápio.',
 PRICE_CHANGED:'O preço mudou. Atualize e revise o total antes de continuar.',
 ORDER_LOCKED:'Este pedido não permite mais esta operação.',
 UPLOAD_EXPIRED:'O prazo de envio terminou. Fale com a família para conferir seu pagamento.',
 UPLOAD_LIMIT:'O limite de tentativas de anexo foi atingido. Fale com a família.',
 INVALID_FILE:'Use uma captura PNG/JPG ou PDF válido de até 5 MB.',
 INVALID_DELIVERY_DATE:'Escolha uma segunda-feira futura.',
 RECEIPT_REQUIRED:'É preciso receber um comprovante válido antes de confirmar o Pix.',
 INVALID_TRANSITION:'A mudança não é permitida no estado atual do pedido.',
 ACCESS_DENIED:'Esta conta não tem acesso a esta operação.',
};
const fail=(code,status=400)=>{throw new CheckoutError(status,code,messages[code]||'Não foi possível concluir.');};
const hash=input=>crypto.createHash('sha256').update(input).digest('hex');
function canonicalOrder(body){
 if(!body||!UUID.test(body.cycle_id||'')||!Array.isArray(body.items)||body.items.length<1||body.items.length>3)fail('VALIDATION_ERROR');
 const name=typeof body.customer?.name==='string'?body.customer.name.trim():'';
 const digits=String(body.customer?.phone||'').replace(/\D/g,'');
 const phone=digits.length===10||digits.length===11?'+55'+digits:'+'+digits;
 if(name.length<2||name.length>100||!/^\+55\d{10,11}$/.test(phone))fail('VALIDATION_ERROR');
 const notes=body.delivery_notes??'';
 if(typeof notes!=='string'||notes.length>500||!Number.isSafeInteger(body.expected_total_cents)||body.expected_total_cents<1)fail('VALIDATION_ERROR');
 const items=body.items.map(item=>{
  if(!item||typeof item.product_id!=='string'||!/^[a-z-]{1,40}$/.test(item.product_id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)fail('VALIDATION_ERROR');
  return {product_id:item.product_id,quantity:item.quantity};
 }).sort((a,b)=>a.product_id.localeCompare(b.product_id));
 if(new Set(items.map(item=>item.product_id)).size!==items.length)fail('VALIDATION_ERROR');
 return {cycle_id:body.cycle_id,customer:{name,phone},delivery_notes:notes.trim(),items,expected_total_cents:body.expected_total_cents};
}
function validFile(bytes,mime,size){
 if(!Buffer.isBuffer(bytes)||!TYPES[mime]||bytes.length!==size||size<1||size>MAX_FILE)return false;
 if(mime==='image/png')return bytes.length>=45&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(16)<=10000&&bytes.readUInt32BE(20)>0&&bytes.readUInt32BE(20)<=10000&&bytes.subarray(-8,-4).toString()==='IEND';
 if(mime==='image/jpeg')return bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes.lastIndexOf(Buffer.from([255,217]))>2;
 return bytes.subarray(0,5).toString()==='%PDF-'&&bytes.subarray(-1024).includes(Buffer.from('%%EOF'));
}
function createCheckout({env,fetchImpl,member,bodyOf}){
 const base=env.SUPABASE_URL?.replace(/\/$/,'');
 const secret=env.SUPABASE_SECRET_KEY;
 const ready=Boolean(secret&&env.CHECKOUT_TOKEN_SECRET?.length>=32&&env.PIX_KEY&&env.PIX_RECEIVER&&Number(env.BOTTLE_ML)===500);
 async function service(path,{method='GET',body,raw=false}={}){
  if(!secret)throw new CheckoutError(503,'CHECKOUT_NOT_CONFIGURED','O recebimento de encomendas ainda está sendo preparado.');
  let response;
  try{response=await fetchImpl(base+path,{method,headers:{apikey:secret,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});}
  catch{throw new CheckoutError(503,'SERVICE_UNAVAILABLE','Não foi possível conectar. Tente novamente.');}
  if(!response.ok){
   let error={};try{error=await response.json();}catch{}
   if(messages[error.message])fail(error.message,error.message==='ACCESS_DENIED'?403:['CYCLE_CLOSED','ORDER_LOCKED','IDEMPOTENCY_CONFLICT','PRICE_CHANGED','ANOTHER_CYCLE_OPEN','INVALID_TRANSITION'].includes(error.message)?409:400);
   if(response.status===429)throw new CheckoutError(429,'RATE_LIMITED','Aguarde um pouco antes de tentar novamente.');
   throw new CheckoutError(503,'SERVICE_UNAVAILABLE','Não foi possível concluir. Tente novamente.');
  }
  return raw?response:response.status===204?null:response.json();
 }
 const rpc=(name,body)=>service('/rest/v1/rpc/'+name,{method:'POST',body});
 async function limit(req){
  const ip=env.VERCEL?(req.headers['x-forwarded-for']||'').split(',')[0].trim():req.socket?.remoteAddress||'local';
  const key=crypto.createHmac('sha256',env.CHECKOUT_TOKEN_SECRET).update('ip:'+ip).digest('hex');
  if(!await rpc('checkout_limit',{p_key:key}))throw new CheckoutError(429,'RATE_LIMITED','Muitas tentativas. Aguarde um minuto.');
 }
 async function ownedOrder(req,id){
  if(!UUID.test(id))fail('ACCESS_DENIED',403);
  const token=req.headers['x-order-token'];
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))fail('ACCESS_DENIED',403);
  const rows=await service('/rest/v1/orders?select=*&id=eq.'+id+'&limit=1');
  const order=rows[0],expected=Buffer.from(order?.upload_token_hash||'','hex'),actual=Buffer.from(hash(token),'hex');
  if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))fail('ACCESS_DENIED',403);
  return order;
 }
 async function bytesOf(response){
  const chunks=[];let size=0;
  if(Number(response.headers.get('content-length'))>MAX_FILE)fail('INVALID_FILE');
  for await(const chunk of response.body){size+=chunk.length;if(size>MAX_FILE)fail('INVALID_FILE');chunks.push(Buffer.from(chunk));}
  return Buffer.concat(chunks);
 }
 function storageUrl(relative,upload=false){
  const url=new URL(base+'/storage/v1'+relative);
  if(url.origin!==new URL(base).origin||!url.pathname.startsWith('/storage/v1/object/'+(upload?'upload/sign/':'sign/')+'pix-receipts/'))throw new Error('Invalid storage URL');
  return url.toString();
 }
 return async function checkout(req,route,token,json){
  if(route==='/api/catalog'&&req.method==='GET'){
   if(!secret){json(200,{products:[],cycle:null,can_order:false,message:'Encomendas em preparação.'});return true;}
   const [products,cycles]=await Promise.all([
    service('/rest/v1/products?select=id,name,price_cents&active=eq.true&order=id.asc'),
    service('/rest/v1/delivery_cycles?select=id,delivery_date,closes_at&status=eq.open&closes_at=gt.'+encodeURIComponent(new Date().toISOString())+'&order=delivery_date.asc&limit=1'),
   ]);
   json(200,{products,cycle:cycles[0]||null,bottle_ml:Number(env.BOTTLE_ML)||500,delivery_fee_cents:0,can_order:ready&&Boolean(cycles.length),message:!ready?'Encomendas em preparação.':cycles.length?'Pedidos abertos.':'Ainda não há uma rodada aberta.'});return true;
  }
  if(route==='/api/orders'&&req.method==='POST'){
   if(!ready)throw new CheckoutError(503,'CHECKOUT_NOT_CONFIGURED','O recebimento de encomendas ainda está sendo preparado.');
   await limit(req);
   const key=req.headers['idempotency-key'];if(!UUID.test(key||''))fail('VALIDATION_ERROR');
   const data=canonicalOrder(await bodyOf(req)),requestHash=hash(JSON.stringify(data));
   const uploadToken=crypto.createHmac('sha256',env.CHECKOUT_TOKEN_SECRET).update(key+':'+requestHash).digest('hex');
   const order=await rpc('create_checkout_order',{p_key:key,p_hash:requestHash,p_token_hash:hash(uploadToken),p_cycle:data.cycle_id,p_name:data.customer.name,p_phone:data.customer.phone,p_notes:data.delivery_notes,p_items:data.items,p_expected:data.expected_total_cents,p_pix_key:env.PIX_KEY,p_pix_receiver:env.PIX_RECEIVER,p_bottle:Number(env.BOTTLE_ML)});
   json(201,{order,upload_token:uploadToken});return true;
  }
  const upload=route.match(/^\/api\/orders\/([0-9a-f-]+)\/receipt-(upload|complete)$/i);
  if(upload&&req.method==='POST'){
   if(!ready)throw new CheckoutError(503,'CHECKOUT_NOT_CONFIGURED','Encomendas em preparação.');
   await limit(req);
   const order=await ownedOrder(req,upload[1]),body=await bodyOf(req);
   if(upload[2]==='upload'){
    if(!body||!TYPES[body.mime_type]||!Number.isInteger(body.size_bytes)||body.size_bytes<1||body.size_bytes>MAX_FILE)fail('INVALID_FILE');
    const path=order.id+'/'+crypto.randomUUID()+'.'+TYPES[body.mime_type];
    const receiptId=await rpc('reserve_receipt',{p_order:order.id,p_path:path,p_mime:body.mime_type,p_size:body.size_bytes});
    const signed=await service('/storage/v1/object/upload/sign/pix-receipts/'+path,{method:'POST',body:{}});
    json(200,{receipt_id:receiptId,upload_url:storageUrl(signed.url,true)});return true;
   }
   if(!body||!UUID.test(body.receipt_id||''))fail('INVALID_FILE');
   const rows=await service('/rest/v1/payment_receipts?select=*&id=eq.'+body.receipt_id+'&order_id=eq.'+order.id+'&limit=1'),receipt=rows[0];
   if(!receipt)fail('INVALID_FILE');
   if(receipt.validation_status==='valid'){json(200,{received:true,reference:order.reference});return true;}
   const download=await service('/storage/v1/object/authenticated/pix-receipts/'+receipt.storage_path,{raw:true}),bytes=await bytesOf(download);
   if(!validFile(bytes,receipt.mime_type,receipt.size_bytes)){
    await service('/rest/v1/payment_receipts?id=eq.'+receipt.id,{method:'PATCH',body:{validation_status:'rejected'}});fail('INVALID_FILE');
   }
   json(200,await rpc('complete_receipt',{p_order:order.id,p_receipt:receipt.id,p_sha:hash(bytes)}));return true;
  }
  if(route==='/api/admin/cycles'&&req.method==='POST'){
   const family=await member(token),body=await bodyOf(req);
   if(!body||!(body.id===null||body.id===undefined||UUID.test(body.id))||!['draft','open','closed'].includes(body.status))fail('VALIDATION_ERROR');
   if(!body.id&&!/^\d{4}-\d{2}-\d{2}$/.test(body.delivery_date||''))fail('INVALID_DELIVERY_DATE');
   if(body.status==='open'&&!ready)throw new CheckoutError(503,'CHECKOUT_NOT_CONFIGURED','Configure os dados do Pix antes de abrir encomendas.');
   json(200,{cycle:await rpc('manage_cycle',{p_actor:family.user_id,p_id:body.id||null,p_date:body.delivery_date||null,p_status:body.status})});return true;
  }
  const action=route.match(/^\/api\/admin\/orders\/([0-9a-f-]+)\/(confirm-payment|status)$/i);
  if(action&&req.method==='POST'){
   const family=await member(token);if(!UUID.test(action[1]))fail('VALIDATION_ERROR');
   if(action[2]==='confirm-payment')json(200,await rpc('confirm_pix_payment',{p_actor:family.user_id,p_order:action[1]}));
   else{const body=await bodyOf(req);if(!['production','delivered','cancelled'].includes(body?.status))fail('VALIDATION_ERROR');json(200,{updated:await rpc('set_order_status',{p_actor:family.user_id,p_order:action[1],p_status:body.status})});}
   return true;
  }
  const view=route.match(/^\/api\/admin\/receipts\/([0-9a-f-]+)\/view$/i);
  if(view&&req.method==='POST'){
   await member(token);if(!UUID.test(view[1]))fail('INVALID_FILE');
   const rows=await service('/rest/v1/payment_receipts?select=storage_path,validation_status&id=eq.'+view[1]+'&limit=1');
   if(!rows[0]||rows[0].validation_status!=='valid')fail('INVALID_FILE');
   const signed=await service('/storage/v1/object/sign/pix-receipts/'+rows[0].storage_path,{method:'POST',body:{expiresIn:60}});
   json(200,{url:storageUrl(signed.signedURL),expires_in:60});return true;
  }
  return false;
 };
}
module.exports={createCheckout,canonicalOrder,validFile,hash,UUID};
