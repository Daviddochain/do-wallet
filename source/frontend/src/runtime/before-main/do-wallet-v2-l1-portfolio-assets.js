(function () {
  "use strict";

  if (window.__doWalletL1PortfolioAssetsStable20260625) return;
  window.__doWalletL1PortfolioAssetsStable20260625 = true;
  window.__doWalletL1PortfolioOwnsAssets = true;

  var VERSION = "20260625L1PortfolioStable2";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var STYLE_ID = "do-wallet-l1-portfolio-assets-style";
  var LIST_SELECTOR = "[class*='AssetList_assetlist__list']";
  var HOST_ATTR = "data-do-wallet-l1-assets-host";
  var PANE_ATTR = "data-do-wallet-l1-assets-pane";
  var NATIVE_HIDDEN_ATTR = "data-do-wallet-l1-native-hidden";
  var TARGET_ATTR = "data-do-wallet-l1-assets-target";
  var SIGNATURE_ATTR = "data-do-wallet-l1-assets-signature";
  var DETAIL_ATTR = "data-do-wallet-l1-assets-detail";
  var activeKey = "";
  var renderTimer = null;
  var rendering = false;

  var FLAT_KEYS = [
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
    "detailPortfolioAssets",
    "staking"
  ];

  var GROUP_KEYS = [
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
  ];

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
    "mars-1": ["Mars", "MARS", "/img/chains/Mars.png", 300],
    "migaloo-1": ["Migaloo", "WHALE", "/img/chains/Migaloo.png", 310],
    "pacific-1": ["Sei", "SEI", "/img/chains/Sei.png", 320],
    "stride-1": ["Stride", "STRD", "/img/chains/Stride.png", 330],
    "stafihub-1": ["StaFi Hub", "FIS", "/img/chains/Stafihub.png", 340]
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

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

  function numberFrom(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    var match = text(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) || 0 : 0;
  }

  function firstArray(value, keys) {
    for (var index = 0; index < keys.length; index += 1) {
      if (Array.isArray(value && value[keys[index]])) return value[keys[index]];
    }
    return [];
  }

  function symbolOf(asset) {
    var symbol = clean(asset && (asset.symbol || asset.tokenSymbol || asset.ticker || asset.name || asset.denom || asset.token));
    symbol = upper(symbol);
    if (symbol === "USTC") return "UST";
    return symbol;
  }

  function chainIdOf(asset) {
    return clean(asset && (asset.chainID || asset.chainId || asset.network || asset.chain || asset.chainKey));
  }

  function chainNameOf(asset) {
    return clean(asset && (asset.chainName || asset.networkName || asset.chainLabel || asset.chain || asset.network));
  }

  function denomOf(asset) {
    return clean(asset && (asset.denom || asset.token || asset.contract || asset.baseAsset || asset.id || asset.symbol));
  }

  function categoryOf(asset) {
    return lower(asset && (asset.category || asset.type || "wallet")) || "wallet";
  }

  function iconOf(asset) {
    return clean(asset && (asset.icon || asset.image || asset.logo || asset.logoURI || asset.logoUrl || asset.tokenIcon || asset.chainIcon));
  }

  function canonicalChain(rawID, rawName, symbol, denom) {
    var id = lower(rawID);
    var name = lower(rawName);
    var sym = upper(symbol);
    var den = lower(denom);
    if (id === "do-chain" || id === "dochain-1" || id === "do" || id === "888" || id.indexOf("dochain") >= 0 || name.indexOf("do chain") >= 0 || den === "udo" || sym === "DO") return "Do-Chain";
    if (id === "columbus-5" || id === "terra-classic" || id === "lunc" || id === "330" || name.indexOf("terra classic") >= 0 || TERRA_CLASSIC_DENOMS[den] || den.indexOf("terra1") === 0 || (TERRA_CLASSIC_SYMBOLS[sym] && id !== "phoenix-1" && id !== "osmosis-1")) return "columbus-5";
    if (id === "phoenix-1" || (sym === "LUNA" && name.indexOf("terra classic") < 0) || name.indexOf("terra (luna)") >= 0) return "phoenix-1";
    if (id === "osmosis-1" || id === "osmosis" || id === "osmo" || sym === "OSMO" || name.indexOf("osmosis") >= 0) return "osmosis-1";
    if (id.indexOf("bitcoin") >= 0 || id === "btc" || sym === "BTC") return "bitcoin-mainnet";
    if (id.indexOf("ethereum") >= 0 || id === "eth" || id === "eip155:1" || (sym === "ETH" && name.indexOf("arbitrum") < 0 && name.indexOf("base") < 0)) return "ethereum-mainnet";
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
    if (id.indexOf("migaloo") >= 0 || sym === "WHALE" || name.indexOf("migaloo") >= 0) return "migaloo-1";
    if (id.indexOf("sei") >= 0 || sym === "SEI" || name.indexOf("sei") >= 0) return "pacific-1";
    if (id.indexOf("stride") >= 0 || sym === "STRD" || name.indexOf("stride") >= 0) return "stride-1";
    if (id.indexOf("stafi") >= 0 || sym === "FIS" || name.indexOf("stafi") >= 0) return "stafihub-1";
    return rawID || rawName || sym || den;
  }

  function metaFor(asset) {
    var key = canonicalChain(chainIdOf(asset), chainNameOf(asset), symbolOf(asset), denomOf(asset));
    var tuple = CHAIN_META[key];
    if (tuple) {
      return { key: key, name: tuple[0], nativeSymbol: tuple[1], icon: tuple[2], priority: tuple[3] || 999 };
    }
    var symbol = symbolOf(asset);
    var name = chainNameOf(asset) || key || symbol;
    return {
      key: key || symbol,
      name: name,
      nativeSymbol: symbol || upper(name).slice(0, 8),
      icon: iconOf(asset),
      priority: 999
    };
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

  function valueText(asset, fallback) {
    var value = clean(asset && (asset.valueText || asset.usdValueText || asset.fiatValueText || asset.valueFormatted));
    if (value && value !== "$-" && value !== "$0") return value;
    return formatUSD(fallback != null ? fallback : valueNumber(asset));
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
    return (number > 0 ? "+" : "") + number.toFixed(2) + "%";
  }

  function amountText(asset, symbol) {
    var value = clean(asset && (asset.displayAmount || asset.amountText || asset.balanceText || asset.quantityText));
    if (value) return value;
    var number = amountNumber(asset);
    if (!Number.isFinite(number) || number <= 0) return "";
    var digits = number >= 100 ? 2 : number >= 1 ? 4 : 8;
    return number.toLocaleString(undefined, { maximumFractionDigits: digits }) + (symbol ? " " + symbol : "");
  }

  function childrenOf(asset) {
    return firstArray(asset, ["childAssets", "expandedAssets", "subAssets", "tokens", "children"]);
  }

  function displayNameFor(asset, symbol, category) {
    var name = clean(asset && (asset.displayName || asset.name || asset.label)) || symbol;
    if (/^(staking|staked)$/i.test(category) && !/^staked\b/i.test(name)) return "Staked " + symbol;
    if (/^(reward|rewards)$/i.test(category) && !/^rewards?\b/i.test(name)) return "Rewards " + symbol;
    if (/^unbonding$/i.test(category) && !/^unbonding\b/i.test(name)) return "Unbonding " + symbol;
    return name;
  }

  function normalizeAsset(asset, source, index) {
    var symbol = symbolOf(asset);
    var meta = metaFor(asset);
    var category = categoryOf(asset);
    var value = valueNumber(asset);
    return {
      source: source || "snapshot",
      index: Number(index) || 0,
      symbol: symbol,
      name: displayNameFor(asset, symbol, category),
      chainID: meta.key,
      chainName: meta.name,
      nativeSymbol: meta.nativeSymbol,
      denom: denomOf(asset) || symbol,
      category: category,
      icon: iconOf(asset) || meta.icon,
      chainIcon: clean(asset && asset.chainIcon) || meta.icon,
      amount: amountNumber(asset),
      amountText: amountText(asset, symbol),
      value: value,
      valueText: valueText(asset, value),
      priceText: priceText(asset),
      changeText: percentText(asset),
      raw: asset
    };
  }

  function isDisplayable(asset) {
    if (!asset || !asset.symbol || /^[0-9.]+$/.test(asset.symbol)) return false;
    if (asset.value > 0 || asset.amount > 0) return true;
    if (asset.valueText && asset.valueText !== "$-" && asset.valueText !== "$0") return true;
    if (asset.amountText) return true;
    if (asset.symbol === "DO" && asset.chainID === "Do-Chain") return true;
    return false;
  }

  function snapshotKeys(snapshot) {
    var keys = [];
    function add(value) {
      value = lower(value);
      if (value && keys.indexOf(value) < 0) keys.push(value);
    }
    if (!isObject(snapshot)) return keys;
    add(snapshot.walletKey);
    var wallet = isObject(snapshot.wallet) ? snapshot.wallet : {};
    add(wallet.id);
    add(wallet.name);
    add(wallet.walletName);
    add(wallet.address);
    [snapshot.addresses, snapshot.activeAddresses, snapshot.allAddresses, wallet.addresses, wallet.addressMap].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) { add(key + ":" + map[key]); add(map[key]); });
    });
    return keys;
  }

  function snapshotsRelated(left, right) {
    var leftKeys = snapshotKeys(left);
    var rightKeys = snapshotKeys(right);
    if (!leftKeys.length || !rightKeys.length) return false;
    return leftKeys.some(function (key) { return rightKeys.indexOf(key) >= 0; });
  }

  function collectSnapshots() {
    var current = readJSON(SNAPSHOT_KEY, null);
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    var snapshots = [];
    var seen = {};
    function add(snapshot) {
      if (!isObject(snapshot)) return;
      var key = clean(snapshot.updatedAt || "") + ":" + snapshotKeys(snapshot).join("|");
      if (seen[key]) return;
      seen[key] = true;
      snapshots.push(snapshot);
    }
    add(current);
    if (isObject(byWallet)) {
      Object.keys(byWallet).forEach(function (key) {
        var snapshot = byWallet[key];
        if (!isObject(current) || snapshotsRelated(current, snapshot)) add(snapshot);
      });
    }
    return snapshots;
  }

  function collectAssetsFromSnapshot(snapshot) {
    var rows = [];
    var order = 0;
    function addAsset(asset, source) {
      if (!isObject(asset)) return;
      var kids = childrenOf(asset);
      if (kids.length) {
        kids.forEach(function (child) { addAsset(child, source + "-child"); });
        if (asset.isChainGroup || asset.portfolioGroup || asset.groupedUnderChain) return;
      }
      var normalized = normalizeAsset(asset, source, order += 1);
      if (isDisplayable(normalized)) rows.push(normalized);
    }
    FLAT_KEYS.forEach(function (key) {
      if (!Array.isArray(snapshot && snapshot[key])) return;
      snapshot[key].forEach(function (asset) { addAsset(asset, key); });
    });
    GROUP_KEYS.forEach(function (key) {
      if (!Array.isArray(snapshot && snapshot[key])) return;
      snapshot[key].forEach(function (asset) { addAsset(asset, key); });
    });
    return rows;
  }

  function assetIdentity(asset) {
    return [
      asset.chainID,
      asset.category,
      lower(asset.denom || asset.symbol),
      asset.symbol,
      lower(asset.name)
    ].join("|");
  }

  function betterAsset(left, right) {
    if (!left) return right;
    if (!right) return left;
    if ((right.valueText && right.valueText !== "$-") !== (left.valueText && left.valueText !== "$-")) return right.valueText && right.valueText !== "$-" ? right : left;
    if ((right.amountText && right.amountText.length) !== (left.amountText && left.amountText.length)) return right.amountText ? right : left;
    if (right.value !== left.value) return right.value > left.value ? right : left;
    return right.index < left.index ? right : left;
  }

  function categoryRank(category) {
    if (category === "wallet" || category === "asset" || category === "balance" || category === "spendable") return 0;
    if (category === "staking" || category === "staked") return 1;
    if (category === "reward" || category === "rewards") return 2;
    if (category === "unbonding") return 3;
    return 4;
  }

  function buildGroups() {
    var groups = {};
    collectSnapshots().forEach(function (snapshot) {
      collectAssetsFromSnapshot(snapshot).forEach(function (asset) {
        var meta = metaFor(asset);
        if (!meta.key) return;
        if (!groups[meta.key]) {
          groups[meta.key] = {
            key: meta.key,
            name: meta.name,
            nativeSymbol: meta.nativeSymbol,
            icon: asset.chainIcon || meta.icon || asset.icon,
            priority: meta.priority,
            assetsByKey: {},
            firstIndex: asset.index
          };
        }
        var group = groups[meta.key];
        group.firstIndex = Math.min(group.firstIndex, asset.index);
        if (!group.icon && (asset.chainIcon || asset.icon)) group.icon = asset.chainIcon || asset.icon;
        var key = assetIdentity(asset);
        group.assetsByKey[key] = betterAsset(group.assetsByKey[key], asset);
      });
    });

    return Object.keys(groups).map(function (key) {
      var group = groups[key];
      var assets = Object.keys(group.assetsByKey).map(function (assetKey) {
        return group.assetsByKey[assetKey];
      }).sort(function (a, b) {
        var an = upper(a.symbol) === upper(group.nativeSymbol) ? -1 : 0;
        var bn = upper(b.symbol) === upper(group.nativeSymbol) ? -1 : 0;
        return (an - bn) ||
          (categoryRank(a.category) - categoryRank(b.category)) ||
          (b.value - a.value) ||
          upper(a.symbol).localeCompare(upper(b.symbol)) ||
          a.name.localeCompare(b.name);
      });
      var total = assets.reduce(function (sum, asset) {
        return sum + (Number(asset.value) || 0);
      }, 0);
      return {
        key: group.key,
        name: group.name,
        nativeSymbol: group.nativeSymbol,
        icon: group.icon,
        priority: group.priority,
        firstIndex: group.firstIndex,
        assets: assets,
        totalValue: total,
        totalValueText: formatUSD(total),
        signature: assets.map(function (asset) {
          return [asset.chainID, asset.category, asset.symbol, asset.denom, asset.amountText, asset.valueText, asset.priceText, asset.changeText].join(":");
        }).join("|")
      };
    }).filter(function (group) {
      return group.assets.length > 0;
    }).sort(function (a, b) {
      var aHasValue = a.totalValue > 0 ? 0 : 1;
      var bHasValue = b.totalValue > 0 ? 0 : 1;
      return (aHasValue - bHasValue) || (a.priority - b.priority) || (a.firstIndex - b.firstIndex) || a.name.localeCompare(b.name);
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
    if (!src) return fallbackIcon(label, className, false);
    return "<img class=\"" + className + "\" src=\"" + escapeHTML(src) + "\" alt=\"\" loading=\"eager\" decoding=\"async\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='grid';\" />" + fallbackIcon(label, className, true);
  }

  function nativeAssetForGroup(group) {
    var native = upper(group && group.nativeSymbol);
    var assets = Array.isArray(group && group.assets) ? group.assets : [];
    return assets.filter(function (asset) {
      return upper(asset.symbol) === native;
    })[0] || assets[0] || null;
  }

  function groupRowHTML(group) {
    var count = group.assets.length === 1 ? "1 asset" : group.assets.length + " assets";
    var native = nativeAssetForGroup(group) || {};
    var label = clean(native.symbol) || clean(group.nativeSymbol) || clean(group.name);
    var price = clean(native.priceText);
    var change = clean(native.changeText);
    var changeClass = change.indexOf("-") >= 0 ? "negative" : "positive";
    var amount = clean(native.amountText);
    if (amount && upper(amount).indexOf(upper(label)) < 0) amount += " " + label;
    return [
      '<button type="button" class="do-wallet-l1-portfolio-row" data-do-wallet-l1-key="' + escapeHTML(group.key) + '">',
      '  <span class="do-wallet-l1-portfolio-left">',
      renderIcon(group.icon, group.nativeSymbol, "do-wallet-l1-portfolio-icon"),
      '    <span class="do-wallet-l1-portfolio-meta"><strong>' + escapeHTML(label) + (price ? ' <small>' + escapeHTML(price) + "</small>" : "") + "</strong>" + (change ? '<em class="' + changeClass + '">' + escapeHTML(change) + "</em>" : "<small>" + escapeHTML(count) + "</small>") + "</span>",
      "  </span>",
      '  <span class="do-wallet-l1-portfolio-right"><strong>' + escapeHTML(group.totalValueText) + "</strong><small>" + escapeHTML(amount || count) + "</small></span>",
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
      '      <strong>' + escapeHTML(asset.name || asset.symbol) + (asset.priceText ? ' <small>' + escapeHTML(asset.priceText) + "</small>" : "") + "</strong>",
      change ? '      <em class="' + changeClass + '">' + escapeHTML(change) + "</em>" : '      <small>' + escapeHTML(asset.symbol) + "</small>",
      "    </span>",
      "  </span>",
      '  <span class="do-wallet-l1-portfolio-right"><strong>' + escapeHTML(asset.valueText || formatUSD(asset.value)) + "</strong><small>" + escapeHTML(amount) + "</small></span>",
      "</div>"
    ].join("");
  }

  function renderList(list, groups) {
    var signature = groupsSignature(groups, "list");
    if (list.getAttribute(SIGNATURE_ATTR) === signature && !list.hasAttribute(DETAIL_ATTR)) return;
    list.removeAttribute(DETAIL_ATTR);
    list.setAttribute(TARGET_ATTR, "1");
    list.setAttribute(SIGNATURE_ATTR, signature);
    list.innerHTML = '<div class="do-wallet-l1-portfolio-shell">' + groups.map(groupRowHTML).join("") + "</div>";
  }

  function renderDetail(list, group) {
    var signature = groupsSignature([group], "detail");
    if (list.getAttribute(SIGNATURE_ATTR) === signature && list.getAttribute(DETAIL_ATTR) === group.key) return;
    var count = group.assets.length === 1 ? "1 asset" : group.assets.length + " assets";
    list.setAttribute(TARGET_ATTR, "1");
    list.setAttribute(DETAIL_ATTR, group.key);
    list.setAttribute(SIGNATURE_ATTR, signature);
    list.innerHTML = [
      '<div class="do-wallet-l1-portfolio-detail">',
      '  <button type="button" class="do-wallet-l1-portfolio-back" data-do-wallet-l1-back="1">Back</button>',
      '  <div class="do-wallet-l1-portfolio-chain-head">',
      '    <span class="do-wallet-l1-portfolio-left">',
      renderIcon(group.icon, group.nativeSymbol, "do-wallet-l1-portfolio-icon"),
      '      <span class="do-wallet-l1-portfolio-meta"><strong>' + escapeHTML(group.name) + "</strong><small>" + escapeHTML(count) + "</small></span>",
      "    </span>",
      '    <span class="do-wallet-l1-portfolio-right"><strong>' + escapeHTML(group.totalValueText) + "</strong><small>" + escapeHTML(group.nativeSymbol) + "</small></span>",
      "  </div>",
      '  <div class="do-wallet-l1-portfolio-coins-title">Coins</div>',
      '  <div class="do-wallet-l1-portfolio-coins">',
      group.assets.map(function (asset) { return assetRowHTML(asset, group); }).join(""),
      "  </div>",
      "</div>"
    ].join("");
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

  function visibleRect(node) {
    if (!isVisible(node)) return null;
    return node.getBoundingClientRect();
  }

  function nodeText(node) {
    return clean(node && (node.innerText || node.textContent || ""));
  }

  function findRightWalletPane() {
    var viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var nodes = Array.prototype.slice.call(document.querySelectorAll("aside,section,article,div"));
    var best = null;
    nodes.forEach(function (node) {
      if (!node || node.hasAttribute && node.hasAttribute(HOST_ATTR)) return;
      var rect = visibleRect(node);
      if (!rect || rect.width < 260 || rect.height < 360) return;
      if (viewportWidth && rect.left < viewportWidth * 0.45 && rect.width < viewportWidth * 0.72) return;
      var value = nodeText(node);
      if (!/\bPortfolio value\b/i.test(value) || !/\bAssets\b/i.test(value)) return;
      if (!/\bSend\b/i.test(value) || !/\bReceive\b/i.test(value)) return;
      if (/\bMarkets\b/i.test(value) && rect.width > viewportWidth * 0.6) return;
      var score = rect.left * 100000 + Math.min(rect.width * rect.height, 500000);
      if (!best || score > best.score) best = { node: node, score: score };
    });
    if (best && best.node) best.node.setAttribute(PANE_ATTR, "1");
    return best && best.node || null;
  }

  function isAssetsHeaderNode(node) {
    if (!node || node.hasAttribute && node.hasAttribute(HOST_ATTR)) return false;
    return /^Assets$/i.test(nodeText(node));
  }

  function findAssetsHeader(pane) {
    if (!pane) return null;
    var nodes = Array.prototype.slice.call(pane.querySelectorAll("h1,h2,h3,h4,strong,span,div,p"));
    return nodes.filter(isAssetsHeaderNode).sort(function (a, b) {
      return (visibleRect(a) || { top: 99999 }).top - (visibleRect(b) || { top: 99999 }).top;
    })[0] || null;
  }

  function headerRowFor(header, pane) {
    var row = header;
    for (var depth = 0; row && row !== pane && depth < 6; depth += 1) {
      var rect = visibleRect(row);
      var value = nodeText(row);
      if (rect && rect.width >= 160 && rect.height <= 96 && /\bAssets\b/i.test(value)) return row;
      row = row.parentElement;
    }
    return header.parentElement || header;
  }

  function hideNativeAssetSiblings(host) {
    if (!host || !host.parentElement) return;
    var node = host.nextElementSibling;
    while (node) {
      if (!node.hasAttribute || !node.hasAttribute(HOST_ATTR)) {
        node.setAttribute(NATIVE_HIDDEN_ATTR, "1");
      }
      node = node.nextElementSibling;
    }
  }

  function ensureOwnedAssetHost() {
    var pane = findRightWalletPane();
    if (!pane) return null;
    var existing = pane.querySelector("[" + HOST_ATTR + "='1']");
    if (existing && document.documentElement.contains(existing)) {
      hideNativeAssetSiblings(existing);
      return existing;
    }

    var list = Array.prototype.slice.call(pane.querySelectorAll(LIST_SELECTOR)).filter(isVisible)[0];
    if (list) {
      list.setAttribute(HOST_ATTR, "1");
      return list;
    }

    var header = findAssetsHeader(pane);
    if (!header) return null;
    var row = headerRowFor(header, pane);
    var host = document.createElement("div");
    host.setAttribute(HOST_ATTR, "1");
    host.className = "do-wallet-l1-portfolio-owned-host";
    if (row && row.parentElement) row.parentElement.insertBefore(host, row.nextSibling);
    else pane.appendChild(host);
    hideNativeAssetSiblings(host);
    return host;
  }

  function findAssetLists() {
    var lists = Array.prototype.slice.call(document.querySelectorAll(LIST_SELECTOR)).filter(function (list) {
      if (!isVisible(list)) return false;
      var node = list;
      for (var depth = 0; node && depth < 14; depth += 1) {
        var content = lower(node.textContent || "");
        if (content.indexOf("search for a chain") >= 0 || content.indexOf("receive") === 0) return false;
        if (content.indexOf("portfolio value") >= 0 && content.indexOf("assets") >= 0) return true;
        node = node.parentElement;
      }
      return false;
    });
    var owned = ensureOwnedAssetHost();
    if (owned && lists.indexOf(owned) < 0) lists.unshift(owned);
    return lists;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "html{--do-wallet-l1-font-weight:var(--bold,500);}",
      "[" + NATIVE_HIDDEN_ATTR + "='1']{display:none!important;}",
      "[" + TARGET_ATTR + "='1']>article{display:none!important;}",
      "[" + HOST_ATTR + "='1'],.do-wallet-l1-portfolio-owned-host{box-sizing:border-box;width:100%;}",
      ".do-wallet-l1-portfolio-shell,.do-wallet-l1-portfolio-detail{box-sizing:border-box;width:100%;font-family:inherit;color:#fff;}",
      ".do-wallet-l1-portfolio-shell,.do-wallet-l1-portfolio-coins{display:flex;flex-direction:column;gap:0;}",
      ".do-wallet-l1-portfolio-row,.do-wallet-l1-portfolio-coin,.do-wallet-l1-portfolio-chain-head{box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;margin:0;padding:10px;border:0;border-bottom:1px solid rgba(135,57,190,.26);background:transparent;color:inherit;font:inherit;text-align:left;}",
      ".do-wallet-l1-portfolio-row{cursor:pointer;}",
      ".do-wallet-l1-portfolio-row:hover,.do-wallet-l1-portfolio-row:focus-visible{background:rgba(163,60,255,.09);outline:0;}",
      ".do-wallet-l1-portfolio-left{display:flex;align-items:center;gap:12px;min-width:0;flex:1 1 auto;}",
      ".do-wallet-l1-portfolio-right{display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:84px;max-width:45%;text-align:right;white-space:nowrap;}",
      ".do-wallet-l1-portfolio-icon,.do-wallet-l1-portfolio-coin-icon{display:block;flex:0 0 auto;border-radius:50%;object-fit:cover;background:#2c2140;}",
      ".do-wallet-l1-portfolio-icon{width:34px;height:34px;}",
      ".do-wallet-l1-portfolio-coin-icon{width:30px;height:30px;}",
      ".do-wallet-l1-portfolio-fallback{display:grid;place-items:center;color:#fff;font-size:10px;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-meta{display:flex;flex-direction:column;gap:5px;min-width:0;}",
      ".do-wallet-l1-portfolio-meta strong,.do-wallet-l1-portfolio-right strong{font-weight:var(--do-wallet-l1-font-weight);line-height:1.08;letter-spacing:0;}",
      ".do-wallet-l1-portfolio-meta strong{font-size:15px;white-space:normal;overflow:hidden;text-overflow:ellipsis;}",
      ".do-wallet-l1-portfolio-meta strong small{font-size:11px;color:#b9aed8;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-meta small,.do-wallet-l1-portfolio-meta em,.do-wallet-l1-portfolio-right small{font-size:12px;line-height:1.1;font-style:normal;font-weight:var(--do-wallet-l1-font-weight);color:#c7baf0;}",
      ".do-wallet-l1-portfolio-meta em.negative{color:#ff4b55;}",
      ".do-wallet-l1-portfolio-meta em.positive{color:#00c68f;}",
      ".do-wallet-l1-portfolio-right strong{font-size:14px;overflow:hidden;text-overflow:ellipsis;max-width:100%;}",
      ".do-wallet-l1-portfolio-detail{min-height:360px;padding:0 0 16px;}",
      ".do-wallet-l1-portfolio-back{display:inline-flex;align-items:center;margin:0 0 8px;padding:8px 2px;border:0;background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:var(--do-wallet-l1-font-weight);cursor:pointer;}",
      ".do-wallet-l1-portfolio-back:before{content:'<';display:inline-block;margin-right:10px;font-size:18px;line-height:1;}",
      ".do-wallet-l1-portfolio-chain-head{background:rgba(163,60,255,.06);border-top:1px solid rgba(135,57,190,.18);}",
      ".do-wallet-l1-portfolio-coins-title{padding:18px 10px 8px;font-size:14px;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-coin{min-height:58px;}",
      "@media(max-width:760px){.do-wallet-l1-portfolio-row,.do-wallet-l1-portfolio-coin,.do-wallet-l1-portfolio-chain-head{padding-left:8px;padding-right:8px}.do-wallet-l1-portfolio-right{min-width:76px}.do-wallet-l1-portfolio-meta strong{font-size:14px}.do-wallet-l1-portfolio-right strong{font-size:13px}}"
    ].join("\n");
    head.appendChild(style);
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

  function render(reason) {
    if (rendering) return;
    rendering = true;
    try {
      injectStyle();
      var groups = buildGroups();
      if (!groups.length) {
        setDebug("no-groups", { reason: reason });
        return;
      }
      var lists = findAssetLists();
      if (!lists.length) {
        setDebug("no-assets-list", { reason: reason });
        return;
      }
      lists.forEach(function (list) {
        var group = activeKey && groups.filter(function (item) { return item.key === activeKey; })[0];
        if (activeKey && !group) activeKey = "";
        if (group) renderDetail(list, group);
        else renderList(list, groups);
      });
      document.documentElement.setAttribute("data-do-wallet-l1-assets-ready", VERSION);
      setDebug("rendered", {
        reason: reason,
        lists: lists.length,
        groups: groups.length,
        rows: groups.reduce(function (sum, group) { return sum + group.assets.length; }, 0),
        activeKey: activeKey
      });
    } finally {
      rendering = false;
    }
  }

  function schedule(delay, reason) {
    if (renderTimer) return;
    renderTimer = window.setTimeout(function () {
      renderTimer = null;
      render(reason || "scheduled");
    }, delay == null ? 0 : delay);
  }

  function mutationTouchesPortfolio(mutations) {
    for (var i = 0; i < mutations.length; i += 1) {
      var nodes = Array.prototype.slice.call(mutations[i].addedNodes || []).concat(Array.prototype.slice.call(mutations[i].removedNodes || []));
      for (var j = 0; j < nodes.length; j += 1) {
        var node = nodes[j];
        if (!node || node.nodeType !== 1) continue;
        if (node.id === STYLE_ID) continue;
        if (node.closest && (node.closest(".do-wallet-l1-portfolio-shell") || node.closest(".do-wallet-l1-portfolio-detail"))) continue;
        if (node.matches && node.matches(LIST_SELECTOR)) return true;
        if (node.querySelector && node.querySelector(LIST_SELECTOR)) return true;
        var content = lower(node.textContent || "");
        if (content.indexOf("portfolio value") >= 0 && content.indexOf("assets") >= 0) return true;
      }
    }
    return false;
  }

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest && event.target.closest("[data-do-wallet-l1-key],[data-do-wallet-l1-back]");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    if (target.hasAttribute("data-do-wallet-l1-back")) activeKey = "";
    else activeKey = target.getAttribute("data-do-wallet-l1-key") || "";
    schedule(0, target.hasAttribute("data-do-wallet-l1-back") ? "back" : "open-detail");
  }, true);

  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY || event.key === SNAPSHOTS_BY_WALLET_KEY) schedule(0, "storage");
  });
  window.addEventListener("do_wallet_portfolio_snapshot", function () { schedule(0, "snapshot"); });
  window.addEventListener("load", function () { schedule(0, "load"); });

  try {
    var observer = new MutationObserver(function (mutations) {
      if (!rendering && mutationTouchesPortfolio(mutations || [])) schedule(0, "mutation");
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { schedule(0, "dom-ready"); }, { once: true });
  }
  schedule(0, "install");
})();
