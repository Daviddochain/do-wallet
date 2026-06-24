(() => {
  "use strict";

  const storage = globalThis.chrome && chrome.storage && chrome.storage.local;
  const storageEvents = globalThis.chrome && chrome.storage && chrome.storage.onChanged;
  if (!storage) return;

  const requestKeys = ["connect", "pubkey", "post", "sign", "suggestChain", "switchNetwork"];
  const pendingRefreshPrefix = "dochain-extension-request-refresh:";
  const formWaitMs = 2200;

  const getStorage = (keys) =>
    new Promise((resolve) => storage.get(keys, (value) => resolve(value || {})));

  const isPending = (item) => item && typeof item.success !== "boolean";

  const pendingRequests = async () => {
    const state = await getStorage(requestKeys);
    const requests = [];

    const connectOrigin = state.connect && Array.isArray(state.connect.request)
      ? state.connect.request[0]
      : "";
    if (connectOrigin) {
      requests.push({ type: "connect", origin: connectOrigin, id: connectOrigin });
    }

    if (state.pubkey) {
      requests.push({ type: "pubkey", origin: state.pubkey, id: "pubkey" });
    }

    ["post", "sign", "suggestChain", "switchNetwork"].forEach((key) => {
      const queue = Array.isArray(state[key]) ? state[key] : [];
      const pending = queue.find(isPending);
      if (pending) {
        requests.push({
          type: key,
          origin: pending.origin || pending.url || "website",
          id: pending.id || `${key}:${pending.origin || ""}`,
        });
      }
    });

    return requests;
  };

  const requestFormVisible = () => {
    const text = document.body ? document.body.innerText || "" : "";
    const hasCredential = /\b(Password|Authentication code|Save password)\b/i.test(text);
    const hasAction = /\b(Deny|Post|Sign|Connect|Confirm|Approve)\b/i.test(text);
    const hasApprovalDetails = /\b(Network|Origin|Timestamp|Fee|Memo|Execute contract|Send|Swap|Delegate|Vote|transaction|signing|wallet|application|request)\b/i.test(text);
    return hasAction && hasApprovalDetails && (hasCredential || /\b(Post|Sign|Confirm|Approve)\b/i.test(text));
  };

  const ensureBanner = (request) => {
    let banner = document.getElementById("dochain-extension-request-refresh");
    if (!banner) {
      banner = document.createElement("aside");
      banner.id = "dochain-extension-request-refresh";
      banner.style.cssText = [
        "position:fixed",
        "left:12px",
        "right:12px",
        "top:12px",
        "z-index:2147483000",
        "border:1px solid #f59e0b",
        "border-radius:8px",
        "background:#211527",
        "box-shadow:0 12px 32px rgba(0,0,0,.35)",
        "color:#fff",
        "font:700 13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
        "padding:12px 14px",
      ].join(";");
      document.body.appendChild(banner);
    }

    const origin = String(request.origin || "website").replace(/^https?:\/\//, "");
    banner.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;justify-content:space-between">
        <span>Signing request waiting from ${origin}. If the approval form is not visible, reload this popup.</span>
        <button type="button" style="border:1px solid #fbbf24;border-radius:8px;background:#f59e0b;color:#140b02;font:inherit;padding:7px 10px;cursor:pointer">Reload</button>
      </div>
    `;
    banner.querySelector("button").onclick = () => window.location.reload();
  };

  const removeBanner = () => {
    document.getElementById("dochain-extension-request-refresh")?.remove();
  };

  const refreshIfNeeded = async () => {
    const requests = await pendingRequests();
    if (!requests.length) {
      removeBanner();
      return;
    }

    const request = requests[0];
    window.setTimeout(() => {
      if (requestFormVisible()) {
        removeBanner();
        return;
      }

      ensureBanner(request);
      const refreshKey = `${pendingRefreshPrefix}${request.type}:${request.id}`;
      if (sessionStorage.getItem(refreshKey)) return;
      sessionStorage.setItem(refreshKey, "1");
      window.location.reload();
    }, formWaitMs);
  };

  const onReady = () => {
    refreshIfNeeded().catch(() => {});
    window.setTimeout(() => refreshIfNeeded().catch(() => {}), formWaitMs + 700);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }

  if (storageEvents) {
    storageEvents.addListener((changes, area) => {
      if (area !== "local") return;
      if (!requestKeys.some((key) => changes[key])) return;
      refreshIfNeeded().catch(() => {});
    });
  }
})();

(() => {
  "use strict";

  const SCRIPT_ID = "dochain-hide-asset-contracts-20260608-loader";
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.defer = true;
  script.src = "/dochain-hide-asset-contracts-20260608.js?v=20260608contracts1";
  document.head.appendChild(script);
})();
