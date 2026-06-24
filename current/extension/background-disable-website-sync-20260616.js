(() => {
  "use strict";

  const websitePatterns = new Set([
    "https://do-wallet.com/*",
    "https://www.do-wallet.com/*",
    "https://do-chain.com/*",
    "https://www.do-chain.com/*",
  ]);

  const originalQuery = chrome.tabs.query.bind(chrome.tabs);

  chrome.tabs.query = (queryInfo, callback) => {
    const urls = Array.isArray(queryInfo?.url)
      ? queryInfo.url
      : queryInfo?.url
        ? [queryInfo.url]
        : [];

    const isLegacyWebsiteSyncQuery =
      urls.length > 0 && urls.every((url) => websitePatterns.has(url));

    if (!isLegacyWebsiteSyncQuery) {
      return originalQuery(queryInfo, callback);
    }

    const emptyResult = [];
    if (typeof callback === "function") {
      queueMicrotask(() => callback(emptyResult));
      return undefined;
    }
    return Promise.resolve(emptyResult);
  };
})();
