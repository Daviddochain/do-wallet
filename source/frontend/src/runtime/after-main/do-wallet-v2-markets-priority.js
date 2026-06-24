(function () {
  "use strict";

  if (window.__doWalletMarketsPriority20260624Percent1) return;
  window.__doWalletMarketsPriority20260624Percent1 = true;

  var DO_CHAIN_ID = "Do-Chain";
  var LEGACY_DO_IDS = ["Do-Chain", "do-chain", "dochain"];
  var MARKET_REFRESH_MS = 60000;
  var MIN_DOM_PASS_MS = 2500;
  var MAX_JSON = 1024 * 1024;

  function shouldRunHere() {
    try {
      var protocol = window.location.protocol;
      if (protocol !== "https:" && protocol !== "http:") return false;
      var host = window.location.hostname.toLowerCase();
      return (
        host === "do-wallet.com" ||
        host === "www.do-wallet.com" ||
        host.endsWith(".do-wallet.com") ||
        host === "do-chain.com" ||
        host === "www.do-chain.com" ||
        host.endsWith(".do-chain.com") ||
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1"
      );
    } catch (error) {
      return false;
    }
  }

  if (!shouldRunHere()) return;

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function websiteLCDProxy(chainID) {
    try {
      if (!chainID) return "";
      var protocol = window.location.protocol;
      if (protocol !== "https:" && protocol !== "http:") return "";
      var host = window.location.hostname.toLowerCase();
      var isWalletHost = (
        host === "do-wallet.com" ||
        host === "www.do-wallet.com" ||
        host.endsWith(".do-wallet.com") ||
        host === "localhost" ||
        host === "127.0.0.1"
      );
      if (!isWalletHost) return "";
      return window.location.origin + "/station-assets/api/lcd/" + encodeURIComponent(String(chainID));
    } catch (error) {
      return "";
    }
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw || raw.length > MAX_JSON) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      var next = JSON.stringify(value);
      if (next.length > MAX_JSON || window.localStorage.getItem(key) === next) return false;
      window.localStorage.setItem(key, next);
      return true;
    } catch (error) {
      return false;
    }
  }

  function doChainConfig() {
    var proxy = websiteLCDProxy(DO_CHAIN_ID);
    var lcd = proxy || "https://do-chain.com";
    return {
      chainID: DO_CHAIN_ID,
      name: "Do Chain",
      networkType: "mainnet",
      lcd: lcd,
      api: lcd,
      upstreamLcd: proxy ? "https://do-chain.com" : undefined,
      upstreamApi: proxy ? "https://do-chain.com" : undefined,
      rpc: "https://do-chain.com/rpc",
      gasAdjustment: 2,
      gasPrices: { udo: 0.025 },
      prefix: "do",
      coinType: 888,
      baseAsset: "udo",
      icon: "/do-logo.jpg",
      alliance: false,
      channels: {},
      explorer: {
        name: "Do Chain Stats",
        url: "https://www.do-chain.com/stats",
        address: "https://www.do-chain.com/stats",
        tx: "https://www.do-chain.com/stats",
        validator: "https://www.do-chain.com/stats",
        block: "https://www.do-chain.com/stats",
      },
    };
  }

  function doTokenConfig() {
    return {
      denom: "udo",
      id: DO_CHAIN_ID + ":udo",
      token: "udo",
      symbol: "DO",
      name: "Do Chain",
      decimals: 6,
    };
  }

  function isLegacyDoID(value) {
    var id = clean(value).toLowerCase();
    return LEGACY_DO_IDS.indexOf(id) >= 0;
  }

  function isDoID(value) {
    return clean(value) === DO_CHAIN_ID || isLegacyDoID(value);
  }

  function isDoText(value) {
    var text = clean(value);
    if (!text) return false;
    if (text === DO_CHAIN_ID || /^Do Chain$/i.test(text) || /^DO$/i.test(text)) return true;
    return /(^|\s)(Do Chain|Do-Chain)(\s|$)/i.test(text) && !/Dungeon/i.test(text);
  }

  function reorderObjectDoFirst(object, ensuredValue) {
    if (!isObject(object)) return object;
    var next = {};
    var keys = Object.keys(object);
    if (ensuredValue !== undefined && ensuredValue !== null) {
      next[DO_CHAIN_ID] = isObject(ensuredValue)
        ? Object.assign({}, isObject(object[DO_CHAIN_ID]) ? object[DO_CHAIN_ID] : {}, ensuredValue)
        : ensuredValue;
    }
    keys
      .filter(function (key) { return isDoID(key) && key !== DO_CHAIN_ID; })
      .forEach(function () {});
    keys
      .filter(function (key) { return !isDoID(key); })
      .forEach(function (key) { next[key] = object[key]; });
    return next;
  }

  function uniqueDoFirst(list) {
    var output = [DO_CHAIN_ID];
    (Array.isArray(list) ? list : []).forEach(function (item) {
      if (isDoID(item)) return;
      if (output.indexOf(item) === -1) output.push(item);
    });
    return output;
  }

  function seedDoFirstStorage() {
    var changed = false;

    var customChains = readJSON("CustomChains", {});
    if (!isObject(customChains)) customChains = {};
    changed = writeJSON("CustomChains", reorderObjectDoFirst(customChains, doChainConfig())) || changed;

    var customLCD = readJSON("CustomLCD", {});
    if (!isObject(customLCD)) customLCD = {};
    changed = writeJSON("CustomLCD", reorderObjectDoFirst(customLCD, websiteLCDProxy(DO_CHAIN_ID) || "https://do-chain.com")) || changed;

    var customTokens = readJSON("CustomTokensInterchain", {});
    if (!isObject(customTokens)) customTokens = {};
    var doTokens = isObject(customTokens[DO_CHAIN_ID]) ? customTokens[DO_CHAIN_ID] : {};
    var native = Array.isArray(doTokens.native) ? doTokens.native.slice() : [];
    if (!native.some(function (token) { return token && (token.denom === "udo" || token.token === "udo"); })) {
      native.unshift(doTokenConfig());
    }
    customTokens[DO_CHAIN_ID] = Object.assign({ cw20: [], cw721: [] }, doTokens, { native: native });
    changed = writeJSON("CustomTokensInterchain", reorderObjectDoFirst(customTokens, customTokens[DO_CHAIN_ID])) || changed;

    var enabled = readJSON("EnabledNetworks", { time: 0, networks: [] });
    if (!isObject(enabled)) enabled = { time: 0, networks: [] };
    var networks = uniqueDoFirst(enabled.networks);
    if (JSON.stringify(networks) !== JSON.stringify(enabled.networks || [])) {
      changed = writeJSON("EnabledNetworks", Object.assign({}, enabled, { time: Date.now(), networks: networks })) || changed;
    }

    if (changed) {
      try {
        window.dispatchEvent(new CustomEvent("do_wallet_chain_assets_update", {
          detail: { source: "dochain-website-markets-priority-20260624-percent1", updatedAt: Date.now() }
        }));
      } catch (error) {}
    }
    return changed;
  }

  function visible(element) {
    if (!element || element.nodeType !== 1) return false;
    var rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    var style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function optionIsDo(option) {
    return isDoText(option.textContent) || isDoID(option.value);
  }

  function reorderNativeSelects() {
    Array.prototype.forEach.call(document.querySelectorAll("select,datalist"), function (select) {
      var options = Array.prototype.slice.call(select.children).filter(function (child) {
        return child.tagName === "OPTION" || child.tagName === "OPTGROUP";
      });
      var doOption = options.find(function (child) {
        if (child.tagName === "OPTION") return optionIsDo(child);
        return Array.prototype.slice.call(child.children).some(optionIsDo);
      });
      if (doOption && options[0] !== doOption) select.insertBefore(doOption, options[0]);
    });
  }

  function childIsDoChain(child) {
    if (!visible(child)) return false;
    var text = clean(child.innerText || child.textContent);
    if (text.length > 600) return false;
    return isDoText(text);
  }

  function parentLooksLikeChainList(parent) {
    var text = clean(parent.innerText || parent.textContent);
    if (text.length > 12000) return false;
    return /(Do Chain|Do-Chain|Secret Network|Terra Classic|Terra|Lunc|Luna|Dungeon Chain|Cosmos Hub|Osmosis|Juno|Injective|Kujira|Migaloo|Bitcoin|Ethereum|Solana|Network|Chain|columbus-5|phoenix-1|secret-4|dungeon-1)/i.test(text);
  }

  function networkChildKey(child) {
    if (!visible(child)) return "";
    var text = clean(child.innerText || child.textContent);
    if (!text || text.length > 96) return "";
    if (/^(Dashboard|Quarantine|Swap|Burn DO|History|Markets|NFT|Stake|Validator|Governance|Send|Receive|Buy \/ Sell|Manage|Activity|Assets)$/i.test(text)) return "";
    return text.toLowerCase().replace(/\s+/g, " ");
  }

  function dedupeDomLists() {
    var selectors = [
      "[role='listbox']",
      "[role='menu']",
      "ul",
      "ol",
      "[class*='chain']",
      "[class*='Chain']",
      "[class*='network']",
      "[class*='Network']",
    ].join(",");

    Array.prototype.forEach.call(document.querySelectorAll(selectors), function (parent) {
      if (!visible(parent) || !parentLooksLikeChainList(parent)) return;
      var children = Array.prototype.slice.call(parent.children).filter(visible);
      if (children.length < 2 || children.length > 160) return;
      var seen = {};
      children.forEach(function (child) {
        var key = networkChildKey(child);
        if (!key) return;
        if (seen[key]) {
          child.setAttribute("aria-hidden", "true");
          child.style.display = "none";
          return;
        }
        seen[key] = true;
      });
    });
  }

  function reorderDomLists() {
    var selectors = [
      "[role='listbox']",
      "[role='menu']",
      "ul",
      "ol",
      "tbody",
      "[class*='chain']",
      "[class*='Chain']",
      "[class*='network']",
      "[class*='Network']",
    ].join(",");

    Array.prototype.forEach.call(document.querySelectorAll(selectors), function (parent) {
      if (!visible(parent) || !parentLooksLikeChainList(parent)) return;
      var children = Array.prototype.slice.call(parent.children).filter(visible);
      if (children.length < 2 || children.length > 120) return;
      var doChild = children.find(childIsDoChain);
      if (!doChild || children[0] === doChild) return;
      parent.insertBefore(doChild, children[0]);
    });
  }

  function ensureStyles() {
    if (document.getElementById("dochain-markets-priority-20260624-percent1-style")) return;
    var style = document.createElement("style");
    style.id = "dochain-markets-priority-20260624-percent1-style";
    style.textContent = [
      ".do-market-chart-card{cursor:pointer;position:relative;overflow:hidden}",
      ".do-market-chart-card:focus{outline:2px solid #facc15;outline-offset:3px}",
      ".do-market-chart-card:hover{border-color:#facc15!important}",
      ".do-market-mini{display:flex;align-items:center;gap:10px;margin-top:10px}",
      ".do-market-mini svg{width:112px;height:34px;flex:0 0 112px}",
      ".do-market-mini path{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}",
      ".do-market-mini .do-market-fill{stroke-width:0;opacity:.14}",
      ".do-market-badge{font-weight:800;font-size:12px;line-height:1;padding:7px 9px;border-radius:999px;background:#131017;color:#d8c9ff;border:1px solid rgba(255,255,255,.12)}",
      ".do-market-badge.positive{color:#55f2a3;border-color:rgba(85,242,163,.35);background:rgba(85,242,163,.08)}",
      ".do-market-badge.negative{color:#ff7a8b;border-color:rgba(255,122,139,.35);background:rgba(255,122,139,.08)}",
      ".do-market-percent-cell{display:inline-flex;align-items:center;justify-content:flex-end;gap:5px;min-width:72px;font-weight:800;white-space:nowrap}",
      ".do-market-percent-cell.positive{color:#00d09c}",
      ".do-market-percent-cell.negative{color:#ff4058}",
      ".do-market-percent-cell.neutral{color:#c8bddf}",
      ".do-market-percent-arrow{font-size:11px;line-height:1;transform:translateY(-1px)}",
      ".do-market-modal{position:fixed;inset:0;z-index:2147482200;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(4,2,10,.72)}",
      ".do-market-modal[hidden]{display:none}",
      ".do-market-dialog{width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#120a1f;color:#fff;border:1px solid rgba(250,204,21,.5);border-radius:8px;box-shadow:0 24px 72px rgba(0,0,0,.55)}",
      ".do-market-dialog header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.1)}",
      ".do-market-dialog h2{font-size:24px;line-height:1.15;margin:0}",
      ".do-market-dialog p{margin:6px 0 0;color:#cdbaff;font-size:14px}",
      ".do-market-close{appearance:none;border:1px solid rgba(255,255,255,.2);background:#211631;color:#fff;border-radius:8px;width:40px;height:40px;font-size:24px;line-height:1;cursor:pointer}",
      ".do-market-chart-wrap{padding:18px 22px 22px}",
      ".do-market-chart-wrap svg{width:100%;height:260px;display:block;background:#090511;border:1px solid rgba(255,255,255,.1);border-radius:8px}",
      ".do-market-chart-wrap path{fill:none;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}",
      ".do-market-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}",
      ".do-market-metrics div{border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px;background:#17101f}",
      ".do-market-metrics span{display:block;color:#b8a7d9;font-size:12px;font-weight:800;text-transform:uppercase}",
      ".do-market-metrics strong{display:block;margin-top:6px;font-size:18px}",
      "@media (max-width:640px){.do-market-metrics{grid-template-columns:1fr}.do-market-chart-wrap svg{height:210px}}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function parseMoney(value) {
    var text = clean(value).replace(/[$,\s]/g, "");
    if (!text || text === "-") return NaN;
    var multiplier = 1;
    var suffix = text.slice(-1).toUpperCase();
    if (suffix === "K") multiplier = 1e3;
    if (suffix === "M") multiplier = 1e6;
    if (suffix === "B") multiplier = 1e9;
    if (suffix === "T") multiplier = 1e12;
    if (multiplier !== 1) text = text.slice(0, -1);
    var number = Number(text);
    return Number.isFinite(number) ? number * multiplier : NaN;
  }

  function parsePercent(value) {
    var match = clean(value).replace(/,/g, "").match(/[+-]?\d+(?:\.\d+)?/);
    var number = match ? Number(match[0]) : NaN;
    return Number.isFinite(number) ? number : 0;
  }

  function formatMoney(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "$-";
    var abs = Math.abs(number);
    var units = [
      [1e12, "T"],
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "K"],
    ];
    for (var index = 0; index < units.length; index += 1) {
      if (abs >= units[index][0]) return "$" + (number / units[index][0]).toFixed(2).replace(/\.00$/, "") + units[index][1];
    }
    return "$" + number.toFixed(abs >= 1 ? 2 : 6).replace(/0+$/, "").replace(/\.$/, "");
  }

  function formatPercent(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "0.00%";
    return (number > 0 ? "+" : "") + number.toFixed(2) + "%";
  }

  function findStatCard(label) {
    var labels = Array.prototype.slice.call(document.querySelectorAll("span,p,small,strong,div")).filter(function (node) {
      return clean(node.textContent).toLowerCase() === label.toLowerCase();
    });
    for (var index = 0; index < labels.length; index += 1) {
      var node = labels[index];
      var current = node.parentElement;
      while (current && current !== document.body) {
        var rect = current.getBoundingClientRect();
        var cardText = clean(current.innerText || current.textContent);
        var hasValue = /[$]?\d/.test(cardText.replace(clean(node.textContent), ""));
        if (rect.width >= 120 && rect.width <= 560 && rect.height >= 55 && rect.height <= 240 && hasValue) {
          return current;
        }
        current = current.parentElement;
      }
    }
    return null;
  }

  function parseMarketRowsFromTable() {
    var tables = Array.prototype.slice.call(document.querySelectorAll("table"));
    for (var t = 0; t < tables.length; t += 1) {
      var table = tables[t];
      var headers = Array.prototype.slice.call(table.querySelectorAll("thead th")).map(function (th) {
        return clean(th.textContent).toLowerCase();
      });
      var capIndex = headers.indexOf("market cap");
      var volumeIndex = headers.indexOf("24h volume");
      var changeIndex = headers.indexOf("24h");
      if (capIndex < 0 || volumeIndex < 0 || changeIndex < 0) continue;
      return Array.prototype.slice.call(table.querySelectorAll("tbody tr")).map(function (row) {
        var cells = Array.prototype.slice.call(row.children);
        return {
          marketCap: parseMoney(cells[capIndex] && cells[capIndex].textContent),
          volume: parseMoney(cells[volumeIndex] && cells[volumeIndex].textContent),
          change24h: parsePercent(cells[changeIndex] && cells[changeIndex].textContent),
        };
      }).filter(function (row) {
        return Number.isFinite(row.marketCap) || Number.isFinite(row.volume);
      });
    }
    return [];
  }

  function decorateMarketPercentCells() {
    var tables = Array.prototype.slice.call(document.querySelectorAll("table"));
    tables.forEach(function (table) {
      var headers = Array.prototype.slice.call(table.querySelectorAll("thead th")).map(function (th) {
        return clean(th.textContent).toLowerCase();
      });
      var percentIndexes = ["1h", "24h", "7d"].map(function (label) {
        return headers.indexOf(label);
      }).filter(function (index) {
        return index >= 0;
      });
      if (!percentIndexes.length) return;
      Array.prototype.forEach.call(table.querySelectorAll("tbody tr"), function (row) {
        var cells = Array.prototype.slice.call(row.children);
        percentIndexes.forEach(function (cellIndex) {
          var cell = cells[cellIndex];
          if (!cell || cell.getAttribute("data-do-market-percent-cell") === "1") return;
          var value = parsePercent(cell.textContent);
          var state = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
          var arrow = value > 0 ? "▲" : value < 0 ? "▼" : "•";
          cell.setAttribute("data-do-market-percent-cell", "1");
          cell.innerHTML = [
            '<span class="do-market-percent-cell ' + state + '">',
              '<span class="do-market-percent-arrow" aria-hidden="true">' + arrow + '</span>',
              '<span>' + formatPercent(value) + '</span>',
            '</span>',
          ].join("");
        });
      });
    });
  }

  var marketRowsPromise = null;
  var cachedMarketRows = [];
  var cachedMarketRowsAt = 0;

  function fetchMarketRows() {
    if (Date.now() - cachedMarketRowsAt < 60000 && cachedMarketRows.length) return Promise.resolve(cachedMarketRows);
    if (marketRowsPromise) return marketRowsPromise;
    marketRowsPromise = fetch("/station-assets/api/markets/coins?page=1&per_page=80&order=market_cap_desc", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (!response.ok) throw new Error("markets status " + response.status);
        return response.json();
      })
      .then(function (data) {
        cachedMarketRows = (Array.isArray(data.coins) ? data.coins : []).map(function (coin) {
          return {
            marketCap: Number(coin.market_cap),
            volume: Number(coin.total_volume),
            change24h: Number(coin.price_change_percentage_24h_in_currency),
          };
        }).filter(function (row) {
          return Number.isFinite(row.marketCap) || Number.isFinite(row.volume);
        });
        cachedMarketRowsAt = Date.now();
        return cachedMarketRows;
      })
      .catch(function () { return cachedMarketRows; })
      .finally(function () { marketRowsPromise = null; });
    return marketRowsPromise;
  }

  function buildPoints(previous, current, changes) {
    var points = [];
    var count = 12;
    var delta = current - previous;
    var wiggle = Math.abs(delta) * 0.08;
    var direction = delta >= 0 ? 1 : -1;
    var averageChange = changes.length
      ? changes.reduce(function (sum, value) { return sum + value; }, 0) / changes.length
      : 0;
    for (var index = 0; index < count; index += 1) {
      var ratio = index / (count - 1);
      var wave = Math.sin(ratio * Math.PI * 2) * wiggle * (averageChange >= 0 ? 1 : -1);
      points.push(Math.max(0, previous + delta * ratio + wave * direction));
    }
    points[0] = Math.max(0, previous);
    points[count - 1] = Math.max(0, current);
    return points;
  }

  function summarizeRows(rows, metric) {
    var current = 0;
    var previous = 0;
    var changes = [];
    rows.forEach(function (row) {
      var value = Number(row[metric]);
      if (!Number.isFinite(value) || value <= 0) return;
      var change = Number(row.change24h);
      if (!Number.isFinite(change) || change <= -99) change = 0;
      current += value;
      previous += value / (1 + change / 100);
      changes.push(change);
    });
    if (!previous) previous = current;
    var percent = previous ? ((current - previous) / previous) * 100 : 0;
    return {
      metric: metric,
      current: current,
      previous: previous,
      percent: percent,
      points: buildPoints(previous, current, changes),
    };
  }

  function sparkPath(points, width, height, padding) {
    if (!points.length) return "";
    var min = Math.min.apply(Math, points);
    var max = Math.max.apply(Math, points);
    var range = max - min || 1;
    return points.map(function (point, index) {
      var x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
      var y = padding + (1 - (point - min) / range) * (height - padding * 2);
      return (index ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
    }).join(" ");
  }

  function renderSparkline(card, summary) {
    var existing = card.querySelector(".do-market-mini");
    if (existing) existing.remove();
    var positive = summary.percent >= 0;
    var color = positive ? "#55f2a3" : "#ff7a8b";
    var width = 112;
    var height = 34;
    var padding = 3;
    var line = sparkPath(summary.points, width, height, padding);
    var fill = line + " L" + (width - padding) + " " + (height - padding) + " L" + padding + " " + (height - padding) + " Z";
    var mini = document.createElement("div");
    mini.className = "do-market-mini";
    mini.innerHTML = [
      '<svg viewBox="0 0 ' + width + " " + height + '" aria-hidden="true">',
      '<path class="do-market-fill" d="' + fill + '" fill="' + color + '"></path>',
      '<path d="' + line + '" stroke="' + color + '"></path>',
      "</svg>",
      '<span class="do-market-badge ' + (positive ? "positive" : "negative") + '">' + formatPercent(summary.percent) + "</span>",
    ].join("");
    card.appendChild(mini);
  }

  function ensureModal() {
    var modal = document.getElementById("do-market-aggregate-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "do-market-aggregate-modal";
    modal.className = "do-market-modal";
    modal.hidden = true;
    modal.innerHTML = [
      '<div class="do-market-dialog" role="dialog" aria-modal="true" aria-labelledby="do-market-modal-title">',
      "<header>",
      "<div>",
      '<h2 id="do-market-modal-title"></h2>',
      '<p id="do-market-modal-note"></p>',
      "</div>",
      '<button type="button" class="do-market-close" aria-label="Close">x</button>',
      "</header>",
      '<div class="do-market-chart-wrap">',
      '<svg viewBox="0 0 720 260" aria-hidden="true"><path id="do-market-modal-fill"></path><path id="do-market-modal-line"></path></svg>',
      '<div class="do-market-metrics">',
      '<div><span>Now</span><strong id="do-market-modal-current"></strong></div>',
      '<div><span>24h ago</span><strong id="do-market-modal-previous"></strong></div>',
      '<div><span>Move</span><strong id="do-market-modal-percent"></strong></div>',
      "</div>",
      "</div>",
      "</div>",
    ].join("");
    document.body.appendChild(modal);
    modal.addEventListener("click", function (event) {
      if (event.target === modal || event.target.closest(".do-market-close")) modal.hidden = true;
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") modal.hidden = true;
    });
    return modal;
  }

  function openMarketModal(label, summary) {
    var modal = ensureModal();
    var positive = summary.percent >= 0;
    var color = positive ? "#55f2a3" : "#ff7a8b";
    var line = sparkPath(summary.points, 720, 260, 18);
    var fill = line + " L702 242 L18 242 Z";
    modal.querySelector("#do-market-modal-title").textContent = label;
    modal.querySelector("#do-market-modal-note").textContent = "Loaded market rows, weighted by 24h move";
    modal.querySelector("#do-market-modal-current").textContent = formatMoney(summary.current);
    modal.querySelector("#do-market-modal-previous").textContent = formatMoney(summary.previous);
    modal.querySelector("#do-market-modal-percent").textContent = formatPercent(summary.percent);
    modal.querySelector("#do-market-modal-percent").style.color = color;
    modal.querySelector("#do-market-modal-line").setAttribute("d", line);
    modal.querySelector("#do-market-modal-line").setAttribute("stroke", color);
    modal.querySelector("#do-market-modal-fill").setAttribute("d", fill);
    modal.querySelector("#do-market-modal-fill").setAttribute("fill", color);
    modal.querySelector("#do-market-modal-fill").setAttribute("opacity", "0.16");
    modal.hidden = false;
    var close = modal.querySelector(".do-market-close");
    if (close) close.focus();
  }

  function bindCard(card, label, summary) {
    card.classList.add("do-market-chart-card");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", label + " chart");
    card.__doMarketSummary = summary;
    card.__doMarketLabel = label;
    if (card.__doMarketBound) return;
    card.__doMarketBound = true;
    card.addEventListener("click", function () {
      openMarketModal(card.__doMarketLabel, card.__doMarketSummary);
    });
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMarketModal(card.__doMarketLabel, card.__doMarketSummary);
      }
    });
  }

  function pageLooksLikeMarkets() {
    var text = clean(document.body && document.body.innerText);
    return /\bMarkets\b/i.test(text) && /Loaded 24h volume/i.test(text) && /Loaded market cap/i.test(text);
  }

  function routeLooksLikeMarkets() {
    return /(^|\/)markets(\/|$)/i.test(String(window.location && window.location.pathname || ""));
  }

  function shouldRunMarketDomPass() {
    return routeLooksLikeMarkets() || pageLooksLikeMarkets();
  }

  function applyMarkets(rows) {
    if (!pageLooksLikeMarkets()) return;
    ensureStyles();
    decorateMarketPercentCells();
    var volumeCard = findStatCard("Loaded 24h volume");
    var capCard = findStatCard("Loaded market cap");

    var parsedRows = rows && rows.length ? rows : parseMarketRowsFromTable();
    if (!parsedRows.length) return;

    var volumeSummary = summarizeRows(parsedRows, "volume");
    var capSummary = summarizeRows(parsedRows, "marketCap");
    if (volumeCard) {
      renderSparkline(volumeCard, volumeSummary);
      bindCard(volumeCard, "Loaded 24h volume", volumeSummary);
    }
    if (capCard) {
      renderSparkline(capCard, capSummary);
      bindCard(capCard, "Loaded market cap", capSummary);
    }
  }

  var scheduled = false;
  var lastDomPassAt = 0;
  function runDomPass() {
    scheduled = false;
    lastDomPassAt = Date.now();
    seedDoFirstStorage();
    if (!shouldRunMarketDomPass()) return;
    reorderNativeSelects();
    reorderDomLists();
    dedupeDomLists();
    var rows = parseMarketRowsFromTable();
    if (rows.length) {
      applyMarkets(rows);
      return;
    }
    fetchMarketRows().then(applyMarkets).catch(function () {});
  }

  function schedule(delay) {
    if (scheduled) return;
    var now = Date.now();
    var elapsed = lastDomPassAt ? now - lastDomPassAt : MIN_DOM_PASS_MS;
    var wait = Math.max(typeof delay === "number" ? delay : 0, elapsed < MIN_DOM_PASS_MS ? MIN_DOM_PASS_MS - elapsed : 0);
    scheduled = true;
    window.setTimeout(function () {
      if (window.requestAnimationFrame) window.requestAnimationFrame(runDomPass);
      else runDomPass();
    }, wait);
  }

  seedDoFirstStorage();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
  window.setTimeout(schedule, 500);
  window.setTimeout(schedule, 1800);
  window.setInterval(function () {
    if (shouldRunMarketDomPass()) schedule();
    else seedDoFirstStorage();
  }, MARKET_REFRESH_MS);
  window.addEventListener("focus", function () {
    if (shouldRunMarketDomPass()) schedule();
    else seedDoFirstStorage();
  });
  window.addEventListener("storage", function () {
    if (shouldRunMarketDomPass()) schedule();
  });
  window.addEventListener("do_wallet_chain_assets_update", function (event) {
    if (event && event.detail && event.detail.source === "dochain-website-markets-priority-20260624-percent1") return;
    if (shouldRunMarketDomPass()) schedule(1000);
  });

  var observer = null;
  var observerTimer = 0;
  function stopTransientObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function startTransientObserver(duration) {
    if (!window.MutationObserver || !document.documentElement || !shouldRunMarketDomPass()) return;
    duration = Number(duration) || 3000;
    if (!observer) {
      observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(stopTransientObserver, duration);
  }

  ["click", "popstate", "hashchange"].forEach(function (eventName) {
    window.addEventListener(eventName, function () {
      startTransientObserver(3500);
      if (shouldRunMarketDomPass()) schedule();
    }, true);
  });

  window.doWalletMarketsPriority = {
    run: runDomPass,
    seedDoFirstStorage: seedDoFirstStorage,
  };
})();
