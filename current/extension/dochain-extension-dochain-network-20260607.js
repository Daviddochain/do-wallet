(() => {
  "use strict";

  const DOCHAIN_ID = "Do-Chain";
  const TERRA_CLASSIC_ID = "columbus-5";
  const LEGACY_DOCHAIN_IDS = [];
  const REMOVED_NETWORKS = ["dochain-1", "mars-1", "ares-1", "pisco-1", "localterra"];
  const TERRRA_CHAIN_IDS = ["columbus-5", "phoenix-1"];
  const SECRET_CHAIN_ID = "secret-4";
  const L2_CONTRACT = "terra12ckccpalj2y9h54syyst4lpqp79duc9cpxfsyvne409rjw93s8qs2eneh3";
  const DOCHAIN_COIN_TYPE = "888";
  const LEGACY_DOCHAIN_COIN_TYPE = "";
  const COSMOS_COIN_TYPE = "118";
  const SECRET_COIN_TYPE = "529";
  const RECEIVE_COIN_TYPES = [DOCHAIN_COIN_TYPE, COSMOS_COIN_TYPE, SECRET_COIN_TYPE];

  const DOCHAIN_CHAIN = {
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
      block: "https://www.do-chain.com/stats",
    },
    channels: {},
  };

  const SECRET_CHAIN = {
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
      "akashnet-2": "channel-21",
    },
    explorer: {
      address: "https://www.mintscan.io/secret/account/{}",
      tx: "https://www.mintscan.io/secret/txs/{}",
      validator: "https://www.mintscan.io/secret/validators/{}",
      block: "https://www.mintscan.io/secret/blocks/id/{}",
    },
  };

  const STORAGE_DEFAULTS = {
    CustomChains: {},
    CustomLCD: {},
    CustomTokensInterchain: {},
    EnabledNetworks: { time: 0, networks: [] },
  };

  const readJSON = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return STORAGE_DEFAULTS[key];
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : STORAGE_DEFAULTS[key];
    } catch (_) {
      return STORAGE_DEFAULTS[key];
    }
  };

  const writeJSON = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const ensureNativeToken = (tokens, chainID, token) => {
    const chainTokens = tokens[chainID] && typeof tokens[chainID] === "object"
      ? tokens[chainID]
      : {};
    const native = Array.isArray(chainTokens.native) ? chainTokens.native.slice() : [];
    const exists = native.some((item) => item && (item.id === token.id || item.denom === token.denom));

    tokens[chainID] = {
      cw20: Array.isArray(chainTokens.cw20) ? chainTokens.cw20 : [],
      cw721: Array.isArray(chainTokens.cw721) ? chainTokens.cw721 : [],
      ...chainTokens,
      native: exists ? native : [...native, token],
    };
  };

  const ensureCW20Token = (tokens, chainID, token) => {
    const chainTokens = tokens[chainID] && typeof tokens[chainID] === "object"
      ? tokens[chainID]
      : {};
    const cw20 = Array.isArray(chainTokens.cw20) ? chainTokens.cw20.slice() : [];
    const filtered = cw20.filter((item) => !(item && (item.token === token.token || item.contract === token.contract)));

    tokens[chainID] = {
      native: Array.isArray(chainTokens.native) ? chainTokens.native : [],
      cw721: Array.isArray(chainTokens.cw721) ? chainTokens.cw721 : [],
      ...chainTokens,
      cw20: [...filtered, token],
    };
  };

  const removeCW20Token = (tokens, chainID, contract) => {
    const chainTokens = tokens[chainID] && typeof tokens[chainID] === "object" ? tokens[chainID] : null;
    if (!chainTokens || !Array.isArray(chainTokens.cw20)) return;
    chainTokens.cw20 = chainTokens.cw20.filter((item) => !(item && (
      item.token === contract ||
      item.contract === contract ||
      item.denom === contract
    )));
    tokens[chainID] = chainTokens;
  };

  const seedNetworkStorage = () => {
    const customChains = readJSON("CustomChains");
    customChains[DOCHAIN_ID] = { ...(customChains[DOCHAIN_ID] || {}), ...DOCHAIN_CHAIN };
    customChains[SECRET_CHAIN_ID] = { ...(customChains[SECRET_CHAIN_ID] || {}), ...SECRET_CHAIN };
    [...REMOVED_NETWORKS, ...LEGACY_DOCHAIN_IDS].forEach((chainID) => {
      if (customChains[chainID]) delete customChains[chainID];
    });
    writeJSON("CustomChains", customChains);

    const customLCD = readJSON("CustomLCD");
    customLCD[DOCHAIN_ID] = DOCHAIN_CHAIN.lcd;
    customLCD[SECRET_CHAIN_ID] = SECRET_CHAIN.lcd;
    [...REMOVED_NETWORKS, ...LEGACY_DOCHAIN_IDS].forEach((chainID) => {
      if (customLCD[chainID]) delete customLCD[chainID];
    });
    writeJSON("CustomLCD", customLCD);

    const customTokens = readJSON("CustomTokensInterchain");
    ensureNativeToken(customTokens, DOCHAIN_ID, {
      denom: "udo",
      id: `${DOCHAIN_ID}:udo`,
      token: "udo",
      symbol: "DO",
      name: "Do Chain",
      decimals: 6,
    });
    ensureNativeToken(customTokens, DOCHAIN_ID, {
      denom: "udodx",
      id: `${DOCHAIN_ID}:udodx`,
      token: "udodx",
      symbol: "DODx",
      name: "DODx",
      decimals: 6,
    });
    ensureNativeToken(customTokens, SECRET_CHAIN_ID, {
      denom: "uscrt",
      id: `${SECRET_CHAIN_ID}:uscrt`,
      token: "uscrt",
      symbol: "SCRT",
      name: "Secret Network",
      decimals: 6,
    });
    removeCW20Token(customTokens, DOCHAIN_ID, L2_CONTRACT);
    ensureCW20Token(customTokens, TERRA_CLASSIC_ID, {
      token: L2_CONTRACT,
      contract: L2_CONTRACT,
      denom: L2_CONTRACT,
      id: `${TERRA_CLASSIC_ID}:${L2_CONTRACT}`,
      symbol: "BAKED",
      name: "Baked Coin",
      chainID: TERRA_CLASSIC_ID,
      icon: "/do-logo.jpg",
      decimals: 6,
      verified: true,
    });
    [...REMOVED_NETWORKS, ...LEGACY_DOCHAIN_IDS].forEach((chainID) => {
      if (customTokens[chainID]) delete customTokens[chainID];
    });
    writeJSON("CustomTokensInterchain", customTokens);

    const enabledNetworks = readJSON("EnabledNetworks");
    const networks = Array.isArray(enabledNetworks.networks) ? enabledNetworks.networks.slice() : [];
    [DOCHAIN_ID, SECRET_CHAIN_ID].forEach((chainID) => {
      if (!networks.includes(chainID)) networks.push(chainID);
    });
    writeJSON("EnabledNetworks", {
      ...enabledNetworks,
      time: Date.now(),
      networks: networks.filter((chainID) => !LEGACY_DOCHAIN_IDS.includes(chainID) && !REMOVED_NETWORKS.includes(chainID)),
    });
  };

  const selectLiveDoChain = () => {
    ["network", "Network", "SelectedDisplayChain"].forEach((key) => {
      const current = localStorage.getItem(key);
      if (!current || current === DOCHAIN_ID || LEGACY_DOCHAIN_IDS.includes(current) || TERRRA_CHAIN_IDS.includes(current)) {
        localStorage.setItem(key, DOCHAIN_ID);
      }
    });
    localStorage.setItem("do-wallet-dochain-network-selected", "1");
  };

  const mirrorKey = (map, from, to) => {
    if (
      map &&
      typeof map === "object" &&
      typeof map[from] === "string" &&
      !map[to]
    ) {
      map[to] = map[from];
      return true;
    }
    return false;
  };

  const mirrorLegacyDoChainKey = (value) => {
    if (!value || typeof value !== "object") return false;

    let changed = false;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        changed = mirrorLegacyDoChainKey(item) || changed;
      });
      return changed;
    }

    ["words", "pubkey"].forEach((key) => {
      const map = value[key];
      RECEIVE_COIN_TYPES.forEach((coinType) => {
        changed = mirrorKey(map, LEGACY_DOCHAIN_COIN_TYPE, coinType) || changed;
      });
    });

    if (!value.encryptedSeed) {
      const encrypted = value.encrypted;
      RECEIVE_COIN_TYPES.forEach((coinType) => {
        changed = mirrorKey(encrypted, LEGACY_DOCHAIN_COIN_TYPE, coinType) || changed;
      });
    }

    const addresses = value.addresses;
    if (addresses && typeof addresses === "object" && !addresses[DOCHAIN_ID]) {
      for (const legacyID of LEGACY_DOCHAIN_IDS) {
        if (/^do1[ac-hj-np-z02-9]{20,90}$/i.test(String(addresses[legacyID] || "").trim())) {
          addresses[DOCHAIN_ID] = addresses[legacyID];
          changed = true;
          break;
        }
      }
    }

    if (value.chainID && LEGACY_DOCHAIN_IDS.includes(value.chainID)) {
      value.chainID = DOCHAIN_ID;
      changed = true;
    }

    Object.keys(value).forEach((key) => {
      if (key === "words" || key === "pubkey" || key === "encrypted" || key === "addresses") return;
      changed = mirrorLegacyDoChainKey(value[key]) || changed;
    });

    return changed;
  };

  const migrateLocalStorageWallets = () => {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const raw = localStorage.getItem(key);
      if (!raw || raw[0] !== "{" && raw[0] !== "[") continue;

      try {
        const parsed = JSON.parse(raw);
        if (mirrorLegacyDoChainKey(parsed)) {
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      } catch (_) {
        // Non-JSON localStorage values are expected in the extension.
      }
    }
  };

  const migrateChromeStorageWallets = () => {
    const storage = globalThis.chrome && chrome.storage && chrome.storage.local;
    if (!storage || typeof storage.get !== "function" || typeof storage.set !== "function") return;

    storage.get(null, (items) => {
      if (!items || typeof items !== "object") return;
      const patch = {};

      Object.keys(items).forEach((key) => {
        const value = items[key];
        if (!value || typeof value !== "object") return;
        const clone = JSON.parse(JSON.stringify(value));
        if (mirrorLegacyDoChainKey(clone)) patch[key] = clone;
      });

      if (Object.keys(patch).length) storage.set(patch);
    });
  };

  try {
    seedNetworkStorage();
    selectLiveDoChain();
    migrateLocalStorageWallets();
    migrateChromeStorageWallets();
  } catch (error) {
    console.warn("Do-Wallet could not initialise Do/Secret network defaults", error);
  }
})();
