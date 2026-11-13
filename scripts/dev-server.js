const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createApi } = require("../server/family-api");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".webmanifest": "application/manifest+json", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8" };
const reloadClients = new Set();

function createServer(options = {}) {
const api = createApi(options);
return http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400).end("Bad request"); return; }
  if (pathname.startsWith("/api/")) { api(req, res); return; }
  if (options.liveReload && pathname === "/__dev-events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
    res.write(": connected\n\n");
    reloadClients.add(res);
    req.on("close", () => reloadClients.delete(res));
    return;
  }
  if (options.liveReload && pathname === "/__dev-client.js") {
    res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end("const events=new EventSource('/__dev-events');events.addEventListener('reload',()=>window.location.reload());");
    return;
  }
  if (pathname === "/") pathname = "/index.html";
  const publicPath = /^\/(index\.html|manifest\.webmanifest|(?:css|js|pages|assets)\/[^\0]+)$/.test(pathname);
  if (!publicPath || pathname.split(/[\\/]/).some(part => part.startsWith("."))) { res.writeHead(404).end("Not found"); return; }
  const file = path.resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end("Forbidden"); return; }
  fs.readFile(file, (error, contents) => {
    if (error) { res.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    if (options.liveReload && path.extname(file).toLowerCase() === ".html") {
      res.end(contents.toString("utf8").replace("</body>", "<script src=\"/__dev-client.js\" defer></script></body>"));
      return;
    }
    res.end(contents);
  });
});
}
if (require.main === module) {
  const envPath = path.join(root, '.env.local');
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
  const port = Number(process.env.PORT || 5173);
  const server = createServer({ liveReload: true });
  server.listen(port, '127.0.0.1', () => console.log(`Suquinhos Santos disponível em http://127.0.0.1:${port}`));
  let reloadTimer;
  const scheduleReload = () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      for (const client of reloadClients) client.write("event: reload\ndata: changed\n\n");
    }, 180);
  };
  const watchers = [
    fs.watch(root, (_event, filename) => {
      if (["index.html", "manifest.webmanifest"].includes(String(filename || ""))) scheduleReload();
    }),
    ...["css", "js", "pages", "assets"].map(directory => fs.watch(path.join(root, directory), { recursive: true }, scheduleReload))
  ];
  for (const watcher of watchers) watcher.on("error", error => console.error("Falha ao acompanhar alterações:", error.message));
}
module.exports = { createServer };
