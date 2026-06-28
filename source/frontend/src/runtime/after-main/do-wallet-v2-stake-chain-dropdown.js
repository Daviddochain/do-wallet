(function () {
  "use strict";

  if (window.__doWalletStakeChainDropdown20260626) return;
  window.__doWalletStakeChainDropdown20260626 = true;

  var WRAP_ATTR = "data-do-wallet-stake-chain-dropdown";
  var ROW_HIDDEN_ATTR = "data-do-wallet-stake-chain-chip-row-hidden";
  var APPLIED_ATTR = "data-do-wallet-stake-chain-row";
  var STYLE_ID = "do-wallet-stake-chain-dropdown-style";
  var UPDATE_DELAY_MS = 120;
  var updateTimer = 0;

  var KNOWN_CHAIN_RE = /\b(Do Chain|Terra Classic|Osmosis|BNB Smart Chain|Bnb Smart Chain|Solana|Cardano|Ethereum|Bitcoin|Avalanche|Base|Polygon|Arbitrum|Optimism|Cosmos|Mars|Kujira|Juno|Akash|Tron|Xrp|XRP|Terra|LUNC|Luna)\b/i;
  var BLOCKED_TEXT_RE = /\b(Delegations|Undelegations|Staking rewards|Staked funds|Quick Stake|Manual Stake|Withdraw all rewards|Positions|Select staking asset)\b/i;

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function visible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    var rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isStakeRoute() {
    return /\/stake(?:\/|$|\?)/i.test(window.location.pathname + window.location.search);
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "[" + ROW_HIDDEN_ATTR + "='1']{display:none!important}",
      ".do-wallet-stake-chain-dropdown-wrap{display:flex;align-items:center;gap:12px;padding:12px 28px;border-bottom:1px solid rgba(159,70,255,.26)}",
      ".do-wallet-stake-chain-dropdown-label{color:#c7b9ef;font-size:13px;font-weight:600;line-height:1}",
      ".do-wallet-stake-chain-dropdown-shell{position:relative;display:inline-flex;min-width:260px}",
      ".do-wallet-stake-chain-dropdown{appearance:none;-webkit-appearance:none;width:100%;min-height:38px;padding:0 42px 0 16px;border:1px solid rgba(159,70,255,.52);border-radius:999px;background:#251b39;color:#fff;font:inherit;font-size:13px;font-weight:600;line-height:38px;outline:none;cursor:pointer}",
      ".do-wallet-stake-chain-dropdown-shell:after{content:'';position:absolute;right:16px;top:50%;width:8px;height:8px;border-right:2px solid #c7b9ef;border-bottom:2px solid #c7b9ef;transform:translateY(-65%) rotate(45deg);pointer-events:none}",
      ".do-wallet-stake-chain-dropdown:focus{border-color:#a33fff;box-shadow:0 0 0 2px rgba(163,63,255,.18)}",
      "@media (max-width:720px){.do-wallet-stake-chain-dropdown-wrap{align-items:stretch;flex-direction:column;padding:12px 18px}.do-wallet-stake-chain-dropdown-shell{min-width:0;width:100%}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function findStakeCard() {
    if (!isStakeRoute()) return null;
    var nodes = Array.prototype.slice.call(document.querySelectorAll("main section,main article,main div,section,article,div"));
    var best = null;
    var bestArea = Infinity;

    nodes.forEach(function (node) {
      if (!visible(node)) return;
      var text = clean(node.innerText || node.textContent);
      if (!/\bStaked funds\b/i.test(text)) return;
      if (!/\bDelegations\b/i.test(text) || !/\bUndelegations\b/i.test(text)) return;
      if (/\bNo staked assets\b/i.test(text)) return;
      var rect = node.getBoundingClientRect();
      if (rect.width < 320 || rect.height < 150) return;
      if (rect.height > Math.max(900, window.innerHeight * 1.25)) return;
      var area = rect.width * rect.height;
      if (area < bestArea) {
        best = node;
        bestArea = area;
      }
    });

    return best;
  }

  function looksLikeChipRow(node) {
    if (!visible(node)) return false;
    var text = clean(node.innerText || node.textContent);
    if (!/\bAll\b/i.test(text)) return false;
    if (BLOCKED_TEXT_RE.test(text.replace(/\bAll\b/i, ""))) return false;
    if (!KNOWN_CHAIN_RE.test(text) && !/\+\s*\d+/.test(text)) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width < 180 || rect.height < 24 || rect.height > 92) return false;
    return true;
  }

  function findChipRow(card) {
    var candidates = Array.prototype.slice.call(card.querySelectorAll("div,section,nav"));
    var best = null;
    var bestScore = -1;

    candidates.forEach(function (node) {
      if (node.getAttribute(WRAP_ATTR) === "1") return;
      if (!looksLikeChipRow(node)) return;
      var text = clean(node.innerText || node.textContent);
      var rect = node.getBoundingClientRect();
      var score = 100 - Math.min(60, Math.round(rect.height));
      if (KNOWN_CHAIN_RE.test(text)) score += 20;
      if (/\+\s*\d+/.test(text)) score += 5;
      if ((node.children || []).length > 1) score += 10;
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    });

    return best;
  }

  function chipText(node) {
    return clean(node.innerText || node.textContent);
  }

  function findClickable(node, row) {
    var target = node.closest && node.closest("button,[role='button'],[tabindex]");
    return target && row.contains(target) ? target : node;
  }

  function collectChipOptions(row) {
    var selector = "button,[role='button'],[tabindex]";
    var nodes = Array.prototype.slice.call(row.querySelectorAll(selector)).filter(visible);
    if (nodes.length < 2) {
      nodes = Array.prototype.slice.call(row.children || []).filter(visible);
    }

    var seen = Object.create(null);
    var options = [];

    nodes.forEach(function (node) {
      var label = chipText(node);
      if (!label || label.length > 42) return;
      if (/^\+\s*\d+/.test(label)) return;
      if (BLOCKED_TEXT_RE.test(label)) return;
      if (!/^All$/i.test(label) && !KNOWN_CHAIN_RE.test(label) && !/^[A-Z][A-Za-z0-9 .()/-]{1,40}$/.test(label)) return;
      var key = label.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      options.push({ label: label, node: findClickable(node, row) });
    });

    if (!options.some(function (option) { return /^All$/i.test(option.label); })) {
      options.unshift({ label: "All", node: row });
    }

    return options;
  }

  function optionSignature(options) {
    return options.map(function (option) { return option.label; }).join("|");
  }

  function clickOption(option) {
    if (!option || !option.node) return;
    option.node.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window
    }));
  }

  function renderDropdown(row, options) {
    var signature = optionSignature(options);
    var existing = row.previousElementSibling;
    if (existing && existing.getAttribute && existing.getAttribute(WRAP_ATTR) === "1") {
      if (existing.getAttribute("data-options") === signature) return;
      existing.remove();
    }

    var wrap = document.createElement("div");
    wrap.className = "do-wallet-stake-chain-dropdown-wrap";
    wrap.setAttribute(WRAP_ATTR, "1");
    wrap.setAttribute("data-options", signature);

    var label = document.createElement("span");
    label.className = "do-wallet-stake-chain-dropdown-label";
    label.textContent = "Network";

    var shell = document.createElement("span");
    shell.className = "do-wallet-stake-chain-dropdown-shell";

    var select = document.createElement("select");
    select.className = "do-wallet-stake-chain-dropdown";
    select.setAttribute("aria-label", "Stake network");

    options.forEach(function (option, index) {
      var item = document.createElement("option");
      item.value = String(index);
      item.textContent = option.label;
      select.appendChild(item);
    });

    select.addEventListener("change", function () {
      clickOption(options[Number(select.value)]);
    });

    shell.appendChild(select);
    wrap.appendChild(label);
    wrap.appendChild(shell);
    row.parentNode.insertBefore(wrap, row);
  }

  function cleanupInactiveRoute() {
    Array.prototype.slice.call(document.querySelectorAll("[" + WRAP_ATTR + "='1']")).forEach(function (node) {
      node.remove();
    });
    Array.prototype.slice.call(document.querySelectorAll("[" + ROW_HIDDEN_ATTR + "='1']")).forEach(function (node) {
      node.removeAttribute(ROW_HIDDEN_ATTR);
      node.removeAttribute(APPLIED_ATTR);
    });
  }

  function update() {
    installStyles();
    if (!isStakeRoute()) {
      cleanupInactiveRoute();
      return;
    }

    var card = findStakeCard();
    if (!card) return;

    var row = findChipRow(card);
    if (!row) return;

    var options = collectChipOptions(row);
    if (options.length < 2) return;

    row.setAttribute(ROW_HIDDEN_ATTR, "1");
    row.setAttribute(APPLIED_ATTR, "1");
    renderDropdown(row, options);
  }

  function schedule() {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(update, UPDATE_DELAY_MS);
  }

  var lastURL = window.location.href;
  function watchURL() {
    if (window.location.href !== lastURL) {
      lastURL = window.location.href;
      schedule();
    }
    window.setTimeout(watchURL, 500);
  }

  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("load", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  document.addEventListener("click", function () {
    window.setTimeout(schedule, 80);
  }, true);

  if (window.MutationObserver) {
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  schedule();
  watchURL();
})();
