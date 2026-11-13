const checkoutForm=document.querySelector('#checkout-form');
const checkoutStatus=document.querySelector('#checkout-status');
const checkoutButton=document.querySelector('#checkout-submit');
const paymentBox=document.querySelector('#payment-box');
const receiptForm=document.querySelector('#receipt-form');
const sessionKey='suquinhos-checkout-v1';
const validation=window.suquinhosValidation;
const customerFields=['customer_name','customer_phone','delivery_notes'];
const fieldLabels={customer_name:'nome',customer_phone:'telefone',delivery_notes:'observação de entrega'};
const touched=new Set();
let submitted=false;
checkoutForm.noValidate=true;
function customerValues(){return {name:checkoutForm.elements.customer_name.value,phone:checkoutForm.elements.customer_phone.value,notes:checkoutForm.elements.delivery_notes.value};}
function showFieldErrors(){
 const errors=validation.validateCustomer(customerValues());
 for(const name of customerFields){
  const field=checkoutForm.elements[name],message=(submitted||touched.has(name))?errors[name]||'':'';
  field.setAttribute('aria-invalid',String(Boolean(message)));
  document.querySelector('#'+field.id+'-error').textContent=message;
 }
 return errors;
}
function updatePhoneHint(){document.querySelector('#customer-phone-hint').textContent=validation.phoneHint(checkoutForm.elements.customer_phone.value);}
for(const name of customerFields){
 const field=checkoutForm.elements[name];
 field.addEventListener('blur',event=>{
  // O submit mostra todos os erros. Evita mover o botão entre pressionar e soltar o clique.
  if(event.relatedTarget===checkoutButton)return;
  touched.add(name);showFieldErrors();
 });
 field.addEventListener('input',()=>{
  if(name==='customer_phone'){
   const raw=field.value,caret=field.selectionStart;
   const digitsBefore=raw.slice(0,caret).replace(/\D/g,'').length;
   field.value=validation.formatPhone(raw);
   if(caret!==null&&caret<raw.length){
    let position=0,count=0;
    while(position<field.value.length&&count<digitsBefore){if(/\d/.test(field.value[position]))count++;position++;}
    field.setSelectionRange(position,position);
   }
   updatePhoneHint();
  }
  showFieldErrors();
  if(submitted)checkoutStatus.textContent=Object.keys(validation.validateCustomer(customerValues())).length?'Confira os campos destacados abaixo.':'Dados corrigidos. Toque em “Reservar pedido e ver Pix” para continuar.';
 });
}
let catalog=null,attempt=null,pending=null,uploadAttempt=null,completed=null,busy=false;
const brl=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const dateBR=date=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
function persistAttempt(){
 try{sessionStorage.setItem(sessionKey,JSON.stringify({attempt,pending,uploadAttempt,completed}));}
 catch{checkoutStatus.textContent='Esta aba não conseguiu guardar o andamento. Mantenha-a aberta até enviar o comprovante.';}
}
async function callApi(path,body,headers={}){
 const response=await fetch(path,{method:body?'POST':'GET',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();
 if(!response.ok){const error=new Error(data.error?.message||'Não foi possível concluir.');error.code=data.error?.code;throw error;}
 return data;
}
function updateCheckout(){
 checkoutForm.hidden=Boolean(pending||completed);
 paymentBox.hidden=!pending;
 document.querySelector('#checkout-done').hidden=!completed;
 checkoutButton.disabled=busy||!catalog?.can_order||!window.suquinhosCart?.items().length;
 document.querySelector('#finalize-order').disabled=busy||Boolean(pending)||!window.suquinhosCart?.items().length;
 for(const button of document.querySelectorAll('.add-button,#cart-items button,#clear-cart'))button.disabled=Boolean(pending||busy);
 if(pending){
  const order=pending.order;
  document.querySelector('#payment-reference').textContent=order.reference;
  document.querySelector('#payment-total').textContent=brl(order.total_cents);
  document.querySelector('#payment-key').value=order.pix_key;
  document.querySelector('#payment-receiver').textContent=order.pix_receiver;
  document.querySelector('#payment-delivery').textContent=dateBR(order.delivery_date);
  document.querySelector('#receipt-button').disabled=busy;
 }
 if(completed)document.querySelector('#completed-reference').textContent=completed.reference;
}
async function loadCatalog(){
 try{
  catalog=await callApi('/api/catalog');
  window.dispatchEvent(new CustomEvent('catalogready',{detail:catalog}));
  document.querySelector('#checkout-cycle').textContent=catalog.cycle?'Entrega na segunda, '+dateBR(catalog.cycle.delivery_date)+'. Encomendas até sexta às 18h.':catalog.message;
  if(!pending&&!completed)checkoutStatus.textContent=catalog.can_order?'Garrafas de 500 ml. Entrega combinada com a família, sem taxa.':catalog.message;
 }catch{checkoutStatus.textContent='Não foi possível carregar as encomendas. Atualize a página para tentar de novo.';}
 updateCheckout();
}
checkoutForm.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 submitted=true;
 const errors=showFieldErrors(),invalidFields=Object.keys(errors);
 if(invalidFields.length){
  checkoutStatus.textContent='Confira '+invalidFields.map(name=>fieldLabels[name]).join(' e ')+'. O pedido ainda não foi enviado.';
  checkoutForm.elements[invalidFields[0]].focus();
  return;
 }
 busy=true;updateCheckout();checkoutStatus.textContent='Preparando seu pedido…';
 try{
  const body={cycle_id:catalog.cycle.id,customer:{name:checkoutForm.elements.customer_name.value.trim(),phone:validation.phoneDigits(checkoutForm.elements.customer_phone.value)},delivery_notes:checkoutForm.elements.delivery_notes.value,items:window.suquinhosCart.items(),expected_total_cents:window.suquinhosCart.total()};
  if(!attempt||JSON.stringify(attempt.body)!==JSON.stringify(body))attempt={key:crypto.randomUUID(),body};
  persistAttempt();
  pending=await callApi('/api/orders',attempt.body,{'Idempotency-Key':attempt.key});
  attempt=null;persistAttempt();
  checkoutForm.reset();submitted=false;touched.clear();showFieldErrors();updatePhoneHint();checkoutStatus.textContent='Pedido reservado. Faça o Pix e envie o comprovante abaixo. Ainda não está confirmado.';
  updateCheckout();paymentBox.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){
  checkoutStatus.textContent=error.message||'Falha de conexão. Tente novamente; a mesma tentativa será reutilizada.';
  if(['PRICE_CHANGED','CYCLE_CLOSED','PRODUCT_UNAVAILABLE'].includes(error.code))await loadCatalog();
 }finally{busy=false;updateCheckout();}
});
document.querySelector('#copy-pix').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(pending.order.pix_key);document.querySelector('#receipt-status').textContent='Chave copiada. Confira o nome do recebedor no seu banco.';}
 catch{document.querySelector('#payment-key').select();document.querySelector('#receipt-status').textContent='Selecione e copie a chave Pix acima.';}
});
receiptForm.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!pending)return;
 const file=receiptForm.elements.receipt.files[0];
 const status=document.querySelector('#receipt-status');
 if(!file||!['image/png','image/jpeg','application/pdf'].includes(file.type)||file.size<1||file.size>5242880){status.textContent='Escolha uma captura PNG/JPG ou PDF de até 5 MB.';return;}
 busy=true;updateCheckout();status.textContent='Enviando o comprovante…';
 try{
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(value=>value.toString(16).padStart(2,'0')).join('');
  const headers={'X-Order-Token':pending.upload_token};
  if(!uploadAttempt||uploadAttempt.digest!==digest){
   uploadAttempt={digest,...await callApi('/api/orders/'+pending.order.id+'/receipt-upload',{mime_type:file.type,size_bytes:file.size},headers)};
   persistAttempt();
  }
  const sent=await fetch(uploadAttempt.upload_url,{method:'PUT',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});
  // Repetir um upload concluído pode responder conflito. A confirmação valida o arquivo imutável no servidor.
  if(!sent.ok&&![400,409].includes(sent.status))throw new Error('O arquivo não foi enviado. Confira a conexão e tente novamente.');
  const result=await callApi('/api/orders/'+pending.order.id+'/receipt-complete',{receipt_id:uploadAttempt.receipt_id},headers);
  completed={reference:result.reference};pending=null;attempt=null;uploadAttempt=null;persistAttempt();
  window.suquinhosCart.clear();receiptForm.reset();
  checkoutStatus.textContent='Comprovante recebido. A família vai conferir o crédito antes de confirmar a encomenda.';
  document.querySelector('#checkout-done').scrollIntoView({behavior:'smooth'});
 }catch(error){
  status.textContent=error.message||'Falha de conexão. Tente enviar de novo; não precisa fazer outro Pix.';
  if(error.code==='INVALID_FILE'){uploadAttempt=null;persistAttempt();}
 }finally{busy=false;updateCheckout();}
});
document.querySelector('#new-order').addEventListener('click',()=>{
 completed=null;persistAttempt();updateCheckout();loadCatalog();
});
window.addEventListener('cartchange',updateCheckout);
try{
 const saved=JSON.parse(sessionStorage.getItem(sessionKey)||'null');
 if(saved){attempt=saved.attempt;pending=saved.pending;uploadAttempt=saved.uploadAttempt;completed=saved.completed;}
 if(attempt?.body){
  checkoutForm.elements.customer_name.value=attempt.body.customer.name;
  checkoutForm.elements.customer_phone.value=attempt.body.customer.phone;
  checkoutForm.elements.delivery_notes.value=attempt.body.delivery_notes;
 }
}catch{checkoutStatus.textContent='Não foi possível recuperar o andamento desta aba.';}
checkoutForm.elements.customer_phone.value=validation.formatPhone(checkoutForm.elements.customer_phone.value);
updatePhoneHint();updateCheckout();loadCatalog();
