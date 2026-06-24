(() => {
  const originName = document.getElementById("origin-name");
  const originHost = document.getElementById("origin-host");
  const walletName = document.getElementById("wallet-name");
  const walletAddress = document.getElementById("wallet-address");
  const status = document.getElementById("status");
  const denyButton = document.getElementById("deny");
  const connectButton = document.getElementById("connect");

  let activeOrigin = "";

  const getAddress = (wallet = {}) => {
    const addresses = wallet.addresses && typeof wallet.addresses === "object" ? wallet.addresses : {};
    return wallet.address || addresses["Do-Chain"] || Object.values(addresses).find((value) => typeof value === "string") || "";
  };

  const isWebsiteWallet = (wallet = {}) =>
    Boolean(
      wallet.websiteWallet ||
        wallet.syncedFromWebsite ||
        wallet.walletSource === "website" ||
        wallet.source === "website" ||
        wallet.readOnly
    );

  const shorten = (value = "") => {
    if (value.length <= 22) return value;
    return `${value.slice(0, 12)}...${value.slice(-8)}`;
  };

  const getOriginFromState = (connect = {}) => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("origin") || "";
    if (fromUrl) return fromUrl;
    return Array.isArray(connect.request) ? connect.request[0] || "" : "";
  };

  const describeOrigin = (origin) => {
    try {
      const url = new URL(origin);
      return { name: url.hostname.replace(/^www\./, ""), host: origin };
    } catch {
      return { name: origin || "Unknown site", host: origin || "No pending website request found." };
    }
  };

  const setStatus = (message) => {
    status.textContent = message || "";
  };

  const closeSoon = () => {
    setTimeout(() => window.close(), 250);
  };

  const load = async () => {
    const { connect = { request: [], allowed: [] }, wallet = {} } = await chrome.storage.local.get(["connect", "wallet"]);
    activeOrigin = getOriginFromState(connect);

    const origin = describeOrigin(activeOrigin);
    originName.textContent = origin.name;
    originHost.textContent = origin.host;

    const address = isWebsiteWallet(wallet) ? "" : getAddress(wallet);
    walletName.textContent = wallet.name || wallet.walletName || "Do-Wallet";
    walletAddress.textContent = address ? shorten(address) : "No wallet address is currently available.";

    const canRespond = Boolean(activeOrigin);
    connectButton.disabled = !canRespond || !address;
    denyButton.disabled = !canRespond;

    if (!canRespond) {
      setStatus("No pending connection request was found. Refresh the website and try again.");
    } else if (!address) {
      setStatus("Open Do-Wallet and select a wallet before connecting.");
    } else {
      setStatus("");
    }
  };

  const respond = async (allowed) => {
    const { connect = { request: [], allowed: [] } } = await chrome.storage.local.get(["connect"]);
    const origin = activeOrigin || getOriginFromState(connect);
    if (!origin) {
      setStatus("No pending connection request was found.");
      return;
    }

    const existingAllowed = Array.isArray(connect.allowed) ? connect.allowed : [];
    const existingRequest = Array.isArray(connect.request) ? connect.request : [];
    const nextAllowed = allowed ? Array.from(new Set([...existingAllowed, origin])) : existingAllowed;

    await chrome.storage.local.set({
      connect: {
        ...connect,
        request: existingRequest.filter((item) => item !== origin),
        allowed: nextAllowed,
      },
    });

    setStatus(allowed ? "Connected." : "Connection denied.");
    closeSoon();
  };

  denyButton.addEventListener("click", () => {
    denyButton.disabled = true;
    connectButton.disabled = true;
    respond(false).catch((error) => setStatus(error?.message || "Could not deny the request."));
  });

  connectButton.addEventListener("click", () => {
    denyButton.disabled = true;
    connectButton.disabled = true;
    respond(true).catch((error) => setStatus(error?.message || "Could not connect the website."));
  });

  load().catch((error) => {
    setStatus(error?.message || "Could not read the connection request.");
    connectButton.disabled = true;
  });
})();
