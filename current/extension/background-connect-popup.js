let connectPopupWindowId;
let connectPopupTabId;

const popupSize = {
  width: 520,
  height: 760,
};

const getConnectPopupUrl = (origin = "") => {
  const params = new URLSearchParams({ connect: String(Date.now()) });
  if (origin) params.set("origin", origin);
  return chrome.runtime.getURL(`connect-approval.html?${params.toString()}`);
};

const getWalletPopupUrl = () => chrome.runtime.getURL("index.html");

const getPopupPosition = async () => {
  try {
    const current = await chrome.windows.getCurrent();
    return {
      top: Math.max(Math.floor((current.height || popupSize.height) / 2 - popupSize.height / 2), 0),
      left: Math.max(Math.floor((current.width || popupSize.width) / 2 - popupSize.width / 2), 0),
    };
  } catch {
    return {};
  }
};

const findExistingPopupTab = async () => {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        `${chrome.runtime.getURL("index.html")}*`,
        `${chrome.runtime.getURL("connect-approval.html")}*`,
      ],
    });
    return tabs.find((tab) => typeof tab.id === "number" && typeof tab.windowId === "number");
  } catch {
    return null;
  }
};

const openConnectPopup = async (origin = "") => {
  const url = getConnectPopupUrl(origin);

  const existingTab = await findExistingPopupTab();
  if (existingTab) {
    connectPopupTabId = existingTab.id;
    connectPopupWindowId = existingTab.windowId;
    await chrome.tabs.update(existingTab.id, { url, active: true });
    await chrome.windows.update(existingTab.windowId, {
      focused: true,
      width: popupSize.width,
      height: popupSize.height,
    });
    return;
  }

  const position = await getPopupPosition();
  const popup = await chrome.windows.create({
    url,
    type: "popup",
    focused: true,
    ...popupSize,
    ...position,
  });

  connectPopupWindowId = popup.id;
  connectPopupTabId = popup.tabs?.[0]?.id;
};

const openWalletPopup = async () => {
  const url = getWalletPopupUrl();

  const existingTab = await findExistingPopupTab();
  if (existingTab) {
    connectPopupTabId = existingTab.id;
    connectPopupWindowId = existingTab.windowId;
    await chrome.tabs.update(existingTab.id, { url, active: true });
    await chrome.windows.update(existingTab.windowId, {
      focused: true,
      width: popupSize.width,
      height: popupSize.height,
    });
    return;
  }

  const position = await getPopupPosition();
  const popup = await chrome.windows.create({
    url,
    type: "popup",
    focused: true,
    ...popupSize,
    ...position,
  });

  connectPopupWindowId = popup.id;
  connectPopupTabId = popup.tabs?.[0]?.id;
};

chrome.runtime.onMessage.addListener((message, sender) => {
  const isConnectPopupRequest = message?.type === "DO_WALLET_OPEN_CONNECT_POPUP";
  const isGenericPopupRequest = message === "OPEN_POPUP" || message?.type === "OPEN_POPUP";

  if (!isConnectPopupRequest && !isGenericPopupRequest) return false;
  if (!sender.tab) return false;

  if (isConnectPopupRequest) {
    openConnectPopup(message.origin || "").catch(() => {});
    return false;
  }

  openWalletPopup()
    .catch(() => {});

  return false;
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId !== connectPopupWindowId) return;
  connectPopupWindowId = undefined;
  connectPopupTabId = undefined;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId !== connectPopupTabId) return;
  connectPopupWindowId = undefined;
  connectPopupTabId = undefined;
});
