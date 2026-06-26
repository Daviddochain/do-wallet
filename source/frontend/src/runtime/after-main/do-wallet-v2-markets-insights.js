(function () {
  "use strict";

  if (window.__doWalletMarketsInsights20260626) return;
  window.__doWalletMarketsInsights20260626 = true;

  var CACHE_KEY = "do-wallet-markets-response-cache.v2";
  var STYLE_ID = "do-wallet-markets-insights-style";
  var PANEL_ATTR = "data-do-wallet-markets-gainers-panel";
  var CHART_ATTR = "data-do-wallet-markets-chart";
  var CARD_ATTR = "data-do-wallet-markets-insight-card";
  var ACTION_ATTR = "data-do-wallet-markets-gainers-action";
  var openGainers = false;
  var updateTimer = 0;

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function textLines(node) {
    return String(node && (node.innerText || node.textContent) || "")
      .split(/\n+/)
      .map(clean)
      .filter(Boolean);
  }

  function visible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    var rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isMarketsRoute() {
    return /\/markets(?:\/|$|\?)/i.test(window.location.pathname + window.location.search);
  }

  function number(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function percent(value) {
    var match = clean(value).match(/([-+]?\d+(?:\.\d+)?)\s*%/);
    return match ? Number(match[1]) : 0;
  }

  function moneyToNumber(value) {
    var text = clean(value).replace(/,/g, "");
    var match = text.match(/([-+]?\$?\s*\d+(?:\.\d+)?)([KMBT])?/i);
    if (!match) return 0;
    var amount = Number(match[1].replace("$", "").trim());
    if (!Number.isFinite(amount)) return 0;
    var suffix = (match[2] || "").toUpperCase();
    if (suffix === "K") amount *= 1e3;
    if (suffix === "M") amount *= 1e6;
    if (suffix === "B") amount *= 1e9;
    if (suffix === "T") amount *= 1e12;
    return amount;
  }

  function compactMoney(value) {
    var amount = number(value);
    var abs = Math.abs(amount);
    var units = [
      { suffix: "T", value: 1e12 },
      { suffix: "B", value: 1e9 },
      { suffix: "M", value: 1e6 },
      { suffix: "K", value: 1e3 }
    ];
    for (var i = 0; i < units.length; i += 1) {
      if (abs >= units[i].value) {
        return "$" + (amount / units[i].value).toFixed(abs >= units[i].value * 100 ? 0 : 2).replace(/\.00$/, "") + units[i].suffix;
      }
    }
    if (abs >= 1) return "$" + amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (abs > 0) return "$" + amount.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return "$0";
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseAssetCell(cell) {
    var lines = textLines(cell);
    if (lines.length >= 2) {
      return { name: lines[0], symbol: lines[1] };
    }

    var text = clean(cell && (cell.innerText || cell.textContent));
    var match = text.match(/^(.+?)([A-Z0-9]{2,12})$/);
    if (match) return { name: clean(match[1]), symbol: match[2] };
    return { name: text || "Asset", symbol: "" };
  }

  function normalizeCoin(coin, index) {
    if (!coin || typeof coin !== "object") return null;
    var name = clean(coin.name || coin.asset || coin.coin || coin.id || "Asset");
    var symbol = clean(coin.symbol || coin.ticker || "").toUpperCase();
    var price = number(coin.current_price || coin.price || coin.usd || coin.price_usd);
    var volume = number(coin.total_volume || coin.volume_24h || coin.volume24h || coin.volume || coin.totalVolume);
    var marketCap = number(coin.market_cap || coin.marketCap || coin.market_cap_usd || coin.marketCapUsd);
    var change24h = number(coin.price_change_percentage_24h || coin.priceChangePercentage24h || coin.change24h || coin.usd_24h_change);
    var change1h = number(coin.price_change_percentage_1h_in_currency || coin.change1h);
    var change7d = number(coin.price_change_percentage_7d_in_currency || coin.change7d);
    if (!name && !symbol) return null;
    return {
      rank: Number(coin.market_cap_rank || coin.rank || index + 1) || index + 1,
      name: name,
      symbol: symbol,
      priceText: price ? compactMoney(price) : clean(coin.priceText || ""),
      change1h: change1h,
      change24h: change24h,
      change7d: change7d,
      marketCap: marketCap,
      marketCapText: marketCap ? compactMoney(marketCap) : clean(coin.marketCapText || ""),
      volume: volume,
      volumeText: volume ? compactMoney(volume) : clean(coin.volumeText || "")
    };
  }

  function readRowsFromCache() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(CACHE_KEY);
      if (!raw || raw.length > 1024 * 1024) return [];
      var parsed = JSON.parse(raw);
      var entries = parsed && parsed.entries || {};
      var newest = Object.keys(entries).map(function (key) {
        return entries[key];
      }).filter(function (entry) {
        return entry && entry.data && Array.isArray(entry.data.coins);
      }).sort(function (left, right) {
        return Number(right.cachedAt || 0) - Number(left.cachedAt || 0);
      })[0];
      if (!newest) return [];
      return newest.data.coins.map(normalizeCoin).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function findMarketTable() {
    var tables = Array.prototype.slice.call(document.querySelectorAll("table")).filter(visible);
    return tables.find(function (table) {
      var text = clean(table.innerText || table.textContent);
      return /\bRank\b/i.test(text) && /\bAsset\b/i.test(text) && /\b24h volume\b/i.test(text);
    }) || null;
  }

  function readRowsFromTable() {
    var table = findMarketTable();
    if (!table) return [];

    return Array.prototype.slice.call(table.querySelectorAll("tbody tr, tr")).map(function (row) {
      var cells = Array.prototype.slice.call(row.children || []);
      if (cells.length < 8) return null;
      var first = clean(cells[0].innerText || cells[0].textContent);
      if (!/^\d+$/.test(first)) return null;
      var asset = parseAssetCell(cells[1]);
      return {
        rank: Number(first),
        name: asset.name,
        symbol: asset.symbol,
        priceText: clean(cells[2].innerText || cells[2].textContent),
        change1h: percent(cells[3].innerText || cells[3].textContent),
        change24h: percent(cells[4].innerText || cells[4].textContent),
        change7d: percent(cells[5].innerText || cells[5].textContent),
        marketCap: moneyToNumber(cells[6].innerText || cells[6].textContent),
        marketCapText: clean(cells[6].innerText || cells[6].textContent),
        volume: moneyToNumber(cells[7].innerText || cells[7].textContent),
        volumeText: clean(cells[7].innerText || cells[7].textContent)
      };
    }).filter(Boolean);
  }

  function readMarketRows() {
    var fromTable = readRowsFromTable();
    if (fromTable.length >= 20) return fromTable;
    var fromCache = readRowsFromCache();
    return fromTable.length ? fromTable : fromCache;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "[" + CARD_ATTR + "='1']{cursor:default}",
      "[" + ACTION_ATTR + "='1']{cursor:pointer;outline:none}",
      "[" + ACTION_ATTR + "='1']:focus-visible{box-shadow:0 0 0 2px rgba(163,63,255,.35)}",
      ".do-wallet-markets-card-chart{margin-top:10px;display:grid;gap:5px;min-height:44px}",
      ".do-wallet-markets-card-chart svg{display:block;width:100%;height:36px;overflow:visible}",
      ".do-wallet-markets-card-chart-caption{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#c8b9ee;font-size:11px;font-weight:600;line-height:1.2}",
      ".do-wallet-markets-card-chart-meta{display:inline-flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}",
      ".do-wallet-markets-card-day-change{font-size:11px;font-weight:800;line-height:1.2;white-space:nowrap}",
      ".do-wallet-markets-card-day-change--up{color:#22d7aa}",
      ".do-wallet-markets-card-day-change--down{color:#ff4f5e}",
      ".do-wallet-markets-card-day-change--flat{color:#c8b9ee}",
      ".do-wallet-markets-card-action{margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;color:#fff;font-size:12px;font-weight:700;line-height:1.2}",
      ".do-wallet-markets-card-action span:last-child{color:#22d7aa}",
      ".do-wallet-markets-gainers-panel{border-top:1px solid rgba(159,70,255,.28);border-bottom:1px solid rgba(159,70,255,.28);background:#20152f;padding:18px 20px}",
      ".do-wallet-markets-gainers-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}",
      ".do-wallet-markets-gainers-title{margin:0;color:#fff;font-size:17px;font-weight:700;line-height:1.25}",
      ".do-wallet-markets-gainers-count{margin:4px 0 0;color:#c8b9ee;font-size:12px;font-weight:600;line-height:1.35}",
      ".do-wallet-markets-gainers-close{border:1px solid rgba(159,70,255,.58);border-radius:8px;background:#160d23;color:#fff;min-height:34px;padding:0 14px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}",
      ".do-wallet-markets-gainers-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
      ".do-wallet-markets-gainer-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid rgba(159,70,255,.28);border-radius:8px;background:#181024;padding:12px 14px}",
      ".do-wallet-markets-gainer-name{display:block;color:#fff;font-size:13px;font-weight:700;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".do-wallet-markets-gainer-symbol{display:block;margin-top:3px;color:#c8b9ee;font-size:11px;font-weight:600;line-height:1.2}",
      ".do-wallet-markets-gainer-change{color:#22d7aa;font-size:14px;font-weight:800;line-height:1.2;text-align:right}",
      ".do-wallet-markets-gainer-meta{display:block;margin-top:3px;color:#c8b9ee;font-size:11px;font-weight:600;line-height:1.2;text-align:right}",
      "@media (max-width:900px){.do-wallet-markets-gainers-list{grid-template-columns:1fr}.do-wallet-markets-card-chart{display:none}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function findStatsGrid() {
    if (!isMarketsRoute()) return null;
    var labels = ["Coins loaded", "Loaded 24h volume", "Loaded market cap", "24h gainers"];
    var nodes = Array.prototype.slice.call(document.querySelectorAll("main div, main section, section, div"));
    var best = null;
    var bestArea = Infinity;

    nodes.forEach(function (node) {
      if (!visible(node)) return;
      var text = clean(node.innerText || node.textContent);
      if (!labels.every(function (label) { return text.indexOf(label) >= 0; })) return;
      var children = Array.prototype.slice.call(node.children || []).filter(visible);
      if (children.length < 4) return;
      var rect = node.getBoundingClientRect();
      if (rect.width < 500 || rect.height < 60 || rect.height > 280) return;
      var area = rect.width * rect.height;
      if (area < bestArea) {
        best = node;
        bestArea = area;
      }
    });

    return best;
  }

  function findCard(grid, label) {
    if (!grid) return null;
    var nodes = Array.prototype.slice.call(grid.children || []).filter(visible);
    return nodes.find(function (node) {
      return clean(node.innerText || node.textContent).indexOf(label) === 0;
    }) || null;
  }

  function chartSvg(rows, key, id, startColor, endColor) {
    var values = rows.map(function (row) {
      return { value: number(row[key]), symbol: row.symbol || row.name };
    }).filter(function (row) {
      return row.value > 0;
    }).sort(function (left, right) {
      return right.value - left.value;
    }).slice(0, 18);

    if (!values.length) return "";
    var width = 240;
    var height = 36;
    var gap = 3;
    var barWidth = (width - gap * (values.length - 1)) / values.length;
    var max = Math.max.apply(null, values.map(function (row) { return row.value; }));
    var rects = values.map(function (row, index) {
      var h = Math.max(4, Math.round((row.value / max) * height));
      var x = Math.round(index * (barWidth + gap));
      var y = height - h;
      return "<rect x=\"" + x + "\" y=\"" + y + "\" width=\"" + Math.max(2, Math.floor(barWidth)) + "\" height=\"" + h + "\" rx=\"2\" fill=\"url(#" + id + ")\" opacity=\"" + (0.38 + (row.value / max) * 0.62).toFixed(2) + "\"><title>" + escapeHtml(row.symbol) + " " + compactMoney(row.value) + "</title></rect>";
    }).join("");

    return "<svg viewBox=\"0 0 " + width + " " + height + "\" role=\"img\" aria-label=\"Top loaded market values\"><defs><linearGradient id=\"" + id + "\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"" + startColor + "\"/><stop offset=\"1\" stop-color=\"" + endColor + "\"/></linearGradient></defs>" + rects + "</svg>";
  }

  function formatPercent(value) {
    var amount = number(value);
    var text = amount.toFixed(2).replace(/\.00$/, "");
    return (amount > 0 ? "+" : "") + text + "%";
  }

  function changeClass(value) {
    var amount = number(value);
    if (amount > 0.000001) return "do-wallet-markets-card-day-change--up";
    if (amount < -0.000001) return "do-wallet-markets-card-day-change--down";
    return "do-wallet-markets-card-day-change--flat";
  }

  function weightedDayChange(rows, weightKey) {
    var totalWeight = 0;
    var weighted = 0;
    rows.forEach(function (row) {
      var weight = number(row && row[weightKey]);
      if (!(weight > 0)) return;
      totalWeight += weight;
      weighted += weight * number(row.change24h);
    });
    return totalWeight > 0 ? weighted / totalWeight : 0;
  }

  function updateChart(card, id, label, totalText, dayChange, svg) {
    if (!card || !svg) return;
    card.setAttribute(CARD_ATTR, "1");
    var chart = card.querySelector("[" + CHART_ATTR + "='" + id + "']");
    if (!chart) {
      chart = document.createElement("div");
      chart.className = "do-wallet-markets-card-chart";
      chart.setAttribute(CHART_ATTR, id);
      card.appendChild(chart);
    }
    var dayChangeText = formatPercent(dayChange) + " 24h";
    var dayChangeHtml = "<span class=\"do-wallet-markets-card-day-change " + changeClass(dayChange) + "\">" + escapeHtml(dayChangeText) + "</span>";
    var signature = label + "|" + totalText + "|" + dayChangeText + "|" + svg;
    if (chart.getAttribute("data-signature") === signature) return;
    chart.setAttribute("data-signature", signature);
    chart.innerHTML = svg + "<div class=\"do-wallet-markets-card-chart-caption\"><span>" + escapeHtml(label) + "</span><span class=\"do-wallet-markets-card-chart-meta\">" + dayChangeHtml + "<span>" + escapeHtml(totalText) + "</span></span></div>";
  }

  function gainers(rows) {
    return rows.filter(function (row) {
      return number(row.change24h) > 0;
    }).sort(function (left, right) {
      return number(right.change24h) - number(left.change24h);
    });
  }

  function updateGainersCard(card, rows) {
    if (!card) return;
    var list = gainers(rows);
    card.setAttribute(CARD_ATTR, "1");
    card.setAttribute(ACTION_ATTR, "1");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "View 24 hour gainers");

    if (card.getAttribute("data-do-wallet-markets-gainers-bound") !== "1") {
      card.setAttribute("data-do-wallet-markets-gainers-bound", "1");
      card.addEventListener("click", function () {
        openGainers = !openGainers;
        scheduleUpdate(0);
      });
      card.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openGainers = !openGainers;
        scheduleUpdate(0);
      });
    }

    var footer = card.querySelector(".do-wallet-markets-card-action");
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "do-wallet-markets-card-action";
      card.appendChild(footer);
    }
    var top = list.length ? "+" + list[0].change24h.toFixed(2).replace(/\.00$/, "") + "%" : "0%";
    var html = "<span>" + (openGainers ? "Hide gainers" : "View gainers") + "</span><span>" + escapeHtml(top) + "</span>";
    if (footer.innerHTML !== html) footer.innerHTML = html;
  }

  function renderGainersPanel(grid, rows) {
    var existing = document.querySelector("[" + PANEL_ATTR + "='1']");
    if (!openGainers) {
      if (existing) existing.hidden = true;
      return;
    }

    if (!existing) {
      existing = document.createElement("section");
      existing.className = "do-wallet-markets-gainers-panel";
      existing.setAttribute(PANEL_ATTR, "1");
      grid.parentNode.insertBefore(existing, grid.nextSibling);
    }
    existing.hidden = false;

    var list = gainers(rows);
    var topRows = list.slice(0, 30);
    var rowsHtml = topRows.map(function (row) {
      var title = row.symbol ? row.name + " (" + row.symbol + ")" : row.name;
      var meta = [row.priceText || "", row.volumeText ? "Vol " + row.volumeText : ""].filter(Boolean).join(" | ");
      return [
        "<article class=\"do-wallet-markets-gainer-row\">",
        "<div><span class=\"do-wallet-markets-gainer-name\">" + escapeHtml(title) + "</span>",
        "<span class=\"do-wallet-markets-gainer-symbol\">" + escapeHtml(meta || "Loaded market row") + "</span></div>",
        "<div><span class=\"do-wallet-markets-gainer-change\">+" + escapeHtml(number(row.change24h).toFixed(2).replace(/\.00$/, "")) + "%</span>",
        "<span class=\"do-wallet-markets-gainer-meta\">24h</span></div>",
        "</article>"
      ].join("");
    }).join("");

    var html = [
      "<div class=\"do-wallet-markets-gainers-header\">",
      "<div><h2 class=\"do-wallet-markets-gainers-title\">24h gainers</h2>",
      "<p class=\"do-wallet-markets-gainers-count\">Showing " + topRows.length + " of " + list.length + " loaded gainers</p></div>",
      "<button type=\"button\" class=\"do-wallet-markets-gainers-close\">Close</button>",
      "</div>",
      "<div class=\"do-wallet-markets-gainers-list\">",
      rowsHtml || "<article class=\"do-wallet-markets-gainer-row\"><span class=\"do-wallet-markets-gainer-name\">No gainers in the loaded market list</span></article>",
      "</div>"
    ].join("");

    if (existing.getAttribute("data-signature") !== html) {
      existing.setAttribute("data-signature", html);
      existing.innerHTML = html;
      var close = existing.querySelector(".do-wallet-markets-gainers-close");
      if (close) {
        close.addEventListener("click", function () {
          openGainers = false;
          scheduleUpdate(0);
        });
      }
    }
  }

  function cleanupInactiveRoute() {
    var panel = document.querySelector("[" + PANEL_ATTR + "='1']");
    if (panel) panel.remove();
    openGainers = false;
  }

  function update() {
    installStyles();
    if (!isMarketsRoute()) {
      cleanupInactiveRoute();
      return;
    }

    var grid = findStatsGrid();
    if (!grid) return;
    var rows = readMarketRows();
    if (!rows.length) return;

    var totalVolume = rows.reduce(function (sum, row) { return sum + number(row.volume); }, 0);
    var totalMarketCap = rows.reduce(function (sum, row) { return sum + number(row.marketCap); }, 0);
    var volumeDayChange = weightedDayChange(rows, "volume");
    var marketCapDayChange = weightedDayChange(rows, "marketCap");

    updateChart(
      findCard(grid, "Loaded 24h volume"),
      "volume",
      "Top loaded volumes",
      compactMoney(totalVolume),
      volumeDayChange,
      chartSvg(rows, "volume", "do-wallet-markets-volume-gradient", "#a33fff", "#22d7aa")
    );
    updateChart(
      findCard(grid, "Loaded market cap"),
      "market-cap",
      "Top loaded caps",
      compactMoney(totalMarketCap),
      marketCapDayChange,
      chartSvg(rows, "marketCap", "do-wallet-markets-cap-gradient", "#ffb21a", "#a33fff")
    );
    updateGainersCard(findCard(grid, "24h gainers"), rows);
    renderGainersPanel(grid, rows);
  }

  function scheduleUpdate(delay) {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(update, typeof delay === "number" ? delay : 160);
  }

  function patchHistory() {
    ["pushState", "replaceState"].forEach(function (name) {
      var original = window.history && window.history[name];
      if (typeof original !== "function" || original.__doWalletMarketsInsights) return;
      var wrapped = function () {
        var result = original.apply(this, arguments);
        scheduleUpdate(0);
        return result;
      };
      wrapped.__doWalletMarketsInsights = true;
      window.history[name] = wrapped;
    });
  }

  function startObserver() {
    if (typeof MutationObserver !== "function" || !document.body) return;
    var observer = new MutationObserver(function (mutations) {
      if (!isMarketsRoute()) return;
      var shouldUpdate = mutations.some(function (mutation) {
        if (mutation.target && mutation.target.nodeType === 1) {
          var target = mutation.target;
          if (target.matches && target.matches("tbody,table,main")) return true;
        }
        return Array.prototype.slice.call(mutation.addedNodes || []).some(function (node) {
          if (!node || node.nodeType !== 1) return false;
          var text = clean(node.textContent || "");
          return /Loaded 24h volume|24h gainers|24h volume|Market cap/i.test(text);
        });
      });
      if (shouldUpdate) scheduleUpdate();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  patchHistory();
  startObserver();
  window.addEventListener("popstate", function () { scheduleUpdate(0); });
  window.addEventListener("hashchange", function () { scheduleUpdate(0); });
  window.addEventListener("focus", function () { scheduleUpdate(120); });
  document.addEventListener("click", function () { scheduleUpdate(220); }, true);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { scheduleUpdate(0); });
  } else {
    scheduleUpdate(0);
  }
  window.addEventListener("load", function () { scheduleUpdate(250); });
})();
