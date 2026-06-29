(function () {
  "use strict";

  if (window.__doWalletStakeOverview20260627) return;
  window.__doWalletStakeOverview20260627 = true;

  var VERSION = "20260629-stake-overview-scroll-1";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var STYLE_ID = "do-wallet-stake-overview-style";
  var PAGE_ATTR = "data-do-wallet-stake-overview-page";
  var CARD_ATTR = "data-do-wallet-stake-overview";
  var SIGNATURE_ATTR = "data-do-wallet-stake-overview-signature";
  var RENDER_DELAY_MS = 140;
  var renderTimer = 0;
  var selectedChain = "all";
  var directStakeRows = [];
  var directStakeFetchKey = "";
  var directStakeFetching = false;

  var CHAIN_META = {
    "Do-Chain": { name: "Do Chain", symbol: "DO", denom: "udo", icon: "/do-logo.jpg", price: 1.273e-9 },
    "columbus-5": { name: "Terra Classic (LUNC)", symbol: "LUNC", denom: "uluna", icon: "/img/chains/TerraClassic.svg" },
    "osmosis-1": { name: "Osmosis", symbol: "OSMO", denom: "uosmo", icon: "/img/chains/Osmosis.svg" },
    "phoenix-1": { name: "Terra (LUNA)", symbol: "LUNA", denom: "uluna", icon: "/img/chains/Terra.svg" },
    "cosmoshub-4": { name: "Cosmos", symbol: "ATOM", denom: "uatom", icon: "/img/chains/Cosmos.svg" },
    "juno-1": { name: "Juno", symbol: "JUNO", denom: "ujuno", icon: "/img/chains/Juno.svg" },
    "akashnet-2": { name: "Akash", symbol: "AKT", denom: "uakt", icon: "/img/chains/Akash.svg" },
    "secret-4": { name: "Secret Network", symbol: "SCRT", denom: "uscrt", icon: "/img/chains/Secret.png" }
  };

  var CHAIN_ALIASES = {
    "do": "Do-Chain",
    "do-chain": "Do-Chain",
    "dochain": "Do-Chain",
    "dochain-1": "Do-Chain",
    "do-main-1": "Do-Chain",
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
    "terra-luna": "phoenix-1",
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
    "chihuahua": "chihuahua-1",
    "huahua": "chihuahua-1",
    "chihuahua-1": "chihuahua-1",
    "stargaze": "stargaze-1",
    "stars": "stargaze-1",
    "stargaze-1": "stargaze-1",
    "injective": "injective-1",
    "inj": "injective-1",
    "injective-1": "injective-1"
  };

  var DENOM_SYMBOLS = {
    udo: "DO",
    udodx: "DODx",
    uluna: "LUNC",
    uusd: "UST",
    ukrw: "KRT",
    uidr: "IDT",
    umyr: "MYT",
    uthb: "THT",
    ujpy: "JPT",
    uosmo: "OSMO",
    uatom: "ATOM",
    ujuno: "JUNO",
    uakt: "AKT",
    uscrt: "SCRT",
    udgn: "DGN",
    uhuahua: "HUAHUA",
    ustars: "STARS",
    inj: "INJ",
    factory: "TOKEN"
  };

  var CATEGORY_LABELS = {
    staking: "Delegations",
    staked: "Delegations",
    reward: "Staking rewards",
    rewards: "Staking rewards",
    unbonding: "Undelegations"
  };

  var CHART_COLORS = ["#7b95f2", "#ffd84d", "#9d42ff", "#27d3a2", "#ff6a8a", "#35b8ff", "#ff9f1a"];

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function upper(value) {
    return clean(value).toUpperCase();
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

  function numberFrom(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "object") {
      if (value.amount != null) return numberFrom(value.amount);
      if (value.value != null) return numberFrom(value.value);
      if (value.quantity != null) return numberFrom(value.quantity);
      return 0;
    }
    var match = clean(value).replace(/[$,%]/g, "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
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

  function amountFromCoin(coin, decimals) {
    if (!coin || coin.amount == null) return 0;
    if (String(coin.amount).indexOf(".") >= 0) return Number(decimalString(coin.amount, decimals)) || 0;
    return Number(decimalString(coin.amount, decimals)) || 0;
  }

  function amountFromAsset(asset) {
    var direct = numberFrom(asset && (asset.amount || asset.quantity || asset.balance || asset.displayAmount || asset.tokenAmount || asset.amountText));
    if (direct > 0) return direct;
    if (asset && asset.rawAmount != null) return Number(decimalString(asset.rawAmount, decimalsOf(asset))) || 0;
    if (asset && asset.balance && typeof asset.balance === "object") return amountFromCoin(asset.balance, decimalsOf(asset));
    if (asset && asset.amount && typeof asset.amount === "object") return amountFromCoin(asset.amount, decimalsOf(asset));
    return 0;
  }

  function decimalsOf(asset) {
    var decimals = Number(asset && asset.decimals);
    return Number.isFinite(decimals) ? decimals : 6;
  }

  function formatUSD(value) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "$0.00";
    if (value < 0.01) return "< $0.01";
    var digits = value >= 100 ? 2 : value >= 1 ? 4 : 8;
    return "$" + value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function formatToken(value, symbol) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "0 " + symbol;
    var digits = value >= 100 ? 2 : value >= 1 ? 4 : 8;
    return value.toLocaleString(undefined, { maximumFractionDigits: digits }) + " " + symbol;
  }

  function categoryOf(asset) {
    var category = lower(asset && (asset.category || asset.type || asset.assetType || ""));
    var name = lower(asset && asset.name);
    if (!category && /^staked\b/.test(name)) category = "staking";
    if (!category && /^rewards?\b/.test(name)) category = "reward";
    if (!category && /^unbonding\b/.test(name)) category = "unbonding";
    return category || "wallet";
  }

  function denomOf(asset) {
    var direct = lower(asset && (asset.denom || asset.token || asset.baseDenom || asset.tokenDenom || asset.minimalDenom || asset.contract));
    if (DENOM_SYMBOLS[direct]) return direct;
    var id = lower(asset && asset.id);
    var denoms = Object.keys(DENOM_SYMBOLS);
    for (var index = 0; index < denoms.length; index += 1) {
      if (new RegExp("(^|[^a-z0-9])" + denoms[index] + "([^a-z0-9]|$)", "i").test(id)) return denoms[index];
    }
    return direct;
  }

  function chainIDOf(asset) {
    var raw = asset && (asset.chainID || asset.chainId || asset.network || asset.chain || asset.chainKey || asset.chainName || asset.networkName);
    var denom = denomOf(asset);
    if (!raw && denom === "udo") raw = "Do-Chain";
    if (!raw && /\bdo\s+(chain|token)\b/i.test(clean(asset && asset.name))) raw = "Do-Chain";
    return canonicalChainID(raw);
  }

  function chainMeta(chainID) {
    chainID = canonicalChainID(chainID);
    return CHAIN_META[chainID] || { name: chainID || "Unknown chain", symbol: "", denom: "", icon: "" };
  }

  function currentChains() {
    try {
      var service = window.doWalletMultichainAssets;
      var chains = service && typeof service.chains === "function" ? service.chains() : null;
      if (isObject(chains) && Object.keys(chains).length) return chains;
    } catch (error) {}
    var fallback = {};
    Object.keys(CHAIN_META).forEach(function (chainID) {
      fallback[chainID] = {
        chainID: chainID,
        name: CHAIN_META[chainID].name,
        symbol: CHAIN_META[chainID].symbol,
        prefix: chainID === "Do-Chain" ? "do" : "",
        baseAsset: CHAIN_META[chainID].denom,
        icon: CHAIN_META[chainID].icon
      };
    });
    return fallback;
  }

  function requestChainCatalogLoad() {
    try {
      var service = window.doWalletMultichainAssets;
      if (service && typeof service.loadChainCatalog === "function") service.loadChainCatalog();
    } catch (error) {}
  }

  function chainForID(chainID) {
    var chains = currentChains();
    return chains[canonicalChainID(chainID)] || chains[chainID] || null;
  }

  function chainNameFromChain(chainID, chain) {
    return clean(chain && (chain.name || chain.chainName || chain.label)) || chainMeta(chainID).name || chainID;
  }

  function chainIconFromChain(chainID, chain) {
    return clean(chain && (chain.icon || chain.logo || chain.image)) || chainMeta(chainID).icon || "";
  }

  function nativeDenom(chainID, chain) {
    return clean(chain && (chain.baseAsset || chain.denom || chain.token || chain.minimalDenom)) ||
      chainMeta(chainID).denom ||
      "";
  }

  function nativeSymbol(chainID, chain, denom) {
    var symbol = upper(chain && (chain.symbol || chain.tokenSymbol || chain.ticker || ""));
    if (symbol) return symbol === "UDO" ? "DO" : symbol;
    denom = lower(denom);
    if (chainID === "phoenix-1" && denom === "uluna") return "LUNA";
    return DENOM_SYMBOLS[denom] || upper((denom || chainMeta(chainID).symbol || "").replace(/^u/, ""));
  }

  function bech32Prefix(value) {
    var match = clean(value).match(/^([a-z][a-z0-9]{0,19})1[ac-hj-np-z02-9]{20,110}$/i);
    return match ? lower(match[1]) : "";
  }

  function isCosmosStakeChain(chainID, chain) {
    if (!isObject(chain)) return false;
    if (lower(chain.networkType) === "testnet") return false;
    if (chain.evm || chain.chainNamespace === "eip155" || chain.chainNamespace === "bip122" || chain.chainNamespace === "solana") return false;
    return Boolean(chainID === "Do-Chain" || (clean(chain.prefix) && (chain.lcd || chain.api || chain.rpc || chain.baseAsset)));
  }

  function addressMatchesChain(chainID, chain, address) {
    address = clean(address);
    if (!address) return false;
    if (chainID === "Do-Chain") return /^do1[ac-hj-np-z02-9]{20,110}$/i.test(address);
    var expected = lower(chain && chain.prefix);
    return Boolean(expected && bech32Prefix(address) === expected);
  }

  function symbolOf(asset, chainID, denom) {
    var symbol = upper(asset && (asset.symbol || asset.tokenSymbol || asset.ticker || ""));
    if (symbol === "UDO") return "DO";
    if (symbol) return symbol;
    if (denom === "uluna" && chainID === "phoenix-1") return "LUNA";
    if (DENOM_SYMBOLS[denom]) return DENOM_SYMBOLS[denom];
    return upper(denom || chainMeta(chainID).symbol || "");
  }

  function nameOf(asset, chainID, symbol, category) {
    var name = clean(asset && (asset.displayName || asset.name || asset.label));
    if (name) return name;
    if (category === "staking" || category === "staked") return "Staked " + symbol;
    if (category === "reward" || category === "rewards") return "Rewards " + symbol;
    if (category === "unbonding") return "Unbonding " + symbol;
    return chainMeta(chainID).name || symbol;
  }

  function chainNameOf(asset, chainID) {
    return clean(asset && (asset.chainName || asset.networkName || asset.chainLabel || asset.networkLabel)) ||
      chainMeta(chainID).name ||
      chainID;
  }

  function iconOf(asset, chainID) {
    return clean(asset && (asset.chainIcon || asset.icon || asset.logo || asset.image)) || chainMeta(chainID).icon || "";
  }

  function validatorCountOf(asset) {
    var direct = Number(asset && asset.validatorCount);
    if (Number.isFinite(direct) && direct > 0) return direct;
    if (Array.isArray(asset && asset.validators)) return asset.validators.length;
    if (Array.isArray(asset && asset.validatorDelegations)) return asset.validatorDelegations.length;
    if (isObject(asset && asset.validatorDelegationsByAddress)) return Object.keys(asset.validatorDelegationsByAddress).length;
    return 0;
  }

  function normalizeRow(asset) {
    if (!isObject(asset)) return null;
    var category = categoryOf(asset);
    if (!/^(staking|staked|reward|rewards|unbonding)$/.test(category)) return null;
    var chainID = chainIDOf(asset);
    var denom = denomOf(asset);
    var symbol = symbolOf(asset, chainID, denom);
    if (!symbol || /^[0-9.]+$/.test(symbol)) return null;
    var amount = amountFromAsset(asset);
    var value = numberFrom(asset && (asset.valueUsd || asset.groupedValueUsd || asset.value || asset.usdValue || asset.usd || asset.valueText || asset.usdValueText));
    var price = numberFrom(asset && (asset.priceUsd || asset.usdPrice || asset.price || asset.unitPrice));
    if (!(value > 0) && amount > 0 && price > 0) value = amount * price;
    return {
      category: category === "staked" ? "staking" : category === "rewards" ? "reward" : category,
      chainID: chainID,
      chainName: chainNameOf(asset, chainID),
      denom: denom,
      symbol: symbol,
      name: nameOf(asset, chainID, symbol, category),
      amount: amount,
      amountText: clean(asset.displayAmount || asset.amountText || asset.balanceText || asset.quantityText) || formatToken(amount, symbol),
      value: value,
      valueText: clean(asset.valueText || asset.usdValueText || asset.fiatValueText || asset.valueFormatted) || formatUSD(value),
      icon: iconOf(asset, chainID),
      validatorCount: validatorCountOf(asset),
      raw: asset
    };
  }

  function rowKey(row) {
    return [row.chainID, row.category, row.denom || row.symbol, lower(row.name)].join("|");
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
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      if (!row) return;
      byKey[rowKey(row)] = betterRow(byKey[rowKey(row)], row);
    });
    return Object.keys(byKey).map(function (key) { return byKey[key]; });
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
    var keys = [];
    for (var index = 0; index < payloads.length; index += 1) {
      keys = keys.concat(walletIdentityKeys(payloads[index]));
    }
    return keys.filter(Boolean).filter(function (key, index, list) {
      return list.indexOf(key) === index;
    });
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
    var out = [];
    var seen = {};
    var activeKeys = activeWalletKeys();
    function add(snapshot) {
      if (!isObject(snapshot) || !snapshotMatchesActiveWallet(snapshot, activeKeys)) return;
      var key = [snapshot.schemaVersion || "", snapshot.updatedAt || "", snapshotKeys(snapshot).join("|")].join(":");
      if (seen[key]) return;
      seen[key] = true;
      out.push(snapshot);
    }
    add(readJSON(SNAPSHOT_KEY, null));
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (isObject(byWallet)) Object.keys(byWallet).forEach(function (key) { add(byWallet[key]); });
    return out.sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); });
  }

  function firstArray(source, keys) {
    if (!isObject(source)) return [];
    for (var index = 0; index < keys.length; index += 1) {
      if (Array.isArray(source[keys[index]])) return source[keys[index]];
    }
    return [];
  }

  function flattenAsset(asset, out) {
    out = out || [];
    if (!isObject(asset)) return out;
    var children = firstArray(asset, ["childAssets", "expandedAssets", "subAssets", "tokens", "children", "rows"]);
    if (children.length) {
      children.forEach(function (child) { flattenAsset(child, out); });
      if (asset.isChainGroup || asset.portfolioGroup || asset.groupedUnderChain) return out;
    }
    out.push(asset);
    return out;
  }

  function rawStakeRowsFromSnapshots() {
    var keys = ["staking", "sourceStakingAssets", "flatPortfolioAssets", "rawPortfolioAssets", "detailPortfolioAssets", "portfolioAssets", "assets"];
    var rows = [];
    collectSnapshots().forEach(function (snapshot) {
      keys.forEach(function (key) {
        if (!Array.isArray(snapshot && snapshot[key])) return;
        snapshot[key].forEach(function (asset) { flattenAsset(asset, rows); });
      });
    });
    return rows;
  }

  function assetAllowedByVisibility(row) {
    try {
      var quarantine = window.doWalletQuarantine;
      var payload = row && row.raw || row;
      if (quarantine && typeof quarantine.isVisibleAsset === "function") return quarantine.isVisibleAsset(payload);
      if (quarantine && typeof quarantine.isHiddenAsset === "function" && quarantine.isHiddenAsset(payload)) return false;
      if (quarantine && typeof quarantine.isBlockedAsset === "function" && quarantine.isBlockedAsset(payload)) return false;
    } catch (error) {}
    return true;
  }

  function snapshotStakeRows() {
    return uniqueRows(rawStakeRowsFromSnapshots().map(normalizeRow).filter(function (row) {
      if (!row || !assetAllowedByVisibility(row)) return false;
      return row.amount > 0 || row.value > 0 || row.amountText;
    }));
  }

  function activeWalletPayloads() {
    return [
      readJSON("do-wallet-selected-recovered-wallet.v1", null),
      readJSON("user", null),
      readJSON("do-wallet-bridge-wallet", null),
      readJSON("do-wallet-extension-authority.v1", null)
    ];
  }

  function collectStakeAddressQueries() {
    requestChainCatalogLoad();
    var chains = currentChains();
    var out = [];
    var seen = {};

    function add(chainID, address) {
      chainID = canonicalChainID(chainID);
      var chain = chains[chainID] || chainForID(chainID);
      address = clean(address);
      if (!chainID || !chain || !isCosmosStakeChain(chainID, chain) || !addressMatchesChain(chainID, chain, address)) return;
      var key = chainID + ":" + lower(address);
      if (seen[key]) return;
      seen[key] = true;
      out.push({ chainID: chainID, chain: chain, address: address });
    }

    function addMatchingChains(address) {
      address = clean(address);
      if (!address) return;
      Object.keys(chains).forEach(function (chainID) {
        add(chainID, address);
      });
    }

    function addMap(map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        var chainID = canonicalChainID(key);
        if (chains[chainID]) add(chainID, map[key]);
        else addMatchingChains(map[key]);
      });
    }

    activeWalletPayloads().forEach(function (payload) {
      var wallet = walletFromPayload(payload);
      if (!isObject(wallet)) return;
      addMatchingChains(wallet.address);
      add("Do-Chain", wallet.doAddress || wallet.doChainAddress);
      addMap(wallet.addresses);
      addMap(wallet.addressMap);
    });

    collectSnapshots().forEach(function (snapshot) {
      addMap(snapshot.addresses);
      addMap(snapshot.activeAddresses);
      addMap(snapshot.allAddresses);
    });
    rawStakeRowsFromSnapshots().forEach(function (asset) {
      var chainID = chainIDOf(asset);
      add(chainID, asset && (asset.walletAddress || asset.address));
    });
    return out.slice(0, 128);
  }

  function fetchJSON(url) {
    return window.fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function fetchJSONSafe(url) {
    return fetchJSON(url).catch(function () { return {}; });
  }

  function lcdURL(chainID, path) {
    return "/station-assets/api/lcd/" + encodeURIComponent(chainID) + path;
  }

  function coinTotal(coins, denom) {
    return (Array.isArray(coins) ? coins : []).reduce(function (sum, coin) {
      if (!coin || lower(coin.denom) !== lower(denom)) return sum;
      return sum + amountFromCoin(coin, decimalsForDenom("", null, denom));
    }, 0);
  }

  function decimalsForDenom(chainID, chain, denom) {
    denom = lower(denom);
    if (denom === "inj" || denom === "wei") return 18;
    if (denom === "lamports") return 9;
    var decimals = Number(chain && chain.decimals);
    return Number.isFinite(decimals) ? decimals : 6;
  }

  function valueForAmount(amount, denom, chainID) {
    var rows = snapshotStakeRows();
    for (var index = 0; index < rows.length; index += 1) {
      var row = rows[index];
      if (row.chainID !== chainID || row.denom !== denom || !(row.amount > 0) || !(row.value > 0)) continue;
      return amount * (row.value / row.amount);
    }
    var meta = chainMeta(chainID);
    return amount * (meta.price || 0);
  }

  function stakeRow(category, chainID, chain, denom, amount, address, validatorCount, validators) {
    if (!(amount > 0)) return null;
    denom = lower(denom || nativeDenom(chainID, chain));
    var symbol = nativeSymbol(chainID, chain, denom);
    var chainName = chainNameFromChain(chainID, chain);
    var name = category === "staking" ? "Staked " + symbol : category === "reward" ? "Rewards " + symbol : "Unbonding " + symbol;
    var value = valueForAmount(amount, denom, chainID);
    return {
      category: category,
      chainID: chainID,
      chainName: chainName,
      denom: denom,
      symbol: symbol,
      name: name,
      amount: amount,
      amountText: formatToken(amount, symbol),
      value: value,
      valueText: formatUSD(value),
      icon: chainIconFromChain(chainID, chain),
      validatorCount: validatorCount || 0,
      raw: {
        chainID: chainID,
        chainName: chainName,
        denom: denom,
        symbol: symbol,
        name: name,
        category: category,
        walletAddress: address,
        validators: validators || []
      }
    };
  }

  function validatorAddressFromDelegation(entry) {
    return clean(entry && entry.delegation && entry.delegation.validator_address) ||
      clean(entry && entry.validator_address);
  }

  function aggregateStakeCoins(coins, category, chainID, chain, address, validators) {
    var byDenom = {};
    (Array.isArray(coins) ? coins : []).forEach(function (coin) {
      var denom = lower(coin && coin.denom);
      if (!denom) return;
      byDenom[denom] = (byDenom[denom] || 0) + amountFromCoin(coin, decimalsForDenom(chainID, chain, denom));
    });
    var validatorList = Object.keys(validators || {});
    return Object.keys(byDenom).map(function (denom) {
      return stakeRow(category, chainID, chain, denom, byDenom[denom], address, validatorList.length, validatorList);
    }).filter(Boolean);
  }

  function fetchStakeRowsForQuery(query) {
    var chainID = query.chainID;
    var chain = query.chain || {};
    var address = query.address;
    var encoded = encodeURIComponent(address);
    var delegationPath = lcdURL(chainID, "/cosmos/staking/v1beta1/delegations/" + encoded + "?pagination.limit=2000");
    var rewardsPath = lcdURL(chainID, "/cosmos/distribution/v1beta1/delegators/" + encoded + "/rewards");
    var unbondingPath = lcdURL(chainID, "/cosmos/staking/v1beta1/delegators/" + encoded + "/unbonding_delegations?pagination.limit=2000");

    return Promise.all([
      fetchJSONSafe(delegationPath),
      fetchJSONSafe(rewardsPath),
      fetchJSONSafe(unbondingPath)
    ]).then(function (responses) {
      var delegations = responses[0] || {};
      var rewards = responses[1] || {};
      var unbonding = responses[2] || {};
      var delegationRows = Array.isArray(delegations.delegation_responses) ? delegations.delegation_responses : [];
      var rewardEntries = Array.isArray(rewards.rewards) ? rewards.rewards : [];
      var rewardValidators = rewardEntries.map(function (entry) {
        return clean(entry && entry.validator_address);
      }).filter(Boolean);

      function finish(entries) {
        var validators = {};
        var stakedCoins = [];
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
          var validator = validatorAddressFromDelegation(entry);
          if (validator) validators[validator] = true;
          if (entry && entry.balance) stakedCoins.push(entry.balance);
        });
        rewardEntries.forEach(function (entry) {
          var validator = clean(entry && entry.validator_address);
          if (validator) validators[validator] = true;
        });
        var unbondingCoins = [];
        (Array.isArray(unbonding.unbonding_responses) ? unbonding.unbonding_responses : []).forEach(function (entry) {
          var validator = clean(entry && entry.validator_address);
          if (validator) validators[validator] = true;
          (Array.isArray(entry.entries) ? entry.entries : []).forEach(function (release) {
            if (release && release.balance) {
              unbondingCoins.push({ denom: nativeDenom(chainID, chain), amount: release.balance });
            }
          });
        });
        return aggregateStakeCoins(stakedCoins, "staking", chainID, chain, address, validators)
          .concat(aggregateStakeCoins(Array.isArray(rewards.total) ? rewards.total : [], "reward", chainID, chain, address, validators))
          .concat(aggregateStakeCoins(unbondingCoins, "unbonding", chainID, chain, address, validators));
      }

      if (!delegationRows.length && rewardValidators.length) {
        return Promise.all(rewardValidators.map(function (validator) {
          var path = lcdURL(chainID, "/cosmos/staking/v1beta1/validators/" + encodeURIComponent(validator) + "/delegations/" + encoded);
          return fetchJSONSafe(path).then(function (json) {
            return json && json.delegation_response ? json.delegation_response : null;
          });
        })).then(function (validatorDelegations) {
          (Array.isArray(validatorDelegations) ? validatorDelegations : []).forEach(function (entry) {
            if (entry && entry.balance) delegationRows.push(entry);
          });
          return finish(delegationRows);
        });
      }

      return finish(delegationRows);
    });
  }

  function runLimited(items, limit, worker) {
    var queue = (Array.isArray(items) ? items : []).slice();
    var results = [];
    var active = 0;
    return new Promise(function (resolve) {
      function next() {
        if (!queue.length && active === 0) return resolve(results);
        while (active < limit && queue.length) {
          active += 1;
          Promise.resolve(worker(queue.shift())).then(function (result) {
            results.push(result);
          }, function () {
            results.push([]);
          }).then(function () {
            active -= 1;
            next();
          });
        }
      }
      next();
    });
  }

  function ensureDirectStakeRows() {
    var queries = collectStakeAddressQueries();
    var chainCount = Object.keys(currentChains()).length;
    var key = chainCount + ":" + queries.map(function (query) {
      return query.chainID + ":" + lower(query.address);
    }).join("|");
    if (!queries.length || key === directStakeFetchKey || directStakeFetching) return;
    directStakeFetchKey = key;
    directStakeFetching = true;
    runLimited(queries, 5, fetchStakeRowsForQuery).then(function (sets) {
      var rows = [];
      sets.forEach(function (set) { rows = rows.concat(set || []); });
      directStakeRows = uniqueRows(rows);
      directStakeFetching = false;
      schedule();
    }, function () {
      directStakeFetching = false;
    });
  }

  function stakeRows() {
    return uniqueRows(snapshotStakeRows().concat(directStakeRows)).sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.name.localeCompare(b.name);
    });
  }

  function rowsForSelection(rows) {
    if (selectedChain === "all") return rows;
    var filtered = rows.filter(function (row) { return row.chainID === selectedChain; });
    return filtered.length ? filtered : rows;
  }

  function totals(rows) {
    var out = { staking: 0, reward: 0, unbonding: 0 };
    rows.forEach(function (row) {
      if (row.category === "staking") out.staking += Number(row.value || 0) || 0;
      if (row.category === "reward") out.reward += Number(row.value || 0) || 0;
      if (row.category === "unbonding") out.unbonding += Number(row.value || 0) || 0;
    });
    return out;
  }

  function amountSummary(rows, category) {
    var bySymbol = {};
    rows.forEach(function (row) {
      if (row.category !== category) return;
      var key = row.symbol || "";
      if (!key) return;
      bySymbol[key] = (bySymbol[key] || 0) + (Number(row.amount) || 0);
    });
    var symbols = Object.keys(bySymbol).filter(function (key) { return bySymbol[key] > 0; });
    if (!symbols.length) return "";
    if (symbols.length === 1) return formatToken(bySymbol[symbols[0]], symbols[0]);
    return symbols.length + " assets";
  }

  function chainsFromRows(rows) {
    var map = {};
    rows.forEach(function (row) {
      if (!row.chainID) return;
      if (!map[row.chainID]) map[row.chainID] = { chainID: row.chainID, name: row.chainName || chainMeta(row.chainID).name, value: 0, icon: row.icon };
      map[row.chainID].value += Number(row.value || 0) || 0;
      if (!map[row.chainID].icon && row.icon) map[row.chainID].icon = row.icon;
    });
    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return b.value - a.value || a.name.localeCompare(b.name);
    });
  }

  function chartStyle(rows) {
    var byChain = chainsFromRows(rows);
    var total = byChain.reduce(function (sum, chain) { return sum + Math.max(0, chain.value); }, 0);
    if (!(total > 0)) return "background:rgba(123,149,242,.35)";
    var current = 0;
    var parts = [];
    byChain.forEach(function (chain, index) {
      var start = current;
      current += (Math.max(0, chain.value) / total) * 360;
      parts.push(CHART_COLORS[index % CHART_COLORS.length] + " " + start.toFixed(2) + "deg " + current.toFixed(2) + "deg");
    });
    return "background:conic-gradient(" + parts.join(",") + ")";
  }

  function iconHTML(src, label) {
    if (!src) return '<span class="do-wallet-stake-overview-icon-fallback">' + escapeHTML(clean(label).slice(0, 3) || "?") + '</span>';
    return '<img class="do-wallet-stake-overview-icon" src="' + escapeHTML(src) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';" />';
  }

  function chainOptionsHTML(chains) {
    var html = ['<option value="all">All</option>'];
    chains.forEach(function (chain) {
      html.push('<option value="' + escapeHTML(chain.chainID) + '"' + (selectedChain === chain.chainID ? " selected" : "") + '>' + escapeHTML(chain.name) + '</option>');
    });
    return html.join("");
  }

  function summaryCardHTML(label, value, subtext) {
    return [
      '<div class="do-wallet-stake-overview-summary-card">',
        '<span>' + escapeHTML(label) + '</span>',
        '<strong>' + escapeHTML(formatUSD(value)) + '</strong>',
        '<small>' + escapeHTML(subtext || "0 assets") + '</small>',
      '</div>'
    ].join("");
  }

  function rowHTML(row) {
    var label = CATEGORY_LABELS[row.category] || row.category;
    var validatorText = row.validatorCount > 0 ? " - " + row.validatorCount + (row.validatorCount === 1 ? " validator" : " validators") : "";
    return [
      '<div class="do-wallet-stake-overview-row">',
        '<div class="do-wallet-stake-overview-row-left">',
          iconHTML(row.icon, row.symbol),
          '<span>',
            '<strong>' + escapeHTML(row.name) + '</strong>',
            '<small>' + escapeHTML(row.chainName + validatorText) + '</small>',
          '</span>',
        '</div>',
        '<div class="do-wallet-stake-overview-row-right">',
          '<strong>' + escapeHTML(row.valueText || formatUSD(row.value)) + '</strong>',
          '<small>' + escapeHTML(row.amountText || formatToken(row.amount, row.symbol)) + '</small>',
          '<em>' + escapeHTML(label) + '</em>',
        '</div>',
      '</div>'
    ].join("");
  }

  function visible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width < 240 || rect.height < 120) return false;
    try {
      var style = window.getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    } catch (error) {
      return true;
    }
  }

  function isStakeOverviewRoute() {
    var path = clean(window.location && window.location.pathname || "");
    return /^\/stake\/?$/i.test(path);
  }

  function markStakeRoute() {
    if (!document.documentElement) return;
    var active = isStakeOverviewRoute();
    document.documentElement.classList.toggle("do-wallet-stake-overview-route", active);
    if (document.body) document.body.classList.toggle("do-wallet-stake-overview-route", active);
  }

  function findExistingStakePage() {
    var existing = document.querySelector("[" + PAGE_ATTR + "]");
    return existing && document.body.contains(existing) ? existing : null;
  }

  function looksLikeAppSidebar(text) {
    return /\bDashboard\b/.test(text) &&
      /\bQuarantine\b/.test(text) &&
      /\bSwap\b/.test(text) &&
      /\bGovernance\b/.test(text) &&
      /\bNETWORKS\b/.test(text);
  }

  function findStakePageRoot() {
    if (!isStakeOverviewRoute()) return null;
    var existing = findExistingStakePage();
    if (existing) return existing;

    var headings = Array.prototype.slice.call(document.querySelectorAll("h1,h2,[role='heading']"));
    var candidates = [];
    headings.forEach(function (heading) {
      if (clean(heading.textContent) !== "Stake") return;
      var node = heading.parentElement;
      var depth = 0;
      while (node && node !== document.body && depth < 8) {
        if (visible(node)) {
          var text = clean(node.innerText || node.textContent);
          var rect = node.getBoundingClientRect();
          var hasStakeBody = /\bQuick Stake\b|\bManual Stake\b|\bStaking rewards\b|\bWithdraw all rewards\b|\bStaked funds\b/i.test(text);
          var isWrongChrome = /\bPortfolio value\b/i.test(text) || looksLikeAppSidebar(text);
          if (rect.width >= 520 && rect.height >= 220 && hasStakeBody && !isWrongChrome) {
            candidates.push({ node: node, area: rect.width * rect.height, height: rect.height });
          }
        }
        node = node.parentElement;
        depth += 1;
      }
    });

    if (!candidates.length) return null;
    candidates.sort(function (a, b) {
      return b.area - a.area || b.height - a.height;
    });
    candidates[0].node.setAttribute(PAGE_ATTR, VERSION);
    candidates[0].node.setAttribute("data-do-wallet-stake-overview-mode", "page");
    return candidates[0].node;
  }

  function findStakeActionRoot() {
    if (!isStakeOverviewRoute()) return null;
    var nodes = Array.prototype.slice.call(document.querySelectorAll("main section,main article,main div,section,article,div"));
    var matches = nodes.filter(function (node) {
      if (!visible(node)) return false;
      var text = clean(node.innerText || node.textContent);
      if (!/\bQuick Stake\b/i.test(text) || !/\bManual Stake\b/i.test(text)) return false;
      if (!/\bSelect staking asset\b/i.test(text) && !/\bStaking asset\b/i.test(text)) return false;
      if (/\bPortfolio value\b/i.test(text) || looksLikeAppSidebar(text)) return false;
      var rect = node.getBoundingClientRect();
      return rect.width >= 320 && rect.height >= 180;
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (br.width * br.height) - (ar.width * ar.height);
    });
    if (!matches.length) return null;
    matches[0].setAttribute(PAGE_ATTR, VERSION);
    matches[0].setAttribute("data-do-wallet-stake-overview-mode", "card");
    return matches[0];
  }

  function findStakeCard() {
    if (!isStakeOverviewRoute()) return null;
    var nodes = Array.prototype.slice.call(document.querySelectorAll("main section,main article,main div,section,article,div"));
    var matches = nodes.filter(function (node) {
      if (!visible(node)) return false;
      var text = clean(node.innerText || node.textContent);
      if (!/\bStaked funds\b/i.test(text)) return false;
      if (!/\bDelegations\b/i.test(text) || !/\bUndelegations\b/i.test(text)) return false;
      if (/\bQuick Stake\b|\bManual Stake\b/.test(text)) return false;
      var rect = node.getBoundingClientRect();
      return rect.width >= 320 && rect.height >= 180 && rect.height <= Math.max(760, (window.innerHeight || 900) * 0.9);
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    });
    if (!matches.length) return null;
    matches[0].setAttribute("data-do-wallet-stake-overview-mode", "card");
    return matches[0];
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "html.do-wallet-stake-overview-route,html.do-wallet-stake-overview-route body{height:auto!important;min-height:100%!important;overflow-y:auto!important;}",
      "html.do-wallet-stake-overview-route #root{height:auto!important;min-height:100vh!important;overflow:visible!important;}",
      "html.do-wallet-stake-overview-route main,html.do-wallet-stake-overview-route [class*='Page_main__'],html.do-wallet-stake-overview-route [class*='Layout_main__'],html.do-wallet-stake-overview-route [class*='Layout_content__']{height:auto!important;max-height:none!important;min-height:0!important;overflow:visible!important;}",
      "[" + PAGE_ATTR + "]{display:block!important;width:100%!important;max-width:none!important;min-height:calc(100vh - 90px)!important;overflow:visible!important;padding:0!important;color:#fff!important;}",
      "[" + PAGE_ATTR + "] *{box-sizing:border-box;}",
      ".do-wallet-stake-overview-page-shell{width:100%;min-width:0;padding:34px 32px 96px;overflow:visible;}",
      ".do-wallet-stake-overview-page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:22px;}",
      ".do-wallet-stake-overview-page-title h1{margin:0 0 8px;font-size:34px;line-height:1.1;font-weight:var(--bold,500);letter-spacing:0;color:#fff;}",
      ".do-wallet-stake-overview-page-title p{margin:0;color:#c9bbef;font-size:13px;line-height:1.4;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-refresh{border:0;border-radius:999px;background:#9d42ff;color:#fff;min-height:42px;padding:0 22px;font:inherit;font-size:13px;font-weight:var(--bold,500);cursor:pointer;white-space:nowrap;}",
      "[" + CARD_ATTR + "]{box-sizing:border-box!important;overflow:hidden!important;padding:0!important;color:#fff!important;border:1px solid rgba(159,70,255,.42)!important;border-radius:7px!important;background:#171023!important;}",
      "[" + CARD_ATTR + "] *{box-sizing:border-box;}",
      ".do-wallet-stake-overview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:26px 30px;border-bottom:1px solid rgba(159,70,255,.28);}",
      ".do-wallet-stake-overview-head h2{margin:0 0 6px;font-size:22px;line-height:1.12;font-weight:var(--bold,500);letter-spacing:0;color:#fff;}",
      ".do-wallet-stake-overview-head p{margin:0;color:#c9bbef;font-size:13px;line-height:1.35;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-total{text-align:right;color:#fff;font-size:26px;line-height:1;font-weight:var(--bold,500);white-space:nowrap;}",
      ".do-wallet-stake-overview-filter{display:flex;align-items:center;gap:12px;padding:14px 30px;border-bottom:1px solid rgba(159,70,255,.28);}",
      ".do-wallet-stake-overview-filter label{color:#c9bbef;font-size:13px;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-select-wrap{position:relative;display:inline-flex;min-width:270px;}",
      ".do-wallet-stake-overview-select{appearance:none;-webkit-appearance:none;width:100%;min-height:38px;padding:0 42px 0 16px;border:1px solid rgba(159,70,255,.52);border-radius:999px;background:#251b39;color:#fff;font:inherit;font-size:13px;font-weight:var(--bold,500);outline:none;cursor:pointer;}",
      ".do-wallet-stake-overview-select-wrap:after{content:'';position:absolute;right:16px;top:50%;width:8px;height:8px;border-right:2px solid #c7b9ef;border-bottom:2px solid #c7b9ef;transform:translateY(-65%) rotate(45deg);pointer-events:none;}",
      ".do-wallet-stake-overview-body{display:grid;grid-template-columns:minmax(240px,1fr) minmax(260px,390px);gap:28px;padding:22px 30px;}",
      ".do-wallet-stake-overview-chart-wrap{min-height:210px;display:grid;place-items:center;}",
      ".do-wallet-stake-overview-chart{width:min(180px,42vw);aspect-ratio:1;border-radius:50%;position:relative;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);}",
      ".do-wallet-stake-overview-chart:after{content:'';position:absolute;inset:28%;border-radius:50%;background:#181125;box-shadow:0 0 0 1px rgba(255,255,255,.03);}",
      ".do-wallet-stake-overview-legend{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:18px;justify-content:center;color:#c9bbef;font-size:13px;}",
      ".do-wallet-stake-overview-legend span{display:inline-flex;align-items:center;gap:7px;}",
      ".do-wallet-stake-overview-dot{width:10px;height:10px;border-radius:50%;display:inline-block;}",
      ".do-wallet-stake-overview-summary{display:grid;gap:14px;}",
      ".do-wallet-stake-overview-summary-card{min-height:104px;border:1px solid rgba(159,70,255,.42);border-radius:7px;padding:18px 20px;background:#171023;}",
      ".do-wallet-stake-overview-summary-card span{display:block;margin-bottom:12px;color:#fff;font-size:15px;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-summary-card strong{display:block;margin-bottom:8px;color:#fff;font-size:28px;line-height:1;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-summary-card small{display:block;color:#c9bbef;font-size:12px;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-positions{border-top:1px solid rgba(159,70,255,.28);}",
      ".do-wallet-stake-overview-positions-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 30px;color:#fff;}",
      ".do-wallet-stake-overview-positions-head strong{font-size:16px;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-positions-head small{color:#c9bbef;font-size:12px;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-list{max-height:none;overflow:visible;overscroll-behavior:auto;-webkit-overflow-scrolling:auto;padding-bottom:16px;}",
      ".do-wallet-stake-overview-row{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:76px;padding:14px 30px;border-top:1px solid rgba(159,70,255,.24);}",
      ".do-wallet-stake-overview-row-left{display:flex;align-items:center;gap:14px;min-width:0;}",
      ".do-wallet-stake-overview-row-left span{display:flex;flex-direction:column;gap:5px;min-width:0;}",
      ".do-wallet-stake-overview-row-left strong{color:#fff;font-size:15px;line-height:1.12;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-row-left small{color:#c9bbef;font-size:12px;line-height:1.1;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-row-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right;min-width:150px;}",
      ".do-wallet-stake-overview-row-right strong{color:#fff;font-size:15px;line-height:1.1;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-row-right small,.do-wallet-stake-overview-row-right em{color:#c9bbef;font-size:12px;line-height:1.1;font-style:normal;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-icon,.do-wallet-stake-overview-icon-fallback{width:38px;height:38px;min-width:38px;border-radius:50%;object-fit:cover;background:#2c2140;}",
      ".do-wallet-stake-overview-icon-fallback{display:grid;place-items:center;color:#fff;font-size:10px;font-weight:var(--bold,500);}",
      ".do-wallet-stake-overview-empty{padding:26px 30px;border-top:1px solid rgba(159,70,255,.24);color:#c9bbef;font-size:14px;font-weight:var(--bold,500);}",
      "@media(max-width:900px){.do-wallet-stake-overview-page-shell{padding:26px 20px 90px}.do-wallet-stake-overview-body{grid-template-columns:1fr}.do-wallet-stake-overview-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.do-wallet-stake-overview-chart-wrap{min-height:190px}}",
      "@media(max-width:640px){.do-wallet-stake-overview-page-head{flex-direction:column}.do-wallet-stake-overview-page-title h1{font-size:30px}.do-wallet-stake-overview-refresh{width:100%}.do-wallet-stake-overview-head,.do-wallet-stake-overview-filter,.do-wallet-stake-overview-body,.do-wallet-stake-overview-positions-head,.do-wallet-stake-overview-row{padding-left:18px;padding-right:18px}.do-wallet-stake-overview-head{flex-direction:column}.do-wallet-stake-overview-total{text-align:left}.do-wallet-stake-overview-filter{align-items:stretch;flex-direction:column}.do-wallet-stake-overview-select-wrap{min-width:0;width:100%}.do-wallet-stake-overview-summary{grid-template-columns:1fr}.do-wallet-stake-overview-row{gap:10px}.do-wallet-stake-overview-row-right{min-width:118px}.do-wallet-stake-overview-row-left strong,.do-wallet-stake-overview-row-right strong{font-size:14px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function cardHTML(rows, loading) {
    var chains = chainsFromRows(rows);
    if (selectedChain !== "all" && !chains.some(function (chain) { return chain.chainID === selectedChain; })) selectedChain = "all";
    var scoped = rowsForSelection(rows);
    var total = totals(scoped);
    var totalValue = total.staking + total.reward + total.unbonding;
    var legend = chainsFromRows(scoped).map(function (chain, index) {
      return '<span><i class="do-wallet-stake-overview-dot" style="background:' + CHART_COLORS[index % CHART_COLORS.length] + '"></i>' + escapeHTML(chain.name) + '</span>';
    }).join("");
    var listHTML = scoped.length
      ? scoped.map(rowHTML).join("")
      : '<div class="do-wallet-stake-overview-empty">' + escapeHTML(loading ? "Loading staking positions..." : "No staking positions found for this wallet.") + '</div>';
    return [
      '<div class="do-wallet-stake-overview-head">',
        '<div><h2>Staked funds</h2><p>Delegations, unbonding, and rewards across wallet addresses</p></div>',
        '<div class="do-wallet-stake-overview-total">' + escapeHTML(formatUSD(totalValue)) + '</div>',
      '</div>',
      '<div class="do-wallet-stake-overview-filter">',
        '<label for="do-wallet-stake-overview-network">Network</label>',
        '<span class="do-wallet-stake-overview-select-wrap"><select id="do-wallet-stake-overview-network" class="do-wallet-stake-overview-select" aria-label="Stake network">' + chainOptionsHTML(chains) + '</select></span>',
      '</div>',
      '<div class="do-wallet-stake-overview-body">',
        '<div class="do-wallet-stake-overview-chart-wrap">',
          '<div><div class="do-wallet-stake-overview-chart" style="' + escapeHTML(chartStyle(scoped)) + '"></div><div class="do-wallet-stake-overview-legend">' + legend + '</div></div>',
        '</div>',
        '<div class="do-wallet-stake-overview-summary">',
          summaryCardHTML("Delegations", total.staking, amountSummary(scoped, "staking")),
          summaryCardHTML("Undelegations", total.unbonding, amountSummary(scoped, "unbonding")),
          summaryCardHTML("Staking rewards", total.reward, amountSummary(scoped, "reward")),
        '</div>',
      '</div>',
      '<div class="do-wallet-stake-overview-positions">',
        '<div class="do-wallet-stake-overview-positions-head"><strong>Positions</strong><small>' + escapeHTML(scoped.length + " " + (scoped.length === 1 ? "position" : "positions")) + '</small></div>',
        '<div class="do-wallet-stake-overview-list">' + listHTML + '</div>',
      '</div>'
    ].join("");
  }

  function pageHTML(rows, loading) {
    return [
      '<div class="do-wallet-stake-overview-page-shell">',
        '<div class="do-wallet-stake-overview-page-head">',
          '<div class="do-wallet-stake-overview-page-title"><h1>Stake</h1><p>Delegations, rewards, and unbonding across wallet addresses</p></div>',
          '<button type="button" class="do-wallet-stake-overview-refresh" data-do-wallet-stake-refresh="1">' + escapeHTML(loading ? "Refreshing..." : "Refresh staking") + '</button>',
        '</div>',
        '<section ' + CARD_ATTR + '="' + escapeHTML(VERSION) + '">' + cardHTML(rows, loading) + '</section>',
      '</div>'
    ].join("");
  }

  function render(host, rows, loading) {
    var mode = host.getAttribute("data-do-wallet-stake-overview-mode") || "page";
    var signature = VERSION + ":" + mode + ":" + selectedChain + ":" + (loading ? "loading" : "ready") + ":" + rows.map(function (row) {
      return rowKey(row) + ":" + row.amountText + ":" + row.valueText;
    }).join("||");
    if (host.getAttribute(SIGNATURE_ATTR) === signature) return true;
    host.setAttribute(PAGE_ATTR, VERSION);
    host.setAttribute(SIGNATURE_ATTR, signature);
    host.innerHTML = mode === "card" ? cardHTML(rows, loading) : pageHTML(rows, loading);
    var select = host.querySelector(".do-wallet-stake-overview-select");
    if (select) {
      select.value = selectedChain;
      select.addEventListener("change", function () {
        selectedChain = select.value || "all";
        schedule(0);
      });
    }
    var refresh = host.querySelector("[data-do-wallet-stake-refresh]");
    if (refresh) {
      refresh.addEventListener("click", function () {
        directStakeFetchKey = "";
        schedule(0);
      });
    }
    return true;
  }

  function update() {
    renderTimer = 0;
    markStakeRoute();
    if (!document.body || !isStakeOverviewRoute()) return;
    installStyles();
    ensureDirectStakeRows();
    var rows = stakeRows();
    var host = findStakePageRoot() || findStakeActionRoot() || findStakeCard();
    if (!host) return;
    render(host, rows, directStakeFetching);
    try {
      window.__doWalletStakeOverviewDebug = {
        version: VERSION,
        rows: rows.length,
        directStakeRows: directStakeRows.length,
        directStakeFetching: directStakeFetching,
        selectedChain: selectedChain,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {}
  }

  function schedule(delay) {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(update, delay == null ? RENDER_DELAY_MS : delay);
  }

  document.addEventListener("DOMContentLoaded", function () { schedule(0); });
  window.addEventListener("load", function () { schedule(0); });
  window.addEventListener("focus", function () { schedule(0); });
  window.addEventListener("popstate", function () { schedule(0); });
  window.addEventListener("hashchange", function () { schedule(0); });
  window.addEventListener("do_wallet_portfolio_snapshot", function () { schedule(0); });
  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY || event.key === SNAPSHOTS_BY_WALLET_KEY) schedule(0);
  });
  if (window.MutationObserver) {
    new MutationObserver(function () {
      markStakeRoute();
      if (!isStakeOverviewRoute()) return;
      if (findExistingStakePage()) return;
      schedule();
    }).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  schedule(0);
  window.setTimeout(schedule, 600);
  window.setTimeout(schedule, 1800);
})();
