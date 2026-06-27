(function () {
  "use strict";

  if (window.__doWalletRecoveredWallets20260616) return;
  window.__doWalletRecoveredWallets20260616 = true;

  var RECOVERED_KEY = "do-wallet-recovered-wallets.v1";
  var SELECTED_KEY = "do-wallet-selected-recovered-wallet.v1";
  var USER_KEY = "user";
  var MAX_JSON = 8 * 1024 * 1024;

  function shouldRunHere() {
    try {
      var host = window.location.hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "do-wallet.com" || host === "www.do-wallet.com" || host.endsWith(".do-wallet.com");
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

  function looksLikeAddress(value) {
    var raw = text(value);
    if (!raw) return false;
    return (
      /^0x[a-f0-9]{40}$/i.test(raw) ||
      /^(bc1|do1|terra1|secret1|dungeon1|cosmos1|osmo1|akash1|juno1|mars1|inj1|kujira1|stars1|stride1|noble1|neutron1|celestia1|archway1|axelar1|andr1|migaloo1|sei1|kava1|cre1|comdex1|orai1|nolus1|stafi1|dydx1|chihuahua1|pryzm1|xion1|swth1|cheqd1|sent1|decentr1|addr1)[0-9a-z]{12,120}$/i.test(raw) ||
      /^[1-9A-HJ-NP-Za-km-z]{32,60}$/.test(raw)
    );
  }

  function copyValidAddresses(target, source) {
    if (!isObject(source)) return;
    Object.keys(source).forEach(function (key) {
      var value = text(source[key]);
      if (looksLikeAddress(value)) target[key] = value;
    });
  }

  function safeJson(key) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      if (!raw || raw.length > MAX_JSON) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
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

  function mergeAddressMaps(left, right) {
    var merged = {};
    copyValidAddresses(merged, left);
    copyValidAddresses(merged, right);
    return merged;
  }

  function walletNameForDedupe(wallet) {
    return text(wallet && (wallet.name || wallet.walletName)).replace(/\s+\(\d+\)$/g, "").toLowerCase();
  }

  function walletDedupeKey(wallet) {
    if (!isObject(wallet)) return "";
    var name = walletNameForDedupe(wallet);
    var address = text(wallet.address || firstAddress(wallet.addresses || wallet.addressMap)).toLowerCase();
    if (address && name) return "wallet|" + name + "|" + address;
    if (address) return "address|" + address;
    return name ? "name|" + name : "";
  }

  function mergeWalletSummary(existing, incoming) {
    if (!existing) return incoming;
    if (!incoming) return existing;
    var merged = Object.assign({}, existing, incoming);
    var addresses = mergeAddressMaps(existing.addresses || existing.addressMap, incoming.addresses || incoming.addressMap);
    if (Object.keys(addresses).length) {
      merged.addresses = addresses;
      merged.addressMap = addresses;
    }
    merged.name = text(existing.name || existing.walletName || incoming.name || incoming.walletName) || "Do-Wallet";
    merged.walletName = merged.name;
    merged.address = text(existing.address || incoming.address || firstAddress(addresses));
    merged.validatorWallet = Boolean(existing.validatorWallet || incoming.validatorWallet);
    merged.adminWallet = Boolean(existing.adminWallet || incoming.adminWallet);
    merged.walletPriority = Math.max(Number(existing.walletPriority || 0), Number(incoming.walletPriority || 0));
    return merged;
  }

  function walletSignature(wallet) {
    if (!isObject(wallet)) return "";
    return [
      walletDedupeKey(wallet),
      wallet.validatorWallet ? "v" : "",
      wallet.adminWallet ? "a" : "",
      Number(wallet.walletPriority || 0)
    ].join("|").toLowerCase();
  }

  function normalizeWallet(wallet, source) {
    if (!isObject(wallet)) return null;
    var actual = isObject(wallet.wallet) ? wallet.wallet : wallet;
    if (!isObject(actual)) return null;

    var addresses = {};
    copyValidAddresses(addresses, actual.addresses);
    copyValidAddresses(addresses, actual.addressMap);
    copyValidAddresses(addresses, actual.allAddresses);

    var address = looksLikeAddress(actual.address) ? text(actual.address) : firstAddress(addresses);
    if (!address && !Object.keys(addresses).length) return null;

    var cleaned = {};
    Object.keys(actual).forEach(function (key) {
      if ({
        mnemonic: true,
        seed: true,
        seedPhrase: true,
        privateKey: true,
        privkey: true,
        password: true
      }[key]) return;
      cleaned[key] = actual[key];
    });

    var name =
      text(cleaned.name) ||
      text(cleaned.walletName) ||
      text(cleaned.accountName) ||
      text(cleaned.label) ||
      "Do-Wallet";
    cleaned.name = name;
    cleaned.walletName = name;
    cleaned.address = address || firstAddress(addresses);
    cleaned.addresses = addresses;
    cleaned.addressMap = addresses;
    cleaned.external = true;
    cleaned.source = source || text(cleaned.source) || "do-wallet-recovered-wallets-cleanup";
    cleaned.walletSource = text(cleaned.walletSource) || "website-selected-recovered-wallet";
    return cleaned.address ? cleaned : null;
  }

  function wallets() {
    var payload = safeJson(RECOVERED_KEY);
    var list = payload && Array.isArray(payload.wallets) ? payload.wallets.slice() : [];
    if (Array.isArray(window.__DO_WALLET_RECOVERED_WALLETS__)) {
      list = list.concat(window.__DO_WALLET_RECOVERED_WALLETS__);
    }
    if (!list.length) {
      list = fallbackWalletsFromStorage();
      if (list.length) {
        writeJson(RECOVERED_KEY, {
          version: 1,
          source: "do-wallet-connect-modal-fallback",
          updatedAt: Date.now(),
          wallets: list
        });
      }
    }
    var seen = {};
    var cleanedList = [];
    list.forEach(function (wallet) {
      var normalized = normalizeWallet(wallet, "do-wallet-recovered-wallets-cleanup");
      if (!normalized) return;
      var fingerprint = walletDedupeKey(normalized) || walletSignature(normalized);
      if (seen[fingerprint] !== undefined) {
        cleanedList[seen[fingerprint]] = mergeWalletSummary(cleanedList[seen[fingerprint]], normalized);
        return;
      }
      seen[fingerprint] = cleanedList.length;
      cleanedList.push(normalized);
    });
    if (payload && Array.isArray(payload.wallets)) {
      var before = payload.wallets.map(walletSignature).filter(Boolean).join(";");
      var after = cleanedList.map(walletSignature).filter(Boolean).join(";");
      if (before !== after) {
        writeJson(RECOVERED_KEY, {
          version: 1,
          source: "do-wallet-recovered-wallets-cleanup",
          updatedAt: Date.now(),
          wallets: cleanedList
        });
      }
    }
    return cleanedList.sort(function (left, right) {
      var leftScore = Number(left.walletPriority || 0) + (left.validatorWallet ? 2000 : 0) + (left.adminWallet ? 1000 : 0);
      var rightScore = Number(right.walletPriority || 0) + (right.validatorWallet ? 2000 : 0) + (right.adminWallet ? 1000 : 0);
      return rightScore - leftScore;
    });
  }

  function fallbackWalletsFromStorage() {
    var found = [];
    var seen = {};

    function cleanWallet(value, addresses, source) {
      var wallet = isObject(value && value.wallet) ? value.wallet : value;
      if (!isObject(wallet)) return null;
      var mergedAddresses = {};
      [wallet.addresses, wallet.addressMap, addresses].forEach(function (map) {
        if (!isObject(map)) return;
        Object.keys(map).forEach(function (key) {
          var value = text(map[key]);
          if (looksLikeAddress(value)) mergedAddresses[key] = value;
        });
      });
      var address = looksLikeAddress(wallet.address) ? text(wallet.address) : firstAddress(mergedAddresses);
      if (!address) return null;

      var cleaned = {};
      Object.keys(wallet).forEach(function (key) {
        if ({
          mnemonic: true,
          seed: true,
          seedPhrase: true,
          privateKey: true,
          privkey: true,
          password: true
        }[key]) return;
        cleaned[key] = wallet[key];
      });
      var name = text(cleaned.name || cleaned.walletName || "Do-Wallet");
      cleaned.name = name;
      cleaned.walletName = name;
      cleaned.address = address;
      cleaned.addresses = mergedAddresses;
      cleaned.addressMap = mergedAddresses;
      cleaned.external = true;
      cleaned.source = source || text(cleaned.source) || "do-wallet-connect-modal-fallback";
      cleaned.walletSource = text(cleaned.walletSource) || "website-selected-recovered-wallet";
      return cleaned;
    }

    function add(value, addresses, source) {
      var cleaned = cleanWallet(value, addresses, source);
      if (!cleaned) return;
      var fingerprint = walletDedupeKey(cleaned) || walletSignature(cleaned);
      if (seen[fingerprint] !== undefined) {
        found[seen[fingerprint]] = mergeWalletSummary(found[seen[fingerprint]], cleaned);
        return;
      }
      seen[fingerprint] = found.length;
      found.push(cleaned);
    }

    var selected = safeJson(SELECTED_KEY);
    var user = safeJson(USER_KEY);
    var bridge = safeJson("do-wallet-bridge-wallet");
    var auth = safeJson("do-wallet-extension-authority.v1");
    var snapshot = safeJson("do-wallet-portfolio-snapshot");
    add(user, user && user.addresses, "do-wallet-user-storage-fallback");
    add(selected && selected.wallet, selected && selected.addresses, "do-wallet-selected-wallet-fallback");
    add(bridge && bridge.wallet, bridge && bridge.addresses, "do-wallet-bridge-fallback");
    add(auth && auth.wallet, auth && auth.addresses, "do-wallet-authority-fallback");
    add(snapshot && snapshot.wallet, snapshot && (snapshot.allAddresses || snapshot.addressMap || snapshot.addresses), "do-wallet-snapshot-fallback");
    return found;
  }

  function firstAddress(addresses) {
    if (!isObject(addresses)) return "";
    var priority = ["Do-Chain", "dochain-1", "888", "columbus-5", "dungeon-1", "secret-4", "bitcoin-mainnet", "ethereum-mainnet", "solana-mainnet", "phoenix-1"];
    for (var i = 0; i < priority.length; i += 1) {
      if (looksLikeAddress(addresses[priority[i]])) return text(addresses[priority[i]]);
    }
    var keys = Object.keys(addresses);
    for (var index = 0; index < keys.length; index += 1) {
      if (looksLikeAddress(addresses[keys[index]])) return text(addresses[keys[index]]);
    }
    return "";
  }

  function shortAddress(address) {
    var raw = text(address);
    if (raw.length <= 18) return raw;
    return raw.slice(0, 8) + "..." + raw.slice(-6);
  }

  function ensureDoWord(wallet) {
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var words = isObject(wallet.words) ? Object.assign({}, wallet.words) : {};
    var doAddress = text(addresses["Do-Chain"] || addresses["dochain-1"] || addresses.do || addresses.dochain || wallet.address);
    if (doAddress && /^do1/i.test(doAddress)) words["888"] = doAddress;
    return words;
  }

  function parseLegacyKeys() {
    try {
      var raw = window.localStorage && window.localStorage.getItem("keys");
      if (!raw || raw.length > MAX_JSON) return [];
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (isObject(parsed) && Array.isArray(parsed.value)) return parsed.value;
      if (isObject(parsed) && typeof parsed.value === "string") {
        var inner = JSON.parse(parsed.value);
        return Array.isArray(inner) ? inner : [];
      }
    } catch (error) {}
    return [];
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

  function localWalletForRecovered(wallet) {
    var name = text(wallet && (wallet.name || wallet.walletName));
    var address = text(wallet && (wallet.address || firstAddress(wallet.addresses)));
    var keys = parseLegacyKeys();
    for (var index = 0; index < keys.length; index += 1) {
      var candidate = keys[index];
      if (!isSignableLegacyWallet(candidate)) continue;
      var candidateName = text(candidate.name || candidate.walletName);
      var candidateAddress = text(candidate.address || firstAddress(candidate.addresses));
      if ((name && candidateName === name) || (address && candidateAddress === address)) {
        return candidate;
      }
    }
    return null;
  }

  function activateWallet(wallet) {
    if (!isObject(wallet)) return;
    var localWallet = localWalletForRecovered(wallet);
    var sourceWallet = localWallet || wallet;
    var name = text(sourceWallet.name || sourceWallet.walletName || wallet.name || wallet.walletName || "Do-Wallet");
    var primaryAddress = looksLikeAddress(wallet.address) ? text(wallet.address) : firstAddress(wallet.addresses);
    if (!primaryAddress) return;
    var active = Object.assign({}, sourceWallet, {
      name: name,
      walletName: name,
      address: primaryAddress,
      addresses: isObject(wallet.addresses) ? wallet.addresses : {},
      addressMap: isObject(wallet.addressMap) ? wallet.addressMap : (isObject(wallet.addresses) ? wallet.addresses : {}),
      words: ensureDoWord(Object.assign({}, wallet, { words: sourceWallet.words || wallet.words })),
      external: localWallet ? false : true,
      source: localWallet ? "do-wallet-selected-local-key" : "do-wallet-selected-browser",
      walletSource: localWallet ? "legacy-keys-local" : (text(wallet.walletSource) || "website-selected-recovered-wallet"),
      selectedAt: Date.now()
    });
    ["encryptedSeed", "encrypted", "wallet", "seed", "mnemonic", "seedPhrase", "privateKey", "privkey", "password"].forEach(function (key) {
      delete active[key];
    });
    var payload = {
      source: "do-wallet-selected-browser",
      wallet: active,
      addresses: active.addresses,
      updatedAt: Date.now()
    };
    writeJson(USER_KEY, active);
    writeJson(SELECTED_KEY, payload);
    try {
      window.dispatchEvent(new CustomEvent("do_wallet_chain_assets_update", { detail: payload }));
      window.dispatchEvent(new CustomEvent("do_wallet_recovered_wallet_selected", { detail: payload }));
    } catch (error) {}
    window.setTimeout(function () {
      window.location.reload();
    }, 80);
  }

  function ensureStyles() {
    if (document.getElementById("do-recovered-wallets-style")) return;
    var style = document.createElement("style");
    style.id = "do-recovered-wallets-style";
    style.textContent = [
      ".do-recovered-wallets{margin:18px 0 8px;border-top:1px solid rgba(160,80,255,.28);border-bottom:1px solid rgba(160,80,255,.28);padding:12px 0 6px;color:#fff;font-family:inherit}",
      ".do-recovered-wallets__title{font-size:15px;font-weight: 700;color:#fff;margin:0 0 10px}",
      ".do-recovered-wallets__row{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:0;background:rgba(143,60,255,.08);color:#fff;border-radius:8px;padding:12px 14px;margin:8px 0;text-align:left;font-family:inherit;cursor:pointer}",
      ".do-recovered-wallets__row:hover,.do-recovered-wallets__row:focus{background:rgba(160,80,255,.18);outline:1px solid rgba(196,151,255,.55)}",
      ".do-recovered-wallets__name{display:block;font-size:16px;font-weight: 700;line-height:1.2;color:#fff}",
      ".do-recovered-wallets__meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px;font-size:12px;color:#c9b8df}",
      ".do-recovered-wallets__badge{border:1px solid rgba(160,80,255,.45);border-radius:999px;padding:2px 7px;color:#d9c8ff}",
      ".do-recovered-wallets__select{font-size:13px;font-weight: 700;color:#ad62ff;white-space:nowrap}",
      ".do-recovered-wallets--recover{max-width:760px;margin:20px auto 8px;padding:14px 0 4px}",
      ".do-recovered-wallets--recover .do-recovered-wallets__row{padding:14px 16px}",
      ".do-recovered-wallets__empty{margin:14px 0 0;border:1px solid rgba(160,80,255,.28);border-radius:8px;padding:14px 16px;color:#c9b8df;background:rgba(143,60,255,.06)}",
      ".do-recovered-wallets__actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}",
      ".do-recovered-wallets__button{border:0;border-radius:8px;background:#9d3cff;color:#fff;font:700 13px/1.2 inherit;padding:10px 14px;cursor:pointer}",
      ".do-recovered-wallets__button.secondary{background:rgba(143,60,255,.14);border:1px solid rgba(160,80,255,.45)}",
      ".do-recovered-wallets-hide-broken{display:none!important}"
    ].join("");
    document.head.appendChild(style);
  }

  function buildWalletRows(section, list) {
    list.forEach(function (wallet) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "do-recovered-wallets__row";
      row.setAttribute("aria-label", "Use recovered wallet " + text(wallet.name || wallet.walletName || "Do-Wallet"));

      var copy = document.createElement("span");
      var name = document.createElement("span");
      name.className = "do-recovered-wallets__name";
      name.textContent = text(wallet.name || wallet.walletName || "Do-Wallet");
      var meta = document.createElement("span");
      meta.className = "do-recovered-wallets__meta";
      meta.appendChild(document.createTextNode(shortAddress(wallet.address || firstAddress(wallet.addresses))));
      if (wallet.validatorWallet) {
        var validator = document.createElement("span");
        validator.className = "do-recovered-wallets__badge";
        validator.textContent = "Validator";
        meta.appendChild(validator);
      }
      if (wallet.adminWallet) {
        var admin = document.createElement("span");
        admin.className = "do-recovered-wallets__badge";
        admin.textContent = "Admin";
        meta.appendChild(admin);
      }
      copy.appendChild(name);
      copy.appendChild(meta);

      var action = document.createElement("span");
      action.className = "do-recovered-wallets__select";
      action.textContent = "Use";

      row.appendChild(copy);
      row.appendChild(action);
      row.addEventListener("click", function () {
        action.textContent = "Opening...";
        activateWallet(wallet);
      });
      section.appendChild(row);
    });
  }

  function findConnectDialog() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"], [aria-modal="true"], body > div, body section, body main div'));
    return nodes.filter(function (node) {
      var label = text(node.innerText);
      return label.indexOf("Connect wallet") !== -1 && (label.indexOf("New wallet") !== -1 || label.indexOf("Import from seed phrase") !== -1);
    }).sort(function (left, right) {
      return (right.getBoundingClientRect().width * right.getBoundingClientRect().height) - (left.getBoundingClientRect().width * left.getBoundingClientRect().height);
    })[0] || null;
  }

  function findConnectPanel() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("aside,section,main > div,body > div,body section,body main div"));
    return nodes.filter(function (node) {
      if (node.querySelector && node.querySelector(".do-recovered-wallets")) return false;
      var label = text(node.innerText);
      if (label.indexOf("Connect your wallet") === -1) return false;
      if (label.indexOf("Connect a website wallet") === -1 && label.indexOf("Extension to see balances") === -1) return false;
      var rect = node.getBoundingClientRect();
      return rect.width > 220 && rect.height > 220;
    }).sort(function (left, right) {
      return (right.getBoundingClientRect().width * right.getBoundingClientRect().height) - (left.getBoundingClientRect().width * left.getBoundingClientRect().height);
    })[0] || null;
  }

  function findRecoverPanel() {
    try {
      if (window.location.pathname.indexOf("/auth/recover") === -1) return null;
    } catch (error) {
      return null;
    }
    var nodes = Array.prototype.slice.call(document.querySelectorAll("main,section,body > div,body main div"));
    return nodes.filter(function (node) {
      if (node.querySelector && node.querySelector(".do-recovered-wallets--recover")) return false;
      var label = text(node.innerText);
      if (label.indexOf("Import from seed phrase") === -1 || label.indexOf("Loading") === -1) return false;
      var rect = node.getBoundingClientRect();
      return rect.width > 260 && rect.height > 120;
    }).sort(function (left, right) {
      return (right.getBoundingClientRect().width * right.getBoundingClientRect().height) - (left.getBoundingClientRect().width * left.getBoundingClientRect().height);
    })[0] || null;
  }

  function hideBrokenImages(root) {
    if (!root || !root.querySelectorAll) return;
    Array.prototype.slice.call(root.querySelectorAll("img")).forEach(function (image) {
      if (image.classList.contains("do-recovered-wallets-hide-broken")) return;
      if (!image.getAttribute("src") || (image.complete && image.naturalWidth === 0)) {
        image.classList.add("do-recovered-wallets-hide-broken");
      }
      image.addEventListener("error", function () {
        image.classList.add("do-recovered-wallets-hide-broken");
      }, { once: true });
    });
  }

  function hideRecoverLoader(root) {
    if (!root || !root.querySelectorAll) return;
    Array.prototype.slice.call(root.querySelectorAll("div,section,article")).forEach(function (node) {
      if (node.querySelector && node.querySelector(".do-recovered-wallets--recover")) return;
      if (node.querySelector && node.querySelector("input,textarea,button,select")) return;
      var label = text(node.innerText || node.textContent);
      if (label === "Loading..." || label === "Loading") {
        node.style.display = "none";
      }
    });
  }

  function renderRecoverFallback(panel) {
    if (!panel) return;
    ensureStyles();
    hideBrokenImages(panel);
    hideRecoverLoader(panel);
    var list = wallets();
    var signature = list.map(function (wallet) {
      return walletSignature(wallet);
    }).join("|") + "|recover";
    var existing = panel.querySelector(".do-recovered-wallets--recover");
    if (existing && existing.getAttribute("data-wallet-signature") === signature) return;
    if (existing) existing.remove();

    var section = document.createElement("div");
    section.className = "do-recovered-wallets do-recovered-wallets--recover";
    section.setAttribute("data-wallet-signature", signature);
    var title = document.createElement("div");
    title.className = "do-recovered-wallets__title";
    title.textContent = "Website wallets";
    section.appendChild(title);

    if (list.length) {
      buildWalletRows(section, list);
    } else {
      var empty = document.createElement("div");
      empty.className = "do-recovered-wallets__empty";
      empty.textContent = "Saved website wallets were not found in this browser. Use Connect to create or import a wallet.";
      section.appendChild(empty);
      var actions = document.createElement("div");
      actions.className = "do-recovered-wallets__actions";
      var connect = document.createElement("button");
      connect.type = "button";
      connect.className = "do-recovered-wallets__button";
      connect.textContent = "Open Connect";
      connect.addEventListener("click", function () {
        window.location.href = "/";
      });
      var back = document.createElement("button");
      back.type = "button";
      back.className = "do-recovered-wallets__button secondary";
      back.textContent = "Back to wallet";
      back.addEventListener("click", function () {
        window.location.href = "/";
      });
      actions.appendChild(connect);
      actions.appendChild(back);
      section.appendChild(actions);
    }

    var heading = Array.prototype.slice.call(panel.querySelectorAll("h1,h2,h3")).find(function (node) {
      return text(node.textContent) === "Import from seed phrase";
    });
    if (heading && heading.parentNode) {
      heading.parentNode.insertBefore(section, heading.nextSibling);
    } else {
      panel.insertBefore(section, panel.firstChild);
    }
  }

  function renderWalletSwitcher(dialog, mode) {
    var list = wallets();
    if (!dialog || !list.length) return;
    ensureStyles();

    var signature = list.map(function (wallet) {
      return walletSignature(wallet);
    }).join("|") + "|" + (mode || "dialog");
    var existing = dialog.querySelector(".do-recovered-wallets");
    if (existing && existing.getAttribute("data-wallet-signature") === signature) return;
    if (existing) existing.remove();

    var section = document.createElement("div");
    section.className = "do-recovered-wallets";
    section.setAttribute("data-wallet-signature", signature);
    var title = document.createElement("div");
    title.className = "do-recovered-wallets__title";
    title.textContent = "Website wallets";
    section.appendChild(title);

    buildWalletRows(section, list);

    var heading = Array.prototype.slice.call(dialog.querySelectorAll("h1,h2,h3,div,p")).find(function (node) {
      var label = text(node.textContent);
      return label === "Connect wallet" || label === "Connect your wallet";
    });
    if (heading && heading.parentNode) {
      heading.parentNode.insertBefore(section, heading.nextSibling);
    } else {
      dialog.insertBefore(section, dialog.firstChild);
    }
  }

  var scanTimer = 0;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = window.setTimeout(function () {
      scanTimer = 0;
      renderWalletSwitcher(findConnectDialog(), "dialog");
      renderWalletSwitcher(findConnectPanel(), "panel");
      renderRecoverFallback(findRecoverPanel());
    }, 80);
  }

  if (!shouldRunHere()) return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleScan);
  } else {
    scheduleScan();
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
    if (!window.MutationObserver || !document.documentElement) return;
    duration = Number(duration) || 2500;
    if (!observer) {
      observer = new MutationObserver(scheduleScan);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(stopTransientObserver, duration);
  }
  document.addEventListener("click", function () {
    startTransientObserver(2500);
    scheduleScan();
  }, true);
  try {
    startTransientObserver(8000);
  } catch (error) {}
})();
