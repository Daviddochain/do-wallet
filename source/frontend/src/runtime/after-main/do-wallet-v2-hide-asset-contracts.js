(function () {
  "use strict";

  if (window.__doWalletHideAssetContractsStarted) {
    return;
  }
  window.__doWalletHideAssetContractsStarted = true;

  var ROOT_SELECTOR = "#do-wallet, #station";
  var SKIP_SELECTOR = [
    "input",
    "textarea",
    "code",
    "pre",
    "[contenteditable='true']",
    "[role='dialog']",
    "[aria-modal='true']"
  ].join(",");
  var CONTRACT_RE = /\b(?:[a-z][a-z0-9]{1,20}1[a-z0-9]{38,}|0x[a-fA-F0-9]{40})\b/g;
  var scheduled = false;

  function canEdit(node) {
    var parent = node.parentElement;
    return Boolean(parent) && !parent.closest(SKIP_SELECTOR);
  }

  function collapseEmptyInline(parent) {
    var current = parent;

    while (current && current !== document.body && current.id !== "do-wallet" && current.id !== "station") {
      var hasText = /\S/.test(current.textContent || "");
      var hasVisibleChild = current.querySelector("img,svg,canvas,button,a,input,textarea");

      if (hasText || hasVisibleChild) {
        break;
      }

      current.style.display = "none";
      current = current.parentElement;
    }
  }

  function cleanNode(node) {
    if (!canEdit(node) || !CONTRACT_RE.test(node.nodeValue || "")) {
      CONTRACT_RE.lastIndex = 0;
      return;
    }

    CONTRACT_RE.lastIndex = 0;
    var cleaned = node.nodeValue
      .replace(CONTRACT_RE, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/^[ \t]+|[ \t]+$/g, "");

    if (cleaned !== node.nodeValue) {
      node.nodeValue = cleaned;
      collapseEmptyInline(node.parentElement);
    }
  }

  function cleanContracts() {
    scheduled = false;

    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      return;
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(cleanNode);
  }

  function scheduleClean() {
    if (scheduled) {
      return;
    }

    scheduled = true;
    window.requestAnimationFrame(cleanContracts);
  }

  function start() {
    scheduleClean();

    var observer = new MutationObserver(scheduleClean);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    window.setTimeout(function () {
      observer.disconnect();
    }, 8000);

    document.addEventListener("click", function () {
      scheduleClean();
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
