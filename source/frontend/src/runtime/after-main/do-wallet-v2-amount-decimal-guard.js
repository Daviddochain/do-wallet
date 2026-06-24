(function () {
  "use strict";

  if (window.__doWalletStakingAmountDecimalGuard20260621) return;
  window.__doWalletStakingAmountDecimalGuard20260621 = true;

  var TOKEN_DECIMALS = {
    DO: 6,
    DODX: 6,
    LUNC: 6,
    LUNA: 6,
    DGN: 6,
    SCRT: 6,
    OSMO: 6,
    USTC: 6,
    ATOM: 6,
    AKT: 6,
    JUNO: 6
  };

  var watchedInput = null;
  var watchedAmount = null;
  var watchedSyncAttempts = 0;
  var scheduled = false;

  function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function visible(node) {
    try {
      var rect = node && node.getBoundingClientRect && node.getBoundingClientRect();
      var style = window.getComputedStyle ? window.getComputedStyle(node) : {};
      return Boolean(rect && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden");
    } catch (error) {
      return false;
    }
  }

  function setNativeInputValue(input, value) {
    var own = Object.getOwnPropertyDescriptor(input, "value");
    var proto = Object.getPrototypeOf(input);
    var protoDescriptor = proto && Object.getOwnPropertyDescriptor(proto, "value");
    var setter = protoDescriptor && protoDescriptor.set && (!own || own.set !== protoDescriptor.set)
      ? protoDescriptor.set
      : own && own.set;
    if (setter) setter.call(input, value);
    else input.value = value;
  }

  function dispatchValue(input, value, force) {
    if (!input) return;
    if (!force && input.value === value) return;
    setNativeInputValue(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function normalizeAmount(value) {
    value = text(value).replace(/,/g, "");
    if (!/^\d+(?:\.\d+)?$/.test(value)) return "";
    return value;
  }

  function numberValue(value) {
    var match = text(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    var next = match ? Number(match[0]) : 0;
    return Number.isFinite(next) ? next : 0;
  }

  function digitsOnly(value) {
    return text(value).replace(/\D/g, "");
  }

  function symbolFromText(value) {
    var body = text(value);
    var symbols = Object.keys(TOKEN_DECIMALS).sort(function (a, b) {
      return b.length - a.length;
    });
    for (var i = 0; i < symbols.length; i += 1) {
      if (new RegExp("\\b" + symbols[i] + "\\b", "i").test(body)) return symbols[i];
    }
    return "";
  }

  function decimalFromAtomic(raw, decimals, minimumFractionDigits) {
    raw = digitsOnly(raw).replace(/^0+(?=\d)/, "") || "0";
    decimals = Number(decimals) || 0;
    if (!decimals) return raw;
    if (raw.length <= decimals) raw = "0".repeat(decimals - raw.length + 1) + raw;
    var whole = raw.slice(0, -decimals) || "0";
    var fraction = raw.slice(-decimals);
    var trimmed = fraction.replace(/0+$/, "");
    if (minimumFractionDigits) {
      while (trimmed.length < minimumFractionDigits) trimmed += "0";
    }
    return trimmed ? whole + "." + trimmed : whole;
  }

  function decimalPlaces(value) {
    value = normalizeAmount(value);
    return value.indexOf(".") >= 0 ? value.split(".")[1].length : 0;
  }

  function sameNumber(left, right) {
    left = Number(normalizeAmount(left));
    right = Number(normalizeAmount(right));
    return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.0000005;
  }

  function formatAmount(value) {
    value = Number(value);
    if (!Number.isFinite(value)) value = 0;
    if (Math.abs(value) < 0.0000005) value = 0;
    var formatted = value.toFixed(6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    if (formatted.indexOf(".") < 0) formatted += ".00";
    while (formatted.split(".")[1].length < 2) formatted += "0";
    return formatted;
  }

  function amountFromText(value) {
    var match = text(value).match(/(\d[\d,]*(?:\.\d+)?)\s+([A-Za-z][A-Za-z0-9]{1,11})\b/);
    if (!match) return null;
    var symbol = match[2].toUpperCase();
    if (!TOKEN_DECIMALS[symbol]) return null;
    var display = normalizeAmount(match[1]);
    if (!display || display.indexOf(".") < 0) return null;
    return {
      display: display,
      flattened: digitsOnly(match[1]),
      symbol: symbol
    };
  }

  function inferredAmountFromText(value, symbol) {
    symbol = text(symbol).toUpperCase();
    if (!TOKEN_DECIMALS[symbol]) return null;
    var match = text(value).match(/(\d[\d,]*(?:\.\d+)?)/);
    if (!match) return null;
    var display = normalizeAmount(match[1]);
    if (!display || display.indexOf(".") < 0) return null;
    return {
      display: display,
      flattened: digitsOnly(match[1]),
      symbol: symbol
    };
  }

  function nearestFormRoot(node) {
    var current = node;
    var fallback = null;
    var best = null;
    for (var depth = 0; current && current !== document.body && depth < 16; depth += 1) {
      var body = text(current.textContent);
      var hasAmountAction = /\bAmount\b/i.test(body) && /\b(Delegate|Redelegate|Undelegate|Stake|Unstake|Staking Details|Send|Recipient|Memo)\b/i.test(body);
      if (hasAmountAction && current.querySelector && current.querySelector("input")) {
        fallback = fallback || current;
        if (/\bBalance(?!\s+after)\b/i.test(body) && (/\bFee\b/i.test(body) || /\bBalance after tx\b/i.test(body))) {
          best = current;
        }
      }
      current = current.parentElement;
    }
    if (best) return best;
    if (fallback) return fallback;
    return document;
  }

  function findAmountInput(root, symbol) {
    var inputs = Array.prototype.slice.call((root || document).querySelectorAll("input"));
    return inputs.find(function (input) {
      if (!visible(input)) return false;
      var type = text(input.getAttribute("type")).toLowerCase();
      if (type && type !== "text" && type !== "number" && type !== "search") return false;
      var around = text(((input.closest && input.closest("label,div,section,article,form")) || {}).textContent);
      return /\bAmount\b/i.test(around) || new RegExp("\\b" + symbol + "\\b", "i").test(around);
    }) || inputs.find(visible) || null;
  }

  function symbolForInput(root, input) {
    var around = text(((input && input.closest && input.closest("label,div,section,article,form")) || {}).textContent);
    return symbolFromText(around) || symbolFromText(root && root.textContent) || "";
  }

  function balanceForRoot(root) {
    var body = text(root && root.textContent);
    var match = body.match(/\bBalance(?!\s+after)\b[^0-9-]*(-?\d[\d,]*(?:\.\d+)?)/i);
    return match ? numberValue(match[1]) : 0;
  }

  function feeForRoot(root) {
    var body = text(root && root.textContent);
    var match = body.match(/\bFee\b[^0-9-]*(-?\d[\d,]*(?:\.\d+)?)/i);
    return match ? numberValue(match[1]) : 0;
  }

  function amountDecimalsForRoot(root, symbol) {
    var values = Array.prototype.slice.call((root || document).querySelectorAll("button,span,small,strong,div"))
      .map(function (node) {
        var amount = amountFromText(node.textContent) || inferredAmountFromText(node.textContent, symbol);
        return amount && amount.display && amount.display.indexOf(".") >= 0
          ? amount.display.split(".")[1].length
          : 0;
      })
      .filter(Boolean);
    if (!values.length) return 0;
    return Math.min(6, Math.max.apply(Math, values));
  }

  function atomicDisplayIfImpossible(raw, root, symbol) {
    symbol = text(symbol).toUpperCase();
    var decimals = TOKEN_DECIMALS[symbol];
    if (!decimals || !/^\d+$/.test(raw) || raw.length <= decimals) return "";
    var direct = Number(raw);
    if (!Number.isFinite(direct)) return "";
    var balance = balanceForRoot(root);
    var fee = feeForRoot(root);
    var atomicDisplay = decimalFromAtomic(raw, decimals, amountDecimalsForRoot(root, symbol) >= 2 ? 2 : 0);
    var atomicValue = Number(atomicDisplay);
    if (!Number.isFinite(atomicValue)) return "";
    if (balance > 0 && direct > balance + Math.max(1, fee) && atomicValue <= balance + Math.max(1, fee)) {
      return atomicDisplay;
    }
    var afterMatch = text(root && root.textContent).match(/\bBalance after tx\b[^0-9-]*(-?\d[\d,]*(?:\.\d+)?)/i);
    var after = afterMatch ? Math.abs(numberValue(afterMatch[1])) : 0;
    if (after > 0 && balance > 0 && after > balance * 1000 && atomicValue <= balance + Math.max(1, fee)) {
      return atomicDisplay;
    }
    return "";
  }

  function nearbyAtomicDisplay(raw, root, symbol) {
    var amounts = Array.prototype.slice.call((root || document).querySelectorAll("button,span,small,strong,div"))
      .map(function (node) { return amountFromText(node.textContent) || inferredAmountFromText(node.textContent, symbol); })
      .filter(Boolean);
    var match = amounts.find(function (amount) {
      var decimals = TOKEN_DECIMALS[amount.symbol] || TOKEN_DECIMALS[symbol];
      if (!decimals) return false;
      return sameNumber(decimalFromAtomic(raw, decimals, decimalPlaces(amount.display)), amount.display);
    });
    return match ? match.display : "";
  }

  function amountForInput(input, root, symbol) {
    var raw = normalizeAmount(input && input.value);
    if (!raw) return 0;
    if (/^\d{7,}$/.test(raw)) {
      var converted = nearbyAtomicDisplay(raw, root, symbol) || atomicDisplayIfImpossible(raw, root, symbol);
      if (converted) return numberValue(converted);
    }
    return numberValue(raw);
  }

  function valueNodeForBalanceAfter(root) {
    var nodes = Array.prototype.slice.call((root || document).querySelectorAll("div,span,strong,small,p")).filter(visible);
    for (var i = 0; i < nodes.length; i += 1) {
      var body = text(nodes[i].textContent);
      if (!/\bBalance after tx\b/i.test(body)) continue;
      var row = nodes[i];
      for (var depth = 0; row && row !== root && depth < 4; depth += 1) {
        var rowText = text(row.textContent);
        if (/\bBalance after tx\b/i.test(rowText) && /-?\d[\d,]*(?:\.\d+)?/.test(rowText)) break;
        row = row.parentElement;
      }
      if (!row) continue;
      var values = Array.prototype.slice.call(row.querySelectorAll("span,div,strong,small,p"))
        .filter(visible)
        .filter(function (candidate) {
          var candidateText = text(candidate.textContent);
          return candidate.children.length === 0 &&
            /-?\d[\d,]*(?:\.\d+)?/.test(candidateText) &&
            !/\b(Balance after tx|Balance|Fee|Amount|Password)\b/i.test(candidateText);
        });
      if (values.length) return values[values.length - 1];
    }
    return null;
  }

  function balanceAfterValueForRoot(root) {
    var node = valueNodeForBalanceAfter(root);
    return node ? numberValue(node.textContent) : 0;
  }

  function rememberFromClick(event) {
    var node = event.target;
    var amount = null;
    var clickedText = "";
    for (var depth = 0; node && node !== document.body && depth < 5; depth += 1) {
      clickedText += " " + text(node.textContent);
      amount = amountFromText(node.textContent);
      if (amount) break;
      node = node.parentElement;
    }
    var root = nearestFormRoot(event.target);
    if (!amount) {
      var inferredSymbol = symbolFromText(root.textContent) || symbolFromText(clickedText);
      amount = inferredAmountFromText(clickedText || (event.target && event.target.textContent), inferredSymbol);
    }
    if (!amount) return;
    var input = findAmountInput(root, amount.symbol);
    if (!input) return;
    watchedInput = input;
    watchedAmount = amount;
    watchedSyncAttempts = 0;
    scheduleRepair();
    window.setTimeout(scheduleRepair, 25);
    window.setTimeout(scheduleRepair, 100);
    window.setTimeout(scheduleRepair, 250);
    window.setTimeout(scheduleRepair, 500);
  }

  function repairInputFromWatchedAmount() {
    if (!watchedInput || !watchedAmount || !document.contains(watchedInput)) return;
    var value = text(watchedInput.value);
    if (!value) return;
    if (value === watchedAmount.display) {
      if (watchedSyncAttempts < 3) {
        watchedSyncAttempts += 1;
        dispatchValue(watchedInput, watchedAmount.display, true);
      }
      return;
    }
    if (/^\d+$/.test(value) && value === watchedAmount.flattened) {
      dispatchValue(watchedInput, watchedAmount.display);
    }
  }

  function repairVisibleFlattenedAmounts() {
    var inputs = Array.prototype.slice.call(document.querySelectorAll("input")).filter(visible);
    inputs.forEach(function (input) {
      var raw = text(input.value);
      if (!/^\d{7,}$/.test(raw)) return;
      var root = nearestFormRoot(input);
      var symbol = symbolForInput(root, input);
      var amounts = Array.prototype.slice.call(root.querySelectorAll("button,span,small,strong,div"))
        .map(function (node) { return amountFromText(node.textContent) || inferredAmountFromText(node.textContent, symbol); })
        .filter(Boolean);
      var nearbyAtomicMatch = amounts.find(function (amount) {
        var decimals = TOKEN_DECIMALS[amount.symbol] || TOKEN_DECIMALS[symbol];
        if (!decimals) return false;
        return sameNumber(decimalFromAtomic(raw, decimals, decimalPlaces(amount.display)), amount.display);
      });
      if (nearbyAtomicMatch) {
        dispatchValue(input, nearbyAtomicMatch.display);
        return;
      }
      var impossibleDisplay = atomicDisplayIfImpossible(raw, root, symbol);
      if (impossibleDisplay) {
        dispatchValue(input, impossibleDisplay);
        return;
      }
      var match = amounts.find(function (amount) {
        return amount.flattened === raw || atomicDisplayIfImpossible(raw, root, amount.symbol) === amount.display;
      });
      if (match) dispatchValue(input, match.display);
    });
  }

  function repairBalanceAfterSummaries() {
    var inputs = Array.prototype.slice.call(document.querySelectorAll("input")).filter(visible);
    inputs.forEach(function (input) {
      var root = nearestFormRoot(input);
      if (!/\bBalance after tx\b/i.test(text(root && root.textContent))) return;
      var symbol = symbolForInput(root, input);
      var amount = amountForInput(input, root, symbol);
      var balance = balanceForRoot(root);
      var fee = feeForRoot(root);
      var currentAfter = balanceAfterValueForRoot(root);
      var suspiciousSize = Math.max(1, Math.abs(balance), Math.abs(amount), Math.abs(fee)) * 1000;
      if (!amount || Math.abs(currentAfter) <= suspiciousSize) return;
      var corrected = formatAmount(balance - amount - fee);
      var valueNode = valueNodeForBalanceAfter(root);
      if (!valueNode) return;
      var suffix = /\b([A-Za-z][A-Za-z0-9]{1,11})\b/.test(text(valueNode.textContent)) ? " " + symbol : "";
      var nextText = corrected + suffix;
      if (text(valueNode.textContent) !== nextText) valueNode.textContent = nextText;
    });
  }

  function scheduleRepair() {
    if (scheduled) return;
    scheduled = true;
    var run = function () {
      scheduled = false;
      repairInputFromWatchedAmount();
      repairVisibleFlattenedAmounts();
      repairBalanceAfterSummaries();
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else window.setTimeout(run, 0);
  }

  document.addEventListener("click", rememberFromClick, true);
  document.addEventListener("input", scheduleRepair, true);
  document.addEventListener("change", scheduleRepair, true);
  try {
    var observer = new MutationObserver(scheduleRepair);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
    window.setTimeout(function () {
      observer.disconnect();
    }, 8000);
  } catch (error) {}
  ["popstate", "hashchange", "focus"].forEach(function (eventName) {
    window.addEventListener(eventName, scheduleRepair);
  });
})();
