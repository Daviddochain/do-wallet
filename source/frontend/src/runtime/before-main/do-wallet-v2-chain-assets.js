(function () {
  "use strict";

  if (window.__doWalletChainAssetsInstalled) return;
  window.__doWalletChainAssetsInstalled = true;

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
        block: "https://www.do-chain.com/stats",
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
      coinType: 529,
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
        block: "https://explorer.dungeongames.io/block/{}",
      },
    },
  };

  var TOKENS = {
    "Do-Chain": {
      denom: "udo",
      id: "Do-Chain:udo",
      token: "udo",
      symbol: "DO",
      name: "Do Chain",
      decimals: 6,
    },
    "secret-4": {
      denom: "uscrt",
      id: "secret-4:uscrt",
      token: "uscrt",
      symbol: "SCRT",
      name: "Secret Network",
      decimals: 6,
    },
    "dungeon-1": {
      denom: "udgn",
      id: "dungeon-1:udgn",
      token: "udgn",
      symbol: "DGN",
      name: "Dungeon Chain",
      decimals: 6,
      icon: "https://raw.githubusercontent.com/cosmos/chain-registry/master/dungeon/images/DGN.png",
    },
  };

  function shouldRunHere() {
    try {
      if (window.location.protocol === "chrome-extension:" || window.location.protocol === "moz-extension:") return true;
      if (window.location.protocol !== "https:" && window.location.protocol !== "http:") return false;
      var host = window.location.hostname.toLowerCase();
      return host === "do-wallet.com" || host === "www.do-wallet.com" || host.endsWith(".do-wallet.com") ||
        host === "do-chain.com" || host === "www.do-chain.com" || host.endsWith(".do-chain.com") ||
        host === "localhost" || host === "127.0.0.1";
    } catch (error) {
      return false;
    }
  }

  if (!shouldRunHere()) return;

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

  function chainForRegistry(chainID, chain) {
    if (!isObject(chain)) return chain;
    var proxy = websiteLCDProxy(chainID);
    if (!proxy) return chain;
    var next = Object.assign({}, chain);
    if (next.lcd && next.lcd !== proxy) next.upstreamLcd = next.upstreamLcd || next.lcd;
    if (next.api && next.api !== proxy) next.upstreamApi = next.upstreamApi || next.api;
    next.lcd = proxy;
    next.api = proxy;
    return next;
  }

  function readJSON(key, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      var parsed = value ? JSON.parse(value) : fallback;
      return isObject(parsed) || Array.isArray(parsed) ? parsed : fallback;
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

  function ensureNativeToken(tokens, chainID, token) {
    var current = isObject(tokens[chainID]) ? tokens[chainID] : {};
    var native = Array.isArray(current.native) ? current.native.slice() : [];
    var exists = native.some(function (item) {
      return item && (item.id === token.id || item.denom === token.denom || item.token === token.token);
    });
    tokens[chainID] = Object.assign({
      cw20: Array.isArray(current.cw20) ? current.cw20 : [],
      cw721: Array.isArray(current.cw721) ? current.cw721 : [],
    }, current, {
      native: exists ? native : native.concat([token]),
    });
  }

  function seed() {
    var changed = false;
    var customChains = readJSON("CustomChains", {});
    var customLCD = readJSON("CustomLCD", {});
    var customTokens = readJSON("CustomTokensInterchain", {});
    if (!isObject(customChains)) customChains = {};
    if (!isObject(customLCD)) customLCD = {};
    if (!isObject(customTokens)) customTokens = {};
    var hasFullChainRegistry = Object.keys(customChains).length > Object.keys(CHAINS).length;
    var hasFullLCDRegistry = Object.keys(customLCD).length > Object.keys(CHAINS).length;

    Object.keys(CHAINS).forEach(function (chainID) {
      if (hasFullChainRegistry) customChains[chainID] = Object.assign({}, customChains[chainID] || {}, chainForRegistry(chainID, CHAINS[chainID]));
      if (hasFullLCDRegistry) customLCD[chainID] = websiteLCDProxy(chainID) || CHAINS[chainID].lcd;
      ensureNativeToken(customTokens, chainID, TOKENS[chainID]);
    });

    [].forEach(function (legacy) {
      delete customChains[legacy];
      delete customLCD[legacy];
      delete customTokens[legacy];
    });

    if (hasFullChainRegistry) changed = writeJSON("CustomChains", customChains) || changed;
    if (hasFullLCDRegistry) changed = writeJSON("CustomLCD", customLCD) || changed;
    changed = writeJSON("CustomTokensInterchain", customTokens) || changed;
    if (changed) {
      try {
        document.documentElement.setAttribute("data-dochain-chain-assets-seeded", String(Date.now()));
      } catch (error) {}
    }
  }

  seed();
  window.setTimeout(seed, 500);
  window.setTimeout(seed, 2500);
  window.addEventListener("storage", seed);
  window.addEventListener("do_wallet_bridge_update", seed);
  window.doWalletChainAssets = { seed: seed, chains: CHAINS, tokens: TOKENS };
})();
