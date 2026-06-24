(function () {
  "use strict";

  if (window.__doWalletConnectWalletCleanup20260619) return;
  window.__doWalletConnectWalletCleanup20260619 = true;

  var HIDE_LABELS = ["Mobile Wallet", "Install Do-Wallet Extension"];
  var SINGLE_LABELS = ["Do-Wallet Extension"];
  var ALL_LABELS = HIDE_LABELS.concat(SINGLE_LABELS);

  function shouldRunHere() {
    try {
      var host = window.location.hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "do-wallet.com" || host === "www.do-wallet.com" || host.endsWith(".do-wallet.com");
    } catch (error) {
      return false;
    }
  }

  function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function visible(element) {
    if (!element || element.nodeType !== 1) return false;
    var style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function containsLabel(element, label) {
    return text(element && element.innerText).indexOf(label) !== -1;
  }

  function labelCount(labelText) {
    var count = 0;
    ALL_LABELS.forEach(function (label) {
      if (labelText.indexOf(label) !== -1) count += 1;
    });
    return count;
  }

  function findConnectDialogs() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"], [aria-modal="true"], body > div, body section, body main div'));
    return candidates.filter(function (node) {
      if (!visible(node)) return false;
      var label = text(node.innerText);
      return label.indexOf("Connect wallet") !== -1 && ALL_LABELS.some(function (item) { return label.indexOf(item) !== -1; });
    }).sort(function (left, right) {
      var leftRect = left.getBoundingClientRect();
      var rightRect = right.getBoundingClientRect();
      return (rightRect.width * rightRect.height) - (leftRect.width * leftRect.height);
    }).slice(0, 2);
  }

  function textNodesForLabel(root, label) {
    var found = [];
    try {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          return text(node.nodeValue).indexOf(label) !== -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      var node = walker.nextNode();
      while (node) {
        found.push(node);
        node = walker.nextNode();
      }
    } catch (error) {}
    return found;
  }

  function rowForLabel(dialog, label) {
    var nodes = textNodesForLabel(dialog, label);
    var rows = [];

    nodes.forEach(function (node) {
      var element = node.parentElement;
      var best = null;
      while (element && element !== dialog && dialog.contains(element)) {
        if (containsLabel(element, label)) {
          var labelText = text(element.innerText);
          var rect = element.getBoundingClientRect();
          var dialogRect = dialog.getBoundingClientRect();
          var goodRow =
            rect.width >= Math.min(180, dialogRect.width * 0.18) &&
            rect.height >= 34 &&
            rect.height <= Math.max(180, dialogRect.height * 0.22) &&
            labelCount(labelText) <= 1;
          if (goodRow) best = element;
        }
        element = element.parentElement;
      }
      if (best && visible(best)) rows.push(best);
    });

    return rows.sort(function (left, right) {
      var leftRect = left.getBoundingClientRect();
      var rightRect = right.getBoundingClientRect();
      return (leftRect.width * leftRect.height) - (rightRect.width * rightRect.height);
    });
  }

  function hideRow(row) {
    if (!row || row.getAttribute("data-do-connect-hidden") === "true") return;
    row.setAttribute("data-do-connect-hidden", "true");
    row.style.setProperty("display", "none", "important");
  }

  function cleanupDialog(dialog) {
    if (!dialog || !visible(dialog)) return;

    HIDE_LABELS.forEach(function (label) {
      rowForLabel(dialog, label).forEach(hideRow);
    });

    SINGLE_LABELS.forEach(function (label) {
      var rows = rowForLabel(dialog, label).filter(function (row) {
        return !row.getAttribute("data-do-connect-hidden") && visible(row);
      });
      rows.forEach(function (row, index) {
        if (index > 0) hideRow(row);
      });
    });
  }

  var scanTimer = 0;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = window.setTimeout(function () {
      scanTimer = 0;
      findConnectDialogs().forEach(cleanupDialog);
    }, 60);
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
