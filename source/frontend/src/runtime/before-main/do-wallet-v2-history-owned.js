(function () {
  "use strict";

  if (window.__doWalletHistoryOwned20260629) return;
  window.__doWalletHistoryOwned20260629 = true;

  var VERSION = "20260629HistoryOwned3";
  var CACHE_KEY = "do-wallet-history-cache.v1";
  var SELECTED_WALLET_KEY = "do-wallet-selected-recovered-wallet.v1";
  var RECOVERED_WALLETS_KEY = "do-wallet-recovered-wallets.v1";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var STYLE_ID = "do-wallet-history-owned-style";
  var PAGE_ATTR = "data-do-wallet-history-owned-page";
  var SIGNATURE_ATTR = "data-do-wallet-history-owned-signature";
  var CACHE_TTL_MS = 45000;
  var FETCH_TIMEOUT_MS = 5500;
  var MAX_QUERY_TARGETS = 28;
  var MAX_QUERY_TARGETS_PER_CHAIN = 4;
  var renderTimer = 0;
  var routeObserver = null;
  var requestToken = 0;
  var currentRows = [];
  var currentLoading = false;
  var currentError = "";
  var selectedFilter = "all";
  var visibleTargetChains = [];
  var currentTargetKey = "";

  var CHAIN_META = {
    "Do-Chain": { label: "Do Chain", symbol: "DO", icon: "/do-logo.jpg", denom: "udo", priority: 1 },
    "columbus-5": { label: "Terra Classic (LUNC)", symbol: "LUNC", icon: "/img/chains/TerraClassic.svg", denom: "uluna", priority: 2 },
    "osmosis-1": { label: "Osmosis", symbol: "OSMO", icon: "/img/chains/Osmosis.svg", denom: "uosmo", priority: 3 },
    "phoenix-1": { label: "Terra (LUNA)", symbol: "LUNA", icon: "/img/chains/Terra.svg", denom: "uluna", priority: 4 },
    "mars-1": { label: "Mars", symbol: "MARS", icon: "/img/chains/Mars.svg", denom: "umars", priority: 5 },
    "cosmoshub-4": { label: "Cosmos", symbol: "ATOM", icon: "/img/chains/Cosmos.svg", denom: "uatom", priority: 6 },
    "juno-1": { label: "Juno", symbol: "JUNO", icon: "/img/chains/Juno.svg", denom: "ujuno", priority: 7 },
    "akashnet-2": { label: "Akash", symbol: "AKT", icon: "/img/chains/Akash.svg", denom: "uakt", priority: 8 },
    "archway-1": { label: "Archway", symbol: "ARCH", icon: "/img/chains/Archway.png", denom: "aarch", priority: 9 },
    "axelar-dojo-1": { label: "Axelar", symbol: "AXL", icon: "/img/chains/Axelar.svg", denom: "uaxl", priority: 10 },
    "carbon-1": { label: "Carbon", symbol: "SWTH", icon: "/img/chains/Carbon.svg", denom: "swth", priority: 11 },
    "cheqd-mainnet-1": { label: "cheqd", symbol: "CHEQ", icon: "/img/chains/Cheqd.svg", denom: "ncheq", priority: 12 },
    "chihuahua-1": { label: "Chihuahua", symbol: "HUAHUA", icon: "/img/chains/Huahua.png", denom: "uhuahua", priority: 13 },
    "crescent-1": { label: "Crescent", symbol: "CRE", icon: "/img/chains/Crescent.svg", denom: "ucre", priority: 14 },
    "decentr-mainnet-1": { label: "Decentr", symbol: "DEC", icon: "/img/chains/Decentr.svg", denom: "udec", priority: 15 },
    "dungeon-1": { label: "Dungeon Chain", symbol: "DGN", icon: "/img/chains/Dungeon.png", denom: "udgn", priority: 16 },
    "kaiyo-1": { label: "Kujira", symbol: "KUJI", icon: "/img/chains/Kujira.png", denom: "ukuji", priority: 17 },
    "migaloo-1": { label: "Migaloo", symbol: "WHALE", icon: "/img/chains/Migaloo.svg", denom: "uwhale", priority: 18 },
    "pacific-1": { label: "Sei", symbol: "SEI", icon: "/img/chains/sei.svg", denom: "usei", priority: 19 },
    "secret-4": { label: "Secret Network", symbol: "SCRT", icon: "/img/chains/Secret.png", denom: "uscrt", priority: 20 },
    "stafihub-1": { label: "StaFi Hub", symbol: "FIS", icon: "/img/chains/StaFiHub.png", denom: "ufis", priority: 21 },
    "stride-1": { label: "Stride", symbol: "STRD", icon: "/img/chains/Stride.png", denom: "ustrd", priority: 22 },
    "bitcoin-mainnet": { label: "Bitcoin", symbol: "BTC", icon: "/img/chains/Bitcoin.svg", denom: "btc", priority: 30, type: "bitcoin" }
  };

  var PREFIX_TO_CHAIN = {
    do: ["Do-Chain"],
    terra: ["columbus-5", "phoenix-1"],
    osmo: ["osmosis-1"],
    mars: ["mars-1"],
    cosmos: ["cosmoshub-4"],
    juno: ["juno-1"],
    akash: ["akashnet-2"],
    archway: ["archway-1"],
    axelar: ["axelar-dojo-1"],
    swth: ["carbon-1"],
    cheqd: ["cheqd-mainnet-1"],
    chihuahua: ["chihuahua-1"],
    cre: ["crescent-1"],
    decentr: ["decentr-mainnet-1"],
    dungeon: ["dungeon-1"],
    kujira: ["kaiyo-1"],
    whale: ["migaloo-1"],
    sei: ["pacific-1"],
    secret: ["secret-4"],
    stafi: ["stafihub-1"],
    stride: ["stride-1"]
  };

  var DENOM_META = {
    udo: ["DO", 6],
    uluna: ["LUNC", 6],
    uusd: ["UST", 6],
    ukrw: ["KRT", 6],
    umyr: ["MYT", 6],
    uidr: ["IDT", 6],
    uthb: ["THT", 6],
    ujpy: ["JPT", 6],
    ueur: ["EUT", 6],
    ugbp: ["GBT", 6],
    uosmo: ["OSMO", 6],
    uatom: ["ATOM", 6],
    ujuno: ["JUNO", 6],
    uakt: ["AKT", 6],
    umars: ["MARS", 6]
  };

  function chainCatalog() {
    try {
      if (window.doWalletMultichainAssets && typeof window.doWalletMultichainAssets.chains === "function") {
        return window.doWalletMultichainAssets.chains() || {};
      }
    } catch (error) {}
    try {
      if (window.doWalletChainAssets && window.doWalletChainAssets.chains) return window.doWalletChainAssets.chains || {};
    } catch (error) {}
    return {};
  }

  function chainFromCatalog(chainID) {
    var catalog = chainCatalog();
    return catalog[chainID] || catalog[clean(chainID)] || null;
  }

  function metaForChain(chainID) {
    chainID = clean(chainID);
    var staticMeta = CHAIN_META[chainID];
    if (staticMeta) return staticMeta;
    var chain = chainFromCatalog(chainID);
    if (!chain) return null;
    return {
      label: clean(chain.name || chain.prettyName || chain.label || chainID),
      symbol: clean(chain.symbol || chain.token || chain.baseAsset || chain.denom || ""),
      icon: clean(chain.icon || chain.logo || chain.image || ""),
      denom: clean(chain.baseAsset || chain.denom || ""),
      priority: 100 + Object.keys(CHAIN_META).length
    };
  }

  function chainPriority(chainID) {
    var meta = metaForChain(chainID) || {};
    return Number(meta.priority || 999);
  }

  function knownPrefixChains(prefix) {
    prefix = lower(prefix);
    var out = (PREFIX_TO_CHAIN[prefix] || []).slice();
    var catalog = chainCatalog();
    Object.keys(catalog).forEach(function (chainID) {
      var chain = catalog[chainID] || {};
      if (lower(chain.prefix || chain.bech32Prefix || chain.addressPrefix) === prefix && out.indexOf(chainID) < 0) out.push(chainID);
    });
    return out.filter(function (chainID) { return Boolean(metaForChain(chainID)); });
  }

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function escapeHTML(value) {
    return clean(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  function routeIsHistory() {
    return (window.location.pathname || "").replace(/\/+$/, "").toLowerCase() === "/history";
  }

  function updateRouteBootFlag() {
    if (!document.documentElement) return;
    if (routeIsHistory()) document.documentElement.setAttribute("data-do-wallet-history-route", "1");
    else document.documentElement.removeAttribute("data-do-wallet-history-route");
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function walletName(wallet) {
    wallet = walletFromPayload(wallet) || wallet;
    return isObject(wallet) ? clean(wallet.name || wallet.walletName || wallet.label || wallet.accountName || wallet.id) : "";
  }

  function forEachAddressIdentity(container, callback) {
    function emit(chainID, address) {
      address = clean(address);
      if (!address || address === "[object Object]") return;
      callback(clean(chainID), address);
    }
    function scan(node, hint, depth) {
      if (depth > 5 || node === null || node === undefined) return;
      if (typeof node === "string") {
        emit(hint, node);
        return;
      }
      if (Array.isArray(node)) {
        node.slice(0, 150).forEach(function (item) { scan(item, hint, depth + 1); });
        return;
      }
      if (!isObject(node)) return;
      if (typeof node.address === "string" || typeof node.walletAddress === "string" || typeof node.publicAddress === "string") {
        emit(node.chainID || node.chainId || node.network || node.chain || hint, node.address || node.walletAddress || node.publicAddress);
      }
      Object.keys(node).slice(0, 150).forEach(function (key) {
        if (/mnemonic|seed|private|password|secret|cipher|encrypted/i.test(key)) return;
        scan(node[key], key, depth + 1);
      });
    }
    scan(container, "", 0);
  }

  function walletIdentityKeys(wallet) {
    wallet = walletFromPayload(wallet) || wallet;
    if (!isObject(wallet)) return [];
    var keys = [];
    function add(value) {
      value = lower(value);
      if (value && keys.indexOf(value) < 0) keys.push(value);
    }
    add(wallet.id);
    add(wallet.name);
    add(wallet.walletName);
    add(wallet.label);
    add(wallet.accountName);
    add(wallet.address);
    [
      wallet.addresses,
      wallet.addressMap,
      wallet.activeAddresses,
      wallet.allAddresses,
      wallet.publicAddresses,
      wallet.addressesByChain,
      wallet.allAddressesByChain
    ].forEach(function (container) {
      forEachAddressIdentity(container, function (chainID, address) {
        add(address);
        if (chainID) add(chainID + ":" + address);
      });
    });
    return keys;
  }

  function activeWallet() {
    var selected = walletFromPayload(readJSON(SELECTED_WALLET_KEY, null));
    if (selected) return selected;
    var user = walletFromPayload(readJSON("user", null));
    if (user) return user;
    var bridge = walletFromPayload(readJSON("do-wallet-bridge-wallet", null));
    if (bridge) return bridge;
    var auth = walletFromPayload(readJSON("do-wallet-extension-authority.v1", null));
    if (auth) return auth;
    var recovered = readJSON(RECOVERED_WALLETS_KEY, []);
    return Array.isArray(recovered) ? recovered.map(walletFromPayload).filter(Boolean)[0] || null : null;
  }

  function activeWalletKeys() {
    return walletIdentityKeys(activeWallet());
  }

  function snapshotKeys(snapshot) {
    if (!isObject(snapshot)) return [];
    var keys = walletIdentityKeys(snapshot.wallet || snapshot);
    if (snapshot.walletKey) keys.push(lower(snapshot.walletKey));
    [
      snapshot.addresses,
      snapshot.activeAddresses,
      snapshot.allAddresses,
      snapshot.publicAddresses,
      snapshot.addressesByChain,
      snapshot.allAddressesByChain
    ].forEach(function (container) {
      forEachAddressIdentity(container, function (chainID, address) {
        if (chainID) keys.push(lower(chainID + ":" + address));
        keys.push(lower(address));
      });
    });
    return keys.filter(Boolean).filter(function (key, index, list) {
      return list.indexOf(key) === index;
    });
  }

  function snapshotMatchesActiveWallet(snapshot, activeKeys) {
    if (!activeKeys.length) return true;
    var keys = snapshotKeys(snapshot);
    if (!keys.length) return false;
    return keys.some(function (key) { return activeKeys.indexOf(key) >= 0; });
  }

  function collectSnapshots() {
    var out = [];
    var seen = Object.create(null);
    var activeKeys = activeWalletKeys();
    function add(snapshot) {
      if (!isObject(snapshot) || !snapshotMatchesActiveWallet(snapshot, activeKeys)) return;
      var key = clean(snapshot.updatedAt || "") + ":" + snapshotKeys(snapshot).join("|");
      if (seen[key]) return;
      seen[key] = true;
      out.push(snapshot);
    }
    add(readJSON(SNAPSHOT_KEY, null));
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (isObject(byWallet)) Object.keys(byWallet).forEach(function (key) { add(byWallet[key]); });
    return out;
  }

  function isPublicAddress(value) {
    value = clean(value);
    return /^[a-z][a-z0-9]{1,18}1[023456789acdefghjklmnpqrstuvwxyz]{20,100}$/i.test(value) ||
      /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/i.test(value);
  }

  function chainHintToID(hint) {
    var key = lower(hint).replace(/[_\s]+/g, "-");
    if (CHAIN_META[hint]) return hint;
    if (CHAIN_META[key]) return key;
    if (chainFromCatalog(hint)) return clean(hint);
    if (chainFromCatalog(key)) return key;
    if (/do/.test(key)) return "Do-Chain";
    if (/columbus|lunc|terra-classic/.test(key)) return "columbus-5";
    if (/phoenix|luna/.test(key)) return "phoenix-1";
    if (/osmo/.test(key)) return "osmosis-1";
    if (/mars/.test(key)) return "mars-1";
    if (/bitcoin|btc/.test(key)) return "bitcoin-mainnet";
    return "";
  }

  function chainsForAddress(address, hint) {
    address = clean(address);
    var hinted = chainHintToID(hint);
    if (hinted) return [hinted];
    if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/i.test(address)) return ["bitcoin-mainnet"];
    var match = address.match(/^([a-z]+)1/i);
    if (!match) return [];
    return knownPrefixChains(match[1]);
  }

  function collectAddressMap(map, source, score, out) {
    if (Array.isArray(map)) {
      map.forEach(function (entry) {
        if (typeof entry === "string") addAddress(entry, "", source, score, out);
        else if (isObject(entry)) addAddress(entry.address || entry.walletAddress || entry.publicAddress, entry.chainID || entry.chainId || entry.network || entry.chain, source, score, out);
      });
      return;
    }
    if (!isObject(map)) return;
    Object.keys(map).forEach(function (key) {
      var value = map[key];
      if (Array.isArray(value)) {
        value.forEach(function (item) { addAddress(isObject(item) ? item.address || item.walletAddress : item, key, source, score, out); });
      } else if (isObject(value)) {
        addAddress(value.address || value.walletAddress || value.publicAddress, value.chainID || value.chainId || value.network || key, source, score, out);
      } else {
        addAddress(value, key, source, score, out);
      }
    });
  }

  function addAddress(address, hint, source, score, out) {
    address = clean(address);
    if (!isPublicAddress(address)) return;
    chainsForAddress(address, hint).forEach(function (chainID) {
      if (!metaForChain(chainID)) return;
      var key = chainID + "|" + address;
      var existing = out[key];
      if (!existing || existing.score < score) {
        out[key] = { chainID: chainID, address: address, source: source, score: score };
      }
    });
  }

  function scanForAddresses(value, hint, source, score, out, depth) {
    if (depth > 6 || value == null) return;
    if (typeof value === "string") {
      var regex = /\b([a-z][a-z0-9]{1,18}1[023456789acdefghjklmnpqrstuvwxyz]{20,100}|(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90})\b/gi;
      var match;
      while ((match = regex.exec(value))) addAddress(match[1], hint, source, score, out);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (entry) { scanForAddresses(entry, hint, source, score, out, depth + 1); });
      return;
    }
    if (!isObject(value)) return;
    Object.keys(value).forEach(function (key) {
      var nextHint = chainHintToID(key) || hint;
      scanForAddresses(value[key], nextHint, source, score, out, depth + 1);
    });
  }

  function collectHistoryTargets() {
    var out = Object.create(null);
    var wallet = activeWallet();
    var activeName = lower(walletName(wallet));

    function scanTrustedContainer(container, source, score) {
      collectAddressMap(container && container.addresses, source, score, out);
      collectAddressMap(container && container.addressMap, source, score, out);
      collectAddressMap(container && container.activeAddresses, source, score, out);
      collectAddressMap(container && container.allAddresses, source, score, out);
      collectAddressMap(container && container.publicAddresses, source, score, out);
      collectAddressMap(container && container.addressesByChain, source, score, out);
      collectAddressMap(container && container.allAddressesByChain, source, score, out);
      scanForAddresses(container, "", source, Math.max(1, score - 8), out, 0);
    }

    [wallet, readJSON("user", null), readJSON("do-wallet-bridge-wallet", null), readJSON("do-wallet-extension-authority.v1", null)].forEach(function (payload) {
      var item = walletFromPayload(payload) || payload;
      if (!isObject(item)) return;
      addAddress(item.address, "", "active-wallet", 100, out);
      scanTrustedContainer(item, "active-wallet", 100);
    });

    var recovered = readJSON(RECOVERED_WALLETS_KEY, []);
    if (Array.isArray(recovered)) {
      recovered.forEach(function (payload) {
        var item = walletFromPayload(payload) || payload;
        if (!isObject(item)) return;
        var nameMatches = activeName && lower(walletName(item)) === activeName;
        scanTrustedContainer(item, "recovered-wallet", nameMatches ? 90 : 45);
      });
    }

    collectSnapshots().forEach(function (snapshot) {
      scanTrustedContainer(snapshot.wallet || snapshot, "portfolio-snapshot-wallet", 96);
      scanTrustedContainer(snapshot, "portfolio-snapshot", 95);
      [
        "assets",
        "portfolioAssets",
        "flatPortfolioAssets",
        "rawPortfolioAssets",
        "sourcePortfolioAssets",
        "spendableAssets",
        "flatSpendableAssets",
        "rawSpendableAssets",
        "sourceSpendableAssets",
        "staking",
        "stakingAssets",
        "flatStakingAssets",
        "sourceStakingAssets",
        "validators",
        "unbonding"
      ].forEach(function (key) {
        if (Array.isArray(snapshot[key])) scanForAddresses(snapshot[key], "", "portfolio-assets", 70, out, 0);
      });
    });

    var trustedKeys = [
      SELECTED_WALLET_KEY,
      RECOVERED_WALLETS_KEY,
      SNAPSHOT_KEY,
      SNAPSHOTS_BY_WALLET_KEY,
      "do-wallet-bridge-wallet",
      "do-wallet-extension-authority.v1",
      "user",
      "wallet",
      "wallets",
      "keys"
    ];
    try {
      trustedKeys.forEach(function (key) {
        var raw = window.localStorage.getItem(key);
        if (!raw || raw.length > 250000) return;
        if (!/[a-z][a-z0-9]{1,18}1[023456789acdefghjklmnpqrstuvwxyz]{20,100}|(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}/i.test(raw)) return;
        var parsed;
        try { parsed = JSON.parse(raw); } catch (error) { parsed = raw; }
        scanForAddresses(parsed, chainHintToID(key), "trusted-storage", 30, out, 0);
      });
    } catch (error) {}

    var ordered = Object.keys(out).map(function (key) { return out[key]; }).sort(function (left, right) {
      return chainPriority(left.chainID) - chainPriority(right.chainID) || right.score - left.score || left.address.localeCompare(right.address);
    });
    var perChain = Object.create(null);
    var selected = [];
    ordered.forEach(function (target) {
      perChain[target.chainID] = perChain[target.chainID] || 0;
      if (perChain[target.chainID] >= MAX_QUERY_TARGETS_PER_CHAIN) return;
      if (selected.length >= MAX_QUERY_TARGETS) return;
      perChain[target.chainID] += 1;
      selected.push(target);
    });
    visibleTargetChains = ordered.reduce(function (chains, target) {
      if (chains.indexOf(target.chainID) < 0) chains.push(target.chainID);
      return chains;
    }, []);
    return selected;
  }

  function formatAmount(amountText, fallbackSymbol) {
    amountText = clean(amountText);
    var match = amountText.match(/^([0-9]+(?:\.[0-9]+)?)([a-zA-Z/][a-zA-Z0-9/:._-]*)$/);
    if (!match) return amountText;
    var rawAmount = Number(match[1]);
    var denom = match[2];
    var meta = DENOM_META[denom] || [fallbackSymbol || denom.toUpperCase(), 6];
    var amount = rawAmount / Math.pow(10, meta[1]);
    var digits = amount >= 100 ? 2 : amount >= 1 ? 4 : 6;
    return amount.toLocaleString(undefined, { maximumFractionDigits: digits }) + " " + meta[0];
  }

  function eventAttributes(tx, type) {
    var events = Array.isArray(tx && tx.events) ? tx.events : [];
    var event = events.find(function (entry) { return lower(entry.type) === lower(type); });
    var attrs = {};
    if (!event || !Array.isArray(event.attributes)) return attrs;
    event.attributes.forEach(function (attr) {
      attrs[clean(attr.key)] = clean(attr.value);
    });
    return attrs;
  }

  function firstMessageType(tx) {
    var messages = tx && tx.tx && tx.tx.body && Array.isArray(tx.tx.body.messages) ? tx.tx.body.messages : [];
    var type = clean(messages[0] && (messages[0]["@type"] || messages[0].typeUrl || messages[0].type));
    if (!type) return "";
    return type.split(".").pop().replace(/^Msg/, "");
  }

  function txTitle(tx, direction) {
    var type = firstMessageType(tx);
    if (/Delegate$/i.test(type)) return "Delegated";
    if (/Undelegate/i.test(type)) return "Undelegated";
    if (/Redelegate/i.test(type)) return "Redelegated";
    if (/Withdraw|Reward/i.test(type)) return "Claimed rewards";
    if (/Send|Transfer/i.test(type)) return direction === "in" ? "Received" : "Sent";
    return type || (direction === "in" ? "Received" : "Transaction");
  }

  function txAmount(tx, direction, symbol) {
    var transfer = eventAttributes(tx, "transfer");
    var coinSpent = eventAttributes(tx, "coin_spent");
    var coinReceived = eventAttributes(tx, "coin_received");
    var raw = direction === "in"
      ? (transfer.amount || coinReceived.amount)
      : (coinSpent.amount || transfer.amount || coinReceived.amount);
    if (!raw) return "";
    return raw.split(",").map(function (part) { return formatAmount(part, symbol); }).filter(Boolean).slice(0, 2).join(", ");
  }

  function normalizeTx(chainID, address, tx, direction) {
    var meta = metaForChain(chainID) || {};
    var hash = clean(tx && (tx.txhash || tx.hash || tx.txHash));
    if (!hash) return null;
    var timestamp = clean(tx.timestamp || tx.time || "");
    return {
      chainID: chainID,
      chainLabel: meta.label || chainID,
      icon: meta.icon || "",
      address: address,
      hash: hash,
      height: clean(tx.height || ""),
      timestamp: timestamp,
      title: txTitle(tx, direction),
      amount: txAmount(tx, direction, meta.symbol),
      ok: Number(tx.code || 0) === 0
    };
  }

  function fetchJSON(url, timeoutMs) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeout = controller ? window.setTimeout(function () { controller.abort(); }, timeoutMs) : 0;
    return window.fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller && controller.signal
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).finally(function () {
      if (timeout) window.clearTimeout(timeout);
    });
  }

  function txSearchUrl(chainID, address, eventName) {
    var event = eventName + "='" + address + "'";
    var params = new URLSearchParams();
    params.set("events", event);
    params.set("pagination.limit", "10");
    params.set("order_by", "ORDER_BY_DESC");
    return "/station-assets/api/lcd/" + encodeURIComponent(chainID) + "/cosmos/tx/v1beta1/txs?" + params.toString();
  }

  function fetchTargetRows(target) {
    var meta = metaForChain(target.chainID) || {};
    if (meta.type === "bitcoin") {
      return fetchJSON("/station-assets/api/address/" + encodeURIComponent(target.address) + "/txs", FETCH_TIMEOUT_MS)
        .then(function (txs) {
          return (Array.isArray(txs) ? txs : []).slice(0, 12).map(function (tx) {
            return {
              chainID: target.chainID,
              chainLabel: meta.label,
              icon: meta.icon,
              address: target.address,
              hash: clean(tx.txid || tx.hash),
              height: clean(tx.status && tx.status.block_height),
              timestamp: tx.status && tx.status.block_time ? new Date(tx.status.block_time * 1000).toISOString() : "",
              title: "Bitcoin transaction",
              amount: "",
              ok: true
            };
          }).filter(function (row) { return row.hash; });
        }).catch(function () { return []; });
    }

    var requests = [
      { event: "message.sender", direction: "out" },
      { event: "transfer.recipient", direction: "in" },
      { event: "coin_spent.spender", direction: "out" },
      { event: "coin_received.receiver", direction: "in" }
    ].map(function (query) {
      return fetchJSON(txSearchUrl(target.chainID, target.address, query.event), FETCH_TIMEOUT_MS)
        .then(function (payload) {
          var txs = Array.isArray(payload && payload.tx_responses) ? payload.tx_responses : [];
          return txs.map(function (tx) { return normalizeTx(target.chainID, target.address, tx, query.direction); }).filter(Boolean);
        }).catch(function () { return []; });
    });
    return Promise.all(requests).then(function (groups) {
      return groups.reduce(function (all, rows) { return all.concat(rows); }, []);
    });
  }

  function loadHistoryRows(force) {
    var targets = collectHistoryTargets();
    var key = targets.map(function (target) { return target.chainID + ":" + target.address; }).join("|");
    currentTargetKey = key;
    if (!key) {
      currentRows = [];
      currentLoading = false;
      currentError = "No wallet addresses were found for this wallet.";
      scheduleRender(0);
      return;
    }

    var cached = readJSON(CACHE_KEY, null);
    if (cached && cached.version === VERSION && cached.key === key && Array.isArray(cached.rows)) {
      currentRows = cached.rows;
      currentError = "";
      scheduleRender(0);
      if (!force && Date.now() - Number(cached.updatedAt || 0) < CACHE_TTL_MS) {
        currentLoading = false;
        scheduleRender(0);
        return;
      }
    }
    if (!force && currentLoading && currentTargetKey === key) return;
    if (!force && cached && cached.version === VERSION && cached.key === key && Date.now() - Number(cached.updatedAt || 0) < CACHE_TTL_MS && Array.isArray(cached.rows)) {
      currentRows = cached.rows;
      currentLoading = false;
      currentError = "";
      scheduleRender(0);
      return;
    }

    var token = ++requestToken;
    currentLoading = true;
    currentError = "";
    scheduleRender(0);

    var queue = targets.slice();
    var allRows = [];
    var workers = [0, 1, 2].map(function () {
      return new Promise(function (resolve) {
        function next() {
          var target = queue.shift();
          if (!target) return resolve();
          fetchTargetRows(target).then(function (rows) {
            allRows = allRows.concat(rows);
          }).finally(next);
        }
        next();
      });
    });

    Promise.all(workers).then(function () {
      if (token !== requestToken) return;
      var seen = Object.create(null);
      currentRows = allRows.filter(function (row) {
        var id = row.chainID + ":" + row.hash;
        if (seen[id]) return false;
        seen[id] = true;
        return true;
      }).sort(function (left, right) {
        return Date.parse(right.timestamp || 0) - Date.parse(left.timestamp || 0) || Number(right.height || 0) - Number(left.height || 0);
      }).slice(0, 80);
      currentLoading = false;
      currentError = "";
      writeJSON(CACHE_KEY, { version: VERSION, key: key, updatedAt: Date.now(), rows: currentRows });
      scheduleRender(0);
    }).catch(function (error) {
      if (token !== requestToken) return;
      currentLoading = false;
      currentError = clean(error && error.message) || "History could not be loaded.";
      scheduleRender(0);
    });
  }

  function dateText(value) {
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function shortHash(hash) {
    hash = clean(hash);
    return hash.length > 18 ? hash.slice(0, 10) + "..." + hash.slice(-8) : hash;
  }

  function chainsForRows(rows) {
    var chains = {};
    rows.forEach(function (row) {
      chains[row.chainID] = { chainID: row.chainID, label: row.chainLabel, icon: row.icon };
    });
    visibleTargetChains.forEach(function (chainID) {
      var meta = metaForChain(chainID) || {};
      if (!chains[chainID]) chains[chainID] = { chainID: chainID, label: meta.label || chainID, icon: meta.icon || "" };
    });
    return Object.keys(chains).map(function (key) { return chains[key]; }).sort(function (left, right) {
      return chainPriority(left.chainID) - chainPriority(right.chainID);
    });
  }

  function renderIcon(src, label) {
    return src
      ? '<img class="do-wallet-history-icon" src="' + escapeHTML(src) + '" alt="">'
      : '<span class="do-wallet-history-icon do-wallet-history-icon-fallback">' + escapeHTML((label || "?").slice(0, 2).toUpperCase()) + "</span>";
  }

  function chipHTML(chain, active) {
    return '<button type="button" class="do-wallet-history-chip' + (active ? " is-active" : "") + '" data-do-wallet-history-filter="' + escapeHTML(chain.chainID) + '">' +
      (chain.icon ? '<img src="' + escapeHTML(chain.icon) + '" alt="">' : "") +
      '<span>' + escapeHTML(chain.label) + "</span></button>";
  }

  function rowHTML(row) {
    var status = row.ok ? "" : '<span class="do-wallet-history-status is-failed">Failed</span>';
    return '<a class="do-wallet-history-row" href="#" data-do-wallet-history-hash="' + escapeHTML(row.hash) + '">' +
      '  <span class="do-wallet-history-left">' + renderIcon(row.icon, row.chainLabel) +
      '    <span class="do-wallet-history-meta"><strong>' + escapeHTML(row.title) + status + '</strong><small>' + escapeHTML(row.chainLabel) + (row.height ? " - #" + escapeHTML(row.height) : "") + '</small></span>' +
      '  </span>' +
      '  <span class="do-wallet-history-right"><strong>' + escapeHTML(row.amount || shortHash(row.hash)) + '</strong><small>' + escapeHTML(dateText(row.timestamp) || shortHash(row.hash)) + '</small></span>' +
      '</a>';
  }

  function statusHTML() {
    if (currentLoading) {
      return '<div class="do-wallet-history-empty"><strong>Loading history...</strong><small>Checking the wallet addresses and legacy paths stored for this wallet.</small></div>';
    }
    if (currentError) {
      return '<div class="do-wallet-history-empty"><strong>' + escapeHTML(currentError) + '</strong><small>Open Receive or Dashboard once if this is a newly imported wallet.</small></div>';
    }
    return '<div class="do-wallet-history-empty"><strong>No results found</strong><small>No transactions were returned for the selected wallet addresses.</small></div>';
  }

  function renderPage(host) {
    var rows = selectedFilter === "all" ? currentRows : currentRows.filter(function (row) { return row.chainID === selectedFilter; });
    var chains = chainsForRows(currentRows);
    if (selectedFilter !== "all" && !chains.some(function (chain) { return chain.chainID === selectedFilter; })) selectedFilter = "all";
    var visibleChips = chains.slice(0, 6);
    var moreCount = Math.max(0, chains.length - visibleChips.length);
    var signature = VERSION + "|" + currentTargetKey + "|" + selectedFilter + "|" + currentLoading + "|" + currentError + "|" + currentRows.map(function (row) { return row.chainID + row.hash; }).join(",");
    if (host.getAttribute(SIGNATURE_ATTR) === signature) return;
    host.setAttribute(PAGE_ATTR, "1");
    host.setAttribute(SIGNATURE_ATTR, signature);
    host.innerHTML = [
      '<section class="do-wallet-history-page">',
      '  <div class="do-wallet-history-head">',
      '    <h1>History</h1>',
      '    <button type="button" class="do-wallet-history-refresh" data-do-wallet-history-refresh="1">Refresh</button>',
      '  </div>',
      '  <div class="do-wallet-history-filters">',
      '    <button type="button" class="do-wallet-history-chip' + (selectedFilter === "all" ? " is-active" : "") + '" data-do-wallet-history-filter="all">All</button>',
      visibleChips.map(function (chain) { return chipHTML(chain, selectedFilter === chain.chainID); }).join(""),
      moreCount ? '<span class="do-wallet-history-more">+ ' + moreCount + '</span>' : "",
      '  </div>',
      '  <div class="do-wallet-history-card">',
      rows.length ? rows.map(rowHTML).join("") : statusHTML(),
      '  </div>',
      '</section>'
    ].join("");
  }

  function findPageHost() {
    var owned = document.querySelector("[" + PAGE_ATTR + "='1']");
    if (owned) return owned;
    var headings = Array.prototype.slice.call(document.querySelectorAll("h1,h2")).filter(function (heading) {
      return /^History$/i.test(clean(heading.textContent));
    });
    for (var h = 0; h < headings.length; h += 1) {
      var node = headings[h].parentElement;
      var best = null;
      for (var depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
        var content = clean(node.textContent);
        var className = clean(node.className || "");
        if (!content || /Portfolio value|Connect your wallet/i.test(content) || /Dashboard\s+Quarantine\s+Swap\s+Burn DO\s+History\s+Markets/i.test(content)) continue;
        if (/Layout_main|Layout_maincontainer|Layout_layout/i.test(className)) continue;
        var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { width: 0, height: 0 };
        if (node.tagName === "ARTICLE" || /Page_page/i.test(className)) return node;
        if (rect.width > 500 && rect.height > 120) best = node;
      }
      if (best) return best;
    }
    var page = document.querySelector("main article[class*='Page_page__'],[class*='Page_page__']");
    if (page && !/Portfolio value|Connect your wallet/i.test(clean(page.textContent))) return page;
    return null;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "html[data-do-wallet-history-route='1'] main article[class*='Page_page__']:not([" + PAGE_ATTR + "='1']){opacity:0!important;visibility:hidden!important;pointer-events:none!important;}",
      "html[data-do-wallet-history-route='1'] [class*='Page_page__']:not([" + PAGE_ATTR + "='1']){opacity:0!important;visibility:hidden!important;pointer-events:none!important;}",
      "[" + PAGE_ATTR + "='1']{box-sizing:border-box;width:100%;min-height:calc(100vh - 90px);padding:46px 6vw 72px;color:#fff;overflow:visible!important;}",
      ".do-wallet-history-page{width:min(1080px,100%);display:flex;flex-direction:column;gap:24px;font-family:inherit;}",
      ".do-wallet-history-head{display:flex;align-items:center;justify-content:space-between;gap:16px;}",
      ".do-wallet-history-head h1{margin:0;font-size:36px;line-height:1.1;font-weight:var(--do-wallet-l1-font-weight,700);letter-spacing:0;}",
      ".do-wallet-history-refresh{border:0;border-radius:999px;background:#9d3df8;color:#fff;font:inherit;font-weight:var(--do-wallet-l1-font-weight,700);padding:11px 20px;cursor:pointer;}",
      ".do-wallet-history-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}",
      ".do-wallet-history-chip{height:30px;display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(140,61,199,.5);border-radius:999px;background:transparent;color:#bdb2d1;padding:0 16px;font:inherit;font-size:13px;font-weight:var(--do-wallet-l1-font-weight,700);cursor:pointer;}",
      ".do-wallet-history-chip img{width:18px;height:18px;border-radius:50%;object-fit:cover;}",
      ".do-wallet-history-chip.is-active{background:#9d3df8;border-color:#9d3df8;color:#fff;}",
      ".do-wallet-history-more{height:30px;display:inline-flex;align-items:center;border:1px solid rgba(140,61,199,.5);border-radius:999px;color:#bdb2d1;padding:0 16px;font-size:13px;font-weight:var(--do-wallet-l1-font-weight,700);}",
      ".do-wallet-history-card{border:1px solid rgba(140,61,199,.55);border-radius:8px;background:#171120;min-height:190px;overflow:hidden;}",
      ".do-wallet-history-row{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:76px;padding:14px 20px;color:#fff;text-decoration:none;border-bottom:1px solid rgba(135,57,190,.28);}",
      ".do-wallet-history-row:last-child{border-bottom:0;}",
      ".do-wallet-history-row:hover,.do-wallet-history-row:focus-visible{background:rgba(163,60,255,.08);outline:0;}",
      ".do-wallet-history-left{display:flex;align-items:center;gap:14px;min-width:0;}",
      ".do-wallet-history-right{display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:160px;text-align:right;}",
      ".do-wallet-history-icon{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:#2c2140;}",
      ".do-wallet-history-icon-fallback{display:grid;place-items:center;font-size:11px;color:#fff;}",
      ".do-wallet-history-meta{display:flex;flex-direction:column;gap:5px;min-width:0;}",
      ".do-wallet-history-meta strong,.do-wallet-history-right strong{font-size:15px;line-height:1.1;font-weight:var(--do-wallet-l1-font-weight,700);letter-spacing:0;}",
      ".do-wallet-history-meta small,.do-wallet-history-right small{font-size:12px;color:#c6bbed;line-height:1.1;font-weight:var(--do-wallet-l1-font-weight,700);}",
      ".do-wallet-history-status{display:inline-flex;margin-left:8px;color:#00c68f;font-size:11px;}",
      ".do-wallet-history-status.is-failed{color:#ff4b55;}",
      ".do-wallet-history-empty{min-height:190px;display:grid;place-items:center;text-align:center;color:#fff;padding:28px;}",
      ".do-wallet-history-empty strong{display:block;font-size:15px;font-weight:var(--do-wallet-l1-font-weight,700);}",
      ".do-wallet-history-empty small{display:block;margin-top:8px;color:#c6bbed;font-size:12px;font-weight:var(--do-wallet-l1-font-weight,700);}",
      "@media(max-width:760px){[" + PAGE_ATTR + "='1']{padding:26px 18px 80px}.do-wallet-history-head h1{font-size:30px}.do-wallet-history-refresh{padding:9px 14px}.do-wallet-history-row{padding:12px;gap:10px}.do-wallet-history-right{min-width:106px}.do-wallet-history-meta strong,.do-wallet-history-right strong{font-size:14px}.do-wallet-history-meta small,.do-wallet-history-right small{font-size:11px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function scheduleRender(delay) {
    if (renderTimer) window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(function () {
      renderTimer = 0;
      if (!routeIsHistory()) return;
      installStyles();
      var host = findPageHost();
      if (host) renderPage(host);
    }, delay == null ? 120 : delay);
  }

  function watchRouteHost() {
    if (!routeIsHistory()) {
      if (routeObserver) {
        routeObserver.disconnect();
        routeObserver = null;
      }
      return;
    }
    if (routeObserver || typeof MutationObserver !== "function" || !document.body) return;
    routeObserver = new MutationObserver(function () {
      if (!routeIsHistory()) return watchRouteHost();
      if (findPageHost()) scheduleRender(0);
    });
    routeObserver.observe(document.body, { childList: true, subtree: true });
  }

  function refresh(force) {
    if (!routeIsHistory()) return;
    loadHistoryRows(Boolean(force));
    scheduleRender(0);
  }

  function onRouteMaybeChanged() {
    updateRouteBootFlag();
    if (routeIsHistory()) {
      installStyles();
      watchRouteHost();
      refresh(false);
      window.setTimeout(function () { if (routeIsHistory()) scheduleRender(0); }, 220);
    } else {
      watchRouteHost();
    }
  }

  function patchHistory(name) {
    var original = window.history && window.history[name];
    if (typeof original !== "function") return;
    window.history[name] = function () {
      var result = original.apply(window.history, arguments);
      window.setTimeout(onRouteMaybeChanged, 0);
      return result;
    };
  }

  updateRouteBootFlag();
  installStyles();

  patchHistory("pushState");
  patchHistory("replaceState");

  document.addEventListener("click", function (event) {
    var filterButton = event.target && event.target.closest && event.target.closest("[data-do-wallet-history-filter]");
    if (filterButton) {
      event.preventDefault();
      selectedFilter = filterButton.getAttribute("data-do-wallet-history-filter") || "all";
      scheduleRender(0);
      return;
    }
    var refreshButton = event.target && event.target.closest && event.target.closest("[data-do-wallet-history-refresh]");
    if (refreshButton) {
      event.preventDefault();
      refresh(true);
      return;
    }
    var hashRow = event.target && event.target.closest && event.target.closest("[data-do-wallet-history-hash]");
    if (hashRow) event.preventDefault();
    window.setTimeout(onRouteMaybeChanged, 80);
  }, true);

  window.addEventListener("popstate", onRouteMaybeChanged);
  window.addEventListener("storage", function () { if (routeIsHistory()) refresh(true); });
  window.addEventListener("do_wallet_portfolio_snapshot", function () { if (routeIsHistory()) refresh(false); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onRouteMaybeChanged);
  else onRouteMaybeChanged();
})();
