(() => {
  "use strict";

  const TARGET = "dochain-mfa-content";
  const TYPE = "OPEN_WALLET_POPUP";

  const openWallet = () => {
    try {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP", source: "dochain-mfa-open-wallet-bridge" });
    } catch {}
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || message.target !== TARGET || message.type !== TYPE) return;
    openWallet();
  });

  window.addEventListener("dochain_mfa_open_wallet_popup", openWallet);
})();
