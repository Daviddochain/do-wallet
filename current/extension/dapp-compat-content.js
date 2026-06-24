(() => {
  const PAGE_TARGET = "do-wallet-page";
  const CONTENT_TARGET = "do-wallet-content";

  const sendPageResponse = (id, success, payload) => {
    window.postMessage({
      target: PAGE_TARGET,
      id,
      success,
      ...(success ? { result: payload } : { error: payload }),
    }, window.location.origin);
  };

  const toErrorMessage = (value, fallback = "Do-Wallet could not complete the request.") => {
    const candidate = value?.message || value?.error?.message || value?.error || value;
    if (candidate instanceof Error) return candidate.message || fallback;
    if (typeof candidate === "string") return candidate || fallback;
    try {
      return JSON.stringify(candidate ?? value, null, 2) || fallback;
    } catch {
      return String(candidate || value || fallback);
    }
  };

  const isWebsiteWallet = (wallet) =>
    Boolean(
      wallet &&
        typeof wallet === "object" &&
        (wallet.websiteWallet ||
          wallet.syncedFromWebsite ||
          wallet.walletSource === "website" ||
          wallet.source === "website" ||
          wallet.readOnly)
    );

  const isFirstPartyOrigin = (origin) => {
    try {
      const host = new URL(origin).hostname.toLowerCase();
      return host === "do-wallet.com" || host === "www.do-wallet.com" || host.endsWith(".do-wallet.com");
    } catch {
      return false;
    }
  };

  const isPublicAddress = (value) => {
    const text = String(value || "").trim();
    return Boolean(
      /^[a-z0-9]{1,20}1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{20,90}$/i.test(text) ||
        /^0x[a-fA-F0-9]{40}$/.test(text) ||
        /^bc1[a-z0-9]{20,90}$/i.test(text) ||
        /^[13][a-km-zA-HJ-NP-Z1-9]{25,40}$/.test(text) ||
        /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)
    );
  };

  const collectPublicAddresses = (wallet) => {
    const out = [];
    const seen = new Set();
    const add = (key, value) => {
      const address = String(value || "").trim();
      if (!isPublicAddress(address) || seen.has(address.toLowerCase())) return;
      seen.add(address.toLowerCase());
      out.push({ key: String(key || `public-${out.length}`), address });
    };
    const scan = (value, depth, keyHint) => {
      if (depth > 6 || value === null || value === undefined) return;
      if (typeof value === "string") {
        add(keyHint, value);
        return;
      }
      if (Array.isArray(value)) {
        value.slice(0, 120).forEach((item, index) => scan(item, depth + 1, keyHint || `public-${index}`));
        return;
      }
      if (typeof value !== "object") return;
      Object.keys(value).slice(0, 160).forEach((key) => {
        if (/word|mnemonic|seed|private|encrypted|cipher|password/i.test(key)) return;
        scan(value[key], depth + 1, key);
      });
    };
    scan(wallet, 0, "address");
    return out;
  };

  const publicWalletPayload = (wallet) => {
    const addresses = {};
    collectPublicAddresses(wallet).forEach(({ key, address }, index) => {
      const cleanKey = key && !/^address$/i.test(key) ? key : `public-${index}`;
      addresses[cleanKey] = address;
    });
    const firstAddress = Object.values(addresses)[0] || "";
    return {
      name: wallet?.name || wallet?.walletName || wallet?.label || "Do-Wallet",
      walletName: wallet?.walletName || wallet?.name || wallet?.label || "Do-Wallet",
      address: firstAddress || undefined,
      addresses,
      addressMap: addresses,
      source: "do-wallet-extension",
      walletSource: "extension-content-bridge",
      syncedFromExtension: true,
      updatedAt: Date.now(),
    };
  };

  const hasWalletAddress = (wallet, allowWebsiteWallet = false) => {
    if (!wallet || (!allowWebsiteWallet && isWebsiteWallet(wallet))) return false;
    return Boolean(publicWalletPayload(wallet).address);
  };

  const openApprovalPopup = () => {
    try {
      chrome.runtime.sendMessage({ type: "DO_WALLET_OPEN_CONNECT_POPUP", origin: window.location.origin });
    } catch {}
  };

  const handleConnectRequest = (id) => {
    const origin = window.location.origin;
    let finished = false;
    let timeoutId;

    const finish = (success, payload) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      try {
        chrome.storage.onChanged.removeListener(onChanged);
      } catch {}
      sendPageResponse(id, success, payload);
    };

    const checkState = (previousConnect) => {
      chrome.storage.local.get(["connect", "wallet"], ({ connect = { request: [], allowed: [] }, wallet = {} }) => {
        const wasRequested = Array.isArray(previousConnect?.request) && previousConnect.request.includes(origin);
        const isRequested = Array.isArray(connect?.request) && connect.request.includes(origin);
        const isAllowed = Array.isArray(connect?.allowed) && connect.allowed.includes(origin);

        if ((isAllowed || isFirstPartyOrigin(origin)) && hasWalletAddress(wallet, isFirstPartyOrigin(origin))) {
          finish(true, publicWalletPayload(wallet));
          return;
        }

        if (wasRequested && !isRequested && isAllowed && hasWalletAddress(wallet, isFirstPartyOrigin(origin))) {
          finish(true, publicWalletPayload(wallet));
          return;
        }

        if (wasRequested && !isRequested && !isAllowed) {
          finish(false, "Do-Wallet connection request was declined.");
        }
      });
    };

    function onChanged(changes, areaName) {
      if (areaName !== "local") return;
      if (!changes.connect && !changes.wallet) return;
      checkState(changes.connect?.oldValue);
    }

    timeoutId = setTimeout(() => {
      finish(false, "Do-Wallet connection request timed out.");
    }, 180000);

    chrome.storage.local.get(["connect", "wallet"], ({ connect = { request: [], allowed: [] }, wallet = {} }) => {
      const isAllowed = Array.isArray(connect.allowed) && connect.allowed.includes(origin);
      if ((isAllowed || isFirstPartyOrigin(origin)) && hasWalletAddress(wallet, isFirstPartyOrigin(origin))) {
        finish(true, publicWalletPayload(wallet));
        return;
      }

      const request = Array.isArray(connect.request) ? connect.request.filter((item) => item !== origin) : [];
      const allowed = Array.isArray(connect.allowed) ? connect.allowed.slice() : [];

      chrome.storage.onChanged.addListener(onChanged);
      chrome.storage.local.set({
        connect: {
          ...connect,
          request: [origin, ...request],
          allowed,
        },
      }, () => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          finish(false, lastError.message || "Do-Wallet could not save the connection request.");
          return;
        }
        openApprovalPopup();
      });
    });
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;

    const message = event.data;
    if (!message || message.target !== CONTENT_TARGET || message.type !== "DO_WALLET_DAPP_REQUEST") return;

    const id = message.id;
    if (!id) return;

    try {
      if (!chrome?.runtime?.id) {
        sendPageResponse(id, false, "Do-Wallet extension context is not available. Reload the extension and refresh the page.");
        return;
      }

      if (message.method === "connect" || message.method === "enable") {
        handleConnectRequest(id);
        return;
      }

      chrome.runtime.sendMessage({
        type: "DO_WALLET_V2_DAPP_REQUEST",
        method: message.method,
        params: Array.isArray(message.params) ? message.params : [],
      }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          sendPageResponse(id, false, lastError.message || String(lastError));
          return;
        }

        if (!response || response.success === false) {
          const message = toErrorMessage(response?.message || response, "Do-Wallet did not complete the request.");
          if (/not connected|open do-wallet/i.test(message)) {
            try {
              chrome.runtime.sendMessage("OPEN_POPUP");
            } catch {}
          }
          sendPageResponse(id, false, message);
          return;
        }

        sendPageResponse(id, true, response.result ?? response.wallet ?? response);
      });
    } catch (error) {
      sendPageResponse(id, false, error?.message || String(error));
    }
  });

  const inject = (file) => {
    const root = document.documentElement || document.head;
    if (!root) return;

    const marker = `data-do-wallet-${file.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
    if (root.hasAttribute(marker)) return;
    root.setAttribute(marker, "true");

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(file);
    if (file === "dapp-compat-page.js") {
      script.dataset.doWalletIcon = chrome.runtime.getURL("icon-128.png");
    }
    script.onload = () => script.remove();
    (document.head || root).appendChild(script);
  };

  inject("dapp-compat-page.js");
})();
