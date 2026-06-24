(() => {
  "use strict";

  const FIRST_PARTY_HOSTS = new Set(["do-wallet.com", "www.do-wallet.com"]);
  const host = String(window.location.hostname || "").toLowerCase();
  if (!FIRST_PARTY_HOSTS.has(host)) return;

  const PAGE_TARGET = "do-wallet-page";
  const CONTENT_TARGET = "do-wallet-content";
  const BRIDGE_KEY = "do-wallet-bridge-wallet";
  const AUTH_KEY = "do-wallet-extension-authority.v1";
  const PUBLIC_ADDRESS =
    /^([a-z0-9]{1,20}1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{20,120}|0x[a-fA-F0-9]{40}|bc1[a-z0-9]{20,120}|[13][a-km-zA-HJ-NP-Z1-9]{25,40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/i;
  const SENSITIVE_KEY = /word|mnemonic|seed|private|encrypted|cipher|password/i;
  const STORAGE_KEYS = [
    "wallet",
    "websiteWallet",
    "websiteWallets",
    "activeWallet",
    "selectedWallet",
    "currentWallet",
    "dashboardWalletRequest",
  ];

  const isPublicAddress = (value) => PUBLIC_ADDRESS.test(String(value || "").trim());

  const postResponse = (id, success, payload) => {
    window.postMessage({
      target: PAGE_TARGET,
      id,
      success,
      ...(success ? { result: payload } : { error: payload }),
    }, window.location.origin);
  };

  const addAddress = (addresses, key, value) => {
    const address = String(value || "").trim();
    if (!isPublicAddress(address)) return;
    const cleanKey = String(key || "").trim();
    addresses[cleanKey || `public-${Object.keys(addresses).length}`] = address;
  };

  const scanPublicAddresses = (value, addresses, depth = 0, keyHint = "") => {
    if (depth > 6 || value === null || value === undefined) return;
    if (typeof value === "string") {
      addAddress(addresses, keyHint, value);
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 150).forEach((item, index) => {
        scanPublicAddresses(item, addresses, depth + 1, keyHint || `public-${index}`);
      });
      return;
    }
    if (typeof value !== "object") return;
    Object.keys(value).slice(0, 200).forEach((childKey) => {
      if (SENSITIVE_KEY.test(childKey)) return;
      scanPublicAddresses(value[childKey], addresses, depth + 1, childKey);
    });
  };

  const firstWalletLike = (status) => {
    if (!status || typeof status !== "object") return null;
    if (status.wallet && typeof status.wallet === "object") return status.wallet;
    if (status.websiteWallet && typeof status.websiteWallet === "object") return status.websiteWallet;
    if (status.activeWallet && typeof status.activeWallet === "object") return status.activeWallet;
    if (status.selectedWallet && typeof status.selectedWallet === "object") return status.selectedWallet;
    if (status.currentWallet && typeof status.currentWallet === "object") return status.currentWallet;
    if (status.dashboardWalletRequest && typeof status.dashboardWalletRequest === "object") return status.dashboardWalletRequest;
    if (Array.isArray(status.websiteWallets) && status.websiteWallets[0]) return status.websiteWallets[0];
    if (Array.isArray(status.vaults)) {
      return status.vaults.find((vault) => vault && vault.id === status.activeVaultId) || status.vaults[0] || null;
    }
    return null;
  };

  const publicAsset = (asset) => {
    if (!asset || typeof asset !== "object") return null;
    const clean = {};
    [
      "id",
      "symbol",
      "name",
      "chainID",
      "chainId",
      "network",
      "denom",
      "contract",
      "amount",
      "balance",
      "value",
      "valueUsd",
      "usd",
      "price",
      "change",
      "icon",
    ].forEach((key) => {
      if (asset[key] === undefined || SENSITIVE_KEY.test(key)) return;
      clean[key] = asset[key];
    });
    return Object.keys(clean).length ? clean : null;
  };

  const publicWalletPayload = (wallet, status = {}) => {
    if (!wallet || typeof wallet !== "object") return null;
    const addresses = {};
    scanPublicAddresses(wallet.addresses || wallet.addressMap || {}, addresses);
    scanPublicAddresses(status.addresses || status.addressMap || {}, addresses);
    addAddress(addresses, "address", wallet.address);
    addAddress(addresses, "doAddress", wallet.doAddress || wallet.doChainAddress);
    addAddress(addresses, "ethereum-mainnet", wallet.ethereumAddress || wallet.evmAddress);
    addAddress(addresses, "bitcoin-mainnet", wallet.bitcoinAddress);
    addAddress(addresses, "solana-mainnet", wallet.solanaAddress);

    const firstAddress = Object.values(addresses)[0] || "";
    if (!firstAddress) return null;

    const name = String(wallet.name || wallet.walletName || wallet.label || "Do-Wallet").slice(0, 64);
    const assets = [
      ...(Array.isArray(wallet.assets) ? wallet.assets : []),
      ...(Array.isArray(status.assets) ? status.assets : []),
    ].map(publicAsset).filter(Boolean);
    const staking = [
      ...(Array.isArray(wallet.staking) ? wallet.staking : []),
      ...(Array.isArray(status.staking) ? status.staking : []),
    ].map(publicAsset).filter(Boolean);
    return {
      name,
      walletName: name,
      address: firstAddress,
      addresses,
      addressMap: addresses,
      assets,
      staking,
      source: "do-wallet-extension",
      walletSource: "extension-public-bridge",
      syncedFromExtension: true,
      updatedAt: Date.now(),
    };
  };

  const persistForWebsite = (wallet) => {
    if (!wallet) return;
    const payload = {
      source: "do-wallet-extension",
      wallet,
      updatedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    try {
      window.localStorage.setItem(BRIDGE_KEY, JSON.stringify(payload));
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent("do_wallet_bridge_update", { detail: payload }));
    } catch {}
    try {
      window.postMessage({ target: PAGE_TARGET, type: "DO_WALLET_EXTENSION_WALLET", success: true, result: wallet }, window.location.origin);
    } catch {}
  };

  const requestStatus = () => new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "DO_WALLET_V2_VAULT_STATUS" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response && typeof response === "object" ? response : null);
      });
    } catch {
      resolve(null);
    }
  });

  const readStorageWallet = () => new Promise((resolve) => {
    try {
      chrome.storage.local.get(STORAGE_KEYS, (storage) => {
        const wallet = firstWalletLike(storage);
        resolve(publicWalletPayload(wallet, storage));
      });
    } catch {
      resolve(null);
    }
  });

  const withWallet = (callback) => {
    requestStatus()
      .then((status) => publicWalletPayload(firstWalletLike(status), status || {}))
      .then((wallet) => wallet || readStorageWallet())
      .then((wallet) => {
        persistForWebsite(wallet);
        callback(wallet);
      })
      .catch(() => callback(null));
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || message.target !== CONTENT_TARGET || message.type !== "DO_WALLET_DAPP_REQUEST") return;
    if (!message.id) return;

    const method = String(message.method || "").toLowerCase();
    if (!["connect", "enable", "getkey", "accounts", "eth_accounts"].includes(method)) {
      postResponse(message.id, false, "Do-Wallet public bridge only supports account discovery on do-wallet.com.");
      return;
    }

    withWallet((wallet) => {
      if (!wallet) {
        postResponse(message.id, false, "No unlocked Do-Wallet extension wallet is available.");
        return;
      }
      if (method === "accounts" || method === "eth_accounts") {
        const values = Object.values(wallet.addresses || {});
        const evm = values.find((address) => /^0x[a-fA-F0-9]{40}$/.test(address));
        postResponse(message.id, true, evm ? [evm] : values.slice(0, 1));
        return;
      }
      if (method === "getkey") {
        const chainId = Array.isArray(message.params) ? message.params[0] : "";
        const address = (wallet.addresses && (wallet.addresses[chainId] || wallet.addresses["Do-Chain"])) || wallet.address;
        postResponse(message.id, true, { name: wallet.name, algo: "secp256k1", address, bech32Address: address });
        return;
      }
      postResponse(message.id, true, wallet);
    });
  });

  const schedulePublish = () => {
    clearTimeout(schedulePublish.timer);
    schedulePublish.timer = setTimeout(() => withWallet(() => {}), 100);
  };

  window.addEventListener("load", schedulePublish);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedulePublish();
  });
  try {
    chrome.storage.onChanged.addListener(schedulePublish);
  } catch {}
  schedulePublish();
})();
