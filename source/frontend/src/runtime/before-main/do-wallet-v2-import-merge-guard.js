(function () {
  "use strict";

  if (window.__doWalletImportMergeGuard20260620) return;
  window.__doWalletImportMergeGuard20260620 = true;

  var KEYS_KEY = "keys";
  var USER_KEY = "user";
  var BACKUP_KEY = "do-wallet-keys-backups.v1";
  var INVENTORY_KEY = "do-wallet-wallet-backup-inventory.v1";
  var STATUS_KEY = "do-wallet-import-merge-status.v1";
  var RECOVERED_KEY = "do-wallet-recovered-wallets.v1";
  var MAX_JSON = 8 * 1024 * 1024;
  var MAX_KEYS = 500;
  var MAX_BACKUPS = 8;
  var MAX_BACKUP_RAW = 2 * 1024 * 1024;

  var DERIVED_CHAIN_EXPORTS = [
    { chainID: "Do-Chain", label: "Do Chain", coinType: "888", prefix: "do", path: "m/44'/888'/0'/0/0", export: "Do private key" },
    { chainID: "columbus-5", label: "Terra Classic (LUNC)", coinType: "330", prefix: "terra", path: "m/44'/330'/0'/0/0", export: "LUNC private key" },
    { chainID: "phoenix-1", label: "Terra (LUNA)", coinType: "330", prefix: "terra", path: "m/44'/330'/0'/0/0", export: "LUNA private key" },
    { chainID: "secret-4", label: "Secret Network", coinType: "529", prefix: "secret", path: "m/44'/529'/0'/0/0", export: "SCRT private key" },
    { chainID: "dungeon-1", label: "Dungeon Chain", coinType: "118", prefix: "dungeon", path: "m/44'/118'/0'/0/0", export: "DGN private key" },
    { chainID: "cosmoshub-4", label: "Cosmos Hub", coinType: "118", prefix: "cosmos", path: "m/44'/118'/0'/0/0", export: "Cosmos private key" },
    { chainID: "osmosis-1", label: "Osmosis", coinType: "118", prefix: "osmo", path: "m/44'/118'/0'/0/0", export: "OSMO private key" },
    { chainID: "akashnet-2", label: "Akash", coinType: "118", prefix: "akash", path: "m/44'/118'/0'/0/0", export: "Akash private key" },
    { chainID: "juno-1", label: "Juno", coinType: "118", prefix: "juno", path: "m/44'/118'/0'/0/0", export: "Juno private key" },
    { chainID: "mars-1", label: "Mars", coinType: "118", prefix: "mars", path: "m/44'/118'/0'/0/0", export: "Mars private key" },
    { chainID: "axelar-dojo-1", label: "Axelar", coinType: "118", prefix: "axelar", path: "m/44'/118'/0'/0/0", export: "Axelar private key" },
    { chainID: "archway-1", label: "Archway", coinType: "118", prefix: "archway", path: "m/44'/118'/0'/0/0", export: "Archway private key" },
    { chainID: "kaiyo-1", label: "Kujira", coinType: "118", prefix: "kujira", path: "m/44'/118'/0'/0/0", export: "Kujira private key" },
    { chainID: "migaloo-1", label: "Migaloo", coinType: "118", prefix: "migaloo", path: "m/44'/118'/0'/0/0", export: "Migaloo private key" },
    { chainID: "stride-1", label: "Stride", coinType: "118", prefix: "stride", path: "m/44'/118'/0'/0/0", export: "Stride private key" },
    { chainID: "stargaze-1", label: "Stargaze", coinType: "118", prefix: "stars", path: "m/44'/118'/0'/0/0", export: "Stargaze private key" },
    { chainID: "injective-1", label: "Injective", coinType: "60", prefix: "inj", path: "m/44'/60'/0'/0/0", export: "Injective private key" },
    { chainID: "noble-1", label: "Noble", coinType: "118", prefix: "noble", path: "m/44'/118'/0'/0/0", export: "Noble private key" },
    { chainID: "neutron-1", label: "Neutron", coinType: "118", prefix: "neutron", path: "m/44'/118'/0'/0/0", export: "Neutron private key" },
    { chainID: "celestia", label: "Celestia", coinType: "118", prefix: "celestia", path: "m/44'/118'/0'/0/0", export: "Celestia private key" },
    { chainID: "pacific-1", label: "Sei", coinType: "118", prefix: "sei", path: "m/44'/118'/0'/0/0", export: "Sei private key" },
    { chainID: "kava_2222-10", label: "Kava", coinType: "118", prefix: "kava", path: "m/44'/118'/0'/0/0", export: "Kava private key" },
    { chainID: "crescent-1", label: "Crescent", coinType: "118", prefix: "cre", path: "m/44'/118'/0'/0/0", export: "Crescent private key" },
    { chainID: "comdex-1", label: "Comdex", coinType: "118", prefix: "comdex", path: "m/44'/118'/0'/0/0", export: "Comdex private key" },
    { chainID: "andromeda-1", label: "Andromeda", coinType: "118", prefix: "andr", path: "m/44'/118'/0'/0/0", export: "Andromeda private key" },
    { chainID: "Oraichain", label: "Oraichain", coinType: "118", prefix: "orai", path: "m/44'/118'/0'/0/0", export: "Oraichain private key" },
    { chainID: "pryzm-1", label: "Pryzm", coinType: "118", prefix: "pryzm", path: "m/44'/118'/0'/0/0", export: "Pryzm private key" },
    { chainID: "pirin-1", label: "Nolus", coinType: "118", prefix: "nolus", path: "m/44'/118'/0'/0/0", export: "Nolus private key" },
    { chainID: "stafihub-1", label: "StaFiHub", coinType: "118", prefix: "stafi", path: "m/44'/118'/0'/0/0", export: "StaFiHub private key" },
    { chainID: "carbon-1", label: "Carbon", coinType: "118", prefix: "swth", path: "m/44'/118'/0'/0/0", export: "Carbon private key" },
    { chainID: "cheqd-mainnet-1", label: "Cheqd", coinType: "118", prefix: "cheqd", path: "m/44'/118'/0'/0/0", export: "Cheqd private key" },
    { chainID: "sentinelhub-2", label: "DVPN", coinType: "118", prefix: "sent", path: "m/44'/118'/0'/0/0", export: "DVPN private key" },
    { chainID: "decentr-mainnet-1", label: "DEC", coinType: "118", prefix: "decentr", path: "m/44'/118'/0'/0/0", export: "DEC private key" },
    { chainID: "chihuahua-1", label: "Chihuahua", coinType: "118", prefix: "chihuahua", path: "m/44'/118'/0'/0/0", export: "Chihuahua private key" },
    { chainID: "ethereum-mainnet", label: "Ethereum", coinType: "60", kind: "evm", path: "m/44'/60'/0'/0/0", export: "EVM private key" },
    { chainID: "bnb-smart-chain-mainnet", label: "BNB Smart Chain", coinType: "60", kind: "evm", path: "m/44'/60'/0'/0/0", export: "EVM private key" },
    { chainID: "polygon-mainnet", label: "Polygon", coinType: "60", kind: "evm", path: "m/44'/60'/0'/0/0", export: "EVM private key" },
    { chainID: "base-mainnet", label: "Base", coinType: "60", kind: "evm", path: "m/44'/60'/0'/0/0", export: "EVM private key" },
    { chainID: "arbitrum-one", label: "Arbitrum One", coinType: "60", kind: "evm", path: "m/44'/60'/0'/0/0", export: "EVM private key" },
    { chainID: "optimism-mainnet", label: "Optimism", coinType: "60", kind: "evm", path: "m/44'/60'/0'/0/0", export: "EVM private key" },
    { chainID: "avalanche-c-chain", label: "Avalanche C-Chain", coinType: "60", kind: "evm", path: "m/44'/60'/0'/0/0", export: "EVM private key" },
    { chainID: "bitcoin-mainnet", label: "Bitcoin", coinType: "0", kind: "bitcoin", prefix: "bc", path: "m/84'/0'/0'/0/0", export: "BTC WIF private key" },
    { chainID: "solana-mainnet", label: "Solana", coinType: "501", kind: "solana", path: "m/44'/501'/0'/0'", export: "SOL private key" },
    { chainID: "cardano-mainnet", label: "Cardano", coinType: "1815", kind: "cardano", prefix: "addr", path: "m/1852'/1815'/0'/0/0 + m/1852'/1815'/0'/2/0", export: "Cardano account key" },
    { chainID: "tron-mainnet", label: "Tron", coinType: "195", kind: "tron", path: "m/44'/195'/0'/0/0", export: "TRX private key" },
    { chainID: "xrp-ledger-mainnet", label: "XRP Ledger", coinType: "144", kind: "xrp", path: "m/44'/144'/0'/0/0", export: "XRP private key" }
  ];

  var CHAIN_LABELS = DERIVED_CHAIN_EXPORTS.reduce(function (labels, chain) {
    labels[chain.chainID] = chain.label;
    if (!labels[chain.coinType]) labels[chain.coinType] = chain.label;
    return labels;
  }, {
    do: "Do Chain",
    dochain: "Do Chain",
    "Do-Chain-native": "Do Chain (native)",
    "Do-Chain-imported": "Do Chain (imported)",
    "Do-Chain-preserved": "Do Chain (preserved)",
    "Do-Chain-legacy": "Do Chain (legacy)",
    lunc: "Terra Classic (LUNC)",
    terra: "Terra Classic (LUNC)",
    dungeon: "Dungeon Chain",
    dgn: "Dungeon Chain",
    secret: "Secret Network",
    scrt: "Secret Network",
    btc: "Bitcoin",
    bitcoin: "Bitcoin",
    sol: "Solana",
    solana: "Solana",
    eth: "Ethereum",
    ethereum: "Ethereum"
  });

  DERIVED_CHAIN_EXPORTS.forEach(function (chain) {
    CHAIN_LABELS[chain.chainID + "-preserved"] = chain.label + " (preserved)";
    CHAIN_LABELS[chain.chainID + "-legacy"] = chain.label + " (legacy)";
    CHAIN_LABELS[chain.chainID + "-native"] = chain.label + " (native)";
    CHAIN_LABELS[chain.chainID + "-imported"] = chain.label + " (imported)";
  });

  var COIN_TYPE_COUNTS = DERIVED_CHAIN_EXPORTS.reduce(function (counts, chain) {
    counts[chain.coinType] = (counts[chain.coinType] || 0) + 1;
    return counts;
  }, {});

  var EXTRA_CHAIN_ALIASES = {
    "Do-Chain": ["do", "dochain"],
    "columbus-5": ["lunc", "terra", "terra-classic"],
    "phoenix-1": ["luna", "terra-luna", "phoenix"],
    "dungeon-1": ["dungeon", "dgn"],
    "secret-4": ["secret", "scrt"],
    "mars-1": ["mars"],
    "cosmoshub-4": ["cosmos", "atom"],
    "osmosis-1": ["osmosis", "osmo"],
    "akashnet-2": ["akash", "akt"],
    "juno-1": ["juno"],
    "axelar-dojo-1": ["axelar", "axl"],
    "archway-1": ["archway"],
    "kaiyo-1": ["kujira"],
    "migaloo-1": ["migaloo"],
    "stride-1": ["stride"],
    "stargaze-1": ["stargaze", "stars"],
    "injective-1": ["injective", "inj"],
    "noble-1": ["noble"],
    "neutron-1": ["neutron"],
    "celestia": ["celestia", "tia"],
    "pacific-1": ["sei"],
    "kava_2222-10": ["kava"],
    "crescent-1": ["crescent", "cre"],
    "comdex-1": ["comdex"],
    "andromeda-1": ["andromeda", "andr"],
    "Oraichain": ["oraichain", "orai"],
    "pryzm-1": ["pryzm"],
    "pirin-1": ["nolus"],
    "stafihub-1": ["stafi", "stafihub"],
    "carbon-1": ["carbon", "swth"],
    "cheqd-mainnet-1": ["cheqd"],
    "sentinelhub-2": ["sent", "dvpn"],
    "decentr-mainnet-1": ["decentr", "dec"],
    "chihuahua-1": ["chihuahua", "huahua"],
    "bitcoin-mainnet": ["btc", "bitcoin"],
    "ethereum-mainnet": ["eth", "ethereum", "evm"],
    "bnb-smart-chain-mainnet": ["bsc", "bnb"],
    "polygon-mainnet": ["polygon", "matic"],
    "base-mainnet": ["base"],
    "arbitrum-one": ["arbitrum", "arb"],
    "optimism-mainnet": ["optimism", "op"],
    "avalanche-c-chain": ["avalanche", "avax"],
    "solana-mainnet": ["sol", "solana"],
    "cardano-mainnet": ["ada", "cardano"],
    "tron-mainnet": ["trx", "tron"],
    "xrp-ledger-mainnet": ["xrp", "xrpl"]
  };

  Object.keys(EXTRA_CHAIN_ALIASES).forEach(function (chainID) {
    var label = CHAIN_LABELS[chainID];
    if (!label) return;
    EXTRA_CHAIN_ALIASES[chainID].forEach(function (alias) {
      if (!CHAIN_LABELS[alias]) CHAIN_LABELS[alias] = label;
    });
  });

  function chainPrefixPattern(chainID) {
    var chain = DERIVED_CHAIN_EXPORTS.filter(function (item) {
      return item.chainID === chainID;
    })[0];
    if (chainID === "bitcoin-mainnet") return /^(bc1|[13])/i;
    if (chainID === "ethereum-mainnet" || chainID === "bnb-smart-chain-mainnet" || chainID === "polygon-mainnet" || chainID === "base-mainnet" || chainID === "arbitrum-one" || chainID === "optimism-mainnet" || chainID === "avalanche-c-chain") return /^0x[a-f0-9]{40}$/i;
    if (chain && chain.kind === "cardano") return /^addr1/i;
    if (chainID === "tron-mainnet") return /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
    if (chainID === "xrp-ledger-mainnet") return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/i;
    if (chain && chain.prefix) return new RegExp("^" + chain.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "1", "i");
    return null;
  }

  var CHAIN_ADDRESS_RULES = DERIVED_CHAIN_EXPORTS.map(function (chain) {
    var aliases = [
      chain.chainID,
      chain.chainID + "-preserved",
      chain.chainID + "-legacy",
      chain.chainID + "-native",
      chain.chainID + "-imported"
    ].concat(EXTRA_CHAIN_ALIASES[chain.chainID] || []);

    if (COIN_TYPE_COUNTS[chain.coinType] === 1) aliases.push(chain.coinType);

    return {
      chainID: chain.chainID,
      label: chain.label,
      coinType: chain.coinType,
      aliases: aliases,
      prefix: chainPrefixPattern(chain.chainID)
    };
  });

  var nativeGetItem = null;
  var nativeSetItem = null;
  var nativeRemoveItem = null;
  var nativeClear = null;

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
        host.endsWith(".do-chain.com") ||
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1"
      );
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

  function escapeHtml(value) {
    return text(value).replace(/[&<>"']/g, function (char) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char];
    });
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function looksLikeAddress(value) {
    var raw = text(value);
    if (!raw) return false;
    return (
      /^0x[a-f0-9]{40}$/i.test(raw) ||
      /^(bc1|[13])[a-z0-9]{20,90}$/i.test(raw) ||
      /^(do|terra|secret|dungeon|cosmos|osmo|akash|juno|mars|inj|kujira|stars|stride|noble|neutron|celestia|archway|axelar|andr|migaloo|sei|kava|cre|comdex|orai|nolus|stafi|dydx|chihuahua|pryzm|xion|swth|cheqd|sent|decentr|addr)1[0-9a-z]{12,120}$/i.test(raw) ||
      /^[1-9A-HJ-NP-Za-km-z]{32,60}$/.test(raw) ||
      /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/i.test(raw) ||
      /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(raw)
    );
  }

  var BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

  function isHex(value) {
    var raw = text(value);
    return raw.length > 0 && raw.length % 2 === 0 && /^[0-9a-f]+$/i.test(raw);
  }

  function bytesFromHex(hex) {
    var raw = text(hex);
    var out = [];
    for (var index = 0; index < raw.length; index += 2) {
      out.push(parseInt(raw.slice(index, index + 2), 16));
    }
    return out;
  }

  function bech32Polymod(values) {
    var generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    var chk = 1;
    values.forEach(function (value) {
      var top = chk >> 25;
      chk = (chk & 0x1ffffff) << 5 ^ value;
      for (var index = 0; index < 5; index += 1) {
        if ((top >> index) & 1) chk ^= generators[index];
      }
    });
    return chk;
  }

  function bech32HrpExpand(hrp) {
    var out = [];
    for (var index = 0; index < hrp.length; index += 1) out.push(hrp.charCodeAt(index) >> 5);
    out.push(0);
    for (var next = 0; next < hrp.length; next += 1) out.push(hrp.charCodeAt(next) & 31);
    return out;
  }

  function bech32CreateChecksum(hrp, data) {
    var values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    var polymod = bech32Polymod(values) ^ 1;
    var out = [];
    for (var index = 0; index < 6; index += 1) out.push((polymod >> (5 * (5 - index))) & 31);
    return out;
  }

  function bech32Encode(hrp, data) {
    var combined = data.concat(bech32CreateChecksum(hrp, data));
    return hrp + "1" + combined.map(function (value) {
      return BECH32_ALPHABET.charAt(value);
    }).join("");
  }

  function convertBits(data, fromBits, toBits, pad) {
    var acc = 0;
    var bits = 0;
    var result = [];
    var maxv = (1 << toBits) - 1;
    data.forEach(function (value) {
      if (value < 0 || value >> fromBits) throw new Error("Invalid bech32 value");
      acc = (acc << fromBits) | value;
      bits += fromBits;
      while (bits >= toBits) {
        bits -= toBits;
        result.push((acc >> bits) & maxv);
      }
    });
    if (pad) {
      if (bits > 0) result.push((acc << (toBits - bits)) & maxv);
    } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
      throw new Error("Invalid bech32 padding");
    }
    return result;
  }

  function bech32FromHex(hex, prefix, witnessVersion) {
    if (!isHex(hex) || !prefix) return "";
    var data = convertBits(bytesFromHex(hex), 8, 5, true);
    if (witnessVersion !== undefined) data = [witnessVersion].concat(data);
    return bech32Encode(prefix, data);
  }

  function bitcoinAddressFromStored(value) {
    var raw = text(value);
    if (!raw) return "";
    if (/^(bc1|[13])[a-z0-9]{20,90}$/i.test(raw)) return raw;
    if (isHex(raw)) {
      var bytes = bytesFromHex(raw);
      if (bytes.length === 20 || bytes.length === 32) return bech32FromHex(raw, "bc", 0);
    }
    return "";
  }

  function evmAddressFromStored(value) {
    var raw = text(value);
    if (/^0x[a-f0-9]{40}$/i.test(raw)) return raw;
    if (/^[a-f0-9]{40}$/i.test(raw)) return "0x" + raw.toLowerCase();
    return "";
  }

  function addressFromWords(words, chain) {
    if (!isObject(words) || !chain) return "";
    var value = "";
    if (chain.chainID === "Do-Chain") value = words["888"];
    else if (chain.kind === "bitcoin") value = words["0"];
    else if (chain.kind === "solana") value = words["501"];
    else if (chain.kind === "cardano") value = words["1815"];
    else if (chain.kind === "tron") value = words["195"];
    else if (chain.kind === "xrp") value = words["144"];
    else value = words[String(chain.coinType || "")];

    if (!value) return "";
    if (chain.kind === "bitcoin") return bitcoinAddressFromStored(value);
    if (chain.kind === "evm") return evmAddressFromStored(value);
    if (chain.kind === "solana" || chain.kind === "cardano" || chain.kind === "tron" || chain.kind === "xrp") {
      return looksLikeAddress(value) ? text(value) : "";
    }
    return chain.prefix ? bech32FromHex(value, chain.prefix) : "";
  }

  function chainAddressAliases(chain) {
    var aliases = [chain.chainID].concat(EXTRA_CHAIN_ALIASES[chain.chainID] || []);
    if (chain.chainID === "Do-Chain") aliases = aliases.concat(["888"]);
    if (chain.chainID === "secret-4") aliases = aliases.concat(["529"]);
    if (chain.chainID === "bitcoin-mainnet") aliases = aliases.concat(["0"]);
    if (chain.chainID === "solana-mainnet") aliases = aliases.concat(["501"]);
    if (chain.chainID === "cardano-mainnet") aliases = aliases.concat(["1815"]);
    if (chain.chainID === "tron-mainnet") aliases = aliases.concat(["195"]);
    if (chain.chainID === "xrp-ledger-mainnet") aliases = aliases.concat(["144"]);
    return aliases;
  }

  function addDerivedChainAddress(map, chain, address, authoritative) {
    if (!looksLikeAddress(address)) return;
    var current = text(map[chain.chainID]);
    if (current && lower(current) !== lower(address) && authoritative) {
      map[chain.chainID + "-preserved"] = current;
    }
    if (authoritative || !current) map[chain.chainID] = address;
    chainAddressAliases(chain).forEach(function (alias) {
      if (!map[alias]) map[alias] = address;
    });
  }

  function completeAllChainAddresses(wallet) {
    if (!isObject(wallet)) return {};
    var map = addressMap(wallet);
    var words = cleanMap(wallet.words, false);
    var hasWords = Object.keys(words).length > 0;
    if (hasWords) {
      DERIVED_CHAIN_EXPORTS.forEach(function (chain) {
        try {
          addDerivedChainAddress(map, chain, addressFromWords(words, chain), true);
        } catch (error) {}
      });
    }
    return map;
  }

  function seedPhraseRecoverability(wallet) {
    if (!wallet || !wallet.encryptedSeed) return undefined;
    return {
      type: "master-seed",
      oneMasterSeedPhrase: true,
      chainCount: DERIVED_CHAIN_EXPORTS.length,
      canRevealMasterSeedPhrase: Boolean(wallet.encryptedMnemonic),
      note: wallet.encryptedMnemonic
        ? "One encrypted master seed phrase derives every listed chain by its derivation path."
        : "This wallet has an encrypted master seed, but the original mnemonic was not stored by older builds. Re-import the phrase once to enable reveal."
    };
  }

  function utf8Bytes(value) {
    return new TextEncoder().encode(String(value || ""));
  }

  function utf8Text(bytes) {
    return new TextDecoder().decode(bytes);
  }

  function bytesToHex(bytes) {
    return Array.prototype.map.call(bytes, function (value) {
      return ("0" + value.toString(16)).slice(-2);
    }).join("");
  }

  function base64Bytes(value) {
    var raw = atob(String(value || ""));
    var out = new Uint8Array(raw.length);
    for (var index = 0; index < raw.length; index += 1) out[index] = raw.charCodeAt(index);
    return out;
  }

  function equalText(left, right) {
    if (left.length !== right.length) return false;
    var diff = 0;
    for (var index = 0; index < left.length; index += 1) {
      diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return diff === 0;
  }

  async function deriveCryptoBytes(password, salt, iterations, bytes) {
    var keyMaterial = await window.crypto.subtle.importKey("raw", utf8Bytes(password), "PBKDF2", false, ["deriveBits"]);
    var bits = await window.crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: iterations,
      hash: "SHA-1"
    }, keyMaterial, bytes * 8);
    return new Uint8Array(bits);
  }

  async function hmacSha256Hex(keyBytes, message) {
    var key = await window.crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    var signature = await window.crypto.subtle.sign("HMAC", key, utf8Bytes(message));
    return bytesToHex(new Uint8Array(signature));
  }

  async function aesCbcDecrypt(cipherBytes, keyBytes, ivBytes) {
    var key = await window.crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["decrypt"]);
    var plain = await window.crypto.subtle.decrypt({ name: "AES-CBC", iv: new Uint8Array(ivBytes) }, key, cipherBytes);
    return utf8Text(new Uint8Array(plain));
  }

  async function decryptWalletSecret(payload, password) {
    var encrypted = text(payload);
    if (!encrypted || !password) throw new Error("Incorrect password");
    if (!window.crypto || !window.crypto.subtle) throw new Error("Secure browser crypto is not available");
    if (encrypted.indexOf("v2:") !== 0) {
      var legacySalt = bytesFromHex(encrypted.substring(0, 32));
      var legacyIv = bytesFromHex(encrypted.substring(32, 64));
      var legacyCipher = base64Bytes(encrypted.substring(64));
      var legacyKey = await deriveCryptoBytes(password, legacySalt, 100, 32);
      var legacyPlain = await aesCbcDecrypt(legacyCipher, legacyKey, legacyIv);
      if (!legacyPlain || legacyPlain.length < 8) throw new Error("Incorrect password");
      return legacyPlain;
    }
    var parts = encrypted.split(":");
    if (parts.length !== 4 || parts[0] !== "v2") throw new Error("Incorrect password");
    var iterations = Number(parts[1]);
    var body = parts[2];
    var expectedMac = parts[3];
    if (!Number.isInteger(iterations) || iterations <= 0 || body.length < 64) throw new Error("Incorrect password");
    var salt = bytesFromHex(body.substring(0, 32));
    var iv = bytesFromHex(body.substring(32, 64));
    var cipher = base64Bytes(body.substring(64));
    var keyBytes = await deriveCryptoBytes(password, salt, iterations, 64);
    var encKey = keyBytes.slice(0, 32);
    var macKey = keyBytes.slice(32, 64);
    var actualMac = await hmacSha256Hex(macKey, body);
    if (!equalText(actualMac, expectedMac)) throw new Error("Incorrect password");
    var plain = await aesCbcDecrypt(cipher, encKey, iv);
    if (!plain || plain.length < 8) throw new Error("Incorrect password");
    return plain;
  }

  function chainAddressForWallet(wallet, chain) {
    if (!isObject(wallet) || !chain) return "";
    var normalized = completeWalletForAllChains(wallet);
    var addresses = addressMap(normalized);
    var aliases = chainAddressAliases(chain).concat([
      chain.chainID + "-preserved",
      chain.chainID + "-legacy",
      chain.chainID + "-native",
      chain.chainID + "-imported"
    ]);
    for (var index = 0; index < aliases.length; index += 1) {
      var value = text(addresses[aliases[index]]);
      if (looksLikeAddress(value)) return value;
    }
    try {
      return addressFromWords(normalized.words, chain) || "";
    } catch (error) {
      return "";
    }
  }

  function normalizedWalletIndex(wallet) {
    var index = Number(wallet && wallet.index);
    if (!Number.isFinite(index) || index < 0) return 0;
    return Math.floor(index);
  }

  function bitcoinPathForIndex(index) {
    return "m/84'/0'/0'/0/" + normalizedWalletIndex({ index: index });
  }

  function legacyBitcoinPathForIndex(index) {
    return "m/44'/0'/0'/0/" + normalizedWalletIndex({ index: index });
  }

  function chainCoinTypeForWallet(wallet, chain) {
    if (!chain) return "";
    if ((chain.chainID === "columbus-5" || chain.chainID === "phoenix-1") && wallet && wallet.legacy) return "118";
    return String(chain.coinType || "");
  }

  function derivationPathForWallet(wallet, chain) {
    if (!chain) return "";
    var index = normalizedWalletIndex(wallet);
    if (chain.chainID === "bitcoin-mainnet") return bitcoinPathForIndex(index);
    if (chain.kind === "solana") return "m/44'/501'/" + index + "'/0'";
    if (chain.kind === "cardano") {
      return "m/1852'/1815'/" + index + "'/0/0 + m/1852'/1815'/" + index + "'/2/0";
    }
    var coinType = chainCoinTypeForWallet(wallet, chain);
    if (!coinType) return chain.path || "";
    return "m/44'/" + coinType + "'/0'/0/" + index;
  }

  function bitcoinAddressFromBip84Seed(seedHex, index) {
    try {
      if (!seedHex || typeof window.doWalletBitcoinBip84FromSeed !== "function") return "";
      var derived = window.doWalletBitcoinBip84FromSeed(seedHex, index);
      if (isObject(derived)) {
        if (looksLikeAddress(text(derived.address))) return text(derived.address);
        if (derived.hash) return bitcoinAddressFromStored(derived.hash);
      }
      if (typeof derived === "string") return bitcoinAddressFromStored(derived);
    } catch (error) {}
    return "";
  }

  function legacyBitcoinAddressForWallet(wallet) {
    var words = cleanMap(wallet && wallet.words, false);
    var legacyStored = words && (words["0-legacy-do-wallet"] || words["bitcoin-mainnet-legacy"] || words["bitcoin-legacy"]);
    return legacyStored ? bitcoinAddressFromStored(legacyStored) : "";
  }

  async function revealMasterSeedPhrase(options) {
    var name = text(options && options.name);
    var walletIndex = Number(options && options.walletIndex);
    var seedToken = text(options && options.seedToken);
    var password = String(options && options.password || "");
    var rawWallets = parseKeysRaw(readRaw(KEYS_KEY) || "[]");
    var candidateWallets = seedWalletCandidates();
    var wallet = seedToken
      ? candidateWallets.filter(function (item) {
        return text(item.__seedRevealToken) === seedToken;
      })[0]
      : null;
    if (!wallet && Number.isInteger(walletIndex)) {
      wallet = candidateWallets.filter(function (item) {
        return Number(item.__seedRevealIndex) === walletIndex && text(item.__seedRevealSource) === "keys";
      })[0] || null;
    }
    var wallets = rawWallets.filter(function (item) {
      return isObject(item) && item.encryptedSeed && text(item.name) === name;
    });
    if (!wallet && Number.isInteger(walletIndex) && isObject(rawWallets[walletIndex]) && rawWallets[walletIndex].encryptedSeed) {
      wallet = rawWallets[walletIndex];
    }
    if (!wallet) wallet = wallets[0];
    if (!wallet) throw new Error("Seed wallet not found");
    if (!wallet.encryptedSeed) {
      throw new Error("This wallet was not created from a stored Do-Wallet seed. Back it up or export it separately.");
    }
    if (!wallet.encryptedMnemonic) {
      throw new Error("This wallet was saved before master phrase reveal was enabled. Re-import the seed phrase once to enable reveal.");
    }
    var mnemonic = await decryptWalletSecret(wallet.encryptedMnemonic, password);
    var seedHex = "";
    try {
      seedHex = await decryptWalletSecret(wallet.encryptedSeed, password);
    } catch (error) {}
    var normalizedWallet = completeWalletForAllChains(wallet);
    var walletIndexForPaths = normalizedWalletIndex(normalizedWallet);
    var chains = DERIVED_CHAIN_EXPORTS.map(function (chain) {
      var isBitcoin = chain.chainID === "bitcoin-mainnet";
      var path = derivationPathForWallet(normalizedWallet, chain);
      var address = isBitcoin
        ? (bitcoinAddressFromBip84Seed(seedHex, walletIndexForPaths) || chainAddressForWallet(normalizedWallet, chain))
        : chainAddressForWallet(normalizedWallet, chain);
      return {
        chainID: chain.chainID,
        label: chain.label,
        coinType: chain.coinType,
        address: address,
        derivationPath: path,
        path: path
      };
    });
    var legacyBitcoinAddress = legacyBitcoinAddressForWallet(normalizedWallet);
    var primaryBitcoin = chains.filter(function (chain) {
      return chain.chainID === "bitcoin-mainnet";
    })[0];
    if (legacyBitcoinAddress && (!primaryBitcoin || lower(primaryBitcoin.address) !== lower(legacyBitcoinAddress))) {
      chains.push({
        chainID: "bitcoin-mainnet-legacy-do-wallet",
        label: "Bitcoin (legacy Do-Wallet path)",
        coinType: "0",
        address: legacyBitcoinAddress,
        derivationPath: legacyBitcoinPathForIndex(walletIndexForPaths),
        path: legacyBitcoinPathForIndex(walletIndexForPaths)
      });
    }
    return {
      type: "master-seed",
      walletName: walletName(normalizedWallet),
      mnemonic: mnemonic,
      chains: chains
    };
  }

  function completeWalletForAllChains(wallet) {
    if (!isObject(wallet)) return wallet;
    var next = Object.assign({}, wallet);
    var addresses = completeAllChainAddresses(next);
    if (Object.keys(addresses).length) {
      next.addresses = addresses;
      next.addressMap = addresses;
      next.allAddresses = addresses;
      next.address = addresses["Do-Chain"] || addresses["dochain-1"] || addresses.do || addresses.dochain || text(next.address) || primaryAddress(next);
    }
    if (next.encryptedSeed) {
      next.seedPhraseRecoverability = seedPhraseRecoverability(next);
      next.chainExportOptions = DERIVED_CHAIN_EXPORTS.map(function (chain) {
        return {
          chainID: chain.chainID,
          label: chain.label,
          derivationPath: derivationPathForWallet(next, chain),
          export: chain.export
        };
      });
    }
    return next;
  }

  function readRaw(key) {
    try {
      return nativeGetItem.call(window.localStorage, key);
    } catch (error) {
      return null;
    }
  }

  function writeRaw(key, value) {
    try {
      nativeSetItem.call(window.localStorage, key, String(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function writeJSON(key, value) {
    try {
      return writeRaw(key, JSON.stringify(value));
    } catch (error) {
      return false;
    }
  }

  function safeJSON(raw) {
    try {
      if (!raw || typeof raw !== "string" || raw.length > MAX_JSON) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function readJSON(key) {
    return safeJSON(readRaw(key));
  }

  function objectValues(value) {
    if (!isObject(value)) return [];
    var metadata = {
      version: true,
      source: true,
      updatedAt: true,
      createdAt: true,
      selectedAt: true,
      active: true
    };
    return Object.keys(value).map(function (key) {
      if (metadata[key]) return null;
      var item = value[key];
      if (typeof item === "string" && /^[\[{]/.test(item.trim())) {
        item = safeJSON(item) || item;
      }
      if (!isObject(item)) return null;
      if (!text(item.name) && !text(item.walletName)) {
        item = Object.assign({ name: key, walletName: key }, item);
      }
      return item;
    }).filter(Boolean);
  }

  function parseKeysRaw(raw) {
    if (!raw || String(raw).length > MAX_JSON) return [];
    var parsed = safeJSON(String(raw));
    if (Array.isArray(parsed)) return parsed.filter(isObject);
    if (!isObject(parsed)) return [];
    if (Array.isArray(parsed.value)) return parsed.value.filter(isObject);
    if (typeof parsed.value === "string") return parseKeysRaw(parsed.value);
    if (isObject(parsed.value)) return objectValues(parsed.value);
    if (Array.isArray(parsed.keys)) return parsed.keys.filter(isObject);
    if (isObject(parsed.keys)) return objectValues(parsed.keys);
    if (Array.isArray(parsed.wallets)) return parsed.wallets.filter(isObject);
    if (isObject(parsed.wallets)) return objectValues(parsed.wallets);
    if (Array.isArray(parsed.accounts)) return parsed.accounts.filter(isObject);
    if (isObject(parsed.accounts)) return objectValues(parsed.accounts);
    return objectValues(parsed);
  }

  function cleanMap(map, includeAddressesOnly) {
    var result = {};
    if (!isObject(map)) return result;
    Object.keys(map).forEach(function (key) {
      var value = text(map[key]);
      if (!key || !value) return;
      if (includeAddressesOnly && !looksLikeAddress(value)) return;
      result[key] = value;
    });
    return result;
  }

  function mergeMap(left, right, includeAddressesOnly) {
    var merged = cleanMap(left, includeAddressesOnly);
    var next = cleanMap(right, includeAddressesOnly);
    Object.keys(next).forEach(function (key) {
      merged[key] = next[key];
    });
    return Object.keys(merged).length ? merged : undefined;
  }

  function addressMatchesRule(address, rule) {
    var value = text(address);
    if (!looksLikeAddress(value)) return false;
    return !rule.prefix || rule.prefix.test(value);
  }

  function firstChainAddress(addresses, rule) {
    var map = cleanMap(addresses, true);
    for (var index = 0; index < rule.aliases.length; index += 1) {
      var value = text(map[rule.aliases[index]]);
      if (addressMatchesRule(value, rule)) return value;
    }

    if (rule.prefix && rule.chainID !== "solana-mainnet" && rule.chainID !== "cardano-mainnet") {
      var keys = Object.keys(map);
      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        var candidate = text(map[keys[keyIndex]]);
        if (addressMatchesRule(candidate, rule)) return candidate;
      }
    }

    return "";
  }

  function firstDoAddress(addresses) {
    var doRule = CHAIN_ADDRESS_RULES.filter(function (rule) {
      return rule.chainID === "Do-Chain";
    })[0];
    return doRule ? firstChainAddress(addresses, doRule) : "";
  }

  function mergeAddressMapsPreservingConflicts(existingWallet, incomingWallet) {
    var oldAddresses = mergeMap(existingWallet && existingWallet.addresses, existingWallet && existingWallet.addressMap, true);
    var newAddresses = mergeMap(incomingWallet && incomingWallet.addresses, incomingWallet && incomingWallet.addressMap, true);
    var merged = mergeMap(oldAddresses, newAddresses, true) || {};
    var conflicts = [];

    CHAIN_ADDRESS_RULES.forEach(function (rule) {
      var oldAddress = firstChainAddress(oldAddresses, rule);
      var newAddress = firstChainAddress(newAddresses, rule);
      if (!oldAddress || !newAddress || lower(oldAddress) === lower(newAddress)) return;

      merged[rule.chainID] = oldAddress;
      merged[rule.chainID + "-preserved"] = oldAddress;
      merged[rule.chainID + "-native"] = newAddress;
      merged[rule.chainID + "-imported"] = newAddress;
      conflicts.push({
        chainID: rule.chainID,
        label: rule.label,
        preservedPrimary: oldAddress,
        importedNative: newAddress,
        note: "Same wallet matched on other chains but this chain address differs; keeping the previously stored address as primary."
      });
    });

    return {
      addresses: Object.keys(merged).length ? merged : undefined,
      conflicts: conflicts
    };
  }

  function addressMap(wallet) {
    var addresses = {};
    [wallet && wallet.addresses, wallet && wallet.addressMap, wallet && wallet.allAddresses].forEach(function (map) {
      var cleaned = cleanMap(map, true);
      Object.keys(cleaned).forEach(function (key) {
        addresses[key] = cleaned[key];
      });
    });
    if (looksLikeAddress(wallet && wallet.address)) addresses.address = text(wallet.address);
    return addresses;
  }

  function addressValues(wallet) {
    var map = addressMap(wallet);
    return Object.keys(map).map(function (key) {
      return lower(map[key]);
    }).filter(Boolean);
  }

  function primaryAddress(wallet) {
    var addresses = addressMap(wallet);
    var priority = [
      "Do-Chain", "888", "do", "dochain",
      "columbus-5", "330", "dungeon-1", "secret-4",
      "bitcoin-mainnet", "0", "ethereum-mainnet", "60", "solana-mainnet", "501"
    ];
    for (var index = 0; index < priority.length; index += 1) {
      if (looksLikeAddress(addresses[priority[index]])) return text(addresses[priority[index]]);
    }
    if (looksLikeAddress(wallet && wallet.address)) return text(wallet.address);
    var values = Object.keys(addresses).map(function (key) { return addresses[key]; });
    return values.find(looksLikeAddress) || "";
  }

  function walletName(wallet) {
    return text(wallet && (wallet.name || wallet.walletName || wallet.accountName || wallet.label)) || "Do-Wallet";
  }

  function hasEncryptedMap(wallet) {
    return isObject(wallet && wallet.encrypted) || typeof (wallet && wallet.encrypted) === "string";
  }

  function walletKind(wallet) {
    if (!isObject(wallet)) return "unknown";
    if (wallet.ledger) return "ledger";
    if (wallet.multisig) return "multisig";
    if (wallet.encryptedSeed) return "master-seed";
    if (hasEncryptedMap(wallet)) return "chain-private-keys";
    if (wallet.wallet) return "legacy-single-key";
    if (wallet.external) return "external";
    return "address-only";
  }

  function signableToken(wallet) {
    if (!isObject(wallet)) return "";
    if (wallet.encryptedSeed) return "seed:" + String(wallet.encryptedSeed);
    if (typeof wallet.wallet === "string") return "wallet:" + wallet.wallet;
    if (typeof wallet.encrypted === "string") return "encrypted:" + wallet.encrypted;
    if (isObject(wallet.encrypted)) {
      return "encrypted:" + Object.keys(wallet.encrypted).sort().map(function (key) {
        return key + "=" + text(wallet.encrypted[key]).slice(0, 48);
      }).join(",");
    }
    if (wallet.ledger) return "ledger:" + walletName(wallet) + ":" + String(wallet.index || 0);
    if (wallet.multisig) return "multisig:" + walletName(wallet) + ":" + primaryAddress(wallet);
    return "";
  }

  function walletsOverlap(left, right) {
    var leftAddresses = addressValues(left);
    var rightAddresses = addressValues(right);
    if (leftAddresses.length && rightAddresses.length) {
      for (var index = 0; index < leftAddresses.length; index += 1) {
        if (rightAddresses.indexOf(leftAddresses[index]) >= 0) return true;
      }
    }
    var leftToken = signableToken(left);
    var rightToken = signableToken(right);
    if (leftToken && rightToken && leftToken === rightToken) return true;
    var leftName = lower(walletName(left));
    var rightName = lower(walletName(right));
    return Boolean(leftName && rightName && leftName === rightName && !leftAddresses.length && !rightAddresses.length && walletKind(left) === walletKind(right));
  }

  function mergeWallet(existing, incoming) {
    var merged = Object.assign({}, existing || {}, incoming || {});
    var addressMerge = mergeAddressMapsPreservingConflicts(existing, incoming);
    var addresses = addressMerge.addresses;
    if (addresses) {
      merged.addresses = addresses;
      merged.addressMap = addresses;
    }

    if (addressMerge.conflicts && addressMerge.conflicts.length) {
      merged.chainDerivationConflicts = addressMerge.conflicts;
      var doConflict = addressMerge.conflicts.filter(function (conflict) {
        return conflict.chainID === "Do-Chain";
      })[0];
      if (doConflict) {
        merged.doChainDerivationConflict = doConflict;
      }
    }

    var words = mergeMap(existing && existing.words, incoming && incoming.words, false);
    var oldWords = cleanMap(existing && existing.words, false);
    var newWords = cleanMap(incoming && incoming.words, false);
    if (words && oldWords && newWords && oldWords["0"] && newWords["0"] && lower(oldWords["0"]) !== lower(newWords["0"]) && !words["0-legacy-do-wallet"]) {
      words["0-legacy-do-wallet"] = oldWords["0"];
    }
    if (words) merged.words = words;
    var pubkey = mergeMap(existing && existing.pubkey, incoming && incoming.pubkey, false);
    if (pubkey) merged.pubkey = pubkey;
    var encrypted = mergeMap(existing && existing.encrypted, incoming && incoming.encrypted, false);
    if (encrypted) merged.encrypted = encrypted;

    ["encryptedSeed", "encryptedMnemonic", "wallet", "mfa", "ledger", "multisig", "index", "legacy", "lock", "seedPhraseRecoverability", "chainExportOptions"].forEach(function (key) {
      if (incoming && incoming[key] !== undefined && incoming[key] !== "") {
        merged[key] = incoming[key];
      } else if (existing && existing[key] !== undefined && existing[key] !== "") {
        merged[key] = existing[key];
      }
    });

    merged = completeWalletForAllChains(merged);
    merged.name = walletName(merged);
    merged.walletName = text(merged.walletName) || merged.name;
    merged.address = primaryAddress(merged) || text(merged.address) || undefined;
    merged.doWalletRecoverability = recoverability(merged);
    merged.updatedAt = Date.now();

    Object.keys(merged).forEach(function (key) {
      if (merged[key] === undefined || merged[key] === "") delete merged[key];
    });
    return merged;
  }

  function recoverability(wallet) {
    var kind = walletKind(wallet);
    if (kind === "master-seed") {
      return {
        type: "master-seed",
        recoverableFromDoSeed: true,
        separateBackupRequired: false,
        oneMasterSeedPhrase: true,
        seedPhraseRecoverability: seedPhraseRecoverability(wallet),
        exportOptions: DERIVED_CHAIN_EXPORTS.map(function (chain) {
          var path = derivationPathForWallet(wallet, chain);
          return {
            chainID: chain.chainID,
            label: chain.label,
            coinType: chain.coinType,
            prefix: chain.prefix,
            kind: chain.kind,
            path: path,
            derivationPath: path,
            export: chain.export
          };
        })
      };
    }
    if (kind === "chain-private-keys" || kind === "legacy-single-key") {
      return {
        type: kind,
        recoverableFromDoSeed: false,
        separateBackupRequired: true,
        note: "Back up or export this wallet separately; it was not created from the Do-Wallet seed."
      };
    }
    if (kind === "ledger" || kind === "multisig" || kind === "external") {
      return {
        type: kind,
        recoverableFromDoSeed: false,
        separateBackupRequired: true
      };
    }
    return {
      type: kind,
      recoverableFromDoSeed: false,
      separateBackupRequired: true,
      note: "Address-only record; keep the original wallet backup."
    };
  }

  function uniquifyNames(wallets) {
    var used = {};
    return wallets.map(function (wallet) {
      var next = Object.assign({}, wallet);
      var base = walletName(next);
      var key = lower(base);
      if (!used[key]) {
        used[key] = 1;
        next.name = base;
        next.walletName = text(next.walletName) || base;
        return next;
      }
      used[key] += 1;
      next.originalName = text(next.originalName) || base;
      next.name = base + " (" + used[key] + ")";
      next.walletName = next.name;
      return next;
    });
  }

  function mergeWalletLists(existing, incoming) {
    var merged = [];
    (Array.isArray(existing) ? existing : []).forEach(function (wallet) {
      if (isObject(wallet)) merged.push(mergeWallet(null, wallet));
    });

    (Array.isArray(incoming) ? incoming : []).forEach(function (wallet) {
      if (!isObject(wallet)) return;
      var match = -1;
      for (var index = 0; index < merged.length; index += 1) {
        if (walletsOverlap(merged[index], wallet)) {
          match = index;
          break;
        }
      }
      if (match >= 0) {
        merged[match] = mergeWallet(merged[match], wallet);
      } else {
        merged.push(mergeWallet(null, wallet));
      }
    });

    return uniquifyNames(merged).slice(0, MAX_KEYS);
  }

  function quickHash(value) {
    var hash = 2166136261;
    var raw = String(value || "");
    for (var index = 0; index < raw.length; index += 1) {
      hash ^= raw.charCodeAt(index);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ("0000000" + (hash >>> 0).toString(16)).slice(-8);
  }

  function backupKeysRaw(raw, reason) {
    if (!raw) return;
    var list = parseKeysRaw(raw);
    if (!list.length) return;
    var payload = readJSON(BACKUP_KEY);
    var backups = payload && Array.isArray(payload.backups) ? payload.backups.slice() : [];
    var hash = quickHash(raw);
    if (backups.some(function (backup) { return backup.hash === hash; })) return;
    backups.unshift({
      createdAt: Date.now(),
      reason: reason || "keys-write",
      hash: hash,
      walletCount: list.length,
      raw: raw.length <= MAX_BACKUP_RAW ? raw : undefined,
      rawOmitted: raw.length > MAX_BACKUP_RAW
    });
    backups = backups.slice(0, MAX_BACKUPS);
    if (!writeJSON(BACKUP_KEY, { version: 1, updatedAt: Date.now(), backups: backups })) {
      backups.forEach(function (backup) { delete backup.raw; backup.rawOmitted = true; });
      writeJSON(BACKUP_KEY, { version: 1, updatedAt: Date.now(), backups: backups });
    }
  }

  function chainLabelsForWallet(wallet) {
    var labels = {};
    var addresses = addressMap(wallet);
    Object.keys(addresses).forEach(function (key) {
      var label = CHAIN_LABELS[key] || key;
      labels[label] = true;
    });
    if (isObject(wallet && wallet.words)) {
      Object.keys(wallet.words).forEach(function (key) {
        var label = CHAIN_LABELS[key] || key;
        labels[label] = true;
      });
    }
    if (wallet && wallet.encryptedSeed) {
      DERIVED_CHAIN_EXPORTS.forEach(function (chain) {
        labels[chain.label] = true;
      });
    }
    return Object.keys(labels).sort();
  }

  function doChainAddressesForWallet(wallet) {
    var addresses = addressMap(wallet);
    var labels = {
      "Do-Chain": "primary",
      "Do-Chain-preserved": "preserved",
      "Do-Chain-legacy": "legacy",
      "Do-Chain-native": "native",
      "Do-Chain-imported": "imported",
      "888": "coin-type-888",
      do: "do-alias",
      dochain: "dochain-alias"
    };
    var seen = {};
    return Object.keys(labels).map(function (key) {
      var address = text(addresses[key]);
      if (!/^do1/i.test(address) || seen[address.toLowerCase()]) return null;
      seen[address.toLowerCase()] = true;
      return {
        role: labels[key],
        address: address
      };
    }).filter(Boolean);
  }

  function chainDerivationConflictsForWallet(wallet) {
    if (Array.isArray(wallet && wallet.chainDerivationConflicts)) return wallet.chainDerivationConflicts;
    if (isObject(wallet && wallet.doChainDerivationConflict)) return [wallet.doChainDerivationConflict];
    return [];
  }

  function safeWalletSummary(wallet, index) {
    var rec = recoverability(wallet);
    return {
      index: index,
      name: walletName(wallet),
      primaryAddress: primaryAddress(wallet),
      chains: chainLabelsForWallet(wallet),
      addressCount: addressValues(wallet).length,
      walletType: rec.type,
      recoverableFromDoSeed: rec.recoverableFromDoSeed === true,
      separateBackupRequired: rec.separateBackupRequired === true,
      hasEncryptedSeed: Boolean(wallet && wallet.encryptedSeed),
      hasEncryptedMnemonic: Boolean(wallet && wallet.encryptedMnemonic),
      seedPhraseRecoverability: seedPhraseRecoverability(wallet),
      hasEncryptedChainKeys: hasEncryptedMap(wallet),
      hasLegacySingleKey: Boolean(wallet && wallet.wallet),
      hasLedger: Boolean(wallet && wallet.ledger),
      hasMultisig: Boolean(wallet && wallet.multisig),
      hasMfa: Boolean(wallet && wallet.mfa && wallet.mfa.enabled),
      doChainAddresses: doChainAddressesForWallet(wallet),
      doChainDerivationConflict: isObject(wallet && wallet.doChainDerivationConflict) ? wallet.doChainDerivationConflict : undefined,
      chainDerivationConflicts: chainDerivationConflictsForWallet(wallet),
      exportOptions: wallet && wallet.encryptedSeed ? DERIVED_CHAIN_EXPORTS.map(function (chain) {
        return {
          chainID: chain.chainID,
          label: chain.label,
          derivationPath: derivationPathForWallet(wallet, chain),
          export: chain.export
        };
      }) : undefined
    };
  }

  function publishInventory(wallets, meta) {
    var list = Array.isArray(wallets) ? wallets : [];
    var summaries = list.map(safeWalletSummary);
    var payload = {
      version: 1,
      source: "dochain-wallet-import-merge-guard-20260620",
      updatedAt: Date.now(),
      walletCount: summaries.length,
      seedRecoverableWallets: summaries.filter(function (wallet) { return wallet.recoverableFromDoSeed; }).length,
      separateBackupRequiredWallets: summaries.filter(function (wallet) { return wallet.separateBackupRequired; }).length,
      wallets: summaries,
      meta: isObject(meta) ? meta : {}
    };
    writeJSON(INVENTORY_KEY, payload);
    try {
      window.__DO_WALLET_BACKUP_INVENTORY__ = payload;
      document.documentElement.setAttribute("data-do-wallet-backup-inventory", String(payload.walletCount));
      window.dispatchEvent(new CustomEvent("do_wallet_backup_inventory_update", { detail: payload }));
    } catch (error) {}
  }

  function publishRecoveredSummaries(wallets) {
    var existing = readJSON(RECOVERED_KEY);
    var existingWallets = existing && Array.isArray(existing.wallets) ? existing.wallets : [];
    var summaries = wallets.map(function (wallet) {
      var addresses = addressMap(wallet);
      return {
        name: walletName(wallet),
        walletName: walletName(wallet),
        address: primaryAddress(wallet),
        addresses: addresses,
        addressMap: addresses,
        external: !wallet.encryptedSeed && !hasEncryptedMap(wallet) && !wallet.wallet,
        source: "do-wallet-import-merge-guard-summary",
        walletSource: "local-keys-summary",
        doWalletRecoverability: recoverability(wallet),
        doChainDerivationConflict: isObject(wallet && wallet.doChainDerivationConflict) ? wallet.doChainDerivationConflict : undefined,
        chainDerivationConflicts: chainDerivationConflictsForWallet(wallet)
      };
    }).filter(function (wallet) {
      return wallet.address || Object.keys(wallet.addresses).length;
    });

    var merged = [];
    var seen = {};
    existingWallets.concat(summaries).forEach(function (wallet) {
      var key = [
        lower(wallet.name || wallet.walletName),
        lower(wallet.address || primaryAddress(wallet)),
        Object.keys(wallet.addresses || {}).sort().map(function (chain) {
          return chain + "=" + lower(wallet.addresses[chain]);
        }).join(",")
      ].join("|");
      if (seen[key]) return;
      seen[key] = true;
      merged.push(wallet);
    });

    if (merged.length) {
      writeJSON(RECOVERED_KEY, {
        version: 1,
        source: "do-wallet-import-merge-guard-summary",
        updatedAt: Date.now(),
        wallets: merged
      });
    }
  }

  function mergeKeysWrite(value, reason) {
    var existingRaw = readRaw(KEYS_KEY) || "[]";
    var incomingRaw = String(value || "[]");
    var existing = parseKeysRaw(existingRaw);
    var incoming = parseKeysRaw(incomingRaw);

    if (!existing.length && !incoming.length) {
      return incomingRaw;
    }

    if (existing.length) backupKeysRaw(existingRaw, reason || "before-keys-write");

    var merged = mergeWalletLists(existing, incoming);
    var mergedRaw = JSON.stringify(merged);
    var preserved = Math.max(0, merged.length - incoming.length);
    var status = {
      version: 1,
      source: "dochain-wallet-import-merge-guard-20260620",
      updatedAt: Date.now(),
      reason: reason || "keys-write",
      existingCount: existing.length,
      incomingCount: incoming.length,
      mergedCount: merged.length,
      preservedCount: preserved,
      incomingHash: quickHash(incomingRaw),
      mergedHash: quickHash(mergedRaw)
    };
    writeJSON(STATUS_KEY, status);
    publishInventory(merged, status);
    publishRecoveredSummaries(merged);
    return mergedRaw;
  }

  function storageIsLocal(storage) {
    return storage === window.localStorage;
  }

  function installStorageGuard() {
    var proto = window.Storage && window.Storage.prototype;
    if (!proto || proto.__doWalletImportMergeGuard20260620) return;

    nativeGetItem = proto.getItem;
    nativeSetItem = proto.setItem;
    nativeRemoveItem = proto.removeItem;
    nativeClear = proto.clear;

    Object.defineProperty(proto, "__doWalletImportMergeGuard20260620", {
      value: true,
      configurable: false,
      enumerable: false
    });

    proto.setItem = function (key, value) {
      if (storageIsLocal(this) && String(key || "") === KEYS_KEY) {
        return nativeSetItem.call(this, key, mergeKeysWrite(value, "setItem(keys)"));
      }
      return nativeSetItem.call(this, key, value);
    };

    proto.removeItem = function (key) {
      return nativeRemoveItem.call(this, key);
    };

    proto.clear = function () {
      return nativeClear.call(this);
    };

    try {
      Object.defineProperty(window.localStorage, KEYS_KEY, {
        configurable: true,
        enumerable: false,
        get: function () {
          return nativeGetItem.call(window.localStorage, KEYS_KEY);
        },
        set: function (value) {
          nativeSetItem.call(window.localStorage, KEYS_KEY, mergeKeysWrite(value, "property-set(keys)"));
        }
      });
    } catch (error) {}
  }

  function normalizeWalletRecord(wallet) {
    if (!isObject(wallet)) return null;
    var next = completeWalletForAllChains(wallet);
    next.name = walletName(next);
    next.walletName = text(next.walletName) || next.name;
    next.address = primaryAddress(next) || text(next.address) || undefined;
    next.doWalletRecoverability = recoverability(next);
    Object.keys(next).forEach(function (key) {
      if (next[key] === undefined || next[key] === "") delete next[key];
    });
    return next;
  }

  function writeRawIfChanged(key, value) {
    var raw = JSON.stringify(value);
    if (readRaw(key) === raw) return false;
    try {
      nativeSetItem.call(window.localStorage, key, raw);
      return true;
    } catch (error) {
      return false;
    }
  }

  function normalizeKeysStorage() {
    var raw = readRaw(KEYS_KEY);
    var wallets = parseKeysRaw(raw || "[]").map(normalizeWalletRecord).filter(Boolean);
    if (!wallets.length) return [];
    writeRawIfChanged(KEYS_KEY, wallets);
    return wallets;
  }

  function normalizeWalletPayload(payload) {
    if (!isObject(payload)) return payload;
    if (isObject(payload.wallet)) {
      var wallet = normalizeWalletRecord(payload.wallet);
      if (!wallet) return payload;
      return Object.assign({}, payload, {
        wallet: wallet,
        addresses: wallet.addresses || payload.addresses,
        addressMap: wallet.addressMap || payload.addressMap,
        updatedAt: payload.updatedAt || Date.now()
      });
    }
    return normalizeWalletRecord(payload) || payload;
  }

  function normalizeWalletStorageKey(key) {
    var payload = readJSON(key);
    if (!payload) return false;
    var normalized = normalizeWalletPayload(payload);
    return writeRawIfChanged(key, normalized);
  }

  function normalizeRecoveredWallets() {
    var payload = readJSON(RECOVERED_KEY);
    if (!payload || !Array.isArray(payload.wallets)) return false;
    var wallets = payload.wallets.map(normalizeWalletRecord).filter(Boolean);
    return writeRawIfChanged(RECOVERED_KEY, Object.assign({}, payload, {
      source: text(payload.source) || "do-wallet-import-merge-guard-summary",
      wallets: wallets
    }));
  }

  function normalizeKnownWalletStorage() {
    normalizeWalletStorageKey(USER_KEY);
    normalizeWalletStorageKey("do-wallet-selected-recovered-wallet.v1");
    normalizeWalletStorageKey("do-wallet-bridge-wallet");
    normalizeWalletStorageKey("do-wallet-extension-authority.v1");
    normalizeRecoveredWallets();
  }

  function shortAddressForSeedReveal(address) {
    var value = text(address);
    if (value.length <= 18) return value;
    return value.slice(0, 8) + "..." + value.slice(-6);
  }

  function seedRevealStatus(wallet) {
    if (!isObject(wallet)) return "not seed-backed";
    if (wallet.encryptedSeed && wallet.encryptedMnemonic) return "ready";
    if (wallet.encryptedSeed) return "re-import required";
    if (hasEncryptedMap(wallet) || wallet.wallet) return "private-key wallet";
    if (wallet.ledger) return "ledger wallet";
    if (wallet.multisig) return "multisig wallet";
    return "not seed-backed";
  }

  function seedRevealToken(wallet, source, index) {
    return [
      source || "",
      Number.isFinite(Number(index)) ? String(index) : "",
      signableToken(wallet),
      lower(walletName(wallet)),
      lower(primaryAddress(wallet))
    ].join("|");
  }

  function seedRevealNameForDedupe(wallet) {
    return lower(walletName(wallet).replace(/\s+\(\d+\)$/g, ""));
  }

  function seedRevealDedupeKey(wallet) {
    var address = lower(primaryAddress(wallet));
    var name = seedRevealNameForDedupe(wallet);
    if (address && name) return name + ":" + address;
    if (address) return "address:" + address;
    return signableToken(wallet) || (name + ":" + text(wallet && wallet.encryptedSeed).slice(0, 80));
  }

  function seedWalletCandidates() {
    var candidates = [];
    function add(wallet, source, index) {
      if (!isObject(wallet)) return;
      var normalized = normalizeWalletRecord(wallet);
      if (!normalized) normalized = Object.assign({}, wallet);
      var name = walletName(normalized);
      var address = primaryAddress(normalized);
      if (!name && !address) return;
      var sourceName = text(source) || "storage";
      var token = seedRevealToken(normalized, sourceName, index);
      candidates.push(Object.assign({}, normalized, {
        name: name || shortAddressForSeedReveal(address) || "Do-Wallet",
        walletName: text(normalized.walletName) || name || "Do-Wallet",
        __seedRevealIndex: Number.isFinite(Number(index)) ? Number(index) : -1,
        __seedRevealSource: sourceName,
        __seedRevealToken: token,
        __seedRevealStatus: seedRevealStatus(normalized)
      }));
    }

    parseKeysRaw(readRaw(KEYS_KEY) || "[]").forEach(function (wallet, index) {
      add(wallet, "keys", index);
    });

    [
      [readJSON(USER_KEY), "user", -1],
      [readJSON("do-wallet-selected-recovered-wallet.v1"), "selected", -1],
      [readJSON("do-wallet-bridge-wallet"), "bridge", -1],
      [readJSON("do-wallet-extension-authority.v1"), "authority", -1]
    ].forEach(function (entry) {
      var payload = entry[0];
      var wallet = isObject(payload && payload.wallet) ? payload.wallet : payload;
      add(wallet, entry[1], entry[2]);
    });

    var recovered = readJSON(RECOVERED_KEY);
    if (recovered && Array.isArray(recovered.wallets)) {
      recovered.wallets.forEach(function (wallet, index) {
        add(wallet, "recovered", index);
      });
    }

    var seen = {};
    return candidates.filter(function (wallet) {
      var key = seedRevealDedupeKey(wallet) || text(wallet.__seedRevealToken);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (left, right) {
      var leftReady = left.encryptedSeed && left.encryptedMnemonic ? 0 : left.encryptedSeed ? 1 : 2;
      var rightReady = right.encryptedSeed && right.encryptedMnemonic ? 0 : right.encryptedSeed ? 1 : 2;
      return (leftReady - rightReady) || walletName(left).localeCompare(walletName(right));
    });
  }

  function seedWalletsForReveal() {
    var wallets = seedWalletCandidates();
    var seen = {};
    return wallets.filter(function (wallet) {
      var key = seedRevealDedupeKey(wallet) || text(wallet.__seedRevealToken) || lower(wallet.name) + ":" + text(wallet.encryptedSeed).slice(0, 80);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function activeWalletName() {
    var user = readJSON(USER_KEY);
    return text(user && (user.name || user.walletName));
  }

  function ensureSeedRevealStyles() {
    if (document.getElementById("do-wallet-seed-reveal-style")) return;
    var style = document.createElement("style");
    style.id = "do-wallet-seed-reveal-style";
    style.textContent = [
      ".do-wallet-seed-reveal{margin:18px 0 0;border:1px solid rgba(160,80,255,.34);border-radius:8px;background:rgba(18,10,32,.74);color:#fff;padding:16px;font-family:inherit}",
      ".do-wallet-seed-reveal [hidden]{display:none!important}",
      ".do-wallet-seed-reveal h2{margin:0 0 14px;font-size:18px;line-height:1.25;color:#fff}",
      ".do-wallet-seed-reveal__notice,.do-wallet-seed-reveal__empty{margin:0 0 14px;color:#cdbce8;font-size:12px;font-weight:var(--bold,500);line-height:1.45}",
      ".do-wallet-seed-reveal__empty{padding:10px 12px;border:1px solid rgba(160,80,255,.2);border-radius:8px;background:rgba(9,4,19,.5)}",
      ".do-wallet-seed-reveal form{display:grid;grid-template-columns:minmax(140px,1fr) minmax(160px,1fr) auto;gap:10px;align-items:end}",
      ".do-wallet-seed-reveal label{display:grid;gap:6px;font-size:12px;color:#cdbce8;font-weight:var(--bold,500)}",
      ".do-wallet-seed-reveal select,.do-wallet-seed-reveal input{min-height:40px;border:1px solid rgba(160,80,255,.38);border-radius:8px;background:#160f24;color:#fff;padding:0 10px;font:inherit}",
      ".do-wallet-seed-reveal button{min-height:40px;border:0;border-radius:8px;background:#9d3cff;color:#fff;font:inherit;font-size:13px;font-weight:var(--bold,500);line-height:1.2;padding:0 14px;cursor:pointer;white-space:nowrap}",
      ".do-wallet-seed-reveal button:disabled{opacity:.45;cursor:not-allowed}",
      ".do-wallet-seed-reveal button.secondary{background:rgba(143,60,255,.14);border:1px solid rgba(160,80,255,.45)}",
      ".do-wallet-seed-reveal__result{margin-top:14px;display:grid;gap:12px}",
      ".do-wallet-seed-reveal__summary{color:#cdbce8;font-size:12px;font-weight:var(--bold,500);line-height:1.45}",
      ".do-wallet-seed-reveal__top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:stretch}",
      ".do-wallet-seed-reveal__words{white-space:pre-wrap;word-break:break-word;border:1px solid rgba(160,80,255,.28);border-radius:8px;background:#090413;padding:12px;color:#fff;font:500 14px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}",
      ".do-wallet-seed-reveal__chains{max-height:360px;overflow:auto;border:1px solid rgba(160,80,255,.2);border-radius:8px}",
      ".do-wallet-seed-reveal__chain{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(180px,1.35fr) minmax(150px,1fr) auto;gap:10px;padding:10px;border-bottom:1px solid rgba(160,80,255,.16);font-size:12px;align-items:center}",
      ".do-wallet-seed-reveal__chain:last-child{border-bottom:0}",
      ".do-wallet-seed-reveal__chain strong{display:grid;gap:4px;font-weight:var(--bold,500);line-height:1.15}",
      ".do-wallet-seed-reveal__chain strong small{color:#a998cf;font-size:11px;font-weight:var(--bold,500)}",
      ".do-wallet-seed-reveal__address,.do-wallet-seed-reveal__path{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#d8c8ff;word-break:break-word}",
      ".do-wallet-seed-reveal__address{color:#fff}",
      ".do-wallet-seed-reveal__actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}",
      ".do-wallet-seed-reveal__actions button{min-height:32px;padding:0 10px;font-size:12px}",
      ".do-wallet-seed-reveal__error{margin-top:12px;color:#ffb4c4;font-weight:var(--bold,500)}",
      "@media (max-width:920px){.do-wallet-seed-reveal__chain{grid-template-columns:1fr}.do-wallet-seed-reveal__actions{justify-content:flex-start}}",
      "@media (max-width:720px){.do-wallet-seed-reveal form,.do-wallet-seed-reveal__top{grid-template-columns:1fr}}"
    ].join("");
    document.head.appendChild(style);
  }

  function seedRevealHost() {
    try {
      var path = window.location.pathname.replace(/\/+$/, "") || "/";
      if (path !== "/auth") return null;
    } catch (error) {
      return null;
    }
    var main = document.querySelector("main") || document.querySelector("#do-wallet") || document.body;
    if (!main || !/Manage wallets/i.test(text(main.textContent))) return null;
    return main;
  }

  function renderSeedRevealPanel() {
    var host = seedRevealHost();
    if (!host || host.querySelector(".do-wallet-seed-reveal")) return;
    var wallets = seedWalletsForReveal();
    ensureSeedRevealStyles();

    var selectedName = activeWalletName();
    var panel = document.createElement("section");
    panel.className = "do-wallet-seed-reveal";
    panel.innerHTML = [
      "<h2>Seed phrase export</h2>",
      "<div class=\"do-wallet-seed-reveal__notice\">Seed-created wallets use one master seed phrase. Each chain uses the same phrase with the derivation path shown after reveal.</div>",
      "<form" + (wallets.length ? "" : " hidden") + ">",
      "<label>Wallet<select name=\"wallet\"></select></label>",
      "<label>Password<input name=\"password\" type=\"password\" autocomplete=\"current-password\"></label>",
      "<button type=\"submit\">Show</button>",
      "</form>",
      "<div class=\"do-wallet-seed-reveal__empty\"" + (wallets.length ? " hidden" : "") + ">No wallet with a stored seed phrase was found in this browser. Import the wallet from its seed phrase once to enable seed phrase export here.</div>",
      "<div class=\"do-wallet-seed-reveal__error\" hidden></div>",
      "<div class=\"do-wallet-seed-reveal__result\" hidden>",
      "<div class=\"do-wallet-seed-reveal__summary\">One master seed phrase controls the chain wallets below. Use the phrase with the shown derivation path when importing elsewhere.</div>",
      "<div class=\"do-wallet-seed-reveal__top\">",
      "<code class=\"do-wallet-seed-reveal__words\"></code>",
      "<button type=\"button\" class=\"secondary\" data-copy-seed>Copy master seed</button>",
      "</div>",
      "<div class=\"do-wallet-seed-reveal__chains\"></div>",
      "</div>"
    ].join("");

    var select = panel.querySelector("select");
    wallets.forEach(function (wallet) {
      var option = document.createElement("option");
      option.value = String(wallet.__seedRevealIndex);
      option.setAttribute("data-wallet-name", wallet.name);
      option.setAttribute("data-seed-token", wallet.__seedRevealToken || "");
      var address = shortAddressForSeedReveal(primaryAddress(wallet));
      var status = seedRevealStatus(wallet);
      option.textContent = wallet.name + (address ? " - " + address : "") + (status === "ready" ? "" : " - " + status);
      if (selectedName && wallet.name === selectedName) option.selected = true;
      select.appendChild(option);
    });

    var form = panel.querySelector("form");
    var password = panel.querySelector("input[name='password']");
    var error = panel.querySelector(".do-wallet-seed-reveal__error");
    var result = panel.querySelector(".do-wallet-seed-reveal__result");
    var words = panel.querySelector(".do-wallet-seed-reveal__words");
    var chains = panel.querySelector(".do-wallet-seed-reveal__chains");
    var copy = panel.querySelector("[data-copy-seed]");
    var currentSeedPhrase = "";
    var currentChains = [];

    function showError(message) {
      error.textContent = message;
      error.hidden = false;
      result.hidden = true;
    }

    function markCopied(button, label) {
      var original = button.textContent;
      button.textContent = label || "Copied";
      window.setTimeout(function () { button.textContent = original; }, 1200);
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      error.hidden = true;
      try {
        if (typeof window.doWalletRevealMasterSeedPhrase !== "function") {
          showError("Seed phrase reveal is still loading. Try again in a moment.");
          return;
        }
        var selectedOption = select.options[select.selectedIndex];
        var revealed = await Promise.resolve(window.doWalletRevealMasterSeedPhrase({
          name: selectedOption && selectedOption.getAttribute("data-wallet-name") || "",
          seedToken: selectedOption && selectedOption.getAttribute("data-seed-token") || "",
          walletIndex: Number(select.value),
          password: password.value
        }));
        currentSeedPhrase = text(revealed.mnemonic);
        currentChains = Array.isArray(revealed.chains) ? revealed.chains : [];
        words.textContent = currentSeedPhrase;
        chains.innerHTML = currentChains.map(function (chain, index) {
          var address = text(chain.address);
          return "<div class=\"do-wallet-seed-reveal__chain\">" +
            "<strong>" + escapeHtml(chain.label) + "<small>" + escapeHtml(chain.chainID || "") + "</small></strong>" +
            "<code class=\"do-wallet-seed-reveal__address\">" + escapeHtml(address || "Address unavailable") + "</code>" +
            "<span class=\"do-wallet-seed-reveal__path\">" + escapeHtml(chain.path || chain.derivationPath || "") + "</span>" +
            "<span class=\"do-wallet-seed-reveal__actions\">" +
            "<button type=\"button\" class=\"secondary\" data-copy-chain-seed=\"" + index + "\">Copy phrase</button>" +
            "<button type=\"button\" class=\"secondary\" data-copy-chain-address=\"" + index + "\"" + (address ? "" : " disabled") + ">Copy address</button>" +
            "<button type=\"button\" class=\"secondary\" data-copy-chain-path=\"" + index + "\">Copy path</button>" +
            "</span>" +
            "</div>";
        }).join("");
        result.hidden = false;
      } catch (revealError) {
        showError(String(revealError && revealError.message || revealError || "Unable to reveal seed phrase"));
      }
    });

    copy.addEventListener("click", function () {
      var value = words.textContent;
      if (!value || !navigator.clipboard) return;
      navigator.clipboard.writeText(value).then(function () {
        markCopied(copy);
      }).catch(function () {});
    });

    chains.addEventListener("click", function (event) {
      var button = event.target && event.target.closest && event.target.closest("button");
      if (!button || !navigator.clipboard) return;
      var seedIndex = button.getAttribute("data-copy-chain-seed");
      var addressIndex = button.getAttribute("data-copy-chain-address");
      var pathIndex = button.getAttribute("data-copy-chain-path");
      var value = "";
      if (seedIndex !== null) {
        value = currentSeedPhrase;
      } else if (addressIndex !== null && currentChains[Number(addressIndex)]) {
        value = text(currentChains[Number(addressIndex)].address);
      } else if (pathIndex !== null && currentChains[Number(pathIndex)]) {
        value = currentChains[Number(pathIndex)].path || currentChains[Number(pathIndex)].derivationPath;
      }
      if (!value) return;
      navigator.clipboard.writeText(value).then(function () {
        markCopied(button);
      }).catch(function () {});
    });

    var headings = Array.prototype.slice.call(host.querySelectorAll("h1,h2")).filter(function (node) {
      return /Manage wallets/i.test(text(node.textContent));
    });
    if (headings[0] && headings[0].parentElement) {
      headings[0].insertAdjacentElement("afterend", panel);
    } else if (host.firstElementChild) {
      host.insertBefore(panel, host.firstElementChild.nextSibling || null);
    } else {
      host.appendChild(panel);
    }
  }

  function scheduleSeedRevealPanel() {
    window.setTimeout(renderSeedRevealPanel, 120);
  }

  function initializeInventory() {
    var wallets = normalizeKeysStorage();
    normalizeKnownWalletStorage();
    if (wallets.length) {
      publishInventory(wallets, { reason: "initial-scan" });
      publishRecoveredSummaries(wallets);
    }
    try {
      window.__DO_WALLET_ALL_CHAIN_EXPORTS__ = DERIVED_CHAIN_EXPORTS.map(function (chain) {
        return {
          chainID: chain.chainID,
          label: chain.label,
          coinType: chain.coinType,
          prefix: chain.prefix,
          kind: chain.kind,
          path: chain.path,
          derivationPath: chain.path,
          export: chain.export
        };
      });
      window.doWalletSeedWalletsForReveal = window.doWalletSeedWalletsForReveal || function () {
        return seedWalletsForReveal().map(function (wallet) {
          return {
            name: text(wallet.name || wallet.walletName) || "Do-Wallet",
            walletName: text(wallet.walletName || wallet.name) || "Do-Wallet",
            address: primaryAddress(wallet),
            walletIndex: wallet.__seedRevealIndex,
            source: wallet.__seedRevealSource,
            seedToken: wallet.__seedRevealToken,
            status: wallet.__seedRevealStatus,
            canReveal: Boolean(wallet.encryptedSeed && wallet.encryptedMnemonic)
          };
        });
      };
      window.doWalletRevealMasterSeedPhrase = window.doWalletRevealMasterSeedPhrase || revealMasterSeedPhrase;
      window.doWalletRevealSeedPhrase = window.doWalletRevealSeedPhrase || window.doWalletRevealMasterSeedPhrase;
      document.documentElement.setAttribute("data-do-wallet-all-chain-count", String(DERIVED_CHAIN_EXPORTS.length));
    } catch (error) {}
  }

  if (!shouldRunHere()) return;

  try {
    installStorageGuard();
    initializeInventory();
    scheduleSeedRevealPanel();
    window.addEventListener("popstate", scheduleSeedRevealPanel);
    window.addEventListener("hashchange", scheduleSeedRevealPanel);
    window.addEventListener("do_wallet_backup_inventory_update", scheduleSeedRevealPanel);
    window.addEventListener("do_wallet_recovered_wallet_selected", scheduleSeedRevealPanel);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scheduleSeedRevealPanel);
    }
    if (window.MutationObserver && document.documentElement) {
      var seedRevealObserver = new MutationObserver(scheduleSeedRevealPanel);
      seedRevealObserver.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(function () { seedRevealObserver.disconnect(); }, 12000);
    }
  } catch (error) {
    try {
      writeJSON(STATUS_KEY, {
        version: 1,
        source: "dochain-wallet-import-merge-guard-20260620",
        updatedAt: Date.now(),
        active: false,
        error: String(error && error.message || error).slice(0, 240)
      });
    } catch (innerError) {}
  }
})();
