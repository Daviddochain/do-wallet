(function () {
  "use strict";

  if (window.__doWalletRuntimeGuard20260617) return;
  window.__doWalletRuntimeGuard20260617 = true;

  var LCD_PREFIX = "/station-assets/lcd/";
  var API_LCD_PREFIX = "/station-assets/api/lcd/";
  var NODE_INFO_BOOT_DEFER_MS = 12000;
  var NODE_INFO_BOOT_UNTIL = Date.now() + NODE_INFO_BOOT_DEFER_MS;
  var NODE_INFO_LIVE_DURING_BOOT = {
    "Do-Chain": true,
    "columbus-5": true,
    "phoenix-1": true,
    "secret-4": true
  };
  var EVM_NATIVE_TOKENS = {
    eth: true,
    ethereum: true,
    ether: true,
    wei: true,
    matic: true,
    bnb: true,
    avax: true
  };
  var LEGACY_LCD_ALIASES = {
    "dochain-lcd": "Do-Chain",
    "do-chain-lcd": "Do-Chain",
    "do-lcd": "Do-Chain",
    "secret-lcd": "secret-4",
    "terra-classic-lcd": "columbus-5",
    "lunc-lcd": "columbus-5",
    "terra-lcd": "phoenix-1",
    "luna-lcd": "phoenix-1"
  };

  function walletOrigin() {
    try {
      var host = window.location.hostname.toLowerCase();
      return host === "do-wallet.com" || host === "www.do-wallet.com" || host.endsWith(".do-wallet.com") ||
        host === "localhost" || host === "127.0.0.1";
    } catch (error) {
      return false;
    }
  }

  if (!walletOrigin()) return;

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
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

  function lcdProxy(chainID) {
    return window.location.origin + API_LCD_PREFIX + encodeURIComponent(String(chainID || ""));
  }

  function legacyLCDChainID(alias) {
    var lower = String(alias || "").toLowerCase();
    if (LEGACY_LCD_ALIASES[lower]) return LEGACY_LCD_ALIASES[lower];
    if (/-lcd$/.test(lower)) return lower.replace(/-lcd$/, "");
    return "";
  }

  function chain(chainID, name, prefix, coinType, baseAsset, symbol, icon, lcd, rpc) {
    return {
      chainID: chainID,
      name: name,
      networkType: "mainnet",
      lcd: lcdProxy(chainID),
      api: lcdProxy(chainID),
      upstreamLcd: lcd,
      upstreamApi: lcd,
      rpc: rpc || lcd,
      gasAdjustment: 1.75,
      gasPrices: {},
      prefix: prefix,
      coinType: coinType,
      baseAsset: baseAsset,
      symbol: symbol,
      cmcSymbol: symbol,
      icon: icon,
      alliance: false,
      channels: {}
    };
  }

  var REQUIRED_CHAINS = {
    "Do-Chain": chain("Do-Chain", "Do Chain", "do", "888", "udo", "DO", "/do-logo.jpg", "https://do-chain.com", "https://do-chain.com/rpc"),
    "columbus-5": chain("columbus-5", "Terra Classic (LUNC)", "terra", "330", "uluna", "LUNC", "/img/chains/TerraClassic.svg", "https://terra-classic-lcd.publicnode.com", "https://terra-classic-rpc.publicnode.com"),
    "phoenix-1": chain("phoenix-1", "Terra (LUNA)", "terra", "330", "uluna", "LUNA", "/img/chains/Terra.svg", "https://terra-lcd.publicnode.com", "https://terra-rpc.publicnode.com"),
    "secret-4": chain("secret-4", "Secret Network", "secret", "529", "uscrt", "SCRT", "/img/chains/Secret.png", "https://rest.lavenderfive.com:443/secretnetwork", "https://rpc.lavenderfive.com:443/secretnetwork")
  };

  function normalizeRegistryURL(value) {
    if (typeof value !== "string") return value;
    return value.replace(/\/station-assets\/lcd\//g, API_LCD_PREFIX);
  }

  function normalizeRegistryObject(value) {
    if (!isObject(value)) return value;
    Object.keys(value).forEach(function (key) {
      if (typeof value[key] === "string") {
        value[key] = normalizeRegistryURL(value[key]);
      } else if (isObject(value[key])) {
        ["lcd", "api", "rest"].forEach(function (field) {
          if (typeof value[key][field] === "string") value[key][field] = normalizeRegistryURL(value[key][field]);
        });
      }
    });
    return value;
  }

  function seedRegistry() {
    var customChains = readJSON("CustomChains", {});
    if (!isObject(customChains)) customChains = {};
    normalizeRegistryObject(customChains);
    Object.keys(REQUIRED_CHAINS).forEach(function (chainID) {
      customChains[chainID] = Object.assign({}, customChains[chainID] || {}, REQUIRED_CHAINS[chainID]);
    });
    writeJSON("CustomChains", customChains);

    var customLCD = readJSON("CustomLCD", {});
    if (!isObject(customLCD)) customLCD = {};
    normalizeRegistryObject(customLCD);
    Object.keys(REQUIRED_CHAINS).forEach(function (chainID) {
      customLCD[chainID] = lcdProxy(chainID);
    });
    writeJSON("CustomLCD", customLCD);

    var enabled = readJSON("EnabledNetworks", { time: 0, networks: [] });
    if (isObject(enabled) && Array.isArray(enabled.networks) && enabled.networks.length) {
      var networks = enabled.networks.slice();
      Object.keys(REQUIRED_CHAINS).forEach(function (chainID) {
        if (networks.indexOf(chainID) === -1) networks.push(chainID);
      });
      if (JSON.stringify(networks) !== JSON.stringify(enabled.networks || [])) {
        writeJSON("EnabledNetworks", Object.assign({}, enabled, { time: Date.now(), networks: networks }));
      }
    }
  }

  function normalizeURL(value) {
    if (typeof value !== "string") return value;
    try {
      var url = new URL(value, window.location.origin);
      var changed = false;
      if (url.origin !== window.location.origin) return value;

      if (url.pathname.indexOf(LCD_PREFIX) === 0) {
        url.pathname = API_LCD_PREFIX + url.pathname.slice(LCD_PREFIX.length);
        changed = true;
      }

      var legacyLCDMatch = url.pathname.match(/^\/station-assets\/([^/]+-lcd)(\/.*)?$/i);
      if (legacyLCDMatch) {
        var legacyChainID = legacyLCDChainID(legacyLCDMatch[1]);
        if (legacyChainID) {
          url.pathname = API_LCD_PREFIX + encodeURIComponent(legacyChainID) + (legacyLCDMatch[2] || "");
          changed = true;
        }
      }

      if (/\/station-assets\/api\/lcd\/[^/]+\/cosmwasm\/wasm\/v1\/contract\/[^/]+\/smart\/[^/]+$/i.test(url.pathname)) {
        var numericOnly = true;
        url.searchParams.forEach(function (_value, key) {
          if (!/^\d+$/.test(key)) numericOnly = false;
        });
        if (url.search && numericOnly) {
          url.search = "";
          changed = true;
        }
      }

      var evmMatch = url.pathname.match(/^\/station-assets\/api\/evm\/([^/]+)\/address\/([^/]+)\/token\/([^/]+)$/i);
      if (evmMatch) {
        var token = decodeURIComponent(evmMatch[3] || "").toLowerCase();
        if (!/^0x[a-f0-9]{40}$/i.test(token) && EVM_NATIVE_TOKENS[token]) {
          url.pathname = "/station-assets/api/evm/" + evmMatch[1] + "/address/" + evmMatch[2];
          url.search = "";
          changed = true;
        }
      }

      var solMatch = url.pathname.match(/^\/station-assets\/api\/solana\/address\/([^/]+)\/token\/([^/]+)$/i);
      if (solMatch) {
        var mint = decodeURIComponent(solMatch[2] || "").toLowerCase();
        if (mint === "sol" || mint === "lamports") {
          url.pathname = "/station-assets/api/solana/address/" + solMatch[1];
          url.search = "";
          changed = true;
        }
      }

      if (!changed) return value;
      return value.charAt(0) === "/" ? url.pathname + url.search + url.hash : url.toString();
    } catch (error) {
      return value;
    }
  }

  window.__doWalletNormalizeRequestURL = normalizeURL;

  function requestURL(input) {
    try {
      var value = typeof input === "string" ? input : input && input.url;
      return value ? new URL(value, window.location.origin) : null;
    } catch (error) {
      return null;
    }
  }

  function nodeInfoChainIDFromInput(input) {
    try {
      var value = typeof input === "string" ? input : input && input.url;
      if (!value) return "";
      var url = new URL(value, window.location.origin);
      var match = url.pathname.match(/^\/station-assets\/api\/lcd\/([^/]+)\/cosmos\/base\/tendermint\/v1beta1\/node_info$/i);
      return match ? decodeURIComponent(match[1] || "") : "";
    } catch (error) {
      return "";
    }
  }

  function nodeInfoCacheKey(chainID) {
    return "do-wallet-node-info-cache:" + String(chainID || "");
  }

  function cachedNodeInfo(chainID) {
    try {
      var raw = window.sessionStorage && window.sessionStorage.getItem(nodeInfoCacheKey(chainID));
      if (!raw) return "";
      var parsed = JSON.parse(raw);
      if (!parsed || Date.now() - Number(parsed.time || 0) > 10 * 60 * 1000) return "";
      return String(parsed.body || "");
    } catch (error) {
      return "";
    }
  }

  function rememberNodeInfo(chainID, response) {
    try {
      if (!chainID || !response || !response.ok || !response.clone || !window.sessionStorage) return;
      response.clone().text().then(function (body) {
        if (!body) return;
        window.sessionStorage.setItem(nodeInfoCacheKey(chainID), JSON.stringify({ time: Date.now(), body: body }));
      }).catch(function () {});
    } catch (error) {}
  }

  function jsonResponse(body, source) {
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Do-Wallet-Runtime-Guard": source || "startup"
      }
    });
  }

  function fallbackLCDResponse(input) {
    var url = requestURL(input);
    if (!url || url.origin !== window.location.origin) return null;
    if (url.pathname.indexOf(API_LCD_PREFIX) !== 0) return null;

    if (/\/cosmos\/bank\/v1beta1\/balances\/[^/]+$/i.test(url.pathname)) {
      return jsonResponse(JSON.stringify({
        balances: [],
        pagination: { next_key: null, total: "0" }
      }), "empty-bank-balances");
    }

    var balanceByDenom = url.pathname.match(/\/cosmos\/bank\/v1beta1\/balances\/[^/]+\/by_denom$/i);
    if (balanceByDenom) {
      return jsonResponse(JSON.stringify({
        balance: { denom: url.searchParams.get("denom") || "", amount: "0" }
      }), "empty-bank-balance");
    }

    if (/\/terra\/alliances\/delegations(?:\/|$)/i.test(url.pathname)) {
      return jsonResponse(JSON.stringify({
        delegations: [],
        pagination: { next_key: null, total: "0" }
      }), "empty-alliance-delegations");
    }

    if (/\/terra\/alliances\/rewards(?:\/|$)/i.test(url.pathname)) {
      return jsonResponse(JSON.stringify({
        rewards: [],
        total: []
      }), "empty-alliance-rewards");
    }

    if (/\/terra\/alliances\/params$/i.test(url.pathname)) {
      return jsonResponse(JSON.stringify({
        params: {}
      }), "empty-alliance-params");
    }

    if (/\/terra\/alliances(?:\/|$)/i.test(url.pathname)) {
      return jsonResponse(JSON.stringify({
        alliances: [],
        pagination: { next_key: null, total: "0" }
      }), "empty-alliances");
    }

    var smartMatch = url.pathname.match(/\/cosmwasm\/wasm\/v1\/contract\/[^/]+\/smart\/([^/?#]+)$/i);
    if (smartMatch) {
      var queryText = "";
      try {
        queryText = atob(decodeURIComponent(smartMatch[1] || ""));
      } catch (error) {
        queryText = "";
      }
      if (/balance/i.test(queryText)) {
        return jsonResponse(JSON.stringify({ balance: "0" }), "empty-contract-balance");
      }
      if (/token_info/i.test(queryText)) {
        return jsonResponse(JSON.stringify({ name: "", symbol: "", decimals: 6, total_supply: "0" }), "empty-token-info");
      }
      return jsonResponse(JSON.stringify({}), "empty-contract-query");
    }

    return null;
  }

  function fallbackNodeInfo(chainID) {
    return JSON.stringify({
      default_node_info: {
        network: String(chainID || ""),
        moniker: "",
        listen_addr: "",
        version: "",
        channels: "",
        other: {}
      },
      application_version: {
        name: "",
        app_name: "",
        version: "",
        git_commit: "",
        build_tags: "",
        go: ""
      }
    });
  }

  try {
    var nativeOpen = XMLHttpRequest && XMLHttpRequest.prototype && XMLHttpRequest.prototype.open;
    if (nativeOpen && !nativeOpen.__doWalletRuntimeGuard) {
      XMLHttpRequest.prototype.open = function (method, url) {
        arguments[1] = normalizeURL(url);
        return nativeOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.open.__doWalletRuntimeGuard = true;
    }
  } catch (error) {}

  try {
    var nativeFetch = window.fetch;
    if (nativeFetch && !nativeFetch.__doWalletRuntimeGuard) {
      window.fetch = function (input, init) {
        if (typeof Request !== "undefined" && input instanceof Request) {
          var nextUrl = normalizeURL(input.url);
          if (nextUrl !== input.url) input = new Request(nextUrl, input);
        } else {
          input = normalizeURL(input);
        }
        var nodeInfoChainID = nodeInfoChainIDFromInput(input);
        if (nodeInfoChainID && Date.now() < NODE_INFO_BOOT_UNTIL && !NODE_INFO_LIVE_DURING_BOOT[nodeInfoChainID]) {
          var cached = cachedNodeInfo(nodeInfoChainID);
          return Promise.resolve(jsonResponse(cached || fallbackNodeInfo(nodeInfoChainID), cached ? "cache" : "startup"));
        }
        var request = nativeFetch.call(this, input, init);
        if (nodeInfoChainID && request && request.then) {
          return request.then(function (response) {
            rememberNodeInfo(nodeInfoChainID, response);
            return response;
          });
        }
        if (request && request.then) {
          return request.then(function (response) {
            return response && response.ok ? response : (fallbackLCDResponse(input) || response);
          }).catch(function (error) {
            var fallback = fallbackLCDResponse(input);
            if (fallback) return fallback;
            throw error;
          });
        }
        return request;
      };
      window.fetch.__doWalletRuntimeGuard = true;
    }
  } catch (error) {}

  try {
    var nativeSetItem = Storage && Storage.prototype && Storage.prototype.setItem;
    if (nativeSetItem && !nativeSetItem.__doWalletRuntimeGuard) {
      Storage.prototype.setItem = function (key, value) {
        if (/^(CustomLCD|CustomChains|StationLCD|StationChains)$/i.test(String(key || ""))) {
          try {
            value = JSON.stringify(normalizeRegistryObject(JSON.parse(value)));
          } catch (error) {}
        }
        return nativeSetItem.call(this, key, value);
      };
      Storage.prototype.setItem.__doWalletRuntimeGuard = true;
    }
  } catch (error) {}

  try {
    var nativeRemoveChild = Node && Node.prototype && Node.prototype.removeChild;
    if (nativeRemoveChild && !nativeRemoveChild.__doWalletRuntimeGuard) {
      Node.prototype.removeChild = function (child) {
        if (child && child.parentNode !== this) return child;
        return nativeRemoveChild.call(this, child);
      };
      Node.prototype.removeChild.__doWalletRuntimeGuard = true;
    }
    var nativeInsertBefore = Node && Node.prototype && Node.prototype.insertBefore;
    if (nativeInsertBefore && !nativeInsertBefore.__doWalletRuntimeGuard) {
      Node.prototype.insertBefore = function (child, before) {
        if (before && before.parentNode !== this) before = null;
        return nativeInsertBefore.call(this, child, before);
      };
      Node.prototype.insertBefore.__doWalletRuntimeGuard = true;
    }
  } catch (error) {}

  seedRegistry();
  window.setTimeout(seedRegistry, 500);
  window.setTimeout(seedRegistry, 2500);
})();
