(function () {
  "use strict";

  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var EXT_PRESENT_KEY = "do-wallet-extension-present.v1";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var WEBSITE_SOURCE = "do-wallet-website";
  var EXTENSION_SOURCE = "do-wallet-extension";
  var DASHBOARD_SOURCE = "do-wallet-dashboard";
  var AUTH_TTL_MS = 24 * 60 * 60 * 1000;
  var BRIDGE_TTL_MS = 10 * 60 * 1000;

  if (window.__doWalletWebsiteAuthorityInstalled) return;
  window.__doWalletWebsiteAuthorityInstalled = true;

  var lastDispatchKey = "";

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function readJson(key, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeKey(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {}
  }

  function text(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isDoAddress(value) {
    return /^do1[0-9a-z]{8,}$/i.test(String(value || "").trim());
  }

  function cleanName(name) {
    name = String(name || "").trim();
    return name && name.length <= 64 ? name : "Do-Wallet";
  }

  function cleanStringMap(value, maxLength) {
    if (!isObject(value)) return undefined;
    var result = Object.keys(value).reduce(function (acc, key) {
      var item = value[key];
      if (
        typeof key === "string" &&
        key.trim() &&
        typeof item === "string" &&
        item.trim() &&
        item.length <= maxLength
      ) {
        acc[key.trim()] = item.trim();
      }
      return acc;
    }, {});
    return Object.keys(result).length ? result : undefined;
  }

  function mergeStringMap(fallback, preferred) {
    var result = {};
    if (isObject(fallback)) {
      Object.keys(fallback).forEach(function (key) {
        if (typeof fallback[key] === "string" && fallback[key].trim()) {
          result[key] = fallback[key];
        }
      });
    }
    if (isObject(preferred)) {
      Object.keys(preferred).forEach(function (key) {
        if (typeof preferred[key] === "string" && preferred[key].trim()) {
          result[key] = preferred[key];
        }
      });
    }
    return Object.keys(result).length ? result : undefined;
  }

  function hasSensitiveWalletData(wallet) {
    return Boolean(
      isObject(wallet) &&
        (isObject(wallet.words) ||
          isObject(wallet.pubkey) ||
          isObject(wallet.encrypted) ||
          typeof wallet.encryptedSeed === "string")
    );
  }

  function mergeWalletData(preferred, fallback) {
    preferred = isObject(preferred) ? preferred : {};
    fallback = isObject(fallback) ? fallback : {};
    var merged = Object.assign({}, fallback, preferred);
    merged.name = cleanName(preferred.name || preferred.walletName || fallback.name || fallback.walletName);
    merged.address = walletAddress(preferred) || walletAddress(fallback) || undefined;
    merged.addresses = mergeStringMap(fallback.addresses, preferred.addresses);
    merged.words = mergeStringMap(fallback.words, preferred.words);
    merged.pubkey = mergeStringMap(fallback.pubkey, preferred.pubkey);
    merged.encrypted = mergeStringMap(fallback.encrypted, preferred.encrypted);
    if (
      (typeof preferred.encryptedSeed === "string" && preferred.encryptedSeed.trim()) ||
      (typeof fallback.encryptedSeed === "string" && fallback.encryptedSeed.trim())
    ) {
      merged.encryptedSeed =
        typeof preferred.encryptedSeed === "string" && preferred.encryptedSeed.trim()
          ? preferred.encryptedSeed
          : fallback.encryptedSeed;
    }
    Object.keys(merged).forEach(function (key) {
      if (merged[key] === undefined) delete merged[key];
    });
    return merged;
  }

  function walletAddress(wallet) {
    if (!isObject(wallet)) return "";
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var doAddress = [
      addresses["Do-Chain"],
      addresses["Do-Chain"],
      wallet.address,
    ].concat(Object.keys(addresses).map(function (key) { return addresses[key]; }))
      .find(isDoAddress);
    if (doAddress) return String(doAddress).trim();
    if (typeof wallet.address === "string" && wallet.address.trim()) return wallet.address.trim();
    return (
      addresses["Do-Chain"] ||
      addresses["columbus-5"] ||
      addresses["phoenix-1"] ||
      Object.keys(addresses)
        .map(function (key) {
          return addresses[key];
        })
        .find(function (value) {
          return typeof value === "string" && value.trim();
        }) ||
      ""
    );
  }

  function walletKey(wallet) {
    if (!isObject(wallet)) return "";
    return text(walletAddress(wallet) || wallet.name || wallet.walletName || "");
  }

  function identityTokens(wallet, includeName) {
    if (!isObject(wallet)) return [];
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var words = isObject(wallet.words) ? wallet.words : {};
    var pubkey = isObject(wallet.pubkey) ? wallet.pubkey : {};
    var tokens = [wallet.address]
      .concat(
        Object.keys(addresses).map(function (key) {
          return addresses[key];
        })
      )
      .concat(
        Object.keys(words).map(function (key) {
          return words[key];
        })
      )
      .concat(
        Object.keys(pubkey).map(function (key) {
          return pubkey[key];
        })
      )
      .map(text)
      .filter(Boolean);
    if (includeName) {
      var name = text(wallet.name || wallet.walletName);
      if (name) tokens.push("name:" + name);
    }
    return tokens.filter(function (token, index) {
      return tokens.indexOf(token) === index;
    });
  }

  function hasCommonToken(a, b, includeName) {
    var aTokens = identityTokens(a, includeName);
    var bTokens = identityTokens(b, includeName);
    return aTokens.some(function (token) {
      return bTokens.indexOf(token) >= 0;
    });
  }

  function isExtensionWallet(wallet) {
    if (!isObject(wallet)) return false;
    var source = String(wallet.source || "");
    var walletSource = String(wallet.walletSource || "");
    return (
      wallet.syncedFromExtension === true ||
      source.indexOf("do-wallet-extension") === 0 ||
      source === DASHBOARD_SOURCE ||
      walletSource.indexOf("extension") >= 0
    );
  }

  function shouldMergeSavedWallet(saved, incoming) {
    if (hasCommonToken(saved, incoming, false)) return true;
    var savedName = text(saved && (saved.name || saved.walletName));
    var incomingName = text(incoming && (incoming.name || incoming.walletName));
    return Boolean(savedName && savedName === incomingName && (isExtensionWallet(saved) || isExtensionWallet(incoming)));
  }

  function dedupeKeys(keys) {
    return keys.reduce(function (acc, item) {
      var index = acc.findIndex(function (existing) {
        return shouldMergeSavedWallet(existing, item);
      });
      if (index >= 0) {
        acc[index] = mergeWalletData(acc[index], item);
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
  }

  function sameWallet(a, b) {
    var aKey = walletKey(a);
    var bKey = walletKey(b);
    return Boolean((aKey && bKey && aKey === bKey) || hasCommonToken(a, b, false));
  }

  function readKeys() {
    var keys = readJson("keys", []);
    return Array.isArray(keys) ? keys.filter(isObject) : [];
  }

  function upsertWebsiteKey(wallet, updatedAt) {
    if (!isObject(wallet)) return wallet;
    var entry = Object.assign({}, wallet, {
      source: EXTENSION_SOURCE,
      walletSource: "extension-handoff",
      external: true,
      syncedFromExtension: true,
      syncedAt: Number(updatedAt) || Date.now(),
    });
    entry.name = cleanName(entry.name || entry.walletName);
    if (!walletAddress(entry) && !entry.addresses && !entry.words) return wallet;

    var replaced = false;
    var keys = readKeys()
      .map(function (item) {
        if (shouldMergeSavedWallet(item, entry)) {
          replaced = true;
          var merged = mergeWalletData(entry, item);
          return Object.assign({}, merged, {
            source: EXTENSION_SOURCE,
            walletSource: "extension-handoff",
            external: true,
            syncedFromExtension: true,
            syncedAt: Number(updatedAt) || Date.now(),
            name: entry.name || item.name || merged.name,
          });
        }
        return item;
      });

    if (!replaced) keys.unshift(entry);
    keys = dedupeKeys(keys).slice(0, 200);
    try {
      var serialized = JSON.stringify(keys);
      if (serialized.length <= 256000) window.localStorage.setItem("keys", serialized);
    } catch (error) {}
    return entry;
  }

  function isExtensionSource(source) {
    source = String(source || "");
    return (
      source === DASHBOARD_SOURCE ||
      source === "station-extension" ||
      source.indexOf("do-wallet-extension") === 0
    );
  }

  function payloadTime(payload) {
    var wallet = isObject(payload && payload.wallet) ? payload.wallet : {};
    var value = Number(
      (payload && (payload.updatedAt || payload.requestedAt)) ||
        wallet.updatedAt ||
        wallet.requestedAt
    );
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  }

  function normalizeWallet(wallet, source) {
    if (!isObject(wallet)) return null;
    var addresses = cleanStringMap(wallet.addresses, 512);
    var words = cleanStringMap(wallet.words, 4096);
    var pubkey = cleanStringMap(wallet.pubkey, 1024);
    var encrypted = cleanStringMap(wallet.encrypted, 4096);
    var address = walletAddress({ address: wallet.address, addresses: addresses });
    var doAddress = walletAddress({ address: wallet.address, addresses: addresses });

    if (!address && addresses) {
      address =
        Object.keys(addresses)
          .map(function (key) {
            return addresses[key];
          })
          .find(Boolean) || "";
    }

    if (doAddress && isDoAddress(doAddress)) {
      addresses = addresses || {};
      addresses["Do-Chain"] = doAddress;
      addresses["Do-Chain"] = doAddress;
      address = doAddress;
    }

    if (!address && !addresses && !words && !encrypted && !wallet.encryptedSeed) return null;

    var extension = isExtensionSource(source);
    var normalized = {
      source: extension ? EXTENSION_SOURCE : WEBSITE_SOURCE,
      walletSource: extension ? "extension-handoff" : "website",
      external: extension || wallet.external === true,
      name: cleanName(wallet.name || wallet.walletName),
      address:
        typeof address === "string" && address.trim() && address.length <= 512
          ? address.trim()
          : undefined,
      addresses: addresses,
      words: words,
      pubkey: pubkey,
      encrypted: encrypted,
      encryptedSeed:
        typeof wallet.encryptedSeed === "string" && wallet.encryptedSeed.length <= 4096
          ? wallet.encryptedSeed
          : undefined,
      strict: wallet.strict === true || undefined,
    };

    Object.keys(normalized).forEach(function (key) {
      if (normalized[key] === undefined) delete normalized[key];
    });

    return normalized.address || normalized.addresses || normalized.words || normalized.encrypted ? normalized : null;
  }

  function normalizePayload(value, fallbackSource) {
    if (!isObject(value)) return null;
    var source = String(value.source || fallbackSource || WEBSITE_SOURCE);
    var wallet = "wallet" in value ? value.wallet : value;
    wallet = normalizeWallet(wallet, source);
    if (!wallet) return null;
    return {
      source: source,
      wallet: wallet,
      updatedAt: payloadTime(value),
    };
  }

  function readAuthority() {
    var authority = readJson(AUTH_KEY, null);
    if (!isObject(authority) || !isObject(authority.wallet)) return null;
    if (Number(authority.expiresAt) <= Date.now()) return null;
    return authority;
  }

  function readBridge() {
    var bridge = readJson(BRIDGE_KEY, null);
    if (!isObject(bridge) || !isObject(bridge.wallet)) return null;
    var updatedAt = Number(bridge.updatedAt);
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt > BRIDGE_TTL_MS) return null;
    return bridge;
  }

  function extensionPresent() {
    var presence = readJson(EXT_PRESENT_KEY, null);
    var updatedAt = Number(presence && presence.updatedAt);
    return isObject(presence) && Number.isFinite(updatedAt) && Date.now() - updatedAt < 30 * 1000;
  }

  function bridgePayload(authority) {
    return {
      source: authority.source,
      wallet: authority.wallet,
      updatedAt: Number(authority.updatedAt) || Date.now(),
    };
  }

  function writeAuthority(payload, options) {
    options = options || {};
    var normalized = normalizePayload(payload, options.source);
    if (!normalized) return null;

    var current = readAuthority();
    var normalizedIsExtension = isExtensionSource(normalized.source);
    if (
      current &&
      isExtensionSource(current.source) &&
      !normalizedIsExtension &&
      sameWallet(current.wallet, normalized.wallet)
    ) {
      current.wallet = mergeWalletData(current.wallet, normalized.wallet);
      writeJson(AUTH_KEY, current);
      writeJson(BRIDGE_KEY, bridgePayload(current));
      if (options.applyToWebsiteUser) {
        writeJson("user", current.wallet);
      }
      return current;
    }

    if (
      current &&
      Number(current.updatedAt) > Number(normalized.updatedAt) &&
      !sameWallet(current.wallet, normalized.wallet)
    ) {
      return current;
    }

    var authority = {
      source: normalizedIsExtension ? DASHBOARD_SOURCE : WEBSITE_SOURCE,
      wallet: normalized.wallet,
      updatedAt: Number(normalized.updatedAt) || Date.now(),
      expiresAt: Date.now() + AUTH_TTL_MS,
    };

    if (options.applyToWebsiteUser) {
      authority.wallet = upsertWebsiteKey(authority.wallet, authority.updatedAt) || authority.wallet;
      var savedUser = readJson("user", null);
      if (isObject(savedUser) && sameWallet(savedUser, authority.wallet)) {
        authority.wallet = mergeWalletData(authority.wallet, savedUser);
      }
    }

    writeJson(AUTH_KEY, authority);
    writeJson(BRIDGE_KEY, bridgePayload(authority));

    if (options.applyToWebsiteUser) {
      var currentUser = readJson("user", null);
      var nextUser =
        isObject(currentUser) && sameWallet(currentUser, authority.wallet)
          ? mergeWalletData(authority.wallet, currentUser)
          : authority.wallet;
      writeJson("user", nextUser);
    }

    return authority;
  }

  function dispatchAuthority(authority, force) {
    if (!authority || !isObject(authority.wallet)) return;
    var key = walletKey(authority.wallet) + ":" + String(authority.updatedAt || "");
    if (!force && key && key === lastDispatchKey) return;
    lastDispatchKey = key;

    var bridgeDetail = bridgePayload(authority);
    [
      ["do_wallet_bridge_update", bridgeDetail],
      ["do_wallet_chain_assets_update", bridgeDetail],
    ].forEach(function (entry) {
      try {
        window.dispatchEvent(new CustomEvent(entry[0], { detail: entry[1] }));
      } catch (error) {}
    });
  }

  function acceptExplicitExtensionPayload(payload) {
    var authority = writeAuthority(payload, {
      source: payload && payload.source,
      applyToWebsiteUser: true,
    });
    if (authority) dispatchAuthority(authority, false);
    return authority;
  }

  function rememberWebsitePayload(payload) {
    var authority = writeAuthority(payload, {
      source: WEBSITE_SOURCE,
      applyToWebsiteUser: false,
    });
    return authority;
  }

  ["do_wallet_bridge_update"].forEach(function (eventName) {
    window.addEventListener(
      eventName,
      function (event) {
        var payload = normalizePayload(event && event.detail);
        if (!payload) return;
        if (isExtensionSource(payload.source)) {
          writeAuthority(payload, { source: payload.source, applyToWebsiteUser: false });
        } else {
          rememberWebsitePayload(payload);
        }
      },
      false
    );
  });

  window.addEventListener(
    "message",
    function (event) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      var data = event.data;
      if (!data || data.type !== "DO_WALLET_PAGE_WALLET_SYNC") return;
      var payload = normalizePayload(data.payload, DASHBOARD_SOURCE);
      if (payload) acceptExplicitExtensionPayload(payload);
    },
    false
  );

  window.doWalletWebsiteAuthority = {
    extensionPresent: extensionPresent,
    read: readAuthority,
    readBridge: readBridge,
    sync: function () {
      var user = readJson("user", null);
      if (isObject(user)) {
        return rememberWebsitePayload({ source: WEBSITE_SOURCE, wallet: user, updatedAt: Date.now() });
      }
      return readAuthority();
    },
    acceptExtensionWallet: acceptExplicitExtensionPayload,
    clearExtensionBridge: function () {
      removeKey(AUTH_KEY);
      removeKey(BRIDGE_KEY);
    },
  };

  var initialUser = readJson("user", null);
  var initialKeys = readKeys();
  var dedupedInitialKeys = dedupeKeys(initialKeys);
  if (dedupedInitialKeys.length !== initialKeys.length) {
    try {
      window.localStorage.setItem("keys", JSON.stringify(dedupedInitialKeys));
    } catch (error) {}
  }

  var bridge = readBridge();
  var authority = readAuthority();
  if (bridge && isExtensionSource(bridge.source)) {
    writeAuthority(bridge, { source: bridge.source, applyToWebsiteUser: false });
  } else if (authority && isExtensionSource(authority.source)) {
    writeJson(BRIDGE_KEY, bridgePayload(authority));
    dispatchAuthority(authority, true);
  } else if (initialUser) {
    rememberWebsitePayload({ source: WEBSITE_SOURCE, wallet: initialUser, updatedAt: Date.now() });
  }
})();
