const loginSection = document.querySelector('#login-section');
const dashboard = document.querySelector('#dashboard');
const form = document.querySelector('#login-form');
const loginButton = document.querySelector('#login-button');
const connectionStatus = document.querySelector('#connection-status');
const panelStatus = document.querySelector('#panel-status');
let selectedCycle = null;
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const labels = { received: 'Recebido', confirmed: 'Confirmado', production: 'Em produção', delivered: 'Entregue', cancelled: 'Cancelado', pending: 'Aguardando Pix', review: 'Conferir comprovante', paid: 'Pago', divergent: 'Pagamento com divergência', refunded: 'Reembolsado' };

async function api(path, body) {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error?.message || 'Não foi possível concluir.'); error.status = response.status; throw error; }
  return data;
}
function showLogin(message = '') {
  dashboard.hidden = true; loginSection.hidden = false;
  document.querySelector('#metrics').replaceChildren();
  document.querySelector('#orders-list').replaceChildren();
  document.querySelector('#production-list').replaceChildren();
  document.querySelector('#cash-list').replaceChildren();
  connectionStatus.textContent = message;
  form.elements.password.value = '';
}
function text(tag, content, className) {
  const element = document.createElement(tag); element.textContent = content;
  if (className) element.className = className;
  return element;
}
function render(data) {
  loginSection.hidden = true; dashboard.hidden = false;
  document.querySelector('#greeting').textContent = `Olá, ${data.member.display_name}!`;
  document.querySelector('#cycle-title').textContent = data.cycle ? `Entrega de ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${data.cycle.delivery_date}T12:00:00Z`))}` : 'Nenhuma rodada cadastrada';
  selectedCycle=data.cycle?.id||null;
  const cycleSelect=document.querySelector('#cycle-select');cycleSelect.replaceChildren();
  for(const cycle of data.cycles||[]){
    const option=text('option',new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(cycle.delivery_date+'T12:00:00Z'))+' · '+({draft:'Rascunho',open:'Aberta',closed:'Fechada',completed:'Concluída'}[cycle.status]||cycle.status));
    option.value=cycle.id;option.selected=cycle.id===selectedCycle;cycleSelect.append(option);
  }
  cycleSelect.disabled=!(data.cycles||[]).length;
  const cycleActions=document.querySelector('#cycle-actions');cycleActions.replaceChildren();
  if(data.cycle){
    const closes=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(data.cycle.closes_at));
    cycleActions.append(text('p','Fechamento: '+closes+' (horário de Brasília).'));
    if(data.cycle.status!=='open'&&new Date(data.cycle.closes_at)>new Date()){
      const button=text('button','Abrir encomendas','button');button.type='button';
      button.addEventListener('click',()=>mutate('/api/admin/cycles',{id:selectedCycle,status:'open'},button));cycleActions.append(button);
    }
    if(data.cycle.status==='open'){
      const button=text('button','Fechar encomendas','button');button.type='button';
      button.addEventListener('click',()=>mutate('/api/admin/cycles',{id:selectedCycle,status:'closed'},button));cycleActions.append(button);
    }
  }
  const metrics = document.querySelector('#metrics'); metrics.replaceChildren();
  if (data.summary) {
    for (const [title, value] of [['Pedidos', data.summary.order_count], ['Valor encomendado', money(data.summary.ordered_cents)], ['Recebimentos registrados', money(data.summary.receipt_cents)], ['Despesas registradas', money(data.summary.expense_cents)], ['Movimento líquido da rodada', money(data.summary.movement_cents)], ['Comprovantes a conferir', data.summary.awaiting_review]]) {
      const card = text('div', '', 'metric'); card.append(text('span', title), text('strong', value)); metrics.append(card);
    }
  }
  const orders = document.querySelector('#orders-list'); orders.replaceChildren();
  if (!data.orders.length) orders.append(text('p', 'Nenhum pedido nesta rodada.'));
  for (const order of data.orders) {
    const card = text('article', '', 'record');
    card.append(text('strong', `${order.reference} · ${order.customer_name}`), text('span', `${labels[order.status] || order.status} · ${labels[order.payment_status] || order.payment_status}`), text('span', money(order.total_cents)));
    card.append(text('span',order.customer_phone||''),text('span',order.delivery_notes||''));
    card.append(text('span',(order.order_items||[]).map(item=>item.quantity+' × '+item.product_name).join(' · ')));
    if(order.receipt_late)card.append(text('p','Comprovante enviado após o fechamento. Confira a disponibilidade antes de incluir na produção.','panel-notice'));
    for(const receipt of order.payment_receipts||[]){
      if(receipt.validation_status!=='valid')continue;
      const view=text('button','Preparar comprovante','button button-secondary');view.type='button';
      view.addEventListener('click',async()=>{
        view.disabled=true;
        try{
          const result=await api('/api/admin/receipts/'+receipt.id+'/view',{});
          const link=text('a','Abrir comprovante (link válido por 1 minuto)');link.href=result.url;link.target='_blank';link.rel='noreferrer noopener';
          card.querySelector('.receipt-link')?.remove();link.className='receipt-link';card.append(link);
        }catch(error){panelStatus.textContent=error.message;}finally{view.disabled=false;}
      });card.append(view);
    }
    if(order.payment_status==='review'&&order.status!=='cancelled'){
      const label=text('label','', 'payment-check'),checkbox=document.createElement('input');
      checkbox.type='checkbox';label.append(checkbox,document.createTextNode(' Conferi na conta o Pix de '+money(order.total_cents)+' e posso confirmar esta entrega.'));
      const confirm=text('button','Confirmar Pix recebido','button');confirm.type='button';confirm.disabled=true;
      checkbox.addEventListener('change',()=>confirm.disabled=!checkbox.checked);
      confirm.addEventListener('click',()=>mutate('/api/admin/orders/'+order.id+'/confirm-payment',{},confirm));card.append(label,confirm);
    }
    if(order.payment_status==='paid'&&['confirmed','production'].includes(order.status)){
      if(order.status==='confirmed'){
        const produce=text('button','Colocar em produção','button');produce.type='button';produce.addEventListener('click',()=>mutate('/api/admin/orders/'+order.id+'/status',{status:'production'},produce));card.append(produce);
      }
      const deliver=text('button','Marcar entregue','button');deliver.type='button';deliver.addEventListener('click',()=>mutate('/api/admin/orders/'+order.id+'/status',{status:'delivered'},deliver));card.append(deliver);
    }
    if(order.status==='received'&&order.payment_status==='pending'){
      const cancel=text('button','Cancelar pedido não pago','button button-secondary');cancel.type='button';
      cancel.addEventListener('click',()=>{if(window.confirm('Confira que não houve Pix para este pedido. Cancelar a encomenda sem pagamento?'))mutate('/api/admin/orders/'+order.id+'/status',{status:'cancelled'},cancel);});card.append(cancel);
    }
    orders.append(card);
  }
  const production = document.querySelector('#production-list'); production.replaceChildren();
  for (const item of data.summary?.production || []) production.append(text('li', `${item.name}: ${item.quantity} garrafas`));
  if (!production.children.length) production.append(text('li', 'Nenhuma garrafa pendente de produção nesta rodada.'));
  const cash = document.querySelector('#cash-list'); cash.replaceChildren();
  if (!data.entries.length) cash.append(text('p', 'Nenhum movimento vinculado a esta rodada.'));
  for (const entry of data.entries) {
    const card = text('article', '', 'record'); card.append(text('strong', entry.description), text('span', `${entry.direction === 'in' ? 'Entrada' : 'Saída'} · ${money(entry.amount_cents)}`)); cash.append(card);
  }
  panelStatus.textContent = data.cycle ? 'Dados atualizados.' : 'O responsável precisa cadastrar a primeira rodada para começar.';
}
async function loadOverview() {
  panelStatus.textContent = 'Carregando…';
  try { render(await api('/api/admin/overview'+(selectedCycle?'?cycle_id='+selectedCycle:''))); }
  catch (error) {
    // Não manter dados privados visíveis após expiração ou perda de autorização.
    if ([401, 403].includes(error.status)) showLogin(error.message);
    else { showLogin(error.message || 'Falha de conexão. Tente novamente.'); }
  }
}
async function mutate(path,body,button){
  button.disabled=true;panelStatus.textContent='Salvando…';
  try{await api(path,body);await loadOverview();}
  catch(error){panelStatus.textContent=error.message||'Falha ao salvar. Tente novamente.';button.disabled=false;}
}
document.querySelector('#cycle-select').addEventListener('change',event=>{selectedCycle=event.target.value;loadOverview();});
document.querySelector('#cycle-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=document.querySelector('#create-cycle');button.disabled=true;
  try{const result=await api('/api/admin/cycles',{delivery_date:event.target.elements.delivery_date.value,status:'draft'});selectedCycle=result.cycle.id;await loadOverview();}
  catch(error){panelStatus.textContent=error.message||'Não foi possível criar a rodada.';}
  finally{button.disabled=false;}
});
form.addEventListener('submit', async event => {
  event.preventDefault(); loginButton.disabled = true; connectionStatus.textContent = 'Entrando…';
  try { await api('/api/auth/login', { email: form.elements.email.value, password: form.elements.password.value }); form.elements.password.value = ''; await loadOverview(); }
  catch (error) { showLogin(error.message || 'Falha de conexão. Tente novamente.'); }
  finally { loginButton.disabled = false; }
});
document.querySelector('#logout-button').addEventListener('click', async () => {
  try { await api('/api/auth/logout', {}); showLogin('Você saiu do painel.'); }
  catch { panelStatus.textContent = 'Não foi possível encerrar a sessão. Confira a conexão e tente sair novamente.'; }
});
document.querySelector('#refresh-button').addEventListener('click', loadOverview);
window.addEventListener('pageshow', event => { if (event.persisted) { showLogin('Conferindo sua sessão…'); start(); } });
async function start() {
  try {
    const health = await api('/api/health');
    if (!health.configured) { connectionStatus.textContent = 'O painel está pronto para conectar. Aguardando a configuração do Supabase pelo responsável.'; return; }
    loginButton.disabled = false;
    try { await api('/api/auth/session'); await loadOverview(); }
    catch (error) { showLogin(error.status === 401 ? 'Use sua conta autorizada para entrar.' : error.message); }
  } catch { connectionStatus.textContent = 'Não foi possível conectar ao servidor. Tente atualizar a página.'; }
}
start();
