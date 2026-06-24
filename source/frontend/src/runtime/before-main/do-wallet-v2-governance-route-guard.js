(function () {
  "use strict";
  if (window.__dochainGovernanceRouteGuard20260617) return;
  window.__dochainGovernanceRouteGuard20260617 = true;

  var RECOVERY_KEY = "dochain-governance-route-recovery-count";
  var GOV_HASH = "#DOCHAIN_VALIDATOR_STAGE";
  var EMPTY_PROPOSALS = {
    proposals: [],
    pagination: { next_key: null, total: "0" },
  };

  function clean(value) {
    return String(value || "").trim();
  }

  function normalizeUrl(value) {
    try {
      var url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return value;
      var path = url.pathname.replace(/\/+$/, "") || "/";
      if (path.toLowerCase() === "/governance" || path.toLowerCase() === "/proposals") {
        url.pathname = "/gov";
        if (!url.hash) url.hash = GOV_HASH;
        return url.pathname + url.search + url.hash;
      }
    } catch (error) {}
    return value;
  }

  function normalizeCurrentRoute() {
    var next = normalizeUrl(window.location.href);
    if (next !== window.location.href && next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(window.history.state, "", next);
    }
  }

  function guardHistoryMethod(name) {
    var original = window.history && window.history[name];
    if (typeof original !== "function") return;
    window.history[name] = function (state, title, url) {
      if (url !== undefined && url !== null) url = normalizeUrl(url);
      return original.call(window.history, state, title, url);
    };
  }

  function isGovernanceRoute() {
    var path = (window.location.pathname || "").replace(/\/+$/, "").toLowerCase();
    return path === "/gov" || path === "/governance";
  }

  function proposalChainFromUrl(value) {
    try {
      var url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return "";
      if (url.pathname.replace(/\/+$/, "").toLowerCase() === "/proposals") return "legacy-relative";
      var match = url.pathname.match(/\/station-assets\/api\/lcd\/([^/]+)\/cosmos\/gov\/v1\/proposals\/?$/i);
      return match ? decodeURIComponent(match[1]) : "";
    } catch (error) {
      return "";
    }
  }

  function shouldShortCircuitProposalRequest(value) {
    var chain = proposalChainFromUrl(value);
    if (!chain) return false;
    return chain !== "Do-Chain";
  }

  function proposalResponseText() {
    return JSON.stringify(EMPTY_PROPOSALS);
  }

  function installProposalFetchGuard() {
    if (window.__dochainGovernanceProposalFetchGuard20260618) return;
    window.__dochainGovernanceProposalFetchGuard20260618 = true;

    var originalFetch = window.fetch;
    if (typeof originalFetch === "function") {
      window.fetch = function (input, init) {
        var url = typeof input === "string" ? input : input && input.url;
        if (shouldShortCircuitProposalRequest(url)) {
          return Promise.resolve(new Response(proposalResponseText(), {
            status: 200,
            statusText: "OK",
            headers: { "content-type": "application/json" },
          }));
        }
        return originalFetch.apply(this, arguments);
      };
    }

    var XHR = window.XMLHttpRequest;
    if (XHR && XHR.prototype) {
      var originalOpen = XHR.prototype.open;
      var originalSend = XHR.prototype.send;
      XHR.prototype.open = function (method, url) {
        this.__dochainGovGuardUrl = url;
        return originalOpen.apply(this, arguments);
      };
      XHR.prototype.send = function () {
        if (!shouldShortCircuitProposalRequest(this.__dochainGovGuardUrl)) {
          return originalSend.apply(this, arguments);
        }
        var xhr = this;
        var text = proposalResponseText();
        try {
          Object.defineProperty(xhr, "readyState", { configurable: true, get: function () { return 4; } });
          Object.defineProperty(xhr, "status", { configurable: true, get: function () { return 200; } });
          Object.defineProperty(xhr, "statusText", { configurable: true, get: function () { return "OK"; } });
          Object.defineProperty(xhr, "responseText", { configurable: true, get: function () { return text; } });
          Object.defineProperty(xhr, "response", {
            configurable: true,
            get: function () { return xhr.responseType === "json" ? EMPTY_PROPOSALS : text; },
          });
        } catch (error) {}
        window.setTimeout(function () {
          try { if (typeof xhr.onreadystatechange === "function") xhr.onreadystatechange(); } catch (error) {}
          try { xhr.dispatchEvent(new Event("readystatechange")); } catch (error) {}
          try { if (typeof xhr.onload === "function") xhr.onload(); } catch (error) {}
          try { xhr.dispatchEvent(new Event("load")); } catch (error) {}
          try { if (typeof xhr.onloadend === "function") xhr.onloadend(); } catch (error) {}
          try { xhr.dispatchEvent(new Event("loadend")); } catch (error) {}
        }, 0);
        return undefined;
      };
    }
  }

  function pageIsErrorBoundary() {
    var text = clean(document.body && document.body.innerText);
    return isGovernanceRoute() && /\bSomething went wrong\b/i.test(text);
  }

  function recoverErrorBoundary() {
    if (!pageIsErrorBoundary()) return;
    var count = Number(window.sessionStorage && window.sessionStorage.getItem(RECOVERY_KEY) || 0);
    if (count >= 2) return;
    try {
      window.sessionStorage.setItem(RECOVERY_KEY, String(count + 1));
    } catch (error) {}
    window.location.replace("/gov?recover=" + Date.now() + GOV_HASH);
  }

  function scheduleRecoveryChecks() {
    [500, 1500, 3500, 7000].forEach(function (delay) {
      window.setTimeout(recoverErrorBoundary, delay);
    });
  }

  normalizeCurrentRoute();
  guardHistoryMethod("pushState");
  guardHistoryMethod("replaceState");
  installProposalFetchGuard();

  window.addEventListener("popstate", function () {
    normalizeCurrentRoute();
    scheduleRecoveryChecks();
  });
  window.addEventListener("click", function (event) {
    var target = event.target;
    while (target && target !== document.body) {
      if (clean(target.textContent).toLowerCase() === "governance") {
        window.setTimeout(function () {
          normalizeCurrentRoute();
          scheduleRecoveryChecks();
        }, 50);
        break;
      }
      target = target.parentElement;
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleRecoveryChecks);
  } else {
    scheduleRecoveryChecks();
  }
})();
