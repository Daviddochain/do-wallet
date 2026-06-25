(function () {
  "use strict";

  if (window.__doWalletMarketsData20260625) return;
  window.__doWalletMarketsData20260625 = true;

  var CACHE_KEY = "do-wallet-markets-response-cache.v2";
  var CACHE_TTL_MS = 5 * 60 * 1000;
  var MAX_CACHE_AGE_MS = 30 * 60 * 1000;
  var MAX_CACHE_ENTRIES = 8;
  var MAX_COINS = 250;
  var MAX_JSON = 1024 * 1024;
  var NativeFetch = window.fetch ? window.fetch.bind(window) : null;
  var NativeXHR = window.XMLHttpRequest;

  function shouldRunHere() {
    try {
      var protocol = window.location.protocol;
      if (protocol !== "https:" && protocol !== "http:") return false;
      var host = window.location.hostname.toLowerCase();
      return (
        host === "do-wallet.com" ||
        host === "www.do-wallet.com" ||
        host.endsWith(".do-wallet.com") ||
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1"
      );
    } catch (error) {
      return false;
    }
  }

  if (!shouldRunHere()) return;

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function readStore() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw || raw.length > MAX_JSON) return { version: 2, entries: {} };
      var parsed = JSON.parse(raw);
      if (!isObject(parsed) || !isObject(parsed.entries)) return { version: 2, entries: {} };
      return parsed;
    } catch (error) {
      return { version: 2, entries: {} };
    }
  }

  function writeStore(store) {
    try {
      var raw = JSON.stringify(store);
      if (raw.length > MAX_JSON) return false;
      window.localStorage.setItem(CACHE_KEY, raw);
      return true;
    } catch (error) {
      return false;
    }
  }

  function pruneEntries(entries) {
    var keys = Object.keys(entries || {}).sort(function (left, right) {
      return Number(entries[right] && entries[right].cachedAt || 0) - Number(entries[left] && entries[left].cachedAt || 0);
    });
    var next = {};
    keys.slice(0, MAX_CACHE_ENTRIES).forEach(function (key) {
      next[key] = entries[key];
    });
    return next;
  }

  function marketsRequest(method, input) {
    method = clean(method || "GET").toUpperCase();
    if (method && method !== "GET") return null;
    try {
      var url = new URL(typeof input === "string" ? input : String(input && input.url || ""), window.location.href);
      if (!/\/api\/markets\/coins$/i.test(url.pathname)) return null;
      var page = clean(url.searchParams.get("page") || "1") || "1";
      var perPage = clean(url.searchParams.get("per_page") || url.searchParams.get("perPage") || "250") || "250";
      var category = clean(url.searchParams.get("category"));
      var order = clean(url.searchParams.get("order") || "market_cap_desc") || "market_cap_desc";
      var search = clean(url.searchParams.get("search"));
      var signature = [
        "page=" + page,
        "per_page=" + perPage,
        "category=" + category.toLowerCase(),
        "order=" + order,
        "search=" + search.toLowerCase()
      ].join("&");
      return {
        url: url,
        signature: signature,
        page: Number(page) || 1,
        perPage: Math.min(Math.max(Number(perPage) || 250, 1), MAX_COINS),
        category: category,
        order: order,
        search: search
      };
    } catch (error) {
      return null;
    }
  }

  function cacheablePayload(payload) {
    if (!isObject(payload) || !Array.isArray(payload.coins)) return null;
    var coins = payload.coins.slice(0, MAX_COINS);
    return Object.assign({}, payload, {
      count: Number(payload.count) || coins.length,
      coins: coins
    });
  }

  function readCached(request, allowStale) {
    var store = readStore();
    var entry = store.entries[request.signature];
    if (!entry || !isObject(entry.data)) return null;
    var age = Date.now() - Number(entry.cachedAt || 0);
    if (age < 0 || age > (allowStale ? MAX_CACHE_AGE_MS : CACHE_TTL_MS)) return null;
    return entry.data;
  }

  function writeCached(request, payload) {
    var data = cacheablePayload(payload);
    if (!data) return false;
    var store = readStore();
    store.version = 2;
    store.entries[request.signature] = {
      cachedAt: Date.now(),
      data: data
    };
    store.entries = pruneEntries(store.entries);
    return writeStore(store);
  }

  function responseText(payload) {
    return JSON.stringify(payload);
  }

  function cachedFetchResponse(payload) {
    return new Response(responseText(payload), {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Do-Wallet-Markets-Cache": "hit"
      }
    });
  }

  function cacheFetchResponse(request, response) {
    try {
      if (!response || !response.ok) return;
      var type = clean(response.headers && response.headers.get && response.headers.get("content-type")).toLowerCase();
      if (type && type.indexOf("json") < 0) return;
      response.clone().json().then(function (payload) {
        writeCached(request, payload);
      }).catch(function () {});
    } catch (error) {}
  }

  function installFetchCache() {
    if (!NativeFetch || typeof Response !== "function") return;
    window.fetch = function (input, init) {
      var method = init && init.method || input && input.method || "GET";
      var request = marketsRequest(method, input);
      if (!request) return NativeFetch(input, init);
      var cached = readCached(request, true);
      if (cached) return Promise.resolve(cachedFetchResponse(cached));
      return NativeFetch(input, init).then(function (response) {
        cacheFetchResponse(request, response);
        return response;
      });
    };
  }

  function MiniEvent(type, target) {
    this.type = type;
    this.target = target;
    this.currentTarget = target;
    this.defaultPrevented = false;
  }

  MiniEvent.prototype.preventDefault = function () {
    this.defaultPrevented = true;
  };

  function installXhrCache() {
    if (!NativeXHR) return;

    var eventNames = ["readystatechange", "loadstart", "progress", "load", "error", "abort", "timeout", "loadend"];

    function CachedXHR() {
      this._native = new NativeXHR();
      this._listeners = {};
      this._request = null;
      this._mock = null;
      this._responseType = "";
      this.onreadystatechange = null;
      this.onloadstart = null;
      this.onprogress = null;
      this.onload = null;
      this.onerror = null;
      this.onabort = null;
      this.ontimeout = null;
      this.onloadend = null;

      var self = this;
      eventNames.forEach(function (type) {
        self._native.addEventListener(type, function () {
          if (type === "load" && self._request) self._cacheNativeResponse();
          self._emit(type);
        });
      });
    }

    CachedXHR.UNSENT = 0;
    CachedXHR.OPENED = 1;
    CachedXHR.HEADERS_RECEIVED = 2;
    CachedXHR.LOADING = 3;
    CachedXHR.DONE = 4;

    CachedXHR.prototype.UNSENT = 0;
    CachedXHR.prototype.OPENED = 1;
    CachedXHR.prototype.HEADERS_RECEIVED = 2;
    CachedXHR.prototype.LOADING = 3;
    CachedXHR.prototype.DONE = 4;

    CachedXHR.prototype._emit = function (type) {
      var event = new MiniEvent(type, this);
      var handler = this["on" + type];
      if (typeof handler === "function") {
        try { handler.call(this, event); } catch (error) { window.setTimeout(function () { throw error; }, 0); }
      }
      (this._listeners[type] || []).slice().forEach(function (listener) {
        try { listener.call(this, event); } catch (error) { window.setTimeout(function () { throw error; }, 0); }
      }, this);
    };

    CachedXHR.prototype.addEventListener = function (type, listener) {
      if (typeof listener !== "function") return;
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(listener);
    };

    CachedXHR.prototype.removeEventListener = function (type, listener) {
      var listeners = this._listeners[type];
      if (!listeners) return;
      this._listeners[type] = listeners.filter(function (item) { return item !== listener; });
    };

    CachedXHR.prototype.dispatchEvent = function (event) {
      if (!event || !event.type) return false;
      this._emit(event.type);
      return true;
    };

    CachedXHR.prototype.open = function (method, url, async, user, password) {
      this._method = method || "GET";
      this._url = url;
      this._request = marketsRequest(this._method, url);
      var cached = this._request ? readCached(this._request, true) : null;
      if (cached) {
        this._mock = {
          readyState: 1,
          status: 0,
          statusText: "",
          responseText: "",
          response: null,
          responseURL: new URL(String(url), window.location.href).href,
          data: cached
        };
        this._emit("readystatechange");
        return;
      }
      this._mock = null;
      this._native.open(method, url, async !== false, user, password);
    };

    CachedXHR.prototype.setRequestHeader = function (name, value) {
      if (this._mock) return;
      this._native.setRequestHeader(name, value);
    };

    CachedXHR.prototype.overrideMimeType = function (mimeType) {
      if (this._mock) return;
      if (this._native.overrideMimeType) this._native.overrideMimeType(mimeType);
    };

    CachedXHR.prototype.getAllResponseHeaders = function () {
      if (this._mock) return "content-type: application/json; charset=utf-8\r\nx-do-wallet-markets-cache: hit\r\n";
      return this._native.getAllResponseHeaders();
    };

    CachedXHR.prototype.getResponseHeader = function (name) {
      if (this._mock) {
        return clean(name).toLowerCase() === "content-type" ? "application/json; charset=utf-8" : null;
      }
      return this._native.getResponseHeader(name);
    };

    CachedXHR.prototype.send = function (body) {
      var self = this;
      if (!this._mock) {
        this._native.send(body);
        return;
      }
      this._emit("loadstart");
      window.setTimeout(function () {
        var text = responseText(self._mock.data);
        self._mock.status = 200;
        self._mock.statusText = "OK";
        self._mock.readyState = 2;
        self._emit("readystatechange");
        self._mock.readyState = 3;
        self._mock.responseText = text;
        self._mock.response = self._responseType === "json" ? self._mock.data : text;
        self._emit("readystatechange");
        self._emit("progress");
        self._mock.readyState = 4;
        self._emit("readystatechange");
        self._emit("load");
        self._emit("loadend");
      }, 0);
    };

    CachedXHR.prototype.abort = function () {
      if (this._mock) {
        this._mock.readyState = 0;
        this._emit("abort");
        this._emit("loadend");
        return;
      }
      this._native.abort();
    };

    CachedXHR.prototype._cacheNativeResponse = function () {
      try {
        if (!this._request || this._native.status < 200 || this._native.status >= 300) return;
        var raw = this._native.responseType === "json" ? this._native.response : this._native.responseText;
        var payload = typeof raw === "string" ? JSON.parse(raw) : raw;
        writeCached(this._request, payload);
      } catch (error) {}
    };

    [
      "readyState",
      "status",
      "statusText",
      "responseText",
      "response",
      "responseURL"
    ].forEach(function (property) {
      Object.defineProperty(CachedXHR.prototype, property, {
        configurable: true,
        enumerable: true,
        get: function () {
          return this._mock ? this._mock[property] : this._native[property];
        }
      });
    });

    [
      "timeout",
      "withCredentials"
    ].forEach(function (property) {
      Object.defineProperty(CachedXHR.prototype, property, {
        configurable: true,
        enumerable: true,
        get: function () {
          return this._mock ? this["_" + property] || 0 : this._native[property];
        },
        set: function (value) {
          this["_" + property] = value;
          if (!this._mock) this._native[property] = value;
        }
      });
    });

    Object.defineProperty(CachedXHR.prototype, "responseType", {
      configurable: true,
      enumerable: true,
      get: function () {
        return this._mock ? this._responseType : this._native.responseType;
      },
      set: function (value) {
        this._responseType = clean(value);
        if (!this._mock) this._native.responseType = value;
      }
    });

    Object.defineProperty(CachedXHR.prototype, "upload", {
      configurable: true,
      enumerable: true,
      get: function () {
        return this._native.upload;
      }
    });

    window.XMLHttpRequest = CachedXHR;
  }

  installFetchCache();
  installXhrCache();

  window.doWalletMarketsData = {
    readCache: function () { return readStore(); },
    clearCache: function () {
      try { window.localStorage.removeItem(CACHE_KEY); } catch (error) {}
    }
  };
})();
