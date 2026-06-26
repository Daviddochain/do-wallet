(function () {
  "use strict";

  if (window.__doWalletDoBurnDodxInstalled) return;
  window.__doWalletDoBurnDodxInstalled = true;

  var CHAIN_ID = "Do-Chain";
  var WALLET_CHAIN_ID = CHAIN_ID;
  var LEGACY_WALLET_CHAIN_ID = CHAIN_ID;
  var WALLET_CHAIN_IDS = [CHAIN_ID];
  var SOURCE_DENOM = "udo";
  var TARGET_DENOM = "udodx";
  var BURN_ADDRESS = "do1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqe7rpsy";
  var EXISTING_ISSUED = 61469000000n;
  var MAX_ISSUED = 110000000000n;
  var UNIT = 1000000n;
  var FEE_AMOUNT = "5000";
  var GAS_AMOUNT = "200000";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var BRIDGE_TTL_MS = 10 * 60 * 1000;
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var MODAL_ID = "dochain-do-burn-dodx-modal";
  var LAUNCHER_CLASS = "dochain-do-burn-launcher";
  var NAV_CLASS = "dochain-do-burn-nav-link";
  var WALLET_OPEN_TARGET = "dochain-do-burn-dodx";
  var WALLET_OPEN_TYPE = "OPEN_WALLET_POPUP";
  var burnRouteRetryToken = 0;

  var tiers = [
    { id: 1, from: 50000000000n, to: 60000000000n, doPerDodx: 2500000000n },
    { id: 2, from: 60000000000n, to: 65000000000n, doPerDodx: 3500000000n },
    { id: 3, from: 65000000000n, to: 70000000000n, doPerDodx: 4000000000n },
    { id: 4, from: 70000000000n, to: 75000000000n, doPerDodx: 4500000000n },
    { id: 5, from: 75000000000n, to: 80000000000n, doPerDodx: 5000000000n },
    { id: 6, from: 80000000000n, to: 85000000000n, doPerDodx: 5500000000n },
    { id: 7, from: 85000000000n, to: 90000000000n, doPerDodx: 6000000000n },
    { id: 8, from: 90000000000n, to: 95000000000n, doPerDodx: 6500000000n },
    { id: 9, from: 95000000000n, to: 100000000000n, doPerDodx: 7000000000n },
    { id: 10, from: 100000000000n, to: 105000000000n, doPerDodx: 7500000000n },
    { id: 11, from: 105000000000n, to: 110000000000n, doPerDodx: 8000000000n },
  ];

  var liveState = {
    burnedUdo: 0n,
    issued: EXISTING_ISSUED,
    loaded: false,
    loading: false,
    error: "",
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

  if (!shouldRunHere() || typeof BigInt !== "function") return;

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

  function getDoAddress(wallet) {
    if (!isObject(wallet)) return "";
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var addressMap = isObject(wallet.addressMap) ? wallet.addressMap : {};
    var words = isObject(wallet.words) ? wallet.words : {};
    var candidates = [
      addresses["888"],
      addressMap["888"],
      addresses[CHAIN_ID],
      addressMap[CHAIN_ID],
      addresses.dochain,
      words[CHAIN_ID],
      wallet.address,
      wallet.accAddress,
      wallet.accountAddress,
      wallet.doAddress,
      wallet.doChainAddress,
    ];
    Object.keys(addresses).forEach(function (key) { candidates.push(addresses[key]); });
    Object.keys(addressMap).forEach(function (key) { candidates.push(addressMap[key]); });
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = text(candidates[i]);
      if (isDoAddress(candidate)) return candidate;
    }
    return "";
  }

  function getVisibleDoAddress() {
    var bodyText = String((document.body && document.body.textContent) || "");
    var match = bodyText.match(/\bdo1[ac-hj-np-z02-9]{20,90}\b/i);
    return match ? match[0] : "";
  }

  function getCurrentAccount() {
    return getDoAddress(readWallet()) || getVisibleDoAddress();
  }

  function findKnownWalletChainID(value, depth) {
    if (!value || depth > 4) return "";
    if (typeof value === "string") {
      var found = text(value);
      return WALLET_CHAIN_IDS.indexOf(found) >= 0 ? found : "";
    }
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) {
        var arrayFound = findKnownWalletChainID(value[i], depth + 1);
        if (arrayFound) return arrayFound;
      }
      return "";
    }
    if (!isObject(value)) return "";
    var direct = [
      value.chainID,
      value.chainId,
      value.chain_id,
      value.selectedChainID,
      value.selectedChainId,
      value.selectedChain,
      value.network,
      value.chain && value.chain.chainID,
      value.chain && value.chain.chainId,
      value.chain && value.chain.chain_id,
    ];
    for (var j = 0; j < direct.length; j += 1) {
      var directFound = findKnownWalletChainID(direct[j], depth + 1);
      if (directFound) return directFound;
    }
    return "";
  }

  function getCurrentWalletChainID() {
    var fromBridge = findKnownWalletChainID(readBridgePayload(), 0);
    if (fromBridge) return fromBridge;
    var fromWallet = findKnownWalletChainID(readWallet(), 0);
    if (fromWallet) return fromWallet;
    return WALLET_CHAIN_ID;
  }

  function getPostChainID() {
    return WALLET_CHAIN_ID;
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
        source: "dochain-do-burn-dodx",
      }, window.location.origin);
    } catch (error) {}
    try {
      window.dispatchEvent(new CustomEvent("dochain_do_burn_open_wallet_popup"));
    } catch (error) {}
  }

  function isBurnRoute() {
    return window.location.pathname === "/burn-do" || window.location.hash === "#burn-do";
  }

  function setBurnRouteModalMode(enabled) {
    document.documentElement.removeAttribute("data-dochain-burn-route-modal");
    if (enabled) document.documentElement.setAttribute("data-dochain-burn-page", "true");
    else document.documentElement.removeAttribute("data-dochain-burn-page");
  }

  function min(a, b) {
    return a < b ? a : b;
  }

  function max(a, b) {
    return a > b ? a : b;
  }

  function sourceForSlice(microAmount, tier) {
    return microAmount * tier.doPerDodx * UNIT / UNIT;
  }

  function quoteFrom(currentIssued, amountMicro) {
    if (amountMicro <= 0n) return { ok: false, error: "Enter a DODx amount.", requiredUdo: 0n, slices: [] };
    if (currentIssued >= MAX_ISSUED) return { ok: false, error: "The DODx ratchet pool is fully claimed.", requiredUdo: 0n, slices: [] };
    var target = currentIssued + amountMicro;
    if (target > MAX_ISSUED) {
      return {
        ok: false,
        error: "Only " + formatUnits(MAX_ISSUED - currentIssued, 6, 6) + " DODx remains in the pool.",
        requiredUdo: 0n,
        slices: [],
      };
    }
    var cursor = currentIssued;
    var required = 0n;
    var slices = [];
    for (var i = 0; i < tiers.length; i += 1) {
      var tier = tiers[i];
      if (cursor >= target) break;
      if (cursor >= tier.to || target <= tier.from) continue;
      var start = max(cursor, tier.from);
      var end = min(target, tier.to);
      var slice = end - start;
      if (slice <= 0n) continue;
      var source = sourceForSlice(slice, tier);
      required += source;
      slices.push({ tier: tier, amount: slice, source: source });
      cursor = end;
    }
    if (cursor !== target) return { ok: false, error: "This amount falls outside the configured ratchet tiers.", requiredUdo: 0n, slices: [] };
    return { ok: true, error: "", requiredUdo: required, slices: slices };
  }

  function issuedFromBurned(burnedUdo) {
    var issued = 0n;
    var remaining = burnedUdo;
    var cursor = EXISTING_ISSUED;
    for (var i = 0; i < tiers.length; i += 1) {
      var tier = tiers[i];
      if (cursor >= MAX_ISSUED || remaining <= 0n) break;
      if (cursor >= tier.to) continue;
      var available = tier.to - max(cursor, tier.from);
      if (available <= 0n) continue;
      var sourceNeeded = sourceForSlice(available, tier);
      if (remaining >= sourceNeeded) {
        issued += available;
        remaining -= sourceNeeded;
        cursor += available;
      } else {
        var partial = remaining / tier.doPerDodx;
        partial = min(partial, available);
        issued += partial;
        cursor += partial;
        remaining = 0n;
      }
    }
    return issued;
  }

  function parseUnits(value, decimals) {
    var clean = text(value).replace(/,/g, "");
    if (!/^\d*(?:\.\d*)?$/.test(clean) || clean === "" || clean === ".") return null;
    var parts = clean.split(".");
    var whole = parts[0] || "0";
    var fraction = (parts[1] || "").slice(0, decimals);
    while (fraction.length < decimals) fraction += "0";
    try {
      return BigInt(whole || "0") * (10n ** BigInt(decimals)) + BigInt(fraction || "0");
    } catch (error) {
      return null;
    }
  }

  function addCommas(value) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatUnits(value, decimals, maxFraction) {
    var negative = value < 0n;
    var raw = (negative ? -value : value).toString();
    while (raw.length <= decimals) raw = "0" + raw;
    var whole = raw.slice(0, -decimals) || "0";
    var fraction = raw.slice(-decimals).replace(/0+$/, "");
    if (typeof maxFraction === "number" && fraction.length > maxFraction) {
      fraction = fraction.slice(0, maxFraction).replace(/0+$/, "");
    }
    return (negative ? "-" : "") + addCommas(whole) + (fraction ? "." + fraction : "");
  }

  function formatDo(value) {
    return formatUnits(value, 6, 6);
  }

  function formatDodx(value) {
    return formatUnits(value, 6, 6);
  }

  function activeTier(currentIssued) {
    for (var i = 0; i < tiers.length; i += 1) {
      if (currentIssued >= tiers[i].from && currentIssued < tiers[i].to) return tiers[i];
    }
    return currentIssued >= MAX_ISSUED ? tiers[tiers.length - 1] : tiers[0];
  }

  function fetchBurnedUdo() {
    liveState.loading = true;
    liveState.error = "";
    renderQuote();
    return fetch("/station-assets/api/lcd/Do-Chain/cosmos/bank/v1beta1/balances/" + encodeURIComponent(BURN_ADDRESS) + "/by_denom?denom=" + encodeURIComponent(SOURCE_DENOM), {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.message || data.error || "Could not load burn address balance.");
        var amount = data && data.balance && data.balance.amount ? String(data.balance.amount) : "0";
        liveState.burnedUdo = BigInt(amount);
        liveState.issued = EXISTING_ISSUED + issuedFromBurned(liveState.burnedUdo);
        if (liveState.issued > MAX_ISSUED) liveState.issued = MAX_ISSUED;
        liveState.loaded = true;
      });
    }).catch(function (error) {
      liveState.error = error.message || "Live ratchet status is unavailable.";
      liveState.loaded = false;
      liveState.issued = EXISTING_ISSUED;
    }).finally(function () {
      liveState.loading = false;
      renderQuote();
    });
  }

  function makeSend(account, amount) {
    var data = {
      "@type": "/cosmos.bank.v1beta1.MsgSend",
      from_address: account,
      to_address: BURN_ADDRESS,
      amount: [{ denom: SOURCE_DENOM, amount: amount }],
    };
    var amino = {
      type: "cosmos-sdk/MsgSend",
      value: {
        from_address: account,
        to_address: BURN_ADDRESS,
        amount: [{ denom: SOURCE_DENOM, amount: amount }],
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
      chainId: tx.chainID,
      chain_id: tx.chainID,
      network: tx.chainID,
      networkId: tx.chainID,
      chainName: "Do-Chain",
      msgs: (tx.msgs || []).map(toTxData),
      fee: tx.fee ? toTxData(tx.fee) : tx.fee,
      memo: tx.memo || "",
      waitForConfirmation: true,
    };
  }

  function currentFormValue(name) {
    var modal = document.getElementById(MODAL_ID);
    var node = modal && modal.querySelector("[name=\"" + name + "\"]");
    return text(node && node.value);
  }

  function setStatus(message, kind) {
    var node = document.querySelector("#" + MODAL_ID + " .dochain-do-burn-status");
    if (!node) return;
    node.className = "dochain-do-burn-status" + (kind ? " dochain-do-burn-" + kind : "");
    node.textContent = message || "";
  }

  function renderTierRows(currentIssued) {
    return tiers.map(function (tier) {
      var active = currentIssued >= tier.from && currentIssued < tier.to;
      return "<tr" + (active ? " class=\"is-active\"" : "") + ">" +
        "<td>" + tier.id + "</td>" +
        "<td>" + formatDodx(tier.from) + " -> " + formatDodx(tier.to) + "</td>" +
        "<td>" + addCommas(tier.doPerDodx.toString()) + " DO</td>" +
        "</tr>";
    }).join("");
  }

  function renderQuote() {
    var modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    var amountMicro = parseUnits(currentFormValue("dodx"), 6);
    var currentIssued = liveState.issued;
    var tier = activeTier(currentIssued);
    var quote = amountMicro === null ? { ok: false, error: "Enter a valid DODx amount.", requiredUdo: 0n, slices: [] } : quoteFrom(currentIssued, amountMicro);
    var summary = modal.querySelector("[data-role=\"quote-summary\"]");
    var table = modal.querySelector("[data-role=\"tier-rows\"]");
    var button = modal.querySelector("[data-action=\"burn\"]");
    var liveText = liveState.loading
      ? "Refreshing live ratchet status..."
      : liveState.error
        ? liveState.error + " Showing the configured starting supply."
        : "Live ratchet status loaded from the Do-chain burn address.";
    if (summary) {
      summary.innerHTML =
        "<div><span>Current DODx supply</span><strong>" + formatDodx(currentIssued) + " / 110,000</strong></div>" +
        "<div><span>Active tier</span><strong>" + tier.id + " - " + addCommas(tier.doPerDodx.toString()) + " DO</strong></div>" +
        "<div><span>DODx remaining</span><strong>" + formatDodx(MAX_ISSUED - currentIssued) + "</strong></div>" +
        "<div><span>DO to burn</span><strong>" + (quote.ok ? formatDo(quote.requiredUdo) : "-") + "</strong></div>" +
        "<p>" + escapeHtml(liveText) + "</p>";
    }
    if (table) table.innerHTML = renderTierRows(currentIssued);
    if (button) {
      button.disabled = !quote.ok || liveState.loading;
      button.title = quote.ok ? "Create the Do-chain burn transaction." : quote.error;
    }
    if (!quote.ok) setStatus(quote.error, "error");
    else setStatus("Burn " + formatDo(quote.requiredUdo) + " DO to receive " + formatDodx(amountMicro || 0n) + " DODx.", "");
  }

  function modalMarkup(account, pageMode) {
    var escapedAccount = escapeHtml(account || "");
    return "" +
      (pageMode ? "<header class=\"dochain-do-burn-page-title\"><h1>Burn DO</h1></header>" : "<div class=\"dochain-do-burn-backdrop\" data-action=\"close\"></div>") +
      "<section class=\"dochain-do-burn-dialog" + (pageMode ? " dochain-do-burn-integrated\" aria-labelledby=\"dochain-do-burn-title\"" : "\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"dochain-do-burn-title\"") + ">" +
      (pageMode ? "" : "<button class=\"dochain-do-burn-close\" type=\"button\" data-action=\"close\" aria-label=\"Close\">x</button>") +
      "<div class=\"dochain-do-burn-head\">" +
      "<p>Native Do-chain</p>" +
      "<h2 id=\"dochain-do-burn-title\">Burn DO. Receive DODx.</h2>" +
      "</div>" +
      "<div class=\"dochain-do-burn-body\">" +
      "<div class=\"dochain-do-burn-grid\">" +
      "<div class=\"dochain-do-burn-panel\">" +
      "<label><span>DODx to receive</span><input name=\"dodx\" inputmode=\"decimal\" value=\"1\" autocomplete=\"off\"></label>" +
      "<label><span>Receiving Do address</span><input name=\"recipient\" value=\"" + escapedAccount + "\" autocomplete=\"off\"></label>" +
      "<label><span>Sending Do address</span><input name=\"account\" value=\"" + escapedAccount + "\" autocomplete=\"off\"></label>" +
      "<div class=\"dochain-do-burn-quote\" data-role=\"quote-summary\"></div>" +
      "<div class=\"dochain-do-burn-actions\">" +
      "<button type=\"button\" class=\"dochain-do-burn-primary\" data-action=\"burn\">Burn DO</button>" +
      "<button type=\"button\" class=\"dochain-do-burn-secondary\" data-action=\"refresh\">Refresh</button>" +
      "</div>" +
      "<div class=\"dochain-do-burn-status\"></div>" +
      "</div>" +
      "<div class=\"dochain-do-burn-panel dochain-do-burn-table-panel\">" +
      "<table><thead><tr><th>Tier</th><th>DODx supply</th><th>DO per DODx</th></tr></thead><tbody data-role=\"tier-rows\"></tbody></table>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</section>";
  }

  function burnPageContainerScore(element) {
    if (!element || !visible(element)) return -1;
    if (element.closest && element.closest("nav,aside,header,#" + MODAL_ID)) return -1;
    var rect = element.getBoundingClientRect();
    if (rect.width < 360 || rect.height < 180) return -1;
    var className = String(element.className || "");
    var score = Math.round(rect.width * rect.height);
    if (/Page_(grid|page|main)|page/i.test(className)) score += 1000000;
    if (element.querySelector && element.querySelector("h1,h2")) score += 100000;
    return score;
  }

  function findBurnPageContainer() {
    var existingHost = document.querySelector(".dochain-do-burn-page-host");
    if (existingHost && existingHost.isConnected) return existingHost;

    var selectors = [
      "main [class*='Page_grid']",
      "main [class*='Page_main']",
      "main article[class*='Page_page']",
      "main section[class*='Page_page']",
      "main div[class*='Page_page']"
    ];
    for (var i = 0; i < selectors.length; i += 1) {
      var direct = document.querySelector(selectors[i]);
      if (burnPageContainerScore(direct) > 0) return direct;
    }

    var headings = Array.prototype.slice.call(document.querySelectorAll("main h1, main h2"));
    for (var j = 0; j < headings.length; j += 1) {
      var node = headings[j];
      var current = node.parentElement;
      var best = null;
      for (var depth = 0; current && current !== document.body && depth < 8; depth += 1) {
        if (burnPageContainerScore(current) > burnPageContainerScore(best)) best = current;
        if ((current.tagName || "").toLowerCase() === "main") break;
        current = current.parentElement;
      }
      if (best) return best;
    }

    var main = document.querySelector("main");
    if (!main) return null;
    var children = Array.prototype.slice.call(main.children || []).filter(function (child) {
      return burnPageContainerScore(child) > 0;
    }).sort(function (left, right) {
      return burnPageContainerScore(right) - burnPageContainerScore(left);
    });
    return children[0] || main;
  }

  function activateBurnRoot(root, focusFirst) {
    if (!root || root.getAttribute("data-dochain-burn-bound") === "true") return;
    root.setAttribute("data-dochain-burn-bound", "true");
    root.addEventListener("input", function () { renderQuote(); });
    root.addEventListener("click", function (event) {
      var actionNode = event.target && event.target.closest && event.target.closest("[data-action]");
      var action = actionNode && actionNode.getAttribute("data-action");
      if (!action) return;
      if (action === "close") closeModal();
      if (action === "refresh") fetchBurnedUdo();
      if (action === "burn") postBurn();
    });
    renderQuote();
    fetchBurnedUdo();
    if (focusFirst) {
      var first = root.querySelector("input[name=\"dodx\"]");
      if (first) first.focus();
    }
  }

  function renderBurnPage(pushRoute) {
    if (pushRoute && window.location.pathname !== "/burn-do") {
      try {
        window.history.pushState({}, "", "/burn-do");
      } catch (error) {}
    }
    var host = findBurnPageContainer();
    if (!host) return false;
    var existing = document.getElementById(MODAL_ID);
    if (existing && existing.getAttribute("data-dochain-burn-mode") === "page" && host.contains(existing)) {
      setBurnRouteModalMode(true);
      document.body.style.overflow = "";
      renderQuote();
      return true;
    }
    if (existing) existing.remove();
    host.classList.add("dochain-do-burn-page-host");
    host.innerHTML = "<div id=\"" + MODAL_ID + "\" class=\"dochain-do-burn-page\" data-dochain-burn-mode=\"page\">" + modalMarkup(getCurrentAccount(), true) + "</div>";
    setBurnRouteModalMode(true);
    document.body.style.overflow = "";
    activateBurnRoot(document.getElementById(MODAL_ID), true);
    return true;
  }

  function retryBurnPage(pushRoute) {
    var token = ++burnRouteRetryToken;
    [0, 50, 150, 350, 750, 1500, 3000].forEach(function (delay) {
      window.setTimeout(function () {
        if (token !== burnRouteRetryToken) return;
        if (pushRoute && !isBurnRoute()) return;
        renderBurnPage(pushRoute);
      }, delay);
    });
  }

  function openModal(routeMode) {
    if (!renderBurnPage(Boolean(routeMode) || !isBurnRoute())) retryBurnPage(Boolean(routeMode) || !isBurnRoute());
  }

  function openOverlayModal(routeMode) {
    closeModal();
    if (routeMode && window.location.pathname !== "/burn-do") {
      try {
        window.history.pushState({}, "", "/burn-do");
      } catch (error) {}
    }
    var modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = modalMarkup(getCurrentAccount(), false);
    document.body.appendChild(modal);
    setBurnRouteModalMode(Boolean(routeMode) || isBurnRoute());
    document.body.style.overflow = "hidden";
    activateBurnRoot(modal, true);
  }

  function closeModal() {
    var modal = document.getElementById(MODAL_ID);
    var hadModal = Boolean(modal);
    if (modal && modal.getAttribute("data-dochain-burn-mode") === "page") return;
    if (modal) modal.remove();
    setBurnRouteModalMode(false);
    if (!document.getElementById(MODAL_ID)) document.body.style.overflow = "";
    if (hadModal && window.location.pathname === "/burn-do") {
      try {
        window.history.pushState({}, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (error) {}
    }
  }

  function postBurn() {
    var account = currentFormValue("account");
    var recipient = currentFormValue("recipient") || account;
    var amountMicro = parseUnits(currentFormValue("dodx"), 6);
    if (!isDoAddress(account)) {
      setStatus("Enter a valid sending Do address.", "error");
      return;
    }
    if (!isDoAddress(recipient)) {
      setStatus("Enter a valid receiving Do address.", "error");
      return;
    }
    if (amountMicro === null || amountMicro <= 0n) {
      setStatus("Enter a valid DODx amount.", "error");
      return;
    }
    var quote = quoteFrom(liveState.issued, amountMicro);
    if (!quote.ok) {
      setStatus(quote.error, "error");
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
        asset: "DODx_FROM_DO",
        to: recipient,
        dodx: amountMicro.toString(),
        rate: "ratchet-v1",
      },
    });
    var tx = {
      chainID: getPostChainID(),
      msgs: [makeSend(account, quote.requiredUdo.toString())],
      fee: makeFee(),
      memo: memo,
      waitForConfirmation: true,
    };
    setStatus("Opening Do-Wallet for approval.");
    requestWalletPopup();
    Promise.resolve(poster.post(serializeForExtensionPost(tx))).then(function () {
      setStatus("Burn submitted. DODx will be paid after the redemption confirmations.", "success");
      window.setTimeout(fetchBurnedUdo, 3500);
    }).catch(function (error) {
      setStatus((error && error.message) || "Burn transaction was not submitted.", "error");
    });
  }

  function visible(element) {
    if (!element || !element.getBoundingClientRect) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function hasActionLabel(element, label) {
    var wanted = String(label || "").toLowerCase();
    return Array.prototype.slice.call(element.querySelectorAll("button,a,[role='button'],h1,h2,h3,strong,span,p,div"))
      .some(function (child) {
        return text(child.getAttribute("aria-label") || child.textContent).toLowerCase() === wanted;
      });
  }

  function actionRowScore(element) {
    if (!element || element.closest("#" + MODAL_ID) || element.closest("." + LAUNCHER_CLASS)) return 0;
    var label = text(element.textContent).toLowerCase();
    var hasSend = label.indexOf("send") !== -1 || hasActionLabel(element, "send");
    var hasReceive = label.indexOf("receive") !== -1 || hasActionLabel(element, "receive");
    if (!hasSend || !hasReceive) return 0;
    var rect = element.getBoundingClientRect();
    if (rect.width < 150 || rect.height < 40 || rect.height > 260) return 0;
    var score = 1000000 - Math.round(rect.width * rect.height);
    if (label.indexOf("swap") !== -1 || hasActionLabel(element, "swap")) score += 5000;
    return score;
  }

  function findActionRow() {
    var hinted = Array.prototype.slice.call(
      document.querySelectorAll("[class*='NetWorth_networth__buttons'], [class*='networth__buttons'], [class*='quick-actions'], [class*='actions'], .quick-actions")
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

  function findReceiveAction(row) {
    if (!row) return null;
    var children = Array.prototype.slice.call(row.children || []).filter(visible);
    var direct = children.find(function (element) {
      return text(element.textContent).toLowerCase().indexOf("receive") !== -1 || hasActionLabel(element, "receive");
    });
    if (direct) return direct;
    return Array.prototype.slice.call(row.querySelectorAll("button,a,[role='button']")).filter(visible).find(function (element) {
      return text(element.textContent).toLowerCase().indexOf("receive") !== -1 || hasActionLabel(element, "receive");
    }) || null;
  }

  function relabelLauncher(element) {
    element.setAttribute("aria-label", "Burn DO");
    element.setAttribute("title", "Burn DO for DODx");
    Array.prototype.slice.call(element.querySelectorAll("[aria-label],[title]")).forEach(function (child) {
      child.removeAttribute("aria-label");
      child.removeAttribute("title");
    });
    var replaced = false;
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (/receive|send|swap|buy|sell/i.test(node.nodeValue || "")) {
          node.nodeValue = "Burn DO";
          replaced = true;
        }
        return;
      }
      Array.prototype.slice.call(node.childNodes || []).forEach(walk);
    }
    walk(element);
    if (!replaced) {
      var label = element.querySelector("h2,h3,strong,span,p,div");
      if (label) label.textContent = "Burn DO";
      else element.textContent = "Burn DO";
    }
  }

  function createLauncher(template) {
    var launcher = template.cloneNode(true);
    launcher.classList.add(LAUNCHER_CLASS);
    launcher.removeAttribute("href");
    launcher.removeAttribute("target");
    launcher.removeAttribute("rel");
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
      child.disabled = false;
      if ((child.tagName || "").toLowerCase() === "button") child.type = "button";
    });
    relabelLauncher(launcher);
    function activate(event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openModal();
    }
    launcher.addEventListener("click", activate, true);
    launcher.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") activate(event);
    });
    return launcher;
  }

  function ensureLauncher() {
    var existing = document.querySelector("." + LAUNCHER_CLASS);
    if (existing && existing.isConnected && visible(existing)) return;
    if (existing) existing.remove();
    var row = findActionRow();
    var receive = findReceiveAction(row);
    if (!row || !receive || !receive.parentNode) return;
    receive.parentNode.insertBefore(createLauncher(receive), receive.nextSibling);
  }

  function createNavLink(template) {
    var link = template.cloneNode(true);
    link.classList.add(NAV_CLASS);
    link.setAttribute("href", "/burn-do");
    link.setAttribute("title", "Burn DO for DODx");
    link.setAttribute("aria-label", "Burn DO");
    function replaceText(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (text(node.nodeValue)) node.nodeValue = "Burn DO";
        return;
      }
      Array.prototype.slice.call(node.childNodes || []).forEach(replaceText);
    }
    replaceText(link);
    if (text(link.textContent).indexOf("Burn DO") < 0) link.textContent = "Burn DO";
    link.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      try {
        window.history.pushState({}, "", "/burn-do");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (error) {}
      openModal();
    }, true);
    return link;
  }

  function ensureNavLink() {
    var existing = document.querySelector("." + NAV_CLASS);
    if (existing && existing.isConnected) return;
    if (existing) existing.remove();
    var links = Array.prototype.slice.call(document.querySelectorAll("a, button, [role='button']"));
    var swap = links.filter(visible).find(function (node) {
      return text(node.textContent).toLowerCase() === "swap";
    });
    if (!swap || !swap.parentNode) return;
    swap.parentNode.insertBefore(createNavLink(swap), swap.nextSibling);
  }

  function openFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("burn-do") === "1" || isBurnRoute()) {
        retryBurnPage(true);
      } else {
        burnRouteRetryToken += 1;
      }
    } catch (error) {}
  }

  function init() {
    if (!document.body) return;
    ensureLauncher();
    ensureNavLink();
    openFromUrl();
    var ensureTimer = 0;
    var scheduleEnsure = function () {
      window.clearTimeout(ensureTimer);
      ensureTimer = window.setTimeout(function () {
        ensureLauncher();
        ensureNavLink();
        if (isBurnRoute()) renderBurnPage(false);
      }, 200);
    };
    try {
      var observer = new MutationObserver(scheduleEnsure);
      observer.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(function () {
        observer.disconnect();
      }, 8000);
    } catch (error) {}
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeModal();
  });
  window.addEventListener("load", init);
  window.addEventListener("hashchange", openFromUrl);
  window.addEventListener("popstate", openFromUrl);
  window.addEventListener("focus", function () {
    ensureLauncher();
    ensureNavLink();
  });
  window.addEventListener("do_wallet_bridge_update", function () {
    ensureLauncher();
    ensureNavLink();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
