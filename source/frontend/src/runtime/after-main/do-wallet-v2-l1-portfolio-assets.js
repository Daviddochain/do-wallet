(function () {
  "use strict";

  if (window.__doWalletL1PortfolioAssets20260625Rewrite1) return;
  window.__doWalletL1PortfolioAssets20260625Rewrite1 = true;
  window.__doWalletL1PortfolioOwnsAssets = true;

  var VERSION = "20260625L1PortfolioRewrite1";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var CACHE_KEY = "do-wallet-l1-portfolio-groups-cache-v1";
  var STYLE_ID = "do-wallet-l1-portfolio-assets-style";
  var LIST_SELECTOR = "[class*='AssetList_assetlist__list']";
  var TARGET_ATTR = "data-do-wallet-l1-assets-target";
  var SIGNATURE_ATTR = "data-do-wallet-l1-assets-signature";
  var DETAIL_ATTR = "data-do-wallet-l1-assets-detail";
  var renderTimer = null;
  var observer = null;
  var activeKey = "";
  var rendering = false;

  var TERRA_CLASSIC_SYMBOLS = {
    LUNC: true,
    LUNA: true,
    UST: true,
    USTC: true,
    AUT: true,
    CAT: true,
    CHT: true,
    CNT: true,
    DKT: true,
    EUT: true,
    GBT: true,
    HKT: true,
    IDT: true,
    INT: true,
    JPT: true,
    KRT: true,
    MNT: true,
    MYT: true,
    NOT: true,
    PHT: true,
    SDT: true,
    SET: true,
    SGT: true,
    THT: true
  };

  var TERRA_CLASSIC_DENOMS = {
    uluna: true,
    uusd: true,
    uaud: true,
    ucad: true,
    uchf: true,
    ucny: true,
    udkk: true,
    ueur: true,
    ugbp: true,
    uhkd: true,
    uidr: true,
    uinr: true,
    ujpy: true,
    ukrw: true,
    umnt: true,
    umyr: true,
    unok: true,
    uphp: true,
    usdr: true,
    usek: true,
    usgd: true,
    uthb: true
  };

  var CHAIN_META = {
    "Do-Chain": ["Do Chain", "DO", "/do-logo.jpg", 10],
    "columbus-5": ["Terra Classic (LUNC)", "LUNC", "/img/chains/TerraClassic.svg", 20],
    "osmosis-1": ["Osmosis", "OSMO", "/img/chains/Osmosis.png", 30],
    "phoenix-1": ["Terra (LUNA)", "LUNA", "/img/chains/Terra.svg", 40],
    "bitcoin-mainnet": ["Bitcoin", "BTC", "/img/chains/Bitcoin.svg", 50],
    "ethereum-mainnet": ["Ethereum", "ETH", "/img/chains/Ethereum.svg", 60],
    "bnb-smart-chain-mainnet": ["BNB Smart Chain", "BNB", "/img/chains/Bnb.svg", 70],
    "solana-mainnet": ["Solana", "SOL", "/img/chains/Solana.svg", 80],
    "arbitrum-one": ["Arbitrum One", "ETH", "/img/chains/Arbitrum.svg", 90],
    "avalanche-c-chain": ["Avalanche C-Chain", "AVAX", "/img/chains/Avalanche.svg", 100],
    "base-mainnet": ["Base", "ETH", "/img/chains/Base.svg", 110],
    "polygon-mainnet": ["Polygon", "MATIC", "/img/chains/Polygon.svg", 120],
    "optimism-mainnet": ["Optimism", "OP", "/img/chains/Optimism.svg", 130],
    "cardano-mainnet": ["Cardano", "ADA", "/img/chains/Cardano.svg", 140],
    "tron-mainnet": ["Tron", "TRX", "/img/chains/Tron.svg", 150],
    "xrp-ledger-mainnet": ["XRP Ledger", "XRP", "/img/chains/Xrp.svg", 160],
    "cosmoshub-4": ["Cosmos", "ATOM", "/img/chains/Cosmos.png", 170],
    "secret-4": ["Secret Network", "SCRT", "/img/chains/Secret.png", 180],
    "dungeon-1": ["Dungeon Chain", "DGN", "https://raw.githubusercontent.com/cosmos/chain-registry/master/dungeon/images/DGN.png", 190],
    "akashnet-2": ["Akash", "AKT", "/img/chains/Akash.png", 200],
    "archway-1": ["Archway", "ARCH", "/img/chains/Archway.png", 210],
    "axelar-dojo-1": ["Axelar", "AXL", "/img/chains/Axelar.png", 220],
    "carbon-1": ["Carbon", "SWTH", "/img/chains/Carbon.png", 230],
    "cheqd-mainnet-1": ["cheqd", "CHEQ", "/img/chains/Cheqd.png", 240],
    "chihuahua-1": ["Chihuahua", "HUAHUA", "/img/chains/Chihuahua.png", 250],
    "crescent-1": ["Crescent", "CRE", "/img/chains/Crescent.png", 260],
    "decentr-mainnet-1": ["Decentr", "DEC", "/img/chains/Decentr.png", 270],
    "juno-1": ["Juno", "JUNO", "/img/chains/Juno.png", 280],
    "kaiyo-1": ["Kujira", "KUJI", "/img/chains/Kujira.png", 290],
    "mars-1": ["Mars", "MARS", "/img/chains/Mars.png", 300]
  };

  function text(value) {
    return value == null ? "" : String(value);
  }

  function clean(value) {
    return text(value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function upper(value) {
    return clean(value).toUpperCase();
  }

  function escapeHTML(value) {
    return text(value).replace(/[&<>"']/g, function (char) {
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

  function writeJSON(key, value) {
    try {
      var raw = JSON.stringify(value);
      if (window.localStorage.getItem(key) === raw) return;
      window.localStorage.setItem(key, raw);
    } catch (error) {}
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function isVisible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    try {
      var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
      if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    } catch (error) {}
    return true;
  }

  function firstArray(value, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(value && value[keys[i]])) return value[keys[i]];
    }
    return [];
  }

  function childrenOf(asset) {
    return firstArray(asset, ["childAssets", "expandedAssets", "subAssets", "tokens", "children"]);
  }

  function rawSymbol(asset) {
    return clean(asset && (asset.symbol || asset.tokenSymbol || asset.ticker || asset.name || asset.denom || asset.token));
  }

  function symbolOf(asset) {
    var symbol = rawSymbol(asset);
    if (upper(symbol) === "USTC") return "UST";
    return symbol;
  }

  function chainIdOf(asset) {
    return clean(asset && (asset.chainID || asset.chainId || asset.network || asset.chain || asset.chainKey));
  }

  function chainNameOf(asset) {
    return clean(asset && (asset.chainName || asset.networkName || asset.chainLabel || asset.chain || asset.network));
  }

  function denomOf(asset) {
    return clean(asset && (asset.denom || asset.token || asset.contract || asset.baseAsset || asset.id));
  }

  function categoryOf(asset) {
    return lower(asset && (asset.category || asset.type || "wallet"));
  }

  function iconOf(asset) {
    return clean(asset && (asset.icon || asset.image || asset.logo || asset.logoURI || asset.logoUrl || asset.tokenIcon || asset.chainIcon));
  }

  function numberFrom(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    var match = text(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) || 0 : 0;
  }

  function amountNumber(asset) {
    return numberFrom(asset && (asset.amount || asset.quantity || asset.balance || asset.displayAmount || asset.amountText || asset.tokenAmount));
  }

  function valueNumber(asset) {
    return numberFrom(asset && (asset.valueUsd || asset.groupedValueUsd || asset.value || asset.usdValue || asset.fiatValue || asset.usd || asset.valueText || asset.usdValueText || asset.fiatValueText));
  }

  function formatUSD(value) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "$-";
    var digits = value >= 100 ? 2 : value >= 1 ? 4 : 8;
    return "$" + value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function valueText(asset, numericFallback) {
    var value = clean(asset && (asset.valueText || asset.usdValueText || asset.fiatValueText || asset.valueFormatted));
    if (value) return value;
    return formatUSD(numericFallback != null ? numericFallback : valueNumber(asset));
  }

  function priceText(asset) {
    var value = clean(asset && (asset.priceText || asset.usdPriceText || asset.priceFormatted || asset.unitPriceText));
    if (value) return value;
    var number = numberFrom(asset && (asset.priceUsd || asset.price || asset.usdPrice || asset.unitPrice));
    return number > 0 ? formatUSD(number) : "";
  }

  function percentText(asset) {
    var value = clean(asset && (asset.changeText || asset.priceChangeText || asset.percentText || asset.change24hText || asset.priceChange24hText));
    if (value) return value;
    var number = asset && (asset.change24h || asset.percentChange24h || asset.priceChangePercent || asset.priceChangePercent24h || asset.changePercent);
    number = Number(number);
    if (!Number.isFinite(number) || number === 0) return "";
    return number.toFixed(2) + "%";
  }

  function amountText(asset) {
    var value = clean(asset && (asset.displayAmount || asset.amountText || asset.balanceText || asset.quantityText));
    if (value) return value;
    var number = amountNumber(asset);
    if (!Number.isFinite(number) || number <= 0) return "";
    var symbol = symbolOf(asset);
    var digits = number >= 100 ? 2 : number >= 1 ? 4 : 8;
    return number.toLocaleString(undefined, { maximumFractionDigits: digits }) + (symbol ? " " + symbol : "");
  }

  function metaFromTuple(key, tuple) {
    return {
      key: key,
      name: tuple[0],
      nativeSymbol: tuple[1],
      icon: tuple[2],
      priority: tuple[3] || 999
    };
  }

  function canonicalChain(rawID, rawName, symbol, denom) {
    var id = lower(rawID);
    var name = lower(rawName);
    var sym = upper(symbol);
    var den = lower(denom);
    if (
      id === "do-chain" ||
      id === "do" ||
      id === "888" ||
      id.indexOf("dochain") >= 0 ||
      name.indexOf("do chain") >= 0 ||
      den === "udo" ||
      sym === "DO"
    ) return "Do-Chain";
    if (
      id === "columbus-5" ||
      id === "terra-classic" ||
      id === "lunc" ||
      id === "330" ||
      name.indexOf("terra classic") >= 0 ||
      TERRA_CLASSIC_DENOMS[den] ||
      den.indexOf("terra1") === 0 ||
      (TERRA_CLASSIC_SYMBOLS[sym] && id !== "phoenix-1" && id !== "osmosis-1" && id !== "Do-Chain")
    ) return "columbus-5";
    if (id === "phoenix-1" || (sym === "LUNA" && name.indexOf("terra classic") < 0) || name.indexOf("terra (luna)") >= 0) return "phoenix-1";
    if (id === "osmosis-1" || id === "osmosis" || id === "osmo" || sym === "OSMO" || name.indexOf("osmosis") >= 0) return "osmosis-1";
    if (id === "bitcoin" || id === "btc" || id.indexOf("bitcoin") >= 0 || sym === "BTC") return "bitcoin-mainnet";
    if (id === "ethereum" || id === "eth" || id === "eip155:1" || id.indexOf("ethereum") >= 0 || (sym === "ETH" && name.indexOf("arbitrum") < 0 && name.indexOf("base") < 0)) return "ethereum-mainnet";
    if (id.indexOf("bnb") >= 0 || id.indexOf("binance") >= 0 || sym === "BNB" || name.indexOf("bnb") >= 0) return "bnb-smart-chain-mainnet";
    if (id.indexOf("solana") >= 0 || id === "sol" || sym === "SOL") return "solana-mainnet";
    if (id.indexOf("arbitrum") >= 0 || name.indexOf("arbitrum") >= 0) return "arbitrum-one";
    if (id.indexOf("avalanche") >= 0 || sym === "AVAX" || name.indexOf("avalanche") >= 0) return "avalanche-c-chain";
    if (id.indexOf("base") >= 0 || name === "base") return "base-mainnet";
    if (id.indexOf("polygon") >= 0 || sym === "MATIC" || name.indexOf("polygon") >= 0) return "polygon-mainnet";
    if (id.indexOf("optimism") >= 0 || sym === "OP" || name.indexOf("optimism") >= 0) return "optimism-mainnet";
    if (id.indexOf("cardano") >= 0 || sym === "ADA" || name.indexOf("cardano") >= 0) return "cardano-mainnet";
    if (id.indexOf("tron") >= 0 || sym === "TRX" || name.indexOf("tron") >= 0) return "tron-mainnet";
    if (id.indexOf("xrp") >= 0 || sym === "XRP" || name.indexOf("xrp") >= 0) return "xrp-ledger-mainnet";
    if (id.indexOf("cosmos") >= 0 || id === "atom" || sym === "ATOM" || name.indexOf("cosmos") >= 0) return "cosmoshub-4";
    if (id.indexOf("secret") >= 0 || sym === "SCRT" || name.indexOf("secret") >= 0) return "secret-4";
    if (id.indexOf("dungeon") >= 0 || sym === "DGN" || name.indexOf("dungeon") >= 0) return "dungeon-1";
    if (id.indexOf("akash") >= 0 || sym === "AKT" || name.indexOf("akash") >= 0) return "akashnet-2";
    if (id.indexOf("archway") >= 0 || sym === "ARCH" || name.indexOf("archway") >= 0) return "archway-1";
    if (id.indexOf("axelar") >= 0 || sym === "AXL" || name.indexOf("axelar") >= 0) return "axelar-dojo-1";
    if (id.indexOf("carbon") >= 0 || sym === "SWTH" || name.indexOf("carbon") >= 0) return "carbon-1";
    if (id.indexOf("cheqd") >= 0 || sym === "CHEQ" || name.indexOf("cheqd") >= 0) return "cheqd-mainnet-1";
    if (id.indexOf("chihuahua") >= 0 || sym === "HUAHUA" || name.indexOf("chihuahua") >= 0) return "chihuahua-1";
    if (id.indexOf("crescent") >= 0 || sym === "CRE" || name.indexOf("crescent") >= 0) return "crescent-1";
    if (id.indexOf("decentr") >= 0 || sym === "DEC" || name.indexOf("decentr") >= 0) return "decentr-mainnet-1";
    if (id.indexOf("juno") >= 0 || sym === "JUNO" || name.indexOf("juno") >= 0) return "juno-1";
    if (id.indexOf("kujira") >= 0 || sym === "KUJI" || name.indexOf("kujira") >= 0) return "kaiyo-1";
    if (id.indexOf("mars") >= 0 || sym === "MARS" || name.indexOf("mars") >= 0) return "mars-1";
    return rawID || rawName || sym || den;
  }

  function chainMeta(asset) {
    var key = canonicalChain(chainIdOf(asset), chainNameOf(asset), symbolOf(asset), denomOf(asset));
    var tuple = CHAIN_META[key];
    if (tuple) return metaFromTuple(key, tuple);
    var name = chainNameOf(asset) || key || symbolOf(asset);
    var symbol = upper(symbolOf(asset)) || upper(name).slice(0, 8);
    return {
      key: key || symbol,
      name: name,
      nativeSymbol: symbol,
      icon: iconOf(asset),
      priority: 999
    };
  }

  function assetIsSpendable(asset) {
    var category = categoryOf(asset);
    var symbol = lower(symbolOf(asset));
    if (category && category !== "wallet" && category !== "asset" && category !== "balance" && category !== "spendable") return false;
    if (/^(staked|rewards|reward|unbonding)\b/.test(symbol)) return false;
    return true;
  }

  function assetIsDisplayable(asset, meta) {
    if (!asset || !assetIsSpendable(asset)) return false;
    var symbol = upper(symbolOf(asset));
    if (!symbol || /^[0-9.]+$/.test(symbol)) return false;
    if (symbol === "DO" && meta && meta.key === "Do-Chain") return true;
    if (valueNumber(asset) > 0 || amountNumber(asset) > 0) return true;
    return false;
  }

  function sourcePriority(source) {
    if (source === "dom") return 1;
    if (source === "snapshot-flat") return 2;
    if (source === "snapshot-child") return 3;
    if (source === "snapshot-group") return 4;
    if (source === "cache") return 5;
    return 9;
  }

  function normalizeAsset(asset, source, index) {
    var symbol = symbolOf(asset);
    var meta = chainMeta(asset);
    var numericValue = valueNumber(asset);
    var normalized = {
      source: source,
      sourcePriority: sourcePriority(source),
      index: Number(index) || 0,
      symbol: symbol,
      name: clean(asset && asset.name) || symbol,
      chainID: meta.key,
      chainName: meta.name,
      nativeSymbol: meta.nativeSymbol,
      denom: denomOf(asset),
      category: categoryOf(asset),
      icon: iconOf(asset) || meta.icon,
      chainIcon: clean(asset && asset.chainIcon) || meta.icon,
      amount: amountNumber(asset),
      amountText: amountText(asset),
      value: numericValue,
      valueText: valueText(asset, numericValue),
      priceText: priceText(asset),
      changeText: percentText(asset),
      raw: asset
    };
    if (upper(normalized.symbol) === "USTC") normalized.symbol = "UST";
    return normalized;
  }

  function assetIdentity(asset) {
    return [
      asset.chainID,
      upper(asset.symbol),
      lower(asset.denom || asset.symbol),
      lower(asset.category || "wallet")
    ].join("|");
  }

  function betterAsset(left, right) {
    if (!left) return right;
    if (!right) return left;
    if (right.sourcePriority !== left.sourcePriority) return right.sourcePriority < left.sourcePriority ? right : left;
    if ((right.valueText && right.valueText !== "$-") !== (left.valueText && left.valueText !== "$-")) return right.valueText && right.valueText !== "$-" ? right : left;
    if ((right.amountText && right.amountText.length) !== (left.amountText && left.amountText.length)) return right.amountText ? right : left;
    if (right.value !== left.value) return right.value > left.value ? right : left;
    return left.index <= right.index ? left : right;
  }

  function collectSnapshotAssets(snapshot) {
    var rows = [];
    var order = 0;
    function pushAsset(asset, source) {
      if (!asset || !isObject(asset)) return;
      var kids = childrenOf(asset);
      if (kids.length) {
        kids.forEach(function (child) {
          pushAsset(child, "snapshot-child");
        });
        if (!asset.isChainGroup && !asset.portfolioGroup) {
          var self = normalizeAsset(asset, source || "snapshot-flat", order += 1);
          if (assetIsDisplayable(self, chainMeta(self))) rows.push(self);
        }
        return;
      }
      var normalized = normalizeAsset(asset, source || "snapshot-flat", order += 1);
      if (assetIsDisplayable(normalized, chainMeta(normalized))) rows.push(normalized);
    }

    [
      "rawSpendableAssets",
      "flatSpendableAssets",
      "unGroupedSpendableAssets",
      "sourceSpendableAssets",
      "rawTokenSpendableAssets",
      "rawPortfolioAssets",
      "flatPortfolioAssets",
      "unGroupedPortfolioAssets",
      "sourcePortfolioAssets",
      "rawTokenPortfolioAssets",
      "detailPortfolioAssets"
    ].forEach(function (key) {
      if (!Array.isArray(snapshot && snapshot[key])) return;
      snapshot[key].forEach(function (asset) { pushAsset(asset, "snapshot-flat"); });
    });

    [
      "groupedSpendableAssets",
      "groupedPortfolioAssets",
      "chainGroupedAssets",
      "sidePanelAssets",
      "portfolioPanelAssets",
      "spendableAssets",
      "assets",
      "portfolioAssets",
      "tokenSpendableAssets",
      "tokenPortfolioAssets"
    ].forEach(function (key) {
      if (!Array.isArray(snapshot && snapshot[key])) return;
      snapshot[key].forEach(function (asset) { pushAsset(asset, "snapshot-group"); });
    });

    return rows;
  }

  function walletKey(snapshot) {
    if (!isObject(snapshot)) return "";
    var wallet = isObject(snapshot.wallet) ? snapshot.wallet : {};
    return clean(snapshot.walletKey || wallet.id || wallet.address || wallet.name || wallet.walletName || Object.keys(snapshot.addresses || {}).map(function (key) {
      return snapshot.addresses[key];
    }).join("|"));
  }

  function cacheGroupsToAssets(cache, currentWalletKey) {
    if (!isObject(cache) || !Array.isArray(cache.groups)) return [];
    if (cache.version && cache.version !== VERSION) return [];
    if (cache.walletKey && currentWalletKey && cache.walletKey !== currentWalletKey) return [];
    var rows = [];
    cache.groups.forEach(function (group, groupIndex) {
      (Array.isArray(group.assets) ? group.assets : []).forEach(function (asset, index) {
        var normalized = normalizeAsset(Object.assign({}, asset, {
          chainID: group.key,
          chainName: group.name,
          icon: asset.icon || group.icon
        }), "cache", groupIndex * 1000 + index);
        if (assetIsDisplayable(normalized, chainMeta(normalized))) rows.push(normalized);
      });
    });
    return rows;
  }

  function rowText(row, selector) {
    var node = row && row.querySelector && row.querySelector(selector);
    return clean(node && node.textContent || "");
  }

  function rowImage(row, selector) {
    var node = row && row.querySelector && row.querySelector(selector);
    if (!node) return "";
    if (node.tagName && node.tagName.toLowerCase() === "img") return clean(node.getAttribute("src") || node.src);
    var img = node.querySelector && node.querySelector("img");
    return clean(img && (img.getAttribute("src") || img.src));
  }

  function domSymbol(row) {
    var symbol = rowText(row, "[class*='Asset_symbol__name']");
    if (symbol) return upper(symbol);
    var content = clean(row && row.textContent || "");
    var match = content.match(/\b[A-Z][A-Z0-9]{1,11}\b/);
    return match ? match[0] : "";
  }

  function moneyTokens(value) {
    return clean(value).match(/(?:<\s*)?\$\s*-?[\d,]+(?:\.\d+)?|\$-/g) || [];
  }

  function amountFromDom(content, symbol) {
    var safe = text(symbol).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var match = clean(content).match(new RegExp("([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*" + safe + "\\b", "i"));
    return match ? match[1] + " " + symbol : "";
  }

  function collectDomAssets(list) {
    var rows = Array.prototype.slice.call(list.querySelectorAll("article")).filter(function (row) {
      if (!row || !row.querySelector) return false;
      if (row.closest(".do-wallet-l1-portfolio-shell") || row.closest(".do-wallet-l1-portfolio-detail")) return false;
      if (row.className && text(row.className).indexOf("do-wallet-") >= 0) return false;
      return true;
    });
    return rows.map(function (row, index) {
      var symbol = domSymbol(row);
      var content = clean(row.textContent || "");
      var money = moneyTokens(content);
      var value = rowText(row, "[class*='Asset_price__']") || rowText(row, "[class*='Asset_value__']") || money[money.length - 1] || "";
      var price = rowText(row, "[class*='Asset_unit__price__']") || (money.length > 1 ? money[0] : "");
      var change = rowText(row, "[class*='Asset_change__']") || (content.match(/[+-]?\d+(?:\.\d+)?%/) || [""])[0];
      var amount = rowText(row, "[class*='Asset_amount__']") || amountFromDom(content, symbol);
      var icon = rowImage(row, "[class*='TokenIcon_icon']") || rowImage(row, "[class*='Asset_token__icon']") || rowImage(row, "img");
      var chainIcon = rowImage(row, "[class*='Asset_chain__icon']");
      var chainAltNode = row.querySelector("[class*='Asset_chain__icon']");
      var chainName = clean(chainAltNode && (chainAltNode.getAttribute("alt") || chainAltNode.alt));
      var asset = {
        symbol: symbol,
        name: symbol,
        chainName: chainName || symbol,
        chainID: chainName || symbol,
        denom: symbol,
        icon: icon || chainIcon,
        chainIcon: chainIcon,
        displayAmount: amount,
        amountText: amount,
        valueText: value,
        priceText: price,
        changeText: change,
        category: "wallet"
      };
      return normalizeAsset(asset, "dom", index);
    }).filter(function (asset) {
      return assetIsDisplayable(asset, chainMeta(asset));
    });
  }

  function buildGroups(rows) {
    var groups = {};
    rows.forEach(function (row) {
      var meta = chainMeta(row);
      if (!meta || !meta.key) return;
      var key = meta.key;
      if (!groups[key]) {
        groups[key] = {
          key: key,
          name: meta.name,
          nativeSymbol: meta.nativeSymbol,
          icon: row.chainIcon || meta.icon || row.icon,
          priority: meta.priority,
          firstIndex: row.index,
          assetsByKey: {}
        };
      }
      var group = groups[key];
      group.firstIndex = Math.min(group.firstIndex, row.index);
      if (!group.icon && (row.chainIcon || row.icon)) group.icon = row.chainIcon || row.icon;
      var rowKey = assetIdentity(row);
      group.assetsByKey[rowKey] = betterAsset(group.assetsByKey[rowKey], row);
    });

    return Object.keys(groups).map(function (key) {
      var group = groups[key];
      var assets = Object.keys(group.assetsByKey).map(function (rowKey) {
        return group.assetsByKey[rowKey];
      }).sort(function (a, b) {
        var an = upper(a.symbol) === upper(group.nativeSymbol) ? -1 : 0;
        var bn = upper(b.symbol) === upper(group.nativeSymbol) ? -1 : 0;
        return (an - bn) || (b.value - a.value) || (a.index - b.index) || upper(a.symbol).localeCompare(upper(b.symbol));
      });
      var total = assets.reduce(function (sum, asset) {
        return sum + (Number(asset.value) || 0);
      }, 0);
      var parent = assets.filter(function (asset) {
        return upper(asset.symbol) === upper(group.nativeSymbol);
      })[0] || assets[0];
      return Object.assign(group, {
        assets: assets,
        parent: parent,
        totalValue: total,
        totalValueText: formatUSD(total),
        signature: assets.map(function (asset) {
          return [asset.chainID, asset.symbol, asset.denom, asset.amountText, asset.valueText, asset.priceText, asset.changeText].join(":");
        }).join("|")
      });
    }).filter(function (group) {
      return group.assets.length > 0;
    }).sort(function (a, b) {
      var aHasValue = a.totalValue > 0 ? 0 : 1;
      var bHasValue = b.totalValue > 0 ? 0 : 1;
      return (aHasValue - bHasValue) || (a.priority - b.priority) || (a.firstIndex - b.firstIndex) || a.name.localeCompare(b.name);
    });
  }

  function serializableGroups(groups) {
    return groups.map(function (group) {
      return {
        key: group.key,
        name: group.name,
        nativeSymbol: group.nativeSymbol,
        icon: group.icon,
        totalValue: group.totalValue,
        totalValueText: group.totalValueText,
        assets: group.assets.map(function (asset) {
          return {
            symbol: asset.symbol,
            name: asset.name,
            chainID: asset.chainID,
            chainName: asset.chainName,
            denom: asset.denom,
            category: asset.category,
            icon: asset.icon,
            chainIcon: asset.chainIcon,
            amount: asset.amount,
            amountText: asset.amountText,
            value: asset.value,
            valueText: asset.valueText,
            priceText: asset.priceText,
            changeText: asset.changeText
          };
        })
      };
    });
  }

  function groupsSignature(groups, mode) {
    return mode + "::" + groups.map(function (group) {
      return group.key + "=" + group.totalValueText + "=" + group.signature;
    }).join("||");
  }

  function fallbackIcon(label, className, hidden) {
    return '<span class="' + className + ' do-wallet-l1-portfolio-fallback"' + (hidden ? ' style="display:none"' : "") + ">" + escapeHTML((label || "?").slice(0, 3).toUpperCase()) + "</span>";
  }

  function renderIcon(src, label, className) {
    var fallback = fallbackIcon(label, className, false);
    if (!src) return fallback;
    return '<img class="' + className + '" src="' + escapeHTML(src) + '" alt="" loading="eager" decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\';" />' + fallbackIcon(label, className, true);
  }

  function groupRowHTML(group) {
    var count = group.assets.length === 1 ? "1 asset" : group.assets.length + " assets";
    return [
      '<button type="button" class="do-wallet-l1-portfolio-row" data-do-wallet-l1-key="' + escapeHTML(group.key) + '">',
      '  <span class="do-wallet-l1-portfolio-left">',
      renderIcon(group.icon, group.nativeSymbol, "do-wallet-l1-portfolio-icon"),
      '    <span class="do-wallet-l1-portfolio-meta">',
      '      <strong>' + escapeHTML(group.name) + "</strong>",
      '      <small>' + escapeHTML(count) + "</small>",
      "    </span>",
      "  </span>",
      '  <span class="do-wallet-l1-portfolio-right">',
      '    <strong>' + escapeHTML(group.totalValueText) + "</strong>",
      '    <small>' + escapeHTML(group.nativeSymbol) + "</small>",
      "  </span>",
      "</button>"
    ].join("");
  }

  function assetRowHTML(asset, group) {
    var change = clean(asset.changeText);
    var changeClass = change.indexOf("-") >= 0 ? "negative" : "positive";
    var amount = clean(asset.amountText);
    if (amount && upper(amount).indexOf(upper(asset.symbol)) < 0) amount += " " + asset.symbol;
    return [
      '<div class="do-wallet-l1-portfolio-coin">',
      '  <span class="do-wallet-l1-portfolio-left">',
      renderIcon(asset.icon || group.icon, asset.symbol, "do-wallet-l1-portfolio-coin-icon"),
      '    <span class="do-wallet-l1-portfolio-meta">',
      '      <strong>' + escapeHTML(asset.symbol) + (asset.priceText ? ' <small>' + escapeHTML(asset.priceText) + "</small>" : "") + "</strong>",
      change ? '      <em class="' + changeClass + '">' + escapeHTML(change) + "</em>" : '      <small>' + escapeHTML(group.name) + "</small>",
      "    </span>",
      "  </span>",
      '  <span class="do-wallet-l1-portfolio-right">',
      '    <strong>' + escapeHTML(asset.valueText || formatUSD(asset.value)) + "</strong>",
      '    <small>' + escapeHTML(amount) + "</small>",
      "  </span>",
      "</div>"
    ].join("");
  }

  function renderList(list, groups) {
    var signature = groupsSignature(groups, "list");
    if (list.getAttribute(SIGNATURE_ATTR) === signature && !list.hasAttribute(DETAIL_ATTR)) return;
    list.removeAttribute(DETAIL_ATTR);
    list.setAttribute(SIGNATURE_ATTR, signature);
    list.innerHTML = [
      '<div class="do-wallet-l1-portfolio-shell">',
      groups.map(groupRowHTML).join(""),
      "</div>"
    ].join("");
  }

  function renderDetail(list, group, groups) {
    var signature = groupsSignature([group], "detail");
    if (list.getAttribute(SIGNATURE_ATTR) === signature && list.getAttribute(DETAIL_ATTR) === group.key) return;
    list.setAttribute(DETAIL_ATTR, group.key);
    list.setAttribute(SIGNATURE_ATTR, signature);
    var count = group.assets.length === 1 ? "1 asset" : group.assets.length + " assets";
    list.innerHTML = [
      '<div class="do-wallet-l1-portfolio-detail">',
      '  <button type="button" class="do-wallet-l1-portfolio-back" data-do-wallet-l1-back="1">Back</button>',
      '  <div class="do-wallet-l1-portfolio-summary">',
      renderIcon(group.icon, group.nativeSymbol, "do-wallet-l1-portfolio-summary-icon"),
      '    <strong>' + escapeHTML(group.name) + "</strong>",
      '    <span>' + escapeHTML(group.totalValueText) + "</span>",
      '    <small>' + escapeHTML(count) + "</small>",
      "  </div>",
      '  <div class="do-wallet-l1-portfolio-coins-title">Coins</div>',
      '  <div class="do-wallet-l1-portfolio-coins">',
      group.assets.map(function (asset) { return assetRowHTML(asset, group); }).join(""),
      "  </div>",
      "</div>"
    ].join("");
  }

  function findAssetLists() {
    return Array.prototype.slice.call(document.querySelectorAll(LIST_SELECTOR)).filter(function (list) {
      if (!isVisible(list)) return false;
      var node = list;
      for (var depth = 0; node && depth < 8; depth += 1) {
        var content = lower(node.textContent || "");
        if (content.indexOf("search for a chain") >= 0 || content.indexOf("receive") === 0) return false;
        if (content.indexOf("portfolio value") >= 0 && content.indexOf("assets") >= 0) return true;
        node = node.parentElement;
      }
      return false;
    });
  }

  function collectAllRows(lists, snapshot, cache) {
    var rows = [];
    var key = walletKey(snapshot);
    rows = rows.concat(collectSnapshotAssets(snapshot));
    lists.forEach(function (list) {
      rows = rows.concat(collectDomAssets(list));
    });
    rows = rows.concat(cacheGroupsToAssets(cache, key));
    return rows;
  }

  function render(reason) {
    if (rendering) return;
    rendering = true;
    try {
      injectStyle();
      var lists = findAssetLists();
      if (!lists.length) {
        setDebug("no-assets-list", { reason: reason });
        return;
      }
      lists.forEach(function (list) {
        list.setAttribute(TARGET_ATTR, "1");
      });
      var snapshot = readJSON(SNAPSHOT_KEY, null);
      var cache = readJSON(CACHE_KEY, null);
      var rows = collectAllRows(lists, snapshot, cache);
      var groups = buildGroups(rows);
      if (!groups.length && cache && Array.isArray(cache.groups)) {
        groups = buildGroups(cacheGroupsToAssets(cache, walletKey(snapshot)));
      }
      if (!groups.length) {
        setDebug("no-groups", { reason: reason, rows: rows.length });
        return;
      }
      writeJSON(CACHE_KEY, {
        version: VERSION,
        updatedAt: Date.now(),
        walletKey: walletKey(snapshot),
        groups: serializableGroups(groups)
      });
      lists.forEach(function (list) {
        var group = activeKey && groups.filter(function (item) { return item.key === activeKey; })[0];
        if (group) renderDetail(list, group, groups);
        else renderList(list, groups);
      });
      document.documentElement.setAttribute("data-do-wallet-l1-assets-ready", VERSION);
      setDebug("rendered", {
        reason: reason,
        lists: lists.length,
        groups: groups.length,
        rows: rows.length,
        activeKey: activeKey
      });
    } finally {
      rendering = false;
    }
  }

  function setDebug(reason, details) {
    try {
      window.__doWalletL1PortfolioAssetsDebug = Object.assign({
        version: VERSION,
        checkedAt: new Date().toISOString(),
        state: reason
      }, details || {});
    } catch (error) {}
  }

  function schedule(delay, reason) {
    if (renderTimer) return;
    renderTimer = window.setTimeout(function () {
      renderTimer = null;
      render(reason || "scheduled");
    }, delay == null ? 80 : delay);
  }

  function mutationTouchesAssets(mutations) {
    for (var i = 0; i < mutations.length; i += 1) {
      var nodes = Array.prototype.slice.call(mutations[i].addedNodes || []).concat(Array.prototype.slice.call(mutations[i].removedNodes || []));
      for (var j = 0; j < nodes.length; j += 1) {
        var node = nodes[j];
        if (!node || node.nodeType !== 1) continue;
        if (node.id === STYLE_ID) continue;
        if (node.closest && (node.closest(".do-wallet-l1-portfolio-shell") || node.closest(".do-wallet-l1-portfolio-detail"))) continue;
        if (node.matches && (node.matches(LIST_SELECTOR) || node.matches("[class*='Asset_']"))) return true;
        if (node.querySelector && (node.querySelector(LIST_SELECTOR) || node.querySelector("[class*='Asset_']"))) return true;
        var content = lower(node.textContent || "");
        if (content.indexOf("portfolio value") >= 0 || content.indexOf("assets") >= 0) return true;
      }
    }
    return false;
  }

  function ensureObserver() {
    if (observer || !window.MutationObserver) return;
    try {
      observer = new MutationObserver(function (mutations) {
        if (rendering) return;
        if (mutationTouchesAssets(mutations)) schedule(60, "mutation");
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    } catch (error) {}
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "html{--do-wallet-l1-font-weight:var(--bold,500);}",
      "[" + TARGET_ATTR + "='1']>article{visibility:hidden!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;pointer-events:none!important;}",
      ".do-wallet-l1-portfolio-shell,.do-wallet-l1-portfolio-detail{box-sizing:border-box;width:100%;font-family:inherit;color:#fff;}",
      ".do-wallet-l1-portfolio-shell{display:flex;flex-direction:column;gap:0;}",
      ".do-wallet-l1-portfolio-row{box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;margin:0;padding:10px 10px;border:0;border-bottom:1px solid rgba(135,57,190,.26);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}",
      ".do-wallet-l1-portfolio-row:hover,.do-wallet-l1-portfolio-row:focus-visible{background:rgba(163,60,255,.09);outline:0;}",
      ".do-wallet-l1-portfolio-left{display:flex;align-items:center;gap:12px;min-width:0;flex:1 1 auto;}",
      ".do-wallet-l1-portfolio-right{display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:84px;max-width:45%;text-align:right;white-space:nowrap;}",
      ".do-wallet-l1-portfolio-icon,.do-wallet-l1-portfolio-coin-icon,.do-wallet-l1-portfolio-summary-icon{display:block;flex:0 0 auto;border-radius:50%;object-fit:cover;background:#2c2140;}",
      ".do-wallet-l1-portfolio-icon{width:34px;height:34px;}",
      ".do-wallet-l1-portfolio-coin-icon{width:30px;height:30px;}",
      ".do-wallet-l1-portfolio-summary-icon{width:58px;height:58px;}",
      ".do-wallet-l1-portfolio-fallback{display:grid;place-items:center;color:#fff;font-size:10px;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-meta{display:flex;flex-direction:column;gap:5px;min-width:0;}",
      ".do-wallet-l1-portfolio-meta strong,.do-wallet-l1-portfolio-right strong{font-weight:var(--do-wallet-l1-font-weight);line-height:1.08;letter-spacing:0;}",
      ".do-wallet-l1-portfolio-meta strong{font-size:15px;white-space:normal;overflow:hidden;text-overflow:ellipsis;}",
      ".do-wallet-l1-portfolio-meta strong small{font-size:11px;color:#b9aed8;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-meta small,.do-wallet-l1-portfolio-meta em,.do-wallet-l1-portfolio-right small{font-size:12px;line-height:1.1;font-style:normal;font-weight:var(--do-wallet-l1-font-weight);color:#c7baf0;}",
      ".do-wallet-l1-portfolio-meta em.negative{color:#ff4b55;}",
      ".do-wallet-l1-portfolio-meta em.positive{color:#00c68f;}",
      ".do-wallet-l1-portfolio-right strong{font-size:14px;overflow:hidden;text-overflow:ellipsis;max-width:100%;}",
      ".do-wallet-l1-portfolio-detail{min-height:440px;padding:0 0 16px;}",
      ".do-wallet-l1-portfolio-back{display:inline-flex;align-items:center;margin:0 0 14px;padding:8px 2px;border:0;background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:var(--do-wallet-l1-font-weight);cursor:pointer;}",
      ".do-wallet-l1-portfolio-back:before{content:'<';display:inline-block;margin-right:10px;font-size:18px;line-height:1;}",
      ".do-wallet-l1-portfolio-summary{display:flex;flex-direction:column;align-items:center;text-align:center;gap:7px;padding:4px 8px 22px;border-bottom:1px solid rgba(135,57,190,.26);}",
      ".do-wallet-l1-portfolio-summary strong{font-size:17px;line-height:1.12;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-summary span{font-size:22px;line-height:1.05;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-summary small{font-size:12px;color:#c7baf0;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-coins-title{padding:18px 10px 8px;font-size:14px;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-coins{display:flex;flex-direction:column;}",
      ".do-wallet-l1-portfolio-coin{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:10px;border-bottom:1px solid rgba(135,57,190,.24);}",
      "@media(max-width:760px){.do-wallet-l1-portfolio-row,.do-wallet-l1-portfolio-coin{padding-left:8px;padding-right:8px}.do-wallet-l1-portfolio-right{min-width:76px}.do-wallet-l1-portfolio-meta strong{font-size:14px}.do-wallet-l1-portfolio-right strong{font-size:13px}.do-wallet-l1-portfolio-summary-icon{width:52px;height:52px}}"
    ].join("\n");
    document.head.appendChild(style);
    try {
      document.documentElement.setAttribute("data-do-wallet-l1-assets-owner", VERSION);
    } catch (error) {}
  }

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest && event.target.closest("[data-do-wallet-l1-key],[data-do-wallet-l1-back]");
    if (!target) return;
    if (target.hasAttribute("data-do-wallet-l1-back")) {
      event.preventDefault();
      event.stopPropagation();
      activeKey = "";
      schedule(0, "back");
      return;
    }
    var key = target.getAttribute("data-do-wallet-l1-key");
    if (!key) return;
    event.preventDefault();
    event.stopPropagation();
    activeKey = key;
    schedule(0, "open-detail");
  }, true);

  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY || event.key === CACHE_KEY) schedule(40, "storage");
  });
  window.addEventListener("do_wallet_portfolio_snapshot", function () { schedule(40, "snapshot"); });
  window.addEventListener("load", function () { schedule(20, "load"); });
  ensureObserver();
  render("install");
  schedule(20, "post-install");
  schedule(400, "settle");
  schedule(1200, "late-settle");
})();
