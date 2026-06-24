import http from "node:http";
import https from "node:https";
import { createReadStream, stat } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(sourceRoot, "..", "..");
const frontendRoot = path.resolve(process.env.DO_WALLET_FRONTEND_ROOT || path.join(workspaceRoot, "current", "frontend"));
const stationRoot = path.resolve(process.env.DO_WALLET_STATION_ROOT || path.join(workspaceRoot, "current", "station-assets"));
const liveApiOrigin = process.env.DO_WALLET_LIVE_API_ORIGIN || "https://do-wallet.com";
const port = Number(process.env.PORT || 4188);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function resolveInside(base, requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const filePath = path.resolve(base, decoded.replace(/^\/+/, ""));
  return filePath.startsWith(base + path.sep) || filePath === base ? filePath : null;
}

function serveFile(res, filePath) {
  stat(filePath, (error, fileStat) => {
    if (error || !fileStat.isFile()) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    });
    createReadStream(filePath).pipe(res);
  });
}

function proxyLiveApi(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  let target;
  try {
    target = new URL(req.url || "/", liveApiOrigin);
  } catch (error) {
    send(res, 502, "Bad proxy target");
    return;
  }

  const headers = {
    ...req.headers,
    host: target.host,
    origin: liveApiOrigin,
    referer: `${liveApiOrigin}/`,
  };
  [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ].forEach((header) => delete headers[header]);

  const proxyReq = https.request(target, { method: req.method, headers }, (proxyRes) => {
    const responseHeaders = {
      ...proxyRes.headers,
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    };
    [
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade",
    ].forEach((header) => delete responseHeaders[header]);
    res.writeHead(proxyRes.statusCode || 502, responseHeaders);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (error) => send(res, 502, `Live API proxy failed: ${error.message}`));
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const pathname = requestUrl.pathname || "/";

  if (pathname.startsWith("/station-assets/api/")) {
    proxyLiveApi(req, res);
    return;
  }

  if (pathname.startsWith("/station-assets/")) {
    const stationPath = resolveInside(stationRoot, pathname.slice("/station-assets/".length));
    if (!stationPath) {
      send(res, 403, "Forbidden");
      return;
    }
    serveFile(res, stationPath);
    return;
  }

  const requested = resolveInside(frontendRoot, pathname);
  if (!requested) {
    send(res, 403, "Forbidden");
    return;
  }

  const hasExtension = Boolean(path.extname(requested));
  stat(requested, (error, fileStat) => {
    if (!error && fileStat.isFile()) {
      serveFile(res, requested);
      return;
    }
    if (!hasExtension) {
      serveFile(res, path.join(frontendRoot, "index.html"));
      return;
    }
    send(res, 404, "Not found");
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Do-Wallet source frontend server running at http://127.0.0.1:${port}/`);
  console.log(`Serving frontend from ${frontendRoot}`);
  console.log(`Serving station assets from ${stationRoot}`);
});
