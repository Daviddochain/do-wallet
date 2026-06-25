(function () {
  "use strict";

  if (window.__doWalletValidatorHeaderShimInstalled) return;
  window.__doWalletValidatorHeaderShimInstalled = true;

  var PROFILE_KEY = "do-wallet-validator-profile.v1";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";

  function shouldRunHere() {
    try {
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

  function readJSON(key, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  function text(value) {
    return String(value || "").trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function routeTo(path) {
    if (!path) return;
    try {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (error) {
      window.location.href = path;
    }
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function walletName(wallet) {
    return text(wallet && (wallet.name || wallet.walletName || wallet.label));
  }

  function visibleWalletName() {
    var ignored = /^(send|receive|swap|history|settings|copy|copied|qr|back|back to wallet|manage|dashboard|buy|buy \/ sell|sell|menu|assets|activity|connect|connect wallet|edit validator|classicnodes|do chain|bitcoin|ethereum|solana|secret network|dungeon chain)$/i;
    var entries = Array.prototype.slice.call(document.querySelectorAll("header button, nav button, header [role='button'], button, header *, [role='button']"))
      .map(function (node) {
        var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };
        return { node: node, rect: rect, text: text(node.textContent).replace(/\s+/g, " ") };
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
    if (!isObject(wallet)) return {};
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var values = [wallet.address].concat(Object.keys(addresses).map(function (key) { return addresses[key]; }));
    var set = {};
    values.map(lower).filter(Boolean).forEach(function (value) { set[value] = true; });
    return set;
  }

  function walletsShareAddress(left, right) {
    var leftSet = walletAddressSet(left);
    var rightSet = walletAddressSet(right);
    return Object.keys(leftSet).some(function (key) { return rightSet[key]; });
  }

  function walletFromKeys(name, referenceWallet) {
    var keys = readJSON("keys", null);
    if (!Array.isArray(keys)) return null;
    if (name) {
      var named = keys.find(function (wallet) { return walletMatchesName(wallet, name); });
      if (named) return named;
    }
    if (referenceWallet) {
      return keys.find(function (wallet) { return walletsShareAddress(wallet, referenceWallet); }) || null;
    }
    return null;
  }

  function activeWallet() {
    var visible = visibleWalletName();
    var bridge = walletFromPayload(readJSON(BRIDGE_KEY, null));
    var auth = walletFromPayload(readJSON(AUTH_KEY, null));
    var user = walletFromPayload(readJSON("user", null)) || readJSON("user", null);
    return walletFromKeys(visible, user || bridge || auth) || bridge || auth || user;
  }

  function walletKeys(wallet) {
    if (!isObject(wallet)) return [];
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var keys = [wallet.name, wallet.walletName, wallet.address]
      .concat(Object.keys(addresses).map(function (key) { return addresses[key]; }))
      .map(lower)
      .filter(Boolean);
    return keys.filter(function (key, index) { return keys.indexOf(key) === index; });
  }

  function isValidatorWallet(wallet) {
    if (!isObject(wallet)) return false;
    if (wallet.validatorWallet === true || wallet.isValidatorWallet === true) return true;
    var name = lower(wallet.name || wallet.walletName);
    return name.indexOf("validator") >= 0 || /\bval(?:idator)?\b/.test(name) || /\bval\s*\d+\b/.test(name);
  }

  function displayMoniker(wallet) {
    var name = text(wallet && (wallet.name || wallet.walletName));
    var cleaned = name.replace(/\bval(?:idator)?\s*\d*\b/ig, "").replace(/\s+/g, " ").trim();
    if (!cleaned) cleaned = "Validator";
    if (/^classicnodes$/i.test(cleaned)) return "ClassicNodes";
    return cleaned.replace(/\w\S*/g, function (part) {
      if (/^[A-Z0-9]{2,}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    });
  }

  function readProfiles() {
    var value = readJSON(PROFILE_KEY, {});
    return isObject(value) ? value : {};
  }

  function profileForWallet(wallet) {
    var profiles = readProfiles();
    var keys = walletKeys(wallet);
    for (var index = 0; index < keys.length; index += 1) {
      if (isObject(profiles[keys[index]])) return profiles[keys[index]];
    }
    return null;
  }

  function saveProfile(wallet, profile) {
    if (!isObject(wallet) || !isObject(profile)) return;
    var keys = walletKeys(wallet);
    if (!keys.length) return;
    var profiles = readProfiles();
    var normalized = {
      moniker: text(profile.moniker) || displayMoniker(wallet),
      ownerAddress: text(profile.ownerAddress),
      chainID: text(profile.chainID) || "Do-Chain",
      updatedAt: Date.now(),
    };
    keys.forEach(function (key) {
      profiles[key] = normalized;
    });
    writeJSON(PROFILE_KEY, profiles);
  }

  function parseValidatorEditHref(href) {
    if (!href) return null;
    try {
      var url = new URL(href, window.location.origin);
      var match = url.pathname.match(/\/validator\/([^/]+)\/edit/i);
      if (!match) return null;
      return {
        ownerAddress: decodeURIComponent(match[1]),
        chainID: url.searchParams.get("chain") || "Do-Chain",
      };
    } catch (error) {
      return null;
    }
  }

  function captureVisibleProfile() {
    var wallet = activeWallet();
    if (!wallet) return;
    var editLink = Array.prototype.slice.call(document.querySelectorAll("a[href*='/validator/'][href*='/edit']"))
      .find(function (node) {
        var rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    if (!editLink) return;
    var profile = parseValidatorEditHref(editLink.getAttribute("href"));
    if (!profile) return;

    var group = editLink.parentElement;
    var commissionLink = group && Array.prototype.slice.call(group.querySelectorAll("a[href*='/commission']"))
      .find(function (node) { return text(node.textContent); });
    profile.moniker = text(commissionLink && commissionLink.textContent) || profile.moniker || displayMoniker(wallet);
    saveProfile(wallet, profile);
  }

  function visibleTextIncludes(value) {
    var needle = lower(value);
    if (!needle) return false;
    return lower(document.body && document.body.textContent).indexOf(needle) >= 0;
  }

  function getTopWalletNode(wallet) {
    var walletName = lower(wallet && (wallet.name || wallet.walletName));
    if (!walletName) return null;
    var nodes = Array.prototype.slice.call(document.querySelectorAll("button, a, [role='button'], header *, nav *"));
    return nodes
      .map(function (node) {
        var rect = node.getBoundingClientRect();
        return { node: node, rect: rect, text: lower(node.textContent) };
      })
      .filter(function (entry) {
        return (
          entry.text.indexOf(walletName) >= 0 &&
          entry.rect.width > 20 &&
          entry.rect.height > 20 &&
          entry.rect.top >= -10 &&
          entry.rect.top < 180
        );
      })
      .sort(function (a, b) {
        return (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height);
      })[0]?.node || null;
  }

  function injectStyles() {
    if (document.getElementById("do-wallet-validator-header-style")) return;
    var style = document.createElement("style");
    style.id = "do-wallet-validator-header-style";
    style.textContent = [
      ".do-wallet-validator-actions{display:inline-flex;align-items:center;gap:12px;margin:0 12px;flex-wrap:wrap;vertical-align:middle}",
      ".do-wallet-validator-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 26px;border:2px solid rgba(255,255,255,.88);border-radius:999px;color:#fff;text-decoration:none;font-weight: 700;font-size:18px;line-height:1;white-space:nowrap;background:rgba(20,15,32,.18)}",
      ".do-wallet-validator-actions a:hover{background:rgba(154,65,255,.18);border-color:#fff}",
      "@media(max-width:760px){.do-wallet-validator-actions{gap:8px;margin:8px 0}.do-wallet-validator-actions a{min-height:36px;padding:0 14px;font-size:14px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function buildLink(label, href) {
    var link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    link.addEventListener("click", function (event) {
      event.preventDefault();
      routeTo(href);
    });
    return link;
  }

  function ensureHeaderActions() {
    captureVisibleProfile();

    var wallet = activeWallet();
    if (!isValidatorWallet(wallet)) {
      var stale = document.querySelector("[data-do-wallet-validator-actions]");
      if (stale) stale.remove();
      return;
    }

    if (visibleTextIncludes("Edit validator")) return;

    var profile = profileForWallet(wallet) || {
      moniker: displayMoniker(wallet),
      ownerAddress: "",
      chainID: "Do-Chain",
    };
    var walletNode = getTopWalletNode(wallet);
    if (!walletNode) return;

    var parent = walletNode.closest("header, nav") || walletNode.parentElement;
    if (!parent) return;
    injectStyles();

    var group = parent.querySelector("[data-do-wallet-validator-actions]") || document.createElement("span");
    group.setAttribute("data-do-wallet-validator-actions", "true");
    group.className = "do-wallet-validator-actions";
    group.innerHTML = "";

    var moniker = text(profile.moniker) || displayMoniker(wallet);
    var editHref = profile.ownerAddress
      ? "/validator/" + encodeURIComponent(profile.ownerAddress) + "/edit?chain=" + encodeURIComponent(profile.chainID || "Do-Chain")
      : "/validator/manage";
    group.appendChild(buildLink(moniker, "/commission"));
    group.appendChild(buildLink("Edit validator", editHref));

    if (!group.parentElement) {
      parent.insertBefore(group, walletNode);
    }
  }

  var timer;
  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () {
      timer = null;
      ensureHeaderActions();
    }, 300);
  }

  schedule();
  window.setTimeout(schedule, 750);
  window.setTimeout(schedule, 2000);
  window.addEventListener("focus", schedule);
  window.addEventListener("storage", schedule);
  window.addEventListener("do_wallet_bridge_update", schedule);
  try {
    var observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.setTimeout(function () {
      observer.disconnect();
    }, 8000);
  } catch (error) {}
})();
