(function () {
  "use strict";

  if (window.__doWalletAssetsArea20260621) return;
  window.__doWalletAssetsArea20260621 = true;

  var ROOT_CLASS = "dochain-assets-area";
  var DETAIL_CLASS = "dochain-assets-detail-group";
  var DETAIL_NATIVE_CLASS = "dochain-assets-detail-native-chain";
  var STYLE_ID = "dochain-assets-area-style-20260621";
  var SNAPSHOT_KEYS = [
    "do-wallet-portfolio-snapshot",
    "do-wallet-portfolio-snapshots-by-wallet"
  ];
  var WALLET_STATE_KEYS = [
    "user",
    "do-wallet-bridge-wallet",
    "do-wallet-extension-authority.v1",
    "do-wallet-selected-recovered-wallet.v1",
    "do-wallet-recovered-wallets.v1"
  ];
  var ASSET_CACHE_PREFIX = "do-wallet-assets-area-cache.v1";
  var STORAGE_SCAN_KEY = /do-wallet|portfolio|asset|balance|wallet|station|selected|bridge|authority|recovered|user/i;
  var HIDE_LOW_KEY = "HideLowBalTokens";
  var LOW_VALUE_USD = 1;

  var expandedChainID = "";
  var detailChainOverrideID = "";
  var lastSignature = "";
  var lastPanel = null;
  var lastHeader = null;
  var sideCatalogChains = {};
  var sideCatalogDenoms = {};
  var sideCatalogLoading = false;
  var sideCatalogLoaded = false;
  var chainCatalogCache = null;
  var nativeTokenCatalogCache = null;
  var modelCacheSignature = "";
  var modelCache = null;

  var CHAIN_ALIASES = {
    "do": "Do-Chain",
    "do chain": "Do-Chain",
    "do-chain": "Do-Chain",
    "dochain": "Do-Chain",
    "dochain-1": "Do-Chain",
    "888": "Do-Chain",
    "terra": "columbus-5",
    "terra classic": "columbus-5",
    "terra classic (lunc)": "columbus-5",
    "lunc": "columbus-5",
    "columbus-5": "columbus-5",
    "terra (luna)": "phoenix-1",
    "luna": "phoenix-1",
    "phoenix-1": "phoenix-1",
    "secret": "secret-4",
    "secret network": "secret-4",
    "scrt": "secret-4",
    "secret-4": "secret-4",
    "dungeon": "dungeon-1",
    "dungeon chain": "dungeon-1",
    "dgn": "dungeon-1",
    "dungeon-1": "dungeon-1",
    "bitcoin": "bitcoin-mainnet",
    "btc": "bitcoin-mainnet",
    "bitcoin-mainnet": "bitcoin-mainnet",
    "ethereum": "ethereum-mainnet",
    "eth": "ethereum-mainnet",
    "ethereum-mainnet": "ethereum-mainnet",
    "solana": "solana-mainnet",
    "sol": "solana-mainnet",
    "solana-mainnet": "solana-mainnet",
    "cardano": "cardano-mainnet",
    "ada": "cardano-mainnet",
    "cardano-mainnet": "cardano-mainnet",
    "osmosis": "osmosis-1",
    "osmo": "osmosis-1",
    "osmosis-1": "osmosis-1",
    "andromeda": "andromeda-1",
    "andr": "andromeda-1",
    "andromeda-1": "andromeda-1",
    "bnb": "bnb-smart-chain-mainnet",
    "bnb smart chain": "bnb-smart-chain-mainnet",
    "bsc": "bnb-smart-chain-mainnet",
    "bnb-smart-chain-mainnet": "bnb-smart-chain-mainnet"
  };

  var TERRA_CLASSIC_CHILD_SYMBOLS = {
    KRT: true,
    SDT: true,
    AUT: true,
    CNT: true,
    CHT: true,
    CAT: true,
    GBT: true,
    SET: true,
    DKT: true,
    INT: true,
    MYT: true,
    IDT: true,
    THT: true,
    JPT: true,
    EUT: true,
    MNT: true
  };

  var NATIVE_SYMBOL_CHAINS = {
    DO: "Do-Chain",
    LUNC: "columbus-5",
    LUNA: "phoenix-1",
    SCRT: "secret-4",
    DGN: "dungeon-1",
    BTC: "bitcoin-mainnet",
    ETH: "ethereum-mainnet",
    SOL: "solana-mainnet",
    ADA: "cardano-mainnet",
    TRX: "tron-mainnet",
    XRP: "xrp-ledger-mainnet",
    ATOM: "cosmoshub-4",
    OSMO: "osmosis-1",
    ANDR: "andromeda-1",
    JUNO: "juno-1",
    AKT: "akashnet-2",
    ARCH: "archway-1",
    AXL: "axelar-dojo-1",
    BNB: "bnb-smart-chain-mainnet",
    AVAX: "avalanche-c-chain",
    MATIC: "polygon-mainnet",
    POL: "polygon-mainnet",
    OP: "optimism-mainnet"
  };

  var FALLBACK_NATIVE_TOKENS = {
    "Do-Chain": { chainID: "Do-Chain", denom: "udo", token: "udo", symbol: "DO", name: "Do Token", icon: "/do-logo.jpg", decimals: 6 },
    "columbus-5": { chainID: "columbus-5", denom: "uluna", token: "uluna", symbol: "LUNC", name: "Terra Classic (LUNC)", decimals: 6, icon: "/img/chains/TerraClassic.svg" },
    "phoenix-1": { chainID: "phoenix-1", denom: "uluna", token: "uluna", symbol: "LUNA", name: "Terra (LUNA)", decimals: 6, icon: "/img/chains/Terra.svg" },
    "secret-4": { chainID: "secret-4", denom: "uscrt", token: "uscrt", symbol: "SCRT", name: "Secret Network", decimals: 6, icon: "/img/chains/Secret.png" },
    "dungeon-1": { chainID: "dungeon-1", denom: "udgn", token: "udgn", symbol: "DGN", name: "Dungeon Chain", decimals: 6 },
    "bitcoin-mainnet": { chainID: "bitcoin-mainnet", denom: "btc", token: "btc", symbol: "BTC", name: "Bitcoin", decimals: 8, icon: "/img/chains/Bitcoin.svg" },
    "ethereum-mainnet": { chainID: "ethereum-mainnet", denom: "eth", token: "eth", symbol: "ETH", name: "Ethereum", decimals: 18, icon: "/img/chains/Ethereum.svg" },
    "solana-mainnet": { chainID: "solana-mainnet", denom: "sol", token: "sol", symbol: "SOL", name: "Solana", decimals: 9, icon: "/img/chains/Solana.svg" },
    "cardano-mainnet": { chainID: "cardano-mainnet", denom: "ada", token: "ada", symbol: "ADA", name: "Cardano", decimals: 6, icon: "/img/chains/Cardano.svg" },
    "tron-mainnet": { chainID: "tron-mainnet", denom: "trx", token: "trx", symbol: "TRX", name: "Tron", decimals: 6 },
    "xrp-ledger-mainnet": { chainID: "xrp-ledger-mainnet", denom: "xrp", token: "xrp", symbol: "XRP", name: "XRP Ledger", decimals: 6 },
    "cosmoshub-4": { chainID: "cosmoshub-4", denom: "uatom", token: "uatom", symbol: "ATOM", name: "Cosmos Hub", decimals: 6 },
    "osmosis-1": { chainID: "osmosis-1", denom: "uosmo", token: "uosmo", symbol: "OSMO", name: "Osmosis", decimals: 6 },
    "juno-1": { chainID: "juno-1", denom: "ujuno", token: "ujuno", symbol: "JUNO", name: "Juno", decimals: 6 },
    "akashnet-2": { chainID: "akashnet-2", denom: "uakt", token: "uakt", symbol: "AKT", name: "Akash", decimals: 6 },
    "andromeda-1": { chainID: "andromeda-1", denom: "uandr", token: "uandr", symbol: "ANDR", name: "Andromeda", decimals: 6, icon: "/img/chains/Andromeda.png" },
    "archway-1": { chainID: "archway-1", denom: "aarch", token: "aarch", symbol: "ARCH", name: "Archway", decimals: 18 },
    "axelar-dojo-1": { chainID: "axelar-dojo-1", denom: "uaxl", token: "uaxl", symbol: "AXL", name: "Axelar", decimals: 6 },
    "arbitrum-one": { chainID: "arbitrum-one", denom: "eth", token: "eth", symbol: "ETH", name: "Ethereum on Arbitrum", decimals: 18 },
    "avalanche-c-chain": { chainID: "avalanche-c-chain", denom: "avax", token: "avax", symbol: "AVAX", name: "Avalanche", decimals: 18 },
    "base-mainnet": { chainID: "base-mainnet", denom: "eth", token: "eth", symbol: "ETH", name: "Ethereum on Base", decimals: 18 },
    "bnb-smart-chain-mainnet": { chainID: "bnb-smart-chain-mainnet", denom: "bnb", token: "bnb", symbol: "BNB", name: "BNB Smart Chain", decimals: 18 },
    "optimism-mainnet": { chainID: "optimism-mainnet", denom: "eth", token: "eth", symbol: "ETH", name: "Ethereum on Optimism", decimals: 18 },
    "polygon-mainnet": { chainID: "polygon-mainnet", denom: "matic", token: "matic", symbol: "MATIC", name: "Polygon", decimals: 18 }
  };

  var CHAIN_ICON_FALLBACKS = {
    "Do-Chain": "/station-assets/img/chains/DoChain.png",
    "columbus-5": "/station-assets/img/chains/TerraClassic.svg",
    "phoenix-1": "/station-assets/img/chains/Terra.svg",
    "secret-4": "/station-assets/img/chains/Secret.png",
    "dungeon-1": "/station-assets/img/chains/Dungeon.png",
    "bitcoin-mainnet": "/station-assets/img/chains/Bitcoin.svg",
    "ethereum-mainnet": "/station-assets/img/chains/Ethereum.svg",
    "solana-mainnet": "/station-assets/img/chains/Solana.svg",
    "cardano-mainnet": "/station-assets/img/chains/Cardano.svg",
    "tron-mainnet": "/station-assets/img/chains/Tron.svg",
    "xrp-ledger-mainnet": "/station-assets/img/chains/XRP.svg",
    "cosmoshub-4": "/station-assets/img/chains/Cosmos.svg",
    "osmosis-1": "/station-assets/img/chains/Osmosis.svg",
    "juno-1": "/station-assets/img/chains/Juno.svg",
    "akashnet-2": "/station-assets/img/chains/Akash.svg",
    "andromeda-1": "/station-assets/img/chains/Andromeda.png",
    "archway-1": "/station-assets/img/chains/Archway.png",
    "axelar-dojo-1": "/station-assets/img/chains/Axelar.svg",
    "arbitrum-one": "/station-assets/img/chains/Arbitrum.svg",
    "avalanche-c-chain": "/station-assets/img/chains/Avalanche.svg",
    "base-mainnet": "/station-assets/img/chains/Base.svg",
    "bnb-smart-chain-mainnet": "/station-assets/img/chains/BNB.svg",
    "optimism-mainnet": "/station-assets/img/chains/Optimism.svg",
    "polygon-mainnet": "/station-assets/img/chains/Polygon.svg"
  };

  var SIDE_NATIVE_CHAIN_IDS = [
    "Do-Chain",
    "akashnet-2",
    "andromeda-1",
    "arbitrum-one",
    "archway-1",
    "avalanche-c-chain",
    "axelar-dojo-1",
    "base-mainnet",
    "bitcoin-mainnet",
    "bnb-smart-chain-mainnet",
    "cardano-mainnet",
    "cosmoshub-4",
    "dungeon-1",
    "ethereum-mainnet",
    "juno-1",
    "optimism-mainnet",
    "osmosis-1",
    "polygon-mainnet",
    "secret-4",
    "solana-mainnet",
    "columbus-5",
    "phoenix-1",
    "tron-mainnet",
    "xrp-ledger-mainnet"
  ];

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function cleanKey(value) {
    return normalize(value).toLowerCase();
  }

  function canonicalChainID(value) {
    value = cleanKey(value);
    return CHAIN_ALIASES[value] || normalize(value);
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      if (!raw || raw.length > 8 * 1024 * 1024) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function readBoolean(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      if (raw === null || raw === undefined || raw === "") return fallback;
      if (raw === "true") return true;
      if (raw === "false") return false;
      return JSON.parse(raw) !== false;
    } catch (error) {
      return fallback;
    }
  }

  function mergeObjectMap(target, source) {
    if (!isObject(source)) return target;
    Object.keys(source).forEach(function (key) {
      if (isObject(source[key])) target[key] = Object.assign({}, target[key] || {}, source[key]);
    });
    return target;
  }

  function invalidateModelCache() {
    modelCacheSignature = "";
    modelCache = null;
  }

  function invalidateCatalogCaches() {
    chainCatalogCache = null;
    nativeTokenCatalogCache = null;
    invalidateModelCache();
  }

  function loadSideCatalog() {
    if (sideCatalogLoading || sideCatalogLoaded || typeof window.fetch !== "function") return;
    sideCatalogLoading = true;
    Promise.all([
      window.fetch("/station-assets/chains.json?v=20260621sideAssetsAllChains1", { cache: "force-cache" }).then(function (response) {
        return response.ok ? response.json() : {};
      }).catch(function () { return {}; }),
      window.fetch("/station-assets/denoms.json?v=20260621sideAssetsAllChains1", { cache: "force-cache" }).then(function (response) {
        return response.ok ? response.json() : {};
      }).catch(function () { return {}; })
    ]).then(function (results) {
      sideCatalogChains = mergeObjectMap(sideCatalogChains, results[0]);
      sideCatalogDenoms = mergeObjectMap(sideCatalogDenoms, results[1]);
      sideCatalogLoaded = true;
      sideCatalogLoading = false;
      invalidateCatalogCaches();
      scheduleRender();
    }).catch(function () {
      sideCatalogLoading = false;
    });
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "[data-dochain-assets-original-hidden='true']{display:none!important;}",
      "[data-dochain-assets-original-header-hidden='true']{display:none!important;}",
      "[data-dochain-assets-detail-chain-hidden='true']{display:none!important;}",
      "[data-dochain-hide-low-balance-control='true']{display:none!important;}",
      "[data-dochain-assets-hidden='true']{display:none!important;}",
      "." + ROOT_CLASS + "{box-sizing:border-box;color:var(--text,#fff);display:grid;font-family:inherit;font-size:var(--font-size,14px);font-weight:var(--normal,400);gap:0;letter-spacing:0;line-height:1.2;margin-top:0;max-height:calc(100vh - 360px);min-height:180px;overflow-y:auto;overscroll-behavior:contain;padding:0 20px 14px;width:100%;}",
      "." + ROOT_CLASS + "{scrollbar-color:rgba(168,85,247,.45) transparent;scrollbar-width:thin;}",
      "." + ROOT_CLASS + "::-webkit-scrollbar{display:block;width:8px;}",
      "." + ROOT_CLASS + "::-webkit-scrollbar-thumb{background:rgba(168,85,247,.45);border-radius:999px;}",
      "[role='dialog'] [class*='TokenList_results__']{max-height:min(420px,52vh);overflow-y:auto!important;overscroll-behavior:contain;scrollbar-color:rgba(168,85,247,.45) transparent;scrollbar-width:thin;}",
      "[role='dialog'] [class*='TokenList_results__']::-webkit-scrollbar{display:block;width:8px;}",
      "[role='dialog'] [class*='TokenList_results__']::-webkit-scrollbar-thumb{background:rgba(168,85,247,.45);border-radius:999px;}",
      "." + ROOT_CLASS + "__header{align-items:center;box-sizing:border-box;display:flex;justify-content:space-between;gap:12px;min-height:42px;padding:0 0 10px;width:100%;}",
      "." + ROOT_CLASS + "__heading{color:var(--text,#fff);font-size:14px;font-weight:var(--bold,500);line-height:1.15;margin:0;}",
      "." + ROOT_CLASS + "__manage{align-items:center;background:transparent;border:0;color:var(--button-primary-bg,#a855f7);cursor:pointer;display:inline-flex;font:inherit;font-size:12px;font-weight:var(--bold,500);gap:8px;line-height:1;min-height:28px;padding:0;white-space:nowrap;}",
      "." + ROOT_CLASS + "__manage:hover{text-decoration:none;filter:brightness(1.1);}",
      "." + ROOT_CLASS + "__manageIcon{display:inline-flex;font-size:15px;line-height:1;transform:translateY(-1px);}",
      "." + ROOT_CLASS + "__row{align-items:center;background:transparent;border:0;border-top:1px solid rgba(163,90,246,.16);box-sizing:border-box;color:inherit;display:grid;font:inherit;grid-template-columns:minmax(0,1fr) auto;gap:12px;line-height:1.2;min-height:64px;padding:10px 0;text-align:left;width:100%;}",
      "." + ROOT_CLASS + "__row:first-child{border-top:0;}",
      "." + ROOT_CLASS + "__row:hover{background:rgba(255,255,255,.03);}",
      "." + ROOT_CLASS + "__row:focus-visible{outline:2px solid rgba(163,90,246,.8);outline-offset:2px;}",
      "." + ROOT_CLASS + "__left{align-items:center;display:flex;gap:10px;min-width:0;}",
      "." + ROOT_CLASS + "__icon{align-items:center;background:#332549;border-radius:50%;color:var(--text,#fff);display:inline-flex;flex:0 0 auto;font-size:10px;font-weight:var(--bold,500);height:32px;justify-content:center;line-height:1;overflow:hidden;width:32px;}",
      "." + ROOT_CLASS + "__icon img{height:100%;object-fit:cover;width:100%;}",
      "." + ROOT_CLASS + "__title{display:grid;gap:2px;min-width:0;}",
      "." + ROOT_CLASS + "__symbolLine{align-items:baseline;display:flex;gap:6px;min-width:0;}",
      "." + ROOT_CLASS + "__symbol{color:var(--text,#fff);font-size:14px;font-weight:var(--bold,500);line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      "." + ROOT_CLASS + "__price{color:var(--text-muted,#c8b7f2);font-size:11px;font-weight:var(--normal,400);line-height:1.15;white-space:nowrap;}",
      "." + ROOT_CLASS + "__sub{color:var(--text-muted,#c8b7f2);font-size:12px;font-weight:var(--normal,400);line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      "." + ROOT_CLASS + "__change{font-size:11px;font-weight:var(--bold,500);line-height:1.15;}",
      "." + ROOT_CLASS + "__change[data-direction='up']{color:#3ca7ff;}",
      "." + ROOT_CLASS + "__change[data-direction='down']{color:#ff4f5d;}",
      "." + ROOT_CLASS + "__right{text-align:right;white-space:nowrap;}",
      "." + ROOT_CLASS + "__value{color:var(--text,#fff);display:block;font-size:14px;font-weight:var(--bold,500);line-height:1.15;}",
      "." + ROOT_CLASS + "__amount{color:var(--text-muted,#c8b7f2);display:block;font-size:12px;font-weight:var(--normal,400);line-height:1.15;}",
      "." + ROOT_CLASS + "__children{border-left:1px solid rgba(163,90,246,.2);margin-left:15px;padding-left:16px;}",
      "." + ROOT_CLASS + "__child{min-height:52px;grid-template-columns:minmax(0,1fr) auto;}",
      "." + ROOT_CLASS + "__empty{color:var(--text-muted,#c8b7f2);font-size:12px;font-weight:var(--normal,400);padding:12px 0;}",
      "." + ROOT_CLASS + "__badge{border:1px solid rgba(163,90,246,.3);border-radius:999px;color:var(--text-muted,#c8b7f2);font-size:10px;font-weight:var(--bold,500);line-height:1;padding:2px 6px;}",
      "." + DETAIL_CLASS + "{border-top:1px solid rgba(163,90,246,.18);box-sizing:border-box;color:var(--text,#fff);display:grid;font-family:inherit;font-size:var(--font-size,14px);gap:0;letter-spacing:0;margin:10px 0 18px;padding-top:8px;}",
      "." + DETAIL_CLASS + "__title{color:var(--text-muted,#c8b7f2);font-size:12px;font-weight:var(--bold,500);line-height:1.2;margin:0 0 4px;text-transform:none;}",
      "." + DETAIL_NATIVE_CLASS + "{align-items:center;box-sizing:border-box;color:var(--text,#fff);display:grid;font-family:inherit;font-size:var(--font-size,14px);font-weight:var(--normal,400);grid-template-columns:minmax(0,1fr) auto;gap:12px;letter-spacing:0;line-height:1.2;min-height:64px;padding:12px 10px 14px 10px;width:100%;}",
      "." + DETAIL_NATIVE_CLASS + "__left{align-items:center;display:flex;gap:10px;min-width:0;}",
      "." + DETAIL_NATIVE_CLASS + "__title{color:var(--text,#fff);font-size:14px;font-weight:var(--bold,500);line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      "." + DETAIL_NATIVE_CLASS + "__right{text-align:right;white-space:nowrap;}",
      "@media(max-width:560px){." + ROOT_CLASS + "{padding:0 16px;}." + ROOT_CLASS + "__row{grid-template-columns:1fr;gap:4px;}." + ROOT_CLASS + "__right{text-align:left;padding-left:42px;}}"
    ].join("");
    document.head.appendChild(style);
  }

  function hasPositiveRawAmount(value) {
    value = normalize(value);
    return Boolean(value && /^0*[1-9]\d*$/.test(value.replace(/\D/g, "")));
  }

  function objectAssetLike(value) {
    if (!isObject(value)) return false;
    var hasToken = Boolean(normalize(value.symbol || value.name || value.denom || value.token || value.contract || value.id));
    var hasChain = Boolean(normalize(value.chainID || value.chainId || value.network || value.chain || value.chainName));
    var hasBalance = numeric(value.amount || value.quantity || value.balance || value.valueUsd || value.value || value.usd) > 0 ||
      hasPositiveRawAmount(value.rawAmount || value.amountRaw || value.balanceRaw || "");
    return hasToken && (hasChain || hasBalance);
  }

  function assetRowsFromValue(value, depth) {
    var rows = [];
    if (depth > 5 || !value) return rows;
    if (Array.isArray(value)) {
      if (value.some(objectAssetLike)) {
        value.forEach(function (entry) {
          if (objectAssetLike(entry)) rows.push(entry);
        });
        return rows;
      }
      value.forEach(function (entry) {
        rows = rows.concat(assetRowsFromValue(entry, depth + 1));
      });
      return rows;
    }
    if (isObject(value)) {
      Object.keys(value).forEach(function (key) {
        rows = rows.concat(assetRowsFromValue(value[key], depth + 1));
      });
    }
    return rows;
  }

  function snapshotRows(snapshot) {
    if (!isObject(snapshot)) return [];
    var rows = [];
    ["spendableAssets", "assets", "portfolioAssets", "walletAssets", "balanceAssets", "balances"].forEach(function (key) {
      if (Array.isArray(snapshot[key])) rows = rows.concat(snapshot[key]);
    });
    if (!rows.length) rows = assetRowsFromValue(snapshot, 0);
    return rows.filter(function (asset) {
      return asset && cleanKey(asset.category || "wallet") === "wallet";
    });
  }

  function allSnapshots() {
    var snapshots = [];
    var current = readJSON(SNAPSHOT_KEYS[0], null);
    if (isObject(current)) snapshots.push(current);
    var byWallet = readJSON(SNAPSHOT_KEYS[1], {});
    if (isObject(byWallet)) {
      Object.keys(byWallet).forEach(function (key) {
        if (isObject(byWallet[key])) snapshots.push(byWallet[key]);
      });
    }
    return snapshots;
  }

  function allSnapshotRows() {
    var rows = [];
    allSnapshots().forEach(function (snapshot) {
      rows = rows.concat(snapshotRows(snapshot));
    });
    return uniqueRows(rows);
  }

  function storageAssetRows() {
    var rows = [];
    try {
      if (!window.localStorage) return rows;
      for (var index = 0; index < window.localStorage.length; index += 1) {
        var key = window.localStorage.key(index);
        if ((key || "").indexOf(ASSET_CACHE_PREFIX) === 0) continue;
        if (!STORAGE_SCAN_KEY.test(key || "")) continue;
        var parsed = readJSON(key, null);
        if (!parsed) continue;
        rows = rows.concat(assetRowsFromValue(parsed, 0).filter(function (asset) {
          return numeric(asset && (asset.amount || asset.quantity || asset.balance || asset.valueUsd || asset.value || asset.usd)) > 0 ||
            hasPositiveRawAmount(asset && (asset.rawAmount || asset.amountRaw || asset.balanceRaw));
        }));
      }
    } catch (error) {}
    return uniqueRows(rows);
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function symbolFromAssetRow(row) {
    var explicit = row && row.querySelector && row.querySelector("[class*='symbol'],[class*='Symbol']");
    var explicitText = normalize(explicit && explicit.textContent).toUpperCase();
    if (/^[A-Z0-9]{2,12}$/.test(explicitText)) return explicitText;

    var text = normalize(row && row.textContent);
    var parts = text.match(/\b[A-Z][A-Z0-9]{1,11}\b/g) || [];
    return parts.find(function (part) {
      return part !== "USD" && part !== "ALL";
    }) || "";
  }

  function parseUsdFromText(text) {
    var values = [];
    normalize(text).replace(/,/g, "").replace(/\$\s*<?\s*(-?\d+(?:\.\d+)?)/g, function (_match, value) {
      values.push(numeric(value));
      return _match;
    });
    return {
      priceUsd: values.length ? values[0] : 0,
      valueUsd: values.length ? values[values.length - 1] : 0
    };
  }

  function amountFromAssetRow(row, symbol) {
    var text = normalize(row && row.textContent).replace(/,/g, "");
    if (!symbol) return 0;
    var pattern = new RegExp("(-?\\d+(?:\\.\\d+)?)\\s+" + escapeRegExp(symbol) + "\\b", "i");
    var match = text.match(pattern);
    return match ? numeric(match[1]) : 0;
  }

  function fallbackChainForSymbol(symbol) {
    symbol = normalize(symbol).toUpperCase();
    if (symbol === "DODX") return "Do-Chain";
    if (TERRA_CLASSIC_CHILD_SYMBOLS[symbol]) return "columbus-5";
    return NATIVE_SYMBOL_CHAINS[symbol] || "";
  }

  function fallbackAssetRows() {
    var catalog = chainCatalog();
    return Array.prototype.slice.call(document.querySelectorAll("[class*='Asset_asset__']")).map(function (row) {
      if (isInsideOwnUI(row)) return null;
      if (row.closest && row.closest("." + DETAIL_CLASS + ",[role='dialog'],[aria-modal='true']")) return null;

      var symbol = symbolFromAssetRow(row);
      var chainID = fallbackChainForSymbol(symbol);
      if (!symbol || !chainID) return null;

      var token = nativeTokenFor(chainID);
      var nativeSymbol = normalize(token && token.symbol).toUpperCase();
      var isNative = symbol === nativeSymbol;
      var parsedUsd = parseUsdFromText(row.textContent);
      var chain = catalog[chainID] || {};
      var fallbackToken = symbol.toLowerCase();

      return {
        id: "dom:" + chainID + ":" + symbol.toLowerCase(),
        chainID: chainID,
        chainId: chainID,
        chainName: normalize(chain.name || (token && token.chainName) || (token && token.name) || chainID),
        denom: isNative && token ? (token.denom || token.token || token.symbol) : fallbackToken,
        token: isNative && token ? (token.token || token.denom || token.symbol) : fallbackToken,
        symbol: symbol,
        name: isNative && token ? (token.name || symbol) : symbol,
        icon: isNative && token ? (token.icon || chain.icon || "") : (chain.icon || ""),
        decimals: isNative && token ? numeric(token.decimals) : 6,
        amount: amountFromAssetRow(row, symbol),
        balance: amountFromAssetRow(row, symbol),
        quantity: amountFromAssetRow(row, symbol),
        valueUsd: parsedUsd.valueUsd,
        value: parsedUsd.valueUsd,
        priceUsd: parsedUsd.priceUsd,
        category: "wallet",
        source: "dochain-visible-asset-row"
      };
    }).filter(Boolean);
  }

  function looksLikePublicAddress(value) {
    value = normalize(value);
    return Boolean(value && value.length >= 16 && /^(do|terra|secret|dungeon|cosmos|osmo|bc1|0x|addr1|T|r|[1-9A-HJ-NP-Za-km-z]{32,})/i.test(value));
  }

  function chainIDFromAddress(address) {
    address = normalize(address);
    if (/^do1/i.test(address)) return "Do-Chain";
    if (/^terra1/i.test(address)) return "columbus-5";
    if (/^secret1/i.test(address)) return "secret-4";
    if (/^dungeon1/i.test(address)) return "dungeon-1";
    if (/^bc1/i.test(address)) return "bitcoin-mainnet";
    if (/^0x[a-f0-9]{40}$/i.test(address)) return "ethereum-mainnet";
    if (/^addr1/i.test(address)) return "cardano-mainnet";
    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/i.test(address)) return "tron-mainnet";
    if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/i.test(address)) return "xrp-ledger-mainnet";
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return "solana-mainnet";
    return "";
  }

  function addAddressChainIDsFromValue(value, out, depth) {
    if (depth > 5 || !value) return;
    if (typeof value === "string") {
      var chainID = chainIDFromAddress(value);
      if (chainID) out[chainID] = true;
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (entry) {
        addAddressChainIDsFromValue(entry, out, depth + 1);
      });
      return;
    }
    if (!isObject(value)) return;
    Object.keys(value).forEach(function (key) {
      var direct = value[key];
      var chainID = canonicalChainID(key);
      if (nativeTokenFor(chainID) && looksLikePublicAddress(direct)) out[chainID] = true;
      addAddressChainIDsFromValue(direct, out, depth + 1);
    });
  }

  function storageAddressChainIDs() {
    var out = {};
    SNAPSHOT_KEYS.concat(WALLET_STATE_KEYS).forEach(function (key) {
      addAddressChainIDsFromValue(readJSON(key, null), out, 0);
    });
    return Object.keys(out);
  }

  function addPublicAddressesFromValue(value, out, depth) {
    if (depth > 5 || !value) return;
    if (typeof value === "string") {
      if (looksLikePublicAddress(value)) out[normalize(value).toLowerCase()] = true;
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (entry) {
        addPublicAddressesFromValue(entry, out, depth + 1);
      });
      return;
    }
    if (!isObject(value)) return;
    Object.keys(value).forEach(function (key) {
      addPublicAddressesFromValue(value[key], out, depth + 1);
    });
  }

  function hashString(value) {
    var hash = 0;
    value = String(value || "");
    for (var index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function storagePublicAddressKeys() {
    var out = {};
    SNAPSHOT_KEYS.concat(WALLET_STATE_KEYS).forEach(function (key) {
      addPublicAddressesFromValue(readJSON(key, null), out, 0);
    });
    return Object.keys(out).sort();
  }

  function storageAddressSignature() {
    return storagePublicAddressKeys().join("|");
  }

  function assetCacheKey() {
    var signature = storageAddressSignature();
    return ASSET_CACHE_PREFIX + ":" + (signature ? hashString(signature) : "default");
  }

  function assetCacheKeys() {
    var keys = {};
    keys[assetCacheKey()] = true;
    storagePublicAddressKeys().forEach(function (address) {
      keys[ASSET_CACHE_PREFIX + ":address:" + hashString(address)] = true;
    });
    return Object.keys(keys);
  }

  function cachedAssetRows() {
    var rows = [];
    assetCacheKeys().forEach(function (key) {
      var payload = readJSON(key, null);
      rows = rows.concat(isObject(payload) && Array.isArray(payload.rows)
        ? payload.rows
        : Array.isArray(payload)
          ? payload
          : []);
    });
    return uniqueRows(rows);
  }

  function assetHasUsefulBalance(asset) {
    return numeric(asset && (asset.amount || asset.quantity || asset.balance || asset.valueUsd || asset.value || asset.usd)) > 0 ||
      hasPositiveRawAmount(asset && (asset.rawAmount || asset.amountRaw || asset.balanceRaw));
  }

  function rememberAssetRows(rows) {
    var usefulRows = uniqueRows(rows).filter(function (asset) {
      return assetChainID(asset) && !asset.syntheticNative && !asset.syntheticChild && assetHasUsefulBalance(asset);
    });
    if (!usefulRows.length) return;
    try {
      var payload = JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        rows: usefulRows.slice(0, 300)
      });
      assetCacheKeys().forEach(function (key) {
        window.localStorage.setItem(key, payload);
      });
    } catch (error) {}
  }

  function connectedWalletSignal() {
    try {
      var text = normalize(document.body && document.body.textContent);
      if (/connect your wallet/i.test(text)) return false;
      if (/portfolio value/i.test(text)) return true;
    } catch (error) {}
    return storageAddressChainIDs().length > 0 || allSnapshotRows().length > 0 || storageAssetRows().length > 0;
  }

  function chainCatalog() {
    if (chainCatalogCache) return chainCatalogCache;
    var out = Object.assign({}, sideCatalogChains);
    try {
      if (window.doWalletMultichainAssets && typeof window.doWalletMultichainAssets.chains === "function") {
        out = Object.assign(out, window.doWalletMultichainAssets.chains());
      }
    } catch (error) {}
    try {
      if (window.doWalletChainAssets && isObject(window.doWalletChainAssets.chains)) {
        out = Object.assign(out, window.doWalletChainAssets.chains);
      }
    } catch (error2) {}
    chainCatalogCache = out;
    return chainCatalogCache;
  }

  function nativeTokenFromChain(chainID, chain) {
    chain = chain || {};
    var denom = normalize(chain.baseAsset || chain.denom || chain.token || chain.nativeDenom || chain.minimalDenom || "");
    var symbol = normalize(chain.symbol || chain.cmcSymbol || chain.nativeSymbol || "");
    if (!symbol && denom) {
      symbol = denom.replace(/^u(?=[a-z]{2,}$)/i, "").replace(/-wei$|_wei$|wei$/i, "").toUpperCase();
    }
    if (!symbol) symbol = normalize(chain.name || chainID).replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
    if (!denom) denom = symbol.toLowerCase();
    return {
      chainID: chainID,
      chainId: chainID,
      denom: denom,
      token: denom,
      symbol: symbol,
      name: normalize(chain.name || symbol || chainID),
      decimals: numeric(chain.decimals) || 6,
      icon: chain.icon || CHAIN_ICON_FALLBACKS[chainID] || ""
    };
  }

  function nativeTokenCatalog() {
    if (nativeTokenCatalogCache) return nativeTokenCatalogCache;
    var out = Object.assign({}, FALLBACK_NATIVE_TOKENS);
    var chains = chainCatalog();
    Object.keys(sideCatalogDenoms).forEach(function (key) {
      var token = sideCatalogDenoms[key];
      if (!isObject(token)) return;
      var chainID = normalize(token.chainID || token.chainId || (Array.isArray(token.chains) && token.chains[0]) || key.split(":")[0]);
      var chain = chains[chainID] || {};
      var baseAsset = normalize(chain.baseAsset || chain.denom || chain.token || "");
      var denom = normalize(token.denom || token.token || key.split(":").slice(1).join(":"));
      if (!chainID || !denom) return;
      if (out[chainID]) return;
      if (baseAsset && denom !== baseAsset) return;
      out[chainID] = Object.assign({}, token, {
        chainID: chainID,
        chainId: chainID,
        denom: denom,
        token: token.token || denom,
        symbol: token.symbol || chain.symbol || chain.cmcSymbol || denom.toUpperCase(),
        name: token.name || chain.name || token.symbol || chainID,
        icon: token.icon || chain.icon || ""
      });
    });
    Object.keys(chains).forEach(function (chainID) {
      if (!out[chainID]) out[chainID] = nativeTokenFromChain(chainID, chains[chainID]);
    });
    try {
      if (window.doWalletMultichainAssets && isObject(window.doWalletMultichainAssets.tokens)) {
        out = Object.assign(out, window.doWalletMultichainAssets.tokens);
      }
    } catch (error) {}
    try {
      if (window.doWalletChainAssets && isObject(window.doWalletChainAssets.tokens)) {
        out = Object.assign(out, window.doWalletChainAssets.tokens);
      }
    } catch (error2) {}
    nativeTokenCatalogCache = out;
    return nativeTokenCatalogCache;
  }

  function forcedChainIDForSymbol(symbol) {
    symbol = normalize(symbol).toUpperCase();
    if (symbol === "DO" || symbol === "DODX") return "Do-Chain";
    if (symbol === "LUNC" || TERRA_CLASSIC_CHILD_SYMBOLS[symbol]) return "columbus-5";
    return "";
  }

  function assetChainID(asset) {
    var symbol = displaySymbol(asset);
    var forced = forcedChainIDForSymbol(symbol);
    if (forced) return forced;
    var explicit = normalize(asset && (asset.chainID || asset.chainId || asset.network || asset.chain));
    if (explicit) return canonicalChainID(explicit);
    var chainName = normalize(asset && (asset.chainName || asset.chainLabel || asset.networkName));
    if (chainName) return canonicalChainID(chainName);
    if (NATIVE_SYMBOL_CHAINS[symbol]) return NATIVE_SYMBOL_CHAINS[symbol];
    return "";
  }

  function assetTokenValue(asset) {
    return cleanKey(asset && (asset.denom || asset.token || asset.contract || asset.id || asset.symbol || asset.name));
  }

  function assetIdentity(asset) {
    return [
      assetChainID(asset),
      assetTokenValue(asset),
      cleanKey(asset && (asset.walletAddress || asset.address || ""))
    ].join(":");
  }

  function uniqueRows(rows) {
    var seen = {};
    return (Array.isArray(rows) ? rows : []).filter(function (asset) {
      if (!asset) return false;
      var key = assetIdentity(asset);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function numeric(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function assetValue(asset) {
    return numeric(asset && (asset.valueUsd || asset.value || asset.usd));
  }

  function assetAmount(asset) {
    return numeric(asset && (asset.amount || asset.quantity || asset.balance));
  }

  function displaySymbol(asset) {
    return normalize(asset && (asset.symbol || asset.name || asset.denom || asset.token)).toUpperCase();
  }

  function displayName(asset) {
    return normalize(asset && (asset.name || asset.chainName || asset.symbol || asset.denom || asset.token));
  }

  function normalizeIconPath(icon) {
    icon = normalize(icon);
    if (!icon) return "";
    if (/^(https?:|data:|blob:)/i.test(icon)) return icon;
    if (icon.indexOf("/station-assets/") === 0) return icon;
    if (icon.indexOf("/img/chains/") === 0) return "/station-assets" + icon;
    if (icon.indexOf("img/chains/") === 0) return "/station-assets/" + icon;
    return icon;
  }

  function chainIconFor(chainID) {
    var chain = chainCatalog()[chainID] || {};
    var token = nativeTokenFor(chainID) || {};
    return normalizeIconPath(chain.icon || token.icon || CHAIN_ICON_FALLBACKS[chainID] || "");
  }

  function assetIconFor(asset) {
    return normalizeIconPath(asset && asset.icon) || chainIconFor(assetChainID(asset));
  }

  function nativeTokenFor(chainID) {
    return nativeTokenCatalog()[chainID] || null;
  }

  function nativeKeysFor(chainID) {
    var token = nativeTokenFor(chainID);
    var keys = {};
    if (!token) return keys;
    [token.id, token.denom, token.token, token.contract, token.symbol, token.name].forEach(function (value) {
      value = cleanKey(value);
      if (!value) return;
      keys[value] = true;
      if (value.indexOf(":") >= 0) keys[value.split(":").pop()] = true;
    });
    return keys;
  }

  function isNativeAsset(asset) {
    var chainID = assetChainID(asset);
    if (!chainID) return false;
    var keys = nativeKeysFor(chainID);
    var values = [
      asset && asset.id,
      asset && asset.denom,
      asset && asset.token,
      asset && asset.contract,
      asset && asset.symbol,
      asset && asset.name
    ].map(cleanKey).filter(Boolean);
    return values.some(function (value) {
      if (keys[value]) return true;
      if (value.indexOf(":") >= 0 && keys[value.split(":").pop()]) return true;
      return false;
    });
  }

  function snapshotsAddressChainIDs() {
    var chains = {};
    var tokens = nativeTokenCatalog();
    function addMap(map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (chainID) {
        if (tokens[chainID] && normalize(map[chainID])) chains[chainID] = true;
      });
    }
    allSnapshots().forEach(function (snapshot) {
      addMap(snapshot.addresses);
      addMap(snapshot.activeAddresses);
      addMap(snapshot.allAddresses);
      if (Array.isArray(snapshot.allAddresses)) {
        snapshot.allAddresses.forEach(function (entry) {
          var chainID = canonicalChainID(entry && (entry.chainID || entry.chainId || entry.network || entry.chain || entry.chainName));
          if (tokens[chainID] && normalize(entry && (entry.address || entry.walletAddress))) chains[chainID] = true;
        });
      }
    });
    return Object.keys(chains);
  }

  function zeroNativeAsset(chainID) {
    var token = nativeTokenFor(chainID);
    var chains = chainCatalog();
    var chain = chains[chainID] || {};
    if (!token) return null;
    return {
      id: chainID + ":" + normalize(token.denom || token.token || token.symbol).toLowerCase(),
      chainID: chainID,
      chainId: chainID,
      chainName: normalize(chain.name || token.chainName || token.name || chainID),
      denom: token.denom || token.token || token.symbol,
      token: token.token || token.denom || token.symbol,
      symbol: token.symbol || (chain.symbol || token.denom || chainID).toUpperCase(),
      name: token.name || chain.name || token.symbol || chainID,
      icon: token.icon || chain.icon || "",
      decimals: numeric(token.decimals),
      amount: 0,
      balance: "0",
      quantity: 0,
      valueUsd: 0,
      value: 0,
      priceUsd: 0,
      change: 0,
      category: "wallet",
      syntheticNative: true
    };
  }

  function zeroChildAsset(chainID, symbol, name, tokenValue) {
    var chain = chainCatalog()[chainID] || {};
    symbol = normalize(symbol).toUpperCase();
    return {
      id: chainID + ":" + normalize(tokenValue || symbol).toLowerCase(),
      chainID: chainID,
      chainId: chainID,
      chainName: normalize(chain.name || chainID),
      denom: normalize(tokenValue || symbol).toLowerCase(),
      token: normalize(tokenValue || symbol).toLowerCase(),
      symbol: symbol,
      name: normalize(name || symbol),
      icon: chain.icon || "",
      decimals: 6,
      amount: 0,
      balance: "0",
      quantity: 0,
      valueUsd: 0,
      value: 0,
      priceUsd: 0,
      change: 0,
      category: "wallet",
      syntheticChild: true
    };
  }

  function ensureConnectedFallbackAssets(nativeByChain, childrenByChain) {
    if (!connectedWalletSignal()) return;

    var tokenCatalog = nativeTokenCatalog();
    var chains = chainCatalog();
    var sideChainIDs = SIDE_NATIVE_CHAIN_IDS.concat(Object.keys(chains), Object.keys(tokenCatalog).sort(function (left, right) {
      var leftChain = chains[left] || {};
      var rightChain = chains[right] || {};
      return normalize(leftChain.name || left).localeCompare(normalize(rightChain.name || right));
    }));
    Array.from(new Set(sideChainIDs)).forEach(function (chainID) {
      if (!nativeByChain[chainID] && nativeTokenFor(chainID)) nativeByChain[chainID] = zeroNativeAsset(chainID);
    });

    if (!childrenByChain["Do-Chain"]) childrenByChain["Do-Chain"] = [];
    var hasDodx = childrenByChain["Do-Chain"].some(function (asset) {
      return displaySymbol(asset) === "DODX";
    });
    if (!hasDodx) childrenByChain["Do-Chain"].push(zeroChildAsset("Do-Chain", "DODX", "DODx", "dodx"));
  }

  function nativeSortLabel(asset) {
    var chainID = assetChainID(asset);
    var chain = chainCatalog()[chainID] || {};
    return normalize(chain.name || asset && asset.chainName || displayName(asset) || displaySymbol(asset)).toLowerCase();
  }

  function chainHasActualAssets(asset, childrenByChain) {
    var chainID = assetChainID(asset);
    if (assetValue(asset) > 0 || assetAmount(asset) > 0) return true;
    return (childrenByChain[chainID] || []).some(function (child) {
      return assetValue(child) > 0 || assetAmount(child) > 0;
    });
  }

  function quickValueSignature(value) {
    value = String(value || "");
    if (value.length > 4096) value = value.slice(0, 2048) + value.slice(-2048);
    return value.length + ":" + hashString(value);
  }

  function storageQuickSignature() {
    var parts = [];
    try {
      if (!window.localStorage) return "";
      for (var index = 0; index < window.localStorage.length; index += 1) {
        var key = window.localStorage.key(index) || "";
        if (!STORAGE_SCAN_KEY.test(key) && key.indexOf(ASSET_CACHE_PREFIX) !== 0 && SNAPSHOT_KEYS.indexOf(key) < 0) continue;
        var raw = window.localStorage.getItem(key) || "";
        parts.push(key + "=" + quickValueSignature(raw));
      }
    } catch (error) {}
    return parts.sort().join("|");
  }

  function visibleAssetRowsSignature() {
    var rows = [];
    try {
      rows = Array.prototype.slice.call(document.querySelectorAll("[class*='Asset_asset__']")).filter(function (row) {
        return !isInsideOwnUI(row) && !(row.closest && row.closest("." + DETAIL_CLASS + ",[role='dialog'],[aria-modal='true']"));
      }).slice(0, 80).map(function (row) {
        return quickValueSignature(normalize(row.textContent));
      });
    } catch (error) {}
    return rows.join("|");
  }

  function modelInputSignature() {
    return [
      sideCatalogLoaded ? "catalog:1" : "catalog:0",
      storageQuickSignature(),
      visibleAssetRowsSignature()
    ].join("::");
  }

  function buildModel() {
    var inputSignature = modelInputSignature();
    if (modelCache && modelCacheSignature === inputSignature) return modelCache;

    var freshRows = uniqueRows(allSnapshotRows().concat(storageAssetRows()).concat(fallbackAssetRows()));
    rememberAssetRows(freshRows);
    var rows = uniqueRows(freshRows.concat(cachedAssetRows()));
    var chainsWithAddress = Array.from(new Set(snapshotsAddressChainIDs().concat(storageAddressChainIDs())));
    var nativeByChain = {};
    var childrenByChain = {};

    rows.forEach(function (asset) {
      var chainID = assetChainID(asset);
      if (!chainID) return;
      if (isNativeAsset(asset)) {
        var current = nativeByChain[chainID];
        if (!current || assetValue(asset) > assetValue(current) || assetAmount(asset) > assetAmount(current)) {
          nativeByChain[chainID] = asset;
        }
      } else {
        if (!childrenByChain[chainID]) childrenByChain[chainID] = [];
        childrenByChain[chainID].push(asset);
      }
    });

    rows.forEach(function (asset) {
      var chainID = assetChainID(asset);
      if (chainID && !nativeByChain[chainID] && nativeTokenFor(chainID)) {
        nativeByChain[chainID] = zeroNativeAsset(chainID);
      }
    });

    chainsWithAddress.forEach(function (chainID) {
      if (!nativeByChain[chainID]) nativeByChain[chainID] = zeroNativeAsset(chainID);
    });

    ensureConnectedFallbackAssets(nativeByChain, childrenByChain);

    Object.keys(childrenByChain).forEach(function (chainID) {
      childrenByChain[chainID] = uniqueRows(childrenByChain[chainID]).sort(function (left, right) {
        return assetValue(right) - assetValue(left) || displaySymbol(left).localeCompare(displaySymbol(right));
      });
    });

    var natives = Object.keys(nativeByChain).map(function (chainID) {
      return nativeByChain[chainID];
    }).filter(Boolean).sort(function (left, right) {
      var leftSymbol = displaySymbol(left);
      var rightSymbol = displaySymbol(right);
      if (leftSymbol === "DO" && rightSymbol !== "DO") return -1;
      if (rightSymbol === "DO" && leftSymbol !== "DO") return 1;
      var leftHasAssets = chainHasActualAssets(left, childrenByChain);
      var rightHasAssets = chainHasActualAssets(right, childrenByChain);
      if (leftHasAssets && !rightHasAssets) return -1;
      if (rightHasAssets && !leftHasAssets) return 1;
      return nativeSortLabel(left).localeCompare(nativeSortLabel(right)) || leftSymbol.localeCompare(rightSymbol);
    });

    modelCache = { natives: natives, childrenByChain: childrenByChain, rows: rows };
    modelCacheSignature = inputSignature;
    return modelCache;
  }

  function formatUsd(value) {
    value = numeric(value);
    if (value >= 1000) return "$" + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (value >= 1) return "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (value > 0) return "$" + value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return "$0";
  }

  function formatPrice(value) {
    value = numeric(value);
    if (value >= 1) return "$" + value.toLocaleString(undefined, { maximumFractionDigits: 4 });
    if (value > 0) return "$" + value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    return "";
  }

  function formatAmount(asset) {
    var amount = assetAmount(asset);
    var symbol = displaySymbol(asset);
    var rendered;
    if (amount >= 1000) rendered = amount.toLocaleString(undefined, { maximumFractionDigits: 3 });
    else if (amount >= 1) rendered = amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
    else if (amount > 0) rendered = amount.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    else rendered = "0";
    return rendered + (symbol ? " " + symbol : "");
  }

  function iconNode(asset) {
    var wrap = document.createElement("span");
    wrap.className = ROOT_CLASS + "__icon";
    var icon = assetIconFor(asset);
    if (icon) {
      var img = document.createElement("img");
      img.alt = "";
      img.src = icon;
      img.addEventListener("error", function () {
        if (img.parentElement) img.parentElement.textContent = displaySymbol(asset).slice(0, 3);
      });
      wrap.appendChild(img);
    } else {
      wrap.textContent = displaySymbol(asset).slice(0, 3);
    }
    return wrap;
  }

  function changeNode(asset) {
    var change = numeric(asset && (asset.change || asset.change24h || asset.priceChange24h));
    var span = document.createElement("span");
    span.className = ROOT_CLASS + "__change";
    span.setAttribute("data-direction", change >= 0 ? "up" : "down");
    span.textContent = (change >= 0 ? "+" : "") + change.toFixed(2) + "%";
    return span;
  }

  function rowNode(asset, options) {
    options = options || {};
    var row = document.createElement("button");
    row.type = "button";
    row.className = ROOT_CLASS + "__row" + (options.child ? " " + ROOT_CLASS + "__child" : "");
    row.setAttribute("data-dochain-assets-chain-id", assetChainID(asset));
    row.setAttribute("data-dochain-assets-symbol", displaySymbol(asset));
    row.setAttribute("aria-expanded", options.hasChildren ? String(expandedChainID === assetChainID(asset)) : "false");
    if (options.onClick) row.addEventListener("click", options.onClick);

    var left = document.createElement("span");
    left.className = ROOT_CLASS + "__left";
    left.appendChild(iconNode(asset));

    var title = document.createElement("span");
    title.className = ROOT_CLASS + "__title";

    var symbolLine = document.createElement("span");
    symbolLine.className = ROOT_CLASS + "__symbolLine";
    var symbol = document.createElement("span");
    symbol.className = ROOT_CLASS + "__symbol";
    symbol.textContent = displaySymbol(asset);
    symbolLine.appendChild(symbol);

    var price = formatPrice(asset && asset.priceUsd);
    if (price) {
      var priceNode = document.createElement("span");
      priceNode.className = ROOT_CLASS + "__price";
      priceNode.textContent = price;
      symbolLine.appendChild(priceNode);
    }
    if (options.hasChildren) {
      var badge = document.createElement("span");
      badge.className = ROOT_CLASS + "__badge";
      badge.textContent = String(options.childCount);
      symbolLine.appendChild(badge);
    }

    var sub = document.createElement("span");
    sub.className = ROOT_CLASS + "__sub";
    sub.textContent = options.child ? displayName(asset) : normalize(asset.chainName || displayName(asset));
    title.appendChild(symbolLine);
    title.appendChild(sub);
    if (numeric(asset && asset.change) !== 0) title.appendChild(changeNode(asset));
    left.appendChild(title);

    var right = document.createElement("span");
    right.className = ROOT_CLASS + "__right";
    var value = document.createElement("span");
    value.className = ROOT_CLASS + "__value";
    value.textContent = formatUsd(assetValue(asset));
    var amount = document.createElement("span");
    amount.className = ROOT_CLASS + "__amount";
    amount.textContent = formatAmount(asset);
    right.appendChild(value);
    right.appendChild(amount);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function exactText(node, text) {
    return normalize(node && node.textContent).toLowerCase() === text.toLowerCase();
  }

  function isInsideOwnUI(node) {
    return Boolean(node && node.closest && node.closest("." + ROOT_CLASS));
  }

  function nodeVisible(node) {
    try {
      var rect = node && node.getBoundingClientRect && node.getBoundingClientRect();
      var style = window.getComputedStyle ? window.getComputedStyle(node) : {};
      return Boolean(rect && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden");
    } catch (error) {
      return true;
    }
  }

  function portfolioPanelScore(panel) {
    var text = normalize(panel && panel.textContent).toLowerCase();
    if (!panel) return 0;
    var score = 0;
    if (panel.tagName && panel.tagName.toLowerCase() === "aside") score += 20;
    if (text.indexOf("portfolio value") >= 0) score += 50;
    if (text.indexOf("send") >= 0) score += 8;
    if (text.indexOf("receive") >= 0) score += 8;
    if (text.indexOf("buy / sell") >= 0 || text.indexOf("buy") >= 0 && text.indexOf("sell") >= 0) score += 8;
    if (text.indexOf("assets") >= 0) score += 6;
    if (text.indexOf("manage") >= 0) score += 8;
    if (text.indexOf("all spendable balances") >= 0) score -= 80;
    try {
      var rect = panel.getBoundingClientRect();
      if (rect.left > window.innerWidth * 0.48) score += 30;
      if (rect.width >= 260 && rect.width <= Math.max(680, window.innerWidth * 0.5)) score += 8;
      if (rect.width > window.innerWidth * 0.7) score -= 70;
    } catch (error) {}
    return score;
  }

  function containsExactVisibleText(root, text) {
    if (!root) return false;
    return Array.prototype.slice.call(root.querySelectorAll("h1,h2,h3,h4,strong,b,p,span,div")).some(function (node) {
      return !isInsideOwnUI(node) && nodeVisible(node) && exactText(node, text);
    });
  }

  function isMainPortfolioAssetsPanel(panel) {
    var text = normalize(panel && panel.textContent).toLowerCase();
    if (!panel || text.indexOf("portfolio value") < 0) return false;
    if (text.indexOf("send") < 0 || text.indexOf("receive") < 0) return false;
    if (containsExactVisibleText(panel, "Chains")) return false;
    return true;
  }

  function candidatePanelForHeading(heading) {
    var current = heading.parentElement;
    var best = null;
    var bestScore = 0;
    var depth = 0;
    while (current && current !== document.body && depth < 12) {
      var score = portfolioPanelScore(current);
      if (score > bestScore) {
        best = current;
        bestScore = score;
      }
      current = current.parentElement;
      depth += 1;
    }
    if (!isMainPortfolioAssetsPanel(best)) return null;
    return bestScore >= 80 ? best : null;
  }

  function headerBlockForHeading(heading, panel) {
    var fallback = heading.parentElement || heading;
    var current = heading.parentElement;
    var depth = 0;
    while (current && current !== panel && depth < 6) {
      var text = normalize(current.textContent);
      var hasManage = /\bmanage\b/i.test(text);
      var hasAssets = /\bassets\b/i.test(text);
      if (hasManage && hasAssets) {
        try {
          var rect = current.getBoundingClientRect();
          if (rect.height <= 120) return current;
        } catch (error) {
          return current;
        }
      }
      current = current.parentElement;
      depth += 1;
    }
    return fallback;
  }

  function findAssetsHeading() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,strong,b,p,span,div")).filter(function (node) {
      if (!exactText(node, "Assets")) return false;
      if (isInsideOwnUI(node)) return false;
      if (!nodeVisible(node)) return false;
      if (node.closest && node.closest("[role='dialog'],[aria-modal='true']")) return false;
      return Boolean(candidatePanelForHeading(node));
    });
    nodes.sort(function (left, right) {
      return portfolioPanelScore(candidatePanelForHeading(right)) - portfolioPanelScore(candidatePanelForHeading(left));
    });
    return nodes[0] || null;
  }

  function findPanel() {
    if (lastPanel && lastPanel.isConnected && lastPanel.getAttribute("data-dochain-assets-area-mounted") === "true") {
      if (!isMainPortfolioAssetsPanel(lastPanel)) return null;
      return { panel: lastPanel, header: lastHeader && lastHeader.isConnected ? lastHeader : null };
    }
    var heading = findAssetsHeading();
    if (!heading) return null;
    var panel = candidatePanelForHeading(heading);
    if (!panel) return null;

    var header = headerBlockForHeading(heading, panel);
    return { panel: panel, header: header };
  }

  function findOriginalManageButton(panel) {
    if (!panel) return null;
    var candidates = Array.prototype.slice.call(panel.querySelectorAll("button,a,[role='button'],span,div")).filter(function (node) {
      if (isInsideOwnUI(node)) return false;
      var hiddenOriginalHeader = node.closest && node.closest("[data-dochain-assets-original-header-hidden='true']");
      if (!nodeVisible(node) && !hiddenOriginalHeader) return false;
      var label = normalize(node.getAttribute && (node.getAttribute("aria-label") || node.getAttribute("title")) || node.textContent);
      return /\bmanage\b/i.test(label);
    });
    candidates.sort(function (left, right) {
      var leftButton = /^(button|a)$/i.test(left.tagName || "") || left.getAttribute("role") === "button";
      var rightButton = /^(button|a)$/i.test(right.tagName || "") || right.getAttribute("role") === "button";
      return (rightButton ? 1 : 0) - (leftButton ? 1 : 0);
    });
    return candidates[0] || null;
  }

  function hideOriginalHeader(panel, header, hidden) {
    Array.prototype.slice.call(document.querySelectorAll("[data-dochain-assets-original-header-hidden='true']")).forEach(function (node) {
      node.removeAttribute("data-dochain-assets-original-header-hidden");
    });
    if (!hidden || !panel) return;
    var nodes = [];
    if (header) nodes.push(header);
    Array.prototype.slice.call(panel.querySelectorAll("h1,h2,h3,h4,strong,b,p,span,div")).forEach(function (node) {
      if (!isInsideOwnUI(node) && exactText(node, "Assets")) nodes.push(node);
    });
    var manage = findOriginalManageButton(panel);
    if (manage) nodes.push(manage);
    Array.from(new Set(nodes)).forEach(function (node) {
      if (node && node.setAttribute) node.setAttribute("data-dochain-assets-original-header-hidden", "true");
    });
  }

  function replacementHeader(panel) {
    var header = document.createElement("div");
    header.className = ROOT_CLASS + "__header";
    var heading = document.createElement("h2");
    heading.className = ROOT_CLASS + "__heading";
    heading.textContent = "Assets";
    var manage = document.createElement("button");
    manage.type = "button";
    manage.className = ROOT_CLASS + "__manage";
    manage.innerHTML = "<span>Manage</span><span class=\"" + ROOT_CLASS + "__manageIcon\" aria-hidden=\"true\">≡+</span>";
    manage.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var original = findOriginalManageButton(panel);
      if (original && typeof original.click === "function") original.click();
    });
    header.appendChild(heading);
    header.appendChild(manage);
    return header;
  }

  function cleanupStalePanels(activePanel) {
    Array.prototype.slice.call(document.querySelectorAll("[data-dochain-assets-area-mounted='true']")).forEach(function (panel) {
      if (panel !== activePanel) {
        panel.removeAttribute("data-dochain-assets-area-mounted");
        panel.removeAttribute("data-dochain-assets-area-ready");
        Array.prototype.slice.call(panel.querySelectorAll("[data-dochain-assets-original-header-hidden='true']")).forEach(function (row) {
          row.removeAttribute("data-dochain-assets-original-header-hidden");
        });
        Array.prototype.slice.call(panel.querySelectorAll("[data-dochain-assets-original-hidden='true']")).forEach(function (row) {
          row.removeAttribute("data-dochain-assets-original-hidden");
        });
        var mounted = panel.querySelector("." + ROOT_CLASS);
        if (mounted && mounted.parentElement) mounted.parentElement.removeChild(mounted);
        if (lastPanel === panel) {
          lastPanel = null;
          lastHeader = null;
          lastSignature = "";
        }
      }
    });
  }

  function setPanelReady(panel, mount) {
    var rows = mount ? Array.prototype.slice.call(mount.querySelectorAll("." + ROOT_CLASS + "__row")) : [];
    var hasReplacementRows = rows.some(function (row) {
      try {
        var rect = row.getBoundingClientRect();
        var style = window.getComputedStyle ? window.getComputedStyle(row) : {};
        return rect.width > 20 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden";
      } catch (error) {
        return false;
      }
    });
    if (hasReplacementRows) panel.setAttribute("data-dochain-assets-area-ready", "true");
    else panel.removeAttribute("data-dochain-assets-area-ready");
    return hasReplacementRows;
  }

  function modelAssetKeys(model) {
    var keys = {};
    function add(asset) {
      [
        displaySymbol(asset),
        displayName(asset),
        asset && asset.denom,
        asset && asset.token,
        asset && asset.contract
      ].forEach(function (value) {
        value = cleanKey(value);
        if (value) keys[value] = true;
      });
    }
    model.natives.forEach(add);
    Object.keys(model.childrenByChain).forEach(function (chainID) {
      model.childrenByChain[chainID].forEach(add);
    });
    return keys;
  }

  function originalCandidateLooksLikeAsset(node, keys) {
    if (!node || isInsideOwnUI(node)) return false;
    if (node.closest && node.closest("[role='dialog'],[aria-modal='true']")) return false;
    var text = normalize(node.textContent);
    if (!text || text.length > 180) return false;
    if (/^(assets|manage|send|receive|buy\s*\/\s*sell|portfolio value)$/i.test(text)) return false;
    if (node.querySelector && node.querySelector("." + ROOT_CLASS)) return false;
    try {
      var rect = node.getBoundingClientRect();
      if (rect.height > 110 || rect.width < 120) return false;
    } catch (error) {}
    if (node.matches && node.matches("[class*='Asset_asset__']")) return true;
    var normalizedText = cleanKey(text);
    var hasKnownToken = Object.keys(keys).some(function (key) {
      return key.length >= 2 && (normalizedText === key || normalizedText.indexOf(key + " ") >= 0 || normalizedText.indexOf(" " + key + " ") >= 0);
    });
    return hasKnownToken && (/\$/.test(text) || /\b\d+(?:\.\d+)?\s+[A-Z0-9]{2,12}\b/.test(text));
  }

  function hideOriginalAssetRows(panel, model, hidden) {
    var scope = panel || document;
    Array.prototype.slice.call(scope.querySelectorAll("[data-dochain-assets-original-hidden='true']")).forEach(function (row) {
      row.removeAttribute("data-dochain-assets-original-hidden");
    });
    if (!hidden || !panel) return;
    var keys = modelAssetKeys(model);
    Array.prototype.slice.call(panel.querySelectorAll("[class*='Asset_asset__'],button,a,li,div")).forEach(function (node) {
      if (originalCandidateLooksLikeAsset(node, keys)) node.setAttribute("data-dochain-assets-original-hidden", "true");
    });
  }

  function originalAssetRowFor(asset) {
    var symbol = displaySymbol(asset);
    var name = displayName(asset);
    var panel = lastPanel || (findPanel() && findPanel().panel) || document;
    var rows = Array.prototype.slice.call(panel.querySelectorAll("[class*='Asset_asset__']")).filter(function (row) {
      return !isInsideOwnUI(row);
    });
    return rows.find(function (row) {
      var text = normalize(row.textContent);
      return (symbol && new RegExp("\\b" + symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(text)) ||
        (name && text.indexOf(name) >= 0);
    }) || null;
  }

  function openOriginalAsset(asset) {
    var row = originalAssetRowFor(asset);
    if (!row || !row.click) return false;
    row.click();
    return true;
  }

  function modelSignature(model, hideLow) {
    return JSON.stringify({
      expanded: expandedChainID,
      detailChainOverrideID: detailChainOverrideID,
      hideLow: hideLow,
      natives: model.natives.map(function (asset) {
        var chainID = assetChainID(asset);
        return [
          chainID,
          displaySymbol(asset),
          displayName(asset),
          assetAmount(asset),
          assetValue(asset),
          numeric(asset.priceUsd),
          (model.childrenByChain[chainID] || []).map(function (child) {
            return [displaySymbol(child), displayName(child), assetAmount(child), assetValue(child)].join(":");
          }).join(",")
        ].join("|");
      })
    });
  }

  function renderPanel(panelInfo, model) {
    var panel = panelInfo.panel;
    var header = panelInfo.header;
    var hideLow = readBoolean(HIDE_LOW_KEY, true);
    var signature = modelSignature(model, hideLow);
    cleanupStalePanels(panel);

    if (!model.natives.length) {
      hideOriginalAssetRows(panel, model, false);
      hideOriginalHeader(panel, header, false);
      panel.removeAttribute("data-dochain-assets-area-mounted");
      panel.removeAttribute("data-dochain-assets-area-ready");
      var existingEmpty = panel.querySelector("." + ROOT_CLASS);
      if (existingEmpty && existingEmpty.parentElement) existingEmpty.parentElement.removeChild(existingEmpty);
      lastPanel = null;
      lastHeader = null;
      lastSignature = "";
      return;
    }

    panel.setAttribute("data-dochain-assets-area-mounted", "true");
    panel.removeAttribute("data-dochain-assets-area-ready");
    var mount = panel.querySelector("." + ROOT_CLASS);
    if (lastPanel === panel && mount && mount.getAttribute("data-dochain-assets-signature") === signature && lastSignature === signature) {
      var ready = setPanelReady(panel, mount);
      hideOriginalHeader(panel, header, ready);
      hideOriginalAssetRows(panel, model, ready);
      return;
    }

    if (!mount) {
      mount = document.createElement("div");
      mount.className = ROOT_CLASS;
      if (header && header.parentElement && header !== panel) header.parentElement.insertBefore(mount, header.nextSibling);
      else panel.appendChild(mount);
    }

    mount.setAttribute("data-dochain-assets-signature", signature);
    mount.innerHTML = "";
    mount.appendChild(replacementHeader(panel));

    model.natives.forEach(function (asset) {
      var chainID = assetChainID(asset);
      var children = model.childrenByChain[chainID] || [];
      var visibleChildren = children;
      var hasChildren = visibleChildren.length > 0;
      mount.appendChild(rowNode(asset, {
        hasChildren: hasChildren,
        childCount: visibleChildren.length,
        onClick: hasChildren ? function () {
          detailChainOverrideID = chainID;
          if (openOriginalAsset(asset)) {
            lastSignature = "";
            scheduleRender();
            return;
          }
          expandedChainID = expandedChainID === chainID ? "" : chainID;
          lastSignature = "";
          scheduleRender();
        } : function () {
          detailChainOverrideID = chainID;
          if (openOriginalAsset(asset)) {
            lastSignature = "";
            scheduleRender();
          }
        }
      }));
      if (hasChildren && expandedChainID === chainID) {
        var group = document.createElement("div");
        group.className = ROOT_CLASS + "__children";
        visibleChildren.forEach(function (child) {
          group.appendChild(rowNode(child, { child: true }));
        });
        mount.appendChild(group);
      }
    });

    lastPanel = panel;
    lastHeader = header;
    lastSignature = signature;
    var panelReady = setPanelReady(panel, mount);
    hideOriginalHeader(panel, header, panelReady);
    hideOriginalAssetRows(panel, model, panelReady);
  }

  function findExactTextElement(text) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,strong,b,p,span,div"));
    return nodes.find(function (node) {
      if (!exactText(node, text)) return false;
      if (isInsideOwnUI(node)) return false;
      return true;
    }) || null;
  }

  function detailRootForHeading(heading) {
    if (!heading) return null;
    var root = heading.closest && heading.closest("[role='dialog'],[aria-modal='true'],aside,section,main");
    if (root && !isInsideOwnUI(root)) return root;
    var current = heading.parentElement;
    var depth = 0;
    while (current && current !== document.body && depth < 8) {
      var text = normalize(current.textContent);
      if (/chains/i.test(text) && /send/i.test(text) && /receive/i.test(text)) return current;
      current = current.parentElement;
      depth += 1;
    }
    return heading.parentElement || null;
  }

  function chainLabelFor(chainID, asset) {
    var chain = chainCatalog()[chainID] || {};
    var token = nativeTokenFor(chainID) || {};
    var label = normalize(chain.name || asset && asset.chainName || token.name || displayName(asset) || chainID);
    if (chainID === "Do-Chain") return "Do Chain";
    return label || chainID;
  }

  function nativeAssetForChain(model, chainID) {
    return (model.natives || []).find(function (asset) {
      return assetChainID(asset) === chainID;
    }) || zeroNativeAsset(chainID);
  }

  function chainIDFromDetailText(text) {
    text = normalize(text);
    if (!text) return "";
    if (/\bterra\s+classic\b/i.test(text) || /\blunc\b/i.test(text)) return "columbus-5";
    if (/\bdo[-\s]?chain\b/i.test(text)) return "Do-Chain";
    if (/\bosmosis\b/i.test(text) || /\bosmo\b/i.test(text)) return "osmosis-1";
    if (/\bsolana\b/i.test(text) || /\bsol\b/i.test(text)) return "solana-mainnet";
    if (/\bcardano\b/i.test(text) || /\bada\b/i.test(text)) return "cardano-mainnet";
    if (/\bbitcoin\b/i.test(text) || /\bbtc\b/i.test(text)) return "bitcoin-mainnet";
    if (/\bethereum\b/i.test(text) || /\beth\b/i.test(text)) return "ethereum-mainnet";
    if (/\bsecret\b/i.test(text) || /\bscrt\b/i.test(text)) return "secret-4";
    if (/\bdungeon\b/i.test(text) || /\bdgn\b/i.test(text)) return "dungeon-1";
    return "";
  }

  function detailHeadingBlock(heading, root) {
    var current = heading;
    var depth = 0;
    while (current && current.parentElement && current.parentElement !== root && depth < 4) {
      if (normalize(current.parentElement.textContent) !== "Chains") break;
      current = current.parentElement;
      depth += 1;
    }
    return current || heading;
  }

  function clearDetailNativeRows() {
    Array.prototype.slice.call(document.querySelectorAll("." + DETAIL_NATIVE_CLASS)).forEach(function (row) {
      if (row.parentElement) row.parentElement.removeChild(row);
    });
    Array.prototype.slice.call(document.querySelectorAll("[data-dochain-assets-detail-chain-hidden='true']")).forEach(function (row) {
      row.removeAttribute("data-dochain-assets-detail-chain-hidden");
    });
  }

  function hideOriginalDetailChainRows(heading, root) {
    if (!heading || !root) return;
    Array.prototype.slice.call(root.querySelectorAll("div,button,a,li,section")).forEach(function (node) {
      if (!node || node === heading || isInsideOwnUI(node)) return;
      if (node.closest && node.closest("." + DETAIL_CLASS + ",." + DETAIL_NATIVE_CLASS)) return;
      if (!(heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      var text = normalize(node.textContent);
      if (!text || text === "Chains" || text.length > 220) return;
      if (/^(send|receive|buy\s*\/\s*sell)$/i.test(text)) return;
      if (!chainIDFromDetailText(text)) return;
      try {
        var rect = node.getBoundingClientRect();
        if (rect.height < 20 || rect.height > 130 || rect.width < 120) return;
      } catch (error) {}
      node.setAttribute("data-dochain-assets-detail-chain-hidden", "true");
    });
  }

  function detailNativeChainRow(chainID, asset) {
    var row = document.createElement("div");
    row.className = DETAIL_NATIVE_CLASS;
    row.setAttribute("data-dochain-assets-chain-id", chainID);

    var left = document.createElement("div");
    left.className = DETAIL_NATIVE_CLASS + "__left";
    left.appendChild(iconNode(asset));

    var title = document.createElement("div");
    title.className = DETAIL_NATIVE_CLASS + "__title";
    title.textContent = chainLabelFor(chainID, asset);
    left.appendChild(title);

    var right = document.createElement("div");
    right.className = DETAIL_NATIVE_CLASS + "__right";
    var value = document.createElement("span");
    value.className = ROOT_CLASS + "__value";
    value.textContent = formatUsd(assetValue(asset));
    var amount = document.createElement("span");
    amount.className = ROOT_CLASS + "__amount";
    amount.textContent = formatAmount(asset);
    right.appendChild(value);
    right.appendChild(amount);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function renderDetailNativeChain(heading, root, chainID, model) {
    clearDetailNativeRows();
    if (!heading || !root || !chainID) return null;
    hideOriginalDetailChainRows(heading, root);
    var nativeAsset = nativeAssetForChain(model, chainID);
    if (!nativeAsset) return null;
    var row = detailNativeChainRow(chainID, nativeAsset);
    var anchor = detailHeadingBlock(heading, root);
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(row, anchor.nextSibling);
    return row;
  }

  function selectedDetailChainID(root, model, heading) {
    var text = normalize(root && root.textContent);
    if (!text) return "";
    var candidates = model.natives.filter(function (asset) {
      return (model.childrenByChain[assetChainID(asset)] || []).length > 0;
    });
    if (detailChainOverrideID && candidates.some(function (asset) {
      return assetChainID(asset) === detailChainOverrideID;
    })) {
      return detailChainOverrideID;
    }
    candidates.sort(function (left, right) {
      return displaySymbol(right).length - displaySymbol(left).length;
    });
    var beforeChainsText = "";
    try {
      if (heading && root && root.contains(heading)) {
        var range = document.createRange();
        range.setStart(root, 0);
        range.setEndBefore(heading);
        beforeChainsText = normalize(range.cloneContents().textContent);
      }
    } catch (error) {}
    if (beforeChainsText) {
      for (var beforeIndex = 0; beforeIndex < candidates.length; beforeIndex += 1) {
        var beforeAsset = candidates[beforeIndex];
        var beforeSymbol = displaySymbol(beforeAsset);
        if (beforeSymbol && new RegExp("\\b" + beforeSymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(beforeChainsText)) {
          return assetChainID(beforeAsset);
        }
      }
    }
    for (var index = 0; index < candidates.length; index += 1) {
      var asset = candidates[index];
      var symbol = displaySymbol(asset);
      var name = displayName(asset);
      var chainName = normalize(asset.chainName || name);
      if (name && text.indexOf(name) >= 0) return assetChainID(asset);
      if (chainName && text.indexOf(chainName) >= 0) return assetChainID(asset);
      if (symbol && new RegExp("\\b" + symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(text)) {
        return assetChainID(asset);
      }
    }
    return "";
  }

  function chainsInsertionAnchor(heading, root, chainID) {
    var token = nativeTokenFor(chainID);
    var labels = [
      displaySymbol(token || {}),
      displayName(token || {}),
      normalize(token && token.name),
      normalize((chainCatalog()[chainID] || {}).name)
    ].filter(Boolean);
    var current = heading.nextElementSibling;
    var limit = 0;
    while (current && current.parentElement && current.parentElement !== document.body && limit < 6) {
      var text = normalize(current.textContent);
      if (labels.some(function (label) { return label && text.indexOf(label) >= 0; })) return current;
      if (current === root) break;
      current = current.nextElementSibling;
      limit += 1;
    }
    return heading;
  }

  function detailSignature(chainID, children) {
    return chainID + "::" + children.map(function (asset) {
      return [displaySymbol(asset), displayName(asset), assetAmount(asset), assetValue(asset)].join(":");
    }).join("|");
  }

  function cleanupDetailGroups(activeGroup) {
    Array.prototype.slice.call(document.querySelectorAll("." + DETAIL_CLASS)).forEach(function (group) {
      if (group !== activeGroup && group.parentElement) group.parentElement.removeChild(group);
    });
  }

  function renderDetailGrouping(model) {
    var heading = findExactTextElement("Chains");
    if (!heading) {
      cleanupDetailGroups(null);
      clearDetailNativeRows();
      return;
    }
    var root = detailRootForHeading(heading);
    var chainID = selectedDetailChainID(root, model, heading);
    var children = chainID ? (model.childrenByChain[chainID] || []) : [];
    if (!chainID || !children.length) {
      cleanupDetailGroups(null);
      clearDetailNativeRows();
      return;
    }

    var signature = detailSignature(chainID, children);
    var nativeRow = renderDetailNativeChain(heading, root, chainID, model);
    var existing = root && root.querySelector("." + DETAIL_CLASS);
    if (existing && existing.getAttribute("data-dochain-assets-detail-signature") === signature) {
      cleanupDetailGroups(existing);
      return;
    }

    cleanupDetailGroups(null);
    var group = document.createElement("section");
    group.className = DETAIL_CLASS;
    group.setAttribute("data-dochain-assets-detail-signature", signature);
    group.setAttribute("data-dochain-assets-chain-id", chainID);

    var title = document.createElement("div");
    title.className = DETAIL_CLASS + "__title";
    title.textContent = "Chain assets";
    group.appendChild(title);

    children.forEach(function (asset) {
      group.appendChild(rowNode(asset, { child: true }));
    });

    var anchor = nativeRow || chainsInsertionAnchor(heading, root, chainID);
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(group, anchor.nextSibling);
  }

  function tokenKeysForVisibleRows(model) {
    var keep = {};
    function add(asset) {
      [
        displaySymbol(asset),
        displayName(asset),
        asset && asset.denom,
        asset && asset.token,
        asset && asset.contract
      ].forEach(function (value) {
        value = cleanKey(value);
        if (value) keep[value] = true;
      });
    }
    model.natives.forEach(add);
    Object.keys(model.childrenByChain).forEach(function (chainID) {
      model.childrenByChain[chainID].forEach(function (asset) {
        if (assetValue(asset) >= LOW_VALUE_USD) add(asset);
      });
    });
    return keep;
  }

  function rowMatchesKeep(row, keep) {
    var text = cleanKey(row && row.textContent);
    if (!text) return false;
    var tokens = {};
    text.replace(/[a-z0-9]+/g, function (token) {
      tokens[token] = true;
      return token;
    });
    return Object.keys(keep).some(function (key) {
      return tokens[key] || text === key || text.indexOf(key + " ") === 0 || text.indexOf(" " + key + " ") >= 0;
    });
  }

  function setHidden(row, hidden) {
    var isHidden = row.getAttribute("data-dochain-assets-hidden") === "true";
    if (hidden && !isHidden) row.setAttribute("data-dochain-assets-hidden", "true");
    if (!hidden && isHidden) row.removeAttribute("data-dochain-assets-hidden");
  }

  function manageTokenDialogs() {
    return Array.prototype.slice.call(document.querySelectorAll("[role='dialog'],[aria-modal='true']")).filter(function (dialog) {
      return /manage\s+tokens/i.test(normalize(dialog.textContent));
    });
  }

  function hideManageLowBalanceControls(dialogs) {
    dialogs.forEach(function (dialog) {
      var labels = Array.prototype.slice.call(dialog.querySelectorAll("label")).filter(function (label) {
        return /hide\s+low[-\s]?balance/i.test(normalize(label.textContent));
      });

      labels.forEach(function (label) {
        label.setAttribute("data-dochain-hide-low-balance-control", "true");
        var input = label.querySelector("input[type='checkbox']");
        if (input) input.checked = false;
      });

      var walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        if (!/hide\s+low[-\s]?balance/i.test(normalize(node.nodeValue))) continue;
        var parent = node.parentElement;
        if (!parent || parent.closest("label")) continue;
        var target = parent;
        var depth = 0;
        while (target.parentElement && target.parentElement !== dialog && depth < 3) {
          var text = normalize(target.textContent);
          if (/hide\s+low[-\s]?balance/i.test(text) && !/hide\s+non[-\s]?whitelisted/i.test(text) && text.length < 90) break;
          target = target.parentElement;
          depth += 1;
        }
        if (/hide\s+non[-\s]?whitelisted/i.test(normalize(target.textContent))) {
          parent.setAttribute("data-dochain-hide-low-balance-control", "true");
        } else {
          target.setAttribute("data-dochain-hide-low-balance-control", "true");
        }
        var checkbox = target.querySelector && target.querySelector("input[type='checkbox']");
        if (!checkbox && target.previousElementSibling && /checkbox/i.test(target.previousElementSibling.type || "")) checkbox = target.previousElementSibling;
        if (checkbox) {
          checkbox.checked = false;
          checkbox.setAttribute("data-dochain-hide-low-balance-control", "true");
        }
      }
    });
  }

  function applyManageTokensFilter(model) {
    var dialogs = manageTokenDialogs();
    if (!dialogs.length) return;
    hideManageLowBalanceControls(dialogs);
    var hideLow = false;
    if (!hideLow || (!model.natives.length && !model.rows.length)) {
      dialogs.forEach(function (dialog) {
        Array.prototype.slice.call(dialog.querySelectorAll("[data-dochain-assets-hidden='true']")).forEach(function (row) {
          setHidden(row, false);
        });
      });
      return;
    }
    var keep = tokenKeysForVisibleRows(model);
    if (!Object.keys(keep).length) return;
    dialogs.forEach(function (dialog) {
      var rows = Array.prototype.slice.call(dialog.querySelectorAll("ul[class*='TokenList_results__'] > li, [class*='TokenList_results__'] > li"));
      if (!rows.length) return;
      var hiddenCount = rows.filter(function (row) {
        return !rowMatchesKeep(row, keep);
      }).length;
      if (hiddenCount >= rows.length) {
        rows.forEach(function (row) {
          setHidden(row, false);
        });
        return;
      }
      rows.forEach(function (row) {
        setHidden(row, !rowMatchesKeep(row, keep));
      });
    });
  }

  function render() {
    injectStyle();
    loadSideCatalog();
    var panelInfo = findPanel();
    var model = buildModel();
    if (panelInfo) renderPanel(panelInfo, model);
    else {
      cleanupStalePanels(null);
      hideOriginalAssetRows(null, model, false);
    }
    renderDetailGrouping(model);
    applyManageTokensFilter(model);
  }

  function relevantMutationNode(node) {
    if (!node) return false;
    var element = node.nodeType === 1 ? node : node.parentElement;
    if (!element || isInsideOwnUI(element)) return false;
    if (element.matches && element.matches("[class*='Asset_asset__'],[class*='TokenList_results__'],[role='dialog'],[aria-modal='true']")) return true;
    if (element.closest && element.closest("[class*='Asset_asset__'],[class*='TokenList_results__'],[role='dialog'],[aria-modal='true']")) return true;
    if (element.querySelector && element.querySelector("[class*='Asset_asset__'],[class*='TokenList_results__'],[role='dialog'],[aria-modal='true']")) return true;
    var text = normalize(element.textContent);
    if (text.length <= 160 && /\b(assets|chains|manage tokens|portfolio value)\b/i.test(text)) return true;
    if (!element.querySelectorAll) return false;
    var labels = Array.prototype.slice.call(element.querySelectorAll("h1,h2,h3,h4,strong,b,p,span,div")).slice(0, 40);
    return labels.some(function (label) {
      return !isInsideOwnUI(label) && normalize(label.textContent).length <= 80 && /^(assets|chains|manage tokens|portfolio value)$/i.test(normalize(label.textContent));
    });
  }

  function mutationShouldRender(mutations) {
    return mutations.some(function (mutation) {
      if (mutation.target && mutation.target.closest && mutation.target.closest("." + ROOT_CLASS + ",." + DETAIL_CLASS + ",." + DETAIL_NATIVE_CLASS)) return false;
      if (relevantMutationNode(mutation.target)) return true;
      var added = Array.prototype.slice.call(mutation.addedNodes || []);
      var removed = Array.prototype.slice.call(mutation.removedNodes || []);
      return added.concat(removed).some(relevantMutationNode);
    });
  }

  var scheduled = false;
  function scheduleRender(delay) {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      render();
    }, Number.isFinite(delay) ? delay : 160);
  }

  function start() {
    loadSideCatalog();
    scheduleRender();
    [250, 1000, 2500, 5000].forEach(function (delay) {
      window.setTimeout(scheduleRender, delay);
    });
    document.addEventListener("click", function () {
      window.setTimeout(function () { scheduleRender(180); }, 120);
    }, true);
    window.addEventListener("storage", function (event) {
      if (!event || event.key === HIDE_LOW_KEY || SNAPSHOT_KEYS.indexOf(event.key) >= 0 || String(event.key || "").indexOf(ASSET_CACHE_PREFIX) === 0) {
        invalidateModelCache();
        scheduleRender(60);
      }
    });
    window.addEventListener("do_wallet_portfolio_snapshot", function () {
      invalidateModelCache();
      scheduleRender(60);
    });
    window.addEventListener("do_wallet_chain_assets_update", function () {
      invalidateCatalogCaches();
      scheduleRender(60);
    });
    if (window.MutationObserver) {
      new window.MutationObserver(function (mutations) {
        if (mutationShouldRender(mutations)) scheduleRender(220);
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
