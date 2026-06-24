(function () {
  "use strict";

  if (window.__doWalletPriorityShimInstalled) return;
  window.__doWalletPriorityShimInstalled = true;

  var DOCHAIN_ID = "Do-Chain";
  var DOCHAIN_COIN_TYPE = "888";
  var TERRA_CLASSIC_ID = "columbus-5";
  var SECRET_CHAIN_ID = "secret-4";
  var REMOVED_NETWORKS = ["dochain-1", "mars-1", "ares-1", "pisco-1", "localterra"];
  var L2_CONTRACT = "terra12ckccpalj2y9h54syyst4lpqp79duc9cpxfsyvne409rjw93s8qs2eneh3";
  var ADMIN_WALLET_ADDRESS = "do1wt907kgcmql3whjggla26sh6tawelhj3855hxz";
  var HANDOFF_KEY = "do_wallet_handoff";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var MAX_JSON = 1024 * 1024;

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

  function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function lower(value) {
    return cleanString(value).toLowerCase();
  }

  function isRemovedNetwork(chainID) {
    return REMOVED_NETWORKS.indexOf(String(chainID || "")) >= 0;
  }

  function isDoAddress(value) {
    return /^do1[0-9a-z]{8,}$/i.test(cleanString(value));
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw || raw.length > MAX_JSON) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      var next = JSON.stringify(value);
      if (next.length > MAX_JSON) return false;
      if (window.localStorage.getItem(key) === next) return false;
      window.localStorage.setItem(key, next);
      return true;
    } catch (error) {
      return false;
    }
  }

  function cleanStringMap(value, maxLength) {
    if (!isObject(value)) return undefined;
    var result = {};
    Object.keys(value).forEach(function (key) {
      var item = cleanString(value[key]);
      if (key && item && item.length <= maxLength) result[key] = item;
    });
    return Object.keys(result).length ? result : undefined;
  }

  function assign(target, source) {
    Object.keys(source).forEach(function (key) {
      target[key] = source[key];
    });
    return target;
  }

  function getAddresses(wallet) {
    return cleanStringMap(wallet && wallet.addresses, 512) || {};
  }

  function getAddressMap(wallet) {
    return cleanStringMap(wallet && wallet.addressMap, 512) || {};
  }

  function getDoAddress(wallet) {
    if (!isObject(wallet)) return "";
    var addresses = getAddresses(wallet);
    var addressMap = getAddressMap(wallet);
    var preferred = [
      addresses[DOCHAIN_COIN_TYPE],
      addressMap[DOCHAIN_COIN_TYPE],
      addresses[DOCHAIN_ID],
      addressMap[DOCHAIN_ID],
      addresses.dochain,
      addressMap.dochain,
      wallet.address,
    ].concat(Object.keys(addresses).map(function (key) {
      return addresses[key];
    })).concat(Object.keys(addressMap).map(function (key) {
      return addressMap[key];
    }));

    for (var index = 0; index < preferred.length; index += 1) {
      if (isDoAddress(preferred[index])) return cleanString(preferred[index]);
    }
    return "";
  }

  function isAdminWallet(wallet) {
    return getDoAddress(wallet).toLowerCase() === ADMIN_WALLET_ADDRESS;
  }

  function isValidatorWallet(wallet) {
    if (!isObject(wallet)) return false;
    if (wallet.validatorWallet === true || wallet.isValidatorWallet === true) return true;
    var name = cleanString(wallet.name || wallet.walletName).toLowerCase();
    return (
      name.indexOf("validator") >= 0 ||
      /\bval(?:idator)?\b/.test(name) ||
      /\bval\s*\d+\b/.test(name)
    );
  }

  function patchWallet(wallet) {
    if (!isObject(wallet)) return { value: wallet, changed: false };

    var next = assign({}, wallet);
    var addresses = getAddresses(next);
    var before = JSON.stringify(next);
    var doAddress = getDoAddress(next);

    if (doAddress) {
      addresses[DOCHAIN_ID] = doAddress;
      next.address = doAddress;
      next.addresses = addresses;
    } else if (Object.keys(addresses).length) {
      next.addresses = addresses;
    }

    if (isValidatorWallet(next)) {
      next.validatorWallet = true;
      next.walletPriority = Math.max(Number(next.walletPriority) || 0, 1000);
    }

    if (isAdminWallet(next)) {
      next.adminWallet = true;
      next.walletRole = "admin";
      next.walletPriority = Math.max(Number(next.walletPriority) || 0, 5000);
    }

    return { value: next, changed: JSON.stringify(next) !== before };
  }

  function patchPayload(payload) {
    if (!isObject(payload)) return { value: payload, changed: false };
    var wallet = isObject(payload.wallet) ? payload.wallet : payload;
    var patched = patchWallet(wallet);
    if (!patched.changed) return { value: payload, changed: false };

    if (payload === wallet) return patched;
    var next = assign({}, payload);
    next.wallet = patched.value;
    next.updatedAt = Date.now();
    return { value: next, changed: true };
  }

  function selectedWalletName() {
    var visible = visibleWalletName();
    if (visible) return lower(visible);
    var user = readJSON("user", null);
    return lower(user && (user.name || user.walletName));
  }

  function walletName(wallet) {
    return cleanString(wallet && (wallet.name || wallet.walletName || wallet.label));
  }

  function visibleWalletName() {
    var ignored = /^(send|receive|swap|history|settings|copy|copied|qr|back|back to wallet|manage|dashboard|buy|buy \/ sell|sell|menu|assets|activity|connect|connect wallet|edit validator|classicnodes|do chain|bitcoin|ethereum|solana|secret network|dungeon chain)$/i;
    var entries = Array.prototype.slice.call(document.querySelectorAll("header button, nav button, header [role='button'], button, header *, [role='button']"))
      .map(function (node) {
        var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };
        return { node: node, rect: rect, text: cleanString(node.textContent).replace(/\s+/g, " ") };
      })
      .filter(function (entry) {
        return (
          entry.text &&
          entry.text.length <= 72 &&
          !ignored.test(entry.text) &&
          !/search for a chain/i.test(entry.text) &&
          entry.rect.width > 20 &&
          entry.rect.height > 12 &&
          entry.rect.top >= -20 &&
          entry.rect.top < 180
        );
      })
      .sort(function (a, b) {
        return b.rect.left - a.rect.left || a.rect.top - b.rect.top;
      });
    return entries[0] ? entries[0].text : "";
  }

  function walletMatchesName(wallet, name) {
    var walletDisplay = lower(walletName(wallet));
    var target = lower(name);
    return Boolean(target && walletDisplay && (walletDisplay === target || walletDisplay.indexOf(target) >= 0 || target.indexOf(walletDisplay) >= 0));
  }

  function walletAddressSet(wallet) {
    var addresses = getAddresses(wallet);
    var values = [wallet && wallet.address].concat(Object.keys(addresses).map(function (key) { return addresses[key]; }));
    var set = {};
    values.map(lower).filter(Boolean).forEach(function (value) { set[value] = true; });
    return set;
  }

  function walletsShareAddress(left, right) {
    var leftSet = walletAddressSet(left);
    var rightSet = walletAddressSet(right);
    return Object.keys(leftSet).some(function (key) { return rightSet[key]; });
  }

  function syncActiveWalletFromVisibleName() {
    var visible = visibleWalletName();
    if (!visible) return false;
    var keys = readJSON("keys", null);
    if (!Array.isArray(keys)) return false;
    var match = keys.find(function (wallet) { return walletMatchesName(wallet, visible); });
    if (!match) return false;

    var patched = patchWallet(match).value;
    var user = readJSON("user", null);
    var changed = false;
    if (!walletMatchesName(user, visible) || !walletsShareAddress(user, patched)) {
      changed = writeJSON("user", patched) || changed;
    }

    var bridge = readJSON(BRIDGE_KEY, null);
    var bridgeWallet = isObject(bridge) && isObject(bridge.wallet) ? bridge.wallet : bridge;
    if (!walletMatchesName(bridgeWallet, visible)) {
      changed = writeJSON(BRIDGE_KEY, { wallet: patched, updatedAt: Date.now(), source: "dochain-wallet-priority-selected" }) || changed;
    }
    var auth = readJSON(AUTH_KEY, null);
    var authWallet = isObject(auth) && isObject(auth.wallet) ? auth.wallet : auth;
    if (!walletMatchesName(authWallet, visible)) {
      changed = writeJSON(AUTH_KEY, { wallet: patched, updatedAt: Date.now(), source: "dochain-wallet-priority-selected" }) || changed;
    }
    return changed;
  }

  function walletScore(wallet, activeName) {
    var score = 0;
    if (cleanString(wallet && (wallet.name || wallet.walletName)).toLowerCase() === activeName) score += 10000;
    if (isAdminWallet(wallet)) score += 5000;
    if (isValidatorWallet(wallet)) score += 1000;
    if (getDoAddress(wallet)) score += 10;
    return score;
  }

  function patchKeys() {
    var keys = readJSON("keys", null);
    if (!Array.isArray(keys)) return false;

    var activeName = selectedWalletName();
    var changed = false;
    var patched = keys.map(function (wallet, index) {
      var result = patchWallet(wallet);
      changed = result.changed || changed;
      return assign({ __doWalletOriginalIndex: index }, result.value);
    });

    patched.sort(function (a, b) {
      return (
        walletScore(b, activeName) - walletScore(a, activeName) ||
        a.__doWalletOriginalIndex - b.__doWalletOriginalIndex
      );
    });

    patched = patched.map(function (wallet, index) {
      if (wallet.__doWalletOriginalIndex !== index) changed = true;
      delete wallet.__doWalletOriginalIndex;
      return wallet;
    });

    return changed ? writeJSON("keys", patched) : false;
  }

  function ensureNativeToken(tokens, chainID, token) {
    var current = isObject(tokens[chainID]) ? tokens[chainID] : {};
    var native = Array.isArray(current.native) ? current.native.slice() : [];
    var exists = native.some(function (item) {
      return item && (item.id === token.id || item.denom === token.denom);
    });
    tokens[chainID] = assign(assign({
      cw20: Array.isArray(current.cw20) ? current.cw20 : [],
      cw721: Array.isArray(current.cw721) ? current.cw721 : [],
    }, current), {
      native: exists ? native : native.concat([token]),
    });
  }

  function ensureCW20Token(tokens, chainID, token) {
    var current = isObject(tokens[chainID]) ? tokens[chainID] : {};
    var cw20 = Array.isArray(current.cw20) ? current.cw20.slice() : [];
    cw20 = cw20.filter(function (item) {
      return !(item && (item.token === token.token || item.contract === token.contract));
    });
    tokens[chainID] = assign(assign({
      native: Array.isArray(current.native) ? current.native : [],
      cw721: Array.isArray(current.cw721) ? current.cw721 : [],
    }, current), {
      cw20: cw20.concat([token]),
    });
  }

  function removeCW20Token(tokens, chainID, contract) {
    var current = isObject(tokens[chainID]) ? tokens[chainID] : null;
    if (!current || !Array.isArray(current.cw20)) return;
    current.cw20 = current.cw20.filter(function (item) {
      return !(item && (item.token === contract || item.contract === contract || item.denom === contract));
    });
    tokens[chainID] = current;
  }

  function seedNetworkStorage() {
    var changed = false;
    var customChains = readJSON("CustomChains", {});
    if (!isObject(customChains)) customChains = {};
    var chainsChanged = false;
    REMOVED_NETWORKS.forEach(function (chainID) {
      if (Object.prototype.hasOwnProperty.call(customChains, chainID)) {
        delete customChains[chainID];
        chainsChanged = true;
      }
    });
    if (!isObject(customChains[DOCHAIN_ID])) {
      customChains[DOCHAIN_ID] = {
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
        channels: {},
      };
      chainsChanged = true;
    }
    if (chainsChanged) changed = writeJSON("CustomChains", customChains) || changed;

    var customLCD = readJSON("CustomLCD", {});
    if (!isObject(customLCD)) customLCD = {};
    var lcdChanged = false;
    REMOVED_NETWORKS.forEach(function (chainID) {
      if (Object.prototype.hasOwnProperty.call(customLCD, chainID)) {
        delete customLCD[chainID];
        lcdChanged = true;
      }
    });
    if (customLCD[DOCHAIN_ID] !== "https://do-chain.com") {
      customLCD[DOCHAIN_ID] = "https://do-chain.com";
      lcdChanged = true;
    }
    if (lcdChanged) changed = writeJSON("CustomLCD", customLCD) || changed;

    var customTokens = readJSON("CustomTokensInterchain", {});
    if (!isObject(customTokens)) customTokens = {};
    var beforeTokens = JSON.stringify(customTokens);
    REMOVED_NETWORKS.forEach(function (chainID) { delete customTokens[chainID]; });
    ensureNativeToken(customTokens, DOCHAIN_ID, {
      denom: "udo",
      id: DOCHAIN_ID + ":udo",
      token: "udo",
      symbol: "DO",
      name: "Do Chain",
      decimals: 6,
    });
    ensureNativeToken(customTokens, DOCHAIN_ID, {
      denom: "udodx",
      id: DOCHAIN_ID + ":udodx",
      token: "udodx",
      symbol: "DODx",
      name: "DODx",
      decimals: 6,
    });
    ensureNativeToken(customTokens, SECRET_CHAIN_ID, {
      denom: "uscrt",
      id: SECRET_CHAIN_ID + ":uscrt",
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
      id: TERRA_CLASSIC_ID + ":" + L2_CONTRACT,
      symbol: "BAKED",
      name: "Baked Coin",
      chainID: TERRA_CLASSIC_ID,
      icon: "/do-logo.jpg",
      decimals: 6,
      verified: true,
    });
    if (JSON.stringify(customTokens) !== beforeTokens) {
      changed = writeJSON("CustomTokensInterchain", customTokens) || changed;
    }

    var enabled = readJSON("EnabledNetworks", { time: 0, networks: [] });
    if (!isObject(enabled)) enabled = { time: 0, networks: [] };
    var networks = Array.isArray(enabled.networks) ? enabled.networks.slice() : [];
    networks = networks.filter(function (chainID, index) {
      return chainID && networks.indexOf(chainID) === index && !isRemovedNetwork(chainID);
    });
    [DOCHAIN_ID, SECRET_CHAIN_ID].forEach(function (chainID) {
      if (networks.indexOf(chainID) === -1) networks.push(chainID);
    });
    if (JSON.stringify(networks) !== JSON.stringify(enabled.networks || [])) {
      changed = writeJSON("EnabledNetworks", assign(assign({}, enabled), {
        time: Date.now(),
        networks: networks,
      })) || changed;
    }

    return changed;
  }

  function decodeHandoff(value) {
    try {
      var base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
      base64 = base64.padEnd(4 * Math.ceil(base64.length / 4), "=");
      var binary = window.atob(base64);
      var bytes = Uint8Array.from(binary, function (char) {
        return char.charCodeAt(0);
      });
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      return null;
    }
  }

  function encodeHandoff(value) {
    var json = JSON.stringify(value);
    var bytes = new TextEncoder().encode(json);
    var binary = "";
    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function patchUrlParams(params) {
    var encoded = params.get(HANDOFF_KEY);
    if (!encoded) return false;
    var payload = decodeHandoff(encoded);
    var patched = patchPayload(payload);
    if (!patched.changed) return false;
    params.set(HANDOFF_KEY, encodeHandoff(patched.value));
    return true;
  }

  function patchHandoffURL() {
    try {
      var url = new URL(window.location.href);
      var changed = patchUrlParams(url.searchParams);
      if (url.hash.indexOf("?") >= 0) {
        var parts = url.hash.split("?");
        var hashParams = new URLSearchParams(parts.slice(1).join("?"));
        if (patchUrlParams(hashParams)) {
          url.hash = parts[0] + "?" + hashParams.toString();
          changed = true;
        }
      }
      if (changed && window.history && window.history.replaceState) {
        window.history.replaceState(window.history.state, document.title, url.toString());
      }
      return changed;
    } catch (error) {
      return false;
    }
  }

  function patchStorageWallet(key) {
    var payload = readJSON(key, null);
    var patched = patchPayload(payload);
    return patched.changed ? writeJSON(key, patched.value) : false;
  }

  function dispatchWalletRefresh() {
    var payload = readJSON(BRIDGE_KEY, null) || readJSON(AUTH_KEY, null);
    var detail = isObject(payload) && isObject(payload.wallet)
      ? { source: payload.source || "do-wallet-extension", wallet: payload.wallet, updatedAt: Date.now() }
      : { source: "do-wallet-priority", wallet: readJSON("user", null), updatedAt: Date.now() };
    ["do_wallet_change", "station_wallet_change", "do_wallet_bridge_update"].forEach(function (eventName) {
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
      } catch (error) {}
    });
  }

  function run() {
    var changed = false;
    changed = seedNetworkStorage() || changed;
    changed = patchHandoffURL() || changed;
    changed = patchStorageWallet("user") || changed;
    changed = patchStorageWallet(BRIDGE_KEY) || changed;
    changed = patchStorageWallet(AUTH_KEY) || changed;
    changed = syncActiveWalletFromVisibleName() || changed;
    changed = patchKeys() || changed;
    if (changed) dispatchWalletRefresh();
    return changed;
  }

  window.doWalletPriorityShim = {
    run: run,
    patchWallet: function (wallet) {
      return patchWallet(wallet).value;
    },
    getDoAddress: getDoAddress,
    isValidatorWallet: isValidatorWallet,
  };

  var lastRunAt = 0;

  function runGuarded() {
    var now = Date.now();
    if (now - lastRunAt < 1000) return false;
    lastRunAt = now;
    return run();
  }

  function scheduleRun(delay) {
    window.clearTimeout(scheduleRun.timer);
    scheduleRun.timer = window.setTimeout(function () {
      lastRunAt = Date.now();
      run();
    }, delay || 0);
  }

  run();
  lastRunAt = Date.now();
  window.setTimeout(runGuarded, 100);
  window.setTimeout(runGuarded, 750);
  window.setTimeout(runGuarded, 2000);
  window.setInterval(function () {
    if (!document.hidden) runGuarded();
  }, 30000);
  window.addEventListener("focus", function () { scheduleRun(150); });
  window.addEventListener("storage", function () { scheduleRun(150); });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) scheduleRun(150);
  });
})();
