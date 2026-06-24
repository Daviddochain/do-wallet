/* scripts/test-chains.js
   Usage:
     node scripts/test-chains.js ./src/config/chains
   or:
     node scripts/test-chains.js ./chains

   It loads each *.js file that exports an object (module.exports = {...})
   and tests lcd/rpc/api endpoints.
*/

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS || 8000);
const CONCURRENCY = Number(process.env.TEST_CONCURRENCY || 8);

function isHttpUrl(s) {
  return typeof s === "string" && (s.startsWith("http://") || s.startsWith("https://"));
}

function requestJson(urlStr, { timeoutMs = TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    if (!isHttpUrl(urlStr)) {
      return resolve({ ok: false, status: null, ms: 0, error: "Not a http(s) URL" });
    }

    let url;
    try {
      url = new URL(urlStr);
    } catch {
      return resolve({ ok: false, status: null, ms: 0, error: "Invalid URL" });
    }

    const lib = url.protocol === "https:" ? https : http;

    const start = Date.now();
    const req = lib.request(
      {
        method: "GET",
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        headers: {
          "User-Agent": "dochain-wallet-endpoint-tester/1.0",
          Accept: "application/json",
        },
      },
      (res) => {
        const { statusCode } = res;
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          const ms = Date.now() - start;

          try {
            const json = JSON.parse(raw);
            resolve({ ok: statusCode >= 200 && statusCode < 300, status: statusCode, ms, json });
          } catch (e) {
            resolve({
              ok: false,
              status: statusCode,
              ms,
              error: `Non-JSON response (${raw.slice(0, 80).replace(/\s+/g, " ")}...)`,
            });
          }
        });
      }
    );

    req.on("error", (err) => {
      const ms = Date.now() - start;
      resolve({ ok: false, status: null, ms, error: err.message });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms`));
    });

    req.end();
  });
}

function normalizeBaseUrl(base) {
  if (!base) return base;
  return String(base).replace(/\/+$/, "");
}

async function testChainConfig(cfg, filename) {
  const chainID = cfg.chainID || "(missing chainID)";
  const name = cfg.name || chainID;

  const lcd = normalizeBaseUrl(cfg.lcd);
  const api = normalizeBaseUrl(cfg.api);
  const rpc = normalizeBaseUrl(cfg.rpc);

  const lcdTestUrl = lcd
    ? `${lcd}/cosmos/base/tendermint/v1beta1/blocks/latest`
    : null;

  const rpcTestUrl = rpc ? `${rpc}/status` : null;

  const lcdNodeInfoUrl = lcd
    ? `${lcd}/cosmos/base/tendermint/v1beta1/node_info`
    : null;

  const [lcdRes, rpcRes] = await Promise.all([
    lcdTestUrl ? requestJson(lcdTestUrl) : Promise.resolve({ ok: false, error: "missing lcd" }),
    rpcTestUrl ? requestJson(rpcTestUrl) : Promise.resolve({ ok: false, error: "missing rpc" }),
  ]);

  let height = null;
  if (lcdRes?.json?.block?.header?.height) height = lcdRes.json.block.header.height;
  if (!height && rpcRes?.json?.result?.sync_info?.latest_block_height)
    height = rpcRes.json.result.sync_info.latest_block_height;

  const ok = !!(lcdRes.ok && rpcRes.ok);

  return {
    ok,
    chainID,
    name,
    file: filename,
    lcd: lcd || null,
    rpc: rpc || null,
    api: api || null,
    height,
    lcdRes,
    rpcRes,
  };
}

function loadConfig(filePath) {
  const mod = require(filePath);
  return mod && mod.default ? mod.default : mod;
}

function listJsFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const e of entries) {
    const full = path.join(dir, e.name);

    // 🔴 IGNORE testnets + localterra
    if (e.isDirectory()) {
      if (e.name === "testnet" || e.name === "localterra") {
        continue;
      }
      out.push(...listJsFiles(full));
    }

    else if (e.isFile() && e.name.endsWith(".js")) {
      out.push(full);
    }
  }

  return out;
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let idx = 0;

  async function next() {
    const i = idx++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    return next();
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(runners);
  return results;
}

function fmtMs(ms) {
  if (ms == null) return "-";
  return `${ms}ms`;
}

function printResult(r) {
  const badge = r.ok ? "✅" : "❌";
  const height = r.height ?? "-";

  const lcdLine = r.lcd
    ? `${r.lcdRes.ok ? "✅" : "❌"} LCD (${fmtMs(r.lcdRes.ms)})`
    : "❌ LCD (missing)";

  const rpcLine = r.rpc
    ? `${r.rpcRes.ok ? "✅" : "❌"} RPC (${fmtMs(r.rpcRes.ms)})`
    : "❌ RPC (missing)";

  const extra = [];
  if (!r.lcdRes.ok && r.lcdRes.error) extra.push(`LCD: ${r.lcdRes.error}`);
  if (!r.rpcRes.ok && r.rpcRes.error) extra.push(`RPC: ${r.rpcRes.error}`);

  console.log(`${badge} ${r.name} (${r.chainID})  height=${height}`);
  console.log(`   ${lcdLine} | ${rpcLine}`);
  if (extra.length) console.log(`   ${extra.join(" | ")}`);
  console.log(`   file: ${r.file}`);
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: node scripts/test-chains.js <chains-config-folder>");
    process.exit(1);
  }

  const absDir = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error(`Not a directory: ${absDir}`);
    process.exit(1);
  }

  const files = listJsFiles(absDir);

  console.log(`Testing ${files.length} chain config files...`);
  console.log(`timeout=${TIMEOUT_MS}ms concurrency=${CONCURRENCY}\n`);

  const results = await runPool(
    files,
    async (file) => {
      const rel = path.relative(process.cwd(), file);
      try {
        const cfg = loadConfig(file);
        return await testChainConfig(cfg, rel);
      } catch (e) {
        return {
          ok: false,
          chainID: "(unknown)",
          name: "(require failed)",
          file: rel,
          lcdRes: { ok: false, error: e.message },
          rpcRes: { ok: false, error: e.message },
          lcd: null,
          rpc: null,
          api: null,
          height: null,
        };
      }
    },
    CONCURRENCY
  );

  const ok = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);

  for (const r of results) printResult(r);

  console.log("\n====================");
  console.log(`PASS: ${ok.length}`);
  console.log(`FAIL: ${bad.length}`);
  console.log("====================");

  if (bad.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});