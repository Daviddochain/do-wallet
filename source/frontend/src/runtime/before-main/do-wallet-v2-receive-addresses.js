(function () {
  "use strict";

  if (window.__doWalletReceiveAddressesInstalled) return;
  window.__doWalletReceiveAddressesInstalled = true;

  var ROOT_ID = "dochain-receive-addresses-root";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var SELECTED_WALLET_KEY = "do-wallet-selected-recovered-wallet.v1";
  var BRIDGE_TTL_MS = 10 * 60 * 1000;
  var WALLET_CACHE_MS = 2500;
  var MAX_JSON = 6 * 1024 * 1024;
  var MAX_SCAN_NODES = 1600;
  var CHAIN_CATALOG_PATH = "/station-assets/chains.json?v=20260617allchains1";
  var walletCache = { expires: 0, signature: "", wallet: null };
  var dynamicReceiveChains = [];
  var receiveChainCatalogLoading = false;
  var lastReceiveIntentAt = 0;
  var lastReceiveIntentHost = null;
  var RECEIVE_INTENT_MS = 12000;

  var CHAIN_LABELS = {
    "Do-Chain": "Do-Chain",
    "dochain-1": "Do-Chain",
    "do-main-1": "Do-Chain",
    "do": "Do-Chain",
    "888": "Do-Chain",
    "columbus-5": "Terra Classic (LUNC)",
    "lunc": "Terra Classic (LUNC)",
    "terra-classic": "Terra Classic (LUNC)",
    "phoenix-1": "Terra (LUNA)",
    "luna": "Terra (LUNA)",
    "terra": "Terra (LUNA)",
    "330": "Terra (LUNA)",
    "mars-1": "Mars",
    "mars": "Mars",
    "secret-4": "Secret Network",
    "secret": "Secret Network",
    "scrt": "Secret Network",
    "dungeon-1": "Dungeon Chain",
    "dungeon": "Dungeon Chain",
    "cosmoshub-4": "Cosmos Hub",
    "cosmos": "Cosmos Hub",
    "osmosis-1": "Osmosis",
    "osmosis": "Osmosis",
    "orai": "Oraichain",
    "Oraichain": "Oraichain",
    "andromeda-1": "Andromeda",
    "andr": "Andromeda",
    "archway-1": "Archway",
    "archway": "Archway",
    "axelar-dojo-1": "Axelar",
    "axelar": "Axelar",
    "celestia": "Celestia",
    "celestia-mainnet": "Celestia",
    "comdex-1": "Comdex",
    "comdex": "Comdex",
    "crescent-1": "Crescent",
    "cre": "Crescent",
    "dydx-mainnet-1": "dYdX Protocol",
    "dydx": "dYdX Protocol",
    "injective-1": "Injective",
    "inj": "Injective",
    "kaiyo-1": "Kujira",
    "kujira": "Kujira",
    "kava_2222-10": "Kava",
    "kava": "Kava",
    "migaloo-1": "Migaloo",
    "migaloo": "Migaloo",
    "neutron-1": "Neutron",
    "neutron": "Neutron",
    "noble-1": "Noble",
    "noble": "Noble",
    "pacific-1": "Sei",
    "sei": "Sei",
    "pirin-1": "Nolus",
    "nolus": "Nolus",
    "pryzm-1": "Pryzm",
    "pryzm": "Pryzm",
    "stafihub-1": "StaFiHub",
    "stafi": "StaFiHub",
    "stargaze-1": "Stargaze",
    "stars": "Stargaze",
    "stride-1": "Stride",
    "stride": "Stride",
    "juno-1": "Juno",
    "juno": "Juno",
    "akashnet-2": "Akash",
    "akash": "Akash",
    "carbon-1": "carbon-1",
    "cheqd-mainnet-1": "cheqd-mainnet-1",
    "sentinelhub-2": "DVPN",
    "decentr-mainnet-1": "DEC",
    "chihuahua-1": "HUAHUA",
    "bitcoin-mainnet": "Bitcoin",
    "bitcoin": "Bitcoin",
    "btc": "Bitcoin",
    "ethereum-mainnet": "Ethereum",
    "ethereum": "Ethereum",
    "eth": "Ethereum",
    "evm": "Ethereum",
    "bnb-smart-chain-mainnet": "BNB Smart Chain",
    "bsc": "BNB Smart Chain",
    "bnb": "BNB Smart Chain",
    "polygon-mainnet": "Polygon",
    "polygon": "Polygon",
    "base-mainnet": "Base",
    "base": "Base",
    "arbitrum-one": "Arbitrum One",
    "arbitrum": "Arbitrum One",
    "optimism-mainnet": "Optimism",
    "optimism": "Optimism",
    "avalanche-c-chain": "Avalanche C-Chain",
    "avalanche": "Avalanche C-Chain",
    "avax": "Avalanche C-Chain",
    "eip155:1": "Ethereum",
    "eip155:10": "Optimism",
    "eip155:56": "BNB Smart Chain",
    "eip155:137": "Polygon",
    "eip155:42161": "Arbitrum One",
    "eip155:43114": "Avalanche C-Chain",
    "eip155:8453": "Base",
    "solana-mainnet": "Solana",
    "solana": "Solana",
    "sol": "Solana",
    "bip122:000000000019d6689c085ae165831e93": "Bitcoin",
  };

  var PRIORITY_LABELS = [
    "Do-Chain",
    "Terra Classic (LUNC)",
    "Terra (LUNA)",
    "Mars",
    "Ethereum",
    "BNB Smart Chain",
    "Polygon",
    "Base",
    "Arbitrum One",
    "Optimism",
    "Avalanche C-Chain",
    "Bitcoin",
    "Solana",
    "Secret Network",
    "Dungeon Chain",
    "Cosmos Hub",
    "Osmosis",
    "Juno",
    "Akash",
    "Axelar",
    "Archway",
    "Kujira",
    "Migaloo",
    "Stride",
    "Stargaze",
    "Injective",
    "Noble",
    "Neutron",
    "Celestia",
    "Sei",
    "Kava",
    "Crescent",
    "Comdex",
    "Andromeda",
    "Oraichain",
    "Pryzm",
    "Nolus",
    "StaFiHub",
    "Carbon",
    "Cheqd",
    "DVPN",
    "DEC",
    "Chihuahua",
  ];

  var BECH32_RECEIVE_CHAINS = [
    { key: "Do-Chain", label: "Do-Chain", prefix: "do" },
    { key: "columbus-5", label: "Terra Classic (LUNC)", prefix: "terra" },
    { key: "phoenix-1", label: "Terra (LUNA)", prefix: "terra" },
    { key: "mars-1", label: "Mars", prefix: "mars" },
    { key: "secret-4", label: "Secret Network", prefix: "secret" },
    { key: "dungeon-1", label: "Dungeon Chain", prefix: "dungeon" },
    { key: "cosmoshub-4", label: "Cosmos Hub", prefix: "cosmos" },
    { key: "osmosis-1", label: "Osmosis", prefix: "osmo" },
    { key: "juno-1", label: "Juno", prefix: "juno" },
    { key: "akashnet-2", label: "Akash", prefix: "akash" },
    { key: "axelar-dojo-1", label: "Axelar", prefix: "axelar" },
    { key: "archway-1", label: "Archway", prefix: "archway" },
    { key: "kaiyo-1", label: "Kujira", prefix: "kujira" },
    { key: "migaloo-1", label: "Migaloo", prefix: "migaloo" },
    { key: "stride-1", label: "Stride", prefix: "stride" },
    { key: "stargaze-1", label: "Stargaze", prefix: "stars" },
    { key: "injective-1", label: "Injective", prefix: "inj" },
    { key: "noble-1", label: "Noble", prefix: "noble" },
    { key: "neutron-1", label: "Neutron", prefix: "neutron" },
    { key: "celestia", label: "Celestia", prefix: "celestia" },
    { key: "pacific-1", label: "Sei", prefix: "sei" },
    { key: "kava_2222-10", label: "Kava", prefix: "kava" },
    { key: "crescent-1", label: "Crescent", prefix: "cre" },
    { key: "comdex-1", label: "Comdex", prefix: "comdex" },
    { key: "andromeda-1", label: "Andromeda", prefix: "andr" },
    { key: "Oraichain", label: "Oraichain", prefix: "orai" },
    { key: "pryzm-1", label: "Pryzm", prefix: "pryzm" },
    { key: "pirin-1", label: "Nolus", prefix: "nolus" },
    { key: "stafihub-1", label: "StaFiHub", prefix: "stafi" },
    { key: "carbon-1", label: "Carbon", prefix: "swth" },
    { key: "cheqd-mainnet-1", label: "Cheqd", prefix: "cheqd" },
    { key: "sentinelhub-2", label: "DVPN", prefix: "sent" },
    { key: "decentr-mainnet-1", label: "DEC", prefix: "decentr" },
    { key: "chihuahua-1", label: "Chihuahua", prefix: "chihuahua" },
  ];
  var DERIVED_PREFIX_GROUPS = [{
    source: BECH32_RECEIVE_CHAINS.map(function (chain) { return chain.prefix; }),
    chains: BECH32_RECEIVE_CHAINS,
  }];
  var BECH32_PREFIX_LABELS = {};
  var BECH32_PREFIX_KEYS = {};
  BECH32_RECEIVE_CHAINS.forEach(function (chain) {
    if (!BECH32_PREFIX_LABELS[chain.prefix]) BECH32_PREFIX_LABELS[chain.prefix] = chain.label;
    if (!BECH32_PREFIX_KEYS[chain.prefix]) BECH32_PREFIX_KEYS[chain.prefix] = chain.key;
  });

  var BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  var BECH32_INDEX = {};
  for (var alphabetIndex = 0; alphabetIndex < BECH32_ALPHABET.length; alphabetIndex += 1) {
    BECH32_INDEX[BECH32_ALPHABET.charAt(alphabetIndex)] = alphabetIndex;
  }

  function shouldRunHere() {
    try {
      if (window.location.protocol === "chrome-extension:" || window.location.protocol === "moz-extension:") return true;
      if (window.location.protocol !== "https:" && window.location.protocol !== "http:") return false;
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
        host === "::1" ||
        host === "[::1]"
      );
    } catch (error) {
      return false;
    }
  }

  if (!shouldRunHere()) return;

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function safeJson(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function text(value) {
    return String(value || "").trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function hasRecentReceiveIntent() {
    return Date.now() - lastReceiveIntentAt < RECEIVE_INTENT_MS;
  }

  function markReceiveIntent() {
    lastReceiveIntentAt = Date.now();
  }

  function receiveControlLabel(control) {
    if (!control) return "";
    return text(
      control.getAttribute && (
        control.getAttribute("aria-label") ||
        control.getAttribute("title") ||
        control.getAttribute("data-label")
      ) ||
      control.textContent
    ).replace(/\s+/g, " ");
  }

  function isReceiveControl(control) {
    if (!control || control.getAttribute && control.getAttribute("data-copy-address")) return false;
    var label = receiveControlLabel(control);
    return /^Receive$/i.test(label);
  }

  function rememberReceiveChain(chain) {
    if (!chain || !chain.prefix) return;
    if (!BECH32_PREFIX_LABELS[chain.prefix]) BECH32_PREFIX_LABELS[chain.prefix] = chain.label;
    if (!BECH32_PREFIX_KEYS[chain.prefix]) BECH32_PREFIX_KEYS[chain.prefix] = chain.key;
    if (chain.key && chain.label && !CHAIN_LABELS[chain.key]) CHAIN_LABELS[chain.key] = chain.label;
    if (chain.prefix && chain.label && !CHAIN_LABELS[chain.prefix]) CHAIN_LABELS[chain.prefix] = chain.label;
    if (chain.label && PRIORITY_LABELS.indexOf(chain.label) < 0) PRIORITY_LABELS.push(chain.label);
  }

  function receiveChains() {
    var seen = {};
    return BECH32_RECEIVE_CHAINS.concat(dynamicReceiveChains).filter(function (chain) {
      if (!chain || !chain.key || !chain.prefix) return false;
      var key = lower(chain.key) + ":" + lower(chain.prefix);
      if (seen[key]) return false;
      seen[key] = true;
      rememberReceiveChain(chain);
      return true;
    });
  }

  function normalizeCatalogChain(key, chain, group) {
    if (!isObject(chain)) return null;
    if ((chain.networkType || group) === "testnet") return null;
    var prefix = lower(chain.prefix);
    var chainType = lower(chain.chainType);
    var coinType = String(chain.coinType || "");
    if (!prefix || /^(0x|bc|sol|addr|r|t)$/.test(prefix)) return null;
    if (/^(bitcoin|solana|cardano|xrp|xrpl|tron|ethereum|evm)$/.test(chainType)) return null;
    if (["0", "60", "144", "195", "501", "1815"].indexOf(coinType) >= 0) return null;
    var chainID = text(chain.chainID || chain.chainId || key);
    if (!chainID) return null;
    var label = text(chain.name || CHAIN_LABELS[chainID] || chainID);
    return { key: chainID, label: label, prefix: prefix };
  }

  function collectCatalogChains(catalog) {
    var out = [];
    function add(key, chain, group) {
      var row = normalizeCatalogChain(key, chain, group);
      if (row) out.push(row);
    }
    if (Array.isArray(catalog)) {
      catalog.forEach(function (chain) { add(chain && (chain.chainID || chain.chainId), chain, "mainnet"); });
    } else if (isObject(catalog)) {
      ["mainnet", "classic"].forEach(function (group) {
        if (!isObject(catalog[group])) return;
        Object.keys(catalog[group]).forEach(function (key) {
          add(key, catalog[group][key], group);
        });
      });
      if (!out.length) {
        Object.keys(catalog).forEach(function (key) {
          add(key, catalog[key], "mainnet");
        });
      }
    }
    return out;
  }

  function loadReceiveChainCatalog() {
    if (receiveChainCatalogLoading || !window.fetch || !window.Promise) return;
    receiveChainCatalogLoading = true;
    window.fetch(CHAIN_CATALOG_PATH, { cache: "no-store" }).then(function (response) {
      return response && response.ok ? response.json() : null;
    }).then(function (catalog) {
      var rows = collectCatalogChains(catalog);
      if (rows.length) {
        dynamicReceiveChains = rows;
        dynamicReceiveChains.forEach(rememberReceiveChain);
        clearWalletCache();
        schedule();
      }
    }).catch(function () {}).then(function () {
      receiveChainCatalogLoading = false;
    });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;",
      }[char];
    });
  }

  function isAddress(value) {
    var candidate = text(value);
    var bech32 = bech32Decode(candidate);
    if (bech32 && BECH32_PREFIX_LABELS[bech32.prefix]) return true;
    return (
      /^0x[a-fA-F0-9]{40}$/.test(candidate) ||
      /^[13][a-km-zA-HJ-NP-Z1-9]{25,40}$/.test(candidate) ||
      /^bc1[a-z0-9]{20,90}$/i.test(candidate) ||
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(candidate)
    );
  }

  function chainLabel(key, address) {
    var cleanKey = text(key);
    if (CHAIN_LABELS[cleanKey]) return CHAIN_LABELS[cleanKey];
    var prefix = bech32Prefix(address);
    if (prefix === "terra") return /classic|lunc|columbus/i.test(cleanKey) ? "Terra Classic (LUNC)" : "Terra (LUNA)";
    if (prefix && BECH32_PREFIX_LABELS[prefix]) return BECH32_PREFIX_LABELS[prefix];
    if (/^0x/i.test(address)) return "Ethereum";
    if (/^bc1|^[13]/i.test(address)) return "Bitcoin";
    return cleanKey || "Address";
  }

  function priority(label) {
    var index = PRIORITY_LABELS.indexOf(label);
    return index >= 0 ? index : 100;
  }

  function displayKey(item) {
    return "";
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
    var value = text(address).toLowerCase();
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
    var cleanPrefix = lower(prefix);
    var values = bech32HrpExpand(cleanPrefix).concat(words);
    var polymod = bech32Polymod(values.concat([0, 0, 0, 0, 0, 0])) ^ 1;
    var checksum = [];
    for (var i = 0; i < 6; i += 1) checksum.push((polymod >> (5 * (5 - i))) & 31);
    return cleanPrefix + "1" + words.concat(checksum).map(function (word) {
      return BECH32_ALPHABET.charAt(word);
    }).join("");
  }

  function convertBech32Prefix(address, prefix) {
    var decoded = bech32Decode(address);
    if (!decoded) return "";
    if (decoded.prefix === lower(prefix)) return text(address);
    return bech32Encode(prefix, decoded.words);
  }

  function bech32Prefix(address) {
    var decoded = bech32Decode(address);
    return decoded ? decoded.prefix : "";
  }

  function localStore() {
    try {
      return window.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function sessionStore() {
    try {
      return window.sessionStorage || null;
    } catch (error) {
      return null;
    }
  }

  function storageValue(area, key) {
    try {
      return area && area.getItem ? area.getItem(key) : null;
    } catch (error) {
      return null;
    }
  }

  function parseStoredValue(value, fallback) {
    if (!value || typeof value !== "string" || value.length > MAX_JSON) return fallback;
    return safeJson(value, fallback);
  }

  function readStorageJson(area, key, fallback) {
    return parseStoredValue(storageValue(area, key), fallback);
  }

  function readBridgePayload() {
    var bridge = readStorageJson(localStore(), BRIDGE_KEY, null) || readStorageJson(sessionStore(), BRIDGE_KEY, null);
    if (!isObject(bridge)) return null;
    var updatedAt = Number(bridge.updatedAt);
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt > BRIDGE_TTL_MS && !hasWalletSignal(bridge)) return null;
    return bridge;
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function hasWalletSignal(payload) {
    var wallet = walletFromPayload(payload);
    return Boolean(
      isObject(wallet) &&
        (walletName(wallet) ||
          isAddress(wallet.address) ||
          isAddress(wallet.doAddress) ||
          isAddress(wallet.doChainAddress) ||
          isObject(wallet.addresses) ||
          isObject(wallet.addressMap) ||
          isObject(wallet.accounts) ||
          Array.isArray(wallet.accounts))
    );
  }

  function walletName(wallet) {
    return text(wallet && (wallet.name || wallet.walletName || wallet.label));
  }

  function activeName() {
    var visible = visibleWalletName();
    var user = walletFromPayload(readStorageJson(localStore(), "user", null)) || readStorageJson(localStore(), "user", null);
    var sessionUser = walletFromPayload(readStorageJson(sessionStore(), "user", null)) || readStorageJson(sessionStore(), "user", null);
    var selected = walletFromPayload(readStorageJson(localStore(), SELECTED_WALLET_KEY, null)) || walletFromPayload(readStorageJson(sessionStore(), SELECTED_WALLET_KEY, null));
    var bridge = walletFromPayload(readBridgePayload());
    var auth = walletFromPayload(readStorageJson(localStore(), AUTH_KEY, null)) || walletFromPayload(readStorageJson(sessionStore(), AUTH_KEY, null));
    return visible || walletName(selected) || walletName(user) || walletName(sessionUser) || walletName(bridge) || walletName(auth);
  }

  function clearWalletCache() {
    walletCache.expires = 0;
    walletCache.signature = "";
    walletCache.wallet = null;
  }

  function walletSourceSignature(name) {
    var local = localStore();
    var session = sessionStore();
    var parts = [name, String(local && local.length || 0), String(session && session.length || 0)];
    [SELECTED_WALLET_KEY, BRIDGE_KEY, AUTH_KEY, "user", "wallet", "wallets", "keys", "persist:root"].forEach(function (key) {
      [local, session].forEach(function (area, index) {
        var value = storageValue(area, key) || "";
        parts.push(index + ":" + key + ":" + value.length + ":" + value.slice(0, 96) + ":" + value.slice(-96));
      });
    });
    return parts.join("|");
  }

  function visibleWalletName() {
    var ignored = /^(send|receive|swap|history|settings|copy|copied|qr|back|back to wallet|manage|dashboard|buy|buy \/ sell|sell|menu|assets|activity|connect|connect wallet|edit validator|classicnodes|do chain|terra|terra classic|lunc|luna|mars|bitcoin|ethereum|solana|secret network|dungeon chain|cosmos hub|osmosis|juno|akash|axelar|archway|kujira|migaloo|stride|stargaze|injective|noble|neutron|celestia|sei|kava|crescent|comdex|andromeda|oraichain|pryzm|nolus|stafihub|carbon|cheqd|dvpn|dec|chihuahua)$/i;
    var entries = Array.prototype.slice.call(document.querySelectorAll("header button, nav button, header [role='button'], button, header *, [role='button']"))
      .map(function (node) {
        var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };
        return { rect: rect, text: text(node.textContent).replace(/\s+/g, " ") };
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

  function maybeParseNested(value) {
    var raw = text(value);
    if (!raw || raw.length > MAX_JSON || !/^[\[{]/.test(raw)) return value;
    return safeJson(raw, value);
  }

  function looksLikeWalletRecord(value) {
    if (!isObject(value)) return false;
    return Boolean(
      walletName(value) ||
      isAddress(value.address) ||
      isAddress(value.doAddress) ||
      isAddress(value.doChainAddress) ||
      isAddress(value.terraAddress) ||
      isAddress(value.terraClassicAddress) ||
      isAddress(value.luncAddress) ||
      isAddress(value.lunaAddress) ||
      isObject(value.addresses) ||
      isObject(value.addressMap) ||
      isObject(value.accounts) ||
      Array.isArray(value.accounts)
    );
  }

  function forEachStoredItem(callback) {
    [localStore(), sessionStore()].forEach(function (area) {
      if (!area) return;
      try {
        for (var i = 0; i < area.length; i += 1) {
          var key = area.key(i);
          if (!/wallet|key|user|bridge|station|do|address|account|persist|root|redux|auth/i.test(key || "")) continue;
          var raw = area.getItem(key);
          if (!raw || raw.length > MAX_JSON) continue;
          callback(key, raw);
        }
      } catch (error) {}
    });
  }

  function collectWalletCandidates() {
    var candidates = [];
    var nodes = 0;
    function push(value) {
      var wallet = walletFromPayload(value) || value;
      if (looksLikeWalletRecord(wallet)) candidates.push(wallet);
    }
    function walk(value, depth) {
      if (nodes > MAX_SCAN_NODES || depth > 6 || value === null || value === undefined) return;
      nodes += 1;
      var parsed = typeof value === "string" ? maybeParseNested(value) : value;
      if (parsed !== value) {
        walk(parsed, depth + 1);
        return;
      }
      push(value);
      if (Array.isArray(value)) {
        value.slice(0, 80).forEach(function (item) { walk(item, depth + 1); });
        return;
      }
      if (!isObject(value)) return;
      Object.keys(value).slice(0, 120).forEach(function (key) {
        walk(value[key], depth + 1);
      });
    }
    push(readStorageJson(localStore(), SELECTED_WALLET_KEY, null));
    push(readStorageJson(sessionStore(), SELECTED_WALLET_KEY, null));
    push(readStorageJson(localStore(), "user", null));
    push(readStorageJson(sessionStore(), "user", null));
    push(readBridgePayload());
    push(readStorageJson(localStore(), AUTH_KEY, null));
    push(readStorageJson(sessionStore(), AUTH_KEY, null));
    [readStorageJson(localStore(), "keys", null), readStorageJson(sessionStore(), "keys", null)].forEach(function (keys) {
      if (Array.isArray(keys)) keys.forEach(push);
    });
    forEachStoredItem(function (_key, raw) {
      walk(raw, 0);
    });
    return candidates;
  }

  function walletScore(wallet, name) {
    if (!isObject(wallet)) return 0;
    var score = 0;
    var walletDisplay = lower(walletName(wallet));
    var target = lower(name);
    if (walletDisplay && target && walletDisplay === target) score += 1000;
    if (walletDisplay && target && (walletDisplay.indexOf(target) >= 0 || target.indexOf(walletDisplay) >= 0)) score += 500;
    if (isObject(wallet.addresses)) score += Object.keys(wallet.addresses).length * 10;
    if (isObject(wallet.addressMap)) score += Object.keys(wallet.addressMap).length * 8;
    if (isObject(wallet.accounts)) score += Object.keys(wallet.accounts).length * 6;
    if (Array.isArray(wallet.accounts)) score += wallet.accounts.length * 6;
    score += Object.keys(collectAddressSet(wallet)).length * 12;
    if (isAddress(wallet.address)) score += 20;
    if (isAddress(wallet.doAddress) || isAddress(wallet.doChainAddress)) score += 20;
    if (isAddress(wallet.terraAddress) || isAddress(wallet.terraClassicAddress) || isAddress(wallet.luncAddress) || isAddress(wallet.lunaAddress)) score += 20;
    return score;
  }

  function forEachWalletAddress(wallet, callback) {
    if (!isObject(wallet)) return;
    var direct = {
      address: wallet.address,
      doAddress: wallet.doAddress,
      doChainAddress: wallet.doChainAddress,
      terraAddress: wallet.terraAddress,
      terraClassicAddress: wallet.terraClassicAddress,
      luncAddress: wallet.luncAddress,
      lunaAddress: wallet.lunaAddress,
      marsAddress: wallet.marsAddress,
      secretAddress: wallet.secretAddress,
      dungeonAddress: wallet.dungeonAddress,
      cosmosAddress: wallet.cosmosAddress,
      osmosisAddress: wallet.osmosisAddress,
      akashAddress: wallet.akashAddress,
      junoAddress: wallet.junoAddress,
      axelarAddress: wallet.axelarAddress,
      archwayAddress: wallet.archwayAddress,
      kujiraAddress: wallet.kujiraAddress,
      migalooAddress: wallet.migalooAddress,
      strideAddress: wallet.strideAddress,
      stargazeAddress: wallet.stargazeAddress,
      injectiveAddress: wallet.injectiveAddress,
      nobleAddress: wallet.nobleAddress,
      neutronAddress: wallet.neutronAddress,
      celestiaAddress: wallet.celestiaAddress,
      seiAddress: wallet.seiAddress,
      kavaAddress: wallet.kavaAddress,
      crescentAddress: wallet.crescentAddress,
      comdexAddress: wallet.comdexAddress,
      andromedaAddress: wallet.andromedaAddress,
      oraichainAddress: wallet.oraichainAddress,
      pryzmAddress: wallet.pryzmAddress,
      nolusAddress: wallet.nolusAddress,
      stafiAddress: wallet.stafiAddress,
      carbonAddress: wallet.carbonAddress,
      cheqdAddress: wallet.cheqdAddress,
      dvpnAddress: wallet.dvpnAddress,
      decentrAddress: wallet.decentrAddress,
      chihuahuaAddress: wallet.chihuahuaAddress,
      ethereumAddress: wallet.ethereumAddress,
      evmAddress: wallet.evmAddress,
      ethAddress: wallet.ethAddress,
      bitcoinAddress: wallet.bitcoinAddress,
      btcAddress: wallet.btcAddress,
      solanaAddress: wallet.solanaAddress,
      solAddress: wallet.solAddress,
    };
    Object.keys(direct).forEach(function (key) { callback(key, direct[key]); });
    ["addresses", "addressMap", "accounts"].forEach(function (field) {
      var values = wallet[field];
      if (!isObject(values) && !Array.isArray(values)) return;
      Object.keys(values).forEach(function (key) {
        var value = values[key];
        if (typeof value === "string") callback(key, value);
        else if (isObject(value)) callback(key, value.address || value.accAddress || value.accountAddress);
      });
    });
  }

  function collectAddressSet(wallet) {
    var set = {};
    forEachWalletAddress(wallet, function (_key, value) {
      var address = text(value).toLowerCase();
      if (isAddress(address)) set[address] = true;
    });
    return set;
  }

  function shareAddress(left, rightSet) {
    var shared = false;
    forEachWalletAddress(left, function (_key, value) {
      if (rightSet[text(value).toLowerCase()]) shared = true;
    });
    return shared;
  }

  function mergeMap(target, source) {
    if (!isObject(source)) return target;
    var next = isObject(target) ? Object.assign({}, target) : {};
    Object.keys(source).forEach(function (key) {
      if (next[key] === undefined || next[key] === null || next[key] === "") next[key] = source[key];
    });
    return next;
  }

  function chainKeyForAddress(hint, address) {
    var path = lower(hint);
    var prefix = bech32Prefix(address);
    if (prefix === "terra") {
      if (/classic|lunc|columbus/i.test(path)) return "columbus-5";
      if (/phoenix|luna/i.test(path)) return "phoenix-1";
      return "columbus-5";
    }
    if (prefix && BECH32_PREFIX_KEYS[prefix]) return BECH32_PREFIX_KEYS[prefix];
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return path.indexOf("arb") >= 0 ? "arbitrum-one" : "ethereum-mainnet";
    if (/^bc1|^[13]/i.test(address)) return "bitcoin-mainnet";
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && /sol|solana/.test(path)) return "solana-mainnet";
    return "";
  }

  function mergeLooseAddresses(wallet, name, addresses) {
    if (!isObject(addresses) || !Object.keys(addresses).length) return wallet;
    var next = Object.assign({}, isObject(wallet) ? wallet : {});
    if (name && !walletName(next)) {
      next.name = name;
      next.walletName = name;
    }
    next.addresses = mergeMap(next.addresses, addresses);
    if (!next.address) {
      next.address = addresses["Do-Chain"] || addresses["dochain-1"] || addresses["do-main-1"] || addresses[Object.keys(addresses)[0]];
    }
    return next;
  }

  function collectLooseAddressMap(name) {
    var target = lower(name);
    var fallback = {};
    var matched = {};
    var hasMatchedWallet = false;
    var nodes = 0;

    function add(map, hint, value) {
      var address = text(value);
      if (!isAddress(address)) return;
      var key = chainKeyForAddress(hint, address);
      if (!key || map[key]) return;
      map[key] = address;
    }

    function walk(value, path, depth, inMatchedWallet) {
      if (nodes > MAX_SCAN_NODES || depth > 7 || value === null || value === undefined) return;
      nodes += 1;
      var parsed = typeof value === "string" ? maybeParseNested(value) : value;
      if (parsed !== value) {
        walk(parsed, path, depth + 1, inMatchedWallet);
        return;
      }
      if (typeof value === "string") {
        add(inMatchedWallet ? matched : fallback, path, value);
        return;
      }
      if (Array.isArray(value)) {
        value.slice(0, 100).forEach(function (item, index) {
          walk(item, path + "[" + index + "]", depth + 1, inMatchedWallet);
        });
        return;
      }
      if (!isObject(value)) return;
      var display = lower(walletName(value));
      var currentMatches =
        inMatchedWallet ||
        Boolean(target && display && (display === target || display.indexOf(target) >= 0 || target.indexOf(display) >= 0));
      if (currentMatches) hasMatchedWallet = true;
      var hint = [
        path,
        value.chainID,
        value.chainId,
        value.chain_id,
        value.id,
        value.name,
        value.walletName,
        value.label,
      ].filter(Boolean).join(".");
      ["address", "accAddress", "accountAddress", "doAddress", "doChainAddress", "terraAddress", "terraClassicAddress", "luncAddress", "lunaAddress", "marsAddress", "secretAddress", "dungeonAddress", "cosmosAddress", "osmosisAddress", "akashAddress", "junoAddress", "axelarAddress", "archwayAddress", "kujiraAddress", "migalooAddress", "strideAddress", "stargazeAddress", "injectiveAddress", "nobleAddress", "neutronAddress", "celestiaAddress", "seiAddress", "kavaAddress", "crescentAddress", "comdexAddress", "andromedaAddress", "oraichainAddress", "pryzmAddress", "nolusAddress", "stafiAddress", "carbonAddress", "cheqdAddress", "dvpnAddress", "decentrAddress", "chihuahuaAddress", "ethereumAddress", "evmAddress", "ethAddress", "bitcoinAddress", "btcAddress", "solanaAddress", "solAddress"].forEach(function (field) {
        add(currentMatches ? matched : fallback, hint + "." + field, value[field]);
      });
      Object.keys(value).slice(0, 140).forEach(function (key) {
        walk(value[key], hint + "." + key, depth + 1, currentMatches);
      });
    }

    forEachStoredItem(function (key, raw) {
      walk(raw, key, 0, false);
    });

    return hasMatchedWallet && Object.keys(matched).length ? matched : fallback;
  }

  function collectVisibleAddressMap() {
    var map = {};
    function add(hint, value) {
      var raw = text(value);
      if (!raw) return;
      var candidates = raw.match(/[a-z0-9]{2,20}1[ac-hj-np-z02-9]{20,90}|0x[a-fA-F0-9]{40}|bc1[a-z0-9]{20,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,40}/gi) || [];
      candidates.forEach(function (address) {
        if (!isAddress(address)) return;
        var key = chainKeyForAddress(hint, address);
        if (key && !map[key]) map[key] = address;
      });
    }
    try {
      Array.prototype.slice.call(document.querySelectorAll("code,[title],[data-copy-address],input,textarea,span,div")).slice(0, 700).forEach(function (node) {
        add("text", node.textContent);
        if (node.getAttribute) {
          add("title", node.getAttribute("title"));
          add("copy", node.getAttribute("data-copy-address"));
          add("value", node.getAttribute("value"));
        }
        if (node.value) add("value", node.value);
      });
    } catch (error) {}
    return map;
  }

  function mergeWalletCandidates(candidates, name) {
    if (!candidates.length) return null;
    var base = Object.assign({}, candidates[0].wallet);
    var baseName = lower(walletName(base));
    var targetName = lower(name);
    var baseAddressSet = collectAddressSet(base);
    candidates.forEach(function (item) {
      var wallet = item.wallet;
      var walletDisplay = lower(walletName(wallet));
      var matchesName =
        wallet === candidates[0].wallet ||
        (targetName && walletDisplay && (walletDisplay === targetName || walletDisplay.indexOf(targetName) >= 0 || targetName.indexOf(walletDisplay) >= 0)) ||
        (baseName && walletDisplay && walletDisplay === baseName) ||
        shareAddress(wallet, baseAddressSet);
      if (!matchesName) return;
      ["address", "doAddress", "doChainAddress", "terraAddress", "terraClassicAddress", "luncAddress", "lunaAddress", "marsAddress", "secretAddress", "dungeonAddress", "cosmosAddress", "osmosisAddress", "akashAddress", "junoAddress", "axelarAddress", "archwayAddress", "kujiraAddress", "migalooAddress", "strideAddress", "stargazeAddress", "injectiveAddress", "nobleAddress", "neutronAddress", "celestiaAddress", "seiAddress", "kavaAddress", "crescentAddress", "comdexAddress", "andromedaAddress", "oraichainAddress", "pryzmAddress", "nolusAddress", "stafiAddress", "carbonAddress", "cheqdAddress", "dvpnAddress", "decentrAddress", "chihuahuaAddress", "ethereumAddress", "evmAddress", "ethAddress", "bitcoinAddress", "btcAddress", "solanaAddress", "solAddress"].forEach(function (field) {
        if (!base[field] && wallet[field]) base[field] = wallet[field];
      });
      base.addresses = mergeMap(base.addresses, wallet.addresses);
      base.addressMap = mergeMap(base.addressMap, wallet.addressMap);
      base.accounts = mergeMap(base.accounts, wallet.accounts);
      baseAddressSet = collectAddressSet(base);
    });
    return base;
  }

  function readWallet() {
    var name = activeName();
    var signature = walletSourceSignature(name);
    if (Date.now() < walletCache.expires && walletCache.signature === signature) return walletCache.wallet;
    var candidates = collectWalletCandidates()
      .map(function (wallet, index) { return { wallet: wallet, index: index, score: walletScore(wallet, name) }; })
      .filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    var wallet = mergeWalletCandidates(candidates, name);
    wallet = mergeLooseAddresses(wallet, name, collectLooseAddressMap(name));
    wallet = mergeLooseAddresses(wallet, name, collectVisibleAddressMap());
    walletCache = {
      expires: Date.now() + WALLET_CACHE_MS,
      signature: signature,
      wallet: wallet,
    };
    return walletCache.wallet;
  }

  function addAddress(map, key, value) {
    var address = text(value);
    if (!isAddress(address)) return;
    var label = chainLabel(key, address);
    var unique = label + ":" + address.toLowerCase();
    if (!map[unique]) {
      map[unique] = { label: label, key: text(key), address: address };
    }
  }

  function addSpecificAddress(map, chain, value) {
    var address = text(value);
    if (!isAddress(address)) return;
    var unique = chain.label + ":" + address.toLowerCase();
    if (!map[unique]) {
      map[unique] = { label: chain.label, key: chain.key, address: address };
    }
  }

  function findAddressByPrefixes(map, prefixes) {
    var items = Object.keys(map).map(function (key) { return map[key]; });
    for (var i = 0; i < items.length; i += 1) {
      var prefix = bech32Prefix(items[i].address);
      if (prefix && prefixes.indexOf(prefix) >= 0) return items[i].address;
    }
    return "";
  }

  function completeDerivedAddresses(map) {
    var chains = receiveChains();
    var source = findAddressByPrefixes(map, chains.map(function (chain) { return chain.prefix; }));
    if (source) {
      chains.forEach(function (chain) {
        var address = chain.prefix === bech32Prefix(source) ? source : convertBech32Prefix(source, chain.prefix);
        if (address) addSpecificAddress(map, chain, address);
      });
    }
    var btcAddress = Object.keys(map).map(function (key) { return map[key].address; }).find(function (address) {
      return /^bc1[a-z0-9]{20,90}$/i.test(address) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,40}$/.test(address);
    });
    if (btcAddress) addSpecificAddress(map, { key: "bitcoin-mainnet", label: "Bitcoin" }, btcAddress);
    var solAddress = Object.keys(map).map(function (key) { return map[key].address; }).find(function (address) {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !bech32Decode(address);
    });
    if (solAddress) addSpecificAddress(map, { key: "solana-mainnet", label: "Solana" }, solAddress);
    var evmAddress = Object.keys(map).map(function (key) { return map[key].address; }).find(function (address) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    });
    if (evmAddress) {
      addSpecificAddress(map, { key: "ethereum-mainnet", label: "Ethereum" }, evmAddress);
      [
        { key: "bnb-smart-chain-mainnet", label: "BNB Smart Chain" },
        { key: "polygon-mainnet", label: "Polygon" },
        { key: "base-mainnet", label: "Base" },
        { key: "arbitrum-one", label: "Arbitrum One" },
        { key: "optimism-mainnet", label: "Optimism" },
        { key: "avalanche-c-chain", label: "Avalanche C-Chain" }
      ].forEach(function (chain) {
        addSpecificAddress(map, chain, evmAddress);
      });
    }
  }

  function addressSpecificity(item) {
    var key = lower(item && item.key);
    var label = lower(item && item.label);
    var score = 0;
    if (key && key !== "address" && key !== label) score += 8;
    if (priority(item && item.label) < PRIORITY_LABELS.length) score += 4;
    if (key.indexOf("-") >= 0 || key === "do-chain") score += 2;
    if (bech32Prefix(item && item.address)) score += 1;
    return score;
  }

  function dedupeReceiveItems(items) {
    var byAddress = {};
    var byLabel = {};
    items.forEach(function (item) {
      var addressKey = lower(item.label) + ":" + lower(item.address);
      if (!byAddress[addressKey] || addressSpecificity(item) > addressSpecificity(byAddress[addressKey])) {
        byAddress[addressKey] = item;
      }
    });
    Object.keys(byAddress).map(function (key) { return byAddress[key]; }).forEach(function (item) {
      var labelKey = lower(item.label);
      if (!byLabel[labelKey] || addressSpecificity(item) > addressSpecificity(byLabel[labelKey])) {
        byLabel[labelKey] = item;
      }
    });
    return Object.keys(byLabel).map(function (key) { return byLabel[key]; });
  }

  function collectAddresses(wallet) {
    var map = {};
    if (!isObject(wallet)) return [];
    forEachWalletAddress(wallet, function (key, value) { addAddress(map, key, value); });
    completeDerivedAddresses(map);
    return dedupeReceiveItems(Object.keys(map).map(function (key) { return map[key]; })).sort(function (a, b) {
      return priority(a.label) - priority(b.label) || a.label.localeCompare(b.label);
    });
  }

  function shortAddress(address) {
    if (address.length <= 18) return address;
    return address.slice(0, 6) + "..." + address.slice(-6);
  }

  function iconPath(item) {
    var label = lower(item && item.label);
    var key = lower(item && item.key);
    if (label.indexOf("do-chain") >= 0 || label.indexOf("do chain") >= 0 || key === "do-chain") return "/station-assets/img/chains/DoChain.png";
    if (label.indexOf("terra classic") >= 0 || key === "columbus-5") return "/station-assets/img/chains/TerraClassic.svg";
    if (label === "terra (luna)" || label === "terra" || key === "phoenix-1") return "/station-assets/img/chains/Terra.svg";
    if (label.indexOf("dungeon") >= 0 || key === "dungeon-1") return "/station-assets/img/chains/Dungeon.png";
    if (label.indexOf("mars") >= 0 || key === "mars-1") return "/station-assets/img/chains/Mars.svg";
    if (label.indexOf("bitcoin") >= 0 || key === "bitcoin-mainnet") return "/station-assets/img/chains/Bitcoin.svg";
    if (label.indexOf("ethereum") >= 0 || key === "ethereum-mainnet") return "/station-assets/img/chains/Ethereum.svg";
    if (label.indexOf("bnb") >= 0 || key === "bnb-smart-chain-mainnet") return "/station-assets/img/chains/BNB.svg";
    if (label.indexOf("solana") >= 0 || key === "solana-mainnet") return "/station-assets/img/chains/Solana.svg";
    if (label.indexOf("akash") >= 0 || key === "akashnet-2") return "/station-assets/img/chains/Akash.svg";
    if (label.indexOf("arbitrum") >= 0 || key === "arbitrum-one") return "/station-assets/img/chains/Arbitrum.svg";
    if (label.indexOf("archway") >= 0 || key === "archway-1") return "/station-assets/img/chains/Archway.png";
    if (label.indexOf("avalanche") >= 0 || key === "avalanche-c-chain") return "/station-assets/img/chains/Avalanche.svg";
    if (label.indexOf("axelar") >= 0 || key === "axelar-dojo-1") return "/station-assets/img/chains/Axelar.svg";
    if (label.indexOf("base") >= 0 || key === "base-mainnet") return "/station-assets/img/chains/Base.svg";
    if (label.indexOf("carbon") >= 0 || key === "carbon-1") return "/station-assets/img/chains/Carbon.svg";
    if (label.indexOf("cardano") >= 0 || key === "cardano-mainnet") return "/station-assets/img/chains/Cardano.svg";
    if (label.indexOf("cheqd") >= 0 || key === "cheqd-mainnet-1") return "/station-assets/img/chains/Cheqd.svg";
    if (label.indexOf("chihuahua") >= 0 || key === "chihuahua-1") return "/station-assets/img/chains/Huahua.png";
    if (label.indexOf("cosmos") >= 0 || key === "cosmoshub-4") return "/station-assets/img/chains/Cosmos.svg";
    if (label.indexOf("crescent") >= 0 || key === "crescent-1") return "/station-assets/img/chains/Crescent.svg";
    if (label.indexOf("decentr") >= 0 || label === "dec" || key === "mainnet-3") return "/station-assets/img/chains/Decentr.svg";
    if (label.indexOf("juno") >= 0 || key === "juno-1") return "/station-assets/img/chains/Juno.svg";
    if (label.indexOf("kujira") >= 0 || key === "kaiyo-1") return "/station-assets/img/chains/Kujira.png";
    if (label.indexOf("optimism") >= 0 || key === "optimism-mainnet") return "/station-assets/img/chains/Optimism.svg";
    if (label.indexOf("osmosis") >= 0 || key === "osmosis-1") return "/station-assets/img/chains/Osmosis.svg";
    if (label.indexOf("polygon") >= 0 || key === "polygon-mainnet") return "/station-assets/img/chains/Polygon.svg";
    if (label.indexOf("secret") >= 0 || key === "secret-4") return "/station-assets/img/chains/Secret.svg";
    if (label.indexOf("sei") >= 0 || key === "pacific-1") return "/station-assets/img/chains/sei.svg";
    if (label.indexOf("stafi") >= 0 || key === "stafihub-1") return "/station-assets/img/chains/StaFiHub.png";
    if (label.indexOf("stride") >= 0 || key === "stride-1") return "/station-assets/img/chains/Stride.png";
    if (label.indexOf("tron") >= 0 || key === "tron-mainnet") return "/station-assets/img/chains/Tron.svg";
    if (label.indexOf("xrp") >= 0 || key === "xrp-ledger-mainnet") return "/station-assets/img/chains/XRP.svg";
    return "";
  }

  function copyIcon() {
    return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"9\" y=\"9\" width=\"10\" height=\"12\" rx=\"1.5\"></rect><path d=\"M5 15V4.5C5 3.7 5.7 3 6.5 3H17\"></path></svg>";
  }

  function qrIcon() {
    return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z\"></path><path d=\"M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z\"></path></svg>";
  }

  function searchIcon() {
    return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"7\"></circle><path d=\"m16.5 16.5 4 4\"></path></svg>";
  }

  function addressRows(addresses) {
    return addresses.map(function (item) {
      var key = displayKey(item);
      var icon = iconPath(item);
      var search = [item.label, key, item.address].filter(Boolean).join(" ").toLowerCase();
      return "" +
        "<article class=\"dochain-receive-row\" data-receive-row data-search=\"" + escapeHtml(search) + "\">" +
        "<div class=\"dochain-receive-chain\">" +
        (icon ? "<img class=\"dochain-receive-icon\" src=\"" + escapeHtml(icon) + "\" alt=\"\">" : "<span class=\"dochain-receive-icon dochain-receive-icon--empty\"></span>") +
        "<span>" + escapeHtml(item.label) + "</span>" +
        (key ? "<strong>" + escapeHtml(key) + "</strong>" : "") +
        "</div>" +
        "<code title=\"" + escapeHtml(item.address) + "\">" + escapeHtml(shortAddress(item.address)) + "</code>" +
        "<div class=\"dochain-receive-actions\">" +
        "<button type=\"button\" class=\"dochain-receive-icon-button\" data-copy-address=\"" + escapeHtml(item.address) + "\" aria-label=\"Copy " + escapeHtml(item.label) + " address\" title=\"Copy address\">" + copyIcon() + "</button>" +
        "<button type=\"button\" class=\"dochain-receive-icon-button\" data-qr-address=\"" + escapeHtml(item.address) + "\" aria-label=\"Show " + escapeHtml(item.label) + " QR\" title=\"QR\">" + qrIcon() + "</button>" +
        "</div>" +
        "</article>";
    }).join("");
  }

  function markup(wallet, addresses) {
    var name = walletName(wallet) || "Selected wallet";
    return "" +
      "<section id=\"" + ROOT_ID + "\" class=\"dochain-receive-addresses\">" +
      "<header>" +
      "<a class=\"dochain-receive-back\" href=\"/\" aria-label=\"Back to wallet\">&#8592;</a>" +
      "<h1>Receive</h1>" +
      "</header>" +
      "<label class=\"dochain-receive-search\">" + searchIcon() + "<input type=\"search\" data-receive-search placeholder=\"Search for a chain...\" autocomplete=\"off\"></label>" +
      (addresses.length
        ? "<div class=\"dochain-receive-list\">" + addressRows(addresses) + "<div class=\"dochain-receive-empty dochain-receive-empty--filtered\" hidden><strong>No chains found.</strong></div></div>"
        : "<div class=\"dochain-receive-empty\"><strong>No receive addresses found for this wallet.</strong><span>Open the wallet manager and confirm this wallet has generated chain addresses.</span></div>") +
      "</section>";
  }

  function renderSignature(wallet, addresses) {
    return [
      walletName(wallet),
      addresses.map(function (item) {
        return item.label + ":" + item.key + ":" + item.address;
      }).join("|"),
    ].join("||");
  }

  function textWithoutReceiveRoot(node) {
    if (!node) return "";
    var clone = node.cloneNode(true);
    var mounted = clone.querySelector && clone.querySelector("#" + ROOT_ID);
    if (mounted) mounted.remove();
    return text(clone.textContent || "").replace(/\s+/g, " ");
  }

  function receiveMainText() {
    var main = document.querySelector("main,[role='main']") || document.body;
    return textWithoutReceiveRoot(main);
  }

  function receiveLabelAliases(label) {
    var aliases = {
      "Do-Chain": ["Do-Chain", "Do Chain"],
      "Terra Classic (LUNC)": ["Terra Classic", "LUNC", "Lunc"],
      "Terra (LUNA)": ["Terra (LUNA)", "Terra Luna", "LUNA"],
      "BNB Smart Chain": ["BNB Smart Chain", "Bnb Smart Chain"],
      "Avalanche C-Chain": ["Avalanche C-Chain", "Avalanche"]
    };
    return aliases[label] || [label];
  }

  function builtInReceiveHasLabel(label) {
    var value = receiveMainText();
    return receiveLabelAliases(label).some(function (alias) {
      return value.indexOf(alias) >= 0;
    });
  }

  function builtInReceiveMissingGeneratedChains(addresses) {
    var expected = {};
    (addresses || []).forEach(function (item) {
      if (!item || !item.label) return;
      if (priority(item.label) <= priority("Chihuahua")) expected[item.label] = true;
    });
    return Object.keys(expected).some(function (label) {
      return !builtInReceiveHasLabel(label);
    });
  }

  function removeMountedReceiveRoot() {
    var current = document.getElementById(ROOT_ID);
    if (current) current.remove();
    Array.prototype.slice.call(document.querySelectorAll("[data-dochain-receive-host='true']")).forEach(function (node) {
      node.removeAttribute("data-dochain-receive-host");
    });
  }

  function isUnsafeReceiveHost(node) {
    if (!node || node === document.body || node === document.documentElement) return true;
    if (node.tagName === "MAIN") return true;
    if (/^(station|do-wallet|app|root)$/i.test(String(node.id || ""))) return true;
    var content = text(node.textContent || "");
    if (content.indexOf("Dashboard") >= 0 && content.indexOf("Networks") >= 0) return true;
    return false;
  }

  function findRecentReceiveIntentHost() {
    var existingRoot = document.getElementById(ROOT_ID);
    if (!hasRecentReceiveIntent() && !existingRoot) return null;
    if (
      lastReceiveIntentHost &&
      document.documentElement.contains(lastReceiveIntentHost) &&
      !isUnsafeReceiveHost(lastReceiveIntentHost) &&
      visibleRect(lastReceiveIntentHost)
    ) {
      return lastReceiveIntentHost;
    }
    var viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var nodes = Array.prototype.slice.call(document.querySelectorAll("aside,section,article,main,div,[role='dialog']"));
    var candidates = nodes.map(function (node) {
      if (!node || node.id === ROOT_ID || existingRoot && existingRoot.contains(node)) return null;
      if (isUnsafeReceiveHost(node)) return null;
      var rect = visibleRect(node);
      if (!rect || rect.width < 280 || rect.height < 260 || rect.top > 180) return null;
      if (rect.width > Math.max(760, viewportWidth * 0.62)) return null;
      if (viewportWidth && rect.right < viewportWidth - 90 && rect.left < viewportWidth * 0.32) return null;
      var value = text(node.textContent || "").replace(/\s+/g, " ");
      var score = 0;
      score += Math.max(0, 240 - Math.abs(viewportWidth - rect.right)) / 24;
      if (rect.width <= 560) score += 8;
      if (value.length <= 180) score += 5;
      if (/Receive/i.test(value)) score += 2;
      if (rect.top <= 100) score += 2;
      return { node: node, score: score };
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score;
    });
    return candidates[0] && candidates[0].node || null;
  }

  function rememberReceiveIntentHost(control) {
    lastReceiveIntentHost = null;
    var viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var node = control;
    for (var depth = 0; node && node !== document.body && depth < 10; depth += 1) {
      if (!isUnsafeReceiveHost(node)) {
        var rect = visibleRect(node);
        if (
          rect &&
          rect.width >= 280 &&
          rect.height >= 260 &&
          rect.width <= Math.max(760, viewportWidth * 0.62) &&
          (!viewportWidth || rect.right >= viewportWidth - 90 || rect.left >= viewportWidth * 0.32)
        ) {
          lastReceiveIntentHost = node;
          return;
        }
      }
      node = node.parentElement;
    }
  }

  function mountReceiveRoot(wallet, addresses, signature) {
    var host = findReceiveContainer();
    var useHost = host && !isUnsafeReceiveHost(host);
    var current = document.getElementById(ROOT_ID);

    if (useHost) {
      if (current && !host.contains(current)) current.remove();
      current = document.getElementById(ROOT_ID);
      if (current && current.getAttribute("data-address-signature") === signature) return;
      host.setAttribute("data-dochain-receive-host", "true");
      host.innerHTML = markup(wallet || {}, addresses);
      var hostedRoot = document.getElementById(ROOT_ID);
      if (hostedRoot) hostedRoot.setAttribute("data-address-count", String(addresses.length));
      if (hostedRoot) hostedRoot.setAttribute("data-address-signature", signature);
      return;
    }

    removeMountedReceiveRoot();
  }

  function isReceiveRoute() {
    return window.location.pathname.indexOf("/receive") === 0 ||
      window.location.hash.indexOf("/receive") >= 0 ||
      hasRecentReceiveIntent() ||
      Boolean(document.getElementById(ROOT_ID));
  }

  function visibleRect(node) {
    if (!node || typeof node.getBoundingClientRect !== "function") return null;
    var rect = node.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    try {
      var style = window.getComputedStyle(node);
      if (!style || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
    } catch (error) {}
    return rect;
  }

  function receiveFallbackMount() {
    if (!isReceiveRoute() || !document.body) return null;
    var existing = document.querySelector("[data-dochain-receive-fallback-host='true']");
    if (existing && document.body.contains(existing)) return existing;

    var main = document.querySelector("main,[role='main']");
    if (!main) {
      var roots = Array.prototype.slice.call(document.querySelectorAll("#station,#do-wallet,#root,[data-reactroot],body > div"));
      var scored = roots.map(function (node) {
        var rect = visibleRect(node) || { width: 0, height: 0, left: 0 };
        var textValue = text(node.textContent || "");
        var score = 0;
        if (rect.width > 420 && rect.height > 260) score += 4;
        if (rect.left > 120) score += 2;
        if (textValue.indexOf("Dashboard") >= 0 && textValue.indexOf("Networks") >= 0) score -= 4;
        if (node === document.body || node === document.documentElement) score -= 8;
        return { node: node, score: score };
      }).filter(function (entry) {
        return entry.score > 0 && entry.node !== document.body && entry.node !== document.documentElement;
      }).sort(function (a, b) { return b.score - a.score; });
      main = scored[0] && scored[0].node;
    }
    if (!main || main === document.body || main === document.documentElement) return null;

    var host = document.createElement("section");
    host.setAttribute("data-dochain-receive-fallback-host", "true");
    host.setAttribute("aria-label", "Receive addresses");
    host.style.minHeight = "100%";
    host.style.width = "100%";
    main.appendChild(host);
    return host;
  }

  function findReceiveContainer() {
    var headings = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3"));
    var currentRoot = document.getElementById(ROOT_ID);
    var heading = headings.find(function (node) {
      return text(node.textContent) === "Receive" && (!currentRoot || !currentRoot.contains(node));
    });
    if (heading) {
      var node = heading;
      for (var depth = 0; node && node !== document.body && depth < 8; depth += 1) {
        var className = String(node.className || "");
        if ((className.indexOf("Page_grid") >= 0 || className.indexOf("Page_page") >= 0) && !isUnsafeReceiveHost(node)) return node;
        node = node.parentElement;
      }
      var receiveShell = heading.closest("main,section,article,div");
      if (receiveShell && !isUnsafeReceiveHost(receiveShell)) return receiveShell;
    }
    var message = Array.prototype.slice.call(document.querySelectorAll("p,span,div"))
      .find(function (node) { return text(node.textContent) === "Connect a wallet to see your addresses"; });
    if (message) {
      var messageShell = message.closest("article,section,div") || message.parentElement;
      if (messageShell && !isUnsafeReceiveHost(messageShell)) return messageShell;
    }
    var builtInList = Array.prototype.slice.call(document.querySelectorAll("input,span,p,div"))
      .find(function (node) {
        if (currentRoot && currentRoot.contains(node)) return false;
        return text(node.getAttribute && node.getAttribute("placeholder")).indexOf("Search for a chain") >= 0 ||
          text(node.textContent).indexOf("Search for a chain") >= 0;
      });
    if (builtInList) {
      var listShell = builtInList.closest("main,section,article,div");
      if (listShell && !isUnsafeReceiveHost(listShell)) return listShell;
    }
    var intentShell = findRecentReceiveIntentHost();
    if (intentShell && !isUnsafeReceiveHost(intentShell)) return intentShell;
    if (window.location.pathname.indexOf("/receive") === 0) {
      var fallback = headings.find(function (node) { return text(node.textContent) === "404" || text(node.textContent) === "Not found"; });
      if (fallback) {
        var fallbackShell = fallback.closest("article,section,div") || fallback.parentElement;
        if (fallbackShell && !isUnsafeReceiveHost(fallbackShell)) return fallbackShell;
      }
    }
    return receiveFallbackMount();
  }

  function hasReceiveSearchControl() {
    var currentRoot = document.getElementById(ROOT_ID);
    return Array.prototype.slice.call(document.querySelectorAll("input,[placeholder],span,p,div"))
      .some(function (node) {
        if (currentRoot && currentRoot.contains(node)) return false;
        var placeholder = text(node.getAttribute && node.getAttribute("placeholder"));
        var content = text(node.textContent);
        return placeholder.indexOf("Search for a chain") >= 0 || content.indexOf("Search for a chain") >= 0;
      });
  }

  function renderReceivePage() {
    var bodyText = textWithoutReceiveRoot(document.body);
    var isDirectReceiveRoute = window.location.pathname.indexOf("/receive") === 0;
    var isHashReceiveRoute = window.location.hash.indexOf("/receive") >= 0;
    var hasMountedReceiveRoot = Boolean(document.getElementById(ROOT_ID));
    var hasIntentReceiveHost = Boolean(findRecentReceiveIntentHost());
    var hasBuiltInReceiveList =
      bodyText.indexOf("Receive") >= 0 &&
      (bodyText.indexOf("Search for a chain") >= 0 ||
        hasReceiveSearchControl() ||
        (bodyText.indexOf("Copy") >= 0 && bodyText.indexOf("QR") >= 0));
    var looksLikeReceivePage =
      hasMountedReceiveRoot ||
      isDirectReceiveRoute ||
      isHashReceiveRoute ||
      hasIntentReceiveHost ||
      hasBuiltInReceiveList ||
      (bodyText.indexOf("Receive") >= 0 && bodyText.indexOf("Connect a wallet to see your addresses") >= 0);
    if (!looksLikeReceivePage) {
      document.documentElement.removeAttribute("data-dochain-receive-route");
      var stale = document.getElementById(ROOT_ID);
      if (stale) stale.remove();
      return;
    }
    var wallet = readWallet();
    var addresses = collectAddresses(wallet);
    if (hasBuiltInReceiveList) {
      document.documentElement.setAttribute("data-dochain-receive-route", "builtin");
      removeMountedReceiveRoot();
      return;
    }
    if (wallet && addresses.length) {
      document.documentElement.setAttribute("data-dochain-receive-route", (isDirectReceiveRoute || isHashReceiveRoute) ? "true" : "fallback");
      mountReceiveRoot(wallet, addresses, renderSignature(wallet, addresses));
      return;
    }
    document.documentElement.setAttribute("data-dochain-receive-route", "native-only");
    removeMountedReceiveRoot();
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value);
    var input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    return Promise.resolve();
  }

  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest && event.target.closest("[data-copy-address]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    var address = button.getAttribute("data-copy-address") || "";
    copyText(address).then(function () {
      button.setAttribute("data-copied", "true");
      window.setTimeout(function () { button.removeAttribute("data-copied"); }, 1400);
    }).catch(function () {
      button.setAttribute("data-copy-failed", "true");
      window.setTimeout(function () { button.removeAttribute("data-copy-failed"); }, 1400);
    });
  }, true);

  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest && event.target.closest("[data-qr-address]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    button.setAttribute("data-copied", "true");
    window.setTimeout(function () { button.removeAttribute("data-copied"); }, 900);
  }, true);

  document.addEventListener("input", function (event) {
    var input = event.target && event.target.closest && event.target.closest("[data-receive-search]");
    if (!input) return;
    var root = input.closest && input.closest(".dochain-receive-addresses");
    if (!root) return;
    var query = lower(input.value);
    var visibleCount = 0;
    Array.prototype.slice.call(root.querySelectorAll("[data-receive-row]")).forEach(function (row) {
      var haystack = lower(row.getAttribute("data-search"));
      var match = !query || haystack.indexOf(query) >= 0;
      row.hidden = !match;
      if (match) visibleCount += 1;
    });
    var empty = root.querySelector(".dochain-receive-empty--filtered");
    if (empty) empty.hidden = visibleCount > 0;
  }, true);

  document.addEventListener("click", function (event) {
    var control = event.target && event.target.closest && event.target.closest("button,a,[role='button']");
    if (!isReceiveControl(control)) return;
    markReceiveIntent();
    rememberReceiveIntentHost(control);
    clearWalletCache();
    try {
      startTransientObserver(10000);
    } catch (error) {}
    schedule();
    window.setTimeout(schedule, 250);
    window.setTimeout(schedule, 900);
  }, true);

  function schedule() {
    window.clearTimeout(schedule.timer);
    if (!schedule.firstRequestedAt) schedule.firstRequestedAt = Date.now();
    var waited = Date.now() - schedule.firstRequestedAt;
    schedule.timer = window.setTimeout(function () {
      schedule.timer = null;
      schedule.firstRequestedAt = 0;
      renderReceivePage();
    }, waited > 650 ? 0 : 180);
  }

  function scheduleWalletRefresh() {
    clearWalletCache();
    schedule();
  }

  window.addEventListener("load", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("do_wallet_bridge_update", scheduleWalletRefresh);
  window.addEventListener("storage", scheduleWalletRefresh);
  loadReceiveChainCatalog();
  window.setTimeout(schedule, 750);
  window.setTimeout(schedule, 2000);
  window.setTimeout(schedule, 5000);
  window.setInterval(function () {
    if (
      document.getElementById(ROOT_ID) ||
      window.location.pathname.indexOf("/receive") === 0 ||
      window.location.hash.indexOf("/receive") >= 0
    ) {
      schedule();
    }
  }, 15000);
  function mutationMayAffectReceive(mutations) {
    if (
      document.getElementById(ROOT_ID) ||
      window.location.pathname.indexOf("/receive") === 0 ||
      window.location.hash.indexOf("/receive") >= 0
    ) {
      return true;
    }
    var pattern = /Receive|Connect a wallet to see your addresses|Search for a chain/i;
    for (var i = 0; i < mutations.length && i < 40; i += 1) {
      var mutation = mutations[i];
      var nodes = Array.prototype.slice.call(mutation.addedNodes || []).concat(Array.prototype.slice.call(mutation.removedNodes || []));
      for (var j = 0; j < nodes.length && j < 20; j += 1) {
        var node = nodes[j];
        if (!node) continue;
        if (node.id === ROOT_ID) return true;
        var value = node.nodeType === 3 ? node.nodeValue : node.textContent;
        if (value && pattern.test(String(value).slice(0, 2000))) return true;
      }
    }
    return false;
  }

  var observer = null;
  var observerTimer = 0;
  function stopTransientObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }
  function startTransientObserver(duration) {
    if (!window.MutationObserver || !document.body) return;
    duration = Number(duration) || 3000;
    if (!observer) {
      observer = new MutationObserver(function (mutations) {
        if (mutationMayAffectReceive(mutations || [])) schedule();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(stopTransientObserver, duration);
  }

  try {
    startTransientObserver(8000);
  } catch (error) {}
  document.addEventListener("click", function () {
    startTransientObserver(3000);
  }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();

  window.doWalletReceiveAddresses = {
    render: renderReceivePage,
    refresh: scheduleWalletRefresh,
    readWallet: readWallet,
    collectAddresses: collectAddresses,
  };
})();
