(function () {
  "use strict";

  var host = String(window.location.hostname || "").toLowerCase();
  if (host !== "do-wallet.com" && host !== "www.do-wallet.com") return;

  var blockedKeys = {
    CustomNetworks: true,
    StationNetworks: true,
    StationAssets: true,
    StationChains: true,
    StationLCD: true
  };

  var blockedPattern = /^(terra[-_ ]?station|station[-_ ]?(assets|chains|lcd|networks)|custom[-_ ]?networks)$/i;

  function isBlockedKey(key) {
    var name = String(key || "");
    return !!blockedKeys[name] || blockedPattern.test(name);
  }

  try {
    var rawLocalStorage = window.localStorage;
    var proto = Storage && Storage.prototype;
    if (!proto || proto.__doWalletLegacyStorageGuard) return;

    var originalGetItem = proto.getItem;
    var originalSetItem = proto.setItem;
    var originalKey = proto.key;
    var originalRemoveItem = proto.removeItem;
    var originalObjectKeys = Object.keys;
    var originalGetOwnPropertyNames = Object.getOwnPropertyNames;
    var originalReflectOwnKeys = Reflect.ownKeys;

    function isGuardedStorage(storage) {
      return storage === rawLocalStorage || storage === window.localStorage;
    }

    function visibleKeys(storage) {
      var keys = [];
      var length = Number(rawLocalStorage.length || 0);
      for (var index = 0; index < length; index += 1) {
        var key = originalKey.call(storage, index);
        if (key && !isBlockedKey(key)) keys.push(key);
      }
      return keys;
    }

    function hideExistingKey(key) {
      if (!isBlockedKey(key)) return;
      try {
        Object.defineProperty(rawLocalStorage, key, {
          configurable: true,
          enumerable: false,
          get: function () { return null; },
          set: function () { return undefined; }
        });
      } catch (error) {}
    }

    Object.defineProperty(proto, "__doWalletLegacyStorageGuard", {
      value: true,
      configurable: false,
      enumerable: false
    });

    proto.getItem = function (key) {
      if (isGuardedStorage(this) && isBlockedKey(key)) return null;
      return originalGetItem.call(this, key);
    };

    proto.setItem = function (key, value) {
      if (isGuardedStorage(this) && isBlockedKey(key)) return undefined;
      return originalSetItem.call(this, key, value);
    };

    proto.removeItem = function (key) {
      if (isGuardedStorage(this) && isBlockedKey(key)) return undefined;
      return originalRemoveItem.call(this, key);
    };

    proto.key = function (index) {
      if (!isGuardedStorage(this)) return originalKey.call(this, index);
      return visibleKeys(this)[index] || null;
    };

    Object.keys = function (value) {
      var keys = originalObjectKeys.call(Object, value);
      return isGuardedStorage(value) ? keys.filter(function (key) { return !isBlockedKey(key); }) : keys;
    };

    Object.getOwnPropertyNames = function (value) {
      var keys = originalGetOwnPropertyNames.call(Object, value);
      return isGuardedStorage(value) ? keys.filter(function (key) { return !isBlockedKey(key); }) : keys;
    };

    Reflect.ownKeys = function (value) {
      var keys = originalReflectOwnKeys.call(Reflect, value);
      return isGuardedStorage(value) ? keys.filter(function (key) { return !isBlockedKey(key); }) : keys;
    };

    visibleKeys(rawLocalStorage);
    for (var rawIndex = 0; rawIndex < rawLocalStorage.length; rawIndex += 1) {
      hideExistingKey(originalKey.call(rawLocalStorage, rawIndex));
    }

    window.__DO_WALLET_LEGACY_STORAGE_GUARD__ = {
      active: true,
      mode: "masked-enumeration",
      blockedKeys: Object.keys(blockedKeys)
    };
  } catch (error) {
    window.__DO_WALLET_LEGACY_STORAGE_GUARD__ = {
      active: false,
      error: String(error && error.message || error)
    };
  }
})();
