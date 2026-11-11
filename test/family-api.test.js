const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { createApi } = require('../server/family-api');
const { summarize } = require('../server/summary');
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', APP_ORIGIN: 'https://suquinhos.example', NODE_ENV: 'production' };
const userId = '11111111-1111-4111-8111-111111111111';
const family = { user_id: userId, display_name: 'Pessoa fictícia', role: 'owner' };
const ok = data => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
function provider(overrides = {}) {
  return async (url, options) => {
    if (overrides.handle) { const result = overrides.handle(url, options); if (result) return result; }
    if (url.includes('/token?')) return ok({ access_token: 'test-token', expires_in: 3600 });
    if (url.endsWith('/user')) { assert.equal(options.headers.Authorization, 'Bearer test-token'); return ok({ id: userId }); }
    if (url.includes('/family_members?')) return ok(overrides.denied ? [] : [family]);
    if (url.includes('/delivery_cycles?')) return ok([]);
    if (url.includes('/logout')) return new Response(null, { status: 204 });
    throw new Error('Unexpected provider call');
  };
}
async function request(handler, route, { method = 'GET', body, headers = {} } = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
  Object.assign(req, { url: route, method, headers: { ...(method === 'POST' ? { origin: env.APP_ORIGIN, 'content-type': 'application/json' } : {}), ...headers } });
  const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, end(data) { this.body = JSON.parse(data); } };
  await handler(req, res); return res;
}
test('sem configuração: não oferece acesso nem chama provedor', async () => {
  const api = createApi({ env: {}, fetchImpl: () => { throw Error('must not call'); } });
  assert.equal((await request(api, '/api/health')).body.configured, false);
  const result = await request(api, '/api/admin/overview');
  assert.equal(result.statusCode, 503); assert.equal(result.body.error.code, 'NOT_CONFIGURED');
});
test('visitante não acessa painel; resposta não pode ser cacheada', async () => {
  const result = await request(createApi({ env, fetchImpl: provider() }), '/api/admin/overview');
  assert.equal(result.statusCode, 401); assert.equal(result.headers['cache-control'], 'no-store');
});
test('login de familiar usa cookie HttpOnly, Secure e não devolve token', async () => {
  const result = await request(createApi({ env, fetchImpl: provider() }), '/api/auth/login', { method: 'POST', body: { email: 'teste@example.com', password: 'senha-ficticia' } });
  assert.equal(result.statusCode, 200); assert.equal(result.body.member.user_id, userId);
  assert.match(result.headers['set-cookie'], /HttpOnly; SameSite=Strict; Max-Age=3600; Secure/);
  assert(!JSON.stringify(result.body).includes('test-token'));
});
test('conta autenticada sem associação não ganha acesso ou cookie', async () => {
  const result = await request(createApi({ env, fetchImpl: provider({ denied: true }) }), '/api/auth/login', { method: 'POST', body: { email: 'teste@example.com', password: 'senha-ficticia' } });
  assert.equal(result.statusCode, 403); assert.equal(result.headers['set-cookie'], undefined);
});
test('autorização revogada bloqueia sessão existente', async () => {
  const result = await request(createApi({ env, fetchImpl: provider({ denied: true }) }), '/api/admin/overview', { headers: { cookie: 'suquinhos_session=test-token' } });
  assert.equal(result.statusCode, 403);
});
test('sessão válida devolve rodada vazia sem inventar dados', async () => {
  const result = await request(createApi({ env, fetchImpl: provider() }), '/api/admin/overview', { headers: { cookie: 'suquinhos_session=test-token' } });
  assert.equal(result.statusCode, 200); assert.equal(result.body.cycle, null); assert.equal(result.body.summary, null);
});
test('bloqueia solicitação de login de outra origem', async () => {
  const result = await request(createApi({ env, fetchImpl: provider() }), '/api/auth/login', { method: 'POST', headers: { origin: 'https://outro.example' }, body: {} });
  assert.equal(result.statusCode, 403); assert.equal(result.body.error.code, 'ORIGIN_DENIED');
});
test('validação de credenciais e corpo malformado', async () => {
  const api = createApi({ env, fetchImpl: provider() });
  assert.equal((await request(api, '/api/auth/login', { method: 'POST', body: null })).statusCode, 400);
  assert.equal((await request(api, '/api/auth/login', { method: 'POST', body: '{' })).statusCode, 400);
  assert.equal((await request(api, '/api/auth/login', { method: 'POST', body: { email: 'x', password: 'y' } })).statusCode, 400);
  assert.equal((await request(api, '/api/auth/login', { method: 'POST', body: 'x'.repeat(4097) })).statusCode, 413);
});
test('erro de credencial é genérico e não vaza resposta do provedor', async () => {
  const api = createApi({ env, fetchImpl: async () => new Response('sensitive-provider-data', { status: 400 }) });
  const result = await request(api, '/api/auth/login', { method: 'POST', body: { email: 'teste@example.com', password: 'senha' } });
  assert.equal(result.statusCode, 401); assert.equal(result.body.error.code, 'INVALID_CREDENTIALS');
  assert(!JSON.stringify(result.body).includes('sensitive'));
});
test('falha de rede é indisponibilidade, não senha errada', async () => {
  const api = createApi({ env, fetchImpl: async () => { throw Error('private error'); } });
  const result = await request(api, '/api/auth/login', { method: 'POST', body: { email: 'teste@example.com', password: 'senha' } });
  assert.equal(result.statusCode, 503); assert(!JSON.stringify(result.body).includes('private error'));
});
test('logout apaga cookie mesmo com provedor indisponível', async () => {
  const api = createApi({ env, fetchImpl: async () => { throw Error('offline'); } });
  const result = await request(api, '/api/auth/logout', { method: 'POST', body: {}, headers: { cookie: 'suquinhos_session=test-token' } });
  assert.equal(result.statusCode, 200); assert.match(result.headers['set-cookie'], /Max-Age=0/);
});
test('produção exige pagamento e não inclui entregues/cancelados; caixa não soma pedidos pendentes', () => {
  const item = { product_name: 'Laranja', quantity: 2 };
  const orders = [
    { status: 'confirmed', payment_status: 'paid', total_cents: 2400, order_items: [item] },
    { status: 'received', payment_status: 'review', total_cents: 2400, order_items: [item] },
    { status: 'delivered', payment_status: 'paid', total_cents: 2400, order_items: [item] },
    { status: 'cancelled', payment_status: 'paid', total_cents: 2400, order_items: [item] },
  ];
  const entries = [{ kind: 'sale_receipt', direction: 'in', amount_cents: 2400 }, { kind: 'expense', direction: 'out', amount_cents: 1000 }, { kind: 'contribution', direction: 'in', amount_cents: 5000 }];
  const result = summarize(orders, entries);
  assert.equal(result.order_count, 3); assert.equal(result.ordered_cents, 7200);
  assert.equal(result.receipt_cents, 2400); assert.equal(result.expense_cents, 1000); assert.equal(result.movement_cents, 6400);
  assert.equal(result.awaiting_review, 1); assert.deepEqual(result.production, [{ name: 'Laranja', quantity: 2 }]);
});
