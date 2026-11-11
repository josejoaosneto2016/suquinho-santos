const { createApi } = require('../server/family-api');
const { normalizeUrl } = require('../server/deployment');
const handle = createApi();
module.exports = (req, res) => {
  try { req.url = normalizeUrl(req.url); }
  catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ error: { code: 'INVALID_ROUTE', message: 'Rota inválida.' } }));
  }
  return handle(req, res);
};
