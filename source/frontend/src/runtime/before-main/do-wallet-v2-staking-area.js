(function () {
  "use strict";

  if (window.__doWalletStakingArea20260627Rewrite) return;
  window.__doWalletStakingArea20260627Rewrite = true;

  var VERSION = "20260628-staking-area-stable-5";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var STYLE_ID = "do-wallet-staking-area-style";
  var ROOT_ATTR = "data-do-wallet-staking-root";
  var NATIVE_STAKE_ATTR = "data-do-wallet-native-stake-hidden";
  var SIGNATURE_ATTR = "data-do-wallet-staking-signature";
  var ROUTE_ATTR = "data-do-wallet-staking-route";
  var BALANCE_ATTR = "data-do-wallet-staking-balance";
  var SELECTED_CHAIN_KEY = "do-wallet-staking-selected-chain";
  var renderTimer = 0;
  var balanceTimer = 0;
  var refreshRequested = false;
  var directRows = [];
  var directFetchKey = "";
  var directFetching = false;
  var directRowsPrimed = false;
  var directFetchTimer = 0;
  var renderedMain = null;

  var CHAIN_META = {
    "Do-Chain": { name: "Do Chain", symbol: "DO", denom: "udo", decimals: 6, prefix: "do", icon: "/do-logo.jpg", price: 1.273e-9 },
    "columbus-5": { name: "Terra Classic (LUNC)", symbol: "LUNC", denom: "uluna", decimals: 6, prefix: "terra", icon: "/img/chains/TerraClassic.svg" },
    "osmosis-1": { name: "Osmosis", symbol: "OSMO", denom: "uosmo", decimals: 6, prefix: "osmo", icon: "/img/chains/Osmosis.svg" },
    "phoenix-1": { name: "Terra (LUNA)", symbol: "LUNA", denom: "uluna", decimals: 6, prefix: "terra", icon: "/img/chains/Terra.svg" },
    "cosmoshub-4": { name: "Cosmos Hub", symbol: "ATOM", denom: "uatom", decimals: 6, prefix: "cosmos", icon: "/img/chains/Cosmos.svg" },
    "juno-1": { name: "Juno", symbol: "JUNO", denom: "ujuno", decimals: 6, prefix: "juno", icon: "/img/chains/Juno.svg" },
    "akashnet-2": { name: "Akash", symbol: "AKT", denom: "uakt", decimals: 6, prefix: "akash", icon: "/img/chains/Akash.svg" },
    "secret-4": { name: "Secret Network", symbol: "SCRT", denom: "uscrt", decimals: 6, prefix: "secret", icon: "/img/chains/Secret.svg" },
    "dungeon-1": { name: "Dungeon Chain", symbol: "DGN", denom: "udgn", decimals: 6, prefix: "dungeon", icon: "/img/chains/Dungeon.png" },
    "chihuahua-1": { name: "Chihuahua", symbol: "HUAHUA", denom: "uhuahua", decimals: 6, prefix: "chihuahua", icon: "/img/chains/Huahua.png" },
    "stargaze-1": { name: "Stargaze", symbol: "STARS", denom: "ustars", decimals: 6, prefix: "stars", icon: "/img/chains/Stargaze.png" },
    "injective-1": { name: "Injective", symbol: "INJ", denom: "inj", decimals: 18, prefix: "inj", icon: "/img/chains/Injective.svg" },
    "kava_2222-10": { name: "Kava", symbol: "KAVA", denom: "ukava", decimals: 6, prefix: "kava", icon: "/img/coins/unknown.svg" },
    "sentinelhub-2": { name: "DVPN", symbol: "DVPN", denom: "udvpn", decimals: 6, prefix: "sent", icon: "/img/coins/unknown.svg" }
  };

  var CHAIN_ALIASES = {
    "888": "Do-Chain",
    "do": "Do-Chain",
    "do-chain": "Do-Chain",
    "dochain": "Do-Chain",
    "dochain-1": "Do-Chain",
    "do-main-1": "Do-Chain",
    "330": "columbus-5",
    "lunc": "columbus-5",
    "terra-classic": "columbus-5",
    "terra-classic-lunc": "columbus-5",
    "columbus-5": "columbus-5",
    "osmo": "osmosis-1",
    "osmosis": "osmosis-1",
    "osmosis-1": "osmosis-1",
    "luna": "phoenix-1",
    "terra": "phoenix-1",
    "terra-luna": "phoenix-1",
    "phoenix-1": "phoenix-1",
    "atom": "cosmoshub-4",
    "cosmos": "cosmoshub-4",
    "cosmoshub-4": "cosmoshub-4",
    "juno": "juno-1",
    "juno-1": "juno-1",
    "akt": "akashnet-2",
    "akash": "akashnet-2",
    "akashnet-2": "akashnet-2",
    "scrt": "secret-4",
    "secret": "secret-4",
    "secret-4": "secret-4",
    "dgn": "dungeon-1",
    "dungeon": "dungeon-1",
    "dungeon-chain": "dungeon-1",
    "dungeon-1": "dungeon-1",
    "huahua": "chihuahua-1",
    "chihuahua": "chihuahua-1",
    "chihuahua-1": "chihuahua-1",
    "stars": "stargaze-1",
    "stargaze": "stargaze-1",
    "stargaze-1": "stargaze-1",
    "inj": "injective-1",
    "injective": "injective-1",
    "injective-1": "injective-1",
    "kava": "kava_2222-10",
    "kava-2222-10": "kava_2222-10",
    "kava_2222-10": "kava_2222-10",
    "dvpn": "sentinelhub-2",
    "sent": "sentinelhub-2",
    "sentinel": "sentinelhub-2",
    "sentinelhub-2": "sentinelhub-2"
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
    ukava: "KAVA",
    udvpn: "DVPN"
  };

  var CATEGORY_LABELS = {
    staking: "Delegations",
    reward: "Staking rewards",
    unbonding: "Undelegations"
  };

  var CHART_COLORS = ["#7b95f2", "#ffd84d", "#9d42ff", "#27d3a2", "#ff6a8a", "#35b8ff", "#ff9f1a", "#b672ff"];

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
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  function numberFrom(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "object") {
      if (value.amount != null) return numberFrom(value.amount);
      if (value.value != null) return numberFrom(value.value);
      if (value.quantity != null) return numberFrom(value.quantity);
      if (value.balance != null) return numberFrom(value.balance);
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

  function numberFromCoin(coin, decimals) {
    if (!coin || coin.amount == null) return 0;
    if (String(coin.amount).indexOf(".") >= 0) return numberFrom(coin.amount);
    var value = Number(decimalString(coin.amount, decimals));
    return Number.isFinite(value) ? value : 0;
  }

  function formatUSD(value) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "$-";
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

  function selectedChain() {
    var value = clean(readJSON(SELECTED_CHAIN_KEY, "all"));
    return value || "all";
  }

  function setSelectedChain(value) {
    writeJSON(SELECTED_CHAIN_KEY, clean(value) || "all");
  }

  function routePath() {
    return clean(window.location && window.location.pathname).replace(/\/+$/, "") || "/";
  }

  function isStakeOverviewRoute() {
    return routePath() === "/stake";
  }

  function isStakeRoute() {
    return /^\/stake(?:\/|$)/i.test(routePath());
  }

  function routeLooksLikeStakeAction() {
    if (isStakeRoute() && !isStakeOverviewRoute()) return true;
    var text = clean(document.body && (document.body.innerText || document.body.textContent));
    return /\b(Delegate|Redelegate|Undelegate|Balance after tx|Leave coins to pay fees)\b/i.test(text);
  }

  function updateRouteAttribute() {
    if (isStakeOverviewRoute()) document.documentElement.setAttribute(ROUTE_ATTR, "overview");
    else if (routeLooksLikeStakeAction()) document.documentElement.setAttribute(ROUTE_ATTR, "action");
    else document.documentElement.removeAttribute(ROUTE_ATTR);
  }

  function removeOverviewRoot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll("[" + ROOT_ATTR + "]"));
    roots.forEach(function (root) {
      if (root && root.parentNode) root.parentNode.removeChild(root);
    });
    Array.prototype.slice.call(document.querySelectorAll("[" + NATIVE_STAKE_ATTR + "]")).forEach(function (node) {
      node.removeAttribute(NATIVE_STAKE_ATTR);
    });
    if (renderedMain) renderedMain.removeAttribute("data-do-wallet-staking-owned-main");
    renderedMain = null;
  }

  function serviceChains() {
    try {
      var service = window.doWalletMultichainAssets;
      var chains = service && typeof service.chains === "function" ? service.chains() : null;
      if (isObject(chains) && Object.keys(chains).length) return chains;
    } catch (error) {}
    return {};
  }

  function allChains() {
    var chains = {};
    Object.keys(CHAIN_META).forEach(function (chainID) {
      chains[chainID] = Object.assign({ chainID: chainID }, CHAIN_META[chainID]);
    });
    var dynamic = serviceChains();
    Object.keys(dynamic).forEach(function (chainID) {
      var canonical = canonicalChainID(chainID);
      chains[canonical] = Object.assign({}, chains[canonical] || {}, dynamic[chainID] || {}, { chainID: canonical });
    });
    return chains;
  }

  function requestPortfolioRefresh() {
    if (refreshRequested) return;
    refreshRequested = true;
    try {
      var service = window.doWalletMultichainAssets;
      if (service && typeof service.loadChainCatalog === "function") service.loadChainCatalog();
      if (service && typeof service.run === "function") service.run();
    } catch (error) {}
    window.setTimeout(function () { refreshRequested = false; }, 5000);
  }

  function chainMeta(chainID) {
    chainID = canonicalChainID(chainID);
    return allChains()[chainID] || CHAIN_META[chainID] || { chainID: chainID, name: chainID || "Unknown chain", symbol: "", denom: "", decimals: 6, icon: "" };
  }

  function chainName(chainID, chain) {
    return clean(chain && (chain.name || chain.chainName || chain.label)) || chainMeta(chainID).name || chainID;
  }

  function chainIcon(chainID, chain) {
    return clean(chain && (chain.icon || chain.logo || chain.image)) || chainMeta(chainID).icon || "";
  }

  function nativeDenom(chainID, chain) {
    return lower(chain && (chain.baseAsset || chain.denom || chain.token || chain.minimalDenom)) ||
      lower(chainMeta(chainID).denom) ||
      "";
  }

  function decimalsForDenom(chainID, chain, denom) {
    denom = lower(denom);
    if (denom === "inj" || denom === "wei") return 18;
    if (denom === "lamports") return 9;
    var decimals = Number(chain && chain.decimals);
    if (Number.isFinite(decimals)) return decimals;
    decimals = Number(chainMeta(chainID).decimals);
    return Number.isFinite(decimals) ? decimals : 6;
  }

  function symbolForDenom(chainID, chain, denom) {
    denom = lower(denom);
    if (chainID === "phoenix-1" && denom === "uluna") return "LUNA";
    var symbol = upper(chain && (chain.symbol || chain.tokenSymbol || chain.ticker || ""));
    if (denom && DENOM_SYMBOLS[denom]) return DENOM_SYMBOLS[denom];
    if (symbol) return symbol === "UDO" ? "DO" : symbol;
    return upper(chainMeta(chainID).symbol || denom.replace(/^u/, ""));
  }

  function denomOf(row) {
    var direct = lower(row && (row.denom || row.token || row.baseDenom || row.tokenDenom || row.minimalDenom || row.contract));
    if (direct) return direct;
    var id = lower(row && row.id);
    var denoms = Object.keys(DENOM_SYMBOLS).sort(function (a, b) { return b.length - a.length; });
    for (var index = 0; index < denoms.length; index += 1) {
      if (new RegExp("(^|[^a-z0-9])" + denoms[index] + "([^a-z0-9]|$)", "i").test(id)) return denoms[index];
    }
    return "";
  }

  function categoryOf(row) {
    var category = lower(row && (row.category || row.type || row.assetType || ""));
    var name = lower(row && row.name);
    if (!category && /^staked\b/.test(name)) category = "staking";
    if (!category && /^rewards?\b/.test(name)) category = "reward";
    if (!category && /^unbonding\b/.test(name)) category = "unbonding";
    return category || "wallet";
  }

  function chainIDOf(row) {
    var raw = row && (row.chainID || row.chainId || row.network || row.chain || row.chainKey || row.chainName || row.networkName);
    var denom = denomOf(row);
    var name = lower(row && row.name);
    if (!raw && (denom === "udo" || denom === "udodx" || /\bdo\s+(chain|token)\b/.test(name))) raw = "Do-Chain";
    if (!raw && (denom === "uluna" || /^terra classic/.test(name))) raw = "columbus-5";
    if (!raw && denom === "uosmo") raw = "osmosis-1";
    return canonicalChainID(raw);
  }

  function amountFromAsset(row) {
    var directKeys = ["amount", "quantity", "balance", "displayAmount", "tokenAmount", "amountValue", "amountText", "balanceText", "quantityText"];
    for (var index = 0; index < directKeys.length; index += 1) {
      var value = row && row[directKeys[index]];
      if (value == null || value === "") continue;
      if (typeof value === "object" && value.amount != null) continue;
      var direct = numberFrom(value);
      if (direct > 0) return direct;
    }
    if (row && row.balance && typeof row.balance === "object") return numberFromCoin(row.balance, decimalsForDenom(chainIDOf(row), chainMeta(chainIDOf(row)), denomOf(row)));
    if (row && row.amount && typeof row.amount === "object") return numberFromCoin(row.amount, decimalsForDenom(chainIDOf(row), chainMeta(chainIDOf(row)), denomOf(row)));
    if (row && row.rawAmount != null) return Number(decimalString(row.rawAmount, Number(row.decimals) || 6)) || 0;
    return 0;
  }

  function symbolOf(row, chainID, denom) {
    var symbol = upper(row && (row.symbol || row.tokenSymbol || row.ticker || ""));
    if (symbol === "UDO") return "DO";
    if (symbol) return symbol;
    return symbolForDenom(chainID, chainMeta(chainID), denom);
  }

  function validatorCountOf(row) {
    var direct = Number(row && row.validatorCount);
    if (Number.isFinite(direct) && direct > 0) return direct;
    if (Array.isArray(row && row.validators)) return row.validators.length;
    if (Array.isArray(row && row.validatorDelegations)) return row.validatorDelegations.length;
    if (isObject(row && row.validatorDelegationsByAddress)) return Object.keys(row.validatorDelegationsByAddress).length;
    return 0;
  }

  function iconOf(row, chainID) {
    return clean(row && (row.chainIcon || row.icon || row.logo || row.image)) || chainIcon(chainID, chainMeta(chainID));
  }

  function normalizeStakeRow(row) {
    if (!isObject(row)) return null;
    var category = categoryOf(row);
    if (!/^(staking|staked|reward|rewards|unbonding)$/.test(category)) return null;
    category = category === "staked" ? "staking" : category === "rewards" ? "reward" : category;
    var chainID = chainIDOf(row);
    var denom = denomOf(row) || nativeDenom(chainID, chainMeta(chainID));
    var symbol = symbolOf(row, chainID, denom);
    if (!symbol || /^[0-9.]+$/.test(symbol)) return null;
    var amount = amountFromAsset(row);
    var value = numberFrom(row && (row.valueUsd || row.groupedValueUsd || row.value || row.usdValue || row.usd || row.valueText || row.usdValueText));
    var price = numberFrom(row && (row.priceUsd || row.usdPrice || row.price || row.unitPrice));
    if (!(value > 0) && amount > 0 && price > 0) value = amount * price;
    return {
      category: category,
      chainID: chainID,
      chainName: clean(row.chainName || row.networkName || row.chainLabel || row.networkLabel) || chainName(chainID, chainMeta(chainID)),
      denom: denom,
      symbol: symbol,
      name: clean(row.displayName || row.name || row.label) ||
        (category === "staking" ? "Staked " + symbol : category === "reward" ? "Rewards " + symbol : "Unbonding " + symbol),
      amount: amount,
      amountText: clean(row.displayAmount || row.amountText || row.balanceText || row.quantityText) || formatToken(amount, symbol),
      value: value,
      valueText: clean(row.valueText || row.usdValueText || row.fiatValueText || row.valueFormatted) || formatUSD(value),
      icon: iconOf(row, chainID),
      validatorCount: validatorCountOf(row),
      raw: row
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

  function activeWalletPayloads() {
    return [
      readJSON("do-wallet-selected-recovered-wallet.v1", null),
      readJSON("user", null),
      readJSON("do-wallet-bridge-wallet", null),
      readJSON("do-wallet-extension-authority.v1", null)
    ];
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
    return keys.map(lower).filter(Boolean).filter(function (key, index, list) { return list.indexOf(key) === index; });
  }

  function activeWalletKeys() {
    var keys = [];
    activeWalletPayloads().forEach(function (payload) {
      keys = keys.concat(walletIdentityKeys(payload));
    });
    return keys.filter(Boolean).filter(function (key, index, list) { return list.indexOf(key) === index; });
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
    return keys.filter(Boolean).filter(function (key, index, list) { return list.indexOf(key) === index; });
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

  function assetAllowed(row) {
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
    return uniqueRows(rawStakeRowsFromSnapshots().map(normalizeStakeRow).filter(function (row) {
      return row && assetAllowed(row) && (row.amount > 0 || row.value > 0 || row.amountText);
    }));
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

  function collectStakeQueries() {
    var chains = allChains();
    var out = [];
    var seen = {};
    function add(chainID, address) {
      chainID = canonicalChainID(chainID);
      var chain = chains[chainID];
      address = clean(address);
      if (!chainID || !chain || !isCosmosStakeChain(chainID, chain) || !addressMatchesChain(chainID, chain, address)) return;
      var key = chainID + ":" + lower(address);
      if (seen[key]) return;
      seen[key] = true;
      out.push({ chainID: chainID, chain: chain, address: address });
    }
    function addMatching(address) {
      Object.keys(chains).forEach(function (chainID) { add(chainID, address); });
    }
    function addMap(map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        var chainID = canonicalChainID(key);
        if (chains[chainID]) add(chainID, map[key]);
        else addMatching(map[key]);
      });
    }
    activeWalletPayloads().forEach(function (payload) {
      var wallet = walletFromPayload(payload);
      if (!isObject(wallet)) return;
      addMatching(wallet.address);
      add("Do-Chain", wallet.doAddress || wallet.doChainAddress);
      addMap(wallet.addresses);
      addMap(wallet.addressMap);
    });
    collectSnapshots().forEach(function (snapshot) {
      addMap(snapshot.addresses);
      addMap(snapshot.activeAddresses);
      addMap(snapshot.allAddresses);
    });
    rawStakeRowsFromSnapshots().forEach(function (row) {
      add(chainIDOf(row), row && (row.walletAddress || row.address));
    });
    return out.slice(0, 160);
  }

  function fetchJSON(url) {
    return window.fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } }).then(function (response) {
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

  function valueForAmount(amount, denom, chainID) {
    var rows = snapshotStakeRows();
    for (var index = 0; index < rows.length; index += 1) {
      var row = rows[index];
      if (row.chainID !== chainID || row.denom !== denom || !(row.amount > 0) || !(row.value > 0)) continue;
      return amount * (row.value / row.amount);
    }
    return amount * (Number(chainMeta(chainID).price) || 0);
  }

  function stakeRow(category, query, denom, amount, validators) {
    if (!(amount > 0)) return null;
    var chainID = query.chainID;
    var chain = query.chain || chainMeta(chainID);
    denom = lower(denom || nativeDenom(chainID, chain));
    var symbol = symbolForDenom(chainID, chain, denom);
    var value = valueForAmount(amount, denom, chainID);
    return {
      category: category,
      chainID: chainID,
      chainName: chainName(chainID, chain),
      denom: denom,
      symbol: symbol,
      name: category === "staking" ? "Staked " + symbol : category === "reward" ? "Rewards " + symbol : "Unbonding " + symbol,
      amount: amount,
      amountText: formatToken(amount, symbol),
      value: value,
      valueText: formatUSD(value),
      icon: chainIcon(chainID, chain),
      validatorCount: Object.keys(validators || {}).length,
      raw: {
        chainID: chainID,
        chainName: chainName(chainID, chain),
        denom: denom,
        symbol: symbol,
        category: category,
        walletAddress: query.address,
        validators: Object.keys(validators || {})
      }
    };
  }

  function aggregateCoins(coins, category, query, validators) {
    var byDenom = {};
    (Array.isArray(coins) ? coins : []).forEach(function (coin) {
      var denom = lower(coin && coin.denom) || nativeDenom(query.chainID, query.chain);
      if (!denom) return;
      byDenom[denom] = (byDenom[denom] || 0) + numberFromCoin(coin, decimalsForDenom(query.chainID, query.chain, denom));
    });
    return Object.keys(byDenom).map(function (denom) {
      return stakeRow(category, query, denom, byDenom[denom], validators);
    }).filter(Boolean);
  }

  function validatorFromDelegation(entry) {
    return clean(entry && entry.delegation && entry.delegation.validator_address) || clean(entry && entry.validator_address);
  }

  function fetchStakeRows(query) {
    var encoded = encodeURIComponent(query.address);
    return Promise.all([
      fetchJSONSafe(lcdURL(query.chainID, "/cosmos/staking/v1beta1/delegations/" + encoded + "?pagination.limit=2000")),
      fetchJSONSafe(lcdURL(query.chainID, "/cosmos/distribution/v1beta1/delegators/" + encoded + "/rewards")),
      fetchJSONSafe(lcdURL(query.chainID, "/cosmos/staking/v1beta1/delegators/" + encoded + "/unbonding_delegations?pagination.limit=2000"))
    ]).then(function (responses) {
      var delegations = responses[0] || {};
      var rewards = responses[1] || {};
      var unbonding = responses[2] || {};
      var delegationRows = Array.isArray(delegations.delegation_responses) ? delegations.delegation_responses.slice() : [];
      var rewardEntries = Array.isArray(rewards.rewards) ? rewards.rewards : [];
      var rewardValidators = rewardEntries.map(function (entry) { return clean(entry && entry.validator_address); }).filter(Boolean);
      function finish(entries) {
        var validators = {};
        var stakedCoins = [];
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
          var validator = validatorFromDelegation(entry);
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
            if (release && release.balance) unbondingCoins.push({ denom: nativeDenom(query.chainID, query.chain), amount: release.balance });
          });
        });
        return aggregateCoins(stakedCoins, "staking", query, validators)
          .concat(aggregateCoins(Array.isArray(rewards.total) ? rewards.total : [], "reward", query, validators))
          .concat(aggregateCoins(unbondingCoins, "unbonding", query, validators));
      }
      if (!delegationRows.length && rewardValidators.length) {
        return Promise.all(rewardValidators.map(function (validator) {
          return fetchJSONSafe(lcdURL(query.chainID, "/cosmos/staking/v1beta1/validators/" + encodeURIComponent(validator) + "/delegations/" + encoded))
            .then(function (json) { return json && json.delegation_response ? json.delegation_response : null; });
        })).then(function (validatorDelegations) {
          validatorDelegations.forEach(function (entry) {
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

  function directRowsSignature(rows) {
    return uniqueRows(rows).sort(function (a, b) {
      return rowKey(a).localeCompare(rowKey(b));
    }).map(function (row) {
      return rowKey(row) + ":" + row.amountText + ":" + row.valueText;
    }).join("||");
  }

  function ensureDirectRows() {
    if (!isStakeOverviewRoute()) return;
    var queries = collectStakeQueries();
    var key = queries.map(function (query) { return query.chainID + ":" + lower(query.address); }).join("|");
    if (!key || key === directFetchKey || directFetching) return;
    directFetchKey = key;
    directFetching = true;
    runLimited(queries, 3, fetchStakeRows).then(function (sets) {
      var rows = [];
      sets.forEach(function (set) { rows = rows.concat(set || []); });
      var nextRows = uniqueRows(rows);
      var changed = directRowsSignature(nextRows) !== directRowsSignature(directRows);
      directRows = nextRows;
      directFetching = false;
      if (changed && isStakeOverviewRoute()) scheduleRender(80);
    }, function () {
      directFetching = false;
    });
  }

  function queueDirectRows(delay) {
    window.clearTimeout(directFetchTimer);
    directFetchTimer = window.setTimeout(function () {
      directFetchTimer = 0;
      ensureDirectRows();
    }, delay == null ? 300 : delay);
  }

  function stakeRows() {
    return uniqueRows(snapshotStakeRows().concat(directRows)).sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.name.localeCompare(b.name);
    });
  }

  function rowsForCurrentSelection(rows) {
    var chain = selectedChain();
    if (chain === "all") return rows;
    var filtered = rows.filter(function (row) { return row.chainID === chain; });
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
      if (row.category !== category || !row.symbol) return;
      bySymbol[row.symbol] = (bySymbol[row.symbol] || 0) + (Number(row.amount) || 0);
    });
    var symbols = Object.keys(bySymbol).filter(function (symbol) { return bySymbol[symbol] > 0; });
    if (!symbols.length) return "0 assets";
    if (symbols.length === 1) return formatToken(bySymbol[symbols[0]], symbols[0]);
    return symbols.length + " assets";
  }

  function chainsFromRows(rows) {
    var map = {};
    rows.forEach(function (row) {
      if (!row.chainID) return;
      if (!map[row.chainID]) {
        map[row.chainID] = {
          chainID: row.chainID,
          name: row.chainName || chainName(row.chainID, chainMeta(row.chainID)),
          value: 0,
          icon: row.icon || chainIcon(row.chainID, chainMeta(row.chainID))
        };
      }
      map[row.chainID].value += Number(row.value || 0) || 0;
      if (!map[row.chainID].icon && row.icon) map[row.chainID].icon = row.icon;
    });
    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return b.value - a.value || a.name.localeCompare(b.name);
    });
  }

  function chartStyle(rows) {
    var chains = chainsFromRows(rows);
    var total = chains.reduce(function (sum, chain) { return sum + Math.max(0, chain.value); }, 0);
    if (!(total > 0)) return "background:rgba(123,149,242,.35)";
    var current = 0;
    var parts = [];
    chains.forEach(function (chain, index) {
      var start = current;
      current += (Math.max(0, chain.value) / total) * 360;
      parts.push(CHART_COLORS[index % CHART_COLORS.length] + " " + start.toFixed(2) + "deg " + current.toFixed(2) + "deg");
    });
    return "background:conic-gradient(" + parts.join(",") + ")";
  }

  function iconHTML(src, label, className) {
    className = className || "do-wallet-staking-icon";
    if (!src) return '<span class="' + className + ' do-wallet-staking-icon-fallback">' + escapeHTML(clean(label).slice(0, 3) || "?") + '</span>';
    return '<img class="' + className + '" src="' + escapeHTML(src) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';" />';
  }

  function chainOptionsHTML(chains) {
    var current = selectedChain();
    var html = ['<option value="all">All staking chains</option>'];
    chains.forEach(function (chain) {
      html.push('<option value="' + escapeHTML(chain.chainID) + '"' + (current === chain.chainID ? " selected" : "") + '>' + escapeHTML(chain.name) + '</option>');
    });
    return html.join("");
  }

  function summaryCard(label, value, subtext) {
    return '<article class="do-wallet-staking-summary-card"><span>' + escapeHTML(label) + '</span><strong>' + escapeHTML(formatUSD(value)) + '</strong><small>' + escapeHTML(subtext) + '</small></article>';
  }

  function positionRow(row) {
    var validatorText = row.validatorCount > 0 ? " - " + row.validatorCount + (row.validatorCount === 1 ? " validator" : " validators") : "";
    return [
      '<div class="do-wallet-staking-position">',
        '<div class="do-wallet-staking-position-main">',
          iconHTML(row.icon, row.symbol),
          '<span><strong>' + escapeHTML(row.name) + '</strong><small>' + escapeHTML(row.chainName + validatorText) + '</small></span>',
        '</div>',
        '<div class="do-wallet-staking-position-value">',
          '<strong>' + escapeHTML(row.valueText || formatUSD(row.value)) + '</strong>',
          '<small>' + escapeHTML(row.amountText || formatToken(row.amount, row.symbol)) + '</small>',
          '<em>' + escapeHTML(CATEGORY_LABELS[row.category] || row.category) + '</em>',
        '</div>',
      '</div>'
    ].join("");
  }

  function emptyStateHTML() {
    var loading = directFetching ? "Checking staking on all wallet chains..." : "No staking positions found for this wallet yet.";
    return '<div class="do-wallet-staking-empty"><strong>' + escapeHTML(loading) + '</strong><small>Delegations, rewards, and unbonding across wallet addresses</small></div>';
  }

  function portfolioValueNumber(row) {
    return numberFrom(row && (row.valueUsd || row.groupedValueUsd || row.value || row.usdValue || row.fiatValue || row.usd || row.valueText || row.usdValueText || row.fiatValueText || row.valueFormatted));
  }

  function portfolioPriceText(row) {
    var text = clean(row && (row.priceText || row.usdPriceText || row.priceFormatted || row.unitPriceText));
    if (text) return text;
    var value = numberFrom(row && (row.priceUsd || row.usdPrice || row.price || row.unitPrice));
    return value > 0 ? formatUSD(value) : "";
  }

  function portfolioChangeText(row) {
    var text = clean(row && (row.changeText || row.priceChangeText || row.percentText || row.change24hText || row.priceChange24hText));
    if (text) return text;
    var value = Number(row && (row.change24h || row.percentChange24h || row.priceChangePercent || row.priceChangePercent24h || row.changePercent));
    if (!Number.isFinite(value) || value === 0) return "";
    return (value > 0 ? "+" : "") + value.toFixed(2) + "%";
  }

  function portfolioAmountText(row, amount, symbol) {
    var text = clean(row && (row.displayAmount || row.amountText || row.balanceText || row.quantityText));
    if (text) return text;
    return amount > 0 ? formatToken(amount, symbol) : "";
  }

  function portfolioAssetName(row, symbol, category) {
    var name = clean(row && (row.displayName || row.name || row.label)) || symbol;
    if (/^(staking|staked)$/.test(category) && !/^staked\b/i.test(name)) return "Staked " + symbol;
    if (/^(reward|rewards)$/.test(category) && !/^rewards?\b/i.test(name)) return "Rewards " + symbol;
    if (category === "unbonding" && !/^unbonding\b/i.test(name)) return "Unbonding " + symbol;
    return name;
  }

  function normalizePortfolioRow(row, index) {
    if (!isObject(row)) return null;
    var chainID = chainIDOf(row);
    var chain = chainMeta(chainID);
    var denom = denomOf(row) || nativeDenom(chainID, chain);
    var symbol = symbolOf(row, chainID, denom);
    if (!symbol || /^[0-9.]+$/.test(symbol)) return null;
    var category = categoryOf(row);
    var amount = amountFromAsset(row);
    var value = portfolioValueNumber(row);
    var price = numberFrom(row && (row.priceUsd || row.usdPrice || row.price || row.unitPrice));
    if (!(value > 0) && amount > 0 && price > 0) value = amount * price;
    var normalized = {
      index: Number(index) || 0,
      chainID: chainID,
      chainName: clean(row.chainName || row.networkName || row.chainLabel || row.networkLabel) || chainName(chainID, chain),
      denom: denom || symbol,
      symbol: symbol,
      name: portfolioAssetName(row, symbol, category),
      category: category,
      amount: amount,
      amountText: portfolioAmountText(row, amount, symbol),
      value: value,
      valueText: clean(row.valueText || row.usdValueText || row.fiatValueText || row.valueFormatted) || formatUSD(value),
      priceText: portfolioPriceText(row),
      changeText: portfolioChangeText(row),
      icon: iconOf(row, chainID),
      chainIcon: clean(row && row.chainIcon) || chainIcon(chainID, chain),
      raw: row
    };
    if (!assetAllowed(normalized)) return null;
    if (normalized.value > 0 || normalized.amount > 0 || normalized.amountText) return normalized;
    if (normalized.symbol === "DO" && normalized.chainID === "Do-Chain") return normalized;
    return null;
  }

  function portfolioRowKey(row) {
    return [row.chainID, row.category, lower(row.denom || row.symbol), row.symbol, lower(row.name)].join("|");
  }

  function betterPortfolioRow(left, right) {
    if (!left) return right;
    if (!right) return left;
    if ((right.valueText && right.valueText !== "$-") !== (left.valueText && left.valueText !== "$-")) return right.valueText && right.valueText !== "$-" ? right : left;
    if ((right.amountText && right.amountText.length) !== (left.amountText && left.amountText.length)) return right.amountText ? right : left;
    if (right.value !== left.value) return right.value > left.value ? right : left;
    if (right.amount !== left.amount) return right.amount > left.amount ? right : left;
    return right.index < left.index ? right : left;
  }

  function uniquePortfolioRows(rows) {
    var byKey = {};
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      if (!row) return;
      byKey[portfolioRowKey(row)] = betterPortfolioRow(byKey[portfolioRowKey(row)], row);
    });
    return Object.keys(byKey).map(function (key) { return byKey[key]; });
  }

  function portfolioRows() {
    var out = [];
    var order = 0;
    spendableRowsFromSnapshots().forEach(function (row) {
      var normalized = normalizePortfolioRow(row, order += 1);
      if (normalized) out.push(normalized);
    });
    snapshotStakeRows().concat(directRows).forEach(function (row) {
      var normalized = normalizePortfolioRow(row.raw || row, order += 1);
      if (!normalized && row) normalized = Object.assign({ index: order, chainIcon: row.icon }, row);
      if (normalized) out.push(normalized);
    });
    return uniquePortfolioRows(out);
  }

  function portfolioCategoryRank(category) {
    if (category === "wallet" || category === "asset" || category === "balance" || category === "spendable") return 0;
    if (category === "staking" || category === "staked") return 1;
    if (category === "reward" || category === "rewards") return 2;
    if (category === "unbonding") return 3;
    return 4;
  }

  function portfolioGroups() {
    var groups = {};
    portfolioRows().forEach(function (row) {
      var chainID = row.chainID || chainIDOf(row);
      if (!chainID) return;
      var meta = chainMeta(chainID);
      if (!groups[chainID]) {
        groups[chainID] = {
          key: chainID,
          name: chainName(chainID, meta),
          nativeSymbol: symbolForDenom(chainID, meta, nativeDenom(chainID, meta)),
          icon: row.chainIcon || chainIcon(chainID, meta) || row.icon,
          firstIndex: row.index,
          assetsByKey: {}
        };
      }
      var group = groups[chainID];
      group.firstIndex = Math.min(group.firstIndex, row.index);
      if (!group.icon && (row.chainIcon || row.icon)) group.icon = row.chainIcon || row.icon;
      group.assetsByKey[portfolioRowKey(row)] = betterPortfolioRow(group.assetsByKey[portfolioRowKey(row)], row);
    });
    return Object.keys(groups).map(function (key) {
      var group = groups[key];
      var assets = Object.keys(group.assetsByKey).map(function (assetKey) {
        return group.assetsByKey[assetKey];
      }).sort(function (left, right) {
        var leftNative = upper(left.symbol) === upper(group.nativeSymbol) ? -1 : 0;
        var rightNative = upper(right.symbol) === upper(group.nativeSymbol) ? -1 : 0;
        return (leftNative - rightNative) ||
          (portfolioCategoryRank(left.category) - portfolioCategoryRank(right.category)) ||
          (Number(right.value || 0) - Number(left.value || 0)) ||
          upper(left.symbol).localeCompare(upper(right.symbol)) ||
          clean(left.name).localeCompare(clean(right.name));
      });
      var total = assets.reduce(function (sum, asset) { return sum + (Number(asset.value) || 0); }, 0);
      return Object.assign({}, group, {
        assets: assets,
        totalValue: total,
        totalValueText: formatUSD(total)
      });
    }).filter(function (group) {
      return group.assets.length > 0;
    }).sort(function (left, right) {
      var leftValue = left.totalValue > 0 ? 0 : 1;
      var rightValue = right.totalValue > 0 ? 0 : 1;
      return (leftValue - rightValue) || (right.totalValue - left.totalValue) || (left.firstIndex - right.firstIndex) || left.name.localeCompare(right.name);
    });
  }

  function nativePortfolioAsset(group) {
    var native = upper(group && group.nativeSymbol);
    var assets = Array.isArray(group && group.assets) ? group.assets : [];
    return assets.filter(function (asset) { return upper(asset.symbol) === native; })[0] || assets[0] || null;
  }

  function portfolioGroupRowHTML(group) {
    var native = nativePortfolioAsset(group) || {};
    var count = group.assets.length === 1 ? "1 asset" : group.assets.length + " assets";
    var amount = clean(native.amountText);
    var change = clean(native.changeText);
    var changeClass = change.indexOf("-") >= 0 ? "negative" : "positive";
    return [
      '<article class="do-wallet-staking-portfolio-asset">',
        '<div class="do-wallet-staking-portfolio-left">',
          iconHTML(group.icon || native.icon, group.nativeSymbol, "do-wallet-staking-portfolio-icon"),
          '<span><strong>' + escapeHTML(group.name) + (native.priceText ? ' <small>' + escapeHTML(native.priceText) + '</small>' : '') + '</strong>' + (change ? '<em class="' + changeClass + '">' + escapeHTML(change) + '</em>' : '<small>' + escapeHTML(count) + '</small>') + '</span>',
        '</div>',
        '<div class="do-wallet-staking-portfolio-right">',
          '<strong>' + escapeHTML(group.totalValueText) + '</strong>',
          '<small>' + escapeHTML(amount || count) + '</small>',
        '</div>',
      '</article>'
    ].join("");
  }

  function portfolioActionIconHTML(type) {
    var attrs = 'viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
    var icons = {
      send: '<svg ' + attrs + '><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4 20-7z"></path></svg>',
      receive: '<svg ' + attrs + '><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>',
      buy: '<svg ' + attrs + '><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18"></path><path d="M7 15h3"></path></svg>',
      burn: '<svg ' + attrs + '><path d="M8.5 14.5A3.5 3.5 0 0 0 12 20a3.5 3.5 0 0 0 3.5-5.5c-.7-1.1-1.9-1.9-1.9-3.5-1.7 1-2.2 2.4-2 4-1.4-.6-2.3-1.7-2.5-3.4-.9.8-1.4 1.8-1.4 3"></path><path d="M12 2c.6 2.7 2.6 4 4.1 5.6 1.4 1.5 2.4 3.2 2.4 5.4A6.5 6.5 0 0 1 12 19.5 6.5 6.5 0 0 1 5.5 13c0-2.2 1.1-4.1 2.7-5.7"></path></svg>'
    };
    return icons[type] || "";
  }

  function portfolioActionHTML(type, href, label, primary) {
    return '<a class="do-wallet-staking-portfolio-action' + (primary ? ' is-primary' : '') + '" href="' + escapeHTML(href) + '" aria-label="' + escapeHTML(label) + '"><span>' + portfolioActionIconHTML(type) + '</span><small>' + escapeHTML(label) + '</small></a>';
  }

  function portfolioRailHTML(groups) {
    groups = Array.isArray(groups) ? groups : portfolioGroups();
    var total = groups.reduce(function (sum, group) { return sum + (Number(group.totalValue) || 0); }, 0);
    return [
      '<aside class="do-wallet-staking-portfolio" aria-label="Portfolio value">',
        '<section class="do-wallet-staking-portfolio-top">',
          '<span>Portfolio value</span>',
          '<strong>' + escapeHTML(formatUSD(total)) + '</strong>',
          '<div class="do-wallet-staking-portfolio-actions">',
            portfolioActionHTML("send", "/send", "Send", true),
            portfolioActionHTML("receive", "/receive", "Receive", false),
            portfolioActionHTML("buy", "/buy-sell", "Buy / Sell", false),
            portfolioActionHTML("burn", "/burn", "Burn DO", false),
          '</div>',
        '</section>',
        '<section class="do-wallet-staking-portfolio-assets">',
          '<div class="do-wallet-staking-portfolio-assets-head"><h2>Assets</h2><a href="/wallet">Manage</a></div>',
          groups.length ? groups.map(portfolioGroupRowHTML).join("") : '<div class="do-wallet-staking-portfolio-empty">No assets found</div>',
        '</section>',
      '</aside>'
    ].join("");
  }

  function overviewHTML(rows, groups) {
    groups = Array.isArray(groups) ? groups : portfolioGroups();
    var chainList = chainsFromRows(rows);
    if (selectedChain() !== "all" && !chainList.some(function (chain) { return chain.chainID === selectedChain(); })) setSelectedChain("all");
    var scoped = rowsForCurrentSelection(rows);
    var total = totals(scoped);
    var totalValue = total.staking + total.reward + total.unbonding;
    var legend = chainsFromRows(scoped).map(function (chain, index) {
      return '<span><i style="background:' + CHART_COLORS[index % CHART_COLORS.length] + '"></i>' + escapeHTML(chain.name) + '</span>';
    }).join("");
    return [
      '<section ' + ROOT_ATTR + '="' + escapeHTML(VERSION) + '" class="do-wallet-staking-page">',
        '<div class="do-wallet-staking-layout">',
          '<div class="do-wallet-staking-main">',
            '<header class="do-wallet-staking-page-head">',
              '<div><h1>Stake</h1><p>Delegations, rewards, and unbonding across wallet addresses</p></div>',
              '<button type="button" class="do-wallet-staking-withdraw" data-do-wallet-staking-refresh>Refresh staking</button>',
            '</header>',
            '<section class="do-wallet-staking-card">',
              '<div class="do-wallet-staking-card-head">',
                '<div><h2>Staked funds</h2><p>Delegations, unbonding, and rewards across wallet addresses</p></div>',
                '<strong>' + escapeHTML(formatUSD(totalValue)) + '</strong>',
              '</div>',
              '<div class="do-wallet-staking-filter">',
                '<label for="do-wallet-staking-chain">Network</label>',
                '<span><select id="do-wallet-staking-chain" aria-label="Stake network">' + chainOptionsHTML(chainList) + '</select></span>',
              '</div>',
              '<div class="do-wallet-staking-body">',
                '<div class="do-wallet-staking-chart-wrap">',
                  '<div class="do-wallet-staking-chart" style="' + escapeHTML(chartStyle(scoped)) + '"></div>',
                  '<div class="do-wallet-staking-legend">' + legend + '</div>',
                '</div>',
                '<div class="do-wallet-staking-summaries">',
                  summaryCard("Delegations", total.staking, amountSummary(scoped, "staking")),
                  summaryCard("Undelegations", total.unbonding, amountSummary(scoped, "unbonding")),
                  summaryCard("Staking rewards", total.reward, amountSummary(scoped, "reward")),
                '</div>',
              '</div>',
              '<div class="do-wallet-staking-positions-head"><strong>Positions</strong><small>' + escapeHTML(scoped.length + " " + (scoped.length === 1 ? "position" : "positions")) + '</small></div>',
              '<div class="do-wallet-staking-positions">' + (scoped.length ? scoped.map(positionRow).join("") : emptyStateHTML()) + '</div>',
            '</section>',
            '<section class="do-wallet-staking-actions">',
              '<div><h2>Stake assets</h2><p>Validators and delegation actions</p></div>',
              '<a href="/validator" data-discover="true">Open validators</a>',
            '</section>',
            '</div>',
          portfolioRailHTML(groups),
        '</div>',
      '</section>'
    ].join("");
  }

  function stakeRowsSignature(rows) {
    return (Array.isArray(rows) ? rows : []).map(function (row) {
      return rowKey(row) + ":" + row.amountText + ":" + row.valueText;
    }).join("||");
  }

  function portfolioGroupsSignature(groups) {
    return (Array.isArray(groups) ? groups : []).map(function (group) {
      return [group.key, group.totalValueText, group.assets.length, group.assets.map(function (asset) {
        return portfolioRowKey(asset) + ":" + asset.amountText + ":" + asset.valueText;
      }).join(",")].join(":");
    }).join("||");
  }

  function bindOverviewControls(main) {
    var select = main.querySelector("#do-wallet-staking-chain");
    if (select) {
      select.value = selectedChain();
      select.addEventListener("change", function () {
        setSelectedChain(select.value || "all");
        scheduleRender(0);
      });
    }
    var refresh = main.querySelector("[data-do-wallet-staking-refresh]");
    if (refresh) {
      refresh.addEventListener("click", function () {
        directFetchKey = "";
        directRows = [];
        directRowsPrimed = true;
        refreshRequested = false;
        requestPortfolioRefresh();
        queueDirectRows(0);
        scheduleRender(100);
      });
    }
  }

  function maybePrimeDirectRows(rows) {
    if (directRowsPrimed || directFetching || directRows.length) return;
    if (Array.isArray(rows) && rows.length) return;
    if (!collectStakeQueries().length) return;
    directRowsPrimed = true;
    queueDirectRows(800);
  }

  function findMain() {
    var mains = Array.prototype.slice.call(document.querySelectorAll("main"));
    if (mains.length) return mains[0];
    return document.querySelector('[class*="Page_main__"],[class*="Layout_main__"]');
  }

  function elementText(node) {
    return clean(node && (node.innerText || node.textContent));
  }

  function looksLikeWalletPanel(node) {
    var text = elementText(node);
    return /\bPortfolio value\b/i.test(text) && /\bAssets\b/i.test(text) && /\bReceive\b/i.test(text);
  }

  function looksLikeNativeStakeContent(node) {
    if (!node || node.nodeType !== 1 || node.hasAttribute(ROOT_ATTR) || looksLikeWalletPanel(node)) return false;
    var text = elementText(node);
    if (!/\bStake\b/i.test(text)) return false;
    return /\b(Staked funds|Withdraw all rewards|Quick Stake|Manual Stake|Delegations|Undelegations|Staking rewards)\b/i.test(text);
  }

  function findNativeStakeHost(main) {
    var queue = Array.prototype.slice.call((main && main.children) || []);
    var fallback = null;
    for (var depth = 0; queue.length && depth < 120; depth += 1) {
      var node = queue.shift();
      if (!node || node.nodeType !== 1 || node.hasAttribute(ROOT_ATTR)) continue;
      if (looksLikeNativeStakeContent(node)) {
        fallback = node;
        var children = Array.prototype.slice.call(node.children || []).filter(looksLikeNativeStakeContent);
        if (!children.length) return node;
        queue = children.concat(queue);
      } else if (!looksLikeWalletPanel(node)) {
        queue = queue.concat(Array.prototype.slice.call(node.children || []));
      }
    }
    return fallback;
  }

  function renderOverview() {
    if (!isStakeOverviewRoute()) return;
    var main = findMain();
    if (!main) {
      scheduleRender(160);
      return;
    }
    var rows = stakeRows();
    var groups = portfolioGroups();
    var signature = VERSION + ":" + selectedChain() + ":" + (directFetching ? "loading" : "ready") + ":" + stakeRowsSignature(rows) + "::portfolio:" + portfolioGroupsSignature(groups);
    var root = main.querySelector("[" + ROOT_ATTR + "]");
    if (root && root.getAttribute(SIGNATURE_ATTR) === signature) {
      maybePrimeDirectRows(rows);
      return;
    }
    main.setAttribute("data-do-wallet-staking-owned-main", VERSION);
    renderedMain = main;
    main.innerHTML = overviewHTML(rows, groups);
    root = main.querySelector("[" + ROOT_ATTR + "]");
    if (root) root.setAttribute(SIGNATURE_ATTR, signature);
    bindOverviewControls(main);
    maybePrimeDirectRows(rows);
    try {
      window.__doWalletStakingAreaDebug = {
        version: VERSION,
        route: "overview",
        rows: rows.length,
        portfolioGroups: groups.length,
        directRows: directRows.length,
        directFetching: directFetching,
        selectedChain: selectedChain(),
        renderMode: "owned-main",
        updatedAt: new Date().toISOString()
      };
    } catch (error) {}
  }

  function spendableRowsFromSnapshots() {
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
    var rows = [];
    collectSnapshots().forEach(function (snapshot) {
      keys.forEach(function (key) {
        if (!Array.isArray(snapshot && snapshot[key])) return;
        snapshot[key].forEach(function (asset) { flattenAsset(asset, rows); });
      });
    });
    return rows;
  }

  function rowMatchesSymbol(row, symbol) {
    symbol = upper(symbol);
    var chainID = chainIDOf(row);
    var denom = denomOf(row);
    var rowSymbol = symbolOf(row, chainID, denom);
    if (symbol === "DO") return (denom === "udo" || rowSymbol === "DO") && (!chainID || chainID === "Do-Chain");
    if (symbol === "LUNC") return chainID === "columbus-5" && (denom === "uluna" || rowSymbol === "LUNC");
    return rowSymbol === symbol;
  }

  function isSpendable(row) {
    var category = categoryOf(row);
    if (/staking|staked|reward|rewards|unbonding|delegation/.test(category)) return false;
    if (/^(staked|rewards|unbonding)\b/i.test(clean(row && row.name))) return false;
    return true;
  }

  function spendableBalance(symbol) {
    var total = 0;
    var seen = {};
    spendableRowsFromSnapshots().forEach(function (row) {
      if (!rowMatchesSymbol(row, symbol) || !isSpendable(row)) return;
      var amount = amountFromAsset(row);
      if (!(amount > 0)) return;
      var key = [chainIDOf(row), denomOf(row) || symbolOf(row, chainIDOf(row), denomOf(row)), lower(row.walletAddress || row.address || "")].join("|");
      if (seen[key]) return;
      seen[key] = true;
      total += amount;
    });
    return total;
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

  function visibleTextElements(root) {
    return Array.prototype.slice.call((root || document).querySelectorAll("div,span,strong,small,p,button"))
      .filter(visible);
  }

  function hasVisibleElementChildren(node) {
    return Array.prototype.slice.call((node && node.children) || []).some(visible);
  }

  function selectedFormSymbol(root) {
    var text = clean(root && (root.innerText || root.textContent));
    var match = text.match(/\bAmount\b[\s\S]{0,180}\b([A-Z][A-Z0-9]{1,11})\b/i);
    if (match) return upper(match[1]);
    var symbols = ["DO", "LUNC", "OSMO", "ATOM", "JUNO", "AKT", "SCRT", "DGN", "HUAHUA", "STARS", "INJ"];
    for (var index = 0; index < symbols.length; index += 1) {
      if (new RegExp("\\b" + symbols[index] + "\\b", "i").test(text)) return symbols[index];
    }
    return "";
  }

  function nearestStakeForm(input) {
    var current = input;
    var best = null;
    for (var depth = 0; current && current !== document.body && depth < 16; depth += 1) {
      var text = clean(current.innerText || current.textContent);
      if (/\bAmount\b/i.test(text) && /\b(Delegate|Redelegate|Undelegate|Stake)\b/i.test(text) && current.querySelector && current.querySelector("input")) {
        best = current;
        if (/\bBalance after tx\b/i.test(text) && /\bFee\b/i.test(text)) return current;
      }
      current = current.parentElement;
    }
    return best;
  }

  function stakeForms() {
    var forms = [];
    var seen = [];
    Array.prototype.slice.call(document.querySelectorAll("input")).forEach(function (input) {
      if (!visible(input)) return;
      var type = lower(input.getAttribute("type"));
      if (type && type !== "text" && type !== "number") return;
      var root = nearestStakeForm(input);
      if (!root || seen.indexOf(root) >= 0) return;
      var text = clean(root.innerText || root.textContent);
      if (!/\bBalance\b/i.test(text) || !/\bAmount\b/i.test(text)) return;
      seen.push(root);
      forms.push(root);
    });
    return forms;
  }

  function amountInput(root, symbol) {
    var inputs = Array.prototype.slice.call(root.querySelectorAll("input")).filter(visible);
    return inputs.find(function (input) {
      var around = clean((input.closest && input.closest("label,div,section,article,form") || {}).innerText || "");
      return /\bAmount\b/i.test(around) || new RegExp("\\b" + symbol + "\\b", "i").test(around);
    }) || inputs[0] || null;
  }

  function amountInputValue(root, symbol) {
    var input = amountInput(root, symbol);
    return input ? numberFrom(input.value) : 0;
  }

  function feeForSymbol(root, symbol) {
    var text = clean(root && (root.innerText || root.textContent));
    var match = text.match(/\bFee\b[\s\S]{0,120}?(-?\d[\d,]*(?:\.\d+)?)\s+([A-Za-z][A-Za-z0-9]{1,11})\b/i);
    if (!match) return 0;
    return upper(match[2]) === upper(symbol) ? numberFrom(match[1]) : 0;
  }

  function formatAmount(value, symbol) {
    value = Number(value);
    if (!Number.isFinite(value) || Math.abs(value) < 0.0000005) value = 0;
    var digits = Math.abs(value) >= 1 ? 2 : 6;
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: digits }) + " " + symbol;
  }

  function setLeafText(root, pattern, nextText) {
    var changed = false;
    visibleTextElements(root).forEach(function (node) {
      if (hasVisibleElementChildren(node)) return;
      if (!pattern.test(clean(node.textContent))) return;
      if (clean(node.textContent) === nextText) return;
      node.textContent = nextText;
      changed = true;
    });
    return changed;
  }

  function labelRow(root, label) {
    var candidates = visibleTextElements(root);
    var exact = new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i");
    for (var index = 0; index < candidates.length; index += 1) {
      var node = candidates[index];
      if (!exact.test(clean(node.textContent))) continue;
      var current = node.parentElement;
      for (var depth = 0; current && current !== root && depth < 5; depth += 1) {
        var text = clean(current.innerText || current.textContent);
        if (new RegExp("\\b" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(text) && /\d/.test(text)) return current;
        current = current.parentElement;
      }
    }
    return null;
  }

  function patchRowAmount(row, symbol, amount) {
    if (!row) return false;
    var text = formatAmount(amount, symbol);
    return setLeafText(row, new RegExp("-?\\d[\\d,]*(?:\\.\\d+)?\\s+" + symbol + "$", "i"), text);
  }

  function patchStakeForm(root) {
    var symbol = selectedFormSymbol(root);
    if (!symbol) return false;
    var balance = spendableBalance(symbol);
    if (!(balance > 0)) return false;
    var amount = amountInputValue(root, symbol);
    var fee = feeForSymbol(root, symbol);
    var after = balance - amount - fee;
    var changed = false;
    root.setAttribute(BALANCE_ATTR, VERSION);
    changed = setLeafText(root, new RegExp("^0(?:\\.0+)?\\s+" + symbol + "$", "i"), formatAmount(balance, symbol)) || changed;
    changed = patchRowAmount(labelRow(root, "Balance"), symbol, balance) || changed;
    changed = patchRowAmount(labelRow(root, "Balance after tx"), symbol, after) || changed;
    Array.prototype.slice.call(root.querySelectorAll("div,span,p,small")).forEach(function (node) {
      if (!visible(node) || !/\bInsufficient balance\b/i.test(clean(node.innerText || node.textContent))) return;
      if (balance >= amount + fee) node.setAttribute("data-do-wallet-staking-balance-hidden", "1");
      else node.removeAttribute("data-do-wallet-staking-balance-hidden");
    });
    if (amount > 0 && balance >= amount + fee) {
      Array.prototype.slice.call(root.querySelectorAll("button")).forEach(function (button) {
        if (!/\bSubmit\b/i.test(clean(button.innerText || button.textContent))) return;
        button.disabled = false;
        button.removeAttribute("disabled");
        button.removeAttribute("aria-disabled");
        button.style.opacity = "";
        button.style.pointerEvents = "";
      });
    }
    try {
      window.__doWalletStakingAreaBalanceDebug = { version: VERSION, symbol: symbol, balance: balance, amount: amount, fee: fee, after: after };
    } catch (error) {}
    return changed;
  }

  function applyStakeBalances() {
    balanceTimer = 0;
    updateRouteAttribute();
    if (!routeLooksLikeStakeAction()) return;
    stakeForms().forEach(patchStakeForm);
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "html[" + ROUTE_ATTR + "='overview'],html[" + ROUTE_ATTR + "='overview'] body{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;}",
      "html[" + ROUTE_ATTR + "='overview'] #root,html[" + ROUTE_ATTR + "='overview'] #__next,html[" + ROUTE_ATTR + "='overview'] [class*='Layout'],html[" + ROUTE_ATTR + "='overview'] [class*='Page']{height:auto!important;max-height:none!important;overflow:visible!important;}",
      "html[" + ROUTE_ATTR + "='overview'] main,html[" + ROUTE_ATTR + "='overview'] [role='main'],html[" + ROUTE_ATTR + "='overview'] [data-do-wallet-staking-owned-main]{height:auto!important;max-height:none!important;max-width:none!important;min-height:calc(100vh - 80px)!important;overflow:visible!important;width:100%!important;}",
      "[" + NATIVE_STAKE_ATTR + "='1']{display:none!important;}",
      "[" + ROOT_ATTR + "],[" + ROOT_ATTR + "] *{box-sizing:border-box;}",
      "[" + ROOT_ATTR + "]{color:#fff;display:block;}",
      ".do-wallet-staking-page{container-type:inline-size;display:block;min-height:calc(100vh - 80px);padding:18px clamp(16px,2vw,32px) 48px;width:100%;}",
      ".do-wallet-staking-layout{align-items:stretch;display:grid;gap:0;grid-template-columns:minmax(0,1fr) minmax(360px,var(--wallet-width,420px));width:100%;}",
      ".do-wallet-staking-main{display:grid;gap:22px;min-width:0;}",
      ".do-wallet-staking-page-head{align-items:center;display:flex;gap:18px;justify-content:space-between;min-width:0;}",
      ".do-wallet-staking-page-head h1{font-size:36px;font-weight:var(--bold,500);letter-spacing:0;line-height:1.1;margin:0;}",
      ".do-wallet-staking-page-head p{color:#c9bbef;font-size:13px;font-weight:var(--bold,500);line-height:1.35;margin:7px 0 0;}",
      ".do-wallet-staking-withdraw,.do-wallet-staking-actions a{align-items:center;background:var(--button-primary-bg,#9b3dff);border:0;border-radius:999px;color:#fff;cursor:pointer;display:inline-flex;font-size:13px;font-weight:var(--bold,500);height:42px;justify-content:center;line-height:1;min-width:142px;padding:0 20px;text-decoration:none;white-space:nowrap;}",
      ".do-wallet-staking-card,.do-wallet-staking-actions{background:#181323;border:1px solid rgba(159,70,255,.38);border-radius:8px;overflow:hidden;}",
      ".do-wallet-staking-card-head{align-items:flex-start;border-bottom:1px solid rgba(159,70,255,.28);display:flex;gap:20px;justify-content:space-between;padding:24px 30px;}",
      ".do-wallet-staking-card-head h2,.do-wallet-staking-actions h2{font-size:22px;font-weight:var(--bold,500);letter-spacing:0;line-height:1.12;margin:0 0 6px;}",
      ".do-wallet-staking-card-head p,.do-wallet-staking-actions p{color:#c9bbef;font-size:13px;font-weight:var(--bold,500);line-height:1.35;margin:0;}",
      ".do-wallet-staking-card-head>strong{font-size:30px;font-weight:var(--bold,500);line-height:1;white-space:nowrap;}",
      ".do-wallet-staking-filter{align-items:center;border-bottom:1px solid rgba(159,70,255,.28);display:flex;gap:12px;padding:14px 30px;}",
      ".do-wallet-staking-filter label{color:#c9bbef;font-size:13px;font-weight:var(--bold,500);}",
      ".do-wallet-staking-filter span{display:inline-flex;min-width:270px;position:relative;}",
      ".do-wallet-staking-filter span:after{border-bottom:2px solid #c7b9ef;border-right:2px solid #c7b9ef;content:'';height:8px;pointer-events:none;position:absolute;right:16px;top:50%;transform:translateY(-65%) rotate(45deg);width:8px;}",
      ".do-wallet-staking-filter select{appearance:none;-webkit-appearance:none;background:#251b39;border:1px solid rgba(159,70,255,.52);border-radius:999px;color:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:var(--bold,500);min-height:38px;outline:none;padding:0 42px 0 16px;width:100%;}",
      ".do-wallet-staking-body{align-items:center;display:grid;gap:24px;grid-template-columns:minmax(190px,1fr) minmax(240px,360px);min-height:260px;padding:22px 30px;}",
      ".do-wallet-staking-chart-wrap{align-content:center;display:grid;gap:12px;justify-items:center;min-height:220px;}",
      ".do-wallet-staking-chart{aspect-ratio:1;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);position:relative;width:136px;}",
      ".do-wallet-staking-chart:after{background:#181125;border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.03);content:'';inset:28%;position:absolute;}",
      ".do-wallet-staking-legend{color:#c9bbef;display:flex;flex-wrap:wrap;font-size:13px;font-weight:var(--bold,500);gap:10px 18px;justify-content:center;}",
      ".do-wallet-staking-legend span{align-items:center;display:inline-flex;gap:7px;}",
      ".do-wallet-staking-legend i{border-radius:50%;display:inline-block;height:10px;width:10px;}",
      ".do-wallet-staking-summaries{display:grid;gap:14px;}",
      ".do-wallet-staking-summary-card{background:#171023;border:1px solid rgba(159,70,255,.42);border-radius:7px;min-height:86px;padding:15px 18px;}",
      ".do-wallet-staking-summary-card span{display:block;font-size:14px;font-weight:var(--bold,500);margin-bottom:10px;}",
      ".do-wallet-staking-summary-card strong{display:block;font-size:24px;font-weight:var(--bold,500);line-height:1;margin-bottom:7px;}",
      ".do-wallet-staking-summary-card small{color:#c9bbef;display:block;font-size:12px;font-weight:var(--bold,500);line-height:1.2;}",
      ".do-wallet-staking-positions-head{align-items:center;border-top:1px solid rgba(159,70,255,.28);display:flex;gap:16px;justify-content:space-between;padding:19px 30px;}",
      ".do-wallet-staking-positions-head strong{font-size:16px;font-weight:var(--bold,500);}",
      ".do-wallet-staking-positions-head small{color:#c9bbef;font-size:12px;font-weight:var(--bold,500);}",
      ".do-wallet-staking-positions{max-height:none;overflow:visible;}",
      ".do-wallet-staking-position{align-items:center;border-top:1px solid rgba(159,70,255,.24);display:flex;gap:18px;justify-content:space-between;min-height:76px;padding:14px 30px;}",
      ".do-wallet-staking-position-main{align-items:center;display:flex;gap:14px;min-width:0;}",
      ".do-wallet-staking-position-main span{display:flex;flex-direction:column;gap:5px;min-width:0;}",
      ".do-wallet-staking-position-main strong,.do-wallet-staking-position-value strong{font-size:15px;font-weight:var(--bold,500);line-height:1.12;}",
      ".do-wallet-staking-position-main small,.do-wallet-staking-position-value small,.do-wallet-staking-position-value em{color:#c9bbef;font-size:12px;font-style:normal;font-weight:var(--bold,500);line-height:1.1;}",
      ".do-wallet-staking-position-value{align-items:flex-end;display:flex;flex-direction:column;gap:4px;min-width:150px;text-align:right;}",
      ".do-wallet-staking-icon{background:#2c2140;border-radius:50%;height:38px;min-width:38px;object-fit:cover;width:38px;}",
      ".do-wallet-staking-icon-fallback{display:grid;font-size:10px;font-weight:var(--bold,500);place-items:center;}",
      ".do-wallet-staking-empty{align-items:center;color:#c9bbef;display:grid;gap:8px;justify-items:center;min-height:170px;padding:24px;text-align:center;}",
      ".do-wallet-staking-empty strong{color:#fff;font-size:16px;font-weight:var(--bold,500);}",
      ".do-wallet-staking-empty small{max-width:420px;}",
      ".do-wallet-staking-actions{align-items:center;display:flex;gap:20px;justify-content:space-between;padding:22px 30px;}",
      ".do-wallet-staking-portfolio{align-self:stretch;background:#1f1731;border-left:1px solid rgba(159,70,255,.28);display:flex;flex-direction:column;min-height:calc(100vh - 136px);min-width:0;overflow:hidden;position:relative;}",
      ".do-wallet-staking-portfolio-top{border-bottom:1px solid rgba(159,70,255,.28);padding:26px 20px 22px;text-align:center;}",
      ".do-wallet-staking-portfolio-top>span{color:#c9bbef;display:block;font-size:13px;font-weight:var(--bold,500);margin-bottom:8px;}",
      ".do-wallet-staking-portfolio-top>strong{display:block;font-size:34px;font-weight:var(--bold,500);line-height:1.05;margin-bottom:22px;}",
      ".do-wallet-staking-portfolio-actions{display:grid;gap:14px;grid-template-columns:repeat(4,minmax(0,1fr));}",
      ".do-wallet-staking-portfolio-action{align-items:center;color:#fff;display:flex;flex-direction:column;font-size:12px;font-weight:var(--bold,500);gap:9px;min-width:0;text-decoration:none;}",
      ".do-wallet-staking-portfolio-action:hover{text-decoration:none;}",
      ".do-wallet-staking-portfolio-action>span{align-items:center;background:#2e2541;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);display:flex;height:60px;justify-content:center;line-height:1;width:60px;}",
      ".do-wallet-staking-portfolio-action.is-primary>span{background:#9b3dff;box-shadow:0 12px 30px rgba(155,61,255,.25);}",
      ".do-wallet-staking-portfolio-action svg{fill:none;height:25px;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:2.35;width:25px;}",
      ".do-wallet-staking-portfolio-action small{display:block;font-size:12px;font-weight:var(--bold,500);line-height:1.12;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;}",
      ".do-wallet-staking-portfolio-assets{display:flex;flex:1;flex-direction:column;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:18px 12px 16px;}",
      ".do-wallet-staking-portfolio-assets-head{align-items:center;display:flex;gap:12px;justify-content:space-between;margin:0 0 12px;padding:0 6px;}",
      ".do-wallet-staking-portfolio-assets-head h2{font-size:15px;font-weight:var(--bold,500);line-height:1;margin:0;}",
      ".do-wallet-staking-portfolio-assets-head a{color:#a13fff;font-size:13px;font-weight:var(--bold,500);text-decoration:none;}",
      ".do-wallet-staking-portfolio-asset{align-items:center;border-bottom:1px solid rgba(159,70,255,.24);display:flex;gap:12px;justify-content:space-between;min-height:64px;padding:10px 6px;text-decoration:none;}",
      ".do-wallet-staking-portfolio-left{align-items:center;display:flex;gap:11px;min-width:0;}",
      ".do-wallet-staking-portfolio-left span{display:flex;flex-direction:column;gap:4px;min-width:0;}",
      ".do-wallet-staking-portfolio-left strong{align-items:baseline;display:flex;flex-wrap:wrap;font-size:14px;font-weight:var(--bold,500);gap:5px;line-height:1.14;min-width:0;}",
      ".do-wallet-staking-portfolio-left strong small{color:#c9bbef;font-size:11px;font-weight:var(--bold,500);}",
      ".do-wallet-staking-portfolio-left em,.do-wallet-staking-portfolio-left small{color:#c9bbef;font-size:12px;font-style:normal;font-weight:var(--bold,500);line-height:1.1;}",
      ".do-wallet-staking-portfolio-left em.negative{color:#ff4b5c;}",
      ".do-wallet-staking-portfolio-left em.positive{color:#00c8a4;}",
      ".do-wallet-staking-portfolio-right{align-items:flex-end;display:flex;flex-direction:column;gap:4px;min-width:108px;text-align:right;}",
      ".do-wallet-staking-portfolio-right strong{font-size:14px;font-weight:var(--bold,500);line-height:1.12;}",
      ".do-wallet-staking-portfolio-right small{color:#c9bbef;font-size:12px;font-weight:var(--bold,500);line-height:1.1;}",
      ".do-wallet-staking-portfolio-icon{background:#2c2140;border-radius:50%;height:34px;min-width:34px;object-fit:cover;width:34px;}",
      ".do-wallet-staking-portfolio-empty{color:#c9bbef;font-size:13px;font-weight:var(--bold,500);padding:18px 6px;}",
      "[data-do-wallet-staking-balance-hidden='1']{display:none!important;}",
      "[" + BALANCE_ATTR + "] button[disabled]{pointer-events:auto;}",
      "@container (max-width:1020px){.do-wallet-staking-layout{grid-template-columns:1fr}.do-wallet-staking-portfolio{border-left:0;min-height:0}.do-wallet-staking-body{grid-template-columns:1fr}.do-wallet-staking-summaries{grid-template-columns:repeat(3,minmax(0,1fr))}}",
      "@media(max-width:1180px){.do-wallet-staking-layout{grid-template-columns:1fr}.do-wallet-staking-portfolio{border-left:0;min-height:0}.do-wallet-staking-body{grid-template-columns:1fr}.do-wallet-staking-summaries{grid-template-columns:repeat(3,minmax(0,1fr))}}",
      "@media(max-width:720px){.do-wallet-staking-page{padding:16px 14px 32px}.do-wallet-staking-page-head,.do-wallet-staking-card-head,.do-wallet-staking-filter,.do-wallet-staking-actions{align-items:stretch;flex-direction:column}.do-wallet-staking-page-head h1{font-size:32px}.do-wallet-staking-withdraw,.do-wallet-staking-actions a{width:100%}.do-wallet-staking-card-head,.do-wallet-staking-filter,.do-wallet-staking-body,.do-wallet-staking-positions-head,.do-wallet-staking-position,.do-wallet-staking-actions{padding-left:18px;padding-right:18px}.do-wallet-staking-filter span{min-width:0;width:100%}.do-wallet-staking-body{gap:16px;min-height:0;padding-bottom:16px;padding-top:16px}.do-wallet-staking-chart-wrap{min-height:120px}.do-wallet-staking-chart{width:104px}.do-wallet-staking-summaries{grid-template-columns:1fr}.do-wallet-staking-position{gap:10px}.do-wallet-staking-position-value{min-width:118px}.do-wallet-staking-position-main strong,.do-wallet-staking-position-value strong{font-size:14px}.do-wallet-staking-portfolio-top{padding:22px 16px 18px}.do-wallet-staking-portfolio-actions{gap:8px}.do-wallet-staking-portfolio-action>span{height:48px;width:48px}.do-wallet-staking-portfolio-action svg{height:21px;width:21px}.do-wallet-staking-portfolio-right{min-width:96px}}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  function scheduleRender(delay) {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(function () {
      renderTimer = 0;
      updateRouteAttribute();
      installStyles();
      if (isStakeOverviewRoute()) renderOverview();
      else removeOverviewRoot();
      applyStakeBalances();
    }, delay == null ? 80 : delay);
  }

  function scheduleBalance(delay) {
    window.clearTimeout(balanceTimer);
    balanceTimer = window.setTimeout(applyStakeBalances, delay == null ? 80 : delay);
  }

  function hookHistory() {
    if (window.__doWalletStakingHistoryHook20260627) return;
    window.__doWalletStakingHistoryHook20260627 = true;
    ["pushState", "replaceState"].forEach(function (name) {
      var original = window.history && window.history[name];
      if (typeof original !== "function") return;
      window.history[name] = function () {
        var result = original.apply(this, arguments);
        scheduleRender(0);
        return result;
      };
    });
  }

  function startRoutePoll() {
    if (window.__doWalletStakingRoutePoll20260627) return;
    window.__doWalletStakingRoutePoll20260627 = true;
    var previousPath = routePath();
    window.setInterval(function () {
      var currentPath = routePath();
      if (currentPath === previousPath) return;
      previousPath = currentPath;
      scheduleRender(0);
    }, 500);
  }

  function installNavigationCleanup() {
    if (window.__doWalletStakingNavigationCleanup20260627) return;
    window.__doWalletStakingNavigationCleanup20260627 = true;
    document.addEventListener("click", function (event) {
      var target = event && event.target;
      var link = target && target.closest ? target.closest("a[href]") : null;
      if (!link) return;
      var href = clean(link.getAttribute("href"));
      if (!href || /^#|^javascript:/i.test(href)) return;
      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (error) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname.replace(/\/+$/, "") === "/stake") return;
      removeOverviewRoot();
      document.documentElement.removeAttribute(ROUTE_ATTR);
    }, true);
  }

  hookHistory();
  updateRouteAttribute();
  installStyles();
  installNavigationCleanup();
  document.addEventListener("DOMContentLoaded", function () { scheduleRender(0); });
  window.addEventListener("load", function () { scheduleRender(0); });
  window.addEventListener("pageshow", function () { scheduleRender(0); });
  window.addEventListener("popstate", function () { scheduleRender(0); });
  window.addEventListener("hashchange", function () { scheduleRender(0); });
  window.addEventListener("do_wallet_portfolio_snapshot", function () { scheduleRender(180); });
  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY || event.key === SNAPSHOTS_BY_WALLET_KEY || /wallet|user|keys/i.test(event.key || "")) scheduleRender(180);
  });
  document.addEventListener("input", function () { scheduleBalance(0); }, true);
  document.addEventListener("change", function () { scheduleBalance(0); }, true);
  startRoutePoll();
  scheduleRender(0);
  window.setTimeout(scheduleRender, 600);
})();
