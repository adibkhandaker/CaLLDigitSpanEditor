// Tiny static server for running the studio locally (no dependencies).
// Usage: npm start   (or: node server.js [port])
// Vercel ignores this file and serves the folder as a static site.

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const port = Number(process.argv[2] || process.env.PORT || 3000);
const root = __dirname;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = path.normalize(path.join(root, urlPath));

    // Only serve files inside this folder
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(port, () => {
    console.log(`Digit Span Studio running at http://localhost:${port}`);
    // Show LAN addresses so other laptops on the same Wi-Fi can connect
    Object.values(os.networkInterfaces())
      .flat()
      .filter((a) => a && a.family === "IPv4" && !a.internal)
      .forEach((a) => console.log(`On the same Wi-Fi:  http://${a.address}:${port}`));
  });
