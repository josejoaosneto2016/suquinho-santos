const test=require('node:test');
const assert=require('node:assert/strict');
const {phoneDigits,formatPhone,validateCustomer}=require('../js/checkout-validation');
test('telefone sem DDD aponta o campo e não autoriza envio',()=>{
 const errors=validateCustomer({name:'Pessoa de teste',phone:'988222276'});
 assert.match(errors.customer_phone,/DDD/);
 assert.deepEqual(Object.keys(errors),['customer_phone']);
});
test('aceita celular, fixo e número colado com código do Brasil',()=>{
 for(const phone of ['(98) 98822-2276','(98) 3222-2276','+55 (98) 98822-2276'])assert.deepEqual(validateCustomer({name:'Teste',phone}),{});
 assert.equal(formatPhone('98988222276'),'(98) 98822-2276');
 assert.equal(formatPhone('9832222276'),'(98) 3222-2276');
 assert.equal(phoneDigits('+55 (98) 98822-2276'),'98988222276');
 assert.equal(phoneDigits('(55) 99882-2276'),'55998822276');
});
test('aponta todos os campos inválidos e preserva excesso para correção',()=>{
 assert.deepEqual(Object.keys(validateCustomer({name:' ',phone:'',notes:'a'.repeat(501)})),['customer_name','customer_phone','delivery_notes']);
 assert.match(validateCustomer({name:'Teste',phone:'12345678901234'}).customer_phone,/demais/);
 assert.equal(formatPhone('12345678901234'),'12345678901234');
});
