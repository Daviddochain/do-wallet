(function () {
  "use strict";

  if (window.__doWalletExtensionRampPreviewInstalled) return;
  window.__doWalletExtensionRampPreviewInstalled = true;

  function openRampPreview() {
    var url = "https://do-wallet.com/?ramp=buy";
    try {
      if (globalThis.chrome && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: url });
        return;
      }
    } catch (error) {}
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function text(value) {
    return String(value || "").trim();
  }

  function visible(element) {
    if (!element || !element.isConnected) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isReceiveAction(element) {
    if (!element || element.closest(".do-extension-ramp-button")) return false;
    var label = text(element.getAttribute("aria-label") || element.textContent).toLowerCase();
    return label === "receive" || /^receive\b/.test(label);
  }

  function hasWord(label, word) {
    return new RegExp("(^|\\s)" + word + "(\\s|$)", "i").test(String(label || "").replace(/\s+/g, " "));
  }

  function hasActionLabel(element, label) {
    var wanted = String(label || "").toLowerCase();
    return Array.prototype.slice.call(element.querySelectorAll("button,a,[role='button'],h1,h2,h3,strong,span,p,div"))
      .some(function (child) {
        return text(child.getAttribute("aria-label") || child.textContent).toLowerCase() === wanted;
      });
  }

  function actionRowScore(element) {
    if (!element || element.closest(".do-extension-ramp-button")) return 0;
    var label = text(element.textContent).toLowerCase();
    var hasSend = label.indexOf("send") !== -1 || hasActionLabel(element, "send");
    var hasReceive = label.indexOf("receive") !== -1 || hasActionLabel(element, "receive");
    if (!hasSend || !hasReceive) return 0;
    var rect = element.getBoundingClientRect();
    if (rect.width < 160 || rect.height < 40 || rect.height > 220) return 0;
    var className = String(element.className || "").toLowerCase();
    var score = 1000000 - Math.round(rect.width * rect.height);
    if (label.indexOf("swap") !== -1 || hasWord(label, "swap") || hasActionLabel(element, "swap")) score += 5000;
    if (className.indexOf("networth") !== -1 || className.indexOf("quick-actions") !== -1 || className.indexOf("action") !== -1) score += 10000;
    return score;
  }

  function findActionRow() {
    var hinted = Array.prototype.slice.call(
      document.querySelectorAll('[class*="NetWorth_networth__buttons"], [class*="networth__buttons"], .quick-actions, [class*="quick-actions"]')
    );
    var broad = Array.prototype.slice.call(document.querySelectorAll("section div, main div, #do-wallet div, #app div"));
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
    var labels = Array.prototype.slice.call(row.querySelectorAll("h1,h2,h3,strong,span,p,button,a,[role='button'],div")).filter(visible);
    var receiveLabel = labels.find(function (element) {
      return isReceiveAction(element);
    });
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

  function relabelButton(element) {
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

  function createRampButton(receiveAction) {
    var button = receiveAction.cloneNode(true);
    button.classList.add("do-extension-ramp-button");
    button.removeAttribute("href");
    button.removeAttribute("target");
    button.removeAttribute("rel");
    button.removeAttribute("aria-current");
    button.disabled = false;
    if (!/^(button|a)$/i.test(button.tagName || "")) {
      button.setAttribute("role", "button");
      button.tabIndex = 0;
    }
    Array.prototype.slice.call(button.querySelectorAll("[data-action],a,button")).forEach(function (child) {
      child.removeAttribute("data-action");
      child.removeAttribute("href");
      child.removeAttribute("target");
      child.removeAttribute("rel");
      child.removeAttribute("aria-current");
      child.disabled = false;
      if ((child.tagName || "").toLowerCase() === "button") child.type = "button";
    });
    relabelButton(button);
    function activate(event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openRampPreview();
    }
    button.addEventListener("click", activate, true);
    button.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") activate(event);
    });
    return button;
  }

  function ensureButton() {
    var existing = document.querySelector(".do-extension-ramp-button");
    if (existing && existing.isConnected && visible(existing)) return;
    if (existing) existing.remove();
    var receiveAction = findReceiveAction();
    if (!receiveAction || !receiveAction.parentNode) return;
    receiveAction.parentNode.classList.add("do-extension-ramp-row");
    receiveAction.parentNode.insertBefore(createRampButton(receiveAction), receiveAction.nextSibling);
  }

  function init() {
    if (!document.body) return;
    ensureButton();
    var observer = new MutationObserver(function () {
      ensureButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(ensureButton, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
