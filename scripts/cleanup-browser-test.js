// Limpa somente o ensaio explicitamente identificado, sem tocar em pedidos reais.
const fs=require('node:fs');
const path=require('node:path');
process.loadEnvFile(path.resolve(__dirname,'..','.env.local'));
const reference=process.argv[2];
if(!/^SQ-[A-F0-9]{12}$/.test(reference||''))throw Error('Informe o protocolo exato do ensaio.');
const base=process.env.SUPABASE_URL,headers={apikey:process.env.SUPABASE_SECRET_KEY};
async function call(route,method='GET',body){
 const response=await fetch(base+route,{method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok)throw Error('Falha na limpeza de teste: HTTP '+response.status);
 const raw=await response.text();return raw?JSON.parse(raw):null;
}
(async()=>{
 const orders=await call('/rest/v1/orders?select=id,cycle_id,customer_name,delivery_notes,total_cents&reference=eq.'+reference);
 if(orders.length!==1||orders[0].customer_name!=='TESTE TEMPORÁRIO — SEM PAGAMENTO'||orders[0].delivery_notes!=='Ensaio do sistema. Não produzir e não entregar.'||orders[0].total_cents!==1200)throw Error('O pedido não corresponde exatamente ao ensaio autorizado.');
 const order=orders[0];
 const receipts=await call('/rest/v1/payment_receipts?select=storage_path&order_id=eq.'+order.id);
 for(const item of receipts){
  const publicRead=await fetch(base+'/storage/v1/object/public/pix-receipts/'+item.storage_path);
  if(publicRead.ok)throw Error('Comprovante estava público.');
 }
 if(receipts.length)await call('/storage/v1/object/pix-receipts','DELETE',{prefixes:receipts.map(item=>item.storage_path)});
 for(const table of ['audit_events','payment_receipts','cash_entries','order_items'])await call('/rest/v1/'+table+'?order_id=eq.'+order.id,'DELETE');
 await call('/rest/v1/orders?id=eq.'+order.id,'DELETE');
 const remaining=await call('/rest/v1/orders?select=id&cycle_id=eq.'+order.cycle_id+'&limit=1');
 if(!remaining.length)await call('/rest/v1/delivery_cycles?id=eq.'+order.cycle_id,'PATCH',{status:'draft'});
 console.log('Pedido fictício, arquivo, auditoria e lançamento de teste removidos. A rodada vazia voltou a rascunho.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
