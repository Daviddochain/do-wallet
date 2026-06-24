(function () {
  "use strict";

  if (window.__doWalletSessionRestore20260616) return;
  window.__doWalletSessionRestore20260616 = true;

  var USER_KEY = "user";
  var LEGACY_KEYS_KEY = "keys";
  var RECOVERED_WALLETS_KEY = "do-wallet-recovered-wallets.v1";
  var LEGACY_KEYS_MARKER_KEY = "do-wallet-legacy-keys-masked.v1";
  var USER_QUARANTINE_KEY = "do-wallet-user-quarantine.v1";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var SELECTED_WALLET_KEY = "do-wallet-selected-recovered-wallet.v1";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var LOCAL_RESTORE_URL = "http://127.0.0.1:23888/do-wallet-local-restore";
  var LOCAL_RESTORE_ATTEMPT_KEY = "do-wallet-local-restore-attempted.v2";
  var MAX_JSON = 8 * 1024 * 1024;
  var MAX_SCAN_WALLETS = 250;
  var MAX_SCAN_DEPTH = 5;
  var MAX_SCAN_ARRAY_ITEMS = 250;
  var MAX_SCAN_OBJECT_KEYS = 120;
  var ENABLE_GENERIC_STORAGE_WALLET_SCAN = false;
  var storageGetItem = null;
  var storageSetItem = null;
  var storageRemoveItem = null;
  var storageKey = null;

  function shouldRunHere() {
    try {
      var host = window.location.hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "do-wallet.com" || host === "www.do-wallet.com" || host.endsWith(".do-wallet.com");
    } catch (error) {
      return false;
    }
  }

  function shouldAutoProbeLocalRestoreHelper() {
    try {
      var host = window.location.hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1";
    } catch (error) {
      return false;
    }
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function text(value) {
    return String(value || "").trim();
  }

  var ADDRESS_KEY_ALIASES = {
    "do-chain": ["Do-Chain"],
    "dochain-1": ["Do-Chain"],
    "do-main-1": ["Do-Chain"],
    dochain: ["Do-Chain"],
    do: ["Do-Chain"],
    "888": ["Do-Chain"],
    "columbus-5": ["columbus-5"],
    lunc: ["columbus-5"],
    "terra-classic": ["columbus-5"],
    "phoenix-1": ["phoenix-1"],
    luna: ["phoenix-1"],
    "mars-1": ["mars-1"],
    mars: ["mars-1"],
    "secret-4": ["secret-4"],
    secret: ["secret-4"],
    "529": ["secret-4"],
    "dungeon-1": ["dungeon-1"],
    dungeon: ["dungeon-1"],
    "cosmoshub-4": ["cosmoshub-4"],
    cosmos: ["cosmoshub-4"],
    "osmosis-1": ["osmosis-1"],
    osmo: ["osmosis-1"],
    "juno-1": ["juno-1"],
    juno: ["juno-1"],
    "akashnet-2": ["akashnet-2"],
    akash: ["akashnet-2"],
    "carbon-1": ["carbon-1"],
    swth: ["carbon-1"],
    "cheqd-mainnet-1": ["cheqd-mainnet-1"],
    cheqd: ["cheqd-mainnet-1"],
    "sentinelhub-2": ["sentinelhub-2"],
    sent: ["sentinelhub-2"],
    "decentr-mainnet-1": ["decentr-mainnet-1"],
    decentr: ["decentr-mainnet-1"],
    "chihuahua-1": ["chihuahua-1"],
    chihuahua: ["chihuahua-1"],
    "injective-1": ["injective-1"],
    inj: ["injective-1"],
    "kaiyo-1": ["kaiyo-1"],
    kujira: ["kaiyo-1"],
    "stargaze-1": ["stargaze-1"],
    stars: ["stargaze-1"],
    "stride-1": ["stride-1"],
    stride: ["stride-1"],
    "noble-1": ["noble-1"],
    noble: ["noble-1"],
    "neutron-1": ["neutron-1"],
    neutron: ["neutron-1"],
    celestia: ["celestia"],
    "archway-1": ["archway-1"],
    archway: ["archway-1"],
    "axelar-dojo-1": ["axelar-dojo-1"],
    axelar: ["axelar-dojo-1"],
    "andromeda-1": ["andromeda-1"],
    andr: ["andromeda-1"],
    "migaloo-1": ["migaloo-1"],
    migaloo: ["migaloo-1"],
    "pacific-1": ["pacific-1"],
    sei: ["pacific-1"],
    "kava_2222-10": ["kava_2222-10"],
    kava: ["kava_2222-10"],
    "crescent-1": ["crescent-1"],
    cre: ["crescent-1"],
    "comdex-1": ["comdex-1"],
    comdex: ["comdex-1"],
    Oraichain: ["Oraichain"],
    oraichain: ["Oraichain"],
    orai: ["Oraichain"],
    "pryzm-1": ["pryzm-1"],
    pryzm: ["pryzm-1"],
    "pirin-1": ["pirin-1"],
    nolus: ["pirin-1"],
    "stafihub-1": ["stafihub-1"],
    stafi: ["stafihub-1"],
    "dydx-mainnet-1": ["dydx-mainnet-1"],
    dydx: ["dydx-mainnet-1"],
    "mainnet-3": ["decentr-mainnet-1"],
    "ethereum-mainnet": ["ethereum-mainnet"],
    ethereum: ["ethereum-mainnet"],
    eth: ["ethereum-mainnet"],
    evm: ["ethereum-mainnet"],
    "eip155:1": ["ethereum-mainnet"],
    "60": ["ethereum-mainnet"],
    "bitcoin-mainnet": ["bitcoin-mainnet"],
    bitcoin: ["bitcoin-mainnet"],
    btc: ["bitcoin-mainnet"],
    "0": ["bitcoin-mainnet"],
    "solana-mainnet": ["solana-mainnet"],
    solana: ["solana-mainnet"],
    sol: ["solana-mainnet"],
    "501": ["solana-mainnet"]
  };

  var ADDRESS_PREFIX_KEYS = {
    do: ["Do-Chain"],
    terra: ["columbus-5", "phoenix-1"],
    mars: ["mars-1"],
    secret: ["secret-4"],
    dungeon: ["dungeon-1"],
    cosmos: ["cosmoshub-4"],
    osmo: ["osmosis-1"],
    juno: ["juno-1"],
    akash: ["akashnet-2"],
    swth: ["carbon-1"],
    cheqd: ["cheqd-mainnet-1"],
    sent: ["sentinelhub-2"],
    decentr: ["decentr-mainnet-1"],
    chihuahua: ["chihuahua-1"],
    inj: ["injective-1"],
    kujira: ["kaiyo-1"],
    stars: ["stargaze-1"],
    stride: ["stride-1"],
    noble: ["noble-1"],
    neutron: ["neutron-1"],
    celestia: ["celestia"],
    archway: ["archway-1"],
    axelar: ["axelar-dojo-1"],
    andr: ["andromeda-1"],
    migaloo: ["migaloo-1"],
    sei: ["pacific-1"],
    kava: ["kava_2222-10"],
    cre: ["crescent-1"],
    comdex: ["comdex-1"],
    orai: ["Oraichain"],
    nolus: ["pirin-1"],
    stafi: ["stafihub-1"],
    dydx: ["dydx-mainnet-1"],
    pryzm: ["pryzm-1"],
    xion: ["xion-mainnet-1"]
  };

  var NUMERIC_ADDRESS_ALIASES = { "0": true, "60": true, "118": true, "330": true, "501": true, "529": true, "888": true };

  function unique(list) {
    var seen = {};
    return (Array.isArray(list) ? list : []).filter(function (item) {
      var key = text(item);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function addressPrefixKeys(value) {
    var address = text(value);
    if (/^0x[a-f0-9]{40}$/i.test(address)) return ["ethereum-mainnet"];
    if (/^(bc1|[13])[a-z0-9]{20,90}$/i.test(address)) return ["bitcoin-mainnet"];
    if (/^[1-9A-HJ-NP-Za-km-z]{32,60}$/.test(address) && address.indexOf("1") === -1) return ["solana-mainnet"];
    var match = address.match(/^([a-z][a-z0-9]{1,20})1[ac-hj-np-z02-9]{12,120}$/i);
    if (!match) return [];
    return ADDRESS_PREFIX_KEYS[match[1].toLowerCase()] || [];
  }

  function canonicalAddressKeys(key, value) {
    var raw = text(key);
    var lower = raw.toLowerCase();
    var fromAddress = addressPrefixKeys(value);
    if (lower === "terra" || lower === "330" || lower === "118") return fromAddress;
    if (NUMERIC_ADDRESS_ALIASES[lower] && fromAddress.length) return fromAddress;
    if (ADDRESS_KEY_ALIASES[lower]) return ADDRESS_KEY_ALIASES[lower];
    if (NUMERIC_ADDRESS_ALIASES[lower]) return fromAddress;
    if (fromAddress.length && (!raw || lower === "address")) return fromAddress;
    return raw ? [raw] : fromAddress;
  }

  function addNormalizedAddress(target, key, value) {
    var address = text(value);
    if (!looksLikeAddress(address)) return;
    unique(canonicalAddressKeys(key, address)).forEach(function (chainKey) {
      if (chainKey && !target[chainKey]) target[chainKey] = address;
    });
  }

  function safeJson(key) {
    try {
      var raw = readStorage(key);
      if (!raw || raw.length > MAX_JSON) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function readStorage(key) {
    try {
      if (!window.localStorage) return null;
      return (storageGetItem || window.localStorage.getItem).call(window.localStorage, key);
    } catch (error) {
      return null;
    }
  }

  function removeStorage(key) {
    try {
      if (!window.localStorage) return false;
      (storageRemoveItem || window.localStorage.removeItem).call(window.localStorage, key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function writeJson(key, value) {
    try {
      (storageSetItem || window.localStorage.setItem).call(window.localStorage, key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function looksLikeAddress(value) {
    var raw = text(value);
    if (!raw) return false;
    return (
      /^0x[a-f0-9]{40}$/i.test(raw) ||
      /^(bc1|do1|terra1|secret1|dungeon1|cosmos1|osmo1|akash1|juno1|mars1|inj1|kujira1|stars1|stride1|noble1|neutron1|celestia1|archway1|axelar1|andr1|migaloo1|sei1|kava1|cre1|comdex1|orai1|nolus1|stafi1|dydx1|chihuahua1|pryzm1|xion1|swth1|cheqd1|sent1|decentr1|addr1)[0-9a-z]{12,120}$/i.test(raw) ||
      /^[1-9A-HJ-NP-Za-km-z]{32,60}$/.test(raw)
    );
  }

  function copyAddresses(target, source) {
    if (!isObject(source)) return;
    Object.keys(source).forEach(function (key) {
      var value = text(source[key]);
      if (looksLikeAddress(value)) addNormalizedAddress(target, key, value);
    });
  }

  function snapshotAddressMap(snapshot) {
    if (!isObject(snapshot)) return undefined;
    return isObject(snapshot.allAddresses)
      ? snapshot.allAddresses
      : isObject(snapshot.addressMap)
        ? snapshot.addressMap
        : isObject(snapshot.addresses)
          ? snapshot.addresses
          : undefined;
  }

  function firstAddress(addresses) {
    if (!isObject(addresses)) return "";
    var priority = [
      "Do-Chain",
      "dochain-1",
      "888",
      "columbus-5",
      "dungeon-1",
      "secret-4",
      "phoenix-1",
      "bitcoin-mainnet",
      "ethereum-mainnet",
      "solana-mainnet",
    ];
    for (var i = 0; i < priority.length; i += 1) {
      if (looksLikeAddress(addresses[priority[i]])) return text(addresses[priority[i]]);
    }
    return Object.keys(addresses).map(function (key) { return text(addresses[key]); }).find(looksLikeAddress) || "";
  }

  function addressSignature(addresses) {
    if (!isObject(addresses)) return "";
    return Object.keys(addresses).sort().map(function (key) {
      var value = text(addresses[key]);
      return looksLikeAddress(value) ? text(key).toLowerCase() + "=" + value.toLowerCase() : "";
    }).filter(Boolean).join(",");
  }

  function pickWalletPayload(value) {
    if (!isObject(value)) return null;
    if (isObject(value.wallet)) return value.wallet;
    return value;
  }

  function normalizeWallet(value, extraAddresses, source) {
    var wallet = pickWalletPayload(value);
    if (!isObject(wallet)) return null;

    var addresses = {};
    copyAddresses(addresses, wallet.addresses);
    copyAddresses(addresses, wallet.addressMap);
    copyAddresses(addresses, extraAddresses);
    if (looksLikeAddress(wallet.address)) addNormalizedAddress(addresses, "", wallet.address);

    var address = looksLikeAddress(wallet.address) ? text(wallet.address) : firstAddress(addresses);
    if (!address && !Object.keys(addresses).length) return null;
    var words = {};
    if (isObject(wallet.words)) {
      Object.keys(wallet.words).forEach(function (key) {
        var value = text(wallet.words[key]);
        if (key && value) words[key] = value;
      });
    }
    var doAddress = text(addresses["Do-Chain"] || addresses["dochain-1"]);
    if (!doAddress || !/^do1/i.test(doAddress)) doAddress = /^do1/i.test(address) ? address : "";
    if (doAddress && !words["888"]) words["888"] = doAddress;

    var name =
      text(wallet.name) ||
      text(wallet.walletName) ||
      text(wallet.accountName) ||
      text(wallet.label) ||
      "Do-Wallet";

    var normalized = Object.assign({}, wallet, {
      name: name,
      walletName: name,
      address: address || undefined,
      addresses: addresses,
      addressMap: addresses,
      words: Object.keys(words).length ? words : undefined,
      external: true,
      source: source || text(wallet.source) || "do-wallet-website-session-restore",
      walletSource: text(wallet.walletSource) || "website-session-restore",
      restoredFromWebsiteStorage: true,
      restoredAt: Date.now(),
    });

    Object.keys(normalized).forEach(function (key) {
      if (normalized[key] === undefined || normalized[key] === "") delete normalized[key];
    });
    return normalized;
  }

  function normalizePayloadAddresses(payload) {
    if (!isObject(payload)) return false;
    var wallet = isObject(payload.wallet) ? payload.wallet : payload;
    if (!isObject(wallet)) return false;
    var addresses = {};
    copyAddresses(addresses, wallet.addresses);
    copyAddresses(addresses, wallet.addressMap);
    copyAddresses(addresses, payload.addresses);
    if (looksLikeAddress(wallet.address)) addNormalizedAddress(addresses, "", wallet.address);
    if (!Object.keys(addresses).length) return false;
    var before = JSON.stringify({
      addresses: wallet.addresses || null,
      addressMap: wallet.addressMap || null,
      payloadAddresses: payload.addresses || null
    });
    wallet.addresses = addresses;
    wallet.addressMap = addresses;
    if (payload !== wallet && isObject(payload)) payload.addresses = addresses;
    var fallback = looksLikeAddress(wallet.address) ? text(wallet.address) : firstAddress(addresses);
    wallet.address = fallback || undefined;
    if (payload !== wallet && !payload.address && fallback) payload.address = fallback;
    var after = JSON.stringify({
      addresses: wallet.addresses || null,
      addressMap: wallet.addressMap || null,
      payloadAddresses: payload.addresses || null
    });
    return before !== after;
  }

  function normalizeStoredWalletPayloads() {
    [USER_KEY, BRIDGE_KEY, AUTH_KEY, SELECTED_WALLET_KEY, SNAPSHOT_KEY].forEach(function (key) {
      var payload = safeJson(key);
      if (!payload) return;
      if (normalizePayloadAddresses(payload)) writeJson(key, payload);
    });
  }

  function parseLegacyKeys(raw) {
    if (!raw || raw.length > MAX_JSON) return [];
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (isObject(parsed)) {
        if (Array.isArray(parsed.value)) return parsed.value;
        if (typeof parsed.value === "string") return parseLegacyKeys(parsed.value);
        if (isObject(parsed.value)) return legacyObjectValues(parsed.value);
        if (Array.isArray(parsed.keys)) return parsed.keys;
        if (isObject(parsed.keys)) return legacyObjectValues(parsed.keys);
        if (Array.isArray(parsed.wallets)) return parsed.wallets;
        if (isObject(parsed.wallets)) return legacyObjectValues(parsed.wallets);
        if (Array.isArray(parsed.accounts)) return parsed.accounts;
        if (isObject(parsed.accounts)) return legacyObjectValues(parsed.accounts);
        if (Array.isArray(parsed.items)) return parsed.items;
        if (isObject(parsed.items)) return legacyObjectValues(parsed.items);
        return legacyObjectValues(parsed);
      }
    } catch (error) {}
    return [];
  }

  function legacyObjectValues(value) {
    if (!isObject(value)) return [];
    var metadata = {
      version: true,
      source: true,
      updatedAt: true,
      createdAt: true,
      migratedAt: true,
      selectedAt: true,
      active: true
    };
    return Object.keys(value).map(function (key) {
      if (metadata[key]) return null;
      var item = value[key];
      if (typeof item === "string") {
        try { item = JSON.parse(item); } catch (error) {}
      }
      if (!isObject(item)) return null;
      if (!text(item.name) && !text(item.walletName) && key && !metadata[key]) {
        item = Object.assign({ name: key, walletName: key }, item);
      }
      return item;
    }).filter(Boolean);
  }

  function stripSensitiveWalletFields(wallet) {
    if (!isObject(wallet)) return wallet;
    var cleaned = {};
    var deny = {
      mnemonic: true,
      seed: true,
      seedPhrase: true,
      privateKey: true,
      privkey: true,
      password: true
    };

    Object.keys(wallet).forEach(function (key) {
      if (!deny[key]) cleaned[key] = wallet[key];
    });
    cleaned.external = true;
    cleaned.source = text(cleaned.source) || "do-wallet-legacy-keys-recovery";
    cleaned.walletSource = text(cleaned.walletSource) || "legacy-keys-recovery";
    return cleaned;
  }

  function publishRecoveredWallets(wallets, source, meta) {
    var list = Array.isArray(wallets) ? wallets : [];
    var status = Object.assign({
      source: source || "do-wallet-session-restore",
      recoveredWallets: list.length,
      hasLegacyKeys: Boolean(readStorage(LEGACY_KEYS_KEY)),
      updatedAt: Date.now()
    }, isObject(meta) ? meta : {});
    try {
      window.__DO_WALLET_RECOVERED_WALLETS__ = list;
      window.__DO_WALLET_RECOVERY_STATUS__ = status;
      document.documentElement.setAttribute("data-do-wallet-recovered-wallets", String(list.length));
    } catch (error) {}
  }

  function safeParseRaw(raw) {
    try {
      if (!raw || typeof raw !== "string" || raw.length > MAX_JSON) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function storageLength() {
    try {
      return window.localStorage ? window.localStorage.length : 0;
    } catch (error) {
      return 0;
    }
  }

  function storageKeyAt(index) {
    try {
      if (!window.localStorage) return "";
      return text((storageKey || window.localStorage.key).call(window.localStorage, index));
    } catch (error) {
      return "";
    }
  }

  function walletScanAddresses(value) {
    if (!isObject(value)) return undefined;
    if (isObject(value.allAddresses)) return value.allAddresses;
    if (isObject(value.addressMap)) return value.addressMap;
    if (isObject(value.addresses)) return value.addresses;
    if (isObject(value.wallet)) return walletScanAddresses(value.wallet);
    return undefined;
  }

  function scanWalletContainer(value, add, sourceKey, seenObjects, depth, stats) {
    if (!value || depth > MAX_SCAN_DEPTH || stats.walletCandidates >= MAX_SCAN_WALLETS) return;
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length && i < MAX_SCAN_ARRAY_ITEMS; i += 1) {
        scanWalletContainer(value[i], add, sourceKey, seenObjects, depth + 1, stats);
        if (stats.walletCandidates >= MAX_SCAN_WALLETS) return;
      }
      return;
    }
    if (!isObject(value)) return;
    if (seenObjects.indexOf(value) !== -1) return;
    seenObjects.push(value);

    stats.addAttempts += 1;
    if (add(value, walletScanAddresses(value), "do-wallet-localstorage-scan:" + sourceKey)) stats.walletCandidates += 1;
    if (isObject(value.wallet)) {
      stats.addAttempts += 1;
      if (add(value.wallet, walletScanAddresses(value), "do-wallet-localstorage-scan:" + sourceKey)) stats.walletCandidates += 1;
    }

    if (depth >= MAX_SCAN_DEPTH) return;
    var priority = ["wallet", "wallets", "keys", "accounts", "items", "value", "user", "account", "selected", "selectedWallet", "state", "data"];
    priority.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        var item = value[key];
        if (typeof item === "string" && item.length < MAX_JSON && /^[\[{]/.test(item.trim())) item = safeParseRaw(item);
        scanWalletContainer(item, add, sourceKey, seenObjects, depth + 1, stats);
      }
    });

    Object.keys(value).slice(0, MAX_SCAN_OBJECT_KEYS).forEach(function (key) {
      if (priority.indexOf(key) !== -1) return;
      var item = value[key];
      if (typeof item === "string" && item.length < MAX_JSON && /^[\[{]/.test(item.trim())) item = safeParseRaw(item);
      scanWalletContainer(item, add, sourceKey, seenObjects, depth + 1, stats);
    });
  }

  function scanLocalStorageForWallets(add) {
    var stats = {
      scannedKeys: 0,
      parsedKeys: 0,
      walletCandidates: 0,
      addAttempts: 0
    };
    var length = storageLength();
    for (var index = 0; index < length; index += 1) {
      var key = storageKeyAt(index);
      if (!key || key === RECOVERED_WALLETS_KEY || key === USER_QUARANTINE_KEY || key === LEGACY_KEYS_MARKER_KEY) continue;
      var raw = readStorage(key);
      stats.scannedKeys += 1;
      if (!raw || raw.length > MAX_JSON) continue;
      if (key === LEGACY_KEYS_KEY) {
        parseLegacyKeys(raw).forEach(function (wallet) {
          stats.addAttempts += 1;
          if (add(wallet, wallet && wallet.addresses, "do-wallet-legacy-keys-recovery")) stats.walletCandidates += 1;
        });
        continue;
      }
      var parsed = safeParseRaw(raw);
      if (!parsed) continue;
      stats.parsedKeys += 1;
      scanWalletContainer(parsed, add, key, [], 0, stats);
      if (stats.walletCandidates >= MAX_SCAN_WALLETS) break;
    }
    return stats;
  }

  function collectRecoveredWallets() {
    var found = [];
    var seen = {};
    var scanStats = null;

    function add(value, addresses, source) {
      var normalized = normalizeWallet(value, addresses, source);
      if (!normalized) return false;
      var cleaned = stripSensitiveWalletFields(normalized);
      var fingerprint = walletFingerprint(cleaned);
      if (seen[fingerprint]) return false;
      seen[fingerprint] = true;
      found.push(cleaned);
      return true;
    }

    var selected = safeJson(SELECTED_WALLET_KEY);
    var user = safeJson(USER_KEY);

    parseLegacyKeys(readStorage(LEGACY_KEYS_KEY)).forEach(function (wallet) {
      add(wallet, wallet && wallet.addresses, "do-wallet-legacy-keys-recovery");
    });

    var auth = safeJson(AUTH_KEY);
    var bridge = safeJson(BRIDGE_KEY);
    var snapshot = safeJson(SNAPSHOT_KEY);
    add(user, user && user.addresses, "do-wallet-user-storage-recovery");
    add(selected && selected.wallet, selected && selected.addresses, "do-wallet-selected-wallet-recovery");
    add(auth, auth && auth.addresses, "do-wallet-extension-authority-restore");
    add(bridge, bridge && bridge.addresses, "do-wallet-bridge-restore");
    add(snapshot && snapshot.wallet, snapshotAddressMap(snapshot), "do-wallet-snapshot-restore");

    scanStats = ENABLE_GENERIC_STORAGE_WALLET_SCAN
      ? scanLocalStorageForWallets(add)
      : { scannedKeys: 0, parsedKeys: 0, walletCandidates: 0, addAttempts: 0, disabled: "generic-storage-scan" };
    collectRecoveredWallets.lastScanStats = scanStats;

    return found;
  }

  function walletFingerprint(wallet) {
    if (!isObject(wallet)) return "";
    return [
      text(wallet.name || wallet.walletName).toLowerCase(),
      text(wallet.address).toLowerCase(),
      text(firstAddress(wallet.addresses)).toLowerCase(),
      addressSignature(wallet.addresses || wallet.addressMap),
      wallet.validatorWallet ? "v" : "",
      wallet.adminWallet ? "a" : ""
    ].join("|");
  }

  function mergeRecoveredWallets(nextWallets) {
    var existingPayload = safeJson(RECOVERED_WALLETS_KEY);
    var existingWallets = existingPayload && Array.isArray(existingPayload.wallets) ? existingPayload.wallets : [];
    var merged = [];
    var seen = {};

    function add(wallet) {
      var normalized = normalizeWallet(wallet, wallet && wallet.addresses, text(wallet && wallet.source) || "do-wallet-recovered-wallets-merge");
      if (!normalized) return;
      var cleaned = stripSensitiveWalletFields(normalized);
      var fingerprint = walletFingerprint(cleaned);
      if (!fingerprint || seen[fingerprint]) return;
      seen[fingerprint] = true;
      merged.push(cleaned);
    }

    existingWallets.forEach(add);
    (Array.isArray(nextWallets) ? nextWallets : []).forEach(add);
    return merged;
  }

  function persistRecoveredWallets() {
    if (!shouldRunHere()) return [];
    var wallets = collectRecoveredWallets();
    var scanStats = collectRecoveredWallets.lastScanStats || null;
    wallets = mergeRecoveredWallets(wallets);
    publishRecoveredWallets(wallets, "do-wallet-session-restore", scanStats);
    if (!wallets.length) return [];

    writeJson(RECOVERED_WALLETS_KEY, {
      version: 1,
      source: "do-wallet-session-restore",
      updatedAt: Date.now(),
      wallets: wallets
    });
    writeJson(LEGACY_KEYS_MARKER_KEY, {
      masked: Boolean(readStorage(LEGACY_KEYS_KEY)),
      recoveredWallets: wallets.length,
      updatedAt: Date.now()
    });
    return wallets;
  }

  function installLegacyKeysMask() {
    try {
      var proto = window.Storage && window.Storage.prototype;
      if (!proto || proto.__doWalletLegacyKeysMask20260616) return;

      var originalGetItem = storageGetItem || proto.getItem;
      var originalSetItem = storageSetItem || proto.setItem;
      var originalRemoveItem = storageRemoveItem || proto.removeItem;
      var originalKey = storageKey || proto.key;

      function isGuardedStorage(storage) {
        return storage === window.localStorage;
      }

      function isMaskedKey(key) {
        return String(key || "") === LEGACY_KEYS_KEY;
      }

      function mirrorRecoveredWalletsFromLegacyKeys(value, source) {
        var existing = originalGetItem.call(window.localStorage, RECOVERED_WALLETS_KEY);
        var recovered = parseLegacyKeys(String(value || "")).map(function (wallet) {
          return stripSensitiveWalletFields(normalizeWallet(wallet, wallet && wallet.addresses, source || "do-wallet-legacy-keys-recovery") || wallet);
        }).filter(Boolean);
        if (recovered.length) {
          try {
            var existingPayload = existing ? JSON.parse(existing) : null;
            var existingWallets = existingPayload && Array.isArray(existingPayload.wallets) ? existingPayload.wallets : [];
            var merged = [];
            var seen = {};
            existingWallets.concat(recovered).forEach(function (wallet) {
              var normalized = normalizeWallet(wallet, wallet && wallet.addresses, text(wallet && wallet.source) || "do-wallet-legacy-keys-setitem");
              if (!normalized) return;
              var cleaned = stripSensitiveWalletFields(normalized);
              var fingerprint = walletFingerprint(cleaned);
              if (!fingerprint || seen[fingerprint]) return;
              seen[fingerprint] = true;
              merged.push(cleaned);
            });
            recovered = merged;
          } catch (error) {}
          originalSetItem.call(window.localStorage, RECOVERED_WALLETS_KEY, JSON.stringify({
            version: 1,
            source: source || "do-wallet-legacy-keys-setitem",
            updatedAt: Date.now(),
            wallets: recovered
          }));
        } else if (existing) {
          originalSetItem.call(window.localStorage, RECOVERED_WALLETS_KEY, existing);
        }
      }

      function isUnsafeUserRaw(value) {
        try {
          var user = JSON.parse(String(value || ""));
          if (!isObject(user)) return false;
          var source = (text(user.source) + " " + text(user.walletSource)).toLowerCase();
          var selectedWebsiteUser =
            source.indexOf("selected-browser") !== -1 ||
            source.indexOf("website-selected-recovered-wallet") !== -1 ||
            source.indexOf("local-helper-restore") !== -1 ||
            source.indexOf("manual-debug-wallet-restore") !== -1;
          var restored =
            user.restoredFromWebsiteStorage === true ||
            source.indexOf("session-restore") !== -1 ||
            source.indexOf("recovered-wallets") !== -1 ||
            source.indexOf("bridge-restore") !== -1 ||
            source.indexOf("snapshot-restore") !== -1 ||
            source.indexOf("extension-authority-restore") !== -1;
          var externalLegacyHandoff =
            !selectedWebsiteUser &&
            user.external === true &&
            Boolean(originalGetItem.call(window.localStorage, LEGACY_KEYS_KEY)) &&
            !user.encryptedSeed &&
            !user.lock;
          return (!selectedWebsiteUser && restored) || externalLegacyHandoff;
        } catch (error) {
          return false;
        }
      }

      function quarantineUserRaw(value) {
        try {
          var user = JSON.parse(String(value || ""));
          originalSetItem.call(window.localStorage, USER_QUARANTINE_KEY, JSON.stringify({
            version: 1,
            reason: "blocked-stale-external-user-write",
            updatedAt: Date.now(),
            user: compactQuarantinedUser(user)
          }));
        } catch (error) {}
      }

      Object.defineProperty(proto, "__doWalletLegacyKeysMask20260616", {
        value: true,
        configurable: false,
        enumerable: false
      });

      proto.getItem = function (key) {
        if (isGuardedStorage(this) && isMaskedKey(key)) return originalGetItem.call(this, key);
        if (isGuardedStorage(this) && String(key || "") === USER_KEY) {
          var userRaw = originalGetItem.call(this, key);
          if (isUnsafeUserRaw(userRaw)) {
            quarantineUserRaw(userRaw);
            originalRemoveItem.call(this, key);
            return null;
          }
          return userRaw;
        }
        return originalGetItem.call(this, key);
      };

      proto.setItem = function (key, value) {
        if (isGuardedStorage(this) && String(key || "") === USER_KEY && isUnsafeUserRaw(value)) {
          quarantineUserRaw(value);
          originalRemoveItem.call(this, key);
          return undefined;
        }
        if (isGuardedStorage(this) && isMaskedKey(key)) {
          originalSetItem.call(this, key, value);
          mirrorRecoveredWalletsFromLegacyKeys(value, "do-wallet-legacy-keys-setitem");
          return undefined;
        }
        return originalSetItem.call(this, key, value);
      };

      proto.removeItem = function (key) {
        if (isGuardedStorage(this) && isMaskedKey(key)) {
          try {
            originalSetItem.call(this, "do-wallet-legacy-keys-delete-blocked.v1", JSON.stringify({
              blockedAt: Date.now(),
              reason: "preserve-client-wallet-keys"
            }));
          } catch (error) {}
          return undefined;
        }
        return originalRemoveItem.call(this, key);
      };

      proto.key = function (index) {
        return originalKey.call(this, index);
      };

      try {
        Object.defineProperty(window.localStorage, LEGACY_KEYS_KEY, {
          configurable: true,
          enumerable: false,
          get: function () { return originalGetItem.call(window.localStorage, LEGACY_KEYS_KEY); },
          set: function (value) {
            originalSetItem.call(window.localStorage, LEGACY_KEYS_KEY, String(value || ""));
            mirrorRecoveredWalletsFromLegacyKeys(value, "do-wallet-legacy-keys-property-set");
          }
        });
      } catch (error) {}

      window.__DO_WALLET_LEGACY_KEYS_MASK__ = {
        active: true,
        key: LEGACY_KEYS_KEY,
        recoveredKey: RECOVERED_WALLETS_KEY,
        mode: "preserve-readwrite"
      };
    } catch (error) {
      window.__DO_WALLET_LEGACY_KEYS_MASK__ = {
        active: false,
        error: String(error && error.message || error).slice(0, 160)
      };
    }
  }

  function activeUserIsUsable() {
    var user = safeJson(USER_KEY);
    if (!isObject(user)) return false;
    if (user.external === true && hasSignableLegacyKeys()) return false;
    if (!text(user.name)) return false;
    if (looksLikeAddress(user.address)) return true;
    if (isObject(user.addresses) && firstAddress(user.addresses)) return true;
    return false;
  }

  function isSignableLegacyWallet(wallet) {
    return Boolean(isObject(wallet) && (
      wallet.encryptedSeed ||
      wallet.encrypted ||
      wallet.wallet ||
      wallet.ledger ||
      wallet.multisig
    ));
  }

  function hasSignableLegacyKeys() {
    return parseLegacyKeys(readStorage(LEGACY_KEYS_KEY)).some(isSignableLegacyWallet);
  }

  function localActiveWalletFromLegacyWallet(wallet, source) {
    if (!isSignableLegacyWallet(wallet)) return null;
    var normalized = normalizeWallet(wallet, wallet && wallet.addresses, source || "do-wallet-legacy-keys-local");
    if (!normalized) return null;
    var active = stripSensitiveWalletFields(normalized);
    active.external = false;
    active.source = source || "do-wallet-legacy-keys-local";
    active.walletSource = text(active.walletSource) || "legacy-keys-local";
    return active;
  }

  function quarantineRestoredWebsiteUser() {
    if (!shouldRunHere()) return false;
    var user = safeJson(USER_KEY);
    if (!isObject(user)) return false;
    if (user.external === true && hasSignableLegacyKeys()) {
      writeJson(USER_QUARANTINE_KEY, {
        version: 1,
        reason: "external-user-replaced-by-local-keys",
        updatedAt: Date.now(),
        user: compactQuarantinedUser(user)
      });
      removeStorage(USER_KEY);
      try {
        document.documentElement.setAttribute("data-do-wallet-user-quarantined", "local-keys");
      } catch (error) {}
      return true;
    }
    var source = (text(user.source) + " " + text(user.walletSource)).toLowerCase();
    var selectedWebsiteUser =
      source.indexOf("selected-browser") !== -1 ||
      source.indexOf("website-selected-recovered-wallet") !== -1 ||
      source.indexOf("local-helper-restore") !== -1 ||
      source.indexOf("manual-debug-wallet-restore") !== -1;
    var restored =
      user.restoredFromWebsiteStorage === true ||
      source.indexOf("session-restore") !== -1 ||
      source.indexOf("recovered-wallets") !== -1 ||
      source.indexOf("bridge-restore") !== -1 ||
      source.indexOf("snapshot-restore") !== -1;
    var externalLegacyHandoff =
      !selectedWebsiteUser &&
      user.external === true &&
      Boolean(readStorage(LEGACY_KEYS_KEY)) &&
      !user.encryptedSeed &&
      !user.lock;
    if (selectedWebsiteUser || (!restored && !externalLegacyHandoff)) return false;

    writeJson(USER_QUARANTINE_KEY, {
      version: 1,
      reason: "restored-external-user-freezes-legacy-bundle",
      updatedAt: Date.now(),
      user: compactQuarantinedUser(user)
    });
    removeStorage(USER_KEY);
    try {
      document.documentElement.setAttribute("data-do-wallet-user-quarantined", "true");
      if (!window.sessionStorage.getItem("do-wallet-user-quarantine-reloaded.v1")) {
        window.sessionStorage.setItem("do-wallet-user-quarantine-reloaded.v1", String(Date.now()));
        window.setTimeout(function () {
          window.location.reload();
        }, 80);
      }
    } catch (error) {}
    return true;
  }

  function compactQuarantinedUser(user) {
    var addresses = {};
    var sourceAddresses = isObject(user.addresses) ? user.addresses : {};
    ["Do-Chain", "dochain-1", "888", "do", "dochain", "bitcoin-mainnet", "ethereum-mainnet", "solana-mainnet", "columbus-5", "phoenix-1", "secret-4", "dungeon-1", "dungeon"].forEach(function (key) {
      if (text(sourceAddresses[key])) addresses[key] = text(sourceAddresses[key]);
    });
    return {
      name: text(user.name || user.walletName || "Do-Wallet"),
      walletName: text(user.walletName || user.name || "Do-Wallet"),
      address: text(user.address || firstAddress(sourceAddresses)),
      addresses: addresses,
      external: user.external === true,
      source: text(user.source),
      walletSource: text(user.walletSource),
      restoredFromWebsiteStorage: user.restoredFromWebsiteStorage === true
    };
  }

  function findRecoverableWallet() {
    var auth = safeJson(AUTH_KEY);
    var bridge = safeJson(BRIDGE_KEY);
    var snapshot = safeJson(SNAPSHOT_KEY);
    var candidates = [
      { value: safeJson(SELECTED_WALLET_KEY) && safeJson(SELECTED_WALLET_KEY).wallet, addresses: safeJson(SELECTED_WALLET_KEY) && safeJson(SELECTED_WALLET_KEY).addresses, source: "do-wallet-selected-wallet-restore" },
      { value: auth, addresses: auth && auth.addresses, source: "do-wallet-extension-authority-restore" },
      { value: bridge, addresses: bridge && bridge.addresses, source: "do-wallet-bridge-restore" },
      { value: snapshot && snapshot.wallet, addresses: snapshotAddressMap(snapshot), source: "do-wallet-snapshot-restore" },
      { value: snapshot, addresses: snapshotAddressMap(snapshot), source: "do-wallet-snapshot-restore" },
    ];
    var recovered = safeJson(RECOVERED_WALLETS_KEY);
    if (recovered && Array.isArray(recovered.wallets)) {
      recovered.wallets.forEach(function (wallet) {
        candidates.push({ value: wallet, addresses: wallet && wallet.addresses, source: "do-wallet-recovered-wallet-restore" });
      });
    }

    for (var i = 0; i < candidates.length; i += 1) {
      var item = candidates[i];
      var wallet = normalizeWallet(item.value, item.addresses, item.source);
      if (wallet) return wallet;
    }
    return null;
  }

  function restoreSession() {
    if (!shouldRunHere() || activeUserIsUsable()) return false;
    if (hasSignableLegacyKeys()) return false;
    var wallet = findRecoverableWallet();
    if (!wallet) return false;

    var now = Date.now();
    var activeWallet = Object.assign({}, wallet, {
      external: wallet.external !== false,
      source: "do-wallet-website-session-restore",
      walletSource: text(wallet.walletSource) || "website-selected-recovered-wallet",
      restoredFromWebsiteStorage: true,
      selectedAt: now,
    });
    var payload = {
      source: "do-wallet-website-session-restore",
      wallet: activeWallet,
      addresses: activeWallet.addresses || {},
      updatedAt: now,
    };

    var changed = false;
    writeJson(USER_KEY, activeWallet);
    writeJson(BRIDGE_KEY, payload);
    writeJson(AUTH_KEY, Object.assign({}, payload, { expiresAt: now + 24 * 60 * 60 * 1000 }));
    if (!safeJson(SELECTED_WALLET_KEY)) writeJson(SELECTED_WALLET_KEY, payload);
    changed = true;

    try {
      window.dispatchEvent(new CustomEvent("do_wallet_bridge_update", { detail: payload }));
      window.dispatchEvent(new CustomEvent("do_wallet_session_restored", { detail: payload }));
      document.documentElement.setAttribute("data-do-wallet-session-restored", "active-wallet");
    } catch (error) {}

    return changed;
  }

  function recoveredWalletCount() {
    var payload = safeJson(RECOVERED_WALLETS_KEY);
    if (!payload || !Array.isArray(payload.wallets)) return 0;
    return payload.wallets.filter(function (wallet) {
      return Boolean(normalizeWallet(wallet, wallet && wallet.addresses, "do-wallet-recovered-wallet-count"));
    }).length;
  }

  function restoreFromLocalHelper() {
    if (!shouldRunHere() || !shouldAutoProbeLocalRestoreHelper() || activeUserIsUsable() || recoveredWalletCount()) return;
    try {
      var attemptedAt = Number(window.sessionStorage.getItem(LOCAL_RESTORE_ATTEMPT_KEY) || 0);
      if (attemptedAt && Date.now() - attemptedAt < 30 * 1000) return;
      window.sessionStorage.setItem(LOCAL_RESTORE_ATTEMPT_KEY, String(Date.now()));
    } catch (error) {}

    try {
      fetch(LOCAL_RESTORE_URL, {
        cache: "no-store",
        mode: "cors"
      }).then(function (response) {
        if (!response.ok) throw new Error("local restore unavailable");
        return response.json();
      }).then(function (payload) {
        if (!payload || typeof payload.keys !== "string") return;
        var wallets = parseLegacyKeys(payload.keys);
        if (!wallets.length) return;
        var recovered = Array.isArray(payload.recovered)
          ? payload.recovered.map(function (wallet) {
            return stripSensitiveWalletFields(normalizeWallet(wallet, wallet && wallet.addresses, "do-wallet-local-helper-restore") || wallet);
          }).filter(Boolean)
          : wallets.map(function (wallet) {
            return stripSensitiveWalletFields(normalizeWallet(wallet, wallet && wallet.addresses, "do-wallet-local-helper-restore") || wallet);
          }).filter(Boolean);
        recovered = mergeRecoveredWallets(recovered);
        publishRecoveredWallets(recovered, "do-wallet-local-helper-restore", { localHelper: true });

        try {
          (storageSetItem || window.localStorage.setItem).call(window.localStorage, LEGACY_KEYS_KEY, payload.keys);
          (storageSetItem || window.localStorage.setItem).call(window.localStorage, RECOVERED_WALLETS_KEY, JSON.stringify({
            version: 1,
            source: "do-wallet-local-helper-restore",
            updatedAt: Date.now(),
            wallets: recovered
          }));

          var localLegacyWallet = wallets.find(isSignableLegacyWallet);
          var activeWallet = localActiveWalletFromLegacyWallet(localLegacyWallet, "do-wallet-local-helper-restore") ||
            recovered[0] ||
            stripSensitiveWalletFields(normalizeWallet(wallets[0], wallets[0] && wallets[0].addresses, "do-wallet-local-helper-restore") || wallets[0]);
          if (activeWallet) {
            var now = Date.now();
            activeWallet = Object.assign({}, activeWallet, {
              external: activeWallet.external === false ? false : activeWallet.external !== false,
              source: "do-wallet-local-helper-restore",
              walletSource: text(activeWallet.walletSource) || (activeWallet.external === false ? "legacy-keys-local" : "website-selected-recovered-wallet"),
              restoredFromWebsiteStorage: true,
              selectedAt: now,
            });
            var activePayload = {
              source: "do-wallet-local-helper-restore",
              wallet: activeWallet,
              addresses: activeWallet.addresses || {},
              updatedAt: now,
            };
            writeJson(USER_KEY, activeWallet);
            writeJson(SELECTED_WALLET_KEY, activePayload);
            writeJson(BRIDGE_KEY, activePayload);
            writeJson(AUTH_KEY, Object.assign({}, activePayload, { expiresAt: now + 24 * 60 * 60 * 1000 }));
          }
        } catch (error) {}

        try {
          document.documentElement.setAttribute("data-do-wallet-local-helper-restored", String(recovered.length || wallets.length));
          window.setTimeout(function () {
            window.location.replace("/");
          }, 500);
        } catch (error) {}
      }).catch(function () {});
    } catch (error) {}
  }

  try {
    storageGetItem = window.Storage && window.Storage.prototype && window.Storage.prototype.getItem;
    storageSetItem = window.Storage && window.Storage.prototype && window.Storage.prototype.setItem;
    storageRemoveItem = window.Storage && window.Storage.prototype && window.Storage.prototype.removeItem;
    storageKey = window.Storage && window.Storage.prototype && window.Storage.prototype.key;

    normalizeStoredWalletPayloads();
    persistRecoveredWallets();
    if (quarantineRestoredWebsiteUser()) persistRecoveredWallets();
    installLegacyKeysMask();
    restoreSession();
    restoreFromLocalHelper();
    window.addEventListener("storage", function (event) {
      if (!event.key || event.key === USER_KEY || event.key === BRIDGE_KEY || event.key === AUTH_KEY || event.key === SNAPSHOT_KEY) {
        persistRecoveredWallets();
        restoreSession();
        restoreFromLocalHelper();
      }
    });
  } catch (error) {
    try { document.documentElement.setAttribute("data-do-wallet-session-restore-error", String(error && error.message || error).slice(0, 120)); } catch (innerError) {}
  }
})();
