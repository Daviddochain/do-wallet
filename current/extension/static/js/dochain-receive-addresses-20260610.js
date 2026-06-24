(function () {
  "use strict";

  if (window.__doWalletReceiveAddressesInstalled) return;
  window.__doWalletReceiveAddressesInstalled = true;

  var ROOT_ID = "dochain-receive-addresses-root";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var BRIDGE_TTL_MS = 10 * 60 * 1000;
  var WALLET_CACHE_MS = 2500;
  var MAX_JSON = 1024 * 1024;
  var MAX_SCAN_NODES = 1600;
  var walletCache = { expires: 0, signature: "", wallet: null };

  var CHAIN_LABELS = {
    "Do-Chain": "Do-Chain",
    "dochain-1": "Do-Chain",
    "do-main-1": "Do-Chain",
    "do": "Do-Chain",
    "888": "Do-Chain",
    "secret-4": "Secret Network",
    "secret": "Secret Network",
    "scrt": "Secret Network",
    "dungeon-1": "Dungeon Chain",
    "dungeon": "Dungeon Chain",
    "cosmoshub-4": "Cosmos Hub",
    "cosmos": "Cosmos Hub",
    "osmosis-1": "Osmosis",
    "osmosis": "Osmosis",
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
    "arbitrum-one": "Ethereum",
    "eip155:1": "Ethereum",
    "solana-mainnet": "Solana",
    "solana": "Solana",
    "sol": "Solana",
    "bip122:000000000019d6689c085ae165831e93": "Bitcoin",
  };

  var PRIORITY_LABELS = [
    "Do-Chain",
    "Ethereum",
    "Bitcoin",
    "Solana",
    "Secret Network",
    "Dungeon Chain",
    "Cosmos Hub",
    "Osmosis",
    "Akash",
    "carbon-1",
    "cheqd-mainnet-1",
    "Juno",
    "DVPN",
    "DEC",
    "HUAHUA",
  ];

  var DERIVED_PREFIX_GROUPS = [
    {
      source: ["do", "secret", "dungeon", "cosmos", "osmo", "juno", "akash", "swth", "cheqd", "sent", "decentr", "chihuahua"],
      chains: [
        { key: "Do-Chain", label: "Do-Chain", prefix: "do" },
        { key: "secret-4", label: "Secret Network", prefix: "secret" },
        { key: "dungeon-1", label: "Dungeon Chain", prefix: "dungeon" },
        { key: "cosmoshub-4", label: "Cosmos Hub", prefix: "cosmos" },
        { key: "osmosis-1", label: "Osmosis", prefix: "osmo" },
        { key: "akashnet-2", label: "Akash", prefix: "akash" },
        { key: "carbon-1", label: "carbon-1", prefix: "swth" },
        { key: "cheqd-mainnet-1", label: "cheqd-mainnet-1", prefix: "cheqd" },
        { key: "juno-1", label: "Juno", prefix: "juno" },
        { key: "sentinelhub-2", label: "DVPN", prefix: "sent" },
        { key: "decentr-mainnet-1", label: "DEC", prefix: "decentr" },
        { key: "chihuahua-1", label: "HUAHUA", prefix: "chihuahua" },
      ],
    },
  ];

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
    return (
      /^do1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^secret1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^dungeon1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^cosmos1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^osmo1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^juno1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^akash1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^swth1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^cheqd1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^sent1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^decentr1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^chihuahua1[ac-hj-np-z02-9]{20,90}$/i.test(candidate) ||
      /^0x[a-fA-F0-9]{40}$/.test(candidate) ||
      /^[13][a-km-zA-HJ-NP-Z1-9]{25,40}$/.test(candidate) ||
      /^bc1[a-z0-9]{20,90}$/i.test(candidate) ||
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(candidate)
    );
  }

  function chainLabel(key, address) {
    var cleanKey = text(key);
    if (CHAIN_LABELS[cleanKey]) return CHAIN_LABELS[cleanKey];
    if (/^do1/i.test(address)) return "Do-Chain";
    if (/^secret1/i.test(address)) return "Secret Network";
    if (/^dungeon1/i.test(address)) return "Dungeon Chain";
    if (/^cosmos1/i.test(address)) return "Cosmos Hub";
    if (/^osmo1/i.test(address)) return "Osmosis";
    if (/^juno1/i.test(address)) return "Juno";
    if (/^akash1/i.test(address)) return "Akash";
    if (/^swth1/i.test(address)) return "carbon-1";
    if (/^cheqd1/i.test(address)) return "cheqd-mainnet-1";
    if (/^sent1/i.test(address)) return "DVPN";
    if (/^decentr1/i.test(address)) return "DEC";
    if (/^chihuahua1/i.test(address)) return "HUAHUA";
    if (/^0x/i.test(address)) return "Ethereum";
    if (/^bc1|^[13]/i.test(address)) return "Bitcoin";
    return cleanKey || "Address";
  }

  function priority(label) {
    var index = PRIORITY_LABELS.indexOf(label);
    return index >= 0 ? index : 100;
  }

  function displayKey(item) {
    if (!item || !item.key || item.key === item.label) return "";
    if (item.key === "dochain-1" || item.key === "do-main-1") return "";
    return item.key;
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
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt > BRIDGE_TTL_MS) return null;
    return bridge;
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function walletName(wallet) {
    return text(wallet && (wallet.name || wallet.walletName || wallet.label));
  }

  function activeName() {
    var visible = visibleWalletName();
    var user = walletFromPayload(readStorageJson(localStore(), "user", null)) || readStorageJson(localStore(), "user", null);
    var sessionUser = walletFromPayload(readStorageJson(sessionStore(), "user", null)) || readStorageJson(sessionStore(), "user", null);
    var bridge = walletFromPayload(readBridgePayload());
    var auth = walletFromPayload(readStorageJson(localStore(), AUTH_KEY, null)) || walletFromPayload(readStorageJson(sessionStore(), AUTH_KEY, null));
    return visible || walletName(user) || walletName(sessionUser) || walletName(bridge) || walletName(auth);
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
    [BRIDGE_KEY, AUTH_KEY, "user", "wallet", "wallets", "keys", "persist:root"].forEach(function (key) {
      [local, session].forEach(function (area, index) {
        var value = storageValue(area, key) || "";
        parts.push(index + ":" + key + ":" + value.length + ":" + value.slice(0, 96) + ":" + value.slice(-96));
      });
    });
    return parts.join("|");
  }

  function visibleWalletName() {
    var ignored = /^(send|receive|swap|history|settings|copy|copied|qr|back|back to wallet|manage|dashboard|buy|buy \/ sell|sell|menu|assets|activity|connect|connect wallet|edit validator|classicnodes|do chain|bitcoin|ethereum|solana|secret network|dungeon chain)$/i;
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
    return score;
  }

  function forEachWalletAddress(wallet, callback) {
    if (!isObject(wallet)) return;
    var direct = {
      address: wallet.address,
      doAddress: wallet.doAddress,
      doChainAddress: wallet.doChainAddress,
      secretAddress: wallet.secretAddress,
      dungeonAddress: wallet.dungeonAddress,
      cosmosAddress: wallet.cosmosAddress,
      osmosisAddress: wallet.osmosisAddress,
      akashAddress: wallet.akashAddress,
      junoAddress: wallet.junoAddress,
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
    if (/^do1/i.test(address)) return "Do-Chain";
    if (/^secret1/i.test(address)) return "secret-4";
    if (/^dungeon1/i.test(address)) return "dungeon-1";
    if (/^cosmos1/i.test(address)) return "cosmoshub-4";
    if (/^osmo1/i.test(address)) return "osmosis-1";
    if (/^juno1/i.test(address)) return "juno-1";
    if (/^akash1/i.test(address)) return "akashnet-2";
    if (/^swth1/i.test(address)) return "carbon-1";
    if (/^cheqd1/i.test(address)) return "cheqd-mainnet-1";
    if (/^sent1/i.test(address)) return "sentinelhub-2";
    if (/^decentr1/i.test(address)) return "decentr-mainnet-1";
    if (/^chihuahua1/i.test(address)) return "chihuahua-1";
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
      ["address", "accAddress", "accountAddress", "doAddress", "doChainAddress", "secretAddress", "dungeonAddress", "cosmosAddress", "osmosisAddress", "akashAddress", "junoAddress", "ethereumAddress", "evmAddress", "ethAddress", "bitcoinAddress", "btcAddress", "solanaAddress", "solAddress"].forEach(function (field) {
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
      ["address", "doAddress", "doChainAddress", "secretAddress", "dungeonAddress", "cosmosAddress", "osmosisAddress", "akashAddress", "junoAddress", "ethereumAddress", "evmAddress", "ethAddress", "bitcoinAddress", "btcAddress", "solanaAddress", "solAddress"].forEach(function (field) {
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
    DERIVED_PREFIX_GROUPS.forEach(function (group) {
      var source = findAddressByPrefixes(map, group.source);
      if (!source) return;
      group.chains.forEach(function (chain) {
        var address = chain.prefix === bech32Prefix(source) ? source : convertBech32Prefix(source, chain.prefix);
        if (address) addSpecificAddress(map, chain, address);
      });
    });
    var evmAddress = Object.keys(map).map(function (key) { return map[key].address; }).find(function (address) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    });
    if (evmAddress) {
      addSpecificAddress(map, { key: "arbitrum-one", label: "Ethereum" }, evmAddress);
    }
  }

  function collectAddresses(wallet) {
    var map = {};
    if (!isObject(wallet)) return [];
    forEachWalletAddress(wallet, function (key, value) { addAddress(map, key, value); });
    completeDerivedAddresses(map);
    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return priority(a.label) - priority(b.label) || a.label.localeCompare(b.label);
    });
  }

  function shortAddress(address) {
    if (address.length <= 22) return address;
    return address.slice(0, 12) + "..." + address.slice(-10);
  }

  function addressRows(addresses) {
    return addresses.map(function (item) {
      var key = displayKey(item);
      return "" +
        "<article class=\"dochain-receive-row\">" +
        "<div class=\"dochain-receive-chain\"><span>" + escapeHtml(item.label) + "</span>" + (key ? "<strong>" + escapeHtml(key) + "</strong>" : "") + "</div>" +
        "<code title=\"" + escapeHtml(item.address) + "\">" + escapeHtml(item.address) + "</code>" +
        "<div class=\"dochain-receive-actions\">" +
        "<button type=\"button\" data-copy-address=\"" + escapeHtml(item.address) + "\">Copy</button>" +
        "</div>" +
        "</article>";
    }).join("");
  }

  function markup(wallet, addresses) {
    var name = walletName(wallet) || "Selected wallet";
    return "" +
      "<section id=\"" + ROOT_ID + "\" class=\"dochain-receive-addresses\">" +
      "<header>" +
      "<div><h1>Receive</h1><p>" + escapeHtml(name) + "</p></div>" +
      "<a class=\"dochain-receive-back\" href=\"/\">Back to wallet</a>" +
      "</header>" +
      (addresses.length
        ? "<div class=\"dochain-receive-list\">" + addressRows(addresses) + "</div>"
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

  function findReceiveContainer() {
    var headings = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3"));
    var heading = headings.find(function (node) { return text(node.textContent) === "Receive"; });
    if (heading) {
      var node = heading;
      for (var depth = 0; node && node !== document.body && depth < 8; depth += 1) {
        var className = String(node.className || "");
        if (className.indexOf("Page_grid") >= 0 || className.indexOf("Page_page") >= 0 || node.tagName === "MAIN") return node;
        node = node.parentElement;
      }
      var receiveShell = heading.closest("main,section,article,div");
      if (receiveShell) return receiveShell;
    }
    var message = Array.prototype.slice.call(document.querySelectorAll("p,span,div"))
      .find(function (node) { return text(node.textContent) === "Connect a wallet to see your addresses"; });
    if (message) return message.closest("article,main,section,div") || message.parentElement;
    var builtInList = Array.prototype.slice.call(document.querySelectorAll("input,span,p,div"))
      .find(function (node) {
        return text(node.getAttribute && node.getAttribute("placeholder")).indexOf("Search for a chain") >= 0 ||
          text(node.textContent).indexOf("Search for a chain") >= 0;
      });
    if (builtInList) {
      var listShell = builtInList.closest("main,section,article,div");
      if (listShell) return listShell;
    }
    if (window.location.pathname.indexOf("/receive") === 0) {
      var fallback = headings.find(function (node) { return text(node.textContent) === "404" || text(node.textContent) === "Not found"; });
      if (fallback) return fallback.closest("main,section,article,div") || fallback.parentElement;
      var app = document.querySelector("main, #do-wallet, #station, #app");
      if (app) return app;
    }
    return null;
  }

  function hasReceiveSearchControl() {
    return Array.prototype.slice.call(document.querySelectorAll("input,[placeholder],span,p,div"))
      .some(function (node) {
        var placeholder = text(node.getAttribute && node.getAttribute("placeholder"));
        var content = text(node.textContent);
        return placeholder.indexOf("Search for a chain") >= 0 || content.indexOf("Search for a chain") >= 0;
      });
  }

  function renderReceivePage() {
    var bodyText = String((document.body && document.body.textContent) || "");
    var isDirectReceiveRoute = window.location.pathname.indexOf("/receive") === 0;
    var isHashReceiveRoute = window.location.hash.indexOf("/receive") >= 0;
    var hasBuiltInReceiveList =
      bodyText.indexOf("Receive") >= 0 &&
      (bodyText.indexOf("Search for a chain") >= 0 ||
        hasReceiveSearchControl() ||
        (bodyText.indexOf("Copy") >= 0 && bodyText.indexOf("QR") >= 0));
    var looksLikeReceivePage =
      isDirectReceiveRoute ||
      isHashReceiveRoute ||
      hasBuiltInReceiveList ||
      (bodyText.indexOf("Receive") >= 0 && bodyText.indexOf("Connect a wallet to see your addresses") >= 0);
    if (!looksLikeReceivePage) return;
    var wallet = readWallet();
    var addresses = collectAddresses(wallet);
    var signature = renderSignature(wallet || {}, addresses);
    var current = document.getElementById(ROOT_ID);
    if (isDirectReceiveRoute) {
      document.documentElement.setAttribute("data-dochain-receive-route", "true");
      if (current && current.parentElement === document.body && current.getAttribute("data-address-signature") === signature) return;
      if (current && current.parentElement !== document.body) {
        current.remove();
        current = null;
      }
      if (current) current.outerHTML = markup(wallet || {}, addresses);
      else document.body.insertAdjacentHTML("afterbegin", markup(wallet || {}, addresses));
      current = document.getElementById(ROOT_ID);
      if (current) current.setAttribute("data-address-count", String(addresses.length));
      if (current) current.setAttribute("data-address-signature", signature);
      return;
    }
    document.documentElement.removeAttribute("data-dochain-receive-route");
    if (current && current.getAttribute("data-address-signature") === signature) return;
    var container = findReceiveContainer();
    if (!container) return;
    container.innerHTML = markup(wallet || {}, addresses);
    var root = document.getElementById(ROOT_ID);
    if (root) root.setAttribute("data-address-count", String(addresses.length));
    if (root) root.setAttribute("data-address-signature", signature);
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
      button.textContent = "Copied";
      window.setTimeout(function () { button.textContent = "Copy"; }, 1400);
    }).catch(function () {
      button.textContent = shortAddress(address);
    });
  }, true);

  function schedule() {
    window.clearTimeout(schedule.timer);
    schedule.timer = window.setTimeout(renderReceivePage, 180);
  }

  function scheduleWalletRefresh() {
    clearWalletCache();
    schedule();
  }

  window.addEventListener("load", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("do_wallet_change", scheduleWalletRefresh);
  window.addEventListener("station_wallet_change", scheduleWalletRefresh);
  window.addEventListener("do_wallet_bridge_update", scheduleWalletRefresh);
  window.addEventListener("storage", scheduleWalletRefresh);
  try {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  } catch (error) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
})();
