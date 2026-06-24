(() => {
  const OPTIONAL_ASSET_WARNING = "useTerraAssets: failed to fetch";
  globalThis.__doWalletRuntimeGuardVersion = "20260609-optional-assets";

  const shouldHideOptionalAssetWarning = (args) =>
    args.some((arg) => {
      try {
        return String(arg).includes(OPTIONAL_ASSET_WARNING);
      } catch (_) {
        return false;
      }
    });

  const filterConsoleMethod = (method) => {
    const original = console[method] && console[method].bind(console);
    if (!original) return;

    console[method] = (...args) => {
      if (shouldHideOptionalAssetWarning(args)) {
        return;
      }
      original(...args);
    };
  };

  filterConsoleMethod("warn");
  filterConsoleMethod("error");

  const isBadNumberValue = (value) =>
    value === "NaN" ||
    value === "Infinity" ||
    value === "-Infinity" ||
    (typeof value === "number" && !Number.isFinite(value));

  const cleanNumericValue = (value) => (isBadNumberValue(value) ? "" : value);

  const installInputValueGuard = () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    );

    if (!descriptor || !descriptor.get || !descriptor.set) {
      return;
    }

    Object.defineProperty(HTMLInputElement.prototype, "value", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(value) {
        return descriptor.set.call(this, cleanNumericValue(value));
      },
    });
  };

  const installInputValueAsNumberGuard = () => {
    const valueDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    );
    const numberDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "valueAsNumber"
    );

    if (
      !valueDescriptor ||
      !valueDescriptor.set ||
      !numberDescriptor ||
      !numberDescriptor.get ||
      !numberDescriptor.set
    ) {
      return;
    }

    Object.defineProperty(HTMLInputElement.prototype, "valueAsNumber", {
      configurable: true,
      enumerable: numberDescriptor.enumerable,
      get: numberDescriptor.get,
      set(value) {
        if (isBadNumberValue(value)) {
          return valueDescriptor.set.call(this, "");
        }
        return numberDescriptor.set.call(this, value);
      },
    });
  };

  const installAttributeGuard = () => {
    const originalSetAttribute = Element.prototype.setAttribute;
    const numericInputAttributes = new Set(["value", "min", "max", "step"]);

    Element.prototype.setAttribute = function setAttribute(name, value) {
      const normalizedName = String(name).toLowerCase();
      if (
        this instanceof HTMLInputElement &&
        numericInputAttributes.has(normalizedName) &&
        isBadNumberValue(value)
      ) {
        if (normalizedName === "value") {
          return originalSetAttribute.call(this, name, "");
        }
        this.removeAttribute(name);
        return undefined;
      }

      return originalSetAttribute.call(this, name, value);
    };
  };

  try {
    installInputValueGuard();
    installInputValueAsNumberGuard();
    installAttributeGuard();
  } catch (_) {
    // If a browser locks these DOM descriptors, the app should continue normally.
  }
})();
