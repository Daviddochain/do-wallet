(function () {
  "use strict";

  if (window.__doWalletNativeDoAssetInstalled) return;
  window.__doWalletNativeDoAssetInstalled = true;
  try {
    document.documentElement.setAttribute("data-do-native-do-asset", "installing");
  } catch (error) {}

  var DOCHAIN_ID = "Do-Chain";
  var LEGACY_DOCHAIN_ID = ["dochain", "1"].join("-");
  var DOCHAIN_LCD = "https://do-chain.com";
  var DOCHAIN_RPC = "https://do-chain.com/rpc";
  var DO_TOKEN = {
    denom: "udo",
    id: DOCHAIN_ID + ":udo",
    token: "udo",
    symbol: "DO",
    name: "Do Token",
    icon: "/do-logo.jpg",
    decimals: 6,
    chainID: DOCHAIN_ID,
    chains: [DOCHAIN_ID],
    verified: true,
  };
  var DO_CHAIN = {
    chainID: DOCHAIN_ID,
    name: "Do Chain",
    networkType: "mainnet",
    lcd: DOCHAIN_LCD,
    api: DOCHAIN_LCD,
    rpc: DOCHAIN_RPC,
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

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function isDoAddress(value) {
    return /^do1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value));
  }

  function syncDoChainAddressMap(map) {
    if (!isObject(map)) return false;
    var changed = false;
    var preferred = [
      map[DOCHAIN_ID],
      map["888"],
      map.do,
      map.dochain,
      map[LEGACY_DOCHAIN_ID],
    ].map(clean).filter(isDoAddress)[0] || "";

    if (map[DOCHAIN_ID] && !isDoAddress(map[DOCHAIN_ID])) {
      delete map[DOCHAIN_ID];
      changed = true;
    }
    if (preferred && map[DOCHAIN_ID] !== preferred) {
      map[DOCHAIN_ID] = preferred;
      changed = true;
    }
    return changed;
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

  function setText(key, value) {
    try {
      if (window.localStorage.getItem(key) === value) return false;
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function putDoFirst(list) {
    var next = Array.isArray(list) ? list.slice() : [];
    next = next.filter(function (chainID) {
      return chainID && chainID !== LEGACY_DOCHAIN_ID && chainID !== DOCHAIN_ID;
    });
    next.unshift(DOCHAIN_ID);
    return next.filter(function (chainID, index, array) {
      return array.indexOf(chainID) === index;
    });
  }

  function doTokenMatches(item) {
    return Boolean(
      item &&
        (item.denom === "udo" ||
          item.token === "udo" ||
          item.id === LEGACY_DOCHAIN_ID + ":udo" ||
          item.id === DOCHAIN_ID + ":udo" ||
          item.chainID === LEGACY_DOCHAIN_ID ||
          item.chainID === DOCHAIN_ID)
    );
  }

  function ensureNativeToken(bucket) {
    var next = isObject(bucket) ? Object.assign({}, bucket) : {};
    var native = Array.isArray(next.native) ? next.native.slice() : [];
    native = native.filter(function (item) {
      return !doTokenMatches(item);
    });
    native.unshift(Object.assign({}, DO_TOKEN));
    next.native = native;
    if (!Array.isArray(next.cw20)) next.cw20 = [];
    if (!Array.isArray(next.cw721)) next.cw721 = [];
    return next;
  }

  function migrateDisplayChains() {
    var display = readJSON("DisplayChains", {});
    if (!isObject(display)) display = {};

    display.all = putDoFirst(display.all);
    display.mainnet = putDoFirst(display.mainnet);

    Object.keys(display).forEach(function (key) {
      if (Array.isArray(display[key])) {
        display[key] = display[key].filter(function (chainID) {
          return chainID !== LEGACY_DOCHAIN_ID;
        });
      }
    });

    return writeJSON("DisplayChains", display);
  }

  function migrateEnabledNetworks() {
    var enabled = readJSON("EnabledNetworks", { time: 0, networks: [] });
    if (!isObject(enabled)) enabled = { time: 0, networks: [] };
    enabled = Object.assign({}, enabled, {
      time: Date.now(),
      networks: putDoFirst(enabled.networks),
    });
    return writeJSON("EnabledNetworks", enabled);
  }

  function migrateSelectedChains() {
    var changed = false;
    ["Chain", "network", "Network", "SelectedDisplayChain"].forEach(function (key) {
      var current = window.localStorage.getItem(key);
      if (!current || current === LEGACY_DOCHAIN_ID) {
        changed = setText(key, DOCHAIN_ID) || changed;
      }
    });
    return changed;
  }

  function migrateCustomNetworkStorage() {
    var changed = false;
    var customChains = readJSON("CustomChains", {});
    if (!isObject(customChains)) customChains = {};
    customChains[DOCHAIN_ID] = Object.assign({}, customChains[DOCHAIN_ID] || {}, DO_CHAIN);
    delete customChains[LEGACY_DOCHAIN_ID];
    changed = writeJSON("CustomChains", customChains) || changed;

    var customLCD = readJSON("CustomLCD", {});
    if (!isObject(customLCD)) customLCD = {};
    customLCD[DOCHAIN_ID] = DOCHAIN_LCD;
    delete customLCD[LEGACY_DOCHAIN_ID];
    changed = writeJSON("CustomLCD", customLCD) || changed;

    var customTokens = readJSON("CustomTokensInterchain", {});
    if (!isObject(customTokens)) customTokens = {};
    customTokens[DOCHAIN_ID] = ensureNativeToken(customTokens[DOCHAIN_ID]);
    customTokens.mainnet = ensureNativeToken(customTokens.mainnet);
    delete customTokens[LEGACY_DOCHAIN_ID];
    changed = writeJSON("CustomTokensInterchain", customTokens) || changed;

    return changed;
  }

  function patchWalletAddresses(value) {
    if (!value || typeof value !== "object") return false;
    var changed = false;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        changed = patchWalletAddresses(item) || changed;
      });
      return changed;
    }

    changed = syncDoChainAddressMap(value.addresses) || changed;
    changed = syncDoChainAddressMap(value.addressMap) || changed;

    Object.keys(value).forEach(function (key) {
      if (key === "words" || key === "pubkey" || key === "encrypted" || key === "encryptedSeed") return;
      changed = patchWalletAddresses(value[key]) || changed;
    });

    return changed;
  }

  function migrateWalletStorage() {
    var changed = false;
    ["user", "keys", "do-wallet-bridge-wallet", "do-wallet-extension-authority.v1"].forEach(function (key) {
      var value = readJSON(key, null);
      if (!value) return;
      if (patchWalletAddresses(value)) {
        changed = writeJSON(key, value) || changed;
      }
    });
    return changed;
  }

  function dispatchUpdates() {
    ["do_wallet_chain_assets_update", "do_wallet_change", "station_wallet_change", "do_wallet_bridge_update"].forEach(function (eventName) {
      try {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { source: "do-wallet-native-do-asset", updatedAt: Date.now() },
        }));
      } catch (error) {}
    });
  }

  function run() {
    var changed = false;
    changed = migrateCustomNetworkStorage() || changed;
    changed = migrateDisplayChains() || changed;
    changed = migrateEnabledNetworks() || changed;
    changed = migrateSelectedChains() || changed;
    changed = migrateWalletStorage() || changed;
    try {
      document.documentElement.setAttribute("data-do-native-do-asset", changed ? "migrated" : "ready");
    } catch (error) {}
    if (changed) dispatchUpdates();
  }

  run();
  window.setTimeout(run, 250);
  window.setTimeout(run, 1500);
  window.setTimeout(run, 4000);
  window.addEventListener("focus", run);
  window.addEventListener("storage", run);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) run();
  });

  window.doWalletNativeDoAsset = { run: run };
})();
