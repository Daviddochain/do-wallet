(function () {
  "use strict";

  if (window.__doWalletSwapRedemptionInstalled) return;
  window.__doWalletSwapRedemptionInstalled = true;
  try {
    document.documentElement.setAttribute("data-do-swap-redemption", "installing");
  } catch (error) {}

  var TERRA_CHAIN_ID = "columbus-5";
  var DO_CHAIN_ID = "Do-Chain";
  var DO_WALLET_CHAIN_ID = DO_CHAIN_ID;
  var LEGACY_DO_WALLET_CHAIN_ID = DO_CHAIN_ID;
  var SOURCE_DENOM = "uluna";
  var FEE_AMOUNT = "20000000";
  var GAS_AMOUNT = "500000";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var BRIDGE_TTL_MS = 10 * 60 * 1000;
  var ROOT_ID = "dochain-swap-redemption-root";
  var WALLET_OPEN_TARGET = "dochain-swap-redemption";
  var WALLET_OPEN_TYPE = "OPEN_WALLET_POPUP";

  var ROUTES = {
    DO: {
      id: "DO",
      sourceLabel: "LUNC DO Cookie",
      sourceDetail: "Terra Classic CW20",
      sourceContract: "terra15p8su45k45axng8ue59rl6zph4at27s49u3agr6uqrx3dhcxpg3qt0ekdt",
      targetLabel: "native DO",
      payoutDenom: "DO",
      memoAsset: "DO",
    },
    DODx: {
      id: "DODx",
      sourceLabel: "BAKED",
      sourceDetail: "Terra Classic CW20",
      sourceContract: "terra12ckccpalj2y9h54syyst4lpqp79duc9cpxfsyvne409rjw93s8qs2eneh3",
      targetLabel: "native DODx",
      payoutDenom: "DODx",
      memoAsset: "DODx",
    },
  };

  function shouldRunHere() {
    try {
      if (window.location.protocol !== "https:" && window.location.protocol !== "http:") return false;
      var host = window.location.hostname.toLowerCase();
      return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "[::1]" ||
        host === "::1" ||
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

  function readBridgePayload() {
    var bridge = safeJson(window.localStorage.getItem(BRIDGE_KEY), null);
    if (!isObject(bridge)) return null;
    var updatedAt = Number(bridge.updatedAt);
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt > BRIDGE_TTL_MS) return null;
    return bridge;
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function readWallet() {
    var bridge = readBridgePayload();
    var bridgeWallet = walletFromPayload(bridge) || bridge;
    var userWallet = safeJson(window.localStorage.getItem("user"), null);
    var authWallet = walletFromPayload(safeJson(window.localStorage.getItem(AUTH_KEY), null));
    return walletFromPayload(userWallet) || (isObject(userWallet) ? userWallet : null) || authWallet || (isObject(bridgeWallet) ? bridgeWallet : null);
  }

  function isDoAddress(value) {
    return /^do1[ac-hj-np-z02-9]{20,90}$/i.test(text(value));
  }

  function isTerraAddress(value) {
    return /^terra1[ac-hj-np-z02-9]{20,90}$/i.test(text(value));
  }

  function collectNestedStrings(value, out, depth) {
    if (!value || depth > 4) return;
    if (typeof value === "string") {
      out.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (item) { collectNestedStrings(item, out, depth + 1); });
      return;
    }
    if (!isObject(value)) return;
    Object.keys(value).forEach(function (key) {
      if (/private|seed|mnemonic|password|secret|token/i.test(key)) return;
      collectNestedStrings(value[key], out, depth + 1);
    });
  }

  function getDoAddress(wallet) {
    if (!isObject(wallet)) return "";
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var addressMap = isObject(wallet.addressMap) ? wallet.addressMap : {};
    var candidates = [
      addresses["888"],
      addressMap["888"],
      addresses[DO_CHAIN_ID],
      addressMap[DO_CHAIN_ID],
      wallet.doAddress,
      wallet.doChainAddress,
      wallet.address,
    ];
    collectNestedStrings(addresses, candidates, 0);
    collectNestedStrings(addressMap, candidates, 0);
    collectNestedStrings(wallet.chains, candidates, 0);
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = text(candidates[i]);
      if (isDoAddress(candidate)) return candidate;
    }
    return "";
  }

  function getTerraAddress(wallet) {
    if (!isObject(wallet)) return "";
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var addressMap = isObject(wallet.addressMap) ? wallet.addressMap : {};
    var candidates = [
      addresses[TERRA_CHAIN_ID],
      addresses["Terra Classic"],
      addresses["terra-classic"],
      addresses.lunc,
      addressMap[TERRA_CHAIN_ID],
      addressMap["Terra Classic"],
      addressMap["terra-classic"],
      wallet.terraAddress,
      wallet.luncAddress,
      wallet.address,
    ];
    collectNestedStrings(addresses, candidates, 0);
    collectNestedStrings(addressMap, candidates, 0);
    collectNestedStrings(wallet.chains, candidates, 0);
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = text(candidates[i]);
      if (isTerraAddress(candidate)) return candidate;
    }
    return "";
  }

  function visibleAddress(pattern) {
    var bodyText = String((document.body && document.body.textContent) || "");
    var match = bodyText.match(pattern);
    return match ? match[0] : "";
  }

  function getCurrentDoAddress() {
    return getDoAddress(readWallet()) || visibleAddress(/\bdo1[ac-hj-np-z02-9]{20,90}\b/i);
  }

  function getCurrentTerraAddress() {
    return getTerraAddress(readWallet()) || visibleAddress(/\bterra1[ac-hj-np-z02-9]{20,90}\b/i);
  }

  function getWalletPoster() {
    var wallet = window.doWallet;
    return wallet && typeof wallet.post === "function" ? wallet : null;
  }

  function requestWalletPopup() {
    try {
      window.postMessage({
        target: WALLET_OPEN_TARGET,
        type: WALLET_OPEN_TYPE,
        source: "dochain-swap-redemption",
      }, window.location.origin);
    } catch (error) {}
    try {
      window.dispatchEvent(new CustomEvent("dochain_swap_open_wallet_popup"));
    } catch (error) {}
  }

  function parseUnits(value, decimals) {
    var clean = text(value).replace(/,/g, "");
    if (!/^\d*(?:\.\d*)?$/.test(clean) || clean === "" || clean === ".") return null;
    var parts = clean.split(".");
    var whole = parts[0] || "0";
    var fraction = (parts[1] || "").slice(0, decimals);
    while (fraction.length < decimals) fraction += "0";
    try {
      var unit = 10n ** BigInt(decimals);
      return BigInt(whole || "0") * unit + BigInt(fraction || "0");
    } catch (error) {
      return null;
    }
  }

  function addCommas(value) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatUnits(value, decimals, maxFraction) {
    var raw = String(value || "0");
    var negative = raw.charAt(0) === "-";
    if (negative) raw = raw.slice(1);
    while (raw.length <= decimals) raw = "0" + raw;
    var whole = raw.slice(0, -decimals) || "0";
    var fraction = raw.slice(-decimals).replace(/0+$/, "");
    if (typeof maxFraction === "number" && fraction.length > maxFraction) {
      fraction = fraction.slice(0, maxFraction).replace(/0+$/, "");
    }
    return (negative ? "-" : "") + addCommas(whole) + (fraction ? "." + fraction : "");
  }

  function currentRoute() {
    var root = document.getElementById(ROOT_ID);
    var select = root && root.querySelector("[name='route']");
    return ROUTES[(select && select.value) || "DO"] || ROUTES.DO;
  }

  function currentValue(name) {
    var root = document.getElementById(ROOT_ID);
    var node = root && root.querySelector("[name='" + name + "']");
    return text(node && node.value);
  }

  function setStatus(message, kind) {
    var node = document.querySelector("#" + ROOT_ID + " .dochain-swap-status");
    if (!node) return;
    node.className = "dochain-swap-status" + (kind ? " dochain-swap-" + kind : "");
    node.textContent = message || "";
  }

  function makeExecuteContract(sender, contract, amount) {
    var msg = { burn: { amount: amount } };
    var data = {
      "@type": "/cosmwasm.wasm.v1.MsgExecuteContract",
      sender: sender,
      contract: contract,
      msg: msg,
      funds: [],
    };
    var amino = {
      type: "wasm/MsgExecuteContract",
      value: {
        sender: sender,
        contract: contract,
        msg: msg,
        funds: [],
      },
    };
    return {
      toData: function () { return data; },
      toJSON: function () { return amino; },
    };
  }

  function makeFee() {
    var fee = { amount: [{ denom: SOURCE_DENOM, amount: FEE_AMOUNT }], gas_limit: GAS_AMOUNT };
    return {
      toData: function () { return fee; },
      toJSON: function () { return fee; },
    };
  }

  function toTxData(value) {
    if (!value || typeof value === "string") return value;
    if (typeof value.toData === "function") {
      try {
        return value.toData(false);
      } catch (error) {
        return value.toData();
      }
    }
    if (typeof value.toJSON === "function") return value.toJSON();
    return value;
  }

  function serializeForExtensionPost(tx) {
    return {
      chainID: tx.chainID,
      msgs: (tx.msgs || []).map(toTxData),
      fee: tx.fee ? toTxData(tx.fee) : tx.fee,
      memo: tx.memo || "",
      waitForConfirmation: true,
    };
  }

  function renderQuote() {
    var route = currentRoute();
    var amount = parseUnits(currentValue("amount"), 6);
    var summary = document.querySelector("#" + ROOT_ID + " [data-role='quote']");
    var button = document.querySelector("#" + ROOT_ID + " [data-action='submit']");
    var message = "";
    var valid = Boolean(amount && amount > 0n);
    if (!valid) message = "Enter an amount to redeem.";
    if (summary) {
      summary.innerHTML =
        "<div><span>Route</span><strong>" + escapeHtml(route.sourceLabel) + " -> " + escapeHtml(route.payoutDenom) + "</strong></div>" +
        "<div><span>Rate</span><strong>1:1</strong></div>" +
        "<div><span>You burn</span><strong>" + (valid ? formatUnits(amount.toString(), 6, 6) : "-") + " " + escapeHtml(route.sourceLabel) + "</strong></div>" +
        "<div><span>You receive</span><strong>" + (valid ? formatUnits(amount.toString(), 6, 6) : "-") + " " + escapeHtml(route.payoutDenom) + "</strong></div>" +
        "<p>Source is Terra Classic CW20. Destination is native Do-chain " + escapeHtml(route.payoutDenom) + ".</p>";
    }
    if (button) {
      button.disabled = !valid;
      button.title = valid ? "Create the Terra Classic burn transaction." : message;
    }
    setStatus(valid ? "Ready to burn " + formatUnits(amount.toString(), 6, 6) + " " + route.sourceLabel + "." : message, valid ? "" : "error");
  }

  function submitSwap() {
    var route = currentRoute();
    var sender = currentValue("terraSender");
    var recipient = currentValue("doRecipient");
    var amount = parseUnits(currentValue("amount"), 6);
    if (!isTerraAddress(sender)) {
      setStatus("Enter a valid Terra Classic sender address.", "error");
      return;
    }
    if (!isDoAddress(recipient)) {
      setStatus("Enter a valid Do-chain receiving address.", "error");
      return;
    }
    if (!amount || amount <= 0n) {
      setStatus("Enter a valid amount.", "error");
      return;
    }
    var poster = getWalletPoster();
    if (!poster) {
      setStatus("Do-Wallet signing was not detected. Open the wallet extension and try again.", "error");
      requestWalletPopup();
      return;
    }
    var memo = JSON.stringify({
      do_redemption: {
        v: 1,
        asset: route.memoAsset,
        to: recipient,
      },
    });
    var tx = {
      chainID: TERRA_CHAIN_ID,
      msgs: [makeExecuteContract(sender, route.sourceContract, amount.toString())],
      fee: makeFee(),
      memo: memo,
      waitForConfirmation: true,
    };
    setStatus("Opening Do-Wallet for the Terra Classic burn approval.");
    requestWalletPopup();
    Promise.resolve(poster.post(serializeForExtensionPost(tx))).then(function () {
      setStatus("Burn submitted. Native " + route.payoutDenom + " will be paid after redemption confirmations.", "success");
    }).catch(function (error) {
      setStatus((error && error.message) || "Swap transaction was not submitted.", "error");
    });
  }

  function markup() {
    var terra = escapeHtml(getCurrentTerraAddress());
    var doAddress = escapeHtml(getCurrentDoAddress());
    return "" +
      "<div id=\"" + ROOT_ID + "\" class=\"dochain-swap-redemption\">" +
      "<header class=\"dochain-swap-header\"><h1>Swap</h1></header>" +
      "<section class=\"dochain-swap-card\">" +
      "<div class=\"dochain-swap-card-head\">" +
      "<h2>Swap Terra Classic tokens to native Do-chain coins</h2>" +
      "<p>Burn supported Terra Classic CW20 tokens permanently and receive native coins from the Do-chain treasury.</p>" +
      "</div>" +
      "<div class=\"dochain-swap-grid\">" +
      "<div class=\"dochain-swap-form\">" +
      "<label><span>Do-chain receiving address</span><input name=\"doRecipient\" value=\"" + doAddress + "\" autocomplete=\"off\" placeholder=\"do1...\"></label>" +
      "<label><span>From asset</span><select name=\"route\">" +
      "<option value=\"DO\">LUNC DO Cookie -> native DO</option>" +
      "<option value=\"DODx\">BAKED -> native DODx</option>" +
      "</select></label>" +
      "<label><span>Amount</span><input name=\"amount\" inputmode=\"decimal\" autocomplete=\"off\" placeholder=\"0.000000\"></label>" +
      "<label><span>Terra Classic sender</span><input name=\"terraSender\" value=\"" + terra + "\" autocomplete=\"off\" placeholder=\"terra1...\"></label>" +
      "<div class=\"dochain-swap-actions\">" +
      "<button type=\"button\" class=\"dochain-swap-primary\" data-action=\"submit\">Burn and redeem</button>" +
      "</div>" +
      "<div class=\"dochain-swap-status\"></div>" +
      "</div>" +
      "<aside class=\"dochain-swap-summary\" data-role=\"quote\"></aside>" +
      "</div>" +
      "<div class=\"dochain-swap-contracts\">" +
      "<div><span>LUNC DO Cookie contract</span><code>" + ROUTES.DO.sourceContract + "</code></div>" +
      "<div><span>BAKED contract</span><code>" + ROUTES.DODx.sourceContract + "</code></div>" +
      "</div>" +
      "</section>" +
      "</div>";
  }

  function findSwapContainer() {
    var stable =
      document.querySelector("main [class*='Page_grid']") ||
      document.querySelector("main [class*='Page_main']") ||
      document.querySelector("main article[class*='Page_page']");
    if (stable && text(stable.textContent).indexOf("Swap") >= 0) return stable;

    var headings = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3"));
    var swapHeading = headings.find(function (node) { return text(node.textContent) === "Swap"; });
    var nativeHeading = headings.find(function (node) { return text(node.textContent) === "Swap to Native DO"; });
    if (swapHeading) {
      var node = swapHeading;
      for (var depth = 0; node && node !== document.body && depth < 7; depth += 1) {
        if (String(node.className || "").indexOf("Page_grid") >= 0 || String(node.className || "").indexOf("Page_page") >= 0) return node;
        node = node.parentElement;
      }
    }
    if (nativeHeading) {
      var card = nativeHeading.closest("article,main,section,div");
      if (card) return card;
    }
    return null;
  }

  function isSwapRoute() {
    return /^\/swap\/?$/.test(window.location.pathname) || /(^|#)\/swap\/?$/.test(window.location.hash);
  }

  function renderSwapPage() {
    if (!isSwapRoute()) return;
    var existing = document.getElementById(ROOT_ID);
    if (existing) {
      try {
        document.documentElement.setAttribute("data-do-swap-redemption", "ready");
      } catch (error) {}
      return true;
    }
    var container = findSwapContainer();
    if (!container) return false;
    container.innerHTML = markup();
    container.classList.add("dochain-swap-redemption-host");
    var root = document.getElementById(ROOT_ID);
    root.addEventListener("input", renderQuote);
    root.addEventListener("change", renderQuote);
    root.addEventListener("click", function (event) {
      var action = event.target && event.target.closest && event.target.closest("[data-action]");
      if (action && action.getAttribute("data-action") === "submit") submitSwap();
    });
    renderQuote();
    try {
      document.documentElement.setAttribute("data-do-swap-redemption", "rendered");
    } catch (error) {}
    return true;
  }

  function schedule() {
    if (schedule.pending) return;
    schedule.pending = true;
    var run = function () {
      schedule.pending = false;
      renderSwapPage();
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else window.setTimeout(run, 0);
  }

  function retryRender() {
    [0, 50, 150, 350, 750, 1500, 3000].forEach(function (delay) {
      window.setTimeout(renderSwapPage, delay);
    });
  }

  window.addEventListener("load", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("do_wallet_bridge_update", schedule);
  try {
    var observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(function () {
      observer.disconnect();
    }, 8000);
  } catch (error) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", retryRender, { once: true });
  else retryRender();
})();
