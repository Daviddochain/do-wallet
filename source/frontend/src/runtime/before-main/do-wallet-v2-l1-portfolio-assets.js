(function () {
  "use strict";

  if (window.__doWalletL1PortfolioAssetsRewrite20260625) return;
  window.__doWalletL1PortfolioAssetsRewrite20260625 = true;
  window.__doWalletL1PortfolioOwnsAssets = true;

  var VERSION = "20260628L1PortfolioRewrite5";
  var PORTFOLIO_SCHEMA_VERSION = "20260625FullWalletPortfolio7";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var PORTFOLIO_ADDRESS_HINTS_KEY = "do-wallet-portfolio-address-hints.v1";
  var SELECTED_WALLET_KEY = "do-wallet-selected-recovered-wallet.v1";
  var RECOVERED_WALLETS_KEY = "do-wallet-recovered-wallets.v1";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var BACKEND_PORTFOLIO_SNAPSHOT_PATH = "/station-assets/api/portfolio/snapshot?v=" + VERSION;
  var BACKEND_REFRESH_MS = 45000;
  var STYLE_ID = "do-wallet-l1-portfolio-assets-style";
  var LIST_SELECTOR = "[class*='AssetList_assetlist__list']";
  var HOST_ATTR = "data-do-wallet-l1-assets-host";
  var PANE_ATTR = "data-do-wallet-l1-assets-pane";
  var NATIVE_HIDDEN_ATTR = "data-do-wallet-l1-native-hidden";
  var TARGET_ATTR = "data-do-wallet-l1-assets-target";
  var SIGNATURE_ATTR = "data-do-wallet-l1-assets-signature";
  var DETAIL_ATTR = "data-do-wallet-l1-assets-detail";
  var activeKey = "";
  var renderTimer = null;
  var rendering = false;
  var backendRows = [];
  var backendSignature = "";
  var backendFailureSignature = "";
  var backendPending = false;
  var backendPromise = null;
  var backendLastStartedAt = 0;
  var waitingForFullPortfolio = false;
  var assetActionPayloads = {};

  var FLAT_KEYS = [
    "rawSpendableAssets",
    "flatSpendableAssets",
    "unGroupedSpendableAssets",
    "sourceSpendableAssets",
    "rawTokenSpendableAssets",
    "rawPortfolioAssets",
    "flatPortfolioAssets",
    "unGroupedPortfolioAssets",
    "sourcePortfolioAssets",
    "rawTokenPortfolioAssets",
    "detailPortfolioAssets",
    "staking"
  ];

  var GROUP_KEYS = [
    "groupedSpendableAssets",
    "groupedPortfolioAssets",
    "chainGroupedAssets",
    "sidePanelAssets",
    "portfolioPanelAssets",
    "spendableAssets",
    "assets",
    "portfolioAssets",
    "tokenSpendableAssets",
    "tokenPortfolioAssets"
  ];

  var TERRA_CLASSIC_SYMBOLS = {
    LUNC: true,
    LUNA: true,
    UST: true,
    USTC: true,
    AUT: true,
    CAT: true,
    CHT: true,
    CNT: true,
    DKT: true,
    EUT: true,
    GBT: true,
    HKT: true,
    IDT: true,
    INT: true,
    JPT: true,
    KRT: true,
    MNT: true,
    MYT: true,
    NOT: true,
    PHT: true,
    SDT: true,
    SET: true,
    SGT: true,
    THT: true
  };

  var TERRA_CLASSIC_SYMBOL_ALIASES = {
    USTC: "UST",
    AUTC: "AUT",
    CATC: "CAT",
    CHTC: "CHT",
    CNTC: "CNT",
    DKTC: "DKT",
    EUTC: "EUT",
    GPTC: "GBT",
    HKTC: "HKT",
    IDTC: "IDT",
    INTC: "INT",
    JPTC: "JPT",
    KRTC: "KRT",
    MYTC: "MYT",
    NOTC: "NOT",
    PHTC: "PHT",
    SDRC: "SDT",
    SETC: "SET",
    SGTC: "SGT",
    THTC: "THT"
  };

  var TERRA_CLASSIC_DENOMS = {
    uluna: true,
    uusd: true,
    uaud: true,
    ucad: true,
    uchf: true,
    ucny: true,
    udkk: true,
    ueur: true,
    ugbp: true,
    uhkd: true,
    uidr: true,
    uinr: true,
    ujpy: true,
    ukrw: true,
    umnt: true,
    umyr: true,
    unok: true,
    uphp: true,
    usdr: true,
    usek: true,
    usgd: true,
    uthb: true
  };

  var DO_PORTFOLIO_ICON = "/do-logo.jpg";

  var CHAIN_META = {
    "Do-Chain": ["Do Chain", "DO", DO_PORTFOLIO_ICON, 10],
    "columbus-5": ["Terra Classic (LUNC)", "LUNC", "/img/chains/TerraClassic.svg", 20],
    "osmosis-1": ["Osmosis", "OSMO", "/img/chains/Osmosis.svg", 30],
    "phoenix-1": ["Terra (LUNA)", "LUNA", "/img/chains/Terra.svg", 40],
    "bitcoin-mainnet": ["Bitcoin", "BTC", "/img/chains/Bitcoin.svg", 50],
    "ethereum-mainnet": ["Ethereum", "ETH", "/img/chains/Ethereum.svg", 60],
    "bnb-smart-chain-mainnet": ["BNB Smart Chain", "BNB", "/img/chains/BNB.svg", 70],
    "solana-mainnet": ["Solana", "SOL", "/img/chains/Solana.svg", 80],
    "arbitrum-one": ["Arbitrum One", "ETH", "/img/chains/Arbitrum.svg", 90],
    "avalanche-c-chain": ["Avalanche C-Chain", "AVAX", "/img/chains/Avalanche.svg", 100],
    "base-mainnet": ["Base", "ETH", "/img/chains/Base.svg", 110],
    "polygon-mainnet": ["Polygon", "MATIC", "/img/chains/Polygon.svg", 120],
    "optimism-mainnet": ["Optimism", "OP", "/img/chains/Optimism.svg", 130],
    "cardano-mainnet": ["Cardano", "ADA", "/img/chains/Cardano.svg", 140],
    "tron-mainnet": ["Tron", "TRX", "/img/chains/Tron.svg", 150],
    "xrp-ledger-mainnet": ["XRP Ledger", "XRP", "/img/chains/XRP.svg", 160],
    "cosmoshub-4": ["Cosmos", "ATOM", "/img/chains/Cosmos.svg", 170],
    "secret-4": ["Secret Network", "SCRT", "/img/chains/Secret.png", 180],
    "dungeon-1": ["Dungeon Chain", "DGN", "/img/chains/Dungeon.png", 190],
    "akashnet-2": ["Akash", "AKT", "/img/chains/Akash.svg", 200],
    "archway-1": ["Archway", "ARCH", "/img/chains/Archway.png", 210],
    "axelar-dojo-1": ["Axelar", "AXL", "/img/chains/Axelar.svg", 220],
    "carbon-1": ["Carbon", "SWTH", "/img/chains/Carbon.svg", 230],
    "cheqd-mainnet-1": ["cheqd", "CHEQ", "/img/chains/Cheqd.svg", 240],
    "chihuahua-1": ["Chihuahua", "HUAHUA", "/img/chains/Huahua.png", 250],
    "crescent-1": ["Crescent", "CRE", "/img/chains/Crescent.svg", 260],
    "decentr-mainnet-1": ["Decentr", "DEC", "/img/chains/Decentr.svg", 270],
    "juno-1": ["Juno", "JUNO", "/img/chains/Juno.svg", 280],
    "kaiyo-1": ["Kujira", "KUJI", "/img/chains/Kujira.png", 290],
    "mars-1": ["Mars", "MARS", "/img/chains/Mars.svg", 300],
    "migaloo-1": ["Migaloo", "WHALE", "/img/chains/Migaloo.svg", 310],
    "pacific-1": ["Sei", "SEI", "/img/chains/sei.svg", 320],
    "stride-1": ["Stride", "STRD", "/img/chains/Stride.png", 330],
    "stafihub-1": ["StaFi Hub", "FIS", "/img/chains/StaFiHub.png", 340]
  };

  function text(value) {
    return value == null ? "" : String(value);
  }

  function clean(value) {
    return text(value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function upper(value) {
    return clean(value).toUpperCase();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function escapeHTML(value) {
    return text(value).replace(/[&<>"']/g, function (char) {
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
      return true;
    } catch (error) {
      return false;
    }
  }

  var BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  var BECH32_INDEX = {};
  BECH32_ALPHABET.split("").forEach(function (char, index) {
    BECH32_INDEX[char] = index;
  });

  function bech32Polymod(values) {
    var chk = 1;
    var generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    values.forEach(function (value) {
      var top = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ value;
      for (var index = 0; index < 5; index += 1) {
        if ((top >> index) & 1) chk ^= generators[index];
      }
    });
    return chk;
  }

  function bech32HrpExpand(prefix) {
    var out = [];
    for (var index = 0; index < prefix.length; index += 1) out.push(prefix.charCodeAt(index) >> 5);
    out.push(0);
    for (var low = 0; low < prefix.length; low += 1) out.push(prefix.charCodeAt(low) & 31);
    return out;
  }

  function bech32Decode(address) {
    var value = clean(address).toLowerCase();
    var separator = value.lastIndexOf("1");
    if (separator <= 0 || separator + 7 > value.length) return null;
    var prefix = value.slice(0, separator);
    var words = [];
    for (var index = separator + 1; index < value.length; index += 1) {
      var word = BECH32_INDEX[value.charAt(index)];
      if (word === undefined) return null;
      words.push(word);
    }
    if (bech32Polymod(bech32HrpExpand(prefix).concat(words)) !== 1) return null;
    return { prefix: prefix, words: words.slice(0, -6) };
  }

  function bech32Encode(prefix, words) {
    var cleanPrefix = clean(prefix).toLowerCase();
    if (!cleanPrefix || !Array.isArray(words) || !words.length) return "";
    var polymod = bech32Polymod(bech32HrpExpand(cleanPrefix).concat(words).concat([0, 0, 0, 0, 0, 0])) ^ 1;
    var checksum = [];
    for (var index = 0; index < 6; index += 1) checksum.push((polymod >> (5 * (5 - index))) & 31);
    return cleanPrefix + "1" + words.concat(checksum).map(function (word) {
      return BECH32_ALPHABET.charAt(word);
    }).join("");
  }

  function reencodeBech32Address(address, prefix) {
    var decoded = bech32Decode(address);
    return decoded ? bech32Encode(prefix, decoded.words) : "";
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function activeWalletFromStorage() {
    var selectedWallet = walletFromPayload(readJSON(SELECTED_WALLET_KEY, null));
    if (selectedWallet) return selectedWallet;
    var storedUser = walletFromPayload(readJSON("user", null));
    if (storedUser) return storedUser;
    var bridgeWallet = walletFromPayload(readJSON(BRIDGE_KEY, null));
    if (bridgeWallet) return bridgeWallet;
    var authWallet = walletFromPayload(readJSON(AUTH_KEY, null));
    if (authWallet) return authWallet;
    var recovered = readJSON(RECOVERED_WALLETS_KEY, []);
    if (Array.isArray(recovered) && recovered.length) {
      return recovered.map(walletFromPayload).filter(Boolean).sort(function (left, right) {
        return Number(right.walletPriority || 0) - Number(left.walletPriority || 0);
      })[0] || null;
    }
    return null;
  }

  function walletIdentityKeys(wallet) {
    wallet = walletFromPayload(wallet) || wallet;
    var keys = [];
    function add(value) {
      value = lower(value);
      if (value && keys.indexOf(value) < 0) keys.push(value);
    }
    if (!isObject(wallet)) return keys;
    add(wallet.id);
    add(wallet.name);
    add(wallet.walletName);
    add(wallet.label);
    add(wallet.address);
    [wallet.addresses, wallet.addressMap, wallet.activeAddresses, wallet.allAddresses].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        add(key + ":" + map[key]);
        add(map[key]);
      });
    });
    return keys;
  }

  function activeWalletKeys() {
    var wallet = activeWalletFromStorage();
    var keys = walletIdentityKeys(wallet);
    return keys.filter(function (key, index, list) {
      return list.indexOf(key) === index;
    });
  }

  function walletMatchesKeys(wallet, keys) {
    if (!keys || !keys.length) return true;
    var walletKeys = walletIdentityKeys(wallet);
    if (!walletKeys.length) return false;
    return walletKeys.some(function (key) {
      return keys.indexOf(key) >= 0;
    });
  }

  function snapshotMatchesActiveWallet(snapshot, activeKeys) {
    if (!isObject(snapshot)) return false;
    if (!activeKeys || !activeKeys.length) return true;
    var keys = snapshotKeys(snapshot);
    if (!keys.length) return false;
    return keys.some(function (key) {
      return activeKeys.indexOf(key) >= 0;
    });
  }

  function canonicalAddressHint(hint) {
    var key = canonicalChain(hint || "", "", "", "");
    return CHAIN_META[key] ? key : "";
  }

  function addressChainIDs(address, hint) {
    var value = clean(address);
    var lowerValue = value.toLowerCase();
    var hinted = canonicalAddressHint(hint);
    var chains = hinted ? [hinted] : [];
    function add(chainID) {
      if (chainID && chains.indexOf(chainID) < 0) chains.push(chainID);
    }
    if (/^do1[023456789acdefghjklmnpqrstuvwxyz]{20,90}$/i.test(value)) add("Do-Chain");
    if (/^terra1[023456789acdefghjklmnpqrstuvwxyz]{20,90}$/i.test(value)) {
      add("columbus-5");
      add("phoenix-1");
    }
    if (/^osmo1[023456789acdefghjklmnpqrstuvwxyz]{20,90}$/i.test(value)) add("osmosis-1");
    if (/^cosmos1/i.test(value)) add("cosmoshub-4");
    if (/^secret1/i.test(value)) add("secret-4");
    if (/^dungeon1/i.test(value)) add("dungeon-1");
    if (/^akash1/i.test(value)) add("akashnet-2");
    if (/^archway1/i.test(value)) add("archway-1");
    if (/^axelar1/i.test(value)) add("axelar-dojo-1");
    if (/^swth1/i.test(value)) add("carbon-1");
    if (/^cheqd1/i.test(value)) add("cheqd-mainnet-1");
    if (/^chihuahua1/i.test(value)) add("chihuahua-1");
    if (/^cre1/i.test(value)) add("crescent-1");
    if (/^decentr1/i.test(value)) add("decentr-mainnet-1");
    if (/^juno1/i.test(value)) add("juno-1");
    if (/^kujira1/i.test(value)) add("kaiyo-1");
    if (/^mars1/i.test(value)) add("mars-1");
    if (/^migaloo1/i.test(value)) add("migaloo-1");
    if (/^sei1/i.test(value)) add("pacific-1");
    if (/^stride1/i.test(value)) add("stride-1");
    if (/^stafi1/i.test(value)) add("stafihub-1");
    if (/^0x[a-f0-9]{40}$/i.test(value)) {
      add("ethereum-mainnet");
      add("bnb-smart-chain-mainnet");
      add("arbitrum-one");
      add("avalanche-c-chain");
      add("base-mainnet");
      add("polygon-mainnet");
      add("optimism-mainnet");
    }
    if (/^(bc1|[13])[a-z0-9]{25,90}$/i.test(value)) add("bitcoin-mainnet");
    if (/^addr1[023456789acdefghjklmnpqrstuvwxyz]{20,120}$/i.test(value)) add("cardano-mainnet");
    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) add("tron-mainnet");
    if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(value)) add("xrp-ledger-mainnet");
    if (!chains.length && lowerValue.length >= 32 && lowerValue.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) add("solana-mainnet");
    return chains;
  }

  function addAddress(addressMap, chainID, address) {
    var value = clean(address);
    if (!value) return;
    var key = canonicalAddressHint(chainID);
    if (!key) {
      addressChainIDs(value, "").forEach(function (candidate) { addAddress(addressMap, candidate, value); });
      return;
    }
    if (!addressMap[key]) addressMap[key] = value;
  }

  function addAddressValue(addressMap, value, hint) {
    if (typeof value !== "string") return;
    var patterns = [
      /\b(?:do|terra|osmo|cosmos|secret|dungeon|akash|archway|axelar|swth|cheqd|chihuahua|cre|decentr|juno|kujira|mars|migaloo|sei|stride|stafi)[a-z0-9-]*1[023456789acdefghjklmnpqrstuvwxyz]{20,90}\b/gi,
      /\b0x[a-fA-F0-9]{40}\b/g,
      /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}\b/g,
      /\baddr1[023456789acdefghjklmnpqrstuvwxyz]{20,120}\b/gi,
      /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g,
      /\br[1-9A-HJ-NP-Za-km-z]{24,34}\b/g
    ];
    patterns.forEach(function (pattern) {
      var match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(value))) {
        addressChainIDs(match[0], hint).forEach(function (chainID) {
          addAddress(addressMap, chainID, match[0]);
        });
      }
    });
  }

  function addAddressesFromMap(addressMap, value, hint) {
    if (!value) return;
    if (typeof value === "string") {
      addAddressValue(addressMap, value, hint);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (item) { addAddressesFromMap(addressMap, item, hint); });
      return;
    }
    if (!isObject(value)) return;
    Object.keys(value).forEach(function (key) {
      var item = value[key];
      if (typeof item === "string") addAddressValue(addressMap, item, key);
      else if (isObject(item) && typeof item.address === "string") addAddressValue(addressMap, item.address, item.chainID || item.chainId || item.network || key);
      else if (Array.isArray(item)) addAddressesFromMap(addressMap, item, key);
    });
  }

  function scanObjectForAddresses(value, addressMap, depth) {
    if (depth > 5 || value == null) return;
    if (typeof value === "string") {
      addAddressValue(addressMap, value, "");
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (item) { scanObjectForAddresses(item, addressMap, depth + 1); });
      return;
    }
    if (!isObject(value)) return;
    addAddressesFromMap(addressMap, value.addresses, "");
    addAddressesFromMap(addressMap, value.addressMap, "");
    addAddressesFromMap(addressMap, value.activeAddresses, "");
    addAddressesFromMap(addressMap, value.allAddresses, "");
    addAddressValue(addressMap, value.address, value.chainID || value.chainId || value.network || value.chain);
    Object.keys(value).forEach(function (key) {
      if (/mnemonic|seed|private|password|secret/i.test(key)) return;
      scanObjectForAddresses(value[key], addressMap, depth + 1);
    });
  }

  function collectAddressMap() {
    var addressMap = {};
    var activeWallet = activeWalletFromStorage();
    var activeKeys = walletIdentityKeys(activeWallet);
    [
      activeWallet,
      readJSON(SELECTED_WALLET_KEY, null),
      readJSON("user", null),
      readJSON(BRIDGE_KEY, null),
      readJSON(AUTH_KEY, null)
    ].forEach(function (item) {
      if (!walletMatchesKeys(item, activeKeys)) return;
      scanObjectForAddresses(item, addressMap, 0);
    });
    if (!Object.keys(addressMap).length) {
      collectSnapshots().forEach(function (snapshot) {
        scanObjectForAddresses(snapshot, addressMap, 0);
      });
      scanObjectForAddresses(readJSON(PORTFOLIO_ADDRESS_HINTS_KEY, null), addressMap, 0);
    }
    if (addressMap["Do-Chain"]) {
      var terra = reencodeBech32Address(addressMap["Do-Chain"], "terra");
      if (terra) {
        addAddress(addressMap, "columbus-5", terra);
        addAddress(addressMap, "phoenix-1", terra);
      }
    }
    if (addressMap["columbus-5"]) {
      var doAddress = reencodeBech32Address(addressMap["columbus-5"], "do");
      if (doAddress) addAddress(addressMap, "Do-Chain", doAddress);
    }
    return addressMap;
  }

  function addressMapSignature(addressMap) {
    return Object.keys(addressMap || {}).sort().map(function (key) {
      return key + ":" + addressMap[key];
    }).join("|");
  }

  function backendWalletPayload(addressMap) {
    var active = activeWalletFromStorage() || {};
    var wallet = Object.assign({}, active);
    wallet.addresses = Object.assign({}, addressMap);
    wallet.addressMap = Object.assign({}, addressMap);
    wallet.address = wallet.address || addressMap["Do-Chain"] || addressMap["columbus-5"] || Object.keys(addressMap).map(function (key) { return addressMap[key]; })[0] || "";
    wallet.name = clean(wallet.name || wallet.walletName || wallet.label || wallet.id || "Do Wallet");
    return {
      version: VERSION,
      wallet: wallet,
      wallets: [wallet],
      addressMap: Object.assign({}, addressMap)
    };
  }

  function backendRowCount(snapshot) {
    return collectAssetsFromSnapshot(snapshot).length;
  }

  function persistBackendSnapshot(snapshot, addressMap) {
    if (!isObject(snapshot)) return;
    var current = readJSON(SNAPSHOT_KEY, null);
    var wallet = isObject(snapshot.wallet) ? Object.assign({}, snapshot.wallet) : {};
    wallet.addresses = Object.assign({}, addressMap);
    wallet.addressMap = Object.assign({}, addressMap);
    var stored = Object.assign({}, snapshot, {
      schemaVersion: PORTFOLIO_SCHEMA_VERSION,
      source: "do-wallet-l1-portfolio-rewrite",
      wallet: wallet,
      addresses: Object.assign({}, addressMap),
      activeAddresses: Object.assign({}, addressMap),
      updatedAt: Date.now()
    });
    if (snapshotMatchesActiveWallet(current, snapshotKeys(stored)) && backendRowCount(current) > backendRowCount(stored)) return;
    writeJSON(SNAPSHOT_KEY, stored);
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (!isObject(byWallet)) byWallet = {};
    walletIdentityKeys(wallet).concat(Object.keys(addressMap).map(function (key) { return addressMap[key]; })).forEach(function (key) {
      key = clean(key).toLowerCase();
      if (key) byWallet[key] = stored;
    });
    writeJSON(SNAPSHOTS_BY_WALLET_KEY, byWallet);
    try {
      window.dispatchEvent(new CustomEvent("do_wallet_portfolio_snapshot", { detail: stored }));
    } catch (error) {}
  }

  function shouldFetchBackend(rows, addressMap) {
    var signature = addressMapSignature(addressMap);
    if (!signature || backendFailureSignature === signature) return false;
    if (backendPending && backendSignature === signature) return true;
    if (backendRows.length && backendSignature === signature) return false;
    var expectedChains = Object.keys(addressMap || {}).filter(function (key) {
      return Boolean(CHAIN_META[key]);
    });
    var rowChains = {};
    (Array.isArray(rows) ? rows : []).forEach(function (asset) {
      if (asset && asset.chainID) rowChains[asset.chainID] = true;
    });
    if (addressMap["columbus-5"] && !rowChains["columbus-5"]) return true;
    if (addressMap["osmosis-1"] && !rowChains["osmosis-1"]) return true;
    if (expectedChains.length > 1 && Object.keys(rowChains).length <= 1) return true;
    if (expectedChains.length > 1 && rows.length <= 1) return true;
    return false;
  }

  function requestBackendPortfolio(addressMap) {
    if (!window.fetch) return null;
    var signature = addressMapSignature(addressMap);
    var now = Date.now();
    if (!signature) return null;
    if (backendPending && backendSignature === signature) return backendPromise;
    if (backendRows.length && backendSignature === signature && now - backendLastStartedAt < BACKEND_REFRESH_MS) return null;
    backendSignature = signature;
    backendFailureSignature = "";
    backendPending = true;
    backendLastStartedAt = now;
    backendPromise = window.fetch(BACKEND_PORTFOLIO_SNAPSHOT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendWalletPayload(addressMap)),
      credentials: "same-origin"
    }).then(function (response) {
      if (!response.ok) throw new Error("portfolio snapshot " + response.status);
      return response.json();
    }).then(function (payload) {
      var snapshot = isObject(payload && payload.snapshot) ? payload.snapshot : payload;
      var rows = collectAssetsFromSnapshot(snapshot);
      if (!rows.length) throw new Error("portfolio snapshot empty");
      backendRows = rows;
      persistBackendSnapshot(snapshot, addressMap);
      setDebug("backend-loaded", {
        chains: Object.keys(addressMap).length,
        rows: rows.length,
        stats: payload && payload.stats
      });
    }).catch(function (error) {
      backendFailureSignature = signature;
      setDebug("backend-failed", { message: error && error.message || String(error) });
    }).finally(function () {
      backendPending = false;
      waitingForFullPortfolio = false;
      schedule(0, "backend-finished");
    });
    return backendPromise;
  }

  function numberFrom(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    var match = text(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) || 0 : 0;
  }

  function firstArray(value, keys) {
    for (var index = 0; index < keys.length; index += 1) {
      if (Array.isArray(value && value[keys[index]])) return value[keys[index]];
    }
    return [];
  }

  function symbolOf(asset) {
    var symbol = clean(asset && (asset.symbol || asset.tokenSymbol || asset.ticker || asset.name || asset.denom || asset.token));
    symbol = upper(symbol);
    if (TERRA_CLASSIC_SYMBOL_ALIASES[symbol]) return TERRA_CLASSIC_SYMBOL_ALIASES[symbol];
    return symbol;
  }

  function chainIdOf(asset) {
    return clean(asset && (asset.chainID || asset.chainId || asset.network || asset.chain || asset.chainKey));
  }

  function chainNameOf(asset) {
    return clean(asset && (asset.chainName || asset.networkName || asset.chainLabel || asset.chain || asset.network));
  }

  function denomOf(asset) {
    return clean(asset && (asset.denom || asset.token || asset.contract || asset.baseAsset || asset.id || asset.symbol));
  }

  function categoryOf(asset) {
    return lower(asset && (asset.category || asset.type || "wallet")) || "wallet";
  }

  function iconOf(asset) {
    return clean(asset && (asset.icon || asset.image || asset.logo || asset.logoURI || asset.logoUrl || asset.tokenIcon || asset.chainIcon));
  }

  function displayIconFor(asset, meta, symbol) {
    if ((meta && meta.key) === "Do-Chain" || upper(symbol) === "DO") return DO_PORTFOLIO_ICON;
    return iconOf(asset) || (meta && meta.icon) || "";
  }

  function canonicalChain(rawID, rawName, symbol, denom) {
    var id = lower(rawID);
    var name = lower(rawName);
    var sym = upper(symbol);
    var den = lower(denom);
    var terraClassicContext = id === "columbus-5" || id === "terra-classic" || id === "lunc" || id === "330" || name.indexOf("terra classic") >= 0 || TERRA_CLASSIC_DENOMS[den] || den.indexOf("terra1") === 0 || (TERRA_CLASSIC_SYMBOLS[sym] && id !== "phoenix-1" && id !== "osmosis-1");
    if (terraClassicContext) return "columbus-5";
    if (id === "do-chain" || id === "dochain-1" || id === "do" || id === "888" || id.indexOf("dochain") >= 0 || name.indexOf("do chain") >= 0 || den === "udo" || sym === "DO") return "Do-Chain";
    if (id === "phoenix-1" || (sym === "LUNA" && name.indexOf("terra classic") < 0) || name.indexOf("terra (luna)") >= 0) return "phoenix-1";
    if (id === "osmosis-1" || id === "osmosis" || id === "osmo" || sym === "OSMO" || name.indexOf("osmosis") >= 0) return "osmosis-1";
    if (id.indexOf("bitcoin") >= 0 || id === "btc" || sym === "BTC") return "bitcoin-mainnet";
    if (id.indexOf("ethereum") >= 0 || id === "eth" || id === "eip155:1" || (sym === "ETH" && name.indexOf("arbitrum") < 0 && name.indexOf("base") < 0)) return "ethereum-mainnet";
    if (id.indexOf("bnb") >= 0 || id.indexOf("binance") >= 0 || sym === "BNB" || name.indexOf("bnb") >= 0) return "bnb-smart-chain-mainnet";
    if (id.indexOf("solana") >= 0 || id === "sol" || sym === "SOL") return "solana-mainnet";
    if (id.indexOf("arbitrum") >= 0 || name.indexOf("arbitrum") >= 0) return "arbitrum-one";
    if (id.indexOf("avalanche") >= 0 || sym === "AVAX" || name.indexOf("avalanche") >= 0) return "avalanche-c-chain";
    if (id.indexOf("base") >= 0 || name === "base") return "base-mainnet";
    if (id.indexOf("polygon") >= 0 || sym === "MATIC" || name.indexOf("polygon") >= 0) return "polygon-mainnet";
    if (id.indexOf("optimism") >= 0 || sym === "OP" || name.indexOf("optimism") >= 0) return "optimism-mainnet";
    if (id.indexOf("cardano") >= 0 || sym === "ADA" || name.indexOf("cardano") >= 0) return "cardano-mainnet";
    if (id.indexOf("tron") >= 0 || sym === "TRX" || name.indexOf("tron") >= 0) return "tron-mainnet";
    if (id.indexOf("xrp") >= 0 || sym === "XRP" || name.indexOf("xrp") >= 0) return "xrp-ledger-mainnet";
    if (id.indexOf("cosmos") >= 0 || id === "atom" || sym === "ATOM" || name.indexOf("cosmos") >= 0) return "cosmoshub-4";
    if (id.indexOf("secret") >= 0 || sym === "SCRT" || name.indexOf("secret") >= 0) return "secret-4";
    if (id.indexOf("dungeon") >= 0 || sym === "DGN" || name.indexOf("dungeon") >= 0) return "dungeon-1";
    if (id.indexOf("akash") >= 0 || sym === "AKT" || name.indexOf("akash") >= 0) return "akashnet-2";
    if (id.indexOf("archway") >= 0 || sym === "ARCH" || name.indexOf("archway") >= 0) return "archway-1";
    if (id.indexOf("axelar") >= 0 || sym === "AXL" || name.indexOf("axelar") >= 0) return "axelar-dojo-1";
    if (id.indexOf("carbon") >= 0 || sym === "SWTH" || name.indexOf("carbon") >= 0) return "carbon-1";
    if (id.indexOf("cheqd") >= 0 || sym === "CHEQ" || name.indexOf("cheqd") >= 0) return "cheqd-mainnet-1";
    if (id.indexOf("chihuahua") >= 0 || sym === "HUAHUA" || name.indexOf("chihuahua") >= 0) return "chihuahua-1";
    if (id.indexOf("crescent") >= 0 || sym === "CRE" || name.indexOf("crescent") >= 0) return "crescent-1";
    if (id.indexOf("decentr") >= 0 || sym === "DEC" || name.indexOf("decentr") >= 0) return "decentr-mainnet-1";
    if (id.indexOf("juno") >= 0 || sym === "JUNO" || name.indexOf("juno") >= 0) return "juno-1";
    if (id.indexOf("kujira") >= 0 || sym === "KUJI" || name.indexOf("kujira") >= 0) return "kaiyo-1";
    if (id.indexOf("mars") >= 0 || sym === "MARS" || name.indexOf("mars") >= 0) return "mars-1";
    if (id.indexOf("migaloo") >= 0 || sym === "WHALE" || name.indexOf("migaloo") >= 0) return "migaloo-1";
    if (id.indexOf("sei") >= 0 || sym === "SEI" || name.indexOf("sei") >= 0) return "pacific-1";
    if (id.indexOf("stride") >= 0 || sym === "STRD" || name.indexOf("stride") >= 0) return "stride-1";
    if (id.indexOf("stafi") >= 0 || sym === "FIS" || name.indexOf("stafi") >= 0) return "stafihub-1";
    return rawID || rawName || sym || den;
  }

  function metaFor(asset) {
    var key = canonicalChain(chainIdOf(asset), chainNameOf(asset), symbolOf(asset), denomOf(asset));
    var tuple = CHAIN_META[key];
    if (tuple) {
      return { key: key, name: tuple[0], nativeSymbol: tuple[1], icon: tuple[2], priority: tuple[3] || 999 };
    }
    var symbol = symbolOf(asset);
    var name = chainNameOf(asset) || key || symbol;
    return {
      key: key || symbol,
      name: name,
      nativeSymbol: symbol || upper(name).slice(0, 8),
      icon: iconOf(asset),
      priority: 999
    };
  }

  function amountNumber(asset) {
    return numberFrom(asset && (asset.amount || asset.quantity || asset.balance || asset.displayAmount || asset.amountText || asset.tokenAmount));
  }

  function valueNumber(asset) {
    return numberFrom(asset && (asset.valueUsd || asset.groupedValueUsd || asset.value || asset.usdValue || asset.fiatValue || asset.usd || asset.valueText || asset.usdValueText || asset.fiatValueText));
  }

  function formatUSD(value) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "$-";
    var digits = value >= 100 ? 2 : value >= 1 ? 4 : 8;
    return "$" + value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function valueText(asset, fallback) {
    var value = clean(asset && (asset.valueText || asset.usdValueText || asset.fiatValueText || asset.valueFormatted));
    if (value && value !== "$-" && value !== "$0") return value;
    return formatUSD(fallback != null ? fallback : valueNumber(asset));
  }

  function priceText(asset) {
    var value = clean(asset && (asset.priceText || asset.usdPriceText || asset.priceFormatted || asset.unitPriceText));
    if (value) return value;
    var number = numberFrom(asset && (asset.priceUsd || asset.price || asset.usdPrice || asset.unitPrice));
    return number > 0 ? formatUSD(number) : "";
  }

  function percentText(asset) {
    var value = clean(asset && (asset.changeText || asset.priceChangeText || asset.percentText || asset.change24hText || asset.priceChange24hText));
    if (value) return value;
    var number = asset && (asset.change24h || asset.percentChange24h || asset.priceChangePercent || asset.priceChangePercent24h || asset.changePercent);
    number = Number(number);
    if (!Number.isFinite(number) || number === 0) return "";
    return (number > 0 ? "+" : "") + number.toFixed(2) + "%";
  }

  function amountText(asset, symbol) {
    var value = clean(asset && (asset.displayAmount || asset.amountText || asset.balanceText || asset.quantityText));
    if (value) return value;
    var number = amountNumber(asset);
    if (!Number.isFinite(number) || number <= 0) return "";
    var digits = number >= 100 ? 2 : number >= 1 ? 4 : 8;
    return number.toLocaleString(undefined, { maximumFractionDigits: digits }) + (symbol ? " " + symbol : "");
  }

  function childrenOf(asset) {
    return firstArray(asset, ["childAssets", "expandedAssets", "subAssets", "tokens", "children"]);
  }

  function displayNameFor(asset, symbol, category) {
    var name = clean(asset && (asset.displayName || asset.name || asset.label)) || symbol;
    if (/^(staking|staked)$/i.test(category) && !/^staked\b/i.test(name)) return "Staked " + symbol;
    if (/^(reward|rewards)$/i.test(category) && !/^rewards?\b/i.test(name)) return "Rewards " + symbol;
    if (/^unbonding$/i.test(category) && !/^unbonding\b/i.test(name)) return "Unbonding " + symbol;
    return name;
  }

  function normalizeAsset(asset, source, index) {
    var symbol = symbolOf(asset);
    var meta = metaFor(asset);
    var category = categoryOf(asset);
    var value = valueNumber(asset);
    return {
      source: source || "snapshot",
      index: Number(index) || 0,
      symbol: symbol,
      name: displayNameFor(asset, symbol, category),
      chainID: meta.key,
      chainName: meta.name,
      nativeSymbol: meta.nativeSymbol,
      denom: denomOf(asset) || symbol,
      category: category,
      icon: displayIconFor(asset, meta, symbol),
      chainIcon: meta.key === "Do-Chain" ? meta.icon : (clean(asset && asset.chainIcon) || meta.icon),
      amount: amountNumber(asset),
      amountText: amountText(asset, symbol),
      value: value,
      valueText: valueText(asset, value),
      priceText: priceText(asset),
      changeText: percentText(asset),
      raw: asset
    };
  }

  function assetForVisibility(asset) {
    return Object.assign({}, isObject(asset && asset.raw) ? asset.raw : {}, isObject(asset) ? asset : {});
  }

  function quarantineAPI() {
    try {
      return window.doWalletQuarantine || null;
    } catch (error) {
      return null;
    }
  }

  function assetVisibilityKey(asset) {
    var api = quarantineAPI();
    var payload = assetForVisibility(asset);
    try {
      if (api && typeof api.keyForAsset === "function") return clean(api.keyForAsset(payload));
    } catch (error) {}
    var chain = lower(payload.chainID || payload.chainId || payload.chain || payload.network || "global");
    var value = lower(payload.contract || payload.contractAddress || payload.tokenAddress || payload.denom || payload.baseDenom || payload.token || payload.symbol || payload.name);
    if (!value) return "";
    var type = /^0x[0-9a-f]{40}$/i.test(value) || value.length > 24 || value.indexOf("/") >= 0 || value.indexOf(":") >= 0 ? "contract" : "symbol";
    return [type, chain || "global", value].join(":");
  }

  function assetIsVisible(asset) {
    var api = quarantineAPI();
    var payload = assetForVisibility(asset);
    try {
      if (api && typeof api.isVisibleAsset === "function") return api.isVisibleAsset(payload);
      if (api && typeof api.isHiddenAsset === "function" && api.isHiddenAsset(payload)) return false;
      if (api && typeof api.isBlockedAsset === "function" && api.isBlockedAsset(payload)) return false;
    } catch (error) {}
    return true;
  }

  function assetDecisionPayload(asset, group, amountText) {
    var payload = assetForVisibility(asset);
    return Object.assign({}, payload, {
      displayName: clean(asset && (asset.name || asset.symbol)),
      name: clean(asset && (asset.name || asset.symbol)),
      symbol: clean(asset && asset.symbol),
      chainName: clean(asset && asset.chainName) || clean(group && group.name),
      chainID: clean(asset && asset.chainID) || clean(group && group.key),
      denom: clean(asset && asset.denom),
      amountText: clean(amountText || asset && asset.amountText),
      valueText: clean(asset && asset.valueText) || formatUSD(asset && asset.value),
      priceText: clean(asset && asset.priceText),
      changeText: clean(asset && asset.changeText)
    });
  }

  function isDisplayable(asset) {
    if (!asset || !asset.symbol || /^[0-9.]+$/.test(asset.symbol)) return false;
    if (!assetIsVisible(asset)) return false;
    if (asset.value > 0 || asset.amount > 0) return true;
    if (asset.valueText && asset.valueText !== "$-" && asset.valueText !== "$0") return true;
    if (asset.amountText) return true;
    if (asset.symbol === "DO" && asset.chainID === "Do-Chain") return true;
    return false;
  }

  function snapshotKeys(snapshot) {
    var keys = [];
    function add(value) {
      value = lower(value);
      if (value && keys.indexOf(value) < 0) keys.push(value);
    }
    if (!isObject(snapshot)) return keys;
    add(snapshot.walletKey);
    var wallet = isObject(snapshot.wallet) ? snapshot.wallet : {};
    add(wallet.id);
    add(wallet.name);
    add(wallet.walletName);
    add(wallet.address);
    [snapshot.addresses, snapshot.activeAddresses, snapshot.allAddresses, wallet.addresses, wallet.addressMap].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) { add(key + ":" + map[key]); add(map[key]); });
    });
    return keys;
  }

  function snapshotsRelated(left, right) {
    var leftKeys = snapshotKeys(left);
    var rightKeys = snapshotKeys(right);
    if (!leftKeys.length || !rightKeys.length) return false;
    return leftKeys.some(function (key) { return rightKeys.indexOf(key) >= 0; });
  }

  function snapshotContainsAssetRows(snapshot) {
    if (!isObject(snapshot)) return false;
    return FLAT_KEYS.concat(GROUP_KEYS).some(function (key) {
      return Array.isArray(snapshot[key]) && snapshot[key].length > 0;
    });
  }

  function collectSnapshots() {
    var current = readJSON(SNAPSHOT_KEY, null);
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    var snapshots = [];
    var seen = {};
    var activeKeys = activeWalletKeys();
    function add(snapshot) {
      if (!isObject(snapshot)) return;
      if (!snapshotMatchesActiveWallet(snapshot, activeKeys)) return;
      var key = clean(snapshot.schemaVersion || "") + ":" + clean(snapshot.updatedAt || "") + ":" + snapshotKeys(snapshot).join("|");
      if (seen[key]) return;
      seen[key] = true;
      snapshots.push(snapshot);
    }
    add(current);
    if (isObject(byWallet)) {
      Object.keys(byWallet).forEach(function (key) {
        var snapshot = byWallet[key];
        add(snapshot);
      });
    }
    return snapshots;
  }

  function collectAssetsFromSnapshot(snapshot) {
    var rows = [];
    var order = 0;
    function addAsset(asset, source) {
      if (!isObject(asset)) return;
      var kids = childrenOf(asset);
      if (kids.length) {
        kids.forEach(function (child) { addAsset(child, source + "-child"); });
        if (asset.isChainGroup || asset.portfolioGroup || asset.groupedUnderChain) return;
      }
      var normalized = normalizeAsset(asset, source, order += 1);
      if (isDisplayable(normalized)) rows.push(normalized);
    }
    FLAT_KEYS.forEach(function (key) {
      if (!Array.isArray(snapshot && snapshot[key])) return;
      snapshot[key].forEach(function (asset) { addAsset(asset, key); });
    });
    GROUP_KEYS.forEach(function (key) {
      if (!Array.isArray(snapshot && snapshot[key])) return;
      snapshot[key].forEach(function (asset) { addAsset(asset, key); });
    });
    return rows;
  }

  function assetIdentity(asset) {
    return [
      asset.chainID,
      asset.category,
      lower(asset.denom || asset.symbol),
      asset.symbol,
      lower(asset.name)
    ].join("|");
  }

  function betterAsset(left, right) {
    if (!left) return right;
    if (!right) return left;
    if ((right.valueText && right.valueText !== "$-") !== (left.valueText && left.valueText !== "$-")) return right.valueText && right.valueText !== "$-" ? right : left;
    if ((right.amountText && right.amountText.length) !== (left.amountText && left.amountText.length)) return right.amountText ? right : left;
    if (right.value !== left.value) return right.value > left.value ? right : left;
    return right.index < left.index ? right : left;
  }

  function categoryRank(category) {
    if (category === "wallet" || category === "asset" || category === "balance" || category === "spendable") return 0;
    if (category === "staking" || category === "staked") return 1;
    if (category === "reward" || category === "rewards") return 2;
    if (category === "unbonding") return 3;
    return 4;
  }

  function mergeRows(primary, secondary) {
    var out = [];
    var byKey = {};
    function add(asset) {
      if (!isDisplayable(asset)) return;
      var key = assetIdentity(asset);
      byKey[key] = betterAsset(byKey[key], asset);
    }
    (Array.isArray(primary) ? primary : []).forEach(add);
    (Array.isArray(secondary) ? secondary : []).forEach(add);
    Object.keys(byKey).forEach(function (key) { out.push(byKey[key]); });
    return out.sort(function (a, b) {
      return (a.index - b.index) || upper(a.symbol).localeCompare(upper(b.symbol));
    });
  }

  function buildGroups() {
    var snapshotRows = [];
    collectSnapshots().forEach(function (snapshot) {
      snapshotRows = snapshotRows.concat(collectAssetsFromSnapshot(snapshot));
    });
    var addressMap = collectAddressMap();
    var signature = addressMapSignature(addressMap);
    var activeBackendRows = backendSignature === signature ? backendRows : [];
    if (backendSignature && backendSignature !== signature) activeKey = "";
    var rows = mergeRows(snapshotRows, activeBackendRows);
    var needsBackend = shouldFetchBackend(rows, addressMap);
    if (needsBackend) requestBackendPortfolio(addressMap);
    waitingForFullPortfolio = Boolean(needsBackend && !activeBackendRows.length && backendFailureSignature !== signature);
    if (waitingForFullPortfolio) return [];
    if (!rows.length) return [];
    return groupAssets(rows);
  }

  function groupAssets(rows) {
    var groups = {};
    (Array.isArray(rows) ? rows : []).forEach(function (asset) {
      var meta = metaFor(asset);
      if (!meta.key) return;
      if (!groups[meta.key]) {
        groups[meta.key] = {
          key: meta.key,
          name: meta.name,
          nativeSymbol: meta.nativeSymbol,
          icon: asset.chainIcon || meta.icon || asset.icon,
          priority: meta.priority,
          assetsByKey: {},
          firstIndex: asset.index
        };
      }
      var group = groups[meta.key];
      group.firstIndex = Math.min(group.firstIndex, asset.index);
      if (!group.icon && (asset.chainIcon || asset.icon)) group.icon = asset.chainIcon || asset.icon;
      var key = assetIdentity(asset);
      group.assetsByKey[key] = betterAsset(group.assetsByKey[key], asset);
    });

    return Object.keys(groups).map(function (key) {
      var group = groups[key];
      var assets = Object.keys(group.assetsByKey).map(function (assetKey) {
        return group.assetsByKey[assetKey];
      }).sort(function (a, b) {
        var an = upper(a.symbol) === upper(group.nativeSymbol) ? -1 : 0;
        var bn = upper(b.symbol) === upper(group.nativeSymbol) ? -1 : 0;
        return (an - bn) ||
          (categoryRank(a.category) - categoryRank(b.category)) ||
          (b.value - a.value) ||
          upper(a.symbol).localeCompare(upper(b.symbol)) ||
          a.name.localeCompare(b.name);
      });
      var total = assets.reduce(function (sum, asset) {
        return sum + (Number(asset.value) || 0);
      }, 0);
      return {
        key: group.key,
        name: group.name,
        nativeSymbol: group.nativeSymbol,
        icon: group.icon,
        priority: group.priority,
        firstIndex: group.firstIndex,
        assets: assets,
        totalValue: total,
        totalValueText: formatUSD(total),
        signature: assets.map(function (asset) {
          return [asset.chainID, asset.category, asset.symbol, asset.denom, asset.amountText, asset.valueText, asset.priceText, asset.changeText].join(":");
        }).join("|")
      };
    }).filter(function (group) {
      return group.assets.length > 0;
    }).sort(function (a, b) {
      var aHasValue = a.totalValue > 0 ? 0 : 1;
      var bHasValue = b.totalValue > 0 ? 0 : 1;
      return (aHasValue - bHasValue) || (a.priority - b.priority) || (a.firstIndex - b.firstIndex) || a.name.localeCompare(b.name);
    });
  }

  function groupsSignature(groups, mode) {
    return mode + "::" + groups.map(function (group) {
      return group.key + "=" + group.totalValueText + "=" + group.signature;
    }).join("||");
  }

  function textNodes(root) {
    var out = [];
    if (!root) return out;
    try {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          return clean(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      while (walker.nextNode()) out.push(walker.currentNode);
    } catch (error) {}
    return out;
  }

  function isMoneyText(value) {
    value = clean(value);
    return /^\$-?$/.test(value) || /^\$\s?-?[\d,]+(?:\.\d+)?$/.test(value);
  }

  function isDecimalTail(value) {
    return /^\.\d+$/.test(clean(value));
  }

  function updatePortfolioValueAmount(groups) {
    var pane = findRightWalletPane();
    if (!pane || !groups || !groups.length) return;
    var total = groups.reduce(function (sum, group) {
      return sum + (Number(group.totalValue) || 0);
    }, 0);
    var amount = formatUSD(total);
    var nodes = textNodes(pane);
    var labelIndex = -1;
    for (var index = 0; index < nodes.length; index += 1) {
      if (/^Portfolio value\b/i.test(clean(nodes[index].nodeValue))) {
        labelIndex = index;
        break;
      }
    }
    if (labelIndex < 0) return;
    for (var next = labelIndex + 1; next < Math.min(nodes.length, labelIndex + 12); next += 1) {
      if (!isMoneyText(nodes[next].nodeValue)) continue;
      nodes[next].nodeValue = amount;
      if (nodes[next + 1] && isDecimalTail(nodes[next + 1].nodeValue)) nodes[next + 1].nodeValue = "";
      return;
    }
  }

  function fallbackIcon(label, className, hidden) {
    return '<span class="' + className + ' do-wallet-l1-portfolio-fallback" aria-hidden="true"' + (hidden ? ' hidden style="display:none!important"' : "") + ">" + escapeHTML((label || "?").slice(0, 3).toUpperCase()) + "</span>";
  }

  function renderIcon(src, label, className) {
    if (!src) return fallbackIcon(label, className, false);
    return "<img class=\"" + className + "\" src=\"" + escapeHTML(src) + "\" alt=\"\" loading=\"eager\" decoding=\"async\" onerror=\"this.style.setProperty('display','none','important');var fallback=this.nextElementSibling;if(fallback){fallback.hidden=false;fallback.style.setProperty('display','grid','important');}\" />" + fallbackIcon(label, className, true);
  }

  function nativeAssetForGroup(group) {
    var native = upper(group && group.nativeSymbol);
    var assets = Array.isArray(group && group.assets) ? group.assets : [];
    return assets.filter(function (asset) {
      return upper(asset.symbol) === native;
    })[0] || assets[0] || null;
  }

  function groupRowHTML(group) {
    var count = group.assets.length === 1 ? "1 asset" : group.assets.length + " assets";
    var native = nativeAssetForGroup(group) || {};
    var label = clean(group.name) || clean(native.symbol) || clean(group.nativeSymbol);
    var price = clean(native.priceText);
    var change = clean(native.changeText);
    var changeClass = change.indexOf("-") >= 0 ? "negative" : "positive";
    var amount = clean(native.amountText);
    if (amount && upper(amount).indexOf(upper(label)) < 0) amount += " " + label;
    return [
      '<button type="button" class="do-wallet-l1-portfolio-row" data-do-wallet-l1-key="' + escapeHTML(group.key) + '">',
      '  <span class="do-wallet-l1-portfolio-left">',
      renderIcon(group.icon, group.nativeSymbol, "do-wallet-l1-portfolio-icon"),
      '    <span class="do-wallet-l1-portfolio-meta"><strong>' + escapeHTML(label) + (price ? ' <small>' + escapeHTML(price) + "</small>" : "") + "</strong>" + (change ? '<em class="' + changeClass + '">' + escapeHTML(change) + "</em>" : "<small>" + escapeHTML(count) + "</small>") + "</span>",
      "  </span>",
      '  <span class="do-wallet-l1-portfolio-right"><strong>' + escapeHTML(group.totalValueText) + "</strong><small>" + escapeHTML(amount || count) + "</small></span>",
      "</button>"
    ].join("");
  }

  function assetRowHTML(asset, group) {
    var change = clean(asset.changeText);
    var changeClass = change.indexOf("-") >= 0 ? "negative" : "positive";
    var amount = clean(asset.amountText);
    var key = assetVisibilityKey(asset);
    if (amount && upper(amount).indexOf(upper(asset.symbol)) < 0) amount += " " + asset.symbol;
    assetActionPayloads[key] = assetDecisionPayload(asset, group, amount);
    return [
      '<button type="button" class="do-wallet-l1-portfolio-coin" data-do-wallet-l1-asset-key="' + escapeHTML(key) + '">',
      '  <span class="do-wallet-l1-portfolio-left">',
      renderIcon(asset.icon || group.icon, asset.symbol, "do-wallet-l1-portfolio-coin-icon"),
      '    <span class="do-wallet-l1-portfolio-meta">',
      '      <strong>' + escapeHTML(asset.name || asset.symbol) + (asset.priceText ? ' <small>' + escapeHTML(asset.priceText) + "</small>" : "") + "</strong>",
      change ? '      <em class="' + changeClass + '">' + escapeHTML(change) + "</em>" : '      <small>' + escapeHTML(asset.symbol) + "</small>",
      "    </span>",
      "  </span>",
      '  <span class="do-wallet-l1-portfolio-right"><strong>' + escapeHTML(asset.valueText || formatUSD(asset.value)) + "</strong><small>" + escapeHTML(amount) + "</small></span>",
      "</button>"
    ].join("");
  }

  function renderList(list, groups) {
    var signature = groupsSignature(groups, "list");
    updateAssetHostScrollBounds(list);
    if (list.getAttribute(SIGNATURE_ATTR) === signature && !list.hasAttribute(DETAIL_ATTR)) return;
    list.removeAttribute(DETAIL_ATTR);
    list.setAttribute(TARGET_ATTR, "1");
    list.setAttribute(SIGNATURE_ATTR, signature);
    list.innerHTML = '<div class="do-wallet-l1-portfolio-shell">' + groups.map(groupRowHTML).join("") + "</div>";
    updateAssetHostScrollBounds(list);
  }

  function renderDetail(list, group) {
    var signature = groupsSignature([group], "detail");
    updateAssetHostScrollBounds(list);
    if (list.getAttribute(SIGNATURE_ATTR) === signature && list.getAttribute(DETAIL_ATTR) === group.key) return;
    var count = group.assets.length === 1 ? "1 asset" : group.assets.length + " assets";
    assetActionPayloads = {};
    list.setAttribute(TARGET_ATTR, "1");
    list.setAttribute(DETAIL_ATTR, group.key);
    list.setAttribute(SIGNATURE_ATTR, signature);
    list.innerHTML = [
      '<div class="do-wallet-l1-portfolio-detail">',
      '  <button type="button" class="do-wallet-l1-portfolio-back" data-do-wallet-l1-back="1">Back</button>',
      '  <div class="do-wallet-l1-portfolio-chain-head">',
      '    <span class="do-wallet-l1-portfolio-left">',
      renderIcon(group.icon, group.nativeSymbol, "do-wallet-l1-portfolio-icon"),
      '      <span class="do-wallet-l1-portfolio-meta"><strong>' + escapeHTML(group.name) + "</strong><small>" + escapeHTML(count) + "</small></span>",
      "    </span>",
      '    <span class="do-wallet-l1-portfolio-right"><strong>' + escapeHTML(group.totalValueText) + "</strong><small>" + escapeHTML(group.nativeSymbol) + "</small></span>",
      "  </div>",
      '  <div class="do-wallet-l1-portfolio-coins-title">Coins</div>',
      '  <div class="do-wallet-l1-portfolio-coins">',
      group.assets.map(function (asset) { return assetRowHTML(asset, group); }).join(""),
      "  </div>",
      "</div>"
    ].join("");
    updateAssetHostScrollBounds(list);
  }

  function isVisible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    try {
      var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
      if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    } catch (error) {}
    return true;
  }

  function visibleRect(node) {
    if (!isVisible(node)) return null;
    return node.getBoundingClientRect();
  }

  function nodeText(node) {
    return clean(node && (node.innerText || node.textContent || ""));
  }

  function updateAssetHostScrollBounds(host) {
    if (!host || !host.getBoundingClientRect) return;
    try {
      var rect = host.getBoundingClientRect();
      var viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      if (!viewportHeight) return;
      var maxHeight = Math.max(260, Math.floor(viewportHeight - rect.top - 10));
      host.style.setProperty("--do-wallet-l1-assets-max-height", maxHeight + "px");
      host.style.maxHeight = maxHeight + "px";
      host.style.overflow = "hidden";
      host.style.minHeight = "0";
    } catch (error) {}
  }

  function findRightWalletPane() {
    var viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var nodes = Array.prototype.slice.call(document.querySelectorAll("aside,section,article,div"));
    var best = null;
    nodes.forEach(function (node) {
      if (!node || node.hasAttribute && node.hasAttribute(HOST_ATTR)) return;
      var rect = visibleRect(node);
      if (!rect || rect.width < 260 || rect.height < 360) return;
      if (viewportWidth && rect.left < viewportWidth * 0.45 && rect.width < viewportWidth * 0.72) return;
      var value = nodeText(node);
      if (!/\bPortfolio value\b/i.test(value) || !/\bAssets\b/i.test(value)) return;
      if (!/\bSend\b/i.test(value) || !/\bReceive\b/i.test(value)) return;
      if (/\bMarkets\b/i.test(value) && rect.width > viewportWidth * 0.6) return;
      var score = rect.left * 100000 + Math.min(rect.width * rect.height, 500000);
      if (!best || score > best.score) best = { node: node, score: score };
    });
    if (best && best.node) best.node.setAttribute(PANE_ATTR, "1");
    return best && best.node || null;
  }

  function isAssetsHeaderNode(node) {
    if (!node || node.hasAttribute && node.hasAttribute(HOST_ATTR)) return false;
    return /^Assets$/i.test(nodeText(node));
  }

  function findAssetsHeader(pane) {
    if (!pane) return null;
    var nodes = Array.prototype.slice.call(pane.querySelectorAll("h1,h2,h3,h4,strong,span,div,p"));
    return nodes.filter(isAssetsHeaderNode).sort(function (a, b) {
      return (visibleRect(a) || { top: 99999 }).top - (visibleRect(b) || { top: 99999 }).top;
    })[0] || null;
  }

  function headerRowFor(header, pane) {
    var row = header;
    for (var depth = 0; row && row !== pane && depth < 6; depth += 1) {
      var rect = visibleRect(row);
      var value = nodeText(row);
      if (rect && rect.width >= 160 && rect.height <= 96 && /\bAssets\b/i.test(value)) return row;
      row = row.parentElement;
    }
    return header.parentElement || header;
  }

  function hideNativeAssetSiblings(host, pane) {
    if (!host || !host.parentElement) return;
    var node = host.nextElementSibling;
    while (node) {
      if (!node.hasAttribute || !node.hasAttribute(HOST_ATTR)) {
        node.setAttribute(NATIVE_HIDDEN_ATTR, "1");
      }
      node = node.nextElementSibling;
    }
    if (pane && pane.querySelectorAll) {
      [
        LIST_SELECTOR,
        "[class*='Asset_asset__']",
        "[class*='AssetList_assetlist__item']",
        "[class*='AssetList_assetlist__list'] article",
        "[class*='AssetList_assetlist__list'] li"
      ].forEach(function (selector) {
        Array.prototype.slice.call(pane.querySelectorAll(selector)).forEach(function (candidate) {
          if (candidate === host || (candidate.closest && candidate.closest("[" + HOST_ATTR + "='1']"))) return;
          candidate.setAttribute(NATIVE_HIDDEN_ATTR, "1");
        });
      });
      Array.prototype.slice.call(pane.querySelectorAll("img")).forEach(function (img) {
        if (img.closest && img.closest("[" + HOST_ATTR + "='1']")) return;
        var rect = visibleRect(img);
        if (rect && (rect.width > 72 || rect.height > 72)) {
          img.setAttribute(NATIVE_HIDDEN_ATTR, "1");
        }
      });
    }
  }

  function ensureOwnedAssetHost() {
    var pane = findRightWalletPane();
    if (!pane) return null;
    var existing = pane.querySelector("[" + HOST_ATTR + "='1']");
    if (existing && document.documentElement.contains(existing)) {
      updateAssetHostScrollBounds(existing);
      hideNativeAssetSiblings(existing, pane);
      return existing;
    }

    var header = findAssetsHeader(pane);
    var row = header ? headerRowFor(header, pane) : null;
    var host = document.createElement("div");
    host.setAttribute(HOST_ATTR, "1");
    host.className = "do-wallet-l1-portfolio-owned-host";
    if (row && row.parentElement) row.parentElement.insertBefore(host, row.nextSibling);
    else pane.appendChild(host);
    updateAssetHostScrollBounds(host);
    hideNativeAssetSiblings(host, pane);
    return host;
  }

  function findAssetLists() {
    var owned = ensureOwnedAssetHost();
    return owned ? [owned] : [];
  }

  function restoreNativeAssets() {
    var pane = findRightWalletPane();
    if (!pane || !pane.querySelectorAll) return 0;
    var restored = 0;
    Array.prototype.slice.call(pane.querySelectorAll("[" + HOST_ATTR + "='1']")).forEach(function (host) {
      if (host && host.parentElement) {
        host.parentElement.removeChild(host);
        restored += 1;
      }
    });
    Array.prototype.slice.call(pane.querySelectorAll("[" + NATIVE_HIDDEN_ATTR + "='1']")).forEach(function (node) {
      node.removeAttribute(NATIVE_HIDDEN_ATTR);
      restored += 1;
    });
    return restored;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "html{--do-wallet-l1-font-weight:var(--bold,500);}",
      "[" + NATIVE_HIDDEN_ATTR + "='1']{display:none!important;}",
      "[" + PANE_ATTR + "='1'] [class*='Asset_asset__'] img,[" + PANE_ATTR + "='1'] [class*='AssetList_assetlist__list'] img{display:block!important;width:34px!important;height:34px!important;min-width:34px!important;max-width:34px!important;min-height:34px!important;max-height:34px!important;border-radius:50%!important;object-fit:cover!important;overflow:hidden!important;}",
      "[" + TARGET_ATTR + "='1']>article{display:none!important;}",
      "[" + HOST_ATTR + "='1'],.do-wallet-l1-portfolio-owned-host{box-sizing:border-box;width:100%;max-height:var(--do-wallet-l1-assets-max-height,calc(100vh - 320px));min-height:0;overflow:hidden!important;}",
      ".do-wallet-l1-portfolio-shell,.do-wallet-l1-portfolio-detail{box-sizing:border-box;width:100%;font-family:inherit;color:#fff;}",
      ".do-wallet-l1-portfolio-shell,.do-wallet-l1-portfolio-coins{display:flex;flex-direction:column;gap:0;}",
      ".do-wallet-l1-portfolio-shell{max-height:var(--do-wallet-l1-assets-max-height,calc(100vh - 320px));overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:8px;}",
      ".do-wallet-l1-portfolio-row,.do-wallet-l1-portfolio-coin,.do-wallet-l1-portfolio-chain-head{box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;margin:0;padding:10px;border:0;border-bottom:1px solid rgba(135,57,190,.26);background:transparent;color:inherit;font:inherit;text-align:left;}",
      ".do-wallet-l1-portfolio-row,.do-wallet-l1-portfolio-coin{cursor:pointer;}",
      ".do-wallet-l1-portfolio-row:hover,.do-wallet-l1-portfolio-row:focus-visible,.do-wallet-l1-portfolio-coin:hover,.do-wallet-l1-portfolio-coin:focus-visible{background:rgba(163,60,255,.09);outline:0;}",
      ".do-wallet-l1-portfolio-coin{position:relative;padding-right:10px;}",
      ".do-wallet-l1-portfolio-left{display:flex;align-items:center;gap:12px;min-width:0;flex:1 1 auto;}",
      ".do-wallet-l1-portfolio-right{display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:84px;max-width:45%;text-align:right;white-space:nowrap;}",
      "[" + HOST_ATTR + "='1'] img,.do-wallet-l1-portfolio-owned-host img{display:block!important;object-fit:cover!important;border-radius:50%!important;}",
      ".do-wallet-l1-portfolio-icon,.do-wallet-l1-portfolio-coin-icon{display:block!important;flex:0 0 auto!important;border-radius:50%!important;object-fit:cover!important;background:#2c2140;overflow:hidden!important;}",
      ".do-wallet-l1-portfolio-icon{width:34px!important;height:34px!important;min-width:34px!important;max-width:34px!important;min-height:34px!important;max-height:34px!important;}",
      ".do-wallet-l1-portfolio-coin-icon{width:30px!important;height:30px!important;min-width:30px!important;max-width:30px!important;min-height:30px!important;max-height:30px!important;}",
      ".do-wallet-l1-portfolio-fallback{display:grid!important;place-items:center;color:#fff;font-size:10px;line-height:1;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-fallback[hidden]{display:none!important;}",
      ".do-wallet-l1-portfolio-meta{display:flex;flex-direction:column;gap:5px;min-width:0;}",
      ".do-wallet-l1-portfolio-meta strong,.do-wallet-l1-portfolio-right strong{font-weight:var(--do-wallet-l1-font-weight);line-height:1.08;letter-spacing:0;}",
      ".do-wallet-l1-portfolio-meta strong{font-size:15px;white-space:normal;overflow:hidden;text-overflow:ellipsis;}",
      ".do-wallet-l1-portfolio-meta strong small{font-size:11px;color:#b9aed8;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-meta small,.do-wallet-l1-portfolio-meta em,.do-wallet-l1-portfolio-right small{font-size:12px;line-height:1.1;font-style:normal;font-weight:var(--do-wallet-l1-font-weight);color:#c7baf0;}",
      ".do-wallet-l1-portfolio-meta em.negative{color:#ff4b55;}",
      ".do-wallet-l1-portfolio-meta em.positive{color:#00c68f;}",
      ".do-wallet-l1-portfolio-right strong{font-size:14px;overflow:hidden;text-overflow:ellipsis;max-width:100%;}",
      ".do-wallet-l1-portfolio-detail{display:flex;flex-direction:column;max-height:var(--do-wallet-l1-assets-max-height,calc(100vh - 320px));min-height:0;padding:0 0 16px;overflow:hidden;}",
      ".do-wallet-l1-portfolio-waiting{display:flex;flex-direction:column;gap:6px;padding:18px 10px;color:#fff;border-bottom:1px solid rgba(135,57,190,.26);}",
      ".do-wallet-l1-portfolio-waiting strong{font-size:14px;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-waiting small{font-size:12px;color:#c7baf0;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-back{display:inline-flex;align-items:center;margin:0 0 8px;padding:8px 2px;border:0;background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:var(--do-wallet-l1-font-weight);cursor:pointer;}",
      ".do-wallet-l1-portfolio-back:before{content:'<';display:inline-block;margin-right:10px;font-size:18px;line-height:1;}",
      ".do-wallet-l1-portfolio-chain-head{background:rgba(163,60,255,.06);border-top:1px solid rgba(135,57,190,.18);}",
      ".do-wallet-l1-portfolio-coins-title{padding:18px 10px 8px;font-size:14px;font-weight:var(--do-wallet-l1-font-weight);}",
      ".do-wallet-l1-portfolio-coins{min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:8px;}",
      ".do-wallet-l1-portfolio-coin{min-height:58px;}",
      "@media(max-width:760px){.do-wallet-l1-portfolio-row,.do-wallet-l1-portfolio-coin,.do-wallet-l1-portfolio-chain-head{padding-left:8px;padding-right:8px}.do-wallet-l1-portfolio-right{min-width:76px}.do-wallet-l1-portfolio-meta strong{font-size:14px}.do-wallet-l1-portfolio-right strong{font-size:13px}}"
    ].join("\n");
    head.appendChild(style);
  }

  function setDebug(reason, details) {
    try {
      window.__doWalletL1PortfolioAssetsDebug = Object.assign({
        version: VERSION,
        checkedAt: new Date().toISOString(),
        state: reason
      }, details || {});
    } catch (error) {}
  }

  function renderWaiting(list) {
    list.removeAttribute(DETAIL_ATTR);
    list.setAttribute(TARGET_ATTR, "1");
    list.setAttribute(SIGNATURE_ATTR, "waiting:" + VERSION);
    updateAssetHostScrollBounds(list);
    list.innerHTML = [
      '<div class="do-wallet-l1-portfolio-shell">',
      '  <div class="do-wallet-l1-portfolio-waiting">',
      '    <strong>Loading assets</strong>',
      '    <small>Getting the full wallet portfolio...</small>',
      "  </div>",
      "</div>"
    ].join("");
  }

  function render(reason) {
    if (rendering) return;
    rendering = true;
    try {
      injectStyle();
      var groups = buildGroups();
      if (!groups.length) {
        if (waitingForFullPortfolio || backendPending) {
          var waitingLists = findAssetLists();
          waitingLists.forEach(renderWaiting);
          setDebug("waiting-for-backend", { reason: reason, pending: backendPending });
          return;
        }
        var restored = restoreNativeAssets();
        setDebug("no-groups", { reason: reason, restored: restored });
        return;
      }
      updatePortfolioValueAmount(groups);
      var lists = findAssetLists();
      if (!lists.length) {
        setDebug("no-assets-list", { reason: reason });
        return;
      }
      lists.forEach(function (list) {
        var group = activeKey && groups.filter(function (item) { return item.key === activeKey; })[0];
        if (activeKey && !group) activeKey = "";
        if (group) renderDetail(list, group);
        else renderList(list, groups);
      });
      document.documentElement.setAttribute("data-do-wallet-l1-assets-ready", VERSION);
      setDebug("rendered", {
        reason: reason,
        lists: lists.length,
        groups: groups.length,
        rows: groups.reduce(function (sum, group) { return sum + group.assets.length; }, 0),
        activeKey: activeKey,
        backendRows: backendRows.length
      });
    } finally {
      rendering = false;
    }
  }

  function schedule(delay, reason) {
    if (renderTimer) return;
    renderTimer = window.setTimeout(function () {
      renderTimer = null;
      render(reason || "scheduled");
    }, delay == null ? 0 : delay);
  }

  function mutationTouchesPortfolio(mutations) {
    for (var i = 0; i < mutations.length; i += 1) {
      var nodes = Array.prototype.slice.call(mutations[i].addedNodes || []).concat(Array.prototype.slice.call(mutations[i].removedNodes || []));
      for (var j = 0; j < nodes.length; j += 1) {
        var node = nodes[j];
        if (!node || node.nodeType !== 1) continue;
        if (node.id === STYLE_ID) continue;
        if (node.closest && (node.closest(".do-wallet-l1-portfolio-shell") || node.closest(".do-wallet-l1-portfolio-detail"))) continue;
        if (node.matches && node.matches(LIST_SELECTOR)) return true;
        if (node.querySelector && node.querySelector(LIST_SELECTOR)) return true;
        var content = lower(node.textContent || "");
        if (content.indexOf("portfolio value") >= 0 && content.indexOf("assets") >= 0) return true;
      }
    }
    return false;
  }

  document.addEventListener("click", function (event) {
    var assetTarget = event.target && event.target.closest && event.target.closest("[data-do-wallet-l1-asset-key]");
    if (assetTarget) {
      event.preventDefault();
      event.stopPropagation();
      var api = quarantineAPI();
      var assetKey = assetTarget.getAttribute("data-do-wallet-l1-asset-key") || "";
      var payload = assetActionPayloads[assetKey] || { symbol: assetKey, denom: assetKey };
      if (api && typeof api.inspectAsset === "function") {
        api.inspectAsset(payload);
      }
      return;
    }
    var target = event.target && event.target.closest && event.target.closest("[data-do-wallet-l1-key],[data-do-wallet-l1-back]");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    if (target.hasAttribute("data-do-wallet-l1-back")) activeKey = "";
    else activeKey = target.getAttribute("data-do-wallet-l1-key") || "";
    schedule(0, target.hasAttribute("data-do-wallet-l1-back") ? "back" : "open-detail");
  }, true);

  window.addEventListener("storage", function (event) {
    if (!event || [
      SNAPSHOT_KEY,
      SNAPSHOTS_BY_WALLET_KEY,
      PORTFOLIO_ADDRESS_HINTS_KEY,
      SELECTED_WALLET_KEY,
      RECOVERED_WALLETS_KEY,
      BRIDGE_KEY,
      AUTH_KEY,
      "user",
      "keys"
    ].indexOf(event.key) >= 0) schedule(0, "storage");
  });
  window.addEventListener("do_wallet_recovered_wallet_selected", function () { schedule(0, "wallet-selected"); });
  window.addEventListener("do_wallet_chain_assets_update", function () { schedule(0, "wallet-assets-update"); });
  window.addEventListener("do_wallet_bridge_update", function () { schedule(0, "wallet-bridge-update"); });
  window.addEventListener("do_wallet_portfolio_snapshot", function () { schedule(0, "snapshot"); });
  window.addEventListener("do_wallet_quarantine_change", function () { schedule(0, "quarantine-change"); });
  window.addEventListener("load", function () { schedule(0, "load"); });
  window.addEventListener("focus", function () { schedule(0, "focus"); });
  window.addEventListener("resize", function () { schedule(0, "resize"); });

  try {
    var observer = new MutationObserver(function (mutations) {
      if (!rendering && mutationTouchesPortfolio(mutations || [])) schedule(0, "mutation");
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { schedule(0, "dom-ready"); }, { once: true });
  }
  window.doWalletL1PortfolioAssets = {
    version: VERSION,
    render: function () { schedule(0, "manual"); },
    groups: function () { return buildGroups(); },
    addresses: collectAddressMap,
    refresh: function () { return requestBackendPortfolio(collectAddressMap()); }
  };
  schedule(0, "install");
})();
