function appOrigin(env) {
  if (env.APP_ORIGIN) return env.APP_ORIGIN.replace(/\/$/, '');
  const domain = env.VERCEL_ENV === 'production'
    ? env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL
    : env.VERCEL_URL;
  return domain ? 'https://' + domain : 'http://127.0.0.1:5173';
}
function normalizeUrl(value) {
  const url = new URL(value, 'http://localhost');
  if (url.pathname === '/api/index') {
    const route = url.searchParams.get('_route') || '';
    if (!/^[a-zA-Z0-9/_-]*$/.test(route)) throw new Error('Rota inválida');
    url.pathname = '/api/' + route;
  }
  url.searchParams.delete('_route');
  return url.pathname + url.search;
}
module.exports = { appOrigin, normalizeUrl };
