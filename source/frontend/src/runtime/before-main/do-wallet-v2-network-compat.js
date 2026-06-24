(function () {
  "use strict";

  var DOCHAIN_ID = "Do-Chain";
  var TERRA_CLASSIC_ID = "columbus-5";
  var LEGACY_DOCHAIN_IDS = [];
  var REMOVED_NETWORKS = ["dochain-1", "mars-1", "ares-1", "pisco-1", "localterra"];
  var TERRA_CHAIN_IDS = [];
  var SECRET_CHAIN_ID = "secret-4";
  var DUNGEON_CHAIN_ID = "dungeon-1";
  var PRIMARY_NETWORKS = [DOCHAIN_ID, TERRA_CLASSIC_ID, DUNGEON_CHAIN_ID, SECRET_CHAIN_ID];
  var L2_CONTRACT = "terra12ckccpalj2y9h54syyst4lpqp79duc9cpxfsyvne409rjw93s8qs2eneh3";
  var LEGACY_DOCHAIN_COIN_TYPE = "";
  var DOCHAIN_COIN_TYPE = "888";
  var COSMOS_COIN_TYPE = "118";
  var SECRET_COIN_TYPE = "529";
  var RECEIVE_COIN_TYPES = [DOCHAIN_COIN_TYPE, COSMOS_COIN_TYPE, SECRET_COIN_TYPE];
  var ALL_KNOWN_COIN_TYPES = [
    DOCHAIN_COIN_TYPE,
    COSMOS_COIN_TYPE,
    SECRET_COIN_TYPE
  ];

  var DOCHAIN_CHAIN = {
    chainID: DOCHAIN_ID,
    name: "Do Chain",
    networkType: "mainnet",
    lcd: "https://do-chain.com",
    api: "https://do-chain.com",
    rpc: "https://do-chain.com/rpc",
    gasAdjustment: 2,
    gasPrices: { udo: 0.025 },
    prefix: "do",
    coinType: 888,
    baseAsset: "udo",
    icon: "/do-logo.jpg",
    alliance: false,
    explorer: {
      name: "Do Chain Stats",
        url: "https://www.do-chain.com/stats",
        address: "https://www.do-chain.com/stats",
      tx: "https://www.do-chain.com/stats",
      validator: "https://www.do-chain.com/stats",
      block: "https://www.do-chain.com/stats"
    },
    channels: {}
  };

  var SECRET_CHAIN = {
    chainID: SECRET_CHAIN_ID,
    name: "Secret Network",
    networkType: "mainnet",
    lcd: "https://rest.lavenderfive.com:443/secretnetwork",
    api: "https://rest.lavenderfive.com:443/secretnetwork",
    rpc: "https://rpc.lavenderfive.com:443/secretnetwork",
    gasAdjustment: 1.75,
    gasPrices: { uscrt: 0.1 },
    prefix: "secret",
    coinType: 529,
    baseAsset: "uscrt",
    symbol: "SCRT",
    cmcSymbol: "SCRT",
    icon: "/img/chains/Secret.png",
    alliance: false,
    channels: {
      "cosmoshub-4": "channel-1",
      "osmosis-1": "channel-2",
      "juno-1": "channel-8",
      "akashnet-2": "channel-21"
    },
    explorer: {
      address: "https://www.mintscan.io/secret/account/{}",
      tx: "https://www.mintscan.io/secret/txs/{}",
      validator: "https://www.mintscan.io/secret/validators/{}",
      block: "https://www.mintscan.io/secret/blocks/id/{}"
    }
  };

  var DUNGEON_CHAIN = {
    chainID: DUNGEON_CHAIN_ID,
    name: "Dungeon Chain",
    networkType: "mainnet",
    lcd: "https://api.dungeongames.io",
    api: "https://api.dungeongames.io",
    rpc: "https://rpc.dungeongames.io",
    gasAdjustment: 1.75,
    gasPrices: { udgn: 0.07 },
    prefix: "dungeon",
    coinType: 118,
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
      block: "https://explorer.dungeongames.io/block/{}"
    }
  };

  var STORAGE_DEFAULTS = {
    CustomChains: {},
    CustomLCD: {},
    CustomTokensInterchain: {},
    EnabledNetworks: { time: 0, networks: [] }
  };

  function readJSON(key) {
    var raw = window.localStorage.getItem(key);
    if (!raw) return STORAGE_DEFAULTS[key];

    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : STORAGE_DEFAULTS[key];
    } catch (error) {
      return STORAGE_DEFAULTS[key];
    }
  }

  function writeJSON(key, value) {
    var next = JSON.stringify(value);
    if (window.localStorage.getItem(key) === next) return false;
    window.localStorage.setItem(key, next);
    return true;
  }

  function assign(target, source) {
    Object.keys(source).forEach(function (key) {
      target[key] = source[key];
    });
    return target;
  }

  function objectSize(value) {
    return value && typeof value === "object" ? Object.keys(value).length : 0;
  }

  function isRemovedNetwork(chainID) {
    return REMOVED_NETWORKS.indexOf(String(chainID || "")) >= 0;
  }

  function cleanString(value) {
    return String(value || "").trim();
  }

  function priorityOrderedNetworks(networks) {
    var seen = {};
    var out = [];
    function add(chainID) {
      chainID = cleanString(chainID);
      if (!chainID || isRemovedNetwork(chainID) || LEGACY_DOCHAIN_IDS.indexOf(chainID) !== -1 || seen[chainID]) return;
      seen[chainID] = true;
      out.push(chainID);
    }
    PRIMARY_NETWORKS.forEach(add);
    (Array.isArray(networks) ? networks : []).forEach(add);
    return out;
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

  function chainForRegistry(chainID, chain) {
    if (!chain || typeof chain !== "object" || Array.isArray(chain)) return chain;
    var proxy = websiteLCDProxy(chainID);
    if (!proxy) return chain;
    var next = assign({}, chain);
    if (next.lcd && next.lcd !== proxy) next.upstreamLcd = next.upstreamLcd || next.lcd;
    if (next.api && next.api !== proxy) next.upstreamApi = next.upstreamApi || next.api;
    next.lcd = proxy;
    next.api = proxy;
    return next;
  }

  function ensureNativeToken(tokens, chainID, token) {
    var current = tokens[chainID] && typeof tokens[chainID] === "object"
      ? tokens[chainID]
      : {};
    var native = Array.isArray(current.native) ? current.native.slice() : [];
    var exists = native.some(function (item) {
      return item && (item.id === token.id || item.denom === token.denom);
    });

    tokens[chainID] = assign(assign({
      cw20: Array.isArray(current.cw20) ? current.cw20 : [],
      cw721: Array.isArray(current.cw721) ? current.cw721 : []
    }, current), {
      native: exists ? native : native.concat([token])
    });
  }

  function ensureCW20Token(tokens, chainID, token) {
    var current = tokens[chainID] && typeof tokens[chainID] === "object"
      ? tokens[chainID]
      : {};
    var cw20 = Array.isArray(current.cw20) ? current.cw20.slice() : [];
    cw20 = cw20.filter(function (item) {
      return !(item && (item.token === token.token || item.contract === token.contract));
    });

    tokens[chainID] = assign(assign({
      native: Array.isArray(current.native) ? current.native : [],
      cw721: Array.isArray(current.cw721) ? current.cw721 : []
    }, current), {
      cw20: cw20.concat([token])
    });
  }

  function removeCW20Token(tokens, chainID, contract) {
    var current = tokens[chainID] && typeof tokens[chainID] === "object" ? tokens[chainID] : null;
    if (!current || !Array.isArray(current.cw20)) return;
    current.cw20 = current.cw20.filter(function (item) {
      return !(item && (item.token === contract || item.contract === contract || item.denom === contract));
    });
    tokens[chainID] = current;
  }

  function seedNetworkStorage() {
    var customChains = readJSON("CustomChains");
    var hasFullChainRegistry = objectSize(customChains) > 3;
    if (hasFullChainRegistry) {
      customChains[DOCHAIN_ID] = assign(assign({}, customChains[DOCHAIN_ID] || {}), chainForRegistry(DOCHAIN_ID, DOCHAIN_CHAIN));
      customChains[SECRET_CHAIN_ID] = assign(assign({}, customChains[SECRET_CHAIN_ID] || {}), chainForRegistry(SECRET_CHAIN_ID, SECRET_CHAIN));
      customChains[DUNGEON_CHAIN_ID] = assign(assign({}, customChains[DUNGEON_CHAIN_ID] || {}), chainForRegistry(DUNGEON_CHAIN_ID, DUNGEON_CHAIN));
      REMOVED_NETWORKS.concat(LEGACY_DOCHAIN_IDS).forEach(function (chainID) {
        if (customChains[chainID]) delete customChains[chainID];
      });
      writeJSON("CustomChains", customChains);
    }

    var customLCD = readJSON("CustomLCD");
    if (hasFullChainRegistry || objectSize(customLCD) > 3) {
      customLCD[DOCHAIN_ID] = websiteLCDProxy(DOCHAIN_ID) || DOCHAIN_CHAIN.lcd;
      customLCD[SECRET_CHAIN_ID] = websiteLCDProxy(SECRET_CHAIN_ID) || SECRET_CHAIN.lcd;
      customLCD[DUNGEON_CHAIN_ID] = websiteLCDProxy(DUNGEON_CHAIN_ID) || DUNGEON_CHAIN.lcd;
      REMOVED_NETWORKS.concat(LEGACY_DOCHAIN_IDS).forEach(function (chainID) {
        if (customLCD[chainID]) delete customLCD[chainID];
      });
      writeJSON("CustomLCD", customLCD);
    }

    var customTokens = readJSON("CustomTokensInterchain");
    ensureNativeToken(customTokens, DOCHAIN_ID, {
      denom: "udo",
      id: DOCHAIN_ID + ":udo",
      token: "udo",
      symbol: "DO",
      name: "Do Chain",
      decimals: 6
    });
    ensureNativeToken(customTokens, DOCHAIN_ID, {
      denom: "udodx",
      id: DOCHAIN_ID + ":udodx",
      token: "udodx",
      symbol: "DODx",
      name: "DODx",
      decimals: 6
    });
    ensureNativeToken(customTokens, SECRET_CHAIN_ID, {
      denom: "uscrt",
      id: SECRET_CHAIN_ID + ":uscrt",
      token: "uscrt",
      symbol: "SCRT",
      name: "Secret Network",
      decimals: 6
    });
    ensureNativeToken(customTokens, DUNGEON_CHAIN_ID, {
      denom: "udgn",
      id: DUNGEON_CHAIN_ID + ":udgn",
      token: "udgn",
      symbol: "DGN",
      name: "Dungeon Chain",
      decimals: 6,
      icon: "https://raw.githubusercontent.com/cosmos/chain-registry/master/dungeon/images/DGN.png"
    });
    removeCW20Token(customTokens, DOCHAIN_ID, L2_CONTRACT);
    ensureCW20Token(customTokens, TERRA_CLASSIC_ID, {
      token: L2_CONTRACT,
      contract: L2_CONTRACT,
      denom: L2_CONTRACT,
      id: TERRA_CLASSIC_ID + ":" + L2_CONTRACT,
      symbol: "BAKED",
      name: "Baked Coin",
      chainID: TERRA_CLASSIC_ID,
      icon: "/do-logo.jpg",
      decimals: 6,
      verified: true
    });
    REMOVED_NETWORKS.concat(LEGACY_DOCHAIN_IDS).forEach(function (chainID) {
      if (customTokens[chainID]) delete customTokens[chainID];
    });
    writeJSON("CustomTokensInterchain", customTokens);

    var enabledNetworks = readJSON("EnabledNetworks");
    var networks = Array.isArray(enabledNetworks.networks)
      ? enabledNetworks.networks.slice()
      : [];
    if (networks.length > 3) {
      networks = priorityOrderedNetworks(networks);
      if (JSON.stringify(networks) !== JSON.stringify(enabledNetworks.networks || [])) {
        writeJSON("EnabledNetworks", assign(assign({}, enabledNetworks), {
          time: Date.now(),
          networks: networks
        }));
      }
    }
  }

  function selectLiveDoChain(forceDefault) {
    ["network", "Network", "SelectedDisplayChain"].forEach(function (key) {
      var current = window.localStorage.getItem(key);
      var lower = String(current || "").toLowerCase();
      if (
        forceDefault ||
        !current ||
        LEGACY_DOCHAIN_IDS.indexOf(current) !== -1 ||
        TERRA_CHAIN_IDS.indexOf(current) !== -1 ||
        REMOVED_NETWORKS.indexOf(current) !== -1 ||
        REMOVED_NETWORKS.indexOf(lower) !== -1
      ) {
        window.localStorage.setItem(key, DOCHAIN_ID);
      }
    });
  }

  function mirrorKeyValue(map, value, to) {
    if (map && typeof map === "object" && typeof value === "string" && !map[to]) {
      map[to] = value;
      return true;
    }
    return false;
  }

  function mirrorCoinTypeMap(map) {
    if (!map || typeof map !== "object") return false;
    return false;
  }

  function mirrorLegacyDoChainKey(value) {
    if (!value || typeof value !== "object") return false;

    var changed = false;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        changed = mirrorLegacyDoChainKey(item) || changed;
      });
      return changed;
    }

    ["words", "pubkey"].forEach(function (key) {
      changed = mirrorCoinTypeMap(value[key]) || changed;
    });

    if (!value.encryptedSeed) {
      changed = mirrorCoinTypeMap(value.encrypted) || changed;
    }

    var addresses = value.addresses;
    if (addresses && typeof addresses === "object" && !addresses[DOCHAIN_ID]) {
      LEGACY_DOCHAIN_IDS.some(function (legacyID) {
        if (/^do1[ac-hj-np-z02-9]{20,90}$/i.test(String(addresses[legacyID] || "").trim())) {
          addresses[DOCHAIN_ID] = addresses[legacyID];
          changed = true;
          return true;
        }
        return false;
      });
    }

    if (value.chainID && LEGACY_DOCHAIN_IDS.indexOf(value.chainID) !== -1) {
      value.chainID = DOCHAIN_ID;
      changed = true;
    }

    Object.keys(value).forEach(function (key) {
      if (["words", "pubkey", "encrypted", "addresses"].indexOf(key) !== -1) return;
      changed = mirrorLegacyDoChainKey(value[key]) || changed;
    });

    return changed;
  }

  function migrateLocalStorageWallets() {
    for (var index = 0; index < window.localStorage.length; index += 1) {
      var key = window.localStorage.key(index);
      if (!key) continue;

      var raw = window.localStorage.getItem(key);
      if (!raw || (raw[0] !== "{" && raw[0] !== "[")) continue;

      try {
        var parsed = JSON.parse(raw);
        if (mirrorLegacyDoChainKey(parsed)) {
          window.localStorage.setItem(key, JSON.stringify(parsed));
        }
      } catch (error) {
        // The wallet stores several non-JSON browser values alongside wallet JSON.
      }
    }
  }

  try {
    window.__DO_WALLET_NETWORK_COMPAT_VERSION = "20260609";
    window.__DO_WALLET_RECEIVE_CHAIN_TYPES = RECEIVE_COIN_TYPES.slice();
    seedNetworkStorage();
    selectLiveDoChain(false);
    migrateLocalStorageWallets();
    window.setTimeout(function () { selectLiveDoChain(false); }, 250);
    window.setTimeout(function () { selectLiveDoChain(false); }, 1500);
    window.addEventListener("focus", function () { selectLiveDoChain(false); });
    window.addEventListener("do_wallet_bridge_update", function () { selectLiveDoChain(false); });
  } catch (error) {
    console.warn("Do-Wallet could not initialise website network defaults", error);
  }
})();
