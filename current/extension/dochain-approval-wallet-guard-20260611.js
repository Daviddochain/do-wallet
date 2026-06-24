(() => {
  "use strict";

  const storage = globalThis.chrome && chrome.storage && chrome.storage.local;
  const storageEvents = globalThis.chrome && chrome.storage && chrome.storage.onChanged;
  if (!storage || !storageEvents) return;

  const GUARD_KEY = "dochainApprovalWalletGuard";
  const REQUEST_KEYS = ["connect", "pubkey", "post", "sign", "suggestChain", "switchNetwork"];
  const WATCH_KEYS = [...REQUEST_KEYS, "wallet", "walletSource", "encrypted", "timestamp", GUARD_KEY];
  const MAX_AGE_MS = 10 * 60 * 1000;

  let restoring = false;

  const getStorage = (keys) =>
    new Promise((resolve) => storage.get(keys, (value) => resolve(value || {})));

  const setStorage = (value) =>
    new Promise((resolve) => storage.set(value, () => resolve()));

  const removeStorage = (keys) =>
    new Promise((resolve) => storage.remove(keys, () => resolve()));

  const isObject = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));
  const text = (value) => String(value || "").trim().toLowerCase();

  const walletKeys = (wallet) => {
    if (!isObject(wallet)) return [];
    const addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    return Array.from(
      new Set(
        [wallet.address, wallet.name, wallet.walletName, ...Object.values(addresses)]
          .map(text)
          .filter(Boolean)
      )
    );
  };

  const walletId = (wallet) => walletKeys(wallet).join("|");

  const sameWallet = (a, b) => {
    const aKeys = walletKeys(a);
    const bKeys = new Set(walletKeys(b));
    return Boolean(aKeys.length && aKeys.some((key) => bKeys.has(key)));
  };

  const isPendingItem = (item) => isObject(item) && typeof item.success !== "boolean";

  const hasPendingRequest = (state) => {
    const connect = state.connect;
    if (connect && Array.isArray(connect.request) && connect.request.length) return true;
    if (state.pubkey) return true;
    return ["post", "sign", "suggestChain", "switchNetwork"].some((key) =>
      Array.isArray(state[key]) && state[key].some(isPendingItem)
    );
  };

  const isWebsiteWallet = (wallet) =>
    isObject(wallet) &&
    (wallet.websiteWallet ||
      wallet.syncedFromWebsite ||
      wallet.walletSource === "website" ||
      wallet.source === "website" ||
      wallet.readOnly);

  const freshGuard = (guard) =>
    isObject(guard) && Number.isFinite(Number(guard.createdAt)) && Date.now() - Number(guard.createdAt) <= MAX_AGE_MS;

  const captureGuard = async (state) => {
    if (!hasPendingRequest(state)) {
      const guard = state[GUARD_KEY];
      if (guard && Number.isFinite(Number(guard.createdAt)) && Date.now() - Number(guard.createdAt) > MAX_AGE_MS) {
        await removeStorage([GUARD_KEY]);
      }
      return null;
    }

    const existing = state[GUARD_KEY];
    if (freshGuard(existing) && sameWallet(existing.wallet, state.wallet)) return existing;

    const guard = {
      wallet: state.wallet || null,
      walletSource: state.walletSource || "extension",
      encrypted: state.encrypted || null,
      timestamp: state.timestamp || null,
      walletId: walletId(state.wallet),
      createdAt: Date.now(),
    };
    await setStorage({ [GUARD_KEY]: guard });
    return guard;
  };

  const restoreIfNeeded = async (changes) => {
    if (restoring) return;
    const state = await getStorage(WATCH_KEYS);
    if (!hasPendingRequest(state)) return;

    const guard = freshGuard(state[GUARD_KEY]) ? state[GUARD_KEY] : await captureGuard(state);
    if (!guard || !guard.wallet) return;

    const patch = {};
    const nextWallet = changes.wallet && changes.wallet.newValue;
    if (nextWallet && isWebsiteWallet(nextWallet) && !sameWallet(nextWallet, guard.wallet)) {
      patch.wallet = guard.wallet;
      patch.walletSource = guard.walletSource || "extension";
      patch.walletSelectedAt = Date.now();
    }

    const currentWallet = patch.wallet || state.wallet;
    const lostPassword =
      patch.wallet &&
      (changes.encrypted || changes.timestamp) &&
      guard.encrypted &&
      guard.timestamp &&
      sameWallet(currentWallet, guard.wallet) &&
      (!state.encrypted || !state.timestamp);

    if (lostPassword) {
      patch.encrypted = guard.encrypted;
      patch.timestamp = guard.timestamp;
    }

    if (!Object.keys(patch).length) return;
    restoring = true;
    try {
      await setStorage(patch);
    } finally {
      restoring = false;
    }
  };

  const scheduleCapture = () => {
    window.setTimeout(() => {
      getStorage(WATCH_KEYS).then(captureGuard).catch(() => {});
    }, 0);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCapture, { once: true });
  } else {
    scheduleCapture();
  }

  storageEvents.addListener((changes, area) => {
    if (area !== "local") return;
    if (REQUEST_KEYS.some((key) => changes[key])) scheduleCapture();
    if (changes.wallet || changes.encrypted || changes.timestamp) {
      restoreIfNeeded(changes).catch(() => {});
    }
  });
})();
