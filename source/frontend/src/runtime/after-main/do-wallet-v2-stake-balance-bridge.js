(function () {
  "use strict";

  if (window.__doWalletStakeBalanceBridge20260626) return;
  window.__doWalletStakeBalanceBridge20260626 = true;

  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var STYLE_ID = "do-wallet-stake-balance-bridge-style";
  var VERSION = "20260626-stake-balance-bridge-1";
  var APPLY_DELAY_MS = 80;
  var applyTimer = 0;

  var TOKEN_META = {
    DO: { chainID: "Do-Chain", denom: "udo", decimals: 6 },
    LUNC: { chainID: "columbus-5", denom: "uluna", decimals: 6 },
    UST: { chainID: "columbus-5", denom: "uusd", decimals: 6 },
    USTC: { chainID: "columbus-5", denom: "uusd", decimals: 6 },
    KRT: { chainID: "columbus-5", denom: "ukrw", decimals: 6 },
    IDT: { chainID: "columbus-5", denom: "uidr", decimals: 6 },
    MYT: { chainID: "columbus-5", denom: "umyr", decimals: 6 },
    THT: { chainID: "columbus-5", denom: "uthb", decimals: 6 },
    JPT: { chainID: "columbus-5", denom: "ujpy", decimals: 6 },
    OSMO: { chainID: "osmosis-1", denom: "uosmo", decimals: 6 },
    LUNA: { chainID: "phoenix-1", denom: "uluna", decimals: 6 },
    ATOM: { chainID: "cosmoshub-4", denom: "uatom", decimals: 6 },
    JUNO: { chainID: "juno-1", denom: "ujuno", decimals: 6 },
    AKT: { chainID: "akashnet-2", denom: "uakt", decimals: 6 },
    SCRT: { chainID: "secret-4", denom: "uscrt", decimals: 6 },
    DGN: { chainID: "dungeon-1", denom: "udgn", decimals: 6 }
  };

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function upper(value) {
    return clean(value).toUpperCase();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function visible(node) {
    try {
      var rect = node && node.getBoundingClientRect && node.getBoundingClientRect();
      var style = window.getComputedStyle ? window.getComputedStyle(node) : {};
      return Boolean(rect && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden");
    } catch (error) {
      return false;
    }
  }

  function numberFrom(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "object") {
      if (value.amount != null) return numberFrom(value.amount);
      if (value.value != null) return numberFrom(value.value);
      if (value.quantity != null) return numberFrom(value.quantity);
      return 0;
    }
    var match = clean(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) || 0 : 0;
  }

  function decimalString(raw, decimals) {
    var value = clean(raw).replace(/,/g, "");
    var negative = value.charAt(0) === "-";
    if (negative) value = value.slice(1);
    if (/^\d+\.\d+$/.test(value)) value = value.split(".")[0];
    if (!/^\d+$/.test(value)) return "0";
    decimals = Math.max(0, Number(decimals) || 0);
    if (decimals <= 0) return (negative ? "-" : "") + value;
    if (value.length <= decimals) value = "0".repeat(decimals - value.length + 1) + value;
    var whole = value.slice(0, -decimals) || "0";
    var fraction = value.slice(-decimals).replace(/0+$/, "");
    return (negative ? "-" : "") + (fraction ? whole + "." + fraction : whole);
  }

  function amountFromRow(row) {
    var directKeys = ["amount", "quantity", "balance", "displayAmount", "tokenAmount", "amountValue"];
    for (var index = 0; index < directKeys.length; index += 1) {
      var value = row && row[directKeys[index]];
      if (value == null || value === "") continue;
      if (typeof value === "object" && value.amount != null) continue;
      var direct = numberFrom(value);
      if (direct > 0) return direct;
    }
    if (row && row.balance && typeof row.balance === "object" && row.balance.amount != null) {
      var balanceCoin = amountFromCoin(row.balance, decimalsOf(row));
      if (balanceCoin > 0) return balanceCoin;
    }
    if (row && row.amount && typeof row.amount === "object" && row.amount.amount != null) {
      var amountCoin = amountFromCoin(row.amount, decimalsOf(row));
      if (amountCoin > 0) return amountCoin;
    }
    if (row && row.rawAmount != null) {
      var rawAmount = Number(decimalString(row.rawAmount, decimalsOf(row)));
      if (Number.isFinite(rawAmount) && rawAmount > 0) return rawAmount;
    }
    return 0;
  }

  function amountFromCoin(coin, decimals) {
    if (!coin) return 0;
    if (String(coin.amount || "").indexOf(".") >= 0) return numberFrom(coin.amount);
    var amount = Number(decimalString(coin.amount, decimals));
    return Number.isFinite(amount) ? amount : 0;
  }

  function decimalsOf(row) {
    var symbol = symbolOf(row);
    var meta = TOKEN_META[symbol];
    var decimals = Number(row && row.decimals);
    if (Number.isFinite(decimals)) return decimals;
    if (meta) return meta.decimals;
    return 6;
  }

  function symbolOf(row) {
    var symbol = upper(row && (row.symbol || row.tokenSymbol || row.ticker || ""));
    if (symbol === "TERRA CLASSIC USD") return "UST";
    if (symbol === "TERRA CLASSIC (LUNC)") return "LUNC";
    if (symbol) return symbol;
    var name = upper(row && row.name);
    if (/TERRA CLASSIC \(LUNC\)|\bLUNC\b/.test(name)) return "LUNC";
    if (/TERRA CLASSIC USD|\bUSTC?\b/.test(name)) return "UST";
    var denom = lower(row && (row.denom || row.token || row.baseDenom || row.contract));
    if (denom === "uluna" && chainIdOf(row) === "columbus-5") return "LUNC";
    if (denom === "uusd") return "UST";
    if (denom === "ukrw") return "KRT";
    if (denom === "uidr") return "IDT";
    if (denom === "umyr") return "MYT";
    if (denom === "uthb") return "THT";
    if (denom === "ujpy") return "JPT";
    return upper(denom);
  }

  function chainIdOf(row) {
    return clean(row && (row.chainID || row.chainId || row.network || row.chain || row.chainKey));
  }

  function denomOf(row) {
    return lower(row && (row.denom || row.token || row.baseDenom || row.contract || row.id));
  }

  function categoryOf(row) {
    return lower(row && (row.category || row.type || row.assetType || "wallet")) || "wallet";
  }

  function flattenRows(source, out) {
    out = out || [];
    if (!source) return out;
    if (Array.isArray(source)) {
      source.forEach(function (entry) {
        flattenRows(entry, out);
      });
      return out;
    }
    if (!isObject(source)) return out;
    out.push(source);
    ["assets", "childAssets", "children", "coins", "tokens", "rows", "expandedAssets", "groupedAssets"].forEach(function (key) {
      if (Array.isArray(source[key])) flattenRows(source[key], out);
    });
    return out;
  }

  function allSnapshots() {
    var out = [];
    var seen = {};
    function add(snapshot) {
      if (!isObject(snapshot)) return;
      var key = [
        snapshot.updatedAt || "",
        snapshot.walletKey || "",
        snapshot.source || "",
        Object.keys(snapshot.addresses || {}).join(",")
      ].join("|");
      if (seen[key]) return;
      seen[key] = true;
      out.push(snapshot);
    }
    add(readJSON(SNAPSHOT_KEY, null));
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (isObject(byWallet)) Object.keys(byWallet).forEach(function (key) { add(byWallet[key]); });
    out.sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); });
    return out;
  }

  function snapshotRows(snapshot, keys) {
    var rows = [];
    keys.forEach(function (key) {
      if (Array.isArray(snapshot && snapshot[key])) flattenRows(snapshot[key], rows);
    });
    return rows;
  }

  function rowMatches(row, symbol) {
    symbol = upper(symbol);
    if (!symbol) return false;
    var meta = TOKEN_META[symbol] || {};
    var rowSymbol = symbolOf(row);
    var rowChain = chainIdOf(row);
    var rowDenom = denomOf(row);
    if (symbol === "LUNC") {
      return (rowChain === "columbus-5" || /terra classic|lunc/i.test(clean(row && (row.chainName || row.networkName || row.name)))) &&
        (rowDenom === "uluna" || rowSymbol === "LUNC");
    }
    if (meta.chainID && rowChain && rowChain !== meta.chainID) return false;
    if (meta.denom && rowDenom && rowDenom !== meta.denom && rowSymbol !== symbol) return false;
    return rowSymbol === symbol || rowDenom === lower(meta.denom || symbol);
  }

  function spendableRow(row) {
    var category = categoryOf(row);
    if (/staking|staked|reward|rewards|unbonding|delegation/.test(category)) return false;
    if (/^(staked|rewards|unbonding)\b/i.test(clean(row && row.name))) return false;
    return true;
  }

  function snapshotSpendableBalance(snapshot, symbol) {
    var keys = [
      "flatSpendableAssets",
      "unGroupedSpendableAssets",
      "rawSpendableAssets",
      "sourceSpendableAssets",
      "rawTokenSpendableAssets",
      "spendableAssets",
      "portfolioPanelAssets",
      "assets",
      "flatPortfolioAssets",
      "rawPortfolioAssets",
      "sourcePortfolioAssets"
    ];
    var seen = {};
    var total = 0;
    snapshotRows(snapshot, keys).forEach(function (row) {
      if (!rowMatches(row, symbol) || !spendableRow(row)) return;
      var amount = amountFromRow(row);
      if (!(amount > 0)) return;
      var key = [
        chainIdOf(row),
        denomOf(row) || symbolOf(row),
        lower(row.walletAddress || row.address || ""),
        categoryOf(row)
      ].join("|");
      if (seen[key]) return;
      seen[key] = true;
      total += amount;
    });
    return total;
  }

  function spendableBalance(symbol) {
    var snapshots = allSnapshots();
    for (var index = 0; index < snapshots.length; index += 1) {
      var amount = snapshotSpendableBalance(snapshots[index], symbol);
      if (amount > 0) {
        return {
          amount: amount,
          symbol: upper(symbol),
          snapshotAt: snapshots[index].updatedAt || 0,
          source: snapshots[index].source || ""
        };
      }
    }
    return { amount: 0, symbol: upper(symbol), snapshotAt: 0, source: "" };
  }

  function routeLooksLikeStakeAction() {
    var route = clean((window.location && (window.location.pathname + window.location.search + window.location.hash)) || "");
    if (/stake|delegat|validator/i.test(route)) return true;
    return /\b(Delegate|Redelegate|Undelegate|Balance after tx|Leave coins to pay fees)\b/i.test(clean(document.body && document.body.innerText));
  }

  function selectedSymbol(root) {
    var body = clean(root && root.innerText || root && root.textContent);
    var amountLineSymbol = body.match(/\bAmount\b[\s\S]{0,160}\b([A-Z][A-Z0-9]{1,11})\b/i);
    if (amountLineSymbol && TOKEN_META[upper(amountLineSymbol[1])]) return upper(amountLineSymbol[1]);
    var symbols = Object.keys(TOKEN_META).sort(function (a, b) { return b.length - a.length; });
    for (var index = 0; index < symbols.length; index += 1) {
      if (new RegExp("\\b" + symbols[index].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(body)) return symbols[index];
    }
    return "";
  }

  function nearestFormRoot(node) {
    var current = node;
    var best = null;
    for (var depth = 0; current && current !== document.body && depth < 18; depth += 1) {
      var body = clean(current.innerText || current.textContent);
      if (/\bAmount\b/i.test(body) && /\b(Delegate|Redelegate|Undelegate|Stake)\b/i.test(body) && current.querySelector && current.querySelector("input")) {
        best = current;
        if (/\bBalance after tx\b/i.test(body) && /\bFee\b/i.test(body)) return current;
      }
      current = current.parentElement;
    }
    return best;
  }

  function stakeFormRoots() {
    var roots = [];
    var seen = [];
    Array.prototype.slice.call(document.querySelectorAll("input")).forEach(function (input) {
      if (!visible(input)) return;
      var type = lower(input.getAttribute("type"));
      if (type && type !== "text" && type !== "number") return;
      var root = nearestFormRoot(input);
      if (!root || seen.indexOf(root) >= 0) return;
      var body = clean(root.innerText || root.textContent);
      if (!/\bBalance\b/i.test(body) || !/\bAmount\b/i.test(body)) return;
      seen.push(root);
      roots.push(root);
    });
    return roots;
  }

  function amountInput(root, symbol) {
    var inputs = Array.prototype.slice.call(root.querySelectorAll("input")).filter(visible);
    return inputs.find(function (input) {
      var around = clean((input.closest && input.closest("label,div,section,article,form") || {}).innerText || "");
      return /\bAmount\b/i.test(around) || new RegExp("\\b" + symbol + "\\b", "i").test(around);
    }) || inputs[0] || null;
  }

  function amountValue(root, symbol) {
    var input = amountInput(root, symbol);
    return input ? numberFrom(input.value) : 0;
  }

  function feeForSymbol(root, symbol) {
    var body = clean(root && root.innerText || root && root.textContent);
    var match = body.match(/\bFee\b[\s\S]{0,120}?(-?\d[\d,]*(?:\.\d+)?)\s+([A-Za-z][A-Za-z0-9]{1,11})\b/i);
    if (!match) return 0;
    return upper(match[2]) === upper(symbol) ? numberFrom(match[1]) : 0;
  }

  function formatAmount(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = 0;
    if (Math.abs(number) < 0.0000005) number = 0;
    var digits = Math.abs(number) >= 1 ? 2 : 6;
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: digits
    });
  }

  function textNodes(root) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) out.push(node);
    return out;
  }

  function setText(node, value) {
    if (!node || clean(node.nodeValue) === value) return false;
    node.nodeValue = value;
    return true;
  }

  function patchPlainBalanceText(root, symbol, balance) {
    var amountText = formatAmount(balance) + " " + symbol;
    var changed = false;
    textNodes(root).forEach(function (node) {
      var value = clean(node.nodeValue);
      if (!new RegExp("^0(?:\\.0+)?\\s+" + symbol + "$", "i").test(value)) return;
      changed = setText(node, amountText) || changed;
    });
    return changed;
  }

  function findRowWithLabel(root, label) {
    var labelPattern = label === "Balance"
      ? /\bBalance\b(?!\s+after)/i
      : new RegExp("\\b" + label + "\\b", "i");
    var candidates = Array.prototype.slice.call(root.querySelectorAll("div,span,p,section,article")).filter(visible);
    for (var index = 0; index < candidates.length; index += 1) {
      var node = candidates[index];
      var body = clean(node.innerText || node.textContent);
      if (!labelPattern.test(body)) continue;
      var current = node;
      for (var depth = 0; current && current !== root && depth < 5; depth += 1) {
        var currentText = clean(current.innerText || current.textContent);
        if (labelPattern.test(currentText) && /\d/.test(currentText)) return current;
        current = current.parentElement;
      }
    }
    return null;
  }

  function patchRowValue(row, symbol, nextAmount) {
    if (!row) return false;
    var nextText = formatAmount(nextAmount) + " " + symbol;
    var changed = false;
    var nodes = textNodes(row).filter(function (node) {
      var value = clean(node.nodeValue);
      return value && /\d/.test(value) && !/\b(Balance|Fee|Amount|Password)\b/i.test(value);
    });
    for (var index = nodes.length - 1; index >= 0; index -= 1) {
      var value = clean(nodes[index].nodeValue);
      if (new RegExp("-?\\d[\\d,]*(?:\\.\\d+)?(?:\\s+" + symbol + ")?$", "i").test(value)) {
        changed = setText(nodes[index], nextText) || changed;
        break;
      }
    }
    return changed;
  }

  function patchInsufficientState(root, symbol, balance) {
    var amount = amountValue(root, symbol);
    var canSpend = amount > 0 && balance >= amount;
    var changed = false;
    Array.prototype.slice.call(root.querySelectorAll("div,span,p,small")).forEach(function (node) {
      if (!visible(node)) return;
      var body = clean(node.innerText || node.textContent);
      if (!/\bInsufficient balance\b/i.test(body)) return;
      if (canSpend) {
        if (node.getAttribute("data-do-wallet-stake-balance-hidden") !== "1") changed = true;
        node.setAttribute("data-do-wallet-stake-balance-hidden", "1");
      } else {
        if (node.hasAttribute("data-do-wallet-stake-balance-hidden")) changed = true;
        node.removeAttribute("data-do-wallet-stake-balance-hidden");
      }
    });
    if (canSpend) {
      Array.prototype.slice.call(root.querySelectorAll("button")).forEach(function (button) {
        if (!/\bSubmit\b/i.test(clean(button.innerText || button.textContent))) return;
        if (button.disabled || button.getAttribute("aria-disabled") === "true") changed = true;
        button.disabled = false;
        button.removeAttribute("disabled");
        button.removeAttribute("aria-disabled");
        button.style.opacity = "";
        button.style.pointerEvents = "";
      });
    }
    return changed;
  }

  function patchForm(root) {
    var symbol = selectedSymbol(root);
    if (!symbol) return false;
    var balance = spendableBalance(symbol);
    if (!(balance.amount > 0)) return false;
    var amount = amountValue(root, symbol);
    var fee = feeForSymbol(root, symbol);
    var after = balance.amount - amount - fee;
    var changed = false;
    root.setAttribute("data-do-wallet-stake-balance-bridge", VERSION);
    changed = patchPlainBalanceText(root, symbol, balance.amount) || changed;
    changed = patchRowValue(findRowWithLabel(root, "Balance after tx"), symbol, after) || changed;
    changed = patchRowValue(findRowWithLabel(root, "Balance"), symbol, balance.amount) || changed;
    changed = patchInsufficientState(root, symbol, balance.amount) || changed;
    window.__doWalletStakeBalanceBridgeDebug = {
      version: VERSION,
      symbol: symbol,
      balance: balance.amount,
      amount: amount,
      fee: fee,
      after: after,
      snapshotAt: balance.snapshotAt,
      source: balance.source
    };
    return changed;
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "[data-do-wallet-stake-balance-hidden='1']{display:none!important;}",
      "[data-do-wallet-stake-balance-bridge] button[disabled]{pointer-events:auto;}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  function apply() {
    applyTimer = 0;
    if (!document.body || !routeLooksLikeStakeAction()) return;
    installStyle();
    stakeFormRoots().forEach(patchForm);
  }

  function scheduleApply(delay) {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(apply, delay == null ? APPLY_DELAY_MS : delay);
  }

  document.addEventListener("input", function () { scheduleApply(0); }, true);
  document.addEventListener("change", function () { scheduleApply(0); }, true);
  document.addEventListener("click", function () {
    scheduleApply(0);
    window.setTimeout(scheduleApply, 100);
    window.setTimeout(scheduleApply, 400);
  }, true);

  ["DOMContentLoaded", "load", "focus", "popstate", "hashchange", "do_wallet_portfolio_snapshot"].forEach(function (eventName) {
    window.addEventListener(eventName, function () { scheduleApply(0); });
  });
  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY || event.key === SNAPSHOTS_BY_WALLET_KEY) scheduleApply(0);
  });

  try {
    var observer = new MutationObserver(function () { scheduleApply(); });
    function observe() {
      if (!document.body) return;
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      window.setTimeout(function () { observer.disconnect(); }, 15000);
    }
    if (document.body) observe();
    else window.addEventListener("DOMContentLoaded", observe);
  } catch (error) {}

  scheduleApply(0);
  window.setTimeout(scheduleApply, 500);
  window.setTimeout(scheduleApply, 1500);
  window.setTimeout(scheduleApply, 3000);
})();
