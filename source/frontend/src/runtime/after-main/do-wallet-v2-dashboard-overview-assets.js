(function () {
  "use strict";

  if (window.__doWalletDashboardOverviewAssets20260626) return;
  window.__doWalletDashboardOverviewAssets20260626 = true;

  var VERSION = "20260626DashboardOverviewAssets2";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var STYLE_ID = "do-wallet-dashboard-overview-assets-style";
  var CARD_ATTR = "data-do-wallet-dashboard-overview-assets";
  var SIGNATURE_ATTR = "data-do-wallet-dashboard-overview-signature";
  var RENDER_DELAY_MS = 180;
  var renderTimer = 0;

  var CHAIN_ICON = {
    "Do-Chain": "/do-logo.jpg",
    "columbus-5": "/img/chains/TerraClassic.svg",
    "osmosis-1": "/img/chains/Osmosis.svg",
    "phoenix-1": "/img/chains/Terra.svg",
    "bitcoin-mainnet": "/img/chains/Bitcoin.svg",
    "ethereum-mainnet": "/img/chains/Ethereum.svg",
    "bnb-smart-chain-mainnet": "/img/chains/BNB.svg",
    "solana-mainnet": "/img/chains/Solana.svg",
    "arbitrum-one": "/img/chains/Arbitrum.svg",
    "avalanche-c-chain": "/img/chains/Avalanche.svg",
    "base-mainnet": "/img/chains/Base.svg",
    "polygon-mainnet": "/img/chains/Polygon.svg",
    "optimism-mainnet": "/img/chains/Optimism.svg",
    "cardano-mainnet": "/img/chains/Cardano.svg",
    "tron-mainnet": "/img/chains/Tron.svg",
    "xrp-ledger-mainnet": "/img/chains/XRP.svg",
    "cosmoshub-4": "/img/chains/Cosmos.svg",
    "secret-4": "/img/chains/Secret.png"
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

  function escapeHTML(value) {
    return clean(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function walletIdentityKeys(wallet) {
    wallet = walletFromPayload(wallet) || wallet;
    if (!isObject(wallet)) return [];
    var keys = [wallet.address, wallet.name, wallet.walletName, wallet.label, wallet.id];
    [wallet.addresses, wallet.addressMap].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        keys.push(key + ":" + map[key]);
        keys.push(map[key]);
      });
    });
    return keys.map(lower).filter(Boolean).filter(function (key, index, list) {
      return list.indexOf(key) === index;
    });
  }

  function activeWalletKeys() {
    var payloads = [
      readJSON("do-wallet-selected-recovered-wallet.v1", null),
      readJSON("user", null),
      readJSON("do-wallet-bridge-wallet", null),
      readJSON("do-wallet-extension-authority.v1", null)
    ];
    for (var index = 0; index < payloads.length; index += 1) {
      var keys = walletIdentityKeys(payloads[index]);
      if (keys.length) return keys;
    }
    return [];
  }

  function snapshotKeys(snapshot) {
    if (!isObject(snapshot)) return [];
    var keys = walletIdentityKeys(snapshot.wallet || snapshot);
    if (snapshot.walletKey) keys.push(lower(snapshot.walletKey));
    [snapshot.addresses, snapshot.activeAddresses, snapshot.allAddresses].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        keys.push(lower(key + ":" + map[key]));
        keys.push(lower(map[key]));
      });
    });
    return keys.filter(Boolean).filter(function (key, index, list) {
      return list.indexOf(key) === index;
    });
  }

  function snapshotMatchesActiveWallet(snapshot, activeKeys) {
    if (!activeKeys.length) return true;
    var keys = snapshotKeys(snapshot);
    if (!keys.length) return false;
    return keys.some(function (key) { return activeKeys.indexOf(key) >= 0; });
  }

  function collectSnapshots() {
    var snapshots = [];
    var seen = {};
    var activeKeys = activeWalletKeys();
    function add(snapshot) {
      if (!isObject(snapshot) || !snapshotMatchesActiveWallet(snapshot, activeKeys)) return;
      var key = clean(snapshot.schemaVersion || "") + ":" + clean(snapshot.updatedAt || "") + ":" + snapshotKeys(snapshot).join("|");
      if (seen[key]) return;
      seen[key] = true;
      snapshots.push(snapshot);
    }
    add(readJSON(SNAPSHOT_KEY, null));
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (isObject(byWallet)) Object.keys(byWallet).forEach(function (key) { add(byWallet[key]); });
    return snapshots.sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); });
  }

  function firstArray(source, keys) {
    if (!isObject(source)) return [];
    for (var index = 0; index < keys.length; index += 1) {
      if (Array.isArray(source[keys[index]])) return source[keys[index]];
    }
    return [];
  }

  function rawRowsFromSnapshots(kind) {
    var keys = kind === "spendable"
      ? ["flatSpendableAssets", "unGroupedSpendableAssets", "rawSpendableAssets", "sourceSpendableAssets", "rawTokenSpendableAssets", "detailPortfolioAssets", "flatPortfolioAssets", "rawPortfolioAssets", "portfolioAssets", "assets"]
      : ["staking", "sourceStakingAssets", "flatPortfolioAssets", "rawPortfolioAssets", "detailPortfolioAssets", "portfolioAssets", "assets"];
    var rows = [];
    collectSnapshots().forEach(function (snapshot) {
      firstArray(snapshot, keys).forEach(function (asset) {
        flattenAsset(asset, rows);
      });
    });
    return uniqueRows(rows.map(normalizeRow).filter(displayableRow));
  }

  function flattenAsset(asset, rows) {
    if (!isObject(asset)) return;
    var children = firstArray(asset, ["childAssets", "expandedAssets", "subAssets", "tokens", "children"]);
    if (children.length) {
      children.forEach(function (child) { flattenAsset(child, rows); });
      if (asset.isChainGroup || asset.portfolioGroup || asset.groupedUnderChain) return;
    }
    rows.push(asset);
  }

  function numberFrom(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    var text = clean(value).replace(/[$,%]/g, "").replace(/,/g, "");
    if (!text || text === "-") return 0;
    var parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatUSD(value) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "$-";
    var digits = value >= 100 ? 2 : value >= 1 ? 4 : 8;
    return "$" + value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function formatAmount(value, symbol) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "";
    var digits = value >= 100 ? 2 : value >= 1 ? 4 : 8;
    return value.toLocaleString(undefined, { maximumFractionDigits: digits }) + (symbol ? " " + symbol : "");
  }

  function categoryOf(asset) {
    return lower(asset && (asset.category || asset.type || asset.assetType || "wallet"));
  }

  function symbolOf(asset) {
    return upper(asset && (asset.symbol || asset.tokenSymbol || asset.ticker || asset.denom || asset.name));
  }

  function chainIDOf(asset) {
    return clean(asset && (asset.chainID || asset.chainId || asset.chain || asset.network || asset.networkID || asset.networkId));
  }

  function chainNameOf(asset) {
    return clean(asset && (asset.chainName || asset.networkName || asset.chainLabel || asset.networkLabel));
  }

  function iconOf(asset, chainID) {
    return clean(asset && (asset.chainIcon || asset.icon || asset.logo || asset.image)) || CHAIN_ICON[chainID] || "";
  }

  function normalizeRow(asset) {
    var symbol = symbolOf(asset);
    var chainID = chainIDOf(asset);
    var category = categoryOf(asset);
    var amount = numberFrom(asset && (asset.amount || asset.quantity || asset.balance || asset.displayAmount || asset.tokenAmount || asset.amountText));
    var value = numberFrom(asset && (asset.valueUsd || asset.groupedValueUsd || asset.value || asset.usdValue || asset.usd || asset.valueText || asset.usdValueText));
    var amountText = clean(asset && (asset.displayAmount || asset.amountText || asset.balanceText || asset.quantityText)) || formatAmount(amount, symbol);
    var valueText = clean(asset && (asset.valueText || asset.usdValueText || asset.fiatValueText || asset.valueFormatted));
    return {
      category: category,
      symbol: symbol,
      name: clean(asset && (asset.displayName || asset.name || asset.label)) || symbol,
      chainID: chainID,
      chainName: chainNameOf(asset) || clean(asset && asset.network) || chainID || symbol,
      denom: lower(asset && (asset.denom || asset.baseDenom || asset.token || symbol)),
      validator: lower(asset && (asset.validator || asset.validatorAddress || asset.validator_address || "")),
      icon: iconOf(asset, chainID),
      amount: amount,
      amountText: amountText,
      value: value,
      valueText: valueText && valueText !== "$0" ? valueText : formatUSD(value),
      priceText: clean(asset && (asset.priceText || asset.usdPriceText || asset.priceFormatted || asset.unitPriceText)),
      changeText: clean(asset && (asset.changeText || asset.priceChangeText || asset.percentText || asset.change24hText))
    };
  }

  function displayableRow(row) {
    if (!row || !row.symbol || /^[0-9.]+$/.test(row.symbol)) return false;
    if (row.amount > 0 || row.value > 0) return true;
    if (row.amountText) return true;
    if (row.valueText && row.valueText !== "$-") return true;
    return row.symbol === "DO" && row.chainID === "Do-Chain";
  }

  function rowKey(row) {
    return [row.chainID, row.category, row.denom || row.symbol, row.validator, lower(row.name)].join("|");
  }

  function betterRow(left, right) {
    if (!left) return right;
    if (!right) return left;
    if (right.value !== left.value) return right.value > left.value ? right : left;
    if (right.amount !== left.amount) return right.amount > left.amount ? right : left;
    return left;
  }

  function uniqueRows(rows) {
    var byKey = {};
    rows.forEach(function (row) {
      byKey[rowKey(row)] = betterRow(byKey[rowKey(row)], row);
    });
    return Object.keys(byKey).map(function (key) { return byKey[key]; }).sort(compareRows);
  }

  function compareRows(a, b) {
    if (b.value !== a.value) return b.value - a.value;
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.name.localeCompare(b.name);
  }

  function spendableRows() {
    return rawRowsFromSnapshots("spendable").filter(function (row) {
      return row.category === "wallet" || row.category === "asset" || row.category === "balance" || row.category === "spendable";
    });
  }

  function stakingRows() {
    return rawRowsFromSnapshots("staking").filter(function (row) {
      return row.category === "staking" || row.category === "staked";
    });
  }

  function unbondingRows() {
    return rawRowsFromSnapshots("staking").filter(function (row) {
      return row.category === "unbonding";
    });
  }

  function visible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 80) return false;
    try {
      var style = window.getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    } catch (error) {
      return true;
    }
  }

  function bodyText(node) {
    return clean(node && (node.innerText || node.textContent || ""));
  }

  function textMatches(node, value) {
    return lower(node && (node.innerText || node.textContent || "")) === lower(value);
  }

  function isDashboardRoute() {
    var path = lower((window.location && window.location.pathname) || "/").replace(/\/+$/, "") || "/";
    return path === "/" || path === "/dashboard";
  }

  function hasPageLevelDashboardContent(text) {
    return (
      text.indexOf("portfolio") >= 0 ||
      text.indexOf("do-wallet overview") >= 0 ||
      text.indexOf("wallet overview") >= 0 ||
      text.indexOf("individual chain addresses") >= 0 ||
      text.indexOf("spendable wallet assets") >= 0 ||
      text.indexOf("validator positions") >= 0 ||
      (text.indexOf("portfolio value") >= 0 && text.indexOf("send") >= 0 && text.indexOf("receive") >= 0)
    );
  }

  function cardIsSafeHost(node, title, subtitle) {
    if (!node || !visible(node)) return false;
    if (node.closest && node.closest("nav,aside,header,footer")) return false;
    var text = lower(bodyText(node));
    if (text.indexOf(lower(title)) < 0 || text.indexOf(lower(subtitle)) < 0) return false;
    if (hasPageLevelDashboardContent(text)) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width < 320 || rect.height < 170) return false;
    if (rect.height > Math.max(620, Math.floor((window.innerHeight || 900) * 0.72))) return false;
    return true;
  }

  function findOverviewCard(title, subtitle) {
    if (!isDashboardRoute()) return null;
    var candidates = [];
    Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,strong")).forEach(function (heading) {
      if (!textMatches(heading, title)) return;
      var node = heading.parentElement;
      for (var depth = 0; node && node !== document.body && depth < 7; depth += 1) {
        if (cardIsSafeHost(node, title, subtitle)) candidates.push(node);
        node = node.parentElement;
      }
    });
    return candidates.filter(function (node, index, list) {
      return list.indexOf(node) === index;
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    })[0] || null;
  }

  function iconHTML(row) {
    if (!row.icon) return '<span class="do-wallet-dashboard-overview-icon-fallback">' + escapeHTML(row.symbol.slice(0, 3)) + '</span>';
    return '<img class="do-wallet-dashboard-overview-icon" src="' + escapeHTML(row.icon) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';" />';
  }

  function rowHTML(row) {
    var changeClass = row.changeText && row.changeText.indexOf("-") >= 0 ? "negative" : "positive";
    return [
      '<div class="do-wallet-dashboard-overview-row">',
        '<div class="do-wallet-dashboard-overview-left">',
          iconHTML(row),
          '<span>',
            '<strong>' + escapeHTML(row.name) + (row.priceText ? ' <small>' + escapeHTML(row.priceText) + '</small>' : '') + '</strong>',
            row.changeText ? '<em class="' + changeClass + '">' + escapeHTML(row.changeText) + '</em>' : '<small>' + escapeHTML(row.chainName) + '</small>',
          '</span>',
        '</div>',
        '<div class="do-wallet-dashboard-overview-right">',
          '<strong>' + escapeHTML(row.valueText) + '</strong>',
          '<small>' + escapeHTML(row.amountText || row.symbol) + '</small>',
        '</div>',
      '</div>'
    ].join("");
  }

  function renderCard(card, kind, title, subtitle, rows) {
    if (!card || !rows.length) return false;
    if (!cardIsSafeHost(card, title, subtitle)) return false;
    var signature = VERSION + ":" + kind + ":" + rows.map(function (row) {
      return rowKey(row) + ":" + row.valueText + ":" + row.amountText;
    }).join("||");
    if (card.getAttribute(SIGNATURE_ATTR) === signature) return true;
    card.setAttribute(CARD_ATTR, kind);
    card.setAttribute(SIGNATURE_ATTR, signature);
    card.innerHTML = [
      '<div class="do-wallet-dashboard-overview-head">',
        '<div>',
          '<h2>' + escapeHTML(title) + '</h2>',
          '<p>' + escapeHTML(subtitle) + '</p>',
        '</div>',
        '<strong>' + escapeHTML(rows.length + " " + (rows.length === 1 ? "position" : "positions")) + '</strong>',
      '</div>',
      '<div class="do-wallet-dashboard-overview-list">',
        rows.map(rowHTML).join(""),
      '</div>'
    ].join("");
    return true;
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "[" + CARD_ATTR + "]{box-sizing:border-box;min-height:260px!important;padding:28px 32px!important;color:#fff!important;overflow:hidden!important;}",
      "[" + CARD_ATTR + "] *{box-sizing:border-box;}",
      ".do-wallet-dashboard-overview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin:0 0 18px;}",
      ".do-wallet-dashboard-overview-head h2{margin:0 0 4px;font-size:28px;line-height:1.1;font-weight:var(--bold,500);letter-spacing:0;color:#fff;}",
      ".do-wallet-dashboard-overview-head p{margin:0;color:#aaa0bd;font-size:14px;line-height:1.3;font-weight:var(--bold,500);}",
      ".do-wallet-dashboard-overview-head>strong{color:#aaa0bd;font-size:14px;line-height:1.2;font-weight:var(--bold,500);white-space:nowrap;}",
      ".do-wallet-dashboard-overview-list{max-height:330px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;border-top:1px solid rgba(135,57,190,.24);}",
      ".do-wallet-dashboard-overview-row{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:70px;padding:12px 0;border-bottom:1px solid rgba(135,57,190,.24);}",
      ".do-wallet-dashboard-overview-left{display:flex;align-items:center;gap:14px;min-width:0;flex:1 1 auto;}",
      ".do-wallet-dashboard-overview-left>span{display:flex;flex-direction:column;gap:4px;min-width:0;}",
      ".do-wallet-dashboard-overview-left strong{display:block;color:#fff;font-size:15px;line-height:1.12;font-weight:var(--bold,500);letter-spacing:0;white-space:normal;}",
      ".do-wallet-dashboard-overview-left strong small{color:#c9bbef;font-size:11px;font-weight:var(--bold,500);}",
      ".do-wallet-dashboard-overview-left small,.do-wallet-dashboard-overview-left em{font-size:12px;line-height:1.1;font-style:normal;font-weight:var(--bold,500);color:#c9bbef;}",
      ".do-wallet-dashboard-overview-left em.negative{color:#ff4b55;}",
      ".do-wallet-dashboard-overview-left em.positive{color:#00c68f;}",
      ".do-wallet-dashboard-overview-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:128px;max-width:42%;text-align:right;}",
      ".do-wallet-dashboard-overview-right strong{display:block;color:#fff;font-size:15px;line-height:1.1;font-weight:var(--bold,500);}",
      ".do-wallet-dashboard-overview-right small{display:block;color:#c9bbef;font-size:12px;line-height:1.1;font-weight:var(--bold,500);white-space:normal;}",
      ".do-wallet-dashboard-overview-icon,.do-wallet-dashboard-overview-icon-fallback{width:34px;height:34px;min-width:34px;border-radius:50%;object-fit:cover;background:#2c2140;}",
      ".do-wallet-dashboard-overview-icon-fallback{display:grid;place-items:center;color:#fff;font-size:10px;font-weight:var(--bold,500);}",
      "@media(max-width:760px){[" + CARD_ATTR + "]{padding:20px 18px!important}.do-wallet-dashboard-overview-head h2{font-size:24px}.do-wallet-dashboard-overview-row{gap:10px}.do-wallet-dashboard-overview-right{min-width:104px}.do-wallet-dashboard-overview-left strong{font-size:14px}.do-wallet-dashboard-overview-right strong{font-size:14px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function render() {
    if (!document.body) return;
    if (!isDashboardRoute()) return;
    installStyle();
    var assets = spendableRows();
    var staked = stakingRows();
    var unbonding = unbondingRows();
    var changed = false;
    changed = renderCard(findOverviewCard("Assets", "All spendable balances"), "assets", "Assets", "All spendable balances", assets) || changed;
    changed = renderCard(findOverviewCard("Validators staked with", "Delegations across all chains"), "staking", "Validators staked with", "Delegations across all chains", staked) || changed;
    changed = renderCard(findOverviewCard("Unbonding", "Assets currently leaving staking"), "unbonding", "Unbonding", "Assets currently leaving staking", unbonding) || changed;
    try {
      window.__doWalletDashboardOverviewAssetsDebug = {
        version: VERSION,
        changed: changed,
        assets: assets.length,
        staking: staked.length,
        unbonding: unbonding.length,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {}
  }

  function schedule() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, RENDER_DELAY_MS);
  }

  window.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("load", schedule);
  window.addEventListener("focus", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("do_wallet_portfolio_snapshot", schedule);
  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY || event.key === SNAPSHOTS_BY_WALLET_KEY) schedule();
  });

  try {
    var observer = new MutationObserver(function (mutations) {
      var shouldRender = false;
      Array.prototype.slice.call(mutations || []).forEach(function (mutation) {
        if (shouldRender) return;
        var nodes = Array.prototype.slice.call(mutation.addedNodes || []);
        nodes.forEach(function (node) {
          if (shouldRender || !node || node.nodeType !== 1) return;
          if (node.hasAttribute && node.hasAttribute(CARD_ATTR)) return;
          var text = lower(node.textContent || "");
          if (text.indexOf("all spendable balances") >= 0 || text.indexOf("delegations across all chains") >= 0 || text.indexOf("assets currently leaving staking") >= 0) shouldRender = true;
        });
      });
      if (shouldRender) schedule();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {}

  schedule();
  window.setTimeout(schedule, 1200);
  window.setTimeout(schedule, 3000);
})();
