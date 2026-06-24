(function () {
  "use strict";

  if (window.__doWalletMultichainAssets20260615) return;
  window.__doWalletMultichainAssets20260615 = true;

  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var PAGE_TARGET = "do-wallet-page";
  var CONTENT_TARGET = "do-wallet-content";
  var PORTFOLIO_REFRESH_MS = 30000;
  var WETH_CONTRACT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  var L2_CONTRACT = "terra12ckccpalj2y9h54syyst4lpqp79duc9cpxfsyvne409rjw93s8qs2eneh3";
  var REMOVED_NETWORKS = ["dochain-1", "mars-1", "ares-1", "pisco-1", "localterra"];
  var REMOVED_ADDRESS_ALIASES = REMOVED_NETWORKS.slice();
  var STALE_NETWORK_ALIASES = ["dochain-1", "do-main-1", "dochain", "do", "888", "terra", "330", "lunc", "luna", "terra-classic"];
  var PRIORITY_NETWORKS = [
    "Do-Chain",
    "columbus-5",
    "phoenix-1",
    "secret-4",
    "dungeon-1",
    "cosmoshub-4",
    "osmosis-1",
    "ethereum-mainnet",
    "bitcoin-mainnet",
    "solana-mainnet",
    "juno-1",
    "akashnet-2",
    "carbon-1",
    "cheqd-mainnet-1",
    "sentinelhub-2",
    "decentr-mainnet-1",
    "chihuahua-1",
    "arbitrum-one",
  ];

  var CHAINS = {
    "Do-Chain": {
      chainID: "Do-Chain",
      name: "Do Chain",
      networkType: "mainnet",
      lcd: "https://do-chain.com",
      api: "https://do-chain.com",
      rpc: "https://do-chain.com/rpc",
      gasAdjustment: 2,
      gasPrices: { udo: 0.025 },
      prefix: "do",
      coinType: "888",
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
    },
    "columbus-5": {
      chainID: "columbus-5",
      name: "Terra Classic (LUNC)",
      networkType: "mainnet",
      lcd: "https://terra-classic-lcd.publicnode.com",
      api: "https://terra-classic-lcd.publicnode.com",
      rpc: "https://terra-classic-rpc.publicnode.com",
      gasAdjustment: 1.75,
      gasPrices: { uluna: 28.325 },
      prefix: "terra",
      coinType: "330",
      baseAsset: "uluna",
      symbol: "LUNC",
      cmcSymbol: "LUNC",
      icon: "/img/chains/TerraClassic.svg",
      alliance: false,
      channels: {},
      explorer: {
        address: "https://finder.terra.money/classic/address/{}",
        tx: "https://finder.terra.money/classic/tx/{}",
        validator: "https://finder.terra.money/classic/validator/{}",
        block: "https://finder.terra.money/classic/block/{}",
      },
    },
    "phoenix-1": {
      chainID: "phoenix-1",
      name: "Terra (LUNA)",
      networkType: "mainnet",
      lcd: "https://terra-lcd.publicnode.com",
      api: "https://terra-lcd.publicnode.com",
      rpc: "https://terra-rpc.publicnode.com:443",
      gasAdjustment: 1.75,
      gasPrices: { uluna: 28.325 },
      prefix: "terra",
      coinType: "330",
      baseAsset: "uluna",
      symbol: "LUNA",
      cmcSymbol: "LUNA",
      icon: "/img/chains/Terra.svg",
      alliance: false,
      channels: {},
      explorer: {
        address: "https://finder.terra.money/mainnet/address/{}",
        tx: "https://finder.terra.money/mainnet/tx/{}",
        validator: "https://finder.terra.money/mainnet/validator/{}",
        block: "https://finder.terra.money/mainnet/block/{}",
      },
    },
    "secret-4": {
      chainID: "secret-4",
      name: "Secret Network",
      networkType: "mainnet",
      lcd: "https://rest.lavenderfive.com:443/secretnetwork",
      api: "https://rest.lavenderfive.com:443/secretnetwork",
      rpc: "https://rpc.lavenderfive.com:443/secretnetwork",
      gasAdjustment: 1.75,
      gasPrices: { uscrt: 0.1 },
      prefix: "secret",
      coinType: "529",
      baseAsset: "uscrt",
      symbol: "SCRT",
      cmcSymbol: "SCRT",
      icon: "/img/chains/Secret.png",
      alliance: false,
      channels: {},
      explorer: {
        address: "https://www.mintscan.io/secret/account/{}",
        tx: "https://www.mintscan.io/secret/txs/{}",
        validator: "https://www.mintscan.io/secret/validators/{}",
        block: "https://www.mintscan.io/secret/blocks/id/{}",
      },
    },
    "dungeon-1": {
      chainID: "dungeon-1",
      name: "Dungeon Chain",
      networkType: "mainnet",
      lcd: "https://api.dungeongames.io",
      api: "https://api.dungeongames.io",
      rpc: "https://rpc.dungeongames.io",
      gasAdjustment: 1.75,
      gasPrices: { udgn: 0.07 },
      prefix: "dungeon",
      coinType: "118",
      baseAsset: "udgn",
      symbol: "DGN",
      cmcSymbol: "DGN",
      icon: "https://raw.githubusercontent.com/cosmos/chain-registry/master/dungeon/images/DGN.png",
      alliance: false,
      channels: {},
      explorer: {
        address: "https://explorer.dungeongames.io/account/{}",
        tx: "https://explorer.dungeongames.io/tx/{}",
        validator: "https://explorer.dungeongames.io/validator/{}",
        block: "https://explorer.dungeongames.io/block/{}",
      },
    },
    "ethereum-mainnet": {
      chainID: "ethereum-mainnet",
      name: "Ethereum",
      networkType: "mainnet",
      rpc: "https://ethereum.publicnode.com",
      api: "https://ethereum.publicnode.com",
      prefix: "0x",
      coinType: "60",
      baseAsset: "eth",
      symbol: "ETH",
      icon: "/img/chains/Ethereum.svg",
      evm: true,
      chainNamespace: "eip155",
      caip2: "eip155:1",
      explorer: {
        address: "https://etherscan.io/address/{}",
        tx: "https://etherscan.io/tx/{}",
        block: "https://etherscan.io/block/{}",
      },
    },
    "bitcoin-mainnet": {
      chainID: "bitcoin-mainnet",
      name: "Bitcoin",
      networkType: "mainnet",
      prefix: "bc",
      coinType: "0",
      baseAsset: "btc",
      symbol: "BTC",
      icon: "/img/chains/Bitcoin.svg",
      chainNamespace: "bip122",
      caip2: "bip122:000000000019d6689c085ae165831e93",
      explorer: {
        address: "https://mempool.space/address/{}",
        tx: "https://mempool.space/tx/{}",
        block: "https://mempool.space/block/{}",
      },
    },
    "solana-mainnet": {
      chainID: "solana-mainnet",
      name: "Solana",
      networkType: "mainnet",
      rpc: "https://api.mainnet-beta.solana.com",
      api: "https://api.mainnet-beta.solana.com",
      prefix: "sol",
      coinType: "501",
      baseAsset: "sol",
      symbol: "SOL",
      icon: "/img/chains/Solana.svg",
      chainNamespace: "solana",
      explorer: {
        address: "https://solscan.io/account/{}",
        tx: "https://solscan.io/tx/{}",
        block: "https://solscan.io/block/{}",
      },
    },
    "cosmoshub-4": {
      chainID: "cosmoshub-4",
      name: "Cosmos Hub",
      networkType: "mainnet",
      lcd: "https://cosmos-rest.publicnode.com",
      api: "https://cosmos-rest.publicnode.com",
      rpc: "https://cosmos-rpc.publicnode.com",
      prefix: "cosmos",
      coinType: "118",
      baseAsset: "uatom",
      symbol: "ATOM",
      icon: "/img/chains/Cosmos.png",
      alliance: false,
      channels: {},
    },
    "osmosis-1": {
      chainID: "osmosis-1",
      name: "Osmosis",
      networkType: "mainnet",
      lcd: "https://osmosis-rest.publicnode.com",
      api: "https://osmosis-rest.publicnode.com",
      rpc: "https://osmosis-rpc.publicnode.com",
      prefix: "osmo",
      coinType: "118",
      baseAsset: "uosmo",
      symbol: "OSMO",
      icon: "/img/chains/Osmosis.png",
      alliance: false,
      channels: {},
    },
    "juno-1": {
      chainID: "juno-1",
      name: "Juno",
      networkType: "mainnet",
      lcd: "https://juno-rest.publicnode.com",
      api: "https://juno-rest.publicnode.com",
      rpc: "https://juno-rpc.publicnode.com",
      prefix: "juno",
      coinType: "118",
      baseAsset: "ujuno",
      symbol: "JUNO",
      icon: "/img/chains/Juno.png",
      alliance: false,
      channels: {},
    },
    "akashnet-2": {
      chainID: "akashnet-2",
      name: "Akash",
      networkType: "mainnet",
      lcd: "https://akash-rest.publicnode.com",
      api: "https://akash-rest.publicnode.com",
      rpc: "https://akash-rpc.publicnode.com",
      prefix: "akash",
      coinType: "118",
      baseAsset: "uakt",
      symbol: "AKT",
      icon: "/img/chains/Akash.png",
      alliance: false,
      channels: {},
    },
    "carbon-1": {
      chainID: "carbon-1",
      name: "Carbon",
      networkType: "mainnet",
      prefix: "swth",
      coinType: "118",
      baseAsset: "swth",
      symbol: "SWTH",
      icon: "/img/chains/Carbon.png",
      alliance: false,
      channels: {},
    },
    "cheqd-mainnet-1": {
      chainID: "cheqd-mainnet-1",
      name: "cheqd",
      networkType: "mainnet",
      prefix: "cheqd",
      coinType: "118",
      baseAsset: "ncheq",
      symbol: "CHEQ",
      icon: "/img/chains/Cheqd.png",
      alliance: false,
      channels: {},
    },
    "sentinelhub-2": {
      chainID: "sentinelhub-2",
      name: "DVPN",
      networkType: "mainnet",
      prefix: "sent",
      coinType: "118",
      baseAsset: "udvpn",
      symbol: "DVPN",
      icon: "/img/chains/Sentinel.png",
      alliance: false,
      channels: {},
    },
    "decentr-mainnet-1": {
      chainID: "decentr-mainnet-1",
      name: "DEC",
      networkType: "mainnet",
      prefix: "decentr",
      coinType: "118",
      baseAsset: "udec",
      symbol: "DEC",
      icon: "/img/chains/Decentr.png",
      alliance: false,
      channels: {},
    },
    "chihuahua-1": {
      chainID: "chihuahua-1",
      name: "HUAHUA",
      networkType: "mainnet",
      prefix: "chihuahua",
      coinType: "118",
      baseAsset: "uhuahua",
      symbol: "HUAHUA",
      icon: "/img/chains/Chihuahua.png",
      alliance: false,
      channels: {},
    },
    "arbitrum-one": {
      chainID: "arbitrum-one",
      name: "Arbitrum One",
      networkType: "mainnet",
      rpc: "https://arb1.arbitrum.io/rpc",
      api: "https://arb1.arbitrum.io/rpc",
      prefix: "0x",
      coinType: "60",
      baseAsset: "eth",
      symbol: "ETH",
      icon: "/img/chains/Arbitrum.svg",
      evm: true,
      chainNamespace: "eip155",
      caip2: "eip155:42161",
      explorer: {
        address: "https://arbiscan.io/address/{}",
        tx: "https://arbiscan.io/tx/{}",
        block: "https://arbiscan.io/block/{}",
      },
    },
  };

  var NATIVE_TOKENS = {
    "Do-Chain": { denom: "udo", id: "Do-Chain:udo", token: "udo", symbol: "DO", name: "Do Token", decimals: 6, chainID: "Do-Chain", verified: true },
    "columbus-5": { denom: "uluna", id: "columbus-5:uluna", token: "uluna", symbol: "LUNC", name: "Terra Classic (LUNC)", decimals: 6, chainID: "columbus-5", verified: true },
    "phoenix-1": { denom: "uluna", id: "phoenix-1:uluna", token: "uluna", symbol: "LUNA", name: "Terra (LUNA)", decimals: 6, chainID: "phoenix-1", verified: true },
    "secret-4": { denom: "uscrt", id: "secret-4:uscrt", token: "uscrt", symbol: "SCRT", name: "Secret Network", decimals: 6, chainID: "secret-4", verified: true },
    "dungeon-1": { denom: "udgn", id: "dungeon-1:udgn", token: "udgn", symbol: "DGN", name: "Dungeon Chain", decimals: 6, chainID: "dungeon-1", verified: true },
    "ethereum-mainnet": { denom: "eth", id: "ethereum-mainnet:eth", token: "eth", symbol: "ETH", name: "Ethereum", decimals: 18, chainID: "ethereum-mainnet", verified: true },
    "bitcoin-mainnet": { denom: "btc", id: "bitcoin-mainnet:btc", token: "btc", symbol: "BTC", name: "Bitcoin", decimals: 8, chainID: "bitcoin-mainnet", verified: true },
    "solana-mainnet": { denom: "sol", id: "solana-mainnet:sol", token: "sol", symbol: "SOL", name: "Solana", decimals: 9, chainID: "solana-mainnet", verified: true },
    "cosmoshub-4": { denom: "uatom", id: "cosmoshub-4:uatom", token: "uatom", symbol: "ATOM", name: "Cosmos Hub", decimals: 6, chainID: "cosmoshub-4", verified: true },
    "osmosis-1": { denom: "uosmo", id: "osmosis-1:uosmo", token: "uosmo", symbol: "OSMO", name: "Osmosis", decimals: 6, chainID: "osmosis-1", verified: true },
    "juno-1": { denom: "ujuno", id: "juno-1:ujuno", token: "ujuno", symbol: "JUNO", name: "Juno", decimals: 6, chainID: "juno-1", verified: true },
    "akashnet-2": { denom: "uakt", id: "akashnet-2:uakt", token: "uakt", symbol: "AKT", name: "Akash", decimals: 6, chainID: "akashnet-2", verified: true },
    "carbon-1": { denom: "swth", id: "carbon-1:swth", token: "swth", symbol: "SWTH", name: "Carbon", decimals: 8, chainID: "carbon-1", verified: true },
    "cheqd-mainnet-1": { denom: "ncheq", id: "cheqd-mainnet-1:ncheq", token: "ncheq", symbol: "CHEQ", name: "cheqd", decimals: 9, chainID: "cheqd-mainnet-1", verified: true },
    "sentinelhub-2": { denom: "udvpn", id: "sentinelhub-2:udvpn", token: "udvpn", symbol: "DVPN", name: "DVPN", decimals: 6, chainID: "sentinelhub-2", verified: true },
    "decentr-mainnet-1": { denom: "udec", id: "decentr-mainnet-1:udec", token: "udec", symbol: "DEC", name: "DEC", decimals: 6, chainID: "decentr-mainnet-1", verified: true },
    "chihuahua-1": { denom: "uhuahua", id: "chihuahua-1:uhuahua", token: "uhuahua", symbol: "HUAHUA", name: "HUAHUA", decimals: 6, chainID: "chihuahua-1", verified: true },
    "arbitrum-one": { denom: "eth", id: "arbitrum-one:eth", token: "eth", symbol: "ETH", name: "Ethereum on Arbitrum", decimals: 18, chainID: "arbitrum-one", verified: true },
  };

  var EXTRA_NATIVE_TOKENS = {
    "Do-Chain:udodx": { denom: "udodx", id: "Do-Chain:udodx", token: "udodx", symbol: "DODx", name: "DODx", decimals: 6, chainID: "Do-Chain", verified: true, icon: "/do-logo.jpg" },
  };

  var CONTRACT_TOKENS = {
    "columbus-5": [{
      contract: L2_CONTRACT,
      token: L2_CONTRACT,
      denom: L2_CONTRACT,
      id: "columbus-5:" + L2_CONTRACT,
      symbol: "BAKED",
      name: "Baked Coin",
      decimals: 6,
      chainID: "columbus-5",
      verified: true,
      standard: "cw20",
      icon: "/do-logo.jpg",
    }],
    "ethereum-mainnet": [{
      contract: WETH_CONTRACT,
      token: WETH_CONTRACT,
      denom: WETH_CONTRACT,
      id: "ethereum-mainnet:" + WETH_CONTRACT.toLowerCase(),
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
      chainID: "ethereum-mainnet",
      verified: true,
      standard: "erc20",
    }],
  };

  var TOKEN_CATALOG_PATHS = {
    chains: "/station-assets/chains.json?v=20260618dodx1",
    denoms: "/station-assets/denoms.json?v=20260618dodx1",
    buildDenoms: "/station-assets/build/denoms.json?v=20260618dodx1",
    cw20: "/station-assets/build/cw20/tokens.json?v=20260618dodx1",
    prices: "/station-assets/api/prices?v=20260618dodx1",
  };
  var dynamicChains = {};
  var chainCatalogRunning = false;
  var chainCatalogLoaded = false;
  var portfolioRunning = false;
  var providerWallet = null;
  var providerSyncRunning = false;
  var providerSyncAt = 0;

  function shouldRunHere() {
    try {
      var protocol = window.location.protocol;
      if (protocol === "chrome-extension:" || protocol === "moz-extension:") return true;
      if (protocol !== "https:" && protocol !== "http:") return false;
      var host = window.location.hostname.toLowerCase();
      return (
        host === "do-wallet.com" ||
        host === "www.do-wallet.com" ||
        host.endsWith(".do-wallet.com") ||
        host === "do-chain.com" ||
        host === "www.do-chain.com" ||
        host.endsWith(".do-chain.com")
      );
    } catch (error) {
      return false;
    }
  }

  if (!shouldRunHere()) return;

  function markStatus(stage, details) {
    try {
      var root = document.documentElement;
      if (!root) return;
      root.setAttribute("data-dochain-multichain-assets", stage);
      root.setAttribute("data-dochain-multichain-assets-at", String(Date.now()));
      if (details && typeof details === "object") {
        Object.keys(details).forEach(function (key) {
          root.setAttribute("data-dochain-multichain-" + key, String(details[key]));
        });
      }
    } catch (error) {}
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function isRemovedNetwork(chainID) {
    return REMOVED_NETWORKS.indexOf(String(chainID || "")) >= 0;
  }

  function canonicalNetwork(chainID) {
    var raw = String(chainID || "").trim();
    var lower = raw.toLowerCase();
    if (!raw) return "";
    if (lower === "dochain-1" || lower === "do-main-1" || lower === "dochain" || lower === "do" || lower === "888") return "Do-Chain";
    if (lower === "lunc" || lower === "terra-classic") return "columbus-5";
    if (lower === "luna") return "phoenix-1";
    if (lower === "terra" || lower === "330") return "";
    return raw;
  }

  function liveChainOverrides(chainID, chain) {
    if (!isObject(chain)) return chain;
    var next = Object.assign({}, chain);
    if (chainID === "Do-Chain") {
      next.lcd = "https://do-chain.com";
      next.api = "https://do-chain.com";
      next.rpc = "https://do-chain.com/rpc";
      next.prefix = next.prefix || "do";
      next.coinType = next.coinType || "888";
      next.baseAsset = next.baseAsset || "udo";
      next.icon = "/do-logo.jpg";
    } else if (chainID === "secret-4") {
      next.lcd = "https://rest.lavenderfive.com:443/secretnetwork";
      next.api = "https://rest.lavenderfive.com:443/secretnetwork";
      next.rpc = next.rpc || "https://rpc.lavenderfive.com:443/secretnetwork";
    }
    return next;
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      var next = JSON.stringify(value);
      if (window.localStorage.getItem(key) === next) return false;
      window.localStorage.setItem(key, next);
      return true;
    } catch (error) {
      return false;
    }
  }

  function ensureOrdered(list) {
    var existing = Array.isArray(list) ? list.slice() : [];
    var seen = {};
    return PRIORITY_NETWORKS.concat(Object.keys(allChains())).concat(existing).map(canonicalNetwork).filter(function (item) {
      if (!item || isRemovedNetwork(item) || seen[item]) return false;
      if (chainCatalogLoaded && !allChains()[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function ensureNativeToken(tokens, chainID, token) {
    var current = isObject(tokens[chainID]) ? Object.assign({}, tokens[chainID]) : {};
    var native = Array.isArray(current.native) ? current.native.slice() : [];
    var tokenChainID = token.chainID || chainID;
    native = native.filter(function (item) {
      var itemChainID = item && (item.chainID || chainID);
      return item && item.id !== token.id && !(itemChainID === tokenChainID && (item.denom === token.denom || item.token === token.token));
    });
    native.unshift(Object.assign({}, token));
    current.native = native;
    if (!Array.isArray(current.cw20)) current.cw20 = [];
    if (!Array.isArray(current.cw721)) current.cw721 = [];
    tokens[chainID] = current;
  }

  function ensureContractTokens(tokens, chainID, tokenList) {
    var current = isObject(tokens[chainID]) ? Object.assign({}, tokens[chainID]) : {};
    var tokenContracts = tokenList.map(function (token) {
      return String(token.contract || token.token || "").toLowerCase();
    }).filter(Boolean);
    ["erc20", "cw20"].forEach(function (bucket) {
      var list = Array.isArray(current[bucket]) ? current[bucket].slice() : [];
      list = list.filter(function (item) {
        return tokenContracts.indexOf(String(item && (item.contract || item.token || item.denom || "")).toLowerCase()) === -1;
      });
      tokenList.filter(function (token) {
        var standard = String(token.standard || "").toLowerCase();
        return bucket === "erc20" ? standard === "erc20" : standard !== "erc20";
      }).forEach(function (token) {
        list.push(Object.assign({}, token));
      });
      current[bucket] = list;
    });
    if (!Array.isArray(current.native)) current.native = [];
    if (!Array.isArray(current.cw721)) current.cw721 = [];
    tokens[chainID] = current;
  }

  function assetCatalogUrl(path) {
    try {
      var protocol = window.location.protocol;
      if (protocol === "chrome-extension:" || protocol === "moz-extension:") {
        return "https://www.do-wallet.com" + path;
      }
    } catch (error) {}
    return path;
  }

  function fetchJSON(path) {
    if (!window.fetch || !window.Promise) return Promise.resolve(null);
    return window.fetch(assetCatalogUrl(path), { cache: "no-store" }).then(function (response) {
      return response && response.ok ? response.json() : null;
    }).catch(function () {
      return null;
    });
  }

  function fetchJSONTimed(path, timeoutMs) {
    if (!window.fetch || !window.Promise) return Promise.resolve(null);
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeout = window.setTimeout(function () {
      try { if (controller) controller.abort(); } catch (error) {}
    }, timeoutMs || 10000);
    return window.fetch(assetCatalogUrl(path), {
      cache: "no-store",
      signal: controller ? controller.signal : undefined,
    }).then(function (response) {
      window.clearTimeout(timeout);
      return response && response.ok ? response.json() : null;
    }).catch(function () {
      window.clearTimeout(timeout);
      return null;
    });
  }

  var BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  var BECH32_INDEX = {};
  for (var bech32Index = 0; bech32Index < BECH32_ALPHABET.length; bech32Index += 1) {
    BECH32_INDEX[BECH32_ALPHABET.charAt(bech32Index)] = bech32Index;
  }

  function bech32Polymod(values) {
    var chk = 1;
    for (var i = 0; i < values.length; i += 1) {
      var top = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ values[i];
      if (top & 1) chk ^= 0x3b6a57b2;
      if (top & 2) chk ^= 0x26508e6d;
      if (top & 4) chk ^= 0x1ea119fa;
      if (top & 8) chk ^= 0x3d4233dd;
      if (top & 16) chk ^= 0x2a1462b3;
    }
    return chk;
  }

  function bech32HrpExpand(prefix) {
    var out = [];
    for (var i = 0; i < prefix.length; i += 1) out.push(prefix.charCodeAt(i) >> 5);
    out.push(0);
    for (var j = 0; j < prefix.length; j += 1) out.push(prefix.charCodeAt(j) & 31);
    return out;
  }

  function bech32Decode(address) {
    var value = clean(address).toLowerCase();
    var separator = value.lastIndexOf("1");
    if (separator <= 0 || separator + 7 > value.length) return null;
    var prefix = value.slice(0, separator);
    var data = [];
    for (var i = separator + 1; i < value.length; i += 1) {
      var word = BECH32_INDEX[value.charAt(i)];
      if (word === undefined) return null;
      data.push(word);
    }
    if (bech32Polymod(bech32HrpExpand(prefix).concat(data)) !== 1) return null;
    return { prefix: prefix, words: data.slice(0, -6) };
  }

  function bech32Encode(prefix, words) {
    var cleanPrefix = clean(prefix).toLowerCase();
    if (!cleanPrefix || !Array.isArray(words) || !words.length) return "";
    var values = bech32HrpExpand(cleanPrefix).concat(words);
    var polymod = bech32Polymod(values.concat([0, 0, 0, 0, 0, 0])) ^ 1;
    var checksum = [];
    for (var i = 0; i < 6; i += 1) checksum.push((polymod >> (5 * (5 - i))) & 31);
    return cleanPrefix + "1" + words.concat(checksum).map(function (word) {
      return BECH32_ALPHABET.charAt(word);
    }).join("");
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function activeWallet() {
    return (
      providerWallet ||
      walletFromPayload(readJSON(BRIDGE_KEY, null)) ||
      walletFromPayload(readJSON(AUTH_KEY, null)) ||
      walletFromPayload(readJSON("user", null)) ||
      null
    );
  }

  function walletName(wallet) {
    if (!isObject(wallet)) return "";
    return clean(wallet.name || wallet.walletName || wallet.label || wallet.id || wallet.accountName);
  }

  function visibleWalletName() {
    var ignored = /^(send|receive|swap|history|settings|copy|copied|qr|back|manage|dashboard|buy|sell|assets|activity|connect|connect wallet|edit validator|do chain|bitcoin|ethereum|solana|terra|lunc|luna)$/i;
    return Array.prototype.slice.call(document.querySelectorAll("header button, header [role='button'], header *, button, [role='button']"))
      .map(function (node) {
        var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { top: 999, left: 0, width: 0, height: 0 };
        return { text: clean(node.textContent).replace(/\s+/g, " "), rect: rect };
      })
      .filter(function (entry) {
        return entry.text && entry.text.length >= 2 && entry.text.length <= 42 && entry.rect.top >= 0 && entry.rect.top < 170 && entry.rect.width > 40 && !ignored.test(entry.text);
      })
      .sort(function (a, b) { return b.rect.left - a.rect.left; })[0]?.text || "";
  }

  function bridgeRequest(method, params) {
    return new Promise(function (resolve, reject) {
      var id = "do-wallet-assets-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      var timeout = window.setTimeout(function () {
        window.removeEventListener("message", onMessage);
        reject(new Error("No Do-Wallet bridge response was received."));
      }, 9000);
      function onMessage(event) {
        if (event.source !== window || event.origin !== window.location.origin) return;
        var message = event.data;
        if (!message || message.target !== PAGE_TARGET || message.id !== id) return;
        window.clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        if (message.success) resolve(message.result);
        else reject(new Error(String(message.error && (message.error.message || message.error) || "Do-Wallet bridge request failed.")));
      }
      window.addEventListener("message", onMessage);
      window.postMessage({
        target: CONTENT_TARGET,
        type: "DO_WALLET_DAPP_REQUEST",
        id: id,
        method: method,
        params: Array.isArray(params) ? params : [],
      }, window.location.origin);
    });
  }

  function mergeAddressMaps(left, right) {
    var out = {};
    [left, right].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        var chainID = canonicalNetwork(key) || key;
        var value = clean(map[key]);
        if (chainID && isPublicAddress(value)) out[chainID] = value;
      });
    });
    return Object.keys(out).length ? out : undefined;
  }

  function normalizeBridgeWallet(result, chainID) {
    var wallet = Array.isArray(result)
      ? { address: result[0] || "", addresses: result[0] ? { "Do-Chain": result[0] } : {} }
      : isObject(result && result.wallet)
        ? result.wallet
        : isObject(result)
          ? result
          : {};
    if (!isObject(wallet)) return null;
    var addresses = mergeAddressMaps(wallet.addresses, wallet.addressMap);
    var address = clean(
      (addresses && (addresses[chainID] || addresses["Do-Chain"])) ||
      wallet.address ||
      wallet.doAddress ||
      wallet.doChainAddress ||
      (addresses && Object.keys(addresses).map(function (key) { return addresses[key]; }).find(Boolean))
    );
    if (address && !addresses) addresses = { "Do-Chain": address };
    if (!address && addresses) address = clean(Object.keys(addresses).map(function (key) { return addresses[key]; }).find(Boolean));
    if (!address && !addresses) return null;
    return {
      name: walletName(wallet) || visibleWalletName() || "Do-Wallet",
      walletName: walletName(wallet) || visibleWalletName() || "Do-Wallet",
      address: address || undefined,
      addresses: addresses,
      addressMap: addresses,
      source: "do-wallet-extension",
      walletSource: "extension-content-bridge",
      syncedFromExtension: true,
      updatedAt: Date.now(),
    };
  }

  function mergeWallet(left, right) {
    left = isObject(left) ? left : {};
    right = isObject(right) ? right : {};
    var addresses = mergeAddressMaps(left.addresses || left.addressMap, right.addresses || right.addressMap);
    var next = Object.assign({}, left, right);
    if (addresses) {
      next.addresses = addresses;
      next.addressMap = addresses;
    }
    next.name = walletName(right) || walletName(left) || visibleWalletName() || "Do-Wallet";
    next.walletName = next.name;
    next.address = clean(right.address || left.address || (addresses && Object.keys(addresses).map(function (key) { return addresses[key]; }).find(Boolean))) || undefined;
    return next;
  }

  function persistProviderWallet(wallet) {
    if (!isObject(wallet)) return;
    var existing = walletFromPayload(readJSON(BRIDGE_KEY, null)) || walletFromPayload(readJSON(AUTH_KEY, null)) || {};
    providerWallet = mergeWallet(existing, wallet);
    var payload = {
      source: "do-wallet-extension",
      wallet: providerWallet,
      updatedAt: Date.now(),
    };
    writeJSON(BRIDGE_KEY, payload);
    writeJSON(AUTH_KEY, Object.assign({}, payload, { expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
    dispatchUpdates();
  }

  function requestProviderWallet(force) {
    if (!window.Promise || !shouldRunHere()) return;
    if (providerSyncRunning) return;
    if (!force && Date.now() - providerSyncAt < 15000) return;
    providerSyncRunning = true;
    providerSyncAt = Date.now();
    bridgeRequest("connect", ["Do-Chain"])
      .then(function (result) {
        var wallet = normalizeBridgeWallet(result, "Do-Chain");
        if (wallet) persistProviderWallet(wallet);
        markStatus(wallet ? "provider-wallet-loaded" : "provider-wallet-empty");
      })
      .catch(function (error) {
        markStatus("provider-wallet-error", { error: String(error && error.message || error).slice(0, 100) });
      })
      .then(function () {
        providerSyncRunning = false;
      });
  }

  function isPublicAddress(value) {
    var address = clean(value);
    return Boolean(
      bech32Decode(address) ||
      isEth(address) ||
      isBtc(address) ||
      isSol(address)
    );
  }

  function collectRawAddresses(value) {
    var out = [];
    var seen = {};
    function add(address) {
      address = clean(address);
      if (!isPublicAddress(address)) return;
      var key = address.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(address);
    }
    function scan(node, depth) {
      if (depth > 6 || node === null || node === undefined) return;
      if (typeof node === "string") {
        add(node);
        return;
      }
      if (Array.isArray(node)) {
        node.slice(0, 120).forEach(function (item) { scan(item, depth + 1); });
        return;
      }
      if (!isObject(node)) return;
      Object.keys(node).slice(0, 180).forEach(function (key) {
        if (/word|mnemonic|seed|private|encrypted|cipher|password/i.test(key)) return;
        scan(node[key], depth + 1);
      });
    }
    scan(value, 0);
    return out;
  }

  function walletIdentityKeys(wallet) {
    if (!isObject(wallet)) return [];
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var keys = [wallet.address, wallet.name, wallet.walletName, wallet.label]
      .concat(Object.keys(addresses).map(function (key) { return addresses[key]; }))
      .map(function (value) { return clean(value).toLowerCase(); })
      .filter(Boolean);
    return keys.filter(function (key, index) { return keys.indexOf(key) === index; });
  }

  function chainSupportsCosmosQueries(chain) {
    if (!isObject(chain)) return false;
    if (chain.evm || chain.chainNamespace === "eip155" || chain.chainNamespace === "bip122" || chain.chainNamespace === "solana") return false;
    return Boolean(chain.prefix && (chain.lcd || chain.api || chain.rpc || chain.chainID === "Do-Chain"));
  }

  function chainSupportsEvmQueries(chain) {
    return Boolean(chain && (chain.evm || chain.chainNamespace === "eip155" || clean(chain.prefix) === "0x"));
  }

  function chainSupportsBtcQueries(chainID, chain) {
    return chainID === "bitcoin-mainnet" || (chain && chain.chainNamespace === "bip122");
  }

  function chainSupportsSolQueries(chainID, chain) {
    return chainID === "solana-mainnet" || (chain && chain.chainNamespace === "solana");
  }

  function buildWalletAddressMap(wallet) {
    if (!isObject(wallet)) return {};
    var chains = allChains();
    var map = {};
    var stored = isObject(wallet.addresses) ? wallet.addresses : {};
    var raw = collectRawAddresses(wallet);
    Object.keys(stored).forEach(function (key) {
      var chainID = canonicalNetwork(key) || key;
      var address = clean(stored[key]);
      if (chainID === "Do-Chain" && !isDo(address)) return;
      if (chainID && isPublicAddress(address)) map[chainID] = address;
    });
    raw.forEach(function (address) {
      if (isDo(address)) map["Do-Chain"] = map["Do-Chain"] || address;
      else if (isTerra(address)) {
        map["columbus-5"] = map["columbus-5"] || address;
        map["phoenix-1"] = map["phoenix-1"] || address;
      } else if (isSecret(address)) map["secret-4"] = map["secret-4"] || address;
      else if (isDungeon(address)) map["dungeon-1"] = map["dungeon-1"] || address;
      else if (isCosmos(address)) map["cosmoshub-4"] = map["cosmoshub-4"] || address;
      else if (isOsmo(address)) map["osmosis-1"] = map["osmosis-1"] || address;
      else if (isEth(address)) map["ethereum-mainnet"] = map["ethereum-mainnet"] || address;
      else if (isBtc(address)) map["bitcoin-mainnet"] = map["bitcoin-mainnet"] || address;
      else if (isSol(address)) map["solana-mainnet"] = map["solana-mainnet"] || address;
    });

    var decoded = raw.map(function (address) {
      return { address: address, decoded: bech32Decode(address) };
    }).filter(function (entry) { return entry.decoded; });
    var sourceBech32 = decoded[0] && decoded[0].decoded;
    var ethAddress = raw.find(isEth);
    var btcAddress = raw.find(isBtc);
    var solAddress = raw.find(function (address) {
      return isSol(address) && !bech32Decode(address);
    });

    Object.keys(chains).forEach(function (chainID) {
      var chain = chains[chainID];
      if (!chain || chain.networkType === "testnet") return;
      var prefix = clean(chain.prefix);
      if (map[chainID]) return;
      if (chainSupportsEvmQueries(chain)) {
        if (ethAddress) map[chainID] = ethAddress;
        return;
      }
      if (chainSupportsBtcQueries(chainID, chain)) {
        if (btcAddress) map[chainID] = btcAddress;
        return;
      }
      if (chainSupportsSolQueries(chainID, chain)) {
        if (solAddress) map[chainID] = solAddress;
        return;
      }
      if (prefix && sourceBech32) {
        map[chainID] = bech32Encode(prefix, sourceBech32.words);
      }
    });

    return map;
  }

  function normalizeDenomCatalog(catalog) {
    var out = {};
    function add(key, item) {
      if (!isObject(item)) return;
      var chainID = canonicalNetwork(item.chainID || chainIDFromKey(key));
      var denom = clean(item.denom || item.token || tokenFromKey(key));
      if (!chainID || !denom || isRemovedNetwork(chainID)) return;
      out[chainID + ":" + denom] = Object.assign({}, item, {
        chainID: chainID,
        denom: denom,
        token: item.token || denom,
      });
    }
    collectCatalogEntries(catalog).forEach(function (entry) {
      add(entry.key, entry.item);
    });
    Object.keys(NATIVE_TOKENS).forEach(function (chainID) {
      var token = NATIVE_TOKENS[chainID];
      add(chainID + ":" + token.denom, token);
    });
    Object.keys(EXTRA_NATIVE_TOKENS).forEach(function (key) {
      add(key, EXTRA_NATIVE_TOKENS[key]);
    });
    Object.keys(CONTRACT_TOKENS).forEach(function (chainID) {
      CONTRACT_TOKENS[chainID].forEach(function (token) {
        add(chainID + ":" + (token.denom || token.token || token.contract), token);
      });
    });
    return out;
  }

  function mergeObjects() {
    var out = {};
    Array.prototype.slice.call(arguments).forEach(function (value) {
      if (!isObject(value)) return;
      Object.keys(value).forEach(function (key) { out[key] = value[key]; });
    });
    return out;
  }

  function tokenMeta(chainID, denom, chain, denoms) {
    chainID = canonicalNetwork(chainID) || chainID;
    denom = clean(denom);
    denoms = isObject(denoms) ? denoms : {};
    var lowerDenom = denom.toLowerCase();
    var meta = chainID === "columbus-5" && lowerDenom === "uluna" ? NATIVE_TOKENS["columbus-5"] : null;
    if (!meta) meta = denoms[chainID + ":" + denom] || denoms[chainID + ":" + lowerDenom] || null;
    if (!meta) meta = EXTRA_NATIVE_TOKENS[chainID + ":" + denom] || EXTRA_NATIVE_TOKENS[chainID + ":" + lowerDenom] || null;
    if (!meta && denom === "wei") meta = denoms[chainID + ":eth"] || NATIVE_TOKENS[chainID];
    if (!meta && denom === "lamports") meta = denoms[chainID + ":sol"] || NATIVE_TOKENS[chainID];
    if (!meta && (denom === "sat" || denom === "sats" || denom === "satoshi")) meta = denoms[chainID + ":btc"] || NATIVE_TOKENS[chainID];
    if (!meta && chain && chain.baseAsset && lowerDenom === clean(chain.baseAsset).toLowerCase()) meta = NATIVE_TOKENS[chainID];
    if (!meta) meta = NATIVE_TOKENS[chainID];
    var decimals = Number(meta && meta.decimals);
    if (!Number.isFinite(decimals)) {
      if (denom === "wei") decimals = 18;
      else if (denom === "lamports") decimals = 9;
      else if (denom === "sat" || denom === "sats" || denom === "satoshi") decimals = 8;
      else decimals = 6;
    }
    return {
      denom: denom,
      token: (meta && (meta.token || meta.denom)) || denom,
      symbol: (meta && meta.symbol) || (chain && chain.symbol) || denom.replace(/^u/, "").toUpperCase(),
      name: (meta && meta.name) || (chain && chain.name) || denom,
      icon: (meta && meta.icon) || (chain && chain.icon) || "",
      decimals: decimals,
      contract: meta && (meta.contract || meta.tokenAddress),
    };
  }

  function decimalString(raw, decimals) {
    var value = clean(raw).replace(/,/g, "");
    var negative = value.charAt(0) === "-";
    if (negative) value = value.slice(1);
    if (!/^\d+$/.test(value)) value = String(Math.max(0, Number(value) || 0));
    decimals = Math.max(0, Number(decimals) || 0);
    if (decimals <= 0) return (negative ? "-" : "") + value;
    if (value.length <= decimals) value = "0".repeat(decimals - value.length + 1) + value;
    var whole = value.slice(0, -decimals) || "0";
    var fraction = value.slice(-decimals).replace(/0+$/, "");
    return (negative ? "-" : "") + (fraction ? whole + "." + fraction : whole);
  }

  function numberFromDecimal(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function readPriceEntry(prices, keys) {
    if (!isObject(prices)) return { price: 0, change: 0 };
    for (var i = 0; i < keys.length; i += 1) {
      var key = clean(keys[i]);
      if (!key) continue;
      var entry = prices[key] || prices[key.toLowerCase()] || prices[key.toUpperCase()];
      if (typeof entry === "number") return { price: entry, change: 0 };
      if (isObject(entry)) {
        var price = Number(entry.price || entry.usd || entry.value || entry.current_price);
        var change = Number(entry.change || entry.usd_24h_change || entry.price_change_percentage_24h || 0);
        if (Number.isFinite(price) && price > 0) {
          return { price: price, change: Number.isFinite(change) ? change : 0 };
        }
      }
    }
    return { price: 0, change: 0 };
  }

  function priceFor(prices, chainID, denom, symbol) {
    var keys = [chainID + ":" + denom, chainID + ":" + symbol, denom, symbol];
    var lowerDenom = clean(denom).toLowerCase();
    var lowerSymbol = clean(symbol).toLowerCase();
    if (chainID === "columbus-5" && lowerDenom === "uluna") keys.push("uluna:classic", "uluna_classic", "lunc");
    if (chainID === "phoenix-1" && lowerDenom === "uluna") keys.push("uluna:phoenix", "luna2", "luna");
    if (chainID === "Do-Chain" && lowerDenom === "udo") keys.push("do", "DO", "dt", "Do-Chain:udo");
    if (lowerDenom === "wei" || lowerSymbol === "eth") keys.push("eth", "ethereum", chainID + ":wei");
    if (lowerDenom === "lamports" || lowerSymbol === "sol") keys.push("sol", "solana");
    if (lowerDenom === "sats" || lowerDenom === "sat" || lowerSymbol === "btc") keys.push("btc", "bitcoin-mainnet:btc");
    return readPriceEntry(prices, keys);
  }

  function rawAmountPositive(raw) {
    var value = clean(raw).replace(/,/g, "");
    if (/^\d+$/.test(value)) return value.replace(/^0+/, "") !== "";
    return Number(value) > 0;
  }

  function buildAsset(chainID, chain, denom, rawAmount, prices, denoms, extra) {
    if (!rawAmountPositive(rawAmount)) return null;
    var meta = tokenMeta(chainID, denom, chain, denoms);
    var balance = decimalString(rawAmount, meta.decimals);
    var amount = numberFromDecimal(balance);
    var price = priceFor(prices, chainID, denom, meta.symbol);
    var valueUsd = amount > 0 && price.price > 0 ? amount * price.price : 0;
    var id = chainID + ":" + clean(denom).toLowerCase() + (extra && extra.category && extra.category !== "wallet" ? ":" + extra.category : "");
    return Object.assign({
      id: id,
      key: id,
      chainID: chainID,
      chainId: chainID,
      chainName: (chain && chain.name) || chainID,
      network: chainID,
      denom: denom,
      token: meta.token,
      symbol: meta.symbol,
      name: meta.name,
      icon: meta.icon,
      contract: meta.contract,
      amount: amount,
      balance: balance,
      quantity: amount,
      rawAmount: clean(rawAmount),
      decimals: meta.decimals,
      priceUsd: price.price,
      valueUsd: valueUsd,
      value: valueUsd,
      change: price.change,
      whitelisted: true,
      source: "do-wallet-multichain-live",
      category: "wallet",
      updatedAt: Date.now(),
    }, extra || {});
  }

  function aggregateCoinAssets(entries, chainID, chain, prices, denoms, category, namePrefix) {
    var totals = {};
    entries.forEach(function (coin) {
      if (!coin || !coin.denom || !rawAmountPositive(coin.amount)) return;
      var key = clean(coin.denom);
      if (!totals[key]) totals[key] = "0";
      try {
        if (typeof BigInt === "function") totals[key] = (BigInt(totals[key]) + BigInt(clean(coin.amount))).toString();
        else totals[key] = String(Number(totals[key]) + Number(coin.amount));
      } catch (error) {
        totals[key] = String(Number(totals[key]) + Number(coin.amount));
      }
    });
    return Object.keys(totals).map(function (denom) {
      var asset = buildAsset(chainID, chain, denom, totals[denom], prices, denoms, {
        category: category,
        name: namePrefix ? namePrefix + " " + tokenMeta(chainID, denom, chain, denoms).symbol : undefined,
      });
      return asset;
    }).filter(Boolean);
  }

  function validatorAddressFromEntry(entry) {
    return clean(
      entry && (
        entry.validatorAddress ||
        entry.validator_address ||
        entry.operatorAddress ||
        entry.operator_address ||
        entry.validator ||
        entry.delegation && entry.delegation.validator_address
      )
    );
  }

  function validatorScopedCoinAsset(chainID, chain, coin, validator, address, prices, denoms, category) {
    validator = clean(validator);
    if (!coin || !validator || !coin.denom || !rawAmountPositive(coin.amount)) return null;
    var asset = buildAsset(chainID, chain, coin.denom, coin.amount, prices, denoms, {
      category: category,
      walletAddress: address,
      validatorAddress: validator,
      validator_address: validator,
      operatorAddress: validator,
      operator_address: validator,
      scope: "validator",
    });
    if (!asset) return null;
    asset.id = [
      chainID,
      clean(coin.denom).toLowerCase(),
      category,
      validator.toLowerCase(),
    ].join(":");
    asset.key = asset.id;
    asset.parentAssetKey = [
      chainID,
      clean(coin.denom).toLowerCase(),
      category,
    ].join(":");
    return asset;
  }

  function validatorRowsForDenom(rows, denom) {
    denom = clean(denom).toLowerCase();
    return (Array.isArray(rows) ? rows : []).filter(function (row) {
      return clean(row && row.denom).toLowerCase() === denom;
    });
  }

  function validatorRowsByAddress(rows) {
    var out = {};
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var validator = validatorAddressFromEntry(row);
      var key = validator.toLowerCase();
      if (!key) return;
      if (!out[key]) {
        out[key] = {
          validatorAddress: validator,
          validator_address: validator,
          operatorAddress: validator,
          operator_address: validator,
          chainID: row.chainID || row.chainId || "",
          chainId: row.chainID || row.chainId || "",
          chainName: row.chainName || "",
          walletAddress: row.walletAddress || "",
          denom: row.denom || "",
          symbol: row.symbol || "",
          amount: 0,
          quantity: 0,
          valueUsd: 0,
          value: 0,
          rows: [],
        };
      }
      out[key].amount += Number(row.amount || row.quantity || row.balance || 0) || 0;
      out[key].quantity = out[key].amount;
      out[key].valueUsd += Number(row.valueUsd || row.value || 0) || 0;
      out[key].value = out[key].valueUsd;
      out[key].balance = String(out[key].amount);
      out[key].rows.push(row);
    });
    return out;
  }

  function lcdURL(chainID, path) {
    return "/station-assets/api/lcd/" + encodeURIComponent(chainID) + path;
  }

  function chainHasKnownCw20(chainID) {
    return (CONTRACT_TOKENS[chainID] || []).some(function (token) {
      return String(token && token.standard || "").toLowerCase() === "cw20";
    });
  }

  function fetchCosmosPortfolio(chainID, chain, address, prices, denoms) {
    var bankPath = lcdURL(chainID, "/cosmos/bank/v1beta1/balances/" + encodeURIComponent(address) + "?pagination.limit=2000");
    var delegationsPath = lcdURL(chainID, "/cosmos/staking/v1beta1/delegations/" + encodeURIComponent(address) + "?pagination.limit=2000");
    var rewardsPath = lcdURL(chainID, "/cosmos/distribution/v1beta1/delegators/" + encodeURIComponent(address) + "/rewards");
    var unbondingPath = lcdURL(chainID, "/cosmos/staking/v1beta1/delegators/" + encodeURIComponent(address) + "/unbonding_delegations");
    var cw20Path = "/station-assets/api/cw20/" + encodeURIComponent(address) + "?chainID=" + encodeURIComponent(chainID);
    return Promise.all([
      fetchJSONTimed(bankPath, 12000),
      fetchJSONTimed(delegationsPath, 12000),
      fetchJSONTimed(rewardsPath, 12000),
      fetchJSONTimed(unbondingPath, 12000),
      chainHasKnownCw20(chainID) ? fetchJSONTimed(cw20Path, 18000) : Promise.resolve([]),
    ]).then(function (responses) {
      var bank = responses[0] || {};
      var delegations = responses[1] || {};
      var rewards = responses[2] || {};
      var unbonding = responses[3] || {};
      var cw20 = Array.isArray(responses[4]) ? responses[4] : [];
      var assets = (Array.isArray(bank.balances) ? bank.balances : []).map(function (coin) {
        return buildAsset(chainID, chain, coin.denom, coin.amount, prices, denoms, {
          walletAddress: address,
          category: "wallet",
        });
      }).filter(Boolean);
      cw20.forEach(function (row) {
        var contract = row && (row.contract || row.token || row.denom);
        var amount = row && (row.balance || row.amount);
        if (!contract || !amount) return;
        var asset = buildAsset(chainID, chain, contract, amount, prices, denoms, {
          walletAddress: address,
          category: "wallet",
          contract: contract,
          standard: "cw20",
          symbol: row.symbol || undefined,
          name: row.name || undefined,
          decimals: row.decimals,
        });
        if (asset) {
          if (row.symbol) asset.symbol = row.symbol;
          if (row.name) asset.name = row.name;
          if (row.decimals !== undefined) {
            asset.decimals = Number(row.decimals);
            asset.balance = decimalString(amount, asset.decimals);
            asset.amount = numberFromDecimal(asset.balance);
            asset.quantity = asset.amount;
            asset.valueUsd = asset.amount > 0 && asset.priceUsd > 0 ? asset.amount * asset.priceUsd : 0;
            asset.value = asset.valueUsd;
          }
          assets.push(asset);
        }
      });

      var stakedCoins = [];
      var validators = {};
      var validatorDelegations = [];
      var validatorRewards = [];
      var validatorUnbondings = [];
      (Array.isArray(delegations.delegation_responses) ? delegations.delegation_responses : []).forEach(function (entry) {
        if (entry && entry.balance) stakedCoins.push(entry.balance);
        var validator = validatorAddressFromEntry(entry);
        if (validator) validators[validator] = true;
        var delegationRow = validatorScopedCoinAsset(chainID, chain, entry && entry.balance, validator, address, prices, denoms, "staking");
        if (delegationRow) validatorDelegations.push(delegationRow);
      });
      (Array.isArray(rewards.rewards) ? rewards.rewards : []).forEach(function (entry) {
        var validator = validatorAddressFromEntry(entry);
        (Array.isArray(entry && entry.reward) ? entry.reward : []).forEach(function (coin) {
          var rewardRow = validatorScopedCoinAsset(chainID, chain, coin, validator, address, prices, denoms, "reward");
          if (rewardRow) validatorRewards.push(rewardRow);
        });
      });
      var rewardCoins = Array.isArray(rewards.total) ? rewards.total : [];
      var unbondingCoins = [];
      (Array.isArray(unbonding.unbonding_responses) ? unbonding.unbonding_responses : []).forEach(function (entry) {
        var validator = validatorAddressFromEntry(entry);
        (Array.isArray(entry.entries) ? entry.entries : []).forEach(function (release) {
          if (release && release.balance) {
            var coin = { denom: chain.baseAsset || "udo", amount: release.balance };
            unbondingCoins.push(coin);
            var unbondingRow = validatorScopedCoinAsset(chainID, chain, coin, validator, address, prices, denoms, "unbonding");
            if (unbondingRow) validatorUnbondings.push(unbondingRow);
          }
        });
      });

      var staking = aggregateCoinAssets(stakedCoins, chainID, chain, prices, denoms, "staking", "Staked").concat(
        aggregateCoinAssets(rewardCoins, chainID, chain, prices, denoms, "reward", "Rewards"),
        aggregateCoinAssets(unbondingCoins, chainID, chain, prices, denoms, "unbonding", "Unbonding")
      ).map(function (asset) {
        asset.walletAddress = address;
        asset.validators = Object.keys(validators);
        asset.validatorCount = Object.keys(validators).length;
        asset.validatorDelegations = validatorRowsForDenom(validatorDelegations, asset.denom);
        asset.validatorDelegationsByAddress = validatorRowsByAddress(asset.validatorDelegations);
        asset.validatorRewards = validatorRowsForDenom(validatorRewards, asset.denom);
        asset.validatorRewardsByAddress = validatorRowsByAddress(asset.validatorRewards);
        asset.validatorUnbondings = validatorRowsForDenom(validatorUnbondings, asset.denom);
        asset.validatorUnbondingsByAddress = validatorRowsByAddress(asset.validatorUnbondings);
        asset.validatorBreakdown = {
          delegations: asset.validatorDelegations,
          delegationsByAddress: asset.validatorDelegationsByAddress,
          rewards: asset.validatorRewards,
          rewardsByAddress: asset.validatorRewardsByAddress,
          unbondings: asset.validatorUnbondings,
          unbondingsByAddress: asset.validatorUnbondingsByAddress,
        };
        return asset;
      });

      return { assets: assets, staking: staking, chainID: chainID, address: address };
    });
  }

  function fetchEvmPortfolio(chainID, chain, address, prices, denoms) {
    var nativePath = "/station-assets/api/evm/" + encodeURIComponent(chainID) + "/address/" + encodeURIComponent(address);
    var tokenFetches = (CONTRACT_TOKENS[chainID] || []).filter(function (token) {
      return String(token.standard || "").toLowerCase() === "erc20" && isEvmContract(token.contract || token.token);
    }).map(function (token) {
      return fetchJSONTimed("/station-assets/api/evm/" + encodeURIComponent(chainID) + "/address/" + encodeURIComponent(address) + "/token/" + encodeURIComponent(token.contract || token.token), 12000);
    });
    return Promise.all([fetchJSONTimed(nativePath, 12000)].concat(tokenFetches)).then(function (responses) {
      var assets = [];
      responses.forEach(function (row) {
        if (!row || !row.amount) return;
        var denom = row.denom || row.token || (chain && chain.baseAsset) || "wei";
        var asset = buildAsset(chainID, chain, denom, row.amount, prices, denoms, {
          walletAddress: address,
          category: "wallet",
          symbol: row.symbol || undefined,
          name: row.name || undefined,
          decimals: row.decimals,
        });
        if (asset) {
          if (row.symbol) asset.symbol = row.symbol;
          if (row.name) asset.name = row.name;
          if (row.decimals !== undefined) {
            asset.decimals = Number(row.decimals);
            asset.balance = decimalString(row.amount, asset.decimals);
            asset.amount = numberFromDecimal(asset.balance);
            asset.quantity = asset.amount;
            asset.valueUsd = asset.amount > 0 && asset.priceUsd > 0 ? asset.amount * asset.priceUsd : 0;
            asset.value = asset.valueUsd;
          }
          assets.push(asset);
        }
      });
      return { assets: assets, staking: [], chainID: chainID, address: address };
    });
  }

  function fetchBitcoinPortfolio(chainID, chain, address, prices, denoms) {
    return fetchJSONTimed("/station-assets/api/address/" + encodeURIComponent(address), 12000).then(function (json) {
      json = json || {};
      var confirmed = Number(json.chain_stats && json.chain_stats.funded_txo_sum || 0) - Number(json.chain_stats && json.chain_stats.spent_txo_sum || 0);
      var mempool = Number(json.mempool_stats && json.mempool_stats.funded_txo_sum || 0) - Number(json.mempool_stats && json.mempool_stats.spent_txo_sum || 0);
      var sats = Math.max(0, confirmed + mempool);
      var asset = buildAsset(chainID, chain, "sats", String(Math.round(sats)), prices, denoms, {
        walletAddress: address,
        category: "wallet",
      });
      return { assets: asset ? [asset] : [], staking: [], chainID: chainID, address: address };
    });
  }

  function fetchSolanaPortfolio(chainID, chain, address, prices, denoms) {
    return fetchJSONTimed("/station-assets/api/solana/address/" + encodeURIComponent(address), 12000).then(function (row) {
      row = row || {};
      var asset = buildAsset(chainID, chain, row.denom || "lamports", row.amount || "0", prices, denoms, {
        walletAddress: address,
        category: "wallet",
        symbol: row.symbol || "SOL",
        name: row.name || "Solana",
        decimals: row.decimals !== undefined ? Number(row.decimals) : 9,
      });
      if (asset && row.decimals !== undefined) {
        asset.decimals = Number(row.decimals);
        asset.balance = decimalString(row.amount || "0", asset.decimals);
        asset.amount = numberFromDecimal(asset.balance);
        asset.quantity = asset.amount;
        asset.valueUsd = asset.amount > 0 && asset.priceUsd > 0 ? asset.amount * asset.priceUsd : 0;
        asset.value = asset.valueUsd;
      }
      return { assets: asset ? [asset] : [], staking: [], chainID: chainID, address: address };
    });
  }

  function uniqueAssets(assets) {
    var seen = {};
    return (Array.isArray(assets) ? assets : []).filter(function (asset) {
      if (!asset) return false;
      var key = [
        clean(asset.chainID || asset.chainId),
        clean(asset.category || "wallet"),
        clean(asset.denom || asset.token || asset.contract || asset.symbol).toLowerCase(),
        clean(asset.walletAddress).toLowerCase(),
      ].join(":");
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (a, b) {
      return (Number(b.valueUsd || b.value || 0) - Number(a.valueUsd || a.value || 0)) ||
        clean(a.chainName || a.chainID).localeCompare(clean(b.chainName || b.chainID)) ||
        clean(a.symbol).localeCompare(clean(b.symbol));
    });
  }

  function runLimited(thunks, limit, onResult) {
    thunks = Array.isArray(thunks) ? thunks : [];
    limit = Math.max(1, Number(limit) || 6);
    var results = [];
    var index = 0;
    var active = 0;
    return new Promise(function (resolve) {
      function pump() {
        if (index >= thunks.length && active === 0) {
          resolve(results);
          return;
        }
        while (active < limit && index < thunks.length) {
          (function (resultIndex, task) {
            index += 1;
            active += 1;
            Promise.resolve()
              .then(task)
              .catch(function (error) {
                return { assets: [], staking: [], error: String(error && error.message || error).slice(0, 120) };
              })
              .then(function (result) {
                results[resultIndex] = result;
                try {
                  if (typeof onResult === "function") onResult(result, resultIndex);
                } catch (error) {}
                active -= 1;
                pump();
              });
          })(index, thunks[index]);
        }
      }
      pump();
    });
  }

  function writePortfolioSnapshot(wallet, addressMap, assets, staking, errors) {
    assets = uniqueAssets(assets);
    staking = uniqueAssets(staking);
    var totalValue = assets.concat(staking).reduce(function (sum, asset) {
      return sum + (Number(asset && (asset.valueUsd || asset.value || asset.usd)) || 0);
    }, 0);
    var snapshot = {
      source: "do-wallet-multichain-live",
      updatedAt: Date.now(),
      wallet: wallet,
      walletKey: walletIdentityKeys(wallet)[0] || "",
      addresses: addressMap,
      totalValue: totalValue,
      totalStakedValue: staking.filter(function (asset) { return asset.category === "staking"; }).reduce(function (sum, asset) { return sum + (Number(asset.valueUsd || 0) || 0); }, 0),
      totalRewardsValue: staking.filter(function (asset) { return asset.category === "reward"; }).reduce(function (sum, asset) { return sum + (Number(asset.valueUsd || 0) || 0); }, 0),
      totalUnbondingValue: staking.filter(function (asset) { return asset.category === "unbonding"; }).reduce(function (sum, asset) { return sum + (Number(asset.valueUsd || 0) || 0); }, 0),
      assets: assets,
      staking: staking,
      errors: errors || [],
    };
    writeJSON(SNAPSHOT_KEY, snapshot);
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (!isObject(byWallet)) byWallet = {};
    walletIdentityKeys(wallet).forEach(function (key) {
      byWallet[key] = snapshot;
    });
    writeJSON(SNAPSHOTS_BY_WALLET_KEY, byWallet);
    try {
      window.dispatchEvent(new CustomEvent("do_wallet_portfolio_snapshot", { detail: snapshot }));
    } catch (error) {}
    markStatus("portfolio-loaded", {
      balanceAssets: assets.length,
      stakingAssets: staking.length,
      balanceChains: Object.keys(addressMap || {}).length,
      balanceErrors: (errors || []).length,
    });
  }

  function refreshPortfolio() {
    if (portfolioRunning || !window.Promise) return;
    var wallet = activeWallet();
    if (!wallet) {
      markStatus("portfolio-no-wallet");
      return;
    }
    patchWallet(wallet);
    var addressMap = buildWalletAddressMap(wallet);
    var addressCount = Object.keys(addressMap).length;
    if (!addressCount) {
      markStatus("portfolio-no-addresses");
      return;
    }
    portfolioRunning = true;
    markStatus("portfolio-loading", { balanceChains: addressCount });
    Promise.all([
      fetchJSONTimed(TOKEN_CATALOG_PATHS.prices, 12000),
      fetchJSONTimed(TOKEN_CATALOG_PATHS.denoms, 12000),
      fetchJSONTimed(TOKEN_CATALOG_PATHS.buildDenoms, 12000),
    ]).then(function (catalogs) {
      var prices = catalogs[0] || {};
      var denoms = mergeObjects(normalizeDenomCatalog(catalogs[1]), normalizeDenomCatalog(catalogs[2]));
      var chains = allChains();
      var tasks = [];
      var liveAssets = [];
      var liveStaking = [];
      var liveErrors = [];
      function acceptResult(result) {
        if (!result) return;
        if (result.error) liveErrors.push(result.error);
        liveAssets = liveAssets.concat(result.assets || []);
        liveStaking = liveStaking.concat(result.staking || []);
        writePortfolioSnapshot(wallet, addressMap, liveAssets, liveStaking, liveErrors);
      }
      Object.keys(addressMap).forEach(function (chainID) {
        var chain = chains[chainID];
        var address = addressMap[chainID];
        if (!chain || !address || chain.networkType === "testnet") return;
        if (chainSupportsCosmosQueries(chain)) {
          tasks.push(function () { return fetchCosmosPortfolio(chainID, chain, address, prices, denoms); });
        } else if (chainSupportsEvmQueries(chain)) {
          tasks.push(function () { return fetchEvmPortfolio(chainID, chain, address, prices, denoms); });
        } else if (chainSupportsBtcQueries(chainID, chain)) {
          tasks.push(function () { return fetchBitcoinPortfolio(chainID, chain, address, prices, denoms); });
        } else if (chainSupportsSolQueries(chainID, chain)) {
          tasks.push(function () { return fetchSolanaPortfolio(chainID, chain, address, prices, denoms); });
        }
      });
      return runLimited(tasks, 6, acceptResult);
    }).then(function (results) {
      var assets = [];
      var staking = [];
      var errors = [];
      (Array.isArray(results) ? results : []).forEach(function (result) {
        if (!result) return;
        if (result.error) errors.push(result.error);
        assets = assets.concat(result.assets || []);
        staking = staking.concat(result.staking || []);
      });
      writePortfolioSnapshot(wallet, addressMap, assets, staking, errors);
    }).catch(function (error) {
      markStatus("portfolio-error", { error: String(error && error.message || error).slice(0, 120) });
    }).then(function () {
      portfolioRunning = false;
    });
  }

  function allChains() {
    return Object.keys(dynamicChains).length ? Object.assign({}, CHAINS, dynamicChains) : Object.assign({}, CHAINS);
  }

  function chainIsKnown(chainID) {
    if (!chainCatalogLoaded) return true;
    return Boolean(allChains()[chainID]);
  }

  function normalizeChainCatalog(catalog) {
    var chains = {};
    function add(chainID, chain, group) {
      if (!isObject(chain)) return;
      chainID = canonicalNetwork(chain.chainID || chain.chainId || chainID);
      if (!chainID || isRemovedNetwork(chainID)) return;
      chains[chainID] = liveChainOverrides(chainID, Object.assign({}, chain, {
        chainID: chainID,
        networkType: chain.networkType || (group === "testnet" ? "testnet" : "mainnet"),
      }));
    }
    if (Array.isArray(catalog)) {
      catalog.forEach(function (chain) { add(chain && (chain.chainID || chain.chainId), chain); });
    } else if (isObject(catalog)) {
      ["mainnet", "classic", "testnet"].forEach(function (group) {
        if (!isObject(catalog[group])) return;
        Object.keys(catalog[group]).forEach(function (chainID) {
          add(chainID, catalog[group][chainID], group);
        });
      });
      if (!Object.keys(chains).length) {
        Object.keys(catalog).forEach(function (chainID) { add(chainID, catalog[chainID]); });
      }
    }
    return chains;
  }

  function loadChainCatalog() {
    if (chainCatalogRunning || chainCatalogLoaded || !window.Promise) return;
    chainCatalogRunning = true;
    markStatus("loading-chains");
    fetchJSON(TOKEN_CATALOG_PATHS.chains).then(function (catalog) {
      var loaded = normalizeChainCatalog(catalog);
      if (Object.keys(loaded).length) {
        dynamicChains = loaded;
        chainCatalogLoaded = true;
        markStatus("chains-loaded", { chains: Object.keys(dynamicChains).length });
        if (seedRegistries()) dispatchUpdates();
      }
    }).then(function () {
      chainCatalogRunning = false;
    }, function () {
      chainCatalogRunning = false;
    });
  }

  function chainIDFromKey(key) {
    var parts = String(key || "").split(":");
    return parts.length > 1 ? parts[0] : "";
  }

  function tokenFromKey(key) {
    var value = String(key || "");
    var index = value.indexOf(":");
    return index >= 0 ? value.slice(index + 1) : value;
  }

  function isEvmContract(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(clean(value));
  }

  function isBech32ContractLike(value) {
    return /^[a-z][a-z0-9]{1,19}1[ac-hj-np-z02-9]{38,110}$/i.test(clean(value));
  }

  function isContractToken(token) {
    var standard = String(token && token.standard || "").toLowerCase();
    var value = token && (token.contract || token.token || token.denom || "");
    return standard === "cw20" || standard === "erc20" || isEvmContract(value) || isBech32ContractLike(value);
  }

  function normalizeCatalogToken(key, item, forcedStandard) {
    if (!isObject(item)) return null;
    var chainID = canonicalNetwork(item.chainID || chainIDFromKey(key));
    if (!chainID || isRemovedNetwork(chainID)) return null;

    var rawToken = clean(item.contract || item.token || item.denom || tokenFromKey(key));
    if (!rawToken || rawToken === chainID) return null;

    var decimals = Number(item.decimals);
    if (!Number.isFinite(decimals)) decimals = 6;

    var standard = clean(item.standard || forcedStandard || "");
    if (!standard && isEvmContract(rawToken)) standard = "erc20";
    else if (!standard && isBech32ContractLike(rawToken)) standard = "cw20";

    var tokenID = standard === "erc20" ? rawToken.toLowerCase() : rawToken;
    var token = Object.assign({}, item, {
      chainID: chainID,
      decimals: decimals,
      denom: item.denom || rawToken,
      id: item.id || chainID + ":" + tokenID,
      name: item.name || item.symbol || rawToken,
      symbol: item.symbol || rawToken,
      token: item.token || rawToken,
      verified: item.verified !== false,
    });

    if (standard) token.standard = standard;
    if (standard === "cw20" || standard === "erc20") token.contract = item.contract || rawToken;
    return token;
  }

  function collectCatalogEntries(catalog) {
    var entries = [];
    if (!isObject(catalog)) return entries;
    var groups = ["mainnet", "classic", "testnet"];
    var grouped = groups.some(function (group) { return isObject(catalog[group]); });
    if (grouped) {
      groups.forEach(function (group) {
        if (!isObject(catalog[group])) return;
        Object.keys(catalog[group]).forEach(function (key) {
          entries.push({ key: key, item: catalog[group][key] });
        });
      });
      return entries;
    }
    Object.keys(catalog).forEach(function (key) {
      entries.push({ key: key, item: catalog[key] });
    });
    return entries;
  }

  function seedCatalogToken(tokens, token) {
    if (!token || !token.chainID) return 0;
    if (!chainIsKnown(token.chainID)) return 0;
    if (isContractToken(token)) {
      ensureContractTokens(tokens, token.chainID, [token]);
      ensureContractTokens(tokens, "mainnet", [token]);
    } else {
      ensureNativeToken(tokens, token.chainID, token);
      ensureNativeToken(tokens, "mainnet", token);
    }
    return 1;
  }

  function seedCatalogTokens(tokens, denomsCatalog, cw20Catalog) {
    var count = 0;
    var seen = {};
    collectCatalogEntries(denomsCatalog).forEach(function (entry) {
      var token = normalizeCatalogToken(entry.key, entry.item, "");
      if (!token) return;
      var uniqueKey = token.chainID + ":" + String(token.contract || token.token || token.denom || "").toLowerCase();
      if (seen[uniqueKey]) return;
      seen[uniqueKey] = true;
      count += seedCatalogToken(tokens, token);
    });
    collectCatalogEntries(cw20Catalog).forEach(function (entry) {
      var token = normalizeCatalogToken(entry.key, entry.item, "cw20");
      if (!token) return;
      var uniqueKey = token.chainID + ":" + String(token.contract || token.token || token.denom || "").toLowerCase();
      if (seen[uniqueKey]) return;
      seen[uniqueKey] = true;
      count += seedCatalogToken(tokens, token);
    });
    return count;
  }

  var tokenCatalogRunning = false;
  var tokenCatalogLoaded = false;

  function seedStaticTokens(tokens) {
    Object.keys(NATIVE_TOKENS).forEach(function (chainID) {
      if (!chainIsKnown(chainID)) return;
      ensureNativeToken(tokens, chainID, NATIVE_TOKENS[chainID]);
      ensureNativeToken(tokens, "mainnet", NATIVE_TOKENS[chainID]);
    });
    Object.keys(EXTRA_NATIVE_TOKENS).forEach(function (key) {
      var token = EXTRA_NATIVE_TOKENS[key];
      if (!token || !chainIsKnown(token.chainID)) return;
      ensureNativeToken(tokens, token.chainID, token);
      ensureNativeToken(tokens, "mainnet", token);
    });
    Object.keys(CONTRACT_TOKENS).forEach(function (chainID) {
      if (!chainIsKnown(chainID)) return;
      ensureContractTokens(tokens, chainID, CONTRACT_TOKENS[chainID]);
      ensureContractTokens(tokens, "mainnet", CONTRACT_TOKENS[chainID]);
    });
  }

  function cleanRemovedTokenBuckets(tokens) {
    REMOVED_NETWORKS.forEach(function (chainID) { delete tokens[chainID]; });
    STALE_NETWORK_ALIASES.forEach(function (chainID) { delete tokens[chainID]; });
    if (chainCatalogLoaded) {
      var chains = allChains();
      Object.keys(tokens).forEach(function (chainID) {
        if (chainID !== "mainnet" && !chains[chainID]) delete tokens[chainID];
      });
    }
  }

  function loadTokenCatalog() {
    if (tokenCatalogRunning || tokenCatalogLoaded || !window.Promise) return;
    tokenCatalogRunning = true;
    markStatus("loading-tokens");
    Promise.all([
      fetchJSON(TOKEN_CATALOG_PATHS.denoms),
      fetchJSON(TOKEN_CATALOG_PATHS.cw20),
    ]).then(function (catalogs) {
      var customTokens = readJSON("CustomTokensInterchain", {});
      if (!isObject(customTokens)) customTokens = {};
      var added = seedCatalogTokens(customTokens, catalogs[0], catalogs[1]);
      seedStaticTokens(customTokens);
      cleanRemovedTokenBuckets(customTokens);
      var changed = writeJSON("CustomTokensInterchain", customTokens);
      tokenCatalogLoaded = added > 0;
      markStatus("tokens-loaded", {
        chains: Object.keys(allChains()).length,
        tokenBuckets: Object.keys(customTokens).length,
        catalogTokens: added,
      });
      if (changed) dispatchUpdates();
    }).then(function () {
      tokenCatalogRunning = false;
    }, function () {
      tokenCatalogRunning = false;
    });
  }

  function seedRegistries() {
    var changed = false;
    var customChains = readJSON("CustomChains", {});
    if (!isObject(customChains)) customChains = {};
    var chains = allChains();
    Object.keys(chains).forEach(function (chainID) {
      customChains[chainID] = Object.assign({}, customChains[chainID] || {}, chains[chainID]);
    });
    REMOVED_NETWORKS.forEach(function (chainID) { delete customChains[chainID]; });
    STALE_NETWORK_ALIASES.forEach(function (chainID) { delete customChains[chainID]; });
    if (chainCatalogLoaded) {
      Object.keys(customChains).forEach(function (chainID) {
        if (!chains[chainID]) delete customChains[chainID];
      });
    }
    changed = writeJSON("CustomChains", customChains) || changed;

    var customLCD = readJSON("CustomLCD", {});
    if (!isObject(customLCD)) customLCD = {};
    Object.keys(chains).forEach(function (chainID) {
      if (chains[chainID].lcd || chains[chainID].api || chains[chainID].rpc) {
        customLCD[chainID] = chains[chainID].lcd || chains[chainID].api || chains[chainID].rpc;
      }
    });
    REMOVED_NETWORKS.forEach(function (chainID) { delete customLCD[chainID]; });
    STALE_NETWORK_ALIASES.forEach(function (chainID) { delete customLCD[chainID]; });
    if (chainCatalogLoaded) {
      Object.keys(customLCD).forEach(function (chainID) {
        if (!chains[chainID]) delete customLCD[chainID];
      });
    }
    changed = writeJSON("CustomLCD", customLCD) || changed;

    var customTokens = readJSON("CustomTokensInterchain", {});
    if (!isObject(customTokens)) customTokens = {};
    seedStaticTokens(customTokens);
    cleanRemovedTokenBuckets(customTokens);
    changed = writeJSON("CustomTokensInterchain", customTokens) || changed;

    var enabled = readJSON("EnabledNetworks", { time: 0, networks: [] });
    if (!isObject(enabled)) enabled = { time: 0, networks: [] };
    var enabledNetworks = ensureOrdered(enabled.networks);
    if (JSON.stringify(enabledNetworks) !== JSON.stringify(enabled.networks || [])) {
      changed = writeJSON("EnabledNetworks", Object.assign({}, enabled, {
        time: Date.now(),
        networks: enabledNetworks,
      })) || changed;
    }

    var display = readJSON("DisplayChains", {});
    if (!isObject(display)) display = {};
    ["all", "mainnet", "receive", "assets"].forEach(function (key) {
      display[key] = ensureOrdered(display[key]);
    });
    changed = writeJSON("DisplayChains", display) || changed;

    return changed;
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function isDo(value) { return /^do1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isTerra(value) { return /^terra1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isSecret(value) { return /^secret1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isDungeon(value) { return /^dungeon1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isCosmos(value) { return /^cosmos1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isOsmo(value) { return /^osmo1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isEth(value) { return /^0x[a-fA-F0-9]{40}$/.test(clean(value)); }
  function isBtc(value) { return /^(bc1[a-z0-9]{20,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,40})$/i.test(clean(value)); }
  function isSol(value) { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean(value)); }

  function setAliases(addresses, aliases, value) {
    var address = clean(value);
    if (!address) return false;
    var changed = false;
    aliases.forEach(function (key) {
      if (!addresses[key]) {
        addresses[key] = address;
        changed = true;
      }
    });
    return changed;
  }

  function patchWallet(wallet) {
    if (!isObject(wallet)) return false;
    var changed = false;
    var addresses = isObject(wallet.addresses) ? Object.assign({}, wallet.addresses) : {};
    REMOVED_ADDRESS_ALIASES.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(addresses, key)) {
        delete addresses[key];
        changed = true;
      }
    });
    var values = [wallet.address, wallet.doAddress, wallet.doChainAddress, wallet.terraAddress, wallet.luncAddress, wallet.lunaAddress, wallet.ethereumAddress, wallet.evmAddress, wallet.bitcoinAddress, wallet.solanaAddress];
    Object.keys(addresses).forEach(function (key) { values.push(addresses[key]); });

    values.forEach(function (value) {
      var address = clean(value);
      if (isDo(address)) changed = setAliases(addresses, ["Do-Chain"], address) || changed;
      else if (isTerra(address)) changed = setAliases(addresses, ["columbus-5", "phoenix-1"], address) || changed;
      else if (isSecret(address)) changed = setAliases(addresses, ["secret-4"], address) || changed;
      else if (isDungeon(address)) changed = setAliases(addresses, ["dungeon-1", "dungeon"], address) || changed;
      else if (isCosmos(address)) changed = setAliases(addresses, ["cosmoshub-4", "cosmos"], address) || changed;
      else if (isOsmo(address)) changed = setAliases(addresses, ["osmosis-1", "osmo"], address) || changed;
      else if (isEth(address)) changed = setAliases(addresses, ["ethereum-mainnet", "eip155:1", "ethereum", "eth", "evm"], address) || changed;
      else if (isBtc(address)) changed = setAliases(addresses, ["bitcoin-mainnet", "bip122:000000000019d6689c085ae165831e93", "bitcoin", "btc"], address) || changed;
    });

    var explicitSol = clean(wallet.solanaAddress || addresses["solana-mainnet"] || addresses.solana || addresses.sol || addresses["501"]);
    if (isSol(explicitSol)) changed = setAliases(addresses, ["solana-mainnet", "solana", "sol"], explicitSol) || changed;

    var explicitDo = values.map(clean).filter(isDo)[0] || "";
    if (explicitDo && addresses["Do-Chain"] !== explicitDo) {
      addresses["Do-Chain"] = explicitDo;
      changed = true;
    } else if (addresses["Do-Chain"] && !isDo(addresses["Do-Chain"])) {
      delete addresses["Do-Chain"];
      changed = true;
    }

    if (changed || Object.keys(addresses).length) wallet.addresses = addresses;
    return changed;
  }

  function patchStoredWallet(key) {
    var payload = readJSON(key, null);
    if (!payload) return false;
    var wallet = isObject(payload.wallet) ? payload.wallet : payload;
    var changed = patchWallet(wallet);
    if (!changed) return false;
    if (wallet !== payload) {
      payload.wallet = wallet;
      payload.updatedAt = Date.now();
    }
    return writeJSON(key, payload);
  }

  function patchKeys() {
    var keys = readJSON("keys", null);
    if (!Array.isArray(keys)) return false;
    var changed = false;
    keys.forEach(function (wallet) {
      changed = patchWallet(wallet) || changed;
    });
    return changed ? writeJSON("keys", keys) : false;
  }

  function dispatchUpdates() {
    ["do_wallet_chain_assets_update", "do_wallet_change", "station_wallet_change", "do_wallet_bridge_update"].forEach(function (eventName) {
      try {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { source: "dochain-multichain-assets-20260615", updatedAt: Date.now() },
        }));
      } catch (error) {}
    });
  }

  var running = false;

  function run() {
    if (running) return;
    running = true;
    try {
      markStatus("running");
      var changed = false;
      requestProviderWallet(false);
      changed = seedRegistries() || changed;
      changed = patchStoredWallet("user") || changed;
      changed = patchStoredWallet("do-wallet-bridge-wallet") || changed;
      changed = patchStoredWallet("do-wallet-extension-authority.v1") || changed;
      changed = patchKeys() || changed;
      if (changed) dispatchUpdates();
      loadChainCatalog();
      loadTokenCatalog();
      refreshPortfolio();
      markStatus("seeded", {
        chains: Object.keys(allChains()).length,
        enabled: (readJSON("EnabledNetworks", { networks: [] }).networks || []).length,
        tokenBuckets: Object.keys(readJSON("CustomTokensInterchain", {})).length,
      });
    } catch (error) {
      markStatus("error", { error: String(error && error.message || error).slice(0, 120) });
      throw error;
    } finally {
      running = false;
    }
  }

  run();
  window.setTimeout(run, 250);
  window.setTimeout(run, 1500);
  window.setTimeout(run, 5000);
  window.setInterval(refreshPortfolio, PORTFOLIO_REFRESH_MS);
  window.addEventListener("storage", run);
  window.addEventListener("focus", run);
  window.addEventListener("do_wallet_change", run);
  window.addEventListener("station_wallet_change", run);
  window.doWalletMultichainAssets = { run: run, loadChainCatalog: loadChainCatalog, loadTokenCatalog: loadTokenCatalog, chains: allChains, tokens: NATIVE_TOKENS };
})();
