(() => {
  const isContextInvalidated = (value) => {
    const message = String(
      value?.message || value?.error?.message || value?.reason?.message || value || ""
    ).toLowerCase();
    return (
      message.includes("extension context invalidated") ||
      message.includes("extension context was invalidated") ||
      message.includes("context invalidated")
    );
  };

  globalThis.__doWalletIsContextInvalidated = isContextInvalidated;

  addEventListener(
    "error",
    (event) => {
      if (!isContextInvalidated(event.error || event.message)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  addEventListener(
    "unhandledrejection",
    (event) => {
      if (!isContextInvalidated(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );
})();
