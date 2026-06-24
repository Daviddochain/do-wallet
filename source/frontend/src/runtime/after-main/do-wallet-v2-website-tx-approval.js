(function () {
  "use strict";

  if (window.__doWalletWebsiteTxApprovalInstalled) return;
  window.__doWalletWebsiteTxApprovalInstalled = true;

  var STYLE_ID = "dochain-website-tx-approval-style";
  var MODAL_ID = "dochain-website-tx-approval-modal";
  var FALLBACK_MARKER = "__websiteFallback";
  var PROVIDER_KEY = "__doWalletWebsiteProvider";
  var INSTALL_EVENT = "do_wallet_website_tx_provider_ready";

  function shouldRunHere() {
    try {
      if (window.location.protocol !== "https:" && window.location.protocol !== "http:") return false;
      var host = window.location.hostname.toLowerCase();
      return (
        host === "do-wallet.com" ||
        host === "www.do-wallet.com" ||
        host.endsWith(".do-wallet.com") ||
        host === "do-chain.com" ||
        host === "www.do-chain.com" ||
        host.endsWith(".do-chain.com")
      );
    } catch (error) {
      return false;
    }
  }

  if (!shouldRunHere()) return;

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;",
      }[char];
    });
  }

  function short(value, size) {
    value = String(value || "");
    size = size || 10;
    if (value.length <= size * 2 + 3) return value;
    return value.slice(0, size) + "..." + value.slice(-size);
  }

  function parseJsonMaybe(value) {
    if (typeof value !== "string") return value;
    var text = value.trim();
    if (!text) return value;
    try {
      return JSON.parse(text);
    } catch (error) {
      return value;
    }
  }

  function getTerraModule() {
    try {
      var req = window.__doWalletWebpackRequire;
      return typeof req === "function" ? req(62467) : null;
    } catch (error) {
      return null;
    }
  }

  function isClassicChain(chainID) {
    return chainID === "columbus-5" || chainID === "phoenix-1";
  }

  function normalizeMsg(msg, chainID) {
    msg = parseJsonMaybe(msg);
    if (!isObject(msg)) return msg;
    if (typeof msg.toData === "function" || typeof msg.toAmino === "function") return msg;
    var terra = getTerraModule();
    if (!terra || !terra.Msg) return msg;
    try {
      if (msg["@type"] && typeof terra.Msg.fromData === "function") {
        return terra.Msg.fromData(msg, isClassicChain(chainID));
      }
      if (msg.type && typeof terra.Msg.fromAmino === "function") {
        return terra.Msg.fromAmino(msg, isClassicChain(chainID));
      }
    } catch (error) {
      console.warn("Do-Wallet website approval could not normalize message", error);
    }
    return msg;
  }

  function normalizeFee(fee) {
    fee = parseJsonMaybe(fee);
    if (!isObject(fee)) return fee;
    if (typeof fee.toData === "function" || typeof fee.toAmino === "function") return fee;
    var terra = getTerraModule();
    try {
      if (terra && terra.Fee && typeof terra.Fee.fromData === "function" && fee.amount && fee.gas_limit) {
        return terra.Fee.fromData(fee);
      }
    } catch (error) {
      console.warn("Do-Wallet website approval could not normalize fee", error);
    }
    return fee;
  }

  function normalizeTx(tx) {
    if (!isObject(tx)) return tx;
    var chainID = tx.chainID || tx.chainId || tx.chain_id || tx.network || "Do-Chain";
    var copy = Object.assign({}, tx, { chainID: chainID });
    copy.msgs = Array.isArray(tx.msgs)
      ? tx.msgs.map(function (msg) { return normalizeMsg(msg, chainID); })
      : [];
    if (tx.fee) copy.fee = normalizeFee(tx.fee);
    if (copy.chainId === undefined) copy.chainId = chainID;
    if (copy.chain_id === undefined) copy.chain_id = chainID;
    return copy;
  }

  function txChain(tx) {
    return String((tx && (tx.chainID || tx.chainId || tx.chain_id || tx.network || tx.networkId)) || "Unknown");
  }

  function feeText(fee) {
    fee = parseJsonMaybe(fee);
    if (!fee) return "Auto";
    try {
      if (typeof fee.toData === "function") fee = fee.toData();
    } catch (error) {}
    var amount = Array.isArray(fee.amount)
      ? fee.amount.map(function (coin) { return String(coin.amount || "") + " " + String(coin.denom || ""); }).join(", ")
      : "";
    var gas = fee.gas_limit || fee.gas || "";
    return [amount || "Auto", gas ? "gas " + gas : ""].filter(Boolean).join(" / ");
  }

  function messageTitle(raw) {
    var msg = parseJsonMaybe(raw);
    if (!isObject(msg)) return String(msg || "Message");
    var type = String(msg["@type"] || msg.type || (msg.constructor && msg.constructor.name) || "Message");
    type = type.replace(/^\/?cosmos\./, "").replace(/^\/?cosmwasm\./, "").replace(/^wasm\//, "");
    var body = isObject(msg.value) ? msg.value : msg;
    if (/MsgSend/i.test(type)) {
      return "Send " + short(body.from_address || body.fromAddress, 8) + " -> " + short(body.to_address || body.toAddress, 8);
    }
    if (/MsgExecuteContract/i.test(type)) {
      return "Execute contract " + short(body.contract, 8);
    }
    return type || "Message";
  }

  function getProvider() {
    var provider = window[PROVIDER_KEY];
    return provider && typeof provider.post === "function" ? provider : null;
  }

  function providerWallet(provider) {
    if (!provider) return null;
    if (provider.wallet) return provider.wallet;
    try {
      if (typeof provider.getConnectedWallet === "function") return provider.getConnectedWallet();
    } catch (error) {}
    return null;
  }

  function needsPassword(provider) {
    var wallet = providerWallet(provider);
    if (!wallet) return true;
    if (wallet.ledger) return false;
    if (wallet.external && !wallet.encrypted && !wallet.encryptedSeed && !wallet.wallet) return false;
    return true;
  }

  function waitForProvider() {
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function check() {
        var provider = getProvider();
        if (provider) {
          resolve(provider);
          return;
        }
        if (Date.now() - started > 6000) {
          reject(new Error("Website wallet signer is still loading. Refresh the wallet and try again."));
          return;
        }
        window.setTimeout(check, 100);
      })();
    });
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".dochain-webtx-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(5,0,14,.72);backdrop-filter:blur(8px);padding:18px}",
      ".dochain-webtx-panel{width:min(720px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;border:1px solid rgba(170,85,255,.55);border-radius:16px;background:#1e1430;color:#fff;box-shadow:0 24px 80px rgba(0,0,0,.55);font-family:Inter,Arial,sans-serif}",
      ".dochain-webtx-head{padding:26px 28px 18px;border-bottom:1px solid rgba(173,115,255,.22);background:#08020f}",
      ".dochain-webtx-origin{margin:0 0 8px;color:#a78bfa;font-size:15px;font-weight:800;word-break:break-all}",
      ".dochain-webtx-title{margin:0;font-size:30px;line-height:1.1;font-weight:900;letter-spacing:0}",
      ".dochain-webtx-body{padding:22px 28px 28px}",
      ".dochain-webtx-grid{display:grid;grid-template-columns:130px 1fr;gap:10px 16px;margin-bottom:18px}",
      ".dochain-webtx-label{color:#c4b5fd;font-size:13px;font-weight:900;text-transform:uppercase}",
      ".dochain-webtx-value{font-size:16px;font-weight:700;word-break:break-word}",
      ".dochain-webtx-msgs{display:grid;gap:8px;margin:16px 0 18px}",
      ".dochain-webtx-msg{border:1px solid rgba(170,85,255,.28);border-radius:10px;background:#0b0613;padding:12px 14px;font-size:15px;font-weight:800}",
      ".dochain-webtx-details{margin:0 0 18px;border:1px solid rgba(170,85,255,.28);border-radius:10px;background:#11091d}",
      ".dochain-webtx-details summary{cursor:pointer;padding:12px 14px;font-weight:900;color:#facc15}",
      ".dochain-webtx-details pre{white-space:pre-wrap;word-break:break-word;margin:0;padding:0 14px 14px;color:#d8b4fe;font-size:12px;line-height:1.45}",
      ".dochain-webtx-field{display:grid;gap:8px;margin:16px 0}",
      ".dochain-webtx-field label{color:#d8b4fe;font-size:15px;font-weight:800}",
      ".dochain-webtx-field input{width:100%;box-sizing:border-box;border:1px solid rgba(168,85,247,.62);border-radius:10px;background:#06020c;color:#fff;padding:14px 16px;font-size:18px;outline:none}",
      ".dochain-webtx-error{min-height:20px;margin:8px 0;color:#fca5a5;font-size:14px;font-weight:800;white-space:pre-wrap}",
      ".dochain-webtx-actions{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}",
      ".dochain-webtx-actions button{border:0;border-radius:14px;padding:17px 18px;font-size:18px;font-weight:900;cursor:pointer;color:#fff}",
      ".dochain-webtx-deny{background:#ff5364}",
      ".dochain-webtx-post{background:#9333ea}",
      ".dochain-webtx-post:not(:disabled){background:#a855f7}",
      ".dochain-webtx-actions button:disabled{cursor:not-allowed;opacity:.55}",
      "@media(max-width:560px){.dochain-webtx-panel{border-radius:12px}.dochain-webtx-head,.dochain-webtx-body{padding-left:18px;padding-right:18px}.dochain-webtx-title{font-size:24px}.dochain-webtx-grid{grid-template-columns:1fr}.dochain-webtx-actions{grid-template-columns:1fr}}",
    ].join("");
    document.head.appendChild(style);
  }

  function rawTxForDisplay(tx) {
    try {
      return JSON.stringify(tx, function (key, value) {
        if (/password|seed|private|secret|mnemonic/i.test(key)) return "[redacted]";
        if (typeof value === "bigint") return value.toString();
        if (value && typeof value.toData === "function") return value.toData();
        if (value && typeof value.toJSON === "function") return value.toJSON();
        return value;
      }, 2);
    } catch (error) {
      return String(tx || "");
    }
  }

  function openApproval(tx, provider, initialPassword, submitter) {
    ensureStyles();
    var existing = document.getElementById(MODAL_ID);
    if (existing) existing.remove();
    var passwordRequired = needsPassword(provider);
    var messages = Array.isArray(tx && tx.msgs) ? tx.msgs : [];
    var modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "dochain-webtx-overlay";
    modal.innerHTML = [
      "<section class=\"dochain-webtx-panel\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"dochain-webtx-title\">",
      "<header class=\"dochain-webtx-head\">",
      "<p class=\"dochain-webtx-origin\">" + escapeHtml(window.location.origin) + "</p>",
      "<h2 id=\"dochain-webtx-title\" class=\"dochain-webtx-title\">Approve transaction</h2>",
      "</header>",
      "<div class=\"dochain-webtx-body\">",
      "<div class=\"dochain-webtx-grid\">",
      "<div class=\"dochain-webtx-label\">Network</div><div class=\"dochain-webtx-value\">" + escapeHtml(txChain(tx)) + "</div>",
      "<div class=\"dochain-webtx-label\">Fee</div><div class=\"dochain-webtx-value\">" + escapeHtml(feeText(tx && tx.fee)) + "</div>",
      "<div class=\"dochain-webtx-label\">Memo</div><div class=\"dochain-webtx-value\">" + escapeHtml(short(tx && tx.memo, 80) || "-") + "</div>",
      "</div>",
      "<div class=\"dochain-webtx-msgs\">" + (messages.length ? messages.map(function (msg) { return "<div class=\"dochain-webtx-msg\">" + escapeHtml(messageTitle(msg)) + "</div>"; }).join("") : "<div class=\"dochain-webtx-msg\">Transaction message</div>") + "</div>",
      "<details class=\"dochain-webtx-details\"><summary>Transaction details</summary><pre>" + escapeHtml(rawTxForDisplay(tx)) + "</pre></details>",
      passwordRequired ? "<div class=\"dochain-webtx-field\"><label for=\"dochain-webtx-password\">Password</label><input id=\"dochain-webtx-password\" type=\"password\" autocomplete=\"current-password\" /></div>" : "",
      "<div class=\"dochain-webtx-error\" role=\"alert\"></div>",
      "<div class=\"dochain-webtx-actions\"><button type=\"button\" class=\"dochain-webtx-deny\">Deny</button><button type=\"button\" class=\"dochain-webtx-post\">Post</button></div>",
      "</div>",
      "</section>",
    ].join("");
    document.body.appendChild(modal);

    return new Promise(function (resolve, reject) {
      var password = modal.querySelector("#dochain-webtx-password");
      var deny = modal.querySelector(".dochain-webtx-deny");
      var post = modal.querySelector(".dochain-webtx-post");
      var error = modal.querySelector(".dochain-webtx-error");
      var closed = false;

      function close() {
        closed = true;
        window.removeEventListener("keydown", onKeydown, true);
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }

      function setBusy(busy) {
        post.disabled = busy || (passwordRequired && !String(password && password.value || "").trim());
        deny.disabled = busy;
        post.textContent = busy ? "Posting..." : "Post";
      }

      function setError(message) {
        error.textContent = message || "";
      }

      function onInput() {
        setBusy(false);
      }

      function onKeydown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
          reject(new Error("Transaction declined"));
        }
      }

      deny.addEventListener("click", function () {
        close();
        reject(new Error("Transaction declined"));
      });

      post.addEventListener("click", function () {
        if (closed) return;
        var passwordValue = passwordRequired ? String(password && password.value || "").trim() : String(initialPassword || "");
        if (passwordRequired && !passwordValue) {
          setError("Enter your wallet password to post this transaction.");
          setBusy(false);
          return;
        }
        setError("");
        setBusy(true);
        Promise.resolve()
          .then(function () {
            if (!getProvider()) throw new Error("Website wallet signer is unavailable. Refresh the wallet and try again.");
            return submitter(normalizeTx(tx), passwordValue);
          })
          .then(function (result) {
            close();
            resolve(result);
          })
          .catch(function (error) {
            setError((error && error.message) || "Transaction was not posted.");
            setBusy(false);
            if (password) password.focus();
          });
      });

      if (password) {
        password.value = initialPassword || "";
        password.addEventListener("input", onInput);
        window.setTimeout(function () { password.focus(); }, 0);
      } else {
        window.setTimeout(function () { post.focus(); }, 0);
      }
      window.addEventListener("keydown", onKeydown, true);
      setBusy(false);
    });
  }

  var approval = {
    post: function (tx, password) {
      return waitForProvider().then(function (provider) {
        var wallet = providerWallet(provider);
        if (wallet && wallet.external && !wallet.encrypted && !wallet.encryptedSeed && !wallet.wallet) {
          throw new Error("This wallet was connected from the extension and cannot sign in the website. Import or unlock the wallet on the website, or use the extension.");
        }
        return openApproval(tx, provider, password, function (normalizedTx, passwordValue) {
          return provider.post(normalizedTx, passwordValue);
        });
      });
    },
    sign: function (tx, password) {
      return waitForProvider().then(function (provider) {
        if (typeof provider.sign !== "function") throw new Error("Website wallet signer cannot sign this transaction type.");
        return openApproval(tx, provider, password, function (normalizedTx, passwordValue) {
          return provider.sign(normalizedTx, passwordValue);
        });
      });
    },
  };

  window.__doWalletWebsiteApproval = approval;

  function realExtensionProviderExists() {
    var wallet = window.doWallet;
    return Boolean(wallet && typeof wallet.post === "function" && wallet[FALLBACK_MARKER] !== true);
  }

  function installFallbackProvider() {
    if (realExtensionProviderExists()) return;
    var current = isObject(window.doWallet) ? window.doWallet : {};
    if (current[FALLBACK_MARKER] === true && typeof current.post === "function") return;
    current[FALLBACK_MARKER] = true;
    current.post = function (tx, password) {
      return approval.post(tx, password);
    };
    current.sign = function (tx, password) {
      return approval.sign(tx, password);
    };
    current.isWebsiteFallback = true;
    window.doWallet = current;
  }

  installFallbackProvider();
  window.addEventListener(INSTALL_EVENT, installFallbackProvider);
  window.addEventListener("do_wallet_bridge_update", function () { window.setTimeout(installFallbackProvider, 50); });
  window.setTimeout(installFallbackProvider, 250);
  window.setTimeout(installFallbackProvider, 1000);
})();
