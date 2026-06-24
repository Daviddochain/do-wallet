(() => {
  const FLAG = "__doWalletDappCompat20260531";
  if (window[FLAG]) return;
  window[FLAG] = true;

  const FIRST_PARTY_HOSTS = new Set(["do-wallet.com", "www.do-wallet.com"]);
  if (FIRST_PARTY_HOSTS.has(String(window.location.hostname || "").toLowerCase())) {
    window.isDoWalletExtensionAvailable = true;
    try {
      window.dispatchEvent(new CustomEvent("do_wallet_extension_detected", {
        detail: { source: "do-wallet-extension", firstParty: true },
      }));
    } catch {}
    return;
  }

  const LOCAL_ICON = document.currentScript?.dataset?.doWalletIcon || "icon-128.png";

  const WALLET_INFO = {
    id: "do-wallet",
    name: "Do-Wallet",
    prettyName: "Do-Wallet",
    identifier: "do-wallet",
    windowKey: "doWallet",
    providerKey: "doWallet",
    rdns: "com.do-wallet",
    chainType: "cosmos",
    chains: ["cosmos:Do-Chain", "Do-Chain"],
    features: [
      "standard:connect",
      "standard:disconnect",
      "standard:events",
      "cosmos:signAmino",
      "cosmos:signDirect",
      "cosmos:signArbitrary",
    ],
    icon: LOCAL_ICON,
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const isObject = (value) => Boolean(value && typeof value === "object");
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
  const PAGE_TARGET = "do-wallet-page";
  const CONTENT_TARGET = "do-wallet-content";

  const normalizeChainId = (chainId) => {
    const raw = Array.isArray(chainId) ? chainId[0] : chainId;
    const value = typeof raw === "string" && raw.trim() ? raw.trim() : "Do-Chain";
    return value.startsWith("cosmos:") ? value.slice("cosmos:".length) : value;
  };

  const bridgeRequest = (method, params = []) => {
    const id = globalThis.crypto?.randomUUID?.() || `do-wallet-${Date.now()}-${Math.random()}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("No Do-Wallet bridge response was received."));
      }, 10000);

      function onMessage(event) {
        if (event.source !== window || event.origin !== window.location.origin) return;
        const message = event.data;
        if (!message || message.target !== PAGE_TARGET || message.id !== id) return;

        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);

        if (message.success) {
          resolve(message.result);
        } else {
          reject(new Error(toErrorMessage(message.error)));
        }
      }

      window.addEventListener("message", onMessage);
      window.postMessage({
        target: CONTENT_TARGET,
        type: "DO_WALLET_DAPP_REQUEST",
        id,
        method,
        params: Array.isArray(params) ? params : [params],
      }, window.location.origin);
    });
  };

  const normalizeConnectedWallet = (result, chainId) => {
    const normalizedChainId = normalizeChainId(chainId);
    const wallet = Array.isArray(result)
      ? { address: result[0] || "", addresses: result[0] ? { [normalizedChainId]: result[0] } : {} }
      : isObject(result?.wallet)
        ? result.wallet
        : isObject(result)
          ? result
          : {};
    const addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    const address =
      addresses[normalizedChainId] ||
      wallet.address ||
      Object.values(addresses).find((value) => typeof value === "string") ||
      "";

    return {
      ...wallet,
      name: wallet.name || wallet.walletName || "Do-Wallet",
      address,
      addresses: Object.keys(addresses).length || !address ? addresses : { [normalizedChainId]: address },
    };
  };

  const keyFromWallet = (wallet, chainId) => {
    const normalizedChainId = normalizeChainId(chainId);
    const addresses = isObject(wallet && wallet.addresses) ? wallet.addresses : {};
    const bech32Address =
      addresses[normalizedChainId] ||
      wallet?.address ||
      Object.values(addresses).find((address) => typeof address === "string") ||
      "";

    if (!bech32Address) {
      throw new Error(`Do-Wallet has no account for ${normalizedChainId}.`);
    }

    return {
      name: wallet?.name || "Do-Wallet",
      algo: "secp256k1",
      pubKey: new Uint8Array(),
      address: new Uint8Array(),
      bech32Address,
      isNanoLedger: false,
    };
  };

  const connectThroughBridge = async (chainId) => {
    const normalizedChainId = normalizeChainId(chainId);
    return normalizeConnectedWallet(await bridgeRequest("connect", [normalizedChainId]), normalizedChainId);
  };

  const addWalletInfo = (key, info) => {
    const current = Array.isArray(window[key]) ? window[key] : [];
    const existingIndex = current.findIndex((item) => item && item.identifier === info.identifier);
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...info };
    } else {
      current.push(info);
    }
    window[key] = current;
  };

  let compatDoWallet;
  let standardWallet;
  let standardAccounts = [];
  const standardListeners = new Set();

  const getDoWallet = () => {
    const wallet = window.doWallet;
    return wallet && wallet !== compatDoWallet ? wallet : null;
  };

  const getRealKeplr = () => {
    const wallet = getDoWallet();
    if (wallet && wallet.keplr && wallet.keplr !== compatKeplr) return wallet.keplr;
    return null;
  };

  const waitForProvider = async () => {
    for (let i = 0; i < 150; i += 1) {
      const wallet = getDoWallet();
      const keplr = getRealKeplr();
      if (wallet || keplr) return { wallet, keplr };
      await wait(100);
    }
    throw new Error("Do-Wallet provider was not loaded on this page.");
  };

  const callProvider = async (method, args, fallback) => {
    const { wallet, keplr } = await waitForProvider();
    const target =
      keplr && typeof keplr[method] === "function"
        ? keplr
        : wallet && typeof wallet[method] === "function"
          ? wallet
          : null;

    if (target) return target[method](...args);
    if (fallback) return fallback({ wallet, keplr });
    throw new Error(`Do-Wallet does not support ${method} on this page yet.`);
  };

  const connectWallet = async (...args) => {
    try {
      return await connectThroughBridge(args[0]);
    } catch (error) {
      const message = String(error?.message || error || "");
      if (!/No Do-Wallet bridge response/i.test(message)) throw error;
    }

    const directProvider = window.doWallet && window.doWallet !== compatDoWallet ? window.doWallet : null;
    const original = directProvider?.__doWalletOriginalMethods;
    if (typeof original?.connect === "function") {
      try {
        return await original.connect(...args);
      } catch (error) {
        const message = String(error?.message || error || "");
        if (!/not connected|not available|context|extension/i.test(message)) throw error;
      }
    }

    const { wallet, keplr } = await waitForProvider();
    if (typeof original?.connect === "function") return original.connect(...args);
    if (keplr && typeof keplr.enable === "function") return keplr.enable(...args);
    if (wallet && typeof wallet.connect === "function" && wallet.connect !== connectWallet) return wallet.connect(...args);
    return undefined;
  };

  const fallbackKey = async (chainId) => {
    return keyFromWallet(await connectThroughBridge(chainId), chainId);
  };

  const makeOfflineSigner = (chainId, includeDirect = true) => {
    const signer = {
      getAccounts: async () => {
        const key = await compatKeplr.getKey(chainId);
        return [
          {
            address: key.bech32Address,
            algo: key.algo || "secp256k1",
            pubkey: key.pubKey || new Uint8Array(),
          },
        ];
      },
      signAmino: (signerAddress, signDoc, signOptions) =>
        compatKeplr.signAmino(chainId, signerAddress, signDoc, signOptions),
    };

    if (includeDirect) {
      signer.signDirect = (signerAddress, signDoc, signOptions) =>
        compatKeplr.signDirect(chainId, signerAddress, signDoc, signOptions);
    }

    return signer;
  };

  const getOfflineSignerNow = (method, chainId) => {
    const keplr = getRealKeplr();
    if (keplr && typeof keplr[method] === "function") return keplr[method](chainId);

    const wallet = getDoWallet();
    if (wallet && typeof wallet[method] === "function") return wallet[method](chainId);

    if (method === "getOfflineSignerAuto") {
      return Promise.resolve(makeOfflineSigner(chainId, true));
    }

    return makeOfflineSigner(chainId, method !== "getOfflineSignerOnlyAmino");
  };

  const getConnectedWallet = async () => {
    const { wallet } = await waitForProvider();
    if (wallet && typeof wallet.connect === "function") return wallet.connect();
    return wallet;
  };

  const makeStandardAccount = (wallet) => {
    const addresses = isObject(wallet && wallet.addresses) ? wallet.addresses : {};
    const address =
      wallet?.address ||
      addresses["Do-Chain"] ||
      Object.values(addresses).find((value) => typeof value === "string") ||
      "";

    if (!address) return null;

    return {
      address,
      publicKey: new Uint8Array(),
      chains: Object.keys(addresses).length
        ? Object.keys(addresses).map((chainId) => `cosmos:${chainId}`)
        : ["cosmos:Do-Chain"],
      features: [
        "standard:connect",
        "standard:disconnect",
        "standard:events",
        "cosmos:signAmino",
        "cosmos:signDirect",
      ],
      label: wallet?.name || "Do-Wallet",
      icon: WALLET_INFO.icon,
    };
  };

  const updateStandardAccounts = (wallet) => {
    const account = makeStandardAccount(wallet);
    standardAccounts = account ? [account] : [];
    standardListeners.forEach((listener) => {
      try {
        listener("change", { accounts: standardAccounts });
      } catch {}
    });
  };

  const standardConnect = async (...args) => {
    const wallet = await connectWallet(...args);
    updateStandardAccounts(wallet);
    return { accounts: standardAccounts };
  };

  const standardDisconnect = async () => {
    standardAccounts = [];
    standardListeners.forEach((listener) => {
      try {
        listener("change", { accounts: [] });
      } catch {}
    });
  };

  const standardOn = (event, listener) => {
    if (event !== "change" || typeof listener !== "function") return () => {};
    standardListeners.add(listener);
    return () => standardListeners.delete(listener);
  };

  const makeStandardWallet = () => {
    if (standardWallet) return standardWallet;

    standardWallet = {
      version: "1.0.0",
      name: "Do-Wallet",
      icon: WALLET_INFO.icon,
      get chains() {
        return standardAccounts[0]?.chains || ["cosmos:Do-Chain"];
      },
      get features() {
        return {
          "standard:connect": { version: "1.0.0", connect: standardConnect },
          "standard:disconnect": { version: "1.0.0", disconnect: standardDisconnect },
          "standard:events": { version: "1.0.0", on: standardOn },
          "cosmos:signAmino": {
            version: "1.0.0",
            signAmino: (...args) => compatKeplr.signAmino(...args),
          },
          "cosmos:signDirect": {
            version: "1.0.0",
            signDirect: (...args) => compatKeplr.signDirect(...args),
          },
        };
      },
      get accounts() {
        return standardAccounts;
      },
    };

    return standardWallet;
  };

  const registerStandardWallet = () => {
    const wallet = makeStandardWallet();
    const event = new Event("wallet-standard:register-wallet");
    Object.defineProperty(event, "detail", {
      value: (register) => {
        try {
          register(wallet);
        } catch {}
      },
    });
    window.dispatchEvent(event);
  };

  const compatKeplr = {
    __doWalletCompat: true,
    isDoWallet: true,
    isKeplr: true,
    mode: "extension",
    version: "do-wallet-compat-20260531",
    defaultOptions: {},
    enable: (...args) => connectWallet(...args),
    experimentalSuggestChain: (...args) =>
      callProvider("experimentalSuggestChain", args, async () => undefined),
    getKey: (chainId) => callProvider("getKey", [chainId], () => fallbackKey(chainId)),
    getOfflineSigner: (chainId) => getOfflineSignerNow("getOfflineSigner", chainId),
    getOfflineSignerOnlyAmino: (chainId) =>
      getOfflineSignerNow("getOfflineSignerOnlyAmino", chainId),
    getOfflineSignerAuto: (chainId) => getOfflineSignerNow("getOfflineSignerAuto", chainId),
    signAmino: (...args) => callProvider("signAmino", args),
    signDirect: (...args) => callProvider("signDirect", args),
    signArbitrary: (...args) => callProvider("signArbitrary", args),
    verifyArbitrary: (...args) => callProvider("verifyArbitrary", args),
    sendTx: (...args) => callProvider("sendTx", args),
  };

  compatDoWallet = {
    __doWalletCompat: true,
    isDoWallet: true,
    name: "Do-Wallet",
    identifier: "do-wallet",
    keplr: compatKeplr,
    connect: (...args) => connectWallet(...args),
    enable: (...args) => connectWallet(...args),
    info: (...args) => callProvider("info", args, async () => ({})),
    getKey: (...args) => compatKeplr.getKey(...args),
    signAmino: (...args) => compatKeplr.signAmino(...args),
    signDirect: (...args) => compatKeplr.signDirect(...args),
    signArbitrary: (...args) => compatKeplr.signArbitrary(...args),
    verifyArbitrary: (...args) => compatKeplr.verifyArbitrary(...args),
    sendTx: (...args) => compatKeplr.sendTx(...args),
    request: (message = {}) => {
      const method = typeof message === "string" ? message : message.method || message.type;
      const params = typeof message === "string" ? [] : message.params || message.data || [];
      const args = Array.isArray(params) ? params : [params];
      if (method === "connect" || method === "enable") return compatKeplr.enable(...args);
      if (method === "getKey") return compatKeplr.getKey(...args);
      if (method === "signAmino") return compatKeplr.signAmino(...args);
      if (method === "signDirect") return compatKeplr.signDirect(...args);
      return callProvider(method, args);
    },
    getOfflineSigner: (chainId) => compatKeplr.getOfflineSigner(chainId),
    getOfflineSignerOnlyAmino: (chainId) => compatKeplr.getOfflineSignerOnlyAmino(chainId),
    getOfflineSignerAuto: (chainId) => compatKeplr.getOfflineSignerAuto(chainId),
  };

  const patchProvider = (provider) => {
    if (!isObject(provider)) return provider;

    if (!provider.__doWalletOriginalMethods) {
      Object.defineProperty(provider, "__doWalletOriginalMethods", {
        configurable: true,
        enumerable: false,
        value: {
          connect: typeof provider.connect === "function" ? provider.connect.bind(provider) : null,
          request: typeof provider.request === "function" ? provider.request.bind(provider) : null,
          getKey: typeof provider.getKey === "function" ? provider.getKey.bind(provider) : null,
          getOfflineSigner: typeof provider.getOfflineSigner === "function" ? provider.getOfflineSigner.bind(provider) : null,
          getOfflineSignerOnlyAmino: typeof provider.getOfflineSignerOnlyAmino === "function" ? provider.getOfflineSignerOnlyAmino.bind(provider) : null,
          getOfflineSignerAuto: typeof provider.getOfflineSignerAuto === "function" ? provider.getOfflineSignerAuto.bind(provider) : null,
        },
      });
    }

    provider.isDoWallet = true;
    provider.__doWalletProvider = true;
    provider.identifier = "do-wallet";
    provider.name = "Do-Wallet";
    provider.prettyName = "Do-Wallet";
    provider.connect = (...args) => connectWallet(...args);
    provider.enable = (...args) => connectWallet(...args);
    provider.getKey = (chainId) => fallbackKey(chainId);
    provider.getOfflineSigner = (chainId) => makeOfflineSigner(chainId, true);
    provider.getOfflineSignerOnlyAmino = (chainId) => makeOfflineSigner(chainId, false);
    provider.getOfflineSignerAuto = async (chainId) => makeOfflineSigner(chainId, true);
    provider.request = (message = {}) => {
      const method = typeof message === "string" ? message : message.method || message.type;
      const params = typeof message === "string" ? [] : message.params || message.data || [];
      const args = Array.isArray(params) ? params : [params];

      if (method === "connect" || method === "enable") return connectWallet(...args);
      if (method === "getKey") return fallbackKey(args[0]);
      if (method === "getOfflineSigner") return makeOfflineSigner(args[0], true);
      if (method === "getOfflineSignerOnlyAmino") return makeOfflineSigner(args[0], false);
      if (method === "getOfflineSignerAuto") return Promise.resolve(makeOfflineSigner(args[0], true));
      if (method === "accounts" || method === "eth_accounts") return bridgeRequest(method, args);
      if (typeof provider.__doWalletOriginalMethods?.request === "function") {
        return provider.__doWalletOriginalMethods.request(message);
      }
      return callProvider(method, args);
    };

    provider.keplr = {
      ...(isObject(provider.keplr) ? provider.keplr : {}),
      __doWalletCompat: true,
      isDoWallet: true,
      isKeplr: true,
      enable: (...args) => connectWallet(...args),
      getKey: (chainId) => fallbackKey(chainId),
      getOfflineSigner: (chainId) => makeOfflineSigner(chainId, true),
      getOfflineSignerOnlyAmino: (chainId) => makeOfflineSigner(chainId, false),
      getOfflineSignerAuto: async (chainId) => makeOfflineSigner(chainId, true),
    };

    return provider;
  };

  const install = () => {
    const provider = patchProvider(window.doWallet || compatDoWallet);
    const walletInfo = {
      ...WALLET_INFO,
      provider,
      connect: (...args) => provider.connect(...args),
      enable: (...args) => provider.enable(...args),
      request: (...args) => provider.request(...args),
      getKey: (...args) => provider.getKey(...args),
      getOfflineSigner: (...args) => provider.getOfflineSigner(...args),
      getOfflineSignerOnlyAmino: (...args) => provider.getOfflineSignerOnlyAmino(...args),
      getOfflineSignerAuto: (...args) => provider.getOfflineSignerAuto(...args),
      getProvider: () => patchProvider(window.doWallet || compatDoWallet),
    };

    addWalletInfo("interchainWallets", walletInfo);
    addWalletInfo("cosmosWallets", walletInfo);
    window.doWalletInfo = walletInfo;

    window.isDoWalletExtensionAvailable = true;

    if (!window.doWallet || window.doWallet === compatDoWallet) {
      window.doWallet = provider;
    } else {
      patchProvider(window.doWallet);
    }

    try {
      window.dispatchEvent(new CustomEvent("do-wallet#initialized", {
        detail: { provider: window.doWallet || compatDoWallet, wallet: walletInfo },
      }));
      window.dispatchEvent(new CustomEvent("doWallet#initialized", {
        detail: { provider: window.doWallet || compatDoWallet, wallet: walletInfo },
      }));
      window.dispatchEvent(new Event("do_wallet_provider_ready"));
      registerStandardWallet();
    } catch {}
  };

  window.addEventListener("wallet-standard:app-ready", registerStandardWallet);
  install();
  const timer = setInterval(install, 500);
  setTimeout(() => clearInterval(timer), 15000);
})();
