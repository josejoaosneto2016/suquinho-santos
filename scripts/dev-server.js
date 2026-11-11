const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createApi } = require("../server/family-api");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".webmanifest": "application/manifest+json", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8" };

function createServer(options = {}) {
const api = createApi(options);
return http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400).end("Bad request"); return; }
  if (pathname.startsWith("/api/")) { api(req, res); return; }
  if (pathname === "/") pathname = "/index.html";
  const publicPath = /^\/(index\.html|manifest\.webmanifest|(?:css|js|pages|assets)\/[^\0]+)$/.test(pathname);
  if (!publicPath || pathname.split(/[\\/]/).some(part => part.startsWith("."))) { res.writeHead(404).end("Not found"); return; }
  const file = path.resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end("Forbidden"); return; }
  fs.readFile(file, (error, contents) => {
    if (error) { res.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(contents);
  });
});
}
if (require.main === module) {
  const envPath = path.join(root, '.env.local');
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
  const port = Number(process.env.PORT || 5173);
  createServer().listen(port, '127.0.0.1', () => console.log(`Suquinhos Santos disponível em http://127.0.0.1:${port}`));
}
module.exports = { createServer };
