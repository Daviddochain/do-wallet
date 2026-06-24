(() => {
  const APP_NAME = "Do-Wallet";
  const BUILD_VERSION = "1.0.86";
  const READY_ATTRIBUTE = "data-do-wallet-branding-ready";
  const legacyName = ["Sta", "tion"].join("");
  const replacements = [
    [new RegExp(["Terra Classic ", legacyName].join(""), "g"), APP_NAME],
    [new RegExp(["Galaxy ", legacyName].join(""), "g"), APP_NAME],
    [new RegExp([legacyName, " Wallet"].join(""), "g"), APP_NAME],
    [new RegExp([legacyName, " extension"].join(""), "gi"), APP_NAME],
    [new RegExp(legacyName, "g"), APP_NAME],
  ];

  window.__DO_WALLET_BUILD_VERSION = BUILD_VERSION;

  const reveal = () => {
    document.documentElement.setAttribute(READY_ATTRIBUTE, "true");
  };

  const rewrite = (value) =>
    typeof value === "string"
      ? replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
      : value;

  const rewriteAttributes = (element) => {
    ["aria-label", "alt", "placeholder", "title"].forEach((name) => {
      if (!element.hasAttribute?.(name)) return;
      const current = element.getAttribute(name);
      const next = rewrite(current);
      if (next !== current) element.setAttribute(name, next);
    });
  };

  const rewriteTextNodes = () => {
    const root = document.body || document.documentElement;
    if (!root) return;

    document.title = APP_NAME;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const next = rewrite(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });

    root.querySelectorAll?.("*").forEach(rewriteAttributes);
  };

  let pending = false;
  const scheduleRewrite = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      rewriteTextNodes();
      reveal();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleRewrite, { once: true });
  } else {
    scheduleRewrite();
  }

  new MutationObserver(scheduleRewrite).observe(document.documentElement, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
  });

  setTimeout(reveal, 1200);

  const getWalletKey = (wallet) => {
    if (!wallet || typeof wallet !== "object") return "";
    const address =
      typeof wallet.address === "string"
        ? wallet.address
        : wallet.addresses && typeof wallet.addresses === "object"
          ? Object.values(wallet.addresses).filter(Boolean).join("|")
          : "";
    return [wallet.name || "", address].join("|");
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

  const parseStoredJSON = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const normalizeName = (name) =>
    typeof name === "string" ? name.trim().replace(/\s+/g, " ").toLowerCase() : "";

  const collectAddresses = (wallet) => {
    if (!wallet || typeof wallet !== "object") return [];
    const addresses = new Set();
    if (typeof wallet.address === "string" && wallet.address) addresses.add(wallet.address);
    if (wallet.addresses && typeof wallet.addresses === "object") {
      Object.values(wallet.addresses).forEach((address) => {
        if (typeof address === "string" && address) addresses.add(address);
      });
    }
    return Array.from(addresses);
  };

  const hasSharedAddress = (left, right) => {
    const leftAddresses = new Set(collectAddresses(left));
    return collectAddresses(right).some((address) => leftAddresses.has(address));
  };

  const repairActiveWalletKey = () => {
    const keys = parseStoredJSON("keys", []);
    const user = parseStoredJSON("user", null);
    if (!Array.isArray(keys) || !user || typeof user !== "object") return;
    if (keys.some((key) => key?.name === user.name)) return;

    const userName = normalizeName(user.name);
    const match =
      keys.find((key) => userName && normalizeName(key?.name) === userName) ||
      keys.find((key) => hasSharedAddress(key, user));

    if (!match || !match.name) return;

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        name: match.name,
        address: user.address || match.address,
        addresses: user.addresses || match.addresses,
      })
    );
  };

  const resetForWalletChange = (wallet) => {
    if (isWebsiteWallet(wallet)) return;

    const nextKey = getWalletKey(wallet);
    const currentKey = sessionStorage.getItem("doWalletActiveWalletKey") || "";
    if (!nextKey || nextKey === currentKey) return;

    sessionStorage.setItem("doWalletActiveWalletKey", nextKey);
    sessionStorage.setItem("doWalletLastWalletResetAt", String(Date.now()));

    repairActiveWalletKey();
    scheduleRewrite();
  };

  if (
    window.location.protocol === "chrome-extension:" &&
    globalThis.chrome?.storage?.local?.get &&
    globalThis.chrome?.storage?.onChanged?.addListener
  ) {
    repairActiveWalletKey();
    setTimeout(repairActiveWalletKey, 250);

    globalThis.chrome.storage.local.get(["wallet", "walletSource"], ({ wallet, walletSource }) => {
      if (walletSource === "website" || isWebsiteWallet(wallet)) {
        if (wallet) {
          globalThis.chrome.storage.local.set({
            websiteWallet: wallet,
          });
        }
        sessionStorage.setItem("doWalletActiveWalletKey", "");
        return;
      }

      sessionStorage.setItem("doWalletActiveWalletKey", isWebsiteWallet(wallet) ? "" : getWalletKey(wallet));
    });

    globalThis.chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (changes.websiteWallets) setTimeout(repairActiveWalletKey, 100);
      if (!changes.wallet) return;
      if (changes.walletSource?.newValue === "website") return;
      resetForWalletChange(changes.wallet.newValue);
    });
  }
})();
