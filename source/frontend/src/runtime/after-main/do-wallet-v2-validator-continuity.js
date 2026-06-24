(function () {
  "use strict";

  if (window.__doWalletValidatorContinuity20260621BackendCards2) return;
  window.__doWalletValidatorContinuity20260621BackendCards2 = true;
  window.__doWalletValidatorContinuityVersion = "20260621-lunc-unbonding-rows-3";

  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var CHAIN_ID = "columbus-5";
  var LUNC_DENOM = "uluna";
  var LUNC_DECIMALS = 6;
  var LUNC_CHAIN_NAME = "Terra Classic (LUNC)";
  var LUNC_ICON = "/img/chains/TerraClassic.svg";
  var BACKEND_PORTFOLIO_SNAPSHOT_PATH = "/station-assets/api/portfolio/snapshot?v=20260621validatorBackendCards2";
  var BACKEND_TIMEOUT_MS = 10000;
  var APPLY_DEBOUNCE_MS = 250;
  var VALIDATOR_RE = /\bterravaloper1[ac-hj-np-z02-9]{20,90}\b/i;
  var TERRA_RE = /\bterra1[ac-hj-np-z02-9]{20,90}\b/i;
  var KNOWN_VALIDATORS = {
    "classic nodes": "terravaloper1gr6yd5ytvwkqw846hka6pypcgx3c3zkj7s7x30",
    "allnodes": "terravaloper120ppepaj2lh5vreadx42wnjjznh55vvktp78wk",
  };
  var applyTimer = 0;
  var validatorsPromise = null;
  var directDataPromise = null;
  var directDataKey = "";
  var backendDataPromise = null;
  var backendDataKey = "";

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function fetchJSON(path) {
    return window.fetch(path, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function lcdURL(path) {
    return "/station-assets/api/lcd/" + encodeURIComponent(CHAIN_ID) + path;
  }

  function decimalString(raw, decimals) {
    var value = clean(raw).replace(/,/g, "");
    var negative = value.charAt(0) === "-";
    if (negative) value = value.slice(1);
    if (/^\d+\.\d+$/.test(value)) value = value.split(".")[0];
    if (!/^\d+$/.test(value)) {
      var numeric = Number(value);
      value = Number.isFinite(numeric) && numeric > 0 ? String(Math.floor(numeric)) : "0";
    }
    decimals = Math.max(0, Number(decimals) || 0);
    if (decimals <= 0) return (negative ? "-" : "") + value;
    if (value.length <= decimals) value = "0".repeat(decimals - value.length + 1) + value;
    var whole = value.slice(0, -decimals) || "0";
    var fraction = value.slice(-decimals).replace(/0+$/, "");
    return (negative ? "-" : "") + (fraction ? whole + "." + fraction : whole);
  }

  function amountFromCoin(coin) {
    if (!coin || lower(coin.denom) !== LUNC_DENOM) return 0;
    return Number(decimalString(coin.amount, LUNC_DECIMALS)) || 0;
  }

  function amountFromCoins(coins) {
    return (Array.isArray(coins) ? coins : []).reduce(function (sum, coin) {
      return sum + amountFromCoin(coin);
    }, 0);
  }

  function formatAmount(value) {
    var number = Number(value) || 0;
    var digits = number >= 1 || number <= 0 ? 2 : 6;
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    });
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[char];
    });
  }

  function allSnapshots() {
    var out = [];
    var seen = {};
    function add(snapshot) {
      if (!snapshot || typeof snapshot !== "object") return;
      var key = String(snapshot.updatedAt || "") + ":" + clean(snapshot.walletKey || snapshot.source || "");
      if (seen[key]) return;
      seen[key] = true;
      out.push(snapshot);
    }
    add(readJSON(SNAPSHOT_KEY, null));
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (byWallet && typeof byWallet === "object") {
      Object.keys(byWallet).forEach(function (key) {
        add(byWallet[key]);
      });
    }
    return out;
  }

  function terraAddressFromValue(value) {
    var match = clean(value).match(TERRA_RE);
    return match ? match[0] : "";
  }

  function terraAddressFromSource(source) {
    var address = "";
    if (!source) return "";
    if (typeof source === "string") return terraAddressFromValue(source);
    if (Array.isArray(source)) {
      for (var index = 0; index < source.length; index += 1) {
        var entry = source[index] || {};
        var chainID = lower(entry.chainID || entry.chainId || entry.network || entry.chain || "");
        if (chainID && chainID !== CHAIN_ID && chainID !== "terra-classic" && chainID !== "lunc") continue;
        address = terraAddressFromValue(entry.address || entry.walletAddress || entry.value || entry);
        if (address) return address;
      }
      return "";
    }
    if (typeof source === "object") {
      address = terraAddressFromValue(source[CHAIN_ID] || source["terra-classic"] || source.lunc || source.terra);
      if (address) return address;
      var keys = Object.keys(source);
      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        address = terraAddressFromValue(source[keys[keyIndex]]);
        if (address) return address;
      }
    }
    return "";
  }

  function addTerraAddress(out, seen, value) {
    var address = terraAddressFromValue(value);
    if (!address) return;
    var key = lower(address);
    if (seen[key]) return;
    seen[key] = true;
    out.push(address);
  }

  function addTerraAddressesFromSource(out, seen, source) {
    if (!source) return;
    if (typeof source === "string") {
      addTerraAddress(out, seen, source);
      return;
    }
    if (Array.isArray(source)) {
      source.forEach(function (entry) {
        if (!entry || typeof entry !== "object") {
          addTerraAddress(out, seen, entry);
          return;
        }
        var chainID = lower(entry.chainID || entry.chainId || entry.network || entry.chain || "");
        if (chainID && chainID !== CHAIN_ID && chainID !== "terra-classic" && chainID !== "lunc") return;
        addTerraAddress(out, seen, entry.address || entry.walletAddress || entry.value || entry);
      });
      return;
    }
    if (typeof source === "object") {
      addTerraAddress(out, seen, source[CHAIN_ID] || source["terra-classic"] || source.lunc || source.terra);
      Object.keys(source).forEach(function (key) {
        addTerraAddress(out, seen, source[key]);
      });
    }
  }

  function snapshotChainAddresses() {
    var out = [];
    var seen = {};
    allSnapshots().forEach(function (snapshot) {
      var sources = [
        snapshot && snapshot.activeAddresses,
        snapshot && snapshot.addresses,
        snapshot && snapshot.addressMap,
        snapshot && snapshot.allAddresses,
      ];
      sources.forEach(function (source) {
        addTerraAddressesFromSource(out, seen, source);
      });
    });
    return out;
  }

  function snapshotChainAddress() {
    return snapshotChainAddresses()[0] || "";
  }

  function storageTerraAddresses() {
    var out = [];
    var seen = {};
    try {
      for (var index = 0; index < window.localStorage.length; index += 1) {
        var key = window.localStorage.key(index);
        addTerraAddress(out, seen, key);
        addTerraAddress(out, seen, window.localStorage.getItem(key));
      }
    } catch (error) {}
    return out;
  }

  function storageTerraAddress() {
    return storageTerraAddresses()[0] || "";
  }

  function allCandidateTerraAddresses() {
    var out = [];
    var seen = {};
    snapshotChainAddresses().concat(storageTerraAddresses()).forEach(function (address) {
      addTerraAddress(out, seen, address);
    });
    return out.sort(function (left, right) {
      var leftWalletLike = clean(left).length <= 48 ? 0 : 1;
      var rightWalletLike = clean(right).length <= 48 ? 0 : 1;
      return leftWalletLike - rightWalletLike || clean(left).length - clean(right).length;
    }).slice(0, 24);
  }

  function validatorAddressFromRow(row) {
    return clean(row && (
      row.validatorAddress ||
      row.validator_address ||
      row.operatorAddress ||
      row.operator_address ||
      row.validator ||
      row.delegation && row.delegation.validator_address
    ));
  }

  function denomFromRow(row) {
    return lower(row && (
      row.denom ||
      row.token ||
      row.balance && row.balance.denom ||
      row.amount && row.amount.denom
    ));
  }

  function numericAmount(value) {
    var number = Number(String(value == null ? "" : value).replace(/,/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function amountFromRow(row) {
    if (!row) return 0;
    var direct = numericAmount(row.amount);
    if (direct > 0) return direct;
    direct = numericAmount(row.quantity);
    if (direct > 0) return direct;
    direct = numericAmount(row.amountValue);
    if (direct > 0) return direct;
    direct = numericAmount(row.balance);
    if (direct > 0) return direct;
    if (row.balance && typeof row.balance === "object") {
      direct = amountFromCoin(row.balance);
      if (direct > 0) return direct;
    }
    if (row.amount && typeof row.amount === "object") {
      direct = amountFromCoin(row.amount);
      if (direct > 0) return direct;
    }
    if (row.rawAmount) {
      direct = Number(decimalString(row.rawAmount, row.decimals || LUNC_DECIMALS)) || 0;
      if (direct > 0) return direct;
    }
    return 0;
  }

  function rowsFromMap(map) {
    var rows = [];
    if (!map || typeof map !== "object") return rows;
    Object.keys(map).forEach(function (key) {
      var value = map[key];
      if (value && Array.isArray(value.rows)) rows = rows.concat(value.rows);
      else if (value && typeof value === "object") rows.push(value);
    });
    return rows;
  }

  function assetRows(snapshot) {
    var rows = [];
    ["staking", "portfolioAssets", "assets", "spendableAssets"].forEach(function (key) {
      if (Array.isArray(snapshot && snapshot[key])) rows = rows.concat(snapshot[key]);
    });
    return rows;
  }

  function scopedRows(kind, snapshots) {
    var rows = [];
    (snapshots || allSnapshots()).forEach(function (snapshot) {
      assetRows(snapshot).forEach(function (asset) {
        if (!asset || lower(asset.chainID || asset.chainId || asset.network) !== CHAIN_ID) return;
        if (kind === "delegation") {
          rows = rows.concat(asset.validatorDelegations || []);
          rows = rows.concat(rowsFromMap(asset.validatorDelegationsByAddress));
          if (asset.validatorBreakdown) {
            rows = rows.concat(asset.validatorBreakdown.delegations || []);
            rows = rows.concat(rowsFromMap(asset.validatorBreakdown.delegationsByAddress));
          }
        } else if (kind === "reward") {
          rows = rows.concat(asset.validatorRewards || []);
          rows = rows.concat(rowsFromMap(asset.validatorRewardsByAddress));
          if (asset.validatorBreakdown) {
            rows = rows.concat(asset.validatorBreakdown.rewards || []);
            rows = rows.concat(rowsFromMap(asset.validatorBreakdown.rewardsByAddress));
          }
        } else if (kind === "unbonding") {
          rows = rows.concat(asset.validatorUnbondings || []);
          rows = rows.concat(rowsFromMap(asset.validatorUnbondingsByAddress));
          if (asset.validatorBreakdown) {
            rows = rows.concat(asset.validatorBreakdown.unbondings || []);
            rows = rows.concat(rowsFromMap(asset.validatorBreakdown.unbondingsByAddress));
          }
        }
      });
    });
    return rows;
  }

  function amountFromScopedRows(kind, validatorAddress, snapshots) {
    var validator = lower(validatorAddress);
    if (!validator) return null;
    var matched = scopedRows(kind, snapshots).filter(function (row) {
      var denom = denomFromRow(row);
      return lower(validatorAddressFromRow(row)) === validator &&
        (denom === LUNC_DENOM || (!denom && lower(row && row.symbol) === "lunc"));
    });
    if (!matched.length) return null;
    return matched.reduce(function (sum, row) {
      return sum + amountFromRow(row);
    }, 0);
  }

  function validatorAddressFromPage() {
    var text = [
      window.location.href,
      document.body ? document.body.innerText : "",
    ].join(" ");
    var match = text.match(VALIDATOR_RE);
    return match ? match[0] : "";
  }

  function normalizeMoniker(value) {
    return lower(value)
      .replace(/\b(active|inactive|jailed|commission|validator details|my delegations|my rewards)\b/g, " ")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function monikerCandidate(value) {
    var raw = clean(value)
      .replace(/\b(active|inactive|jailed)\b/ig, " ")
      .replace(/\s+/g, " ")
      .trim();
    var normalized = normalizeMoniker(raw);
    if (!raw || !normalized || raw.length > 80 || /https?:\/\//i.test(raw)) return "";
    if (/\d/.test(raw) && !/[a-z]/i.test(raw)) return "";
    if (/^(validator details|my delegations|my rewards|commission|current|current commission|max|max commission|max daily change|last changed|addresses|operator address|account address|delegate|redelegate|undelegate|withdraw rewards)$/i.test(raw)) return "";
    if (/\b(current|max|daily change|last changed|address|delegation|delegations|reward|rewards|commission|balance|validator details)\b/i.test(normalized)) return "";
    return normalized;
  }

  function selectedMonikerFromProfileCard() {
    var cards = Array.prototype.slice.call(document.querySelectorAll("section,article,aside,div"))
      .filter(function (node) {
        if (!isVisible(node)) return false;
        var body = clean(node.innerText || node.textContent);
        return /\bCurrent Commission\b/i.test(body) &&
          /\bMax Commission\b/i.test(body) &&
          !/\bMy delegations\b/i.test(body) &&
          !/\bMy rewards\b/i.test(body);
      })
      .sort(function (a, b) {
        var ar = a.getBoundingClientRect();
        var br = b.getBoundingClientRect();
        return (ar.width * ar.height) - (br.width * br.height);
      });
    for (var c = 0; c < cards.length; c += 1) {
      var nodes = Array.prototype.slice.call(cards[c].querySelectorAll("h1,h2,h3,h4,strong,b,a,span,div"));
      for (var i = 0; i < nodes.length; i += 1) {
        var text = clean(nodes[i].innerText || nodes[i].textContent);
        var candidate = monikerCandidate(text);
        if (candidate) return candidate;
      }
      var body = clean(cards[c].innerText || cards[c].textContent);
      var beforeStatus = body.match(/^(.+?)\b(?:Active|Inactive|Jailed)\b/i);
      var statusCandidate = beforeStatus && monikerCandidate(beforeStatus[1]);
      if (statusCandidate) return statusCandidate;
    }
    return "";
  }

  function selectedMoniker() {
    var profileMoniker = selectedMonikerFromProfileCard();
    if (profileMoniker) return profileMoniker;
    var nodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,strong,b"));
    for (var i = 0; i < nodes.length; i += 1) {
      var text = clean(nodes[i].innerText || nodes[i].textContent);
      var normalized = monikerCandidate(text);
      if (normalized) return normalized;
    }
    var pageText = lower(document.body ? document.body.innerText : "");
    var knownNames = Object.keys(KNOWN_VALIDATORS);
    for (var knownIndex = 0; knownIndex < knownNames.length; knownIndex += 1) {
      if (pageText.indexOf(knownNames[knownIndex]) >= 0) return knownNames[knownIndex];
    }
    return "";
  }

  function fetchValidators() {
    if (validatorsPromise) return validatorsPromise;
    validatorsPromise = fetchJSON(lcdURL("/cosmos/staking/v1beta1/validators?pagination.limit=500")).then(function (json) {
      return Array.isArray(json && json.validators) ? json.validators : [];
    }, function () {
      return [];
    });
    return validatorsPromise;
  }

  function validatorAddressByMoniker(moniker) {
    moniker = normalizeMoniker(moniker);
    if (!moniker) return Promise.resolve("");
    if (KNOWN_VALIDATORS[moniker]) return Promise.resolve(KNOWN_VALIDATORS[moniker]);
    return fetchValidators().then(function (validators) {
      var partial = "";
      for (var i = 0; i < validators.length; i += 1) {
        var validator = validators[i] || {};
        var name = normalizeMoniker(validator.description && validator.description.moniker);
        var address = clean(validator.operator_address);
        if (!name || !address) continue;
        if (name === moniker) return address;
        if (!partial && (name.indexOf(moniker) >= 0 || moniker.indexOf(name) >= 0)) partial = address;
      }
      return partial;
    });
  }

  function directValidatorData(delegator, validator) {
    delegator = clean(delegator);
    validator = clean(validator);
    if (!delegator || !validator) return Promise.resolve({ delegation: null, reward: null });
    var key = delegator + "|" + validator;
    if (directDataPromise && directDataKey === key) return directDataPromise;
    directDataKey = key;
    directDataPromise = Promise.all([
      fetchJSON(lcdURL("/cosmos/staking/v1beta1/delegations/" + encodeURIComponent(delegator) + "?pagination.limit=2000")).then(function (json) {
        var target = lower(validator);
        var rows = Array.isArray(json && json.delegation_responses) ? json.delegation_responses : [];
        for (var index = 0; index < rows.length; index += 1) {
          var row = rows[index] || {};
          if (lower(row.delegation && row.delegation.validator_address) === target) {
            return amountFromCoin(row.balance);
          }
        }
        return 0;
      }, function () {
        return null;
      }),
      fetchJSON(lcdURL("/cosmos/distribution/v1beta1/delegators/" + encodeURIComponent(delegator) + "/rewards")).then(function (json) {
        var target = lower(validator);
        var rows = Array.isArray(json && json.rewards) ? json.rewards : [];
        for (var index = 0; index < rows.length; index += 1) {
          var row = rows[index] || {};
          if (lower(row.validator_address) === target) {
            return amountFromCoins(row.reward || row.rewards || []);
          }
        }
        return 0;
      }, function () {
        return null;
      }),
    ]).then(function (values) {
      return { delegation: values[0], reward: values[1] };
    });
    return directDataPromise;
  }

  function postJSONTimed(url, payload, timeoutMs) {
    if (!window.fetch) return Promise.reject(new Error("fetch unavailable"));
    var controller = window.AbortController ? new AbortController() : null;
    var timer = 0;
    if (controller) {
      timer = window.setTimeout(function () {
        controller.abort();
      }, timeoutMs);
    }
    return window.fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined,
    }).then(function (response) {
      if (timer) window.clearTimeout(timer);
      if (!response.ok) throw new Error("snapshot status " + response.status);
      return response.json();
    }, function (error) {
      if (timer) window.clearTimeout(timer);
      throw error;
    });
  }

  function backendSnapshotPayload(address) {
    var map = {};
    map[CHAIN_ID] = address;
    var wallet = {
      name: "Do-Wallet",
      address: address,
      addresses: map,
      addressMap: map,
    };
    return {
      version: "20260621validatorBackendCards1",
      wallet: wallet,
      wallets: [wallet],
      addressMap: map,
    };
  }

  function backendValidatorData(delegator, validator) {
    delegator = clean(delegator);
    validator = clean(validator);
    if (!delegator || !validator) return Promise.resolve({ delegation: null, reward: null });
    var key = delegator + "|" + validator;
    if (backendDataPromise && backendDataKey === key) return backendDataPromise;
    backendDataKey = key;
    backendDataPromise = postJSONTimed(
      BACKEND_PORTFOLIO_SNAPSHOT_PATH,
      backendSnapshotPayload(delegator),
      BACKEND_TIMEOUT_MS
    ).then(function (response) {
      var snapshot = response && (response.snapshot || response);
      return {
        delegation: amountFromScopedRows("delegation", validator, [snapshot]),
        reward: amountFromScopedRows("reward", validator, [snapshot]),
      };
    }, function () {
      return { delegation: null, reward: null };
    });
    return backendDataPromise;
  }

  function betterValidatorValues(current, next) {
    current = current || { delegation: null, reward: null };
    next = next || { delegation: null, reward: null };
    var hasNextDelegation = next.delegation != null;
    var hasNextReward = next.reward != null;
    return {
      delegation: next.delegation > 0 || (current.delegation == null && hasNextDelegation) ? next.delegation : current.delegation,
      reward: next.reward > 0 || (current.reward == null && hasNextReward) ? next.reward : current.reward,
    };
  }

  function firstPositiveValidatorData(addresses, validator, fetcher) {
    addresses = (Array.isArray(addresses) ? addresses : []).filter(Boolean);
    var index = 0;
    var best = { delegation: null, reward: null };
    function next() {
      if (index >= addresses.length) return Promise.resolve(best);
      var address = addresses[index];
      index += 1;
      return fetcher(address, validator).then(function (values) {
        best = betterValidatorValues(best, values);
        if (best.delegation > 0 || best.reward > 0) return best;
        return next();
      }, next);
    }
    return next();
  }

  function isVisible(element) {
    if (!element || element === document.body || element === document.documentElement) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 40 && rect.height > 30;
  }

  function findCard(label) {
    var needle = lower(label);
    var labelNodes = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,h5,strong,b,span,div"));
    for (var labelIndex = 0; labelIndex < labelNodes.length; labelIndex += 1) {
      var labelNode = labelNodes[labelIndex];
      if (!isVisible(labelNode) || lower(labelNode.innerText || labelNode.textContent) !== needle) continue;
      var parent = labelNode.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        if (isVisible(parent)) {
          var parentText = clean(parent.innerText || parent.textContent);
          var rect = parent.getBoundingClientRect();
          if (
            lower(parentText).indexOf(needle) >= 0 &&
            /\bLUNC\b|\bDelegate\b|\bRedelegate\b|\bUndelegate\b|\bWithdraw rewards\b/i.test(parentText) &&
            rect.width >= 220 &&
            rect.height >= 120 &&
            rect.height <= 520
          ) {
            return parent;
          }
        }
        parent = parent.parentElement;
      }
    }
    var nodes = Array.prototype.slice.call(document.querySelectorAll("section,article,aside,div"));
    return nodes.filter(function (node) {
      return isVisible(node) && lower(node.innerText || node.textContent).indexOf(needle) >= 0;
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    })[0] || null;
  }

  function hasLuncPortfolioEvidence() {
    if (/\bTerra Classic \(LUNC\)\b/i.test(document.body ? document.body.innerText : "")) return true;
    return allSnapshots().some(function (snapshot) {
      return assetRows(snapshot).some(function (asset) {
        return lower(asset && (asset.chainID || asset.chainId || asset.network)) === CHAIN_ID &&
          lower(asset && asset.denom) === LUNC_DENOM &&
          (Number(asset.amount || asset.quantity || asset.balance || asset.value || asset.valueUsd || 0) || 0) > 0;
      });
    });
  }

  function visibleLuncValidatorNames() {
    var card = findCard("Validators staked with");
    if (!card) return [];
    var names = [];
    Array.prototype.slice.call(card.querySelectorAll("tr,li,div")).forEach(function (row) {
      if (!isVisible(row)) return;
      var body = clean(row.innerText || row.textContent);
      if (!/\bTerra Classic \(LUNC\)\b/i.test(body) || !/\bLUNC\b/i.test(body)) return;
      var name = clean(body.split(/Terra Classic \(LUNC\)/i)[0])
        .replace(/\b(Validator|Chain|Staked|Value)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (name && name.length <= 80 && names.indexOf(name) < 0) names.push(name);
    });
    return names;
  }

  function luncUnbondingValidators() {
    var seen = {};
    scopedRows("unbonding").forEach(function (row) {
      var denom = denomFromRow(row);
      var address = lower(validatorAddressFromRow(row));
      if (!address) return;
      if (denom && denom !== LUNC_DENOM && lower(row && row.symbol) !== "lunc") return;
      if (amountFromRow(row) <= 0) return;
      seen[address] = true;
    });
    return Object.keys(seen);
  }

  function rowMentionsValidator(body, validator) {
    var text = lower(body);
    var address = lower(validator);
    if (!text || !address) return false;
    return text.indexOf(address) >= 0 ||
      text.indexOf(address.slice(0, 12)) >= 0 ||
      text.indexOf(address.slice(-8)) >= 0;
  }

  function replaceLunaTextWithLunc(root) {
    var changed = false;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var before = node.nodeValue;
      var after = before
        .replace(/\bTerra\s*\(LUNA\)/g, LUNC_CHAIN_NAME)
        .replace(/\bLUNA\b/g, "LUNC");
      if (after !== before) {
        node.nodeValue = after;
        changed = true;
      }
    }
    Array.prototype.slice.call(root.querySelectorAll("img")).forEach(function (img) {
      var haystack = clean([img.getAttribute("src"), img.getAttribute("alt"), img.getAttribute("title")].join(" "));
      if (!/terra/i.test(haystack) || /classic|lunc/i.test(haystack)) return;
      img.setAttribute("src", LUNC_ICON);
      img.setAttribute("alt", LUNC_CHAIN_NAME);
      img.setAttribute("title", LUNC_CHAIN_NAME);
      changed = true;
    });
    Array.prototype.slice.call(root.querySelectorAll("[style]")).forEach(function (node) {
      var style = node.getAttribute("style") || "";
      if (!/Terra\.(svg|png|jpg|jpeg)/i.test(style) || /TerraClassic/i.test(style)) return;
      node.setAttribute("style", style.replace(/[^"'()]*Terra\.(svg|png|jpg|jpeg)/ig, LUNC_ICON));
      changed = true;
    });
    return changed;
  }

  function patchLuncUnbondingRows() {
    if (!document.body || !/\bUnbonding\b/i.test(document.body.innerText || "")) return;
    if (!hasLuncPortfolioEvidence()) return;
    var luncValidatorNames = visibleLuncValidatorNames();
    var unbondingValidators = luncUnbondingValidators();
    var sections = Array.prototype.slice.call(document.querySelectorAll("section,article,aside,div")).filter(function (node) {
      if (!isVisible(node)) return false;
      var body = clean(node.innerText || node.textContent);
      return /\bUnbonding\b/i.test(body) && /\bAssets currently leaving staking\b/i.test(body);
    });
    sections.forEach(function (section) {
      Array.prototype.slice.call(section.querySelectorAll("tr,li,div")).forEach(function (row) {
        if (!isVisible(row)) return;
        var body = clean(row.innerText || row.textContent);
        if (!(/\bTerra\s*\(LUNA\)\b/i.test(body) || /\b\d[\d,.]*(?:\.\d+)?\s+LUNA\b/i.test(body))) return;
        var matchesNamedValidator = luncValidatorNames.some(function (name) { return body.indexOf(name) >= 0; });
        var matchesSnapshotValidator = unbondingValidators.some(function (validator) { return rowMentionsValidator(body, validator); });
        var looksLikeLuncUnbondingAddressRow = /\bterravaloper/i.test(body) && !/\bTerra Classic \(LUNC\)\b/i.test(body);
        if (luncValidatorNames.length && !matchesNamedValidator && !matchesSnapshotValidator && !looksLikeLuncUnbondingAddressRow) return;
        replaceLunaTextWithLunc(row);
      });
    });
  }

  function setContinuityLine(card, label, amount, symbol) {
    var line = card.querySelector("[data-dochain-validator-continuity='" + label + "']");
    if (!line) {
      line = document.createElement("div");
      line.setAttribute("data-dochain-validator-continuity", label);
      line.style.marginTop = "10px";
      line.style.fontSize = "26px";
      line.style.fontWeight = "700";
      line.style.lineHeight = "1.15";
      card.appendChild(line);
    }
    line.textContent = formatAmount(amount) + " " + symbol;
  }

  function replaceAmountInCard(card, label, amount, symbol) {
    if (!card) return;
    var amountText = formatAmount(amount);
    var changed = false;
    var seenLabel = false;
    var nodes = [];
    var walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    var firstAmountNode = null;
    for (var index = 0; index < nodes.length; index += 1) {
      node = nodes[index];
      var text = clean(node.nodeValue);
      if (!text) continue;
      if (lower(text).indexOf(lower(label)) >= 0) {
        seenLabel = true;
        continue;
      }
      if (!seenLabel && lower(card.innerText || card.textContent).indexOf(lower(label)) >= 0) seenLabel = true;
      if (!seenLabel) continue;
      if (!firstAmountNode && /^\s*[\d,.]+(?:\.\d+)?\s*$/.test(node.nodeValue)) {
        firstAmountNode = node;
      }
      if (firstAmountNode && /\bLUNC\b/i.test(text)) {
        firstAmountNode.nodeValue = amountText;
        for (var clearIndex = nodes.indexOf(firstAmountNode) + 1; clearIndex < index; clearIndex += 1) {
          if (/^\s*(?:[.,]\d+|\d+(?:[.,]\d+)?)\s*$/.test(nodes[clearIndex].nodeValue || "")) {
            nodes[clearIndex].nodeValue = "";
          }
        }
        changed = true;
        break;
      }
      if (/\bLUNC\b/i.test(text) && /(?:^|\s)[\d,.]+(?:\.\d+)?\s*LUNC\b/i.test(text)) {
        node.nodeValue = node.nodeValue.replace(/[\d,.]+(?:\.\d+)?\s*LUNC/i, amountText + " " + symbol);
        changed = true;
        break;
      }
      if (/^\s*[\d,.]+(?:\.\d+)?\s*$/.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(/[\d,.]+(?:\.\d+)?/, amountText);
        changed = true;
        break;
      }
    }
    if (!changed) setContinuityLine(card, label, amount, symbol);
  }

  function enableButtons(card, amount, labels) {
    if (!card || !(amount > 0)) return;
    Array.prototype.slice.call(card.querySelectorAll("button")).forEach(function (button) {
      var text = lower(button.innerText || button.textContent);
      if (!labels.some(function (label) { return text.indexOf(lower(label)) >= 0; })) return;
      button.disabled = false;
      button.removeAttribute("disabled");
      button.removeAttribute("aria-disabled");
      button.style.opacity = "";
      button.style.pointerEvents = "";
    });
  }

  function installLiveCardStyle() {
    var style = document.getElementById("dochain-validator-continuity-style");
    if (style && style.parentElement) style.parentElement.removeChild(style);
  }

  function removeLiveCardAmount(card) {
    if (!card) return;
    card.classList.remove("dochain-validator-continuity-card");
    Array.prototype.slice.call(card.querySelectorAll("[data-dochain-validator-continuity-value]")).forEach(function (line) {
      if (line.parentElement) line.parentElement.removeChild(line);
    });
  }

  function setLiveCardAmount(card, kind, amount, symbol) {
    if (!card) return;
    installLiveCardStyle();
    removeLiveCardAmount(card);
  }

  function patchCards(values) {
    var delegationCard = findCard("My delegations");
    var rewardCard = findCard("My rewards");
    if (values.delegation != null) {
      replaceAmountInCard(delegationCard, "My delegations", values.delegation, "LUNC");
      setLiveCardAmount(delegationCard, "delegation", values.delegation, "LUNC");
      enableButtons(delegationCard, values.delegation, ["Redelegate", "Undelegate"]);
    }
    if (values.reward != null) {
      replaceAmountInCard(rewardCard, "My rewards", values.reward, "LUNC");
      setLiveCardAmount(rewardCard, "reward", values.reward, "LUNC");
      enableButtons(rewardCard, values.reward, ["Withdraw rewards"]);
    }
  }

  function resolveAndApply() {
    if (!document.body) return;
    patchLuncUnbondingRows();
    var pageText = document.body.innerText || "";
    if (!/\bValidator details\b/i.test(pageText) || !/\bMy delegations\b/i.test(pageText)) return;

    var candidateDelegators = allCandidateTerraAddresses();
    var delegator = candidateDelegators[0] || snapshotChainAddress() || storageTerraAddress();
    var validator = validatorAddressFromPage();
    var moniker = selectedMoniker();

    Promise.resolve(validator || validatorAddressByMoniker(moniker)).then(function (resolvedValidator) {
      resolvedValidator = clean(resolvedValidator);
      var snapshotDelegation = amountFromScopedRows("delegation", resolvedValidator);
      var snapshotReward = amountFromScopedRows("reward", resolvedValidator);
      var initialValues = {
        delegation: snapshotDelegation,
        reward: snapshotReward,
      };
      if (snapshotDelegation != null || snapshotReward != null) patchCards(initialValues);
      if (!delegator || !resolvedValidator) return null;
      return firstPositiveValidatorData(candidateDelegators.length ? candidateDelegators : [delegator], resolvedValidator, backendValidatorData).then(function (backend) {
        var backendValues = {
          delegation: backend.delegation > 0 || snapshotDelegation == null ? backend.delegation : snapshotDelegation,
          reward: backend.reward > 0 || snapshotReward == null ? backend.reward : snapshotReward,
        };
        if (backendValues.delegation != null || backendValues.reward != null) patchCards(backendValues);
        return firstPositiveValidatorData(candidateDelegators.length ? candidateDelegators : [delegator], resolvedValidator, directValidatorData).then(function (direct) {
          var directValues = {};
          if (direct.delegation > 0) directValues.delegation = direct.delegation;
          if (direct.reward > 0) directValues.reward = direct.reward;
          if (directValues.delegation != null || directValues.reward != null) patchCards(directValues);
        });
      });
    }).catch(function () {});
  }

  function scheduleApply() {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(resolveAndApply, APPLY_DEBOUNCE_MS);
  }

  window.addEventListener("DOMContentLoaded", scheduleApply);
  window.addEventListener("load", scheduleApply);
  window.addEventListener("popstate", scheduleApply);
  window.addEventListener("hashchange", scheduleApply);
  window.addEventListener("do_wallet_portfolio_snapshot", scheduleApply);
  window.addEventListener("storage", function (event) {
    if (event && (event.key === SNAPSHOT_KEY || event.key === SNAPSHOTS_BY_WALLET_KEY)) scheduleApply();
  });
  var observer = null;
  function installTransientObserver() {
    if (observer || !window.MutationObserver || !document.body) return;
    observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.setTimeout(function () {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 8000);
  }
  if (document.body) {
    installTransientObserver();
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      installTransientObserver();
    });
  }
  scheduleApply();
  window.setTimeout(scheduleApply, 1000);
  window.setTimeout(scheduleApply, 2500);
})();
