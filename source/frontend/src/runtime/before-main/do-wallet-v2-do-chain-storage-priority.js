(function () {
  "use strict";

  if (window.__doWalletDoChainStoragePriority20260625Stable1) return;
  window.__doWalletDoChainStoragePriority20260625Stable1 = true;

  var DO_CHAIN_ID = "Do-Chain";
  var LEGACY_DO_IDS = ["Do-Chain", "do-chain", "dochain"];
  var MAX_JSON = 1024 * 1024;

  function shouldRunHere() {
    try {
      var protocol = window.location.protocol;
      if (protocol !== "https:" && protocol !== "http:") return false;
      var host = window.location.hostname.toLowerCase();
      return (
        host === "do-wallet.com" ||
        host === "www.do-wallet.com" ||
        host.endsWith(".do-wallet.com") ||
        host === "do-chain.com" ||
        host === "www.do-chain.com" ||
        host.endsWith(".do-chain.com") ||
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1"
      );
    } catch (error) {
      return false;
    }
  }

  if (!shouldRunHere()) return;

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw || raw.length > MAX_JSON) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      var next = JSON.stringify(value);
      if (next.length > MAX_JSON || window.localStorage.getItem(key) === next) return false;
      window.localStorage.setItem(key, next);
      return true;
    } catch (error) {
      return false;
    }
  }

  function doChainConfig() {
    var proxy = websiteLCDProxy(DO_CHAIN_ID);
    var lcd = proxy || "https://do-chain.com";
    return {
      chainID: DO_CHAIN_ID,
      name: "Do Chain",
      networkType: "mainnet",
      lcd: lcd,
      api: lcd,
      upstreamLcd: proxy ? "https://do-chain.com" : undefined,
      upstreamApi: proxy ? "https://do-chain.com" : undefined,
      rpc: "https://do-chain.com/rpc",
      gasAdjustment: 2,
      gasPrices: { udo: 0.025 },
      prefix: "do",
      coinType: 888,
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
        block: "https://www.do-chain.com/stats"
      }
    };
  }

  function doTokenConfig() {
    return {
      denom: "udo",
      id: DO_CHAIN_ID + ":udo",
      token: "udo",
      symbol: "DO",
      name: "Do Chain",
      decimals: 6
    };
  }

  function isDoID(value) {
    var id = clean(value).toLowerCase();
    return clean(value) === DO_CHAIN_ID || LEGACY_DO_IDS.indexOf(id) >= 0;
  }

  function reorderObjectDoFirst(object, ensuredValue) {
    if (!isObject(object)) return object;
    var next = {};
    var keys = Object.keys(object);
    if (ensuredValue !== undefined && ensuredValue !== null) {
      next[DO_CHAIN_ID] = isObject(ensuredValue)
        ? Object.assign({}, isObject(object[DO_CHAIN_ID]) ? object[DO_CHAIN_ID] : {}, ensuredValue)
        : ensuredValue;
    }
    keys
      .filter(function (key) { return !isDoID(key); })
      .forEach(function (key) { next[key] = object[key]; });
    return next;
  }

  function uniqueDoFirst(list) {
    var output = [DO_CHAIN_ID];
    (Array.isArray(list) ? list : []).forEach(function (item) {
      if (isDoID(item)) return;
      if (output.indexOf(item) === -1) output.push(item);
    });
    return output;
  }

  function seedDoFirstStorage() {
    var changed = false;

    var customChains = readJSON("CustomChains", {});
    if (!isObject(customChains)) customChains = {};
    changed = writeJSON("CustomChains", reorderObjectDoFirst(customChains, doChainConfig())) || changed;

    var customLCD = readJSON("CustomLCD", {});
    if (!isObject(customLCD)) customLCD = {};
    changed = writeJSON("CustomLCD", reorderObjectDoFirst(customLCD, websiteLCDProxy(DO_CHAIN_ID) || "https://do-chain.com")) || changed;

    var customTokens = readJSON("CustomTokensInterchain", {});
    if (!isObject(customTokens)) customTokens = {};
    var doTokens = isObject(customTokens[DO_CHAIN_ID]) ? customTokens[DO_CHAIN_ID] : {};
    var native = Array.isArray(doTokens.native) ? doTokens.native.slice() : [];
    if (!native.some(function (token) { return token && (token.denom === "udo" || token.token === "udo"); })) {
      native.unshift(doTokenConfig());
    }
    customTokens[DO_CHAIN_ID] = Object.assign({ cw20: [], cw721: [] }, doTokens, { native: native });
    changed = writeJSON("CustomTokensInterchain", reorderObjectDoFirst(customTokens, customTokens[DO_CHAIN_ID])) || changed;

    var enabled = readJSON("EnabledNetworks", { time: 0, networks: [] });
    if (!isObject(enabled)) enabled = { time: 0, networks: [] };
    var networks = uniqueDoFirst(enabled.networks);
    if (JSON.stringify(networks) !== JSON.stringify(enabled.networks || [])) {
      changed = writeJSON("EnabledNetworks", Object.assign({}, enabled, { time: Date.now(), networks: networks })) || changed;
    }

    if (changed) {
      try {
        window.dispatchEvent(new CustomEvent("do_wallet_chain_assets_update", {
          detail: { source: "dochain-storage-priority-20260625", updatedAt: Date.now() }
        }));
      } catch (error) {}
    }
    return changed;
  }

  function run() {
    seedDoFirstStorage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  window.addEventListener("storage", run);

  window.doWalletDoChainStoragePriority = {
    run: run,
    seedDoFirstStorage: seedDoFirstStorage
  };
})();
