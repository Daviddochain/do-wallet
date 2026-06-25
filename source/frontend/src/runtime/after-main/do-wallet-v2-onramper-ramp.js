(function () {
  "use strict";

  if (window.__doWalletOnramperRampInstalled) return;
  window.__doWalletOnramperRampInstalled = true;

  var CONFIG = Object.assign(
    {
      apiKey: "",
      widgetBase: "https://buy.onramper.com/",
      mode: "buy,sell",
      defaultFiat: "USD",
      defaultAmount: "50",
      defaultCrypto: "",
      onlyCryptos: "",
      onlyCryptoNetworks: "",
      popularCryptos: "",
      enableCountrySelector: true,
      redirectAtCheckout: false,
      signedUrlEndpoint: "",
      includeUnsignedWalletParams: false,
      showWhenUnconfigured: true,
      openWidgetWithoutApiKey: true
    },
    window.DO_WALLET_ONRAMPER_CONFIG || {}
  );

  var STORAGE_API_KEY = "doWallet.onramper.apiKey";
  var MODAL_ID = "do-wallet-onramper-ramp";
  var cachedWidget = {
    key: "",
    url: "",
    promise: null
  };

  function text(value) {
    return String(value || "").trim();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function readJson(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function getApiKey() {
    return text(CONFIG.apiKey || window.localStorage.getItem(STORAGE_API_KEY));
  }

  function validApiKey(key) {
    return /^pk_(prod|test)_[a-z0-9]+/i.test(text(key));
  }

  function getCurrentWallet() {
    var bridge = readJson("do-wallet-bridge-wallet");
    var bridgedAt = Number(bridge && bridge.updatedAt);
    if (isObject(bridge) && isObject(bridge.wallet) && (!Number.isFinite(bridgedAt) || Date.now() - bridgedAt < 10 * 60 * 1000)) {
      return bridge.wallet;
    }
    var authority = readJson("do-wallet-extension-authority.v1");
    if (isObject(authority) && isObject(authority.wallet) && Number(authority.expiresAt) > Date.now()) {
      return authority.wallet;
    }
    return readJson("user");
  }

  function getWalletAddress(wallet) {
    if (!isObject(wallet)) return "";
    if (text(wallet.address)) return text(wallet.address);
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    return (
      text(addresses["Do-Chain"]) ||
      text(addresses["columbus-5"]) ||
      text(addresses["phoenix-1"]) ||
      text(addresses["ethereum-mainnet"]) ||
      text(addresses["bitcoin-mainnet"]) ||
      Object.keys(addresses)
        .map(function (key) {
          return text(addresses[key]);
        })
        .find(Boolean) ||
      ""
    );
  }

  function stableUuid() {
    try {
      var key = "doWallet.onramper.uuid";
      var value = window.localStorage.getItem(key);
      if (value) return value;
      value = crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
        var random = Math.random() * 16 | 0;
        var digit = char === "x" ? random : random & 3 | 8;
        return digit.toString(16);
      });
      window.localStorage.setItem(key, value);
      return value;
    } catch (error) {
      return "";
    }
  }

  function addParam(params, key, value) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }

  function buildUnsignedWidgetUrl(mode) {
    var apiKey = getApiKey();
    var url = new URL(CONFIG.widgetBase || "https://buy.onramper.com/");
    var params = url.searchParams;
    params.set("apiKey", apiKey);
    addParam(params, "mode", mode || CONFIG.mode || "buy,sell");
    addParam(params, "defaultFiat", CONFIG.defaultFiat);
    addParam(params, "defaultAmount", CONFIG.defaultAmount);
    addParam(params, "defaultCrypto", CONFIG.defaultCrypto);
    addParam(params, "onlyCryptos", CONFIG.onlyCryptos);
    addParam(params, "onlyCryptoNetworks", CONFIG.onlyCryptoNetworks);
    addParam(params, "popularCryptos", CONFIG.popularCryptos);
    addParam(params, "partnerContext", "do-wallet-" + Date.now());
    addParam(params, "uuid", stableUuid());
    addParam(params, "enableCountrySelector", CONFIG.enableCountrySelector !== false);
    addParam(params, "redirectAtCheckout", CONFIG.redirectAtCheckout === true ? "true" : "false");
    return url.toString();
  }

  function getWalletsParam(wallet) {
    if (!isObject(wallet) || !isObject(wallet.addresses)) return "";
    var map = {
      "bitcoin-mainnet": "btc",
      "ethereum-mainnet": "eth",
      "solana-mainnet": "sol"
    };
    return Object.keys(map)
      .map(function (chainId) {
        var address = text(wallet.addresses[chainId]);
        return address ? map[chainId] + ":" + address : "";
      })
      .filter(Boolean)
      .join(",");
  }

  async function buildWidgetUrl(mode) {
    var unsignedUrl = buildUnsignedWidgetUrl(mode);
    var wallet = getCurrentWallet();
    var walletAddress = getWalletAddress(wallet);
    var walletsParam = getWalletsParam(wallet);
    if (!walletAddress && !walletsParam) return unsignedUrl;

    if (CONFIG.signedUrlEndpoint) {
      var response = await fetch(CONFIG.signedUrlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: unsignedUrl, wallet: wallet, address: walletAddress, wallets: walletsParam, mode: mode || CONFIG.mode || "buy,sell" })
      });
      if (response.ok) {
        var data = await response.json();
        if (data && data.url) return String(data.url);
      }
    }

    if (CONFIG.includeUnsignedWalletParams) {
      var url = new URL(unsignedUrl);
      addParam(url.searchParams, "wallets", walletsParam);
      return url.toString();
    }

    return unsignedUrl;
  }

  function widgetCacheKey(mode) {
    var wallet = getCurrentWallet();
    return [
      mode || CONFIG.mode || "buy,sell",
      getApiKey(),
      getWalletAddress(wallet),
      getWalletsParam(wallet)
    ].join("|");
  }

  function warmWidgetUrl(mode, passive) {
    if (passive && CONFIG.signedUrlEndpoint) return Promise.resolve("");
    var key = widgetCacheKey(mode);
    if (cachedWidget.key === key && (cachedWidget.url || cachedWidget.promise)) return cachedWidget.promise || Promise.resolve(cachedWidget.url);
    cachedWidget.key = key;
    cachedWidget.url = "";
    cachedWidget.promise = buildWidgetUrl(mode).then(function (url) {
      if (cachedWidget.key === key) {
        cachedWidget.url = url;
        cachedWidget.promise = null;
      }
      return url;
    }).catch(function (error) {
      if (cachedWidget.key === key) cachedWidget.promise = null;
      throw error;
    });
    return cachedWidget.promise;
  }

  function ensureModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) return existing;

    var overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    overlay.className = "do-ramp-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = [
      '<div class="do-ramp-modal">',
      '  <div class="do-ramp-header">',
      '    <h2 class="do-ramp-title">Buy / Sell Crypto</h2>',
      '    <button type="button" class="do-ramp-close" aria-label="Close">&times;</button>',
      '  </div>',
      '  <div class="do-ramp-body"></div>',
      '  <div class="do-ramp-footer">',
      '    <button type="button" class="do-ramp-open">Open in new tab</button>',
      '  </div>',
      '</div>'
    ].join("");

    overlay.querySelector(".do-ramp-close").addEventListener("click", closeRamp);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeRamp();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && overlay.dataset.open === "true") closeRamp();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function renderSetupState(body, walletAddress) {
    body.innerHTML = [
      '<div class="do-ramp-status">',
      '<strong>Buy / Sell preview</strong>',
      '<span>Purchases are not live yet. This is where the secure checkout will open when the ramp is switched on.</span>',
      '</div>',
      '<div class="do-ramp-steps">',
      '  <div><b>1</b><span>Choose buy or sell</span></div>',
      '  <div><b>2</b><span>Pick payment method and provider</span></div>',
      '  <div><b>3</b><span>Coins arrive in the selected wallet</span></div>',
      '</div>',
      walletAddress ? '<div class="do-ramp-wallet"><code></code><button type="button" class="do-ramp-copy">Copy</button></div>' : ''
    ].join("");
    var code = body.querySelector("code");
    if (code && walletAddress) code.textContent = walletAddress;
    var copy = body.querySelector(".do-ramp-copy");
    if (copy) {
      copy.addEventListener("click", function () {
        navigator.clipboard && navigator.clipboard.writeText(walletAddress);
      });
    }
  }

  async function openRamp(mode) {
    var overlay = ensureModal();
    var body = overlay.querySelector(".do-ramp-body");
    var openButton = overlay.querySelector(".do-ramp-open");
    var apiKey = getApiKey();
    var walletAddress = getWalletAddress(getCurrentWallet());
    overlay.dataset.open = "true";
    body.innerHTML = '<div class="do-ramp-status">Loading checkout...</div>';

    if (!validApiKey(apiKey) && CONFIG.openWidgetWithoutApiKey !== true) {
      renderSetupState(body, walletAddress);
      openButton.disabled = true;
      return;
    }

    try {
      var key = widgetCacheKey(mode);
      var url = cachedWidget.key === key && cachedWidget.url
        ? cachedWidget.url
        : await warmWidgetUrl(mode, false);
      body.innerHTML = "";
      if (!validApiKey(apiKey) && CONFIG.openWidgetWithoutApiKey) {
        var notice = document.createElement("div");
        notice.className = "do-ramp-status do-ramp-status-setup";
        notice.innerHTML = "<strong>Purchases are not live yet</strong><span>The checkout is connected, but the Onramper API key has not been added, so the final buy step will fail.</span>";
        body.appendChild(notice);
      }
      if (walletAddress) {
        var wallet = document.createElement("div");
        wallet.className = "do-ramp-wallet";
        wallet.innerHTML = '<code></code><button type="button" class="do-ramp-copy">Copy</button>';
        wallet.querySelector("code").textContent = walletAddress;
        wallet.querySelector(".do-ramp-copy").addEventListener("click", function () {
          navigator.clipboard && navigator.clipboard.writeText(walletAddress);
        });
        body.appendChild(wallet);
      }
      var frame = document.createElement("iframe");
      frame.className = "do-ramp-frame";
      frame.title = "Onramper checkout";
      frame.allow = "accelerometer; autoplay; camera; gyroscope; payment; microphone";
      frame.setAttribute("allowpopups", "true");
      frame.src = url;
      body.appendChild(frame);
      openButton.disabled = false;
      openButton.onclick = function () {
        window.open(url, "_blank", "noopener,noreferrer");
      };
    } catch (error) {
      body.innerHTML = '<div class="do-ramp-status">Ramp checkout could not load. Please try again.</div>';
      openButton.disabled = true;
      console.error("Do-Wallet Onramper ramp failed", error);
    }
  }

  function closeRamp() {
    var overlay = document.getElementById(MODAL_ID);
    if (!overlay) return;
    overlay.dataset.open = "false";
    var body = overlay.querySelector(".do-ramp-body");
    if (body) body.innerHTML = "";
  }

  function visible(element) {
    if (!element || !element.isConnected) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isReceiveAction(element) {
    if (!element || element.closest("#" + MODAL_ID) || element.closest(".do-ramp-inline-launcher")) return false;
    var label = text(element.getAttribute("aria-label") || element.textContent).toLowerCase();
    return label === "receive" || /^receive\b/.test(label);
  }

  function hasActionLabel(element, label) {
    var wanted = String(label || "").toLowerCase();
    return Array.prototype.slice.call(element.querySelectorAll("button,a,[role='button'],h1,h2,h3,strong,span,p,div"))
      .some(function (child) {
        return text(child.getAttribute("aria-label") || child.textContent).toLowerCase() === wanted;
      });
  }

  function actionRowScore(element) {
    if (!element || element.closest("#" + MODAL_ID) || element.closest(".do-ramp-inline-launcher")) return 0;
    var label = text(element.textContent).toLowerCase();
    var hasSend = label.indexOf("send") !== -1 || hasActionLabel(element, "send");
    var hasReceive = label.indexOf("receive") !== -1 || hasActionLabel(element, "receive");
    if (!hasSend || !hasReceive) return 0;
    var rect = element.getBoundingClientRect();
    if (rect.width < 150 || rect.height < 40 || rect.height > 240) return 0;
    var className = String(element.className || "").toLowerCase();
    var score = 1000000 - Math.round(rect.width * rect.height);
    if (label.indexOf("swap") !== -1 || hasActionLabel(element, "swap")) score += 5000;
    if (className.indexOf("networth") !== -1 || className.indexOf("quick") !== -1 || className.indexOf("action") !== -1) score += 10000;
    return score;
  }

  function findActionRow() {
    var hinted = Array.prototype.slice.call(
      document.querySelectorAll('[class*="NetWorth_networth__buttons"], [class*="networth__buttons"], [class*="quick-actions"], [class*="actions"], .quick-actions')
    );
    var broad = Array.prototype.slice.call(document.querySelectorAll("section div, main div, #station div, #do-wallet div, #app div"));
    var scored = hinted.concat(broad).filter(visible).map(function (element) {
      return { element: element, score: actionRowScore(element) };
    }).filter(function (item) {
      return item.score > 0;
    }).sort(function (left, right) {
      return right.score - left.score;
    });
    return scored.length ? scored[0].element : null;
  }

  function findReceiveTileInRow(row) {
    if (!row) return null;
    var children = Array.prototype.slice.call(row.children || []).filter(visible);
    var direct = children.find(isReceiveAction);
    if (direct) return direct;
    var labels = Array.prototype.slice.call(row.querySelectorAll("button,a,[role='button'],h1,h2,h3,strong,span,p,div")).filter(visible);
    var receiveLabel = labels.find(isReceiveAction);
    if (!receiveLabel) return null;
    var tile = receiveLabel;
    while (tile && tile.parentElement && tile.parentElement !== row) tile = tile.parentElement;
    return tile && tile.parentElement === row ? tile : receiveLabel.closest("button,a,[role='button']") || receiveLabel;
  }

  function findReceiveAction() {
    var row = findActionRow();
    var tile = findReceiveTileInRow(row);
    if (tile) return tile;
    var candidates = Array.prototype.slice.call(document.querySelectorAll("button,a,[role='button']"));
    return candidates.find(function (element) {
      return isReceiveAction(element) && visible(element);
    }) || null;
  }

  function relabelLauncher(element) {
    element.setAttribute("aria-label", "Buy / Sell");
    element.setAttribute("title", "Buy / Sell");
    Array.prototype.slice.call(element.querySelectorAll("[aria-label],[title]")).forEach(function (child) {
      child.removeAttribute("aria-label");
      child.removeAttribute("title");
    });
    var replaced = false;
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (/receive/i.test(node.nodeValue || "")) {
          node.nodeValue = (node.nodeValue || "").replace(/receive/ig, "Buy / Sell");
          replaced = true;
        }
        return;
      }
      Array.prototype.slice.call(node.childNodes || []).forEach(walk);
    }
    walk(element);
    if (!replaced) {
      var label = element.querySelector("h2,h3,strong,span,p,div");
      if (label) label.textContent = "Buy / Sell";
      else element.textContent = "Buy / Sell";
    }
    Array.prototype.slice.call(element.querySelectorAll("span")).forEach(function (child) {
      if (text(child.textContent).toLowerCase() === "r") child.textContent = "B/S";
    });
  }

  function createInlineLauncher(receiveAction) {
    var launcher = receiveAction.cloneNode(true);
    launcher.classList.add("do-ramp-inline-launcher");
    launcher.removeAttribute("href");
    launcher.removeAttribute("target");
    launcher.removeAttribute("rel");
    launcher.removeAttribute("aria-current");
    launcher.disabled = false;
    if (!/^(button|a)$/i.test(launcher.tagName || "")) {
      launcher.setAttribute("role", "button");
      launcher.tabIndex = 0;
    }
    Array.prototype.slice.call(launcher.querySelectorAll("[data-action],a,button")).forEach(function (child) {
      child.removeAttribute("data-action");
      child.removeAttribute("href");
      child.removeAttribute("target");
      child.removeAttribute("rel");
      child.removeAttribute("aria-current");
      child.disabled = false;
      if ((child.tagName || "").toLowerCase() === "button") child.type = "button";
    });
    relabelLauncher(launcher);
    function activate(event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openRamp(CONFIG.mode || "buy,sell");
    }
    launcher.addEventListener("click", activate, true);
    launcher.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") activate(event);
    });
    return launcher;
  }

  function ensureLauncher() {
    var existing = document.querySelector(".do-ramp-inline-launcher");
    if (existing && existing.isConnected && visible(existing)) return;
    if (existing) existing.remove();
    if (!validApiKey(getApiKey()) && CONFIG.showWhenUnconfigured !== true) return;
    var receiveAction = findReceiveAction();
    if (!receiveAction || !receiveAction.parentNode) return;
    receiveAction.parentNode.classList.add("do-ramp-action-row");
    receiveAction.parentNode.insertBefore(createInlineLauncher(receiveAction), receiveAction.nextSibling);
    warmWidgetUrl(CONFIG.mode || "buy,sell", true).catch(function () {});
  }

  function init() {
    if (!document.body) return;
    ensureModal();
    ensureLauncher();
    var params = new URLSearchParams(window.location.search);
    if (params.get("ramp")) {
      window.setTimeout(function () {
        openRamp(params.get("ramp"));
      }, 500);
    }
    var ensureTimer = 0;
    function scheduleEnsure(delay) {
      if (ensureTimer) return;
      ensureTimer = window.setTimeout(function () {
        ensureTimer = 0;
        ensureLauncher();
      }, Number.isFinite(delay) ? delay : 32);
    }
    var observer = new MutationObserver(scheduleEnsure);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(function () {
      observer.disconnect();
    }, 8000);
    [0, 40, 100, 220, 500, 1000, 2000].forEach(function (delay) {
      window.setTimeout(function () {
        scheduleEnsure(0);
      }, delay);
    });
  }

  window.addEventListener("focus", ensureLauncher);
  window.addEventListener("storage", ensureLauncher);
  window.addEventListener("do_wallet_bridge_update", ensureLauncher);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
