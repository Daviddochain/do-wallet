(function () {
  "use strict";

  if (window.__doWalletGovernanceChainSelect20260623) return;
  window.__doWalletGovernanceChainSelect20260623 = true;

  var WRAPPER_CLASS = "do-wallet-governance-chain-select";
  var HIDDEN_CLASS = "do-wallet-governance-chip-row-hidden";

  function text(node) {
    return (node && node.textContent ? node.textContent : "").replace(/\s+/g, " ").trim();
  }

  function isVisible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var style = window.getComputedStyle(node);
    var rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function isGovernancePage() {
    if (/governance|proposal/i.test(window.location.pathname || "")) return true;
    return Array.prototype.some.call(document.querySelectorAll("h1,h2"), function (heading) {
      return /^Governance$/i.test(text(heading));
    });
  }

  function cleanLabel(label) {
    return String(label || "")
      .replace(/\+\s*\d+\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalKey(label) {
    var value = cleanLabel(label).toLowerCase();
    if (value === "do" || value === "do-chain" || value === "do chain") return "dochain";
    if (value.indexOf("terra classic") !== -1 || value === "lunc") return "terraclassiclunc";
    return value.replace(/[^a-z0-9]+/g, "");
  }

  function displayLabel(label) {
    var clean = cleanLabel(label);
    var key = normalKey(clean);
    if (key === "dochain") return "Do Chain";
    if (key === "terraclassiclunc") return "Terra Classic (LUNC)";
    return clean;
  }

  function scoreHost(node) {
    var buttons = Array.prototype.filter.call(node.querySelectorAll("button,[role='button']"), isVisible);
    var labels = buttons.map(text).filter(Boolean);
    if (!labels.some(function (label) { return /^All$/i.test(label); })) return -1;
    if (!labels.some(function (label) { return /^\+\s*\d+$/i.test(label); })) return -1;
    if (labels.length < 3) return -1;
    return labels.length;
  }

  function findFilterHost() {
    var buttons = Array.prototype.filter.call(document.querySelectorAll("button,[role='button']"), isVisible);
    var plusButtons = buttons.filter(function (button) {
      return /^\+\s*\d+$/i.test(text(button));
    });

    var best = null;
    var bestScore = Infinity;
    plusButtons.forEach(function (button) {
      var node = button.parentElement;
      var depth = 0;
      while (node && depth < 8) {
        var score = scoreHost(node);
        if (score > -1 && score < bestScore) {
          best = node;
          bestScore = score;
        }
        node = node.parentElement;
        depth += 1;
      }
    });

    return best;
  }

  function collectButtonOptions(host) {
    var seen = Object.create(null);
    var options = [];
    var buttons = Array.prototype.filter.call(host.querySelectorAll("button,[role='button']"), function (button) {
      return !/^\+\s*\d+$/i.test(text(button));
    });

    buttons.forEach(function (button) {
      var label = displayLabel(text(button));
      var key = normalKey(label);
      if (!label || seen[key]) return;
      seen[key] = true;
      options.push({ key: key, label: label, button: button });
    });

    if (!seen.all) {
      options.unshift({ key: "all", label: "All", button: null });
      seen.all = true;
    }
    if (!seen.dochain) {
      options.push({ key: "dochain", label: "Do Chain", button: null });
      seen.dochain = true;
    }

    return options;
  }

  function optionFromNode(node, button) {
    var label = displayLabel(text(node));
    var key = normalKey(label);
    if (!label || key === "networks" || key === "dashboard" || key === "stake" || key === "governance") return null;
    if (label.length > 48 || /^\+\s*\d+$/.test(label)) return null;
    return { key: key, label: label, button: button || null };
  }

  function collectSidebarOptions() {
    var networkHeading = Array.prototype.find.call(document.querySelectorAll("*"), function (node) {
      return isVisible(node) && /^NETWORKS$/i.test(text(node));
    });
    if (!networkHeading) return [];

    var sidebar = networkHeading.closest("aside,nav") || networkHeading.parentElement;
    var depth = 0;
    while (sidebar && depth < 5) {
      var sidebarText = text(sidebar);
      if (/Do Chain/i.test(sidebarText) && /Bitcoin|Ethereum|Solana/i.test(sidebarText)) break;
      sidebar = sidebar.parentElement;
      depth += 1;
    }
    if (!sidebar) return [];

    var interactive = Array.prototype.filter.call(sidebar.querySelectorAll("button,[role='button'],a"), isVisible);
    var rows = interactive.length ? interactive : Array.prototype.filter.call(sidebar.querySelectorAll("div,li"), isVisible);

    return rows.map(function (row) {
      return optionFromNode(row, row.matches && row.matches("button,[role='button'],a") ? row : null);
    }).filter(Boolean);
  }

  function orderedOptions(rawOptions) {
    var byKey = Object.create(null);
    rawOptions.forEach(function (option) {
      if (!option || !option.key || byKey[option.key]) return;
      byKey[option.key] = option;
    });

    var all = byKey.all || { key: "all", label: "All", button: null };
    var doChain = byKey.dochain || { key: "dochain", label: "Do Chain", button: null };
    delete byKey.all;
    delete byKey.dochain;

    var rest = Object.keys(byKey).map(function (key) {
      return byKey[key];
    }).sort(function (a, b) {
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });

    return [all, doChain].concat(rest);
  }

  function selectedKeyFromButtons(host) {
    var buttons = Array.prototype.filter.call(host.querySelectorAll("button,[role='button']"), function (button) {
      return !/^\+\s*\d+$/i.test(text(button));
    });

    var selected = buttons.find(function (button) {
      var aria = button.getAttribute("aria-selected") || button.getAttribute("aria-pressed");
      var cls = button.className ? String(button.className) : "";
      return aria === "true" || /\b(active|selected|current)\b/i.test(cls);
    });

    return selected ? normalKey(text(selected)) : "all";
  }

  function installStyles() {
    if (document.getElementById("do-wallet-governance-chain-select-style")) return;
    var style = document.createElement("style");
    style.id = "do-wallet-governance-chain-select-style";
    style.textContent = [
      "." + HIDDEN_CLASS + "{display:none!important;}",
      "." + WRAPPER_CLASS + "{display:flex;align-items:center;gap:14px;padding:26px 40px;border-bottom:1px solid rgba(120,55,165,.45);}",
      "." + WRAPPER_CLASS + "__label{font-weight:800;color:#fff;font-size:16px;}",
      "." + WRAPPER_CLASS + "__select{min-width:280px;max-width:min(520px,100%);height:48px;border-radius:13px;border:1px solid rgba(158,67,255,.75);background:#1d142a;color:#fff;font-size:16px;font-weight:800;padding:0 44px 0 16px;outline:none;box-shadow:none;}",
      "." + WRAPPER_CLASS + "__select:focus{border-color:#a845ff;box-shadow:0 0 0 2px rgba(168,69,255,.18);}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function renderSelect(host) {
    var parent = host.parentElement;
    if (!parent) return;

    var existing = parent.querySelector(":scope > ." + WRAPPER_CLASS);
    var options = orderedOptions(collectButtonOptions(host).concat(collectSidebarOptions()));
    var selectedKey = selectedKeyFromButtons(host);

    if (!existing) {
      existing = document.createElement("div");
      existing.className = WRAPPER_CLASS;
      existing.innerHTML = '<label class="' + WRAPPER_CLASS + '__label" for="do-wallet-governance-chain-select-input">Network</label><select id="do-wallet-governance-chain-select-input" class="' + WRAPPER_CLASS + '__select"></select>';
      parent.insertBefore(existing, host);
    }

    var select = existing.querySelector("select");
    var currentValue = select.value || selectedKey;
    select.innerHTML = "";

    options.forEach(function (option) {
      var node = document.createElement("option");
      node.value = option.key;
      node.textContent = option.label;
      select.appendChild(node);
    });

    select.value = options.some(function (option) { return option.key === currentValue; }) ? currentValue : selectedKey;

    if (select.__doWalletGovernanceSelectBound !== true) {
      select.__doWalletGovernanceSelectBound = true;
      select.addEventListener("change", function () {
        var targetKey = select.value;
        var target = collectButtonOptions(host).concat(collectSidebarOptions()).find(function (option) {
          return option.key === targetKey;
        });
        if (target && target.button && typeof target.button.click === "function") {
          target.button.click();
        }
      });
    }

    host.classList.add(HIDDEN_CLASS);
    host.setAttribute("aria-hidden", "true");
    host.dataset.doWalletGovernanceSelectApplied = "1";
  }

  function apply() {
    installStyles();
    if (!isGovernancePage()) return;
    var host = findFilterHost();
    if (!host) return;
    renderSelect(host);
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    window.setTimeout(function () {
      queued = false;
      apply();
    }, 80);
  }

  window.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  new MutationObserver(function () {
    if (isGovernancePage()) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
