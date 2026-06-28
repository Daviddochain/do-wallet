(function () {
  "use strict";

  var BUTTON_ID = "do-wallet-mobile-connect-button";
  var STYLE_ID = "do-wallet-mobile-connect-style";
  var MODAL_ID = "do-wallet-mobile-connect-modal";
  var PENDING_SEED_KEY = "do-wallet-mobile-connect-seed.v1";
  var HASH_PREFIX = "#m=";
  var QR_EXPIRES_MS = 2 * 60 * 1000;
  var qrExpireTimer = 0;

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  function setText(node, value) {
    if (node) node.textContent = value || "";
  }

  function isVisible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var rect = node.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  }

  function shortAddress(value) {
    var address = text(value);
    if (address.length <= 18) return address;
    return address.slice(0, 8) + "..." + address.slice(-6);
  }

  function readRevealWallets() {
    try {
      if (typeof window.doWalletSeedWalletsForReveal === "function") {
        return window.doWalletSeedWalletsForReveal().filter(function (wallet) {
          return wallet && wallet.canReveal;
        });
      }
    } catch (error) {}
    return [];
  }

  function mobileOrigin() {
    var origin = "";
    try {
      origin = window.location.origin || "";
    } catch (error) {}
    if (/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin)) {
      return "https://do-wallet.com";
    }
    return origin || "https://do-wallet.com";
  }

  function packMnemonic(phrase) {
    return text(phrase).toLowerCase().split(/\s+/).filter(Boolean).join(".");
  }

  function unpackMnemonic(value) {
    return text(value).replace(/\./g, " ").replace(/\s+/g, " ");
  }

  function buildMobileLink(phrase) {
    return mobileOrigin() + "/" + HASH_PREFIX + packMnemonic(phrase);
  }

  function qrToBytes(value) {
    if (window.TextEncoder) return Array.prototype.slice.call(new TextEncoder().encode(value));
    return unescape(encodeURIComponent(value)).split("").map(function (char) { return char.charCodeAt(0); });
  }

  function qrGfMultiply(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i -= 1) {
      z = ((z << 1) ^ ((z >>> 7) * 0x11d)) & 0xff;
      if (((y >>> i) & 1) !== 0) z ^= x;
    }
    return z;
  }

  function qrReedSolomonGenerator(degree) {
    var result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    var root = 1;
    for (var i = 0; i < degree; i += 1) {
      for (var j = 0; j < degree; j += 1) {
        result[j] = qrGfMultiply(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = qrGfMultiply(root, 2);
    }
    return result;
  }

  function qrReedSolomonRemainder(data, degree) {
    var generator = qrReedSolomonGenerator(degree);
    var result = new Array(degree).fill(0);
    data.forEach(function (byte) {
      var factor = byte ^ result.shift();
      result.push(0);
      for (var i = 0; i < degree; i += 1) result[i] ^= qrGfMultiply(generator[i], factor);
    });
    return result;
  }

  function qrDrawFinder(modules, reserved, x, y) {
    var size = modules.length;
    for (var dy = -1; dy <= 7; dy += 1) {
      for (var dx = -1; dx <= 7; dx += 1) {
        var xx = x + dx;
        var yy = y + dy;
        if (xx < 0 || xx >= size || yy < 0 || yy >= size) continue;
        var dark = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
          (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
        modules[yy][xx] = dark;
        reserved[yy][xx] = true;
      }
    }
  }

  function qrDrawAlignment(modules, reserved, x, y) {
    for (var dy = -2; dy <= 2; dy += 1) {
      for (var dx = -2; dx <= 2; dx += 1) {
        var distance = Math.max(Math.abs(dx), Math.abs(dy));
        modules[y + dy][x + dx] = distance !== 1;
        reserved[y + dy][x + dx] = true;
      }
    }
  }

  function qrBchRemainder(value, generator, degree) {
    var result = value;
    for (var i = Math.floor(Math.log(result) / Math.LN2); i >= degree; i -= 1) {
      if (((result >>> i) & 1) !== 0) result ^= generator << (i - degree);
    }
    return result;
  }

  function qrFormatBits(mask) {
    var data = (1 << 3) | mask;
    return ((data << 10) | qrBchRemainder(data << 10, 0x537, 10)) ^ 0x5412;
  }

  function qrVersionBits(version) {
    return (version << 12) | qrBchRemainder(version << 12, 0x1f25, 12);
  }

  function createQrDataUri(value) {
    try {
      var version = 10;
      var size = 4 * version + 17;
      var dataCodewords = 274;
      var ecCodewords = 18;
      var bytes = qrToBytes(value);
      if (bytes.length > dataCodewords - 4) return "";
      var bits = [];
      var addBits = function (val, len) {
        for (var i = len - 1; i >= 0; i -= 1) bits.push((val >>> i) & 1);
      };
      addBits(4, 4);
      addBits(bytes.length, 16);
      bytes.forEach(function (byte) { addBits(byte, 8); });
      var capacity = dataCodewords * 8;
      addBits(0, Math.min(4, capacity - bits.length));
      while (bits.length % 8 !== 0) bits.push(0);
      var codewords = [];
      for (var i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(""), 2));
      for (var pad = 0; codewords.length < dataCodewords; pad += 1) codewords.push(pad % 2 === 0 ? 0xec : 0x11);

      var dataBlocks = [
        codewords.slice(0, 68),
        codewords.slice(68, 136),
        codewords.slice(136, 205),
        codewords.slice(205, 274)
      ];
      var eccBlocks = dataBlocks.map(function (block) { return qrReedSolomonRemainder(block, ecCodewords); });
      var allCodewords = [];
      for (i = 0; i < 69; i += 1) dataBlocks.forEach(function (block) { if (i < block.length) allCodewords.push(block[i]); });
      for (i = 0; i < ecCodewords; i += 1) eccBlocks.forEach(function (block) { allCodewords.push(block[i]); });

      var modules = Array.from({ length: size }, function () { return new Array(size).fill(false); });
      var reserved = Array.from({ length: size }, function () { return new Array(size).fill(false); });
      var setFunction = function (x, y, dark) {
        modules[y][x] = dark;
        reserved[y][x] = true;
      };

      qrDrawFinder(modules, reserved, 0, 0);
      qrDrawFinder(modules, reserved, size - 7, 0);
      qrDrawFinder(modules, reserved, 0, size - 7);
      for (i = 8; i < size - 8; i += 1) {
        setFunction(i, 6, i % 2 === 0);
        setFunction(6, i, i % 2 === 0);
      }
      [6, 28, 50].forEach(function (x) {
        [6, 28, 50].forEach(function (y) {
          if (!((x === 6 && y === 6) || (x === 6 && y === 50) || (x === 50 && y === 6))) {
            qrDrawAlignment(modules, reserved, x, y);
          }
        });
      });
      setFunction(8, size - 8, true);
      for (i = 0; i < 9; i += 1) {
        if (i !== 6) {
          setFunction(8, i, false);
          setFunction(i, 8, false);
        }
      }
      for (i = 0; i < 8; i += 1) {
        setFunction(size - 1 - i, 8, false);
        setFunction(8, size - 1 - i, false);
      }
      var vbits = qrVersionBits(version);
      for (i = 0; i < 18; i += 1) {
        var bit = ((vbits >>> i) & 1) !== 0;
        var a = size - 11 + (i % 3);
        var b = Math.floor(i / 3);
        setFunction(a, b, bit);
        setFunction(b, a, bit);
      }

      var dataBits = [];
      allCodewords.forEach(function (byte) { for (var j = 7; j >= 0; j -= 1) dataBits.push((byte >>> j) & 1); });
      var bitIndex = 0;
      var upward = true;
      for (var x = size - 1; x >= 1; x -= 2) {
        if (x === 6) x -= 1;
        for (var y = 0; y < size; y += 1) {
          var yy = upward ? size - 1 - y : y;
          for (var dx = 0; dx < 2; dx += 1) {
            var xx = x - dx;
            if (reserved[yy][xx]) continue;
            var dataBit = bitIndex < dataBits.length && dataBits[bitIndex] === 1;
            bitIndex += 1;
            if ((xx + yy) % 2 === 0) dataBit = !dataBit;
            modules[yy][xx] = dataBit;
          }
        }
        upward = !upward;
      }

      var fbits = qrFormatBits(0);
      for (i = 0; i <= 5; i += 1) setFunction(8, i, ((fbits >>> i) & 1) !== 0);
      setFunction(8, 7, ((fbits >>> 6) & 1) !== 0);
      setFunction(8, 8, ((fbits >>> 7) & 1) !== 0);
      setFunction(7, 8, ((fbits >>> 8) & 1) !== 0);
      for (i = 9; i < 15; i += 1) setFunction(14 - i, 8, ((fbits >>> i) & 1) !== 0);
      for (i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, ((fbits >>> i) & 1) !== 0);
      for (i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, ((fbits >>> i) & 1) !== 0);
      setFunction(8, size - 8, true);

      var border = 4;
      var dim = size + border * 2;
      var path = [];
      for (y = 0; y < size; y += 1) {
        for (x = 0; x < size; x += 1) {
          if (modules[y][x]) path.push("M" + (x + border) + " " + (y + border) + "h1v1h-1z");
        }
      }
      var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + dim + " " + dim + "\">" +
        "<rect width=\"" + dim + "\" height=\"" + dim + "\" fill=\"#fff\"/>" +
        "<path d=\"" + path.join("") + "\" fill=\"#111\"/>" +
        "</svg>";
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    } catch (error) {
      return "";
    }
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".do-mobile-connect-button{appearance:none;align-items:center;justify-content:center;height:34px;min-width:0;border:1px solid #ffb22e;background:#ff9f08;color:#17101f;border-radius:999px;font:700 13px/1 Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:0 14px;cursor:pointer;white-space:nowrap;box-shadow:none;flex:0 0 auto}",
      ".do-mobile-connect-button:hover{background:#ffad24}",
      ".do-mobile-connect-button:focus{outline:2px solid #b044ff;outline-offset:2px}",
      ".do-mobile-connect-modal{position:fixed;inset:0;z-index:2147482600;display:flex;align-items:center;justify-content:center;background:rgba(4,0,13,.72);padding:18px}",
      ".do-mobile-connect-card{width:min(560px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow:auto;border:1px solid #66308b;border-radius:10px;background:#171020;color:#fff;box-shadow:0 22px 70px rgba(0,0,0,.52)}",
      ".do-mobile-connect-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #39204e;padding:20px 22px}",
      ".do-mobile-connect-title{margin:0;color:#fff;font-size:24px;line-height:1.15;font-weight:700}",
      ".do-mobile-connect-sub{margin:7px 0 0;color:#cdbff0;font-size:14px;line-height:1.45;font-weight:500}",
      ".do-mobile-connect-close{appearance:none;border:1px solid #6b3c8e;background:#21152f;color:#fff;border-radius:8px;width:36px;height:36px;font-size:22px;line-height:1;cursor:pointer}",
      ".do-mobile-connect-body{display:grid;gap:16px;padding:20px 22px}",
      ".do-mobile-connect-label{display:grid;gap:7px;color:#d9cff1;font-size:13px;font-weight:700}",
      ".do-mobile-connect-select,.do-mobile-connect-input{width:100%;box-sizing:border-box;border:1px solid #56307a;border-radius:8px;background:#0c0615;color:#fff;font:600 15px/1.2 Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:13px 14px}",
      ".do-mobile-connect-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}",
      ".do-mobile-connect-primary,.do-mobile-connect-secondary{appearance:none;border-radius:8px;font:700 14px/1 Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:13px 16px;cursor:pointer}",
      ".do-mobile-connect-primary{border:1px solid #a340ff;background:#9d3cf5;color:#fff}",
      ".do-mobile-connect-secondary{border:1px solid #56307a;background:#241835;color:#fff}",
      ".do-mobile-connect-primary:disabled,.do-mobile-connect-secondary:disabled{opacity:.58;cursor:not-allowed}",
      ".do-mobile-connect-note{border:1px solid #6a4b1d;border-radius:8px;background:#281c13;color:#ffd48a;padding:12px 13px;font-size:13px;line-height:1.45;font-weight:600}",
      ".do-mobile-connect-error{border:1px solid #8e2840;border-radius:8px;background:#2a0f1b;color:#ff8da6;padding:12px 13px;font-size:13px;line-height:1.45;font-weight:700}",
      ".do-mobile-connect-result{display:grid;gap:14px}",
      ".do-mobile-connect-qr{display:flex;gap:16px;align-items:center;border:1px solid #4d2a6b;border-radius:8px;background:#080411;padding:14px}",
      ".do-mobile-connect-qr img{width:180px;height:180px;flex:0 0 auto;border-radius:8px;background:#fff;padding:8px;box-sizing:border-box}",
      ".do-mobile-connect-link{word-break:break-all;color:#cdbff0;font-size:12px;line-height:1.45}",
      ".do-mobile-import-panel{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147482500;margin:auto;max-width:560px;border:1px solid #66308b;border-radius:10px;background:#171020;color:#fff;box-shadow:0 16px 50px rgba(0,0,0,.5);padding:14px 16px}",
      ".do-mobile-import-panel strong{display:block;margin-bottom:5px;font-size:15px}",
      ".do-mobile-import-panel p{margin:0 0 10px;color:#cdbff0;font-size:13px;line-height:1.45}",
      ".do-mobile-import-panel__actions{display:flex;gap:8px;flex-wrap:wrap}",
      ".do-mobile-import-panel button{appearance:none;border:1px solid #56307a;background:#241835;color:#fff;border-radius:8px;font:700 13px/1 Inter,system-ui,sans-serif;padding:10px 12px;cursor:pointer}",
      ".do-mobile-import-panel button.primary{background:#9d3cf5;border-color:#a340ff}",
      "@media (max-width:760px){.do-mobile-connect-button{display:none}.do-mobile-connect-card{width:calc(100vw - 24px);max-height:calc(100vh - 24px)}.do-mobile-connect-head,.do-mobile-connect-body{padding:16px}.do-mobile-connect-qr{align-items:flex-start;flex-direction:column}.do-mobile-connect-qr img{width:164px;height:164px}.do-mobile-connect-actions{display:grid;grid-template-columns:1fr}.do-mobile-connect-primary,.do-mobile-connect-secondary{width:100%}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function closeModal() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.remove();
    if (qrExpireTimer) {
      window.clearTimeout(qrExpireTimer);
      qrExpireTimer = 0;
    }
  }

  function modalHtml(wallets) {
    var options = wallets.map(function (wallet, index) {
      var label = text(wallet.walletName || wallet.name || "Do-Wallet");
      var address = shortAddress(wallet.address);
      return "<option value=\"" + index + "\">" + escapeHtml(label + (address ? " - " + address : "")) + "</option>";
    }).join("");
    return [
      "<div class=\"do-mobile-connect-card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"do-mobile-connect-title\">",
      "<div class=\"do-mobile-connect-head\">",
      "<div><h2 id=\"do-mobile-connect-title\" class=\"do-mobile-connect-title\">Connect mobile</h2>",
      "<p class=\"do-mobile-connect-sub\">Scan the QR on your phone to open Do-Wallet and import this wallet seed there.</p></div>",
      "<button type=\"button\" class=\"do-mobile-connect-close\" aria-label=\"Close\">&times;</button>",
      "</div>",
      "<div class=\"do-mobile-connect-body\">",
      wallets.length
        ? "<label class=\"do-mobile-connect-label\">Wallet<select class=\"do-mobile-connect-select\" data-role=\"wallet\">" + options + "</select></label>"
        : "<div class=\"do-mobile-connect-error\">No seed-backed wallet was found in this browser. Import or create the wallet from its seed phrase once, then this QR login can be generated.</div>",
      "<label class=\"do-mobile-connect-label\">Wallet password<input class=\"do-mobile-connect-input\" data-role=\"password\" type=\"password\" autocomplete=\"current-password\" placeholder=\"Enter password to reveal QR\"></label>",
      "<div class=\"do-mobile-connect-note\">The QR gives access to the wallet seed. Only display it while both devices are yours. Close the QR after the phone imports the wallet.</div>",
      "<div class=\"do-mobile-connect-actions\">",
      "<button type=\"button\" class=\"do-mobile-connect-primary\" data-role=\"generate\"" + (wallets.length ? "" : " disabled") + ">Show QR</button>",
      "<button type=\"button\" class=\"do-mobile-connect-secondary\" data-role=\"cancel\">Cancel</button>",
      "</div>",
      "<div class=\"do-mobile-connect-result\" data-role=\"result\"></div>",
      "</div>",
      "</div>"
    ].join("");
  }

  function openModal() {
    ensureStyles();
    closeModal();
    var wallets = readRevealWallets();
    var modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "do-mobile-connect-modal";
    modal.innerHTML = modalHtml(wallets);
    document.body.appendChild(modal);

    var password = modal.querySelector("[data-role='password']");
    var result = modal.querySelector("[data-role='result']");
    var generate = modal.querySelector("[data-role='generate']");
    var select = modal.querySelector("[data-role='wallet']");
    var closeButtons = Array.prototype.slice.call(modal.querySelectorAll(".do-mobile-connect-close,[data-role='cancel']"));

    closeButtons.forEach(function (button) {
      button.addEventListener("click", closeModal);
    });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });

    if (password) {
      password.focus();
      password.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && generate && !generate.disabled) generate.click();
      });
    }

    if (generate) {
      generate.addEventListener("click", async function () {
        if (!wallets.length) return;
        setText(result, "");
        var wallet = wallets[Number(select && select.value) || 0] || wallets[0];
        var pass = password ? password.value : "";
        if (!pass) {
          result.innerHTML = "<div class=\"do-mobile-connect-error\">Enter this wallet password first.</div>";
          return;
        }
        if (typeof window.doWalletRevealMasterSeedPhrase !== "function") {
          result.innerHTML = "<div class=\"do-mobile-connect-error\">Seed reveal is still loading. Try again in a moment.</div>";
          return;
        }
        generate.disabled = true;
        generate.textContent = "Preparing...";
        try {
          var revealed = await Promise.resolve(window.doWalletRevealMasterSeedPhrase({
            walletIndex: wallet.walletIndex,
            seedToken: wallet.seedToken,
            name: wallet.name || wallet.walletName,
            password: pass
          }));
          var phrase = text(revealed && revealed.mnemonic);
          if (phrase.split(/\s+/).length < 12) throw new Error("The stored seed phrase could not be read.");
          var link = buildMobileLink(phrase);
          var qr = createQrDataUri(link);
          if (!qr) throw new Error("This seed phrase is too long for the QR payload.");
          result.innerHTML = [
            "<div class=\"do-mobile-connect-qr\">",
            "<img src=\"" + escapeHtml(qr) + "\" alt=\"Connect mobile QR code\">",
            "<div>",
            "<div class=\"do-mobile-connect-note\">Scan with your phone camera. The phone will open Do-Wallet, clear the seed from the address bar, then open seed import.</div>",
            "<div class=\"do-mobile-connect-link\">" + escapeHtml(link) + "</div>",
            "</div>",
            "</div>",
            "<div class=\"do-mobile-connect-actions\">",
            "<button type=\"button\" class=\"do-mobile-connect-secondary\" data-role=\"copy-link\">Copy mobile link</button>",
            "<button type=\"button\" class=\"do-mobile-connect-secondary\" data-role=\"clear-qr\">Clear QR</button>",
            "</div>"
          ].join("");
          var copy = result.querySelector("[data-role='copy-link']");
          var clear = result.querySelector("[data-role='clear-qr']");
          if (copy) {
            copy.addEventListener("click", function () {
              try {
                navigator.clipboard.writeText(link);
                copy.textContent = "Copied";
              } catch (error) {}
            });
          }
          if (clear) clear.addEventListener("click", function () { setText(result, ""); });
          if (qrExpireTimer) window.clearTimeout(qrExpireTimer);
          qrExpireTimer = window.setTimeout(function () {
            if (document.body.contains(result)) {
              result.innerHTML = "<div class=\"do-mobile-connect-note\">QR cleared. Generate a new QR when you are ready to scan again.</div>";
            }
          }, QR_EXPIRES_MS);
        } catch (error) {
          result.innerHTML = "<div class=\"do-mobile-connect-error\">" + escapeHtml(error && error.message || "Unable to prepare mobile QR") + "</div>";
        } finally {
          generate.disabled = false;
          generate.textContent = "Show QR";
        }
      });
    }
  }

  function mainHeader() {
    var layoutHeader = document.querySelector("[class*='Layout_header__']");
    if (layoutHeader && isVisible(layoutHeader)) return layoutHeader;
    var headers = Array.prototype.slice.call(document.querySelectorAll("header")).filter(isVisible).sort(function (a, b) {
      return b.getBoundingClientRect().width - a.getBoundingClientRect().width;
    });
    return headers[0] || null;
  }

  function headerHost() {
    var header = mainHeader();
    if (!header || !header.querySelector) return null;
    return header.querySelector("[class*='Layout_wrapper__']") || header;
  }

  function topRightControls() {
    var header = mainHeader();
    var host = headerHost();
    if (!header || !host) return null;
    var headerRect = header.getBoundingClientRect();
    var rightEdge = headerRect.left + headerRect.width * 0.45;
    var actionGroups = Array.prototype.slice.call(header.querySelectorAll("[class*='Layout_actions__']")).filter(function (node) {
      if (!isVisible(node)) return false;
      if (/do chain|on-chain mfa/i.test(text(node.textContent))) return false;
      return node.getBoundingClientRect().left >= rightEdge;
    });
    if (actionGroups.length) {
      var actions = actionGroups[actionGroups.length - 1];
      var walletButton = Array.prototype.slice.call(actions.querySelectorAll("button,a")).filter(function (node) {
        if (!isVisible(node) || node.id === BUTTON_ID) return false;
        return text(node.textContent).length >= 3;
      }).pop();
      return { host: actions, before: walletButton || null };
    }

    var controls = Array.prototype.slice.call(header.querySelectorAll("button,a")).filter(function (node) {
      if (!isVisible(node) || node.id === BUTTON_ID) return false;
      var label = text(node.textContent);
      if (/^(do chain|on-chain mfa|connect mobile)$/i.test(label)) return false;
      var rect = node.getBoundingClientRect();
      return rect.left >= rightEdge;
    }).sort(function (a, b) {
      return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
    });

    var wallet = controls.filter(function (node) {
      return text(node.textContent).length >= 3;
    }).pop();
    if (wallet && wallet.parentElement) return { host: wallet.parentElement, before: wallet };
    var rightmost = controls[controls.length - 1];
    if (rightmost && rightmost.parentElement) return { host: rightmost.parentElement, before: rightmost };
    return { host: host, before: null };
  }

  function installButton() {
    ensureStyles();
    var target = topRightControls();
    if (!target || !target.host) return;
    var button = document.getElementById(BUTTON_ID) || document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "do-mobile-connect-button";
    button.textContent = "Connect mobile";
    if (!button.__doWalletMobileConnectBound) {
      button.addEventListener("click", openModal);
      button.__doWalletMobileConnectBound = true;
    }
    if (target.before && target.before.parentNode === target.host && target.before !== button) {
      if (button.parentNode === target.host && button.nextSibling === target.before) return;
      target.host.insertBefore(button, target.before);
    } else {
      if (button.parentNode === target.host && button.nextSibling === null) return;
      target.host.appendChild(button);
    }
  }

  function readSeedFromHash() {
    var hash = "";
    try {
      hash = window.location.hash || "";
    } catch (error) {}
    if (hash.indexOf(HASH_PREFIX) !== 0) return "";
    var packed = hash.slice(HASH_PREFIX.length);
    var phrase = unpackMnemonic(decodeURIComponent(packed));
    if (phrase.split(/\s+/).length < 12) return "";
    try {
      window.sessionStorage.setItem(PENDING_SEED_KEY, phrase);
    } catch (error) {}
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (error) {}
    return phrase;
  }

  function setNativeValue(field, value) {
    var proto = field.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) descriptor.set.call(field, value);
    else field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillImportForm(phrase) {
    var words = text(phrase).split(/\s+/).filter(Boolean);
    if (words.length < 12) return false;
    var textareas = Array.prototype.slice.call(document.querySelectorAll("textarea")).filter(isVisible);
    if (textareas.length) {
      setNativeValue(textareas[0], words.join(" "));
      return true;
    }
    var inputs = Array.prototype.slice.call(document.querySelectorAll("input")).filter(function (input) {
      var type = text(input.getAttribute("type") || "text").toLowerCase();
      return isVisible(input) && !input.disabled && !input.readOnly && (type === "text" || type === "search" || type === "");
    });
    if (inputs.length >= words.length) {
      words.forEach(function (word, index) {
        setNativeValue(inputs[index], word);
      });
      return true;
    }
    return false;
  }

  function pendingSeed() {
    try {
      return text(window.sessionStorage.getItem(PENDING_SEED_KEY));
    } catch (error) {
      return "";
    }
  }

  function clearPendingSeed() {
    try {
      window.sessionStorage.removeItem(PENDING_SEED_KEY);
    } catch (error) {}
    var panel = document.querySelector(".do-mobile-import-panel");
    if (panel) panel.remove();
  }

  function renderImportPanel(message) {
    ensureStyles();
    var phrase = pendingSeed();
    if (!phrase) return;
    var existing = document.querySelector(".do-mobile-import-panel");
    if (existing) existing.remove();
    var panel = document.createElement("div");
    panel.className = "do-mobile-import-panel";
    panel.innerHTML = [
      "<strong>Mobile wallet seed ready</strong>",
      "<p>" + escapeHtml(message || "Open the seed import form, complete wallet name/password, then submit.") + "</p>",
      "<div class=\"do-mobile-import-panel__actions\">",
      "<button type=\"button\" class=\"primary\" data-role=\"fill\">Fill import form</button>",
      "<button type=\"button\" data-role=\"copy\">Copy phrase</button>",
      "<button type=\"button\" data-role=\"clear\">Clear</button>",
      "</div>"
    ].join("");
    document.body.appendChild(panel);
    var fill = panel.querySelector("[data-role='fill']");
    var copy = panel.querySelector("[data-role='copy']");
    var clear = panel.querySelector("[data-role='clear']");
    if (fill) {
      fill.addEventListener("click", function () {
        if (window.location.pathname.indexOf("/auth/recover") === -1) {
          window.location.href = "/auth/recover";
          return;
        }
        var ok = fillImportForm(phrase);
        setText(panel.querySelector("p"), ok ? "Seed phrase filled. Complete wallet name/password, then submit." : "The seed is ready, but the import fields are not visible yet.");
      });
    }
    if (copy) {
      copy.addEventListener("click", function () {
        try {
          navigator.clipboard.writeText(phrase);
          copy.textContent = "Copied";
        } catch (error) {}
      });
    }
    if (clear) clear.addEventListener("click", clearPendingSeed);
  }

  function handlePendingMobileSeed() {
    var fresh = readSeedFromHash();
    var phrase = fresh || pendingSeed();
    if (!phrase) return;
    if (window.location.pathname.indexOf("/auth/recover") === -1) {
      renderImportPanel("Seed received. Continue to the import page on this phone.");
      window.setTimeout(function () {
        if (pendingSeed()) window.location.href = "/auth/recover";
      }, 650);
      return;
    }

    var attempts = 0;
    var tryFill = function () {
      attempts += 1;
      if (fillImportForm(phrase)) {
        renderImportPanel("Seed phrase filled. Complete wallet name/password, then submit.");
        return true;
      }
      if (attempts === 1) renderImportPanel("Waiting for the import fields to appear.");
      return false;
    };
    if (tryFill()) return;
    var interval = window.setInterval(function () {
      if (tryFill() || attempts > 40) window.clearInterval(interval);
    }, 250);
  }

  function boot() {
    handlePendingMobileSeed();
    installButton();
  }

  boot();
  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("hashchange", handlePendingMobileSeed);
  var observerFrame = 0;
  var observer = new MutationObserver(function () {
    if (observerFrame) return;
    observerFrame = window.requestAnimationFrame(function () {
      observerFrame = 0;
      installButton();
    });
  });
  try {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () { observer.disconnect(); }, 15000);
  } catch (error) {}
})();
