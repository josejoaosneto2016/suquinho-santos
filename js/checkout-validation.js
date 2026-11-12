(function (root) {
 'use strict';
 function phoneDigits(value) {
  const text=String(value||'').trim();
  const digits=text.replace(/\D/g,'');
  return digits.startsWith('55')&&([12,13].includes(digits.length)||text.startsWith('+55'))?digits.slice(2):digits;
 }
 function formatPhone(value) {
  const digits=phoneDigits(value);
  if(digits.length>11)return digits;
  if(!digits)return '';
  if(digits.length<3)return '('+digits;
  const number=digits.slice(2),split=digits.length>10?5:4;
  return '('+digits.slice(0,2)+') '+number.slice(0,split)+(number.length>split?'-'+number.slice(split):'');
 }
 function phoneHint(value) {
  const size=phoneDigits(value).length;
  if(!size)return 'Digite o DDD e o número: 10 dígitos para fixo ou 11 para celular.';
  if(size<10)return size+' dígito'+(size===1?'':'s')+' informado'+(size===1?'':'s')+'. Continue: são 10 para fixo ou 11 para celular, incluindo o DDD.';
  if(size>11)return 'Há dígitos demais. Use DDD + número, com 10 ou 11 dígitos.';
  return 'Telefone com DDD preenchido ('+size+' dígitos). Confira se o número está correto.';
 }
 function validateCustomer({name='',phone='',notes=''}) {
  const errors={};
  if(name.trim().length<2)errors.customer_name='Informe seu nome com pelo menos 2 letras ou caracteres.';
  else if(name.trim().length>100)errors.customer_name='Use até 100 caracteres no nome.';
  const digits=phoneDigits(phone);
  if(!digits)errors.customer_phone='Informe seu telefone com DDD. Exemplo: (98) 98822-2276.';
  else if(digits.length<10)errors.customer_phone='Telefone incompleto: inclua o DDD e o número, com 10 ou 11 dígitos.';
  else if(digits.length>11)errors.customer_phone='O telefone tem dígitos demais. Use DDD + número (10 ou 11 dígitos).';
  if(notes.length>500)errors.delivery_notes='Use até 500 caracteres na observação de entrega.';
  return errors;
 }
 const validation={phoneDigits,formatPhone,phoneHint,validateCustomer};
 if(typeof module==='object'&&module.exports)module.exports=validation;
 else root.suquinhosValidation=validation;
})(typeof window==='undefined'?globalThis:window);
