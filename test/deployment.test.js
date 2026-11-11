const test = require('node:test');
const assert = require('node:assert/strict');
const { appOrigin, normalizeUrl } = require('../server/deployment');
test('origem HTTPS de produção e preview, com configuração local independente', () => {
  assert.equal(appOrigin({VERCEL_ENV:'production', VERCEL_PROJECT_PRODUCTION_URL:'suquinho.vercel.app', VERCEL_URL:'preview.vercel.app'}), 'https://suquinho.vercel.app');
  assert.equal(appOrigin({VERCEL_ENV:'preview', VERCEL_PROJECT_PRODUCTION_URL:'suquinho.vercel.app', VERCEL_URL:'preview.vercel.app'}), 'https://preview.vercel.app');
  assert.equal(appOrigin({}), 'http://127.0.0.1:5173');
  assert.equal(appOrigin({APP_ORIGIN:'https://example.com/'}), 'https://example.com');
});
test('reescrita preserva filtros e caminhos da API sem aceitar caminhos arbitrários', () => {
  assert.equal(normalizeUrl('/api/index?_route=admin/overview&cycle_id=abc'), '/api/admin/overview?cycle_id=abc');
  assert.equal(normalizeUrl('/api/catalog'), '/api/catalog');
  assert.throws(() => normalizeUrl('/api/index?_route=..%2F.env'));
});
