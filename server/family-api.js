const { summarize } = require('./summary');
const { createCheckout, UUID } = require('./checkout-api');
class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const expired = () => new ApiError(401, 'SESSION_EXPIRED', 'Entre novamente para acessar o painel.');
function createApi({ env = process.env, fetchImpl = fetch } = {}) {
  const base = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  const origin = require('./deployment').appOrigin(env);
  const configured = Boolean(base && key && !base.includes('SEU_PROJETO') && !key.includes('PREENCHER'));
  const secure = origin.startsWith('https:');
  const cookie = (token, age) => `suquinhos_session=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
  async function provider(route, { token, method = 'GET', body } = {}) {
    let response;
    try {
      response = await fetchImpl(`${base}${route}`, { method, headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
    } catch { throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Não foi possível conectar. Tente novamente.'); }
    if (!response.ok) {
      if (route.startsWith('/auth/v1/token') && [400, 401, 422].includes(response.status)) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Confira seu e-mail e sua senha.');
      if ([401, 403].includes(response.status)) throw expired();
      if (response.status === 429) throw new ApiError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um pouco e tente novamente.');
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'O serviço ainda não está disponível. Tente novamente.');
    }
    return response.status === 204 ? null : response.json();
  }
  async function member(token) {
    if (!token) throw expired();
    const user = await provider('/auth/v1/user', { token });
    if (!/^[0-9a-f-]{36}$/i.test(user.id || '')) throw expired();
    const rows = await provider(`/rest/v1/family_members?select=user_id,display_name,role&user_id=eq.${user.id}&active=eq.true&limit=1`, { token });
    if (!rows.length) throw new ApiError(403, 'ACCESS_DENIED', 'Esta conta não tem acesso ao painel da família.');
    return rows[0];
  }
  async function bodyOf(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'JSON_REQUIRED', 'Envie os dados em JSON.');
    let raw;
    if (req.body !== undefined) raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    else {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 4096) throw new ApiError(413, 'BODY_TOO_LARGE', 'Dados muito longos.'); chunks.push(chunk); }
      raw = Buffer.concat(chunks).toString('utf8');
    }
    if (Buffer.byteLength(raw) > 4096) throw new ApiError(413, 'BODY_TOO_LARGE', 'Dados muito longos.');
    try { return JSON.parse(raw); } catch { throw new ApiError(400, 'INVALID_JSON', 'Dados inválidos.'); }
  }
  async function allRows(table, query, token) {
    const rows = [];
    for (let offset = 0; offset < 10000; offset += 500) {
      const page = await provider(`/rest/v1/${table}?${query}&limit=500&offset=${offset}`, { token });
      rows.push(...page);
      if (page.length < 500) return rows;
    }
    throw new ApiError(422, 'REPORT_TOO_LARGE', 'O período tem dados demais para esta consulta.');
  }
  const checkout = createCheckout({env,fetchImpl,member,bodyOf});
  return async function handle(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    try {
      const route = new URL(req.url, origin).pathname;
      if (route === '/api/health' && req.method === 'GET') return json(200, { configured });
      if (!configured) throw new ApiError(503, 'NOT_CONFIGURED', 'O painel está aguardando a conexão com o Supabase.');
      if (!secure && env.NODE_ENV === 'production') throw new ApiError(503, 'HTTPS_REQUIRED', 'Configure o endereço HTTPS do aplicativo.');
      if (req.method !== 'GET' && req.headers.origin !== origin) throw new ApiError(403, 'ORIGIN_DENIED', 'Origem da solicitação não permitida.');
      let token;
      try { token = decodeURIComponent((req.headers.cookie || '').split(/;\s*/).find(part => part.startsWith('suquinhos_session='))?.slice(18) || ''); } catch { throw expired(); }
      if (await checkout(req,route,token,json)) return;
      if (route === '/api/auth/login' && req.method === 'POST') {
        const body = await bodyOf(req);
        if (!body || typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) || body.email.length > 254 || typeof body.password !== 'string' || !body.password || body.password.length > 256) throw new ApiError(400, 'INVALID_CREDENTIALS', 'Preencha seu e-mail e sua senha.');
        const session = await provider('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: body.email.trim(), password: body.password } });
        if (!session.access_token || !Number.isFinite(session.expires_in)) throw expired();
        const family = await member(session.access_token);
        res.setHeader('Set-Cookie', cookie(session.access_token, Math.max(0, Math.min(3600, Math.floor(session.expires_in)))));
        return json(200, { member: family });
      }
      if (route === '/api/auth/logout' && req.method === 'POST') {
        res.setHeader('Set-Cookie', cookie('', 0));
        if (token) { try { await provider('/auth/v1/logout?scope=local', { token, method: 'POST' }); } catch { /* cookie local removido mesmo se o provedor estiver indisponível */ } }
        return json(200, { signed_out: true });
      }
      if (route === '/api/auth/session' && req.method === 'GET') return json(200, { member: await member(token) });
      if (route === '/api/admin/overview' && req.method === 'GET') {
        const family = await member(token);
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const requested = new URL(req.url,origin).searchParams.get('cycle_id');
        if (requested && !UUID.test(requested)) throw new ApiError(400,'VALIDATION_ERROR','Rodada inválida.');
        const cycles = await provider('/rest/v1/delivery_cycles?select=*&order=delivery_date.desc&limit=30', { token });
        const cycle = (requested ? cycles.find(item=>item.id===requested) : cycles.filter(item=>item.delivery_date>=today).sort((a,b)=>a.delivery_date.localeCompare(b.delivery_date))[0] || cycles[0]) || null;
        if (!cycle) return json(200, { member: family, cycles, cycle: null, orders: [], entries: [], summary: null });
        const [orders, entries] = await Promise.all([
          allRows('orders', `select=id,reference,customer_name,customer_phone,delivery_notes,receipt_late,status,payment_status,total_cents,created_at,order_items(product_name,quantity),payment_receipts(id,validation_status,mime_type)&cycle_id=eq.${cycle.id}&order=created_at.desc,id.asc`, token),
          allRows('cash_entries', `select=id,kind,direction,amount_cents,description,occurred_at&cycle_id=eq.${cycle.id}&order=occurred_at.desc,id.asc`, token),
        ]);
        return json(200, { member: family, cycles, cycle, orders, entries, summary: summarize(orders, entries) });
      }
      throw new ApiError(404, 'NOT_FOUND', 'Recurso não encontrado.');
    } catch (error) {
      if (error.status === 401) res.setHeader('Set-Cookie', cookie('', 0));
      json(error.status || 500, { error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'Não foi possível concluir a solicitação.' } });
    }
  };
}
module.exports = { createApi };
