const fs = require("fs");
const http = require("http");

const keysPath = "C:/Users/david/Documents/Do-Wallet-Archives/20260619-runtime-separation/backups/edge-origin-wallet-keys/keys-20260615234409.json";
const safePath = "C:/Users/david/Documents/Do-Wallet-Archives/20260619-runtime-separation/backups/edge-origin-wallet-keys/keys-public-safe-20260616.json";
const statusPath = "C:/Users/david/Documents/Do-Wallet-Archives/20260619-runtime-separation/backups/local-wallet-restore-status.json";
const port = 23888;

function writeStatus(status) {
  fs.mkdirSync(require("path").dirname(statusPath), { recursive: true });
  fs.writeFileSync(statusPath, JSON.stringify(Object.assign({ updatedAt: new Date().toISOString() }, status), null, 2));
}

const full = JSON.parse(fs.readFileSync(keysPath, "utf8").replace(/^\uFEFF/, ""));
const safe = JSON.parse(fs.readFileSync(safePath, "utf8"));
const wallets = JSON.parse(full.value);
const recovered = Array.isArray(safe.value) ? safe.value : [];
const payload = JSON.stringify({ keys: full.value, recovered });

let served = false;
let server;

function finish() {
  writeStatus({ served, walletCount: wallets.length, recoveredCount: recovered.length });
  try {
    server.close();
  } catch (error) {}
  setTimeout(function () {
    process.exit(served ? 0 : 2);
  }, 100);
}

server = http.createServer(function (req, res) {
  const origin = req.headers.origin || "";
  const allowed = origin === "https://do-wallet.com" || origin === "https://www.do-wallet.com";

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const path = req.url.split("?")[0];
  if (req.method !== "GET" || (path !== "/do-wallet-local-restore" && path !== "/do-wallet-restore") || !allowed) {
    res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end("not found");
    return;
  }

  served = true;
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
  setTimeout(finish, 750);
});

server.listen(port, "127.0.0.1", function () {
  writeStatus({ served: false, listening: true, walletCount: wallets.length, recoveredCount: recovered.length });
});

setTimeout(finish, 10 * 60 * 1000);
