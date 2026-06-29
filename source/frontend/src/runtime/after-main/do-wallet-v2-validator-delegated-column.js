(function () {
  "use strict";

  if (window.__doWalletValidatorDelegatedColumn20260629) return;
  window.__doWalletValidatorDelegatedColumn20260629 = true;

  var VERSION = "20260629-validator-delegated-column-5";
  var APPLY_DELAY_MS = 180;
  var fetchCache = {};
  var catalogPromise = null;
  var applyTimer = 0;
  var retryTimer = 0;
  var retryUntil = 0;

  var FALLBACK_CHAINS = {
    "Do-Chain": { name: "Do Chain", symbol: "DO", baseAsset: "udo", decimals: 6 },
    "columbus-5": { name: "Terra Classic (LUNC)", symbol: "LUNC", baseAsset: "uluna", decimals: 6 },
    "osmosis-1": { name: "Osmosis", symbol: "OSMO", baseAsset: "uosmo", decimals: 6 },
    "phoenix-1": { name: "Terra (LUNA)", symbol: "LUNA", baseAsset: "uluna", decimals: 6 },
    "cosmoshub-4": { name: "Cosmos", symbol: "ATOM", baseAsset: "uatom", decimals: 6 },
    "juno-1": { name: "Juno", symbol: "JUNO", baseAsset: "ujuno", decimals: 6 },
    "akashnet-2": { name: "Akash", symbol: "AKT", baseAsset: "uakt", decimals: 6 },
    "secret-4": { name: "Secret Network", symbol: "SCRT", baseAsset: "uscrt", decimals: 6 },
    "dungeon-1": { name: "Dungeon Chain", symbol: "DGN", baseAsset: "udgn", decimals: 6 },
  };

  var CHAIN_ALIASES = {
    "do": "Do-Chain",
    "do-chain": "Do-Chain",
    "dochain": "Do-Chain",
    "dochain-1": "Do-Chain",
    "888": "Do-Chain",
    "terra-classic": "columbus-5",
    "terra-classic-lunc": "columbus-5",
    "lunc": "columbus-5",
    "columbus-5": "columbus-5",
    "osmosis": "osmosis-1",
    "osmo": "osmosis-1",
    "osmosis-1": "osmosis-1",
    "terra": "phoenix-1",
    "luna": "phoenix-1",
    "phoenix-1": "phoenix-1",
    "cosmos": "cosmoshub-4",
    "atom": "cosmoshub-4",
    "cosmoshub-4": "cosmoshub-4",
    "juno": "juno-1",
    "juno-1": "juno-1",
    "akash": "akashnet-2",
    "akt": "akashnet-2",
    "akashnet-2": "akashnet-2",
    "secret": "secret-4",
    "scrt": "secret-4",
    "secret-4": "secret-4",
    "dungeon": "dungeon-1",
    "dungeon-chain": "dungeon-1",
    "dungeon-1": "dungeon-1",
  };

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function keyOf(value) {
    return lower(value)
      .replace(/&/g, "and")
      .replace(/[()]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function canonicalChainID(value) {
    var raw = clean(value);
    if (!raw) return "";
    return CHAIN_ALIASES[keyOf(raw)] || raw;
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function fetchJSON(path) {
    return window.fetch(path, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function decimalString(raw, decimals) {
    var value = clean(raw).replace(/,/g, "");
    var negative = value.charAt(0) === "-";
    if (negative) value = value.slice(1);
    if (/^\d+\.\d+$/.test(value)) value = value.split(".")[0];
    if (!/^\d+$/.test(value)) {
      var numeric = Number(value);
      value = Number.isFinite(numeric) && numeric > 0 ? String(Math.floor(numeric)) : "0";
    }
    decimals = Math.max(0, Number(decimals) || 0);
    if (decimals <= 0) return (negative ? "-" : "") + value;
    if (value.length <= decimals) value = "0".repeat(decimals - value.length + 1) + value;
    var whole = value.slice(0, -decimals) || "0";
    var fraction = value.slice(-decimals).replace(/0+$/, "");
    return (negative ? "-" : "") + (fraction ? whole + "." + fraction : whole);
  }

  function formatAmount(value) {
    var number = Number(value) || 0;
    var maxDecimals = number >= 100 ? 2 : number >= 1 ? 4 : 6;
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
  }

  function normalizeMoniker(value) {
    return lower(value)
      .replace(/\b(bonded|unbonded|unbonding|jailed|active|inactive|stake|commission|delegated)\b/g, " ")
      .replace(/\d+(?:\.\d+)?%/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function chainDisplayToken(chain) {
    chain = isObject(chain) ? chain : {};
    var base = clean(chain.baseAsset || chain.base_asset || chain.denom || chain.token);
    var symbol = clean(chain.symbol || chain.cmcSymbol);
    var decimals = Number(chain.decimals);
    var tokens = Array.isArray(chain.tokens) ? chain.tokens : [];
    for (var index = 0; index < tokens.length; index += 1) {
      var token = tokens[index] || {};
      if (!base || clean(token.token || token.denom) === base) {
        symbol = clean(token.symbol || symbol);
        decimals = Number(token.decimals != null ? token.decimals : decimals);
        base = clean(token.token || token.denom || base);
        break;
      }
    }
    return {
      denom: base,
      symbol: symbol || (base ? base.replace(/^u/, "").toUpperCase() : "COIN"),
      decimals: Number.isFinite(decimals) ? decimals : 6,
    };
  }

  function mergeCatalog(base, next) {
    var out = Object.assign({}, base || {});
    if (!isObject(next)) return out;
    Object.keys(next).forEach(function (chainID) {
      if (!isObject(next[chainID])) return;
      out[chainID] = Object.assign({}, out[chainID] || {}, next[chainID]);
    });
    return out;
  }

  function chainCatalog() {
    if (catalogPromise) return catalogPromise;
    var localChains = readJSON("CustomChains", {});
    var seeded = window.doWalletChainAssets && window.doWalletChainAssets.chains;
    var multichain = window.doWalletMultichainAssets && window.doWalletMultichainAssets.chains;
    var localCatalog = localChainCatalog();
    catalogPromise = fetchJSON("/station-assets/chains.json?v=" + VERSION).then(function (remote) {
      return mergeCatalog(localCatalog, remote);
    }, function () {
      return localCatalog;
    });
    return catalogPromise;
  }

  function localChainCatalog() {
    return mergeCatalog(
      mergeCatalog(
        mergeCatalog(FALLBACK_CHAINS, readJSON("CustomChains", {})),
        window.doWalletChainAssets && window.doWalletChainAssets.chains
      ),
      window.doWalletMultichainAssets && window.doWalletMultichainAssets.chains
    );
  }

  function chainFromPath() {
    var match = window.location.pathname.match(/\/network\/([^/?#]+)/i);
    return match ? canonicalChainID(decodeURIComponent(match[1])) : "";
  }

  function chainFromHeadings(catalog) {
    var headings = Array.prototype.slice.call(document.querySelectorAll("h1,h2,[data-testid],button,a,span"))
      .map(function (node) { return clean(node.textContent); })
      .filter(Boolean);
    var ids = Object.keys(catalog || {});
    for (var i = 0; i < headings.length; i += 1) {
      var key = keyOf(headings[i]);
      var alias = CHAIN_ALIASES[key];
      if (alias && catalog[alias]) return alias;
      for (var j = 0; j < ids.length; j += 1) {
        var chain = catalog[ids[j]] || {};
        if (key && key === keyOf(chain.name || ids[j])) return ids[j];
      }
    }
    return "";
  }

  function activeChainID(catalog) {
    return chainFromPath() || chainFromHeadings(catalog) || "Do-Chain";
  }

  function validatorsEndpoint(chainID) {
    return "/station-assets/api/lcd/" + encodeURIComponent(chainID) + "/cosmos/staking/v1beta1/validators?pagination.limit=500";
  }

  function validatorsForChain(chainID) {
    chainID = canonicalChainID(chainID);
    if (fetchCache[chainID]) return fetchCache[chainID];
    fetchCache[chainID] = fetchJSON(validatorsEndpoint(chainID)).then(function (json) {
      return Array.isArray(json && json.validators) ? json.validators : [];
    }, function () {
      return [];
    });
    return fetchCache[chainID];
  }

  function validatorMap(validators) {
    var map = {};
    (validators || []).forEach(function (validator) {
      var moniker = normalizeMoniker(validator && validator.description && validator.description.moniker);
      if (moniker) map[moniker] = validator;
    });
    return map;
  }

  function tableHeaderCells(table) {
    var row = table && table.querySelector("thead tr");
    if (!row) row = table && table.querySelector("tr");
    return row ? Array.prototype.slice.call(row.children) : [];
  }

  function delegatedColumn(table) {
    var headers = tableHeaderCells(table);
    for (var index = 0; index < headers.length; index += 1) {
      if (/\b(?:voting\s+power|delegated)\b/i.test(clean(headers[index].textContent))) return index;
    }
    return -1;
  }

  function validatorTables() {
    return Array.prototype.slice.call(document.querySelectorAll("table")).filter(function (table) {
      var index = delegatedColumn(table);
      if (index < 0) return false;
      var headers = tableHeaderCells(table).map(function (cell) {
        return lower(cell.textContent);
      });
      return headers.some(function (text) { return text.indexOf("moniker") >= 0; }) &&
        headers.some(function (text) { return text.indexOf("status") >= 0; }) &&
        headers.some(function (text) { return text.indexOf("commission") >= 0; }) &&
        headers.some(function (text) { return text.indexOf("stake") >= 0; });
    });
  }

  function tableRows(table) {
    var bodyRows = table ? Array.prototype.slice.call(table.querySelectorAll("tbody tr")) : [];
    if (bodyRows.length) return bodyRows;
    return table ? Array.prototype.slice.call(table.querySelectorAll("tr")).slice(1) : [];
  }

  function monikerFromRow(row) {
    var cell = row && row.children && row.children[0];
    if (!cell) return "";
    var lines = clean(cell.innerText || cell.textContent).split(/\s{2,}|\n/).map(clean).filter(Boolean);
    var raw = lines[0] || clean(cell.innerText || cell.textContent);
    return normalizeMoniker(raw);
  }

  function setCell(cell, text) {
    if (!cell || clean(cell.textContent) === text) return;
    cell.textContent = text;
    cell.setAttribute("data-do-wallet-validator-delegated-column", "1");
  }

  function patchTable(table, chainID, chain, validators) {
    var column = delegatedColumn(table);
    if (column < 0) return false;
    var headers = tableHeaderCells(table);
    if (headers[column]) headers[column].textContent = "Delegated";

    var token = chainDisplayToken(chain);
    var byMoniker = validatorMap(validators);
    var changed = false;
    tableRows(table).forEach(function (row) {
      var cells = Array.prototype.slice.call(row.children);
      var cell = cells[column];
      if (!cell) return;
      var validator = byMoniker[monikerFromRow(row)];
      if (!validator) return;
      var amount = decimalString(validator.tokens || "0", token.decimals);
      setCell(cell, formatAmount(amount) + " " + token.symbol);
      changed = true;
    });
    if (changed) {
      table.setAttribute("data-do-wallet-validator-delegated-chain", chainID);
      table.setAttribute("data-do-wallet-validator-delegated-version", VERSION);
    }
    return changed;
  }

  function apply() {
    if (!document.body) return;
    var tables = validatorTables();
    if (!tables.length) return;

    function patchWithCatalog(catalog) {
      var chainID = activeChainID(catalog);
      var chain = catalog[chainID] || FALLBACK_CHAINS[chainID] || {};
      tables.forEach(function (table) {
        var column = delegatedColumn(table);
        var headers = tableHeaderCells(table);
        if (column >= 0 && headers[column]) headers[column].textContent = "Delegated";
      });
      validatorsForChain(chainID).then(function (validators) {
        tables.forEach(function (table) {
          patchTable(table, chainID, chain, validators);
        });
      });
    }

    patchWithCatalog(localChainCatalog());
    chainCatalog().then(patchWithCatalog);
  }

  function hasPatchedTable() {
    return Array.prototype.slice.call(document.querySelectorAll("table")).some(function (table) {
      return table.getAttribute("data-do-wallet-validator-delegated-chain");
    });
  }

  function schedule() {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(apply, APPLY_DELAY_MS);
  }

  function startRetryWindow() {
    retryUntil = Date.now() + 45000;
    if (retryTimer) return;
    retryTimer = window.setInterval(function () {
      apply();
      if (hasPatchedTable() || Date.now() > retryUntil) {
        window.clearInterval(retryTimer);
        retryTimer = 0;
      }
    }, 750);
  }

  function kick() {
    schedule();
    startRetryWindow();
  }

  window.addEventListener("DOMContentLoaded", kick);
  window.addEventListener("load", kick);
  window.addEventListener("pageshow", kick);
  window.addEventListener("popstate", kick);
  window.addEventListener("hashchange", kick);
  window.addEventListener("do_wallet_portfolio_snapshot", kick);
  window.addEventListener("storage", kick);

  if (window.MutationObserver) {
    var observer = new MutationObserver(schedule);
    var observe = function () {
      if (!document.body) return;
      observer.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(function () { observer.disconnect(); }, 12000);
    };
    if (document.body) observe();
    else window.addEventListener("DOMContentLoaded", observe);
  }

  kick();
  window.setTimeout(schedule, 800);
  window.setTimeout(schedule, 2200);
})();
