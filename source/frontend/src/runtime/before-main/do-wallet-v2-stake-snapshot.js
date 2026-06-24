(function () {
  "use strict";

  if (window.__doWalletStakeSnapshot20260624Compact1) return;
  window.__doWalletStakeSnapshot20260624Compact1 = true;

  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var SNAPSHOT_SCHEMA_VERSION = "20260621luncUnbonding1";
  var BACKEND_PORTFOLIO_SNAPSHOT_PATH = "/station-assets/api/portfolio/snapshot?v=" + SNAPSHOT_SCHEMA_VERSION;
  var BACKEND_STAKE_TIMEOUT_MS = 10000;
  var BACKEND_STAKE_REFRESH_MS = 45 * 1000;
  var LUNC_CHAIN_ID = "columbus-5";
  var LUNC_DENOM = "uluna";
  var LUNC_DECIMALS = 6;
  var TERRA_RE = /\bterra1[ac-hj-np-z02-9]{20,90}\b/i;
  var PANEL_SELECTOR = '[data-do-wallet-stake-snapshot="live"]';
  var HOST_SELECTOR = '[data-do-wallet-stake-snapshot-host="live"]';
  var OLD_HIDDEN_SELECTOR = "[data-do-wallet-old-stake-hidden]";
  var DO_CHAIN_ICON = "/do-logo.jpg";
  var RENDER_DEBOUNCE_MS = 1000;
  var MIN_RENDER_INTERVAL_MS = 2000;
  var MUTATION_SUPPRESS_MS = 1400;
  var lastSignature = "";
  var renderTimer = 0;
  var observer = null;
  var lastStakePageSeenAt = 0;
  var STAKE_PAGE_STICKY_MS = 90 * 1000;
  var lastStakeSurface = null;
  var lastRenderStartedAt = 0;
  var suppressMutationsUntil = 0;
  var backendStakeRows = [];
  var backendStakeFetchedAt = 0;
  var backendStakePromise = null;
  var backendStakeAddress = "";

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function readJSON(key, fallback) {
    try {
      var value = window.localStorage && window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function walletFromPayload(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload.wallet && typeof payload.wallet === "object" ? payload.wallet : payload;
  }

  function walletIdentityKeys(wallet) {
    wallet = walletFromPayload(wallet);
    if (!wallet || typeof wallet !== "object") return [];
    var addresses = wallet.addresses && typeof wallet.addresses === "object" ? wallet.addresses : {};
    var addressMap = wallet.addressMap && typeof wallet.addressMap === "object" ? wallet.addressMap : {};
    var keys = [
      wallet.address,
      wallet.name,
      wallet.walletName,
      wallet.label,
      wallet.id,
    ].concat(
      Object.keys(addresses).map(function (key) { return addresses[key]; }),
      Object.keys(addressMap).map(function (key) { return addressMap[key]; })
    ).map(function (value) {
      return lower(value);
    }).filter(Boolean);
    return keys.filter(function (key, index) { return keys.indexOf(key) === index; });
  }

  function activeWalletPayloads() {
    return [
      readJSON("do-wallet-selected-recovered-wallet.v1", null),
      readJSON("user", null),
      readJSON("do-wallet-bridge-wallet", null),
      readJSON("do-wallet-extension-authority.v1", null),
    ].map(walletFromPayload).filter(Boolean);
  }

  function activeWalletKeys() {
    var wallets = activeWalletPayloads();
    for (var index = 0; index < wallets.length; index += 1) {
      var keys = walletIdentityKeys(wallets[index]);
      if (keys.length) return keys;
    }
    return [];
  }

  function snapshotMatchesKeys(snapshot, keys) {
    if (!keys.length) return true;
    if (!snapshot || typeof snapshot !== "object") return false;
    var snapshotKeys = walletIdentityKeys(snapshot.wallet || snapshot);
    var walletKey = lower(snapshot.walletKey);
    if (walletKey) snapshotKeys.push(walletKey);
    return snapshotKeys.some(function (key) { return keys.indexOf(key) >= 0; });
  }

  function allSnapshots() {
    var out = [];
    var seen = {};
    function add(snapshot) {
      if (!snapshot || typeof snapshot !== "object") return;
      var key = String(snapshot.updatedAt || "") + ":" + clean(snapshot.walletKey || snapshot.source || "") + ":" + clean(snapshot.totalValue || "");
      if (seen[key]) return;
      seen[key] = true;
      out.push(snapshot);
    }
    var current = readJSON(SNAPSHOT_KEY, null);
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    var keys = activeWalletKeys();

    if (byWallet && typeof byWallet === "object" && keys.length) {
      keys.forEach(function (key) {
        if (byWallet[key] && typeof byWallet[key] === "object") add(byWallet[key]);
      });
    }
    if (snapshotMatchesKeys(current, keys)) add(current);
    if (out.length) return out;

    add(current);
    if (byWallet && typeof byWallet === "object") {
      Object.keys(byWallet).forEach(function (key) { add(byWallet[key]); });
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
        if (chainID && chainID !== LUNC_CHAIN_ID && chainID !== "terra-classic" && chainID !== "lunc") continue;
        address = terraAddressFromValue(entry.address || entry.walletAddress || entry.value || entry);
        if (address) return address;
      }
      return "";
    }
    if (typeof source === "object") {
      address = terraAddressFromValue(source[LUNC_CHAIN_ID] || source["terra-classic"] || source.lunc || source.terra);
      if (address) return address;
      var keys = Object.keys(source);
      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        address = terraAddressFromValue(source[keys[keyIndex]]);
        if (address) return address;
      }
    }
    return "";
  }

  function selectedWalletTerraAddress() {
    var wallets = activeWalletPayloads();
    for (var index = 0; index < wallets.length; index += 1) {
      var wallet = wallets[index] || {};
      var sources = [wallet.addresses, wallet.addressMap, wallet.allAddresses, wallet.address, wallet];
      for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
        var address = terraAddressFromSource(sources[sourceIndex]);
        if (address) return address;
      }
    }
    return "";
  }

  function snapshotTerraAddress() {
    var snapshots = allSnapshots();
    for (var index = 0; index < snapshots.length; index += 1) {
      var snapshot = snapshots[index] || {};
      var sources = [snapshot.allAddresses, snapshot.activeAddresses, snapshot.addresses, snapshot.addressMap];
      for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
        var address = terraAddressFromSource(sources[sourceIndex]);
        if (address) return address;
      }
    }
    return "";
  }

  function storageTerraAddress() {
    try {
      for (var index = 0; index < window.localStorage.length; index += 1) {
        var key = window.localStorage.key(index);
        var address = terraAddressFromValue(key) || terraAddressFromValue(window.localStorage.getItem(key));
        if (address) return address;
      }
    } catch (error) {}
    return "";
  }

  function postJSONTimed(url, payload, timeoutMs) {
    if (!window.fetch) return Promise.reject(new Error("fetch unavailable"));
    var controller = window.AbortController ? new AbortController() : null;
    var timer = 0;
    if (controller) {
      timer = window.setTimeout(function () { controller.abort(); }, timeoutMs);
    }
    return window.fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
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

  function backendStakePayload(address) {
    var map = {};
    map[LUNC_CHAIN_ID] = address;
    var wallet = {
      name: "Do-Wallet",
      address: address,
      addresses: map,
      addressMap: map,
    };
    return {
      version: SNAPSHOT_SCHEMA_VERSION,
      wallet: wallet,
      wallets: [wallet],
      addressMap: map,
    };
  }

  function requestBackendStakeRows(force) {
    var address = selectedWalletTerraAddress() || snapshotTerraAddress() || storageTerraAddress();
    if (!address) return Promise.resolve(backendStakeRows);
    var stale = backendStakeAddress !== address || Date.now() - backendStakeFetchedAt > BACKEND_STAKE_REFRESH_MS;
    if (!force && !stale && backendStakeRows.length) return Promise.resolve(backendStakeRows);
    if (backendStakePromise) return backendStakePromise;

    backendStakeAddress = address;
    backendStakePromise = postJSONTimed(
      BACKEND_PORTFOLIO_SNAPSHOT_PATH,
      backendStakePayload(address),
      BACKEND_STAKE_TIMEOUT_MS
    ).then(function (response) {
      var snapshot = response && (response.snapshot || response);
      var rows = snapshotStakingRows(snapshot);
      backendStakeFetchedAt = Date.now();
      if (rows.length) backendStakeRows = rows;
      backendStakePromise = null;
      if (rows.length) scheduleRender(100);
      return backendStakeRows;
    }, function () {
      backendStakeFetchedAt = Date.now();
      backendStakePromise = null;
      return backendStakeRows;
    });
    return backendStakePromise;
  }

  function number(value) {
    var next = Number(value);
    return Number.isFinite(next) ? next : 0;
  }

  function valueUsd(asset) {
    return number(asset && (asset.valueUsd || asset.value || asset.usd));
  }

  function decimalString(raw, decimals) {
    var value = clean(raw).replace(/[^\d]/g, "");
    if (!value) return "0";
    decimals = Math.max(0, number(decimals));
    if (!decimals) return value;
    while (value.length <= decimals) value = "0" + value;
    var whole = value.slice(0, value.length - decimals) || "0";
    var fraction = value.slice(value.length - decimals).replace(/0+$/, "");
    return fraction ? whole + "." + fraction : whole;
  }

  function amountValue(asset) {
    var direct = number(asset && (asset.amount || asset.quantity || asset.balance || asset.amountValue));
    if (direct > 0) return direct;
    var raw = clean(asset && (asset.rawAmount || asset.amountRaw || asset.balanceRaw));
    if (raw) {
      direct = number(decimalString(raw, asset && (asset.decimals || asset.decimalPlaces || LUNC_DECIMALS)));
      if (direct > 0) return direct;
    }
    return 0;
  }

  function assetCategory(asset) {
    return lower(asset && (asset.category || asset.type || "wallet"));
  }

  function assetChainID(asset) {
    return clean(asset && (asset.chainID || asset.chainId || asset.network || asset.chain || ""));
  }

  function assetChainName(asset) {
    return clean(asset && (asset.chainName || asset.chain || asset.network || asset.chainID || asset.chainId || ""));
  }

  function assetSymbol(asset) {
    return clean(asset && (asset.symbol || asset.denom || asset.token || asset.name || "Asset"));
  }

  function assetName(asset) {
    return clean(asset && (asset.name || asset.chainName || assetSymbol(asset)));
  }

  function assetIcon(asset) {
    var icon = clean(asset && (asset.icon || asset.logoURI || asset.logo || ""));
    return isDoChainAsset(asset) ? DO_CHAIN_ICON : icon;
  }

  function isDoChainAsset(asset) {
    var chain = lower(assetChainID(asset) || assetChainName(asset));
    if (chain === "do-chain" || chain === "do chain" || chain === "dochain" || chain === "888") return true;
    if (chain.indexOf("do-chain") >= 0 || chain.indexOf("do chain") >= 0) return true;
    return false;
  }

  function displayChain(asset) {
    if (isDoChainAsset(asset)) return "Do Chain";
    return assetChainName(asset) || assetChainID(asset) || "Unknown chain";
  }

  function displaySymbol(asset) {
    if (isDoChainAsset(asset)) return "DO";
    var symbol = assetSymbol(asset);
    symbol = symbol.replace(/^(staked|rewards?|unbonding)\s+/i, "");
    if (/^u[a-z]{2,8}$/i.test(symbol) && asset && asset.name) return clean(asset.name).toUpperCase();
    return symbol.toUpperCase();
  }

  function isPositiveRow(asset) {
    return amountValue(asset) > 0 || valueUsd(asset) > 0;
  }

  function stakingCandidateRows(snapshot) {
    var rows = [];
    ["staking", "portfolioAssets", "assets", "spendableAssets"].forEach(function (key) {
      if (Array.isArray(snapshot && snapshot[key])) rows = rows.concat(snapshot[key]);
    });
    return rows;
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

  function inheritedStakeRow(row, category, parent) {
    row = Object.assign({}, row || {});
    parent = parent || {};
    if (!row.category) row.category = category;
    if (!row.chainID && !row.chainId && !row.network) {
      row.chainID = parent.chainID || parent.chainId || parent.network || LUNC_CHAIN_ID;
      row.chainId = row.chainID;
      row.network = row.chainID;
    }
    if (!row.chainName) row.chainName = parent.chainName || parent.name || "Terra Classic (LUNC)";
    if (!row.denom) row.denom = parent.denom || LUNC_DENOM;
    if (!row.symbol) row.symbol = parent.symbol || "LUNC";
    if (!row.name) row.name = parent.name || row.symbol;
    if (!row.icon) row.icon = parent.icon || parent.logoURI || parent.logo || "";
    if (row.decimals == null) row.decimals = parent.decimals == null ? LUNC_DECIMALS : parent.decimals;
    if (!row.valueUsd && row.value) row.valueUsd = row.value;
    if (!row.value && row.valueUsd) row.value = row.valueUsd;
    return row;
  }

  function validatorBreakdownRows(snapshot) {
    var rows = [];
    stakingCandidateRows(snapshot).forEach(function (asset) {
      if (!asset || typeof asset !== "object") return;
      [
        ["staking", "validatorDelegations", "validatorDelegationsByAddress", "delegations", "delegationsByAddress"],
        ["reward", "validatorRewards", "validatorRewardsByAddress", "rewards", "rewardsByAddress"],
        ["unbonding", "validatorUnbondings", "validatorUnbondingsByAddress", "unbondings", "unbondingsByAddress"],
      ].forEach(function (config) {
        var category = config[0];
        var listKey = config[1];
        var mapKey = config[2];
        var breakdownListKey = config[3];
        var breakdownMapKey = config[4];
        var candidates = [];
        if (Array.isArray(asset[listKey])) candidates = candidates.concat(asset[listKey]);
        candidates = candidates.concat(rowsFromMap(asset[mapKey]));
        if (asset.validatorBreakdown) {
          if (Array.isArray(asset.validatorBreakdown[breakdownListKey])) {
            candidates = candidates.concat(asset.validatorBreakdown[breakdownListKey]);
          }
          candidates = candidates.concat(rowsFromMap(asset.validatorBreakdown[breakdownMapKey]));
        }
        candidates.forEach(function (row) {
          rows.push(inheritedStakeRow(row, category, asset));
        });
      });
    });
    return rows;
  }

  function isStakingLikeRow(asset) {
    var category = assetCategory(asset);
    if (category === "staking" || category === "reward" || category === "rewards" || category === "unbonding") return true;
    var label = lower((asset && (asset.symbol || asset.name || asset.type || asset.category)) || "");
    return /^(staked|rewards?|unbonding)\b/.test(label);
  }

  function totalsFallbackRows(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return [];
    var rows = [];
    function add(category, value, amount) {
      value = number(value);
      amount = number(amount);
      if (value <= 0 && amount <= 0) return;
      rows.push({
        category: category,
        chainID: LUNC_CHAIN_ID,
        chainId: LUNC_CHAIN_ID,
        network: LUNC_CHAIN_ID,
        chainName: "Terra Classic (LUNC)",
        denom: LUNC_DENOM,
        symbol: "LUNC",
        name: category === "staking" ? "Staked LUNC" : category === "unbonding" ? "Unbonding LUNC" : "Rewards LUNC",
        amount: amount,
        quantity: amount,
        valueUsd: value,
        value: value,
        decimals: LUNC_DECIMALS,
        source: "do-wallet-stake-total-fallback",
      });
    }
    add("staking", snapshot.totalStakedValue, snapshot.totalStakedAmount || snapshot.stakedAmount);
    add("reward", snapshot.totalRewardsValue, snapshot.totalRewardsAmount || snapshot.rewardAmount);
    add("unbonding", snapshot.totalUnbondingValue, snapshot.totalUnbondingAmount || snapshot.unbondingAmount);
    return rows;
  }

  function snapshotStakingRows(snapshot) {
    var seen = {};
    function filterRows(rows) {
      return rows.filter(function (asset) {
      if (!isPositiveRow(asset) || !isStakingLikeRow(asset)) return false;
      var key = [
        assetCategory(asset),
        isDoChainAsset(asset) ? "Do-Chain" : assetChainID(asset),
        displaySymbol(asset),
        amountValue(asset),
        valueUsd(asset),
        number(asset && (asset.validatorCount || asset.validatorsCount)),
      ].join(":");
      if (seen[key]) return false;
      seen[key] = true;
      return true;
      });
    }
    var primary = filterRows(stakingCandidateRows(snapshot));
    if (primary.length) return primary;
    seen = {};
    var breakdown = filterRows(validatorBreakdownRows(snapshot));
    if (breakdown.length) return breakdown;
    seen = {};
    return filterRows(totalsFallbackRows(snapshot));
  }

  function stakingRowsScore(rows) {
    return rows.reduce(function (score, asset) {
      var category = assetCategory(asset);
      var amount = amountValue(asset);
      var value = valueUsd(asset);
      var categoryScore = category === "staking" ? 1000 : category === "reward" || category === "rewards" ? 100 : 20;
      var doScore = isDoChainAsset(asset) ? 100000 : 0;
      return score + doScore + categoryScore + Math.min(amount, 100000000000) / 1000000 + value;
    }, rows.length);
  }

  function bestSnapshotStakingRows(primarySnapshot) {
    var bestRows = snapshotStakingRows(primarySnapshot);
    var bestScore = stakingRowsScore(bestRows);
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (byWallet && typeof byWallet === "object") {
      Object.keys(byWallet).forEach(function (key) {
        var rows = snapshotStakingRows(byWallet[key]);
        var score = stakingRowsScore(rows);
        if (score > bestScore) {
          bestRows = rows;
          bestScore = score;
        }
      });
    }
    if (backendStakeRows.length) {
      var liveRows = snapshotStakingRows({ staking: backendStakeRows });
      var liveScore = stakingRowsScore(liveRows);
      if (liveScore > bestScore) {
        bestRows = liveRows;
        bestScore = liveScore;
      }
    }
    return bestRows;
  }

  function groupKey(asset) {
    return [
      assetCategory(asset),
      isDoChainAsset(asset) ? "Do-Chain" : assetChainID(asset),
      displaySymbol(asset),
    ].join(":");
  }

  function groupStakingRows(rows) {
    var byKey = {};
    rows.forEach(function (asset) {
      var key = groupKey(asset);
      if (!byKey[key]) {
        byKey[key] = {
          category: assetCategory(asset),
          chainID: isDoChainAsset(asset) ? "Do-Chain" : assetChainID(asset),
          chainName: displayChain(asset),
          symbol: displaySymbol(asset),
          name: assetName(asset),
          icon: assetIcon(asset),
          amount: 0,
          value: 0,
          validators: {},
          validatorCount: 0,
          doChain: isDoChainAsset(asset),
        };
      }
      byKey[key].amount += amountValue(asset);
      byKey[key].value += valueUsd(asset);
      if (Array.isArray(asset.validators)) {
        asset.validators.forEach(function (validator) {
          validator = clean(validator);
          if (validator) byKey[key].validators[validator] = true;
        });
      }
      var count = number(asset.validatorCount || asset.validatorsCount);
      if (count > byKey[key].validatorCount) byKey[key].validatorCount = count;
    });
    return Object.keys(byKey).map(function (key) {
      var group = byKey[key];
      var counted = Object.keys(group.validators).length;
      if (counted > group.validatorCount) group.validatorCount = counted;
      return group;
    });
  }

  function compareGroups(a, b) {
    if (a.doChain !== b.doChain) return a.doChain ? -1 : 1;
    if (a.category !== b.category) {
      var rank = { staking: 0, reward: 1, rewards: 1, unbonding: 2 };
      return (rank[a.category] || 9) - (rank[b.category] || 9);
    }
    return (b.value - a.value) || clean(a.chainName).localeCompare(clean(b.chainName)) || clean(a.symbol).localeCompare(clean(b.symbol));
  }

  function totals(groups) {
    return groups.reduce(function (out, group) {
      if (group.category === "staking") {
        out.staked += group.value;
        out.stakedAmount += group.amount;
      } else if (group.category === "reward" || group.category === "rewards") {
        out.rewards += group.value;
        out.rewardAmount += group.amount;
      } else if (group.category === "unbonding") {
        out.unbonding += group.value;
        out.unbondingAmount += group.amount;
      }
      if (group.category === "staking") {
        out.validators += group.validatorCount || 0;
      }
      return out;
    }, {
      staked: 0,
      stakedAmount: 0,
      rewards: 0,
      rewardAmount: 0,
      unbonding: 0,
      unbondingAmount: 0,
      validators: 0,
    });
  }

  function money(value) {
    var next = number(value);
    if (next <= 0) return "$0.00";
    if (next < 0.01) return "< $0.01";
    return "$" + next.toLocaleString(undefined, {
      minimumFractionDigits: next >= 1000 ? 2 : 0,
      maximumFractionDigits: next >= 100 ? 2 : 6,
    });
  }

  function amountText(value) {
    var next = number(value);
    if (next <= 0) return "0";
    return next.toLocaleString(undefined, {
      maximumFractionDigits: next >= 1000 ? 2 : next >= 1 ? 6 : 8,
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

  function shortLabel(value, max) {
    value = clean(value);
    max = max || 22;
    return value.length > max ? value.slice(0, max - 3) + "..." : value;
  }

  function iconHTML(group) {
    var src = clean(group && group.icon);
    if ((!src || /\/img\/chains\/DoChain\.png$/i.test(src)) && group && group.doChain) src = DO_CHAIN_ICON;
    if (!src) {
      return '<span class="do-wallet-stake-live-icon-fallback">' + escapeHTML((group && group.symbol || "?").slice(0, 3)) + '</span>';
    }
    return '<img class="do-wallet-stake-live-icon" src="' + escapeHTML(src) + '" alt="" loading="lazy" />';
  }

  function metricHTML(label, value, amount, symbol, extra) {
    var amountLine = amount > 0 ? amountText(amount) + (symbol ? " " + symbol : "") : (extra || "");
    return [
      '<div class="do-wallet-stake-live-metric">',
        '<span>' + escapeHTML(label) + '</span>',
        '<strong>' + escapeHTML(money(value)) + '</strong>',
        '<small>' + escapeHTML(amountLine) + '</small>',
      '</div>',
    ].join("");
  }

  function chipHTML(group, index) {
    return [
      '<span class="do-wallet-stake-live-chip' + (group.doChain ? " is-do" : "") + '">',
        iconHTML(group),
        '<span>' + escapeHTML(shortLabel(group.chainName, 28)) + '</span>',
      '</span>',
    ].join("");
  }

  function positionRowsHTML(groups) {
    return groups.slice(0, 12).map(function (group) {
      var label =
        group.category === "staking" ? "Staked" :
        group.category === "reward" || group.category === "rewards" ? "Rewards" :
        "Unbonding";
      var validators = group.validatorCount > 0
        ? group.validatorCount + " validator" + (group.validatorCount === 1 ? "" : "s")
        : "";
      return [
        '<div class="do-wallet-stake-live-position' + (group.doChain ? " is-do" : "") + '">',
          '<div class="do-wallet-stake-live-position-left">',
            iconHTML(group),
            '<span>',
              '<strong>' + escapeHTML(label + " " + group.symbol) + '</strong>',
              '<small>' + escapeHTML(group.chainName + (validators ? " - " + validators : "")) + '</small>',
            '</span>',
          '</div>',
          '<div class="do-wallet-stake-live-position-right">',
            '<strong>' + escapeHTML(money(group.value)) + '</strong>',
            '<small>' + escapeHTML(amountText(group.amount) + " " + group.symbol) + '</small>',
          '</div>',
        '</div>',
      ].join("");
    }).join("");
  }

  function panelHTML(groups) {
    var sorted = groups.slice().sort(compareGroups);
    var stakeGroups = sorted.filter(function (group) { return group.category === "staking"; });
    var unbondingGroup = sorted.filter(function (group) { return group.category === "unbonding"; })[0];
    var rewardGroup = sorted.filter(function (group) { return group.category === "reward" || group.category === "rewards"; })[0];
    var totalsRow = totals(sorted);
    var doGroup = stakeGroups.filter(function (group) { return group.doChain; })[0];
    var primaryStakeGroup = doGroup || stakeGroups[0];
    var chips = stakeGroups.slice(0, 5).map(chipHTML).join("");
    if (stakeGroups.length > 5) chips += '<span class="do-wallet-stake-live-chip more">+ ' + escapeHTML(String(stakeGroups.length - 5)) + '</span>';
    if (!chips) chips = '<span class="do-wallet-stake-live-chip more">No staked assets yet</span>';

    var stakedAmountSymbol = primaryStakeGroup ? primaryStakeGroup.symbol : "";
    var stakedAmount = primaryStakeGroup ? primaryStakeGroup.amount : totalsRow.stakedAmount;
    return [
      '<section class="do-wallet-stake-live" data-do-wallet-stake-snapshot="live">',
        '<div class="do-wallet-stake-live-head">',
          '<div>',
            '<h2>Staked funds</h2>',
            '<p>Delegations, unbonding, and rewards across wallet addresses</p>',
          '</div>',
          '<strong>' + escapeHTML(money(totalsRow.staked + totalsRow.rewards + totalsRow.unbonding)) + '</strong>',
        '</div>',
        '<div class="do-wallet-stake-live-chips">',
          '<span class="do-wallet-stake-live-chip all">All</span>',
          chips,
        '</div>',
        '<div class="do-wallet-stake-live-summary">',
          metricHTML("Delegations", totalsRow.staked, stakedAmount, stakedAmountSymbol, ""),
          metricHTML("Undelegations", totalsRow.unbonding, totalsRow.unbondingAmount, unbondingGroup ? unbondingGroup.symbol : "", "0 releases"),
          metricHTML("Staking rewards", totalsRow.rewards, totalsRow.rewardAmount, rewardGroup ? rewardGroup.symbol : "", ""),
        '</div>',
        '<div class="do-wallet-stake-live-section-title">',
          '<strong>Positions</strong>',
          '<span>' + escapeHTML(String(sorted.length) + " position" + (sorted.length === 1 ? "" : "s")) + '</span>',
        '</div>',
        '<div class="do-wallet-stake-live-positions">',
          positionRowsHTML(sorted),
        '</div>',
      '</section>',
    ].join("");
  }

  function installStyles() {
    if (document.getElementById("do-wallet-stake-live-style")) return;
    var style = document.createElement("style");
    style.id = "do-wallet-stake-live-style";
    style.textContent = [
      ".do-wallet-stake-live{box-sizing:border-box;width:min(100%,1120px);margin:18px 0 24px;padding:0;border:1px solid rgba(159,70,255,.38);border-radius:8px;background:#191327;color:#fff;overflow:hidden;font-family:inherit}",
      ".do-wallet-stake-live *{box-sizing:border-box}",
      ".do-wallet-stake-live-host{box-sizing:border-box;width:100%;min-height:420px;padding:28px 32px 44px;color:#fff;font-family:inherit}",
      ".do-wallet-stake-live-host-title{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:0 0 18px}",
      ".do-wallet-stake-live-host-title h1{margin:0;color:#fff;font-size:34px;line-height:1.1;font-weight: 700;letter-spacing:0}",
      ".do-wallet-stake-live-host .do-wallet-stake-live{margin-top:0}",
      ".do-wallet-stake-live-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 28px 16px;border-bottom:1px solid rgba(159,70,255,.26)}",
      ".do-wallet-stake-live-head h2{margin:0 0 4px;font-size:22px;line-height:1.1;font-weight:700;letter-spacing:0}",
      ".do-wallet-stake-live-head p{margin:0;color:#c7b9ef;font-size:13px;line-height:1.35;font-weight:500}",
      ".do-wallet-stake-live-head>strong{font-size:28px;line-height:1;font-weight: 700;white-space:nowrap}",
      ".do-wallet-stake-live-chips{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 28px;border-bottom:1px solid rgba(159,70,255,.26)}",
      ".do-wallet-stake-live-chip{display:inline-flex;align-items:center;gap:7px;min-height:28px;padding:4px 14px;border:1px solid rgba(159,70,255,.48);border-radius:999px;color:#c8bddf;background:#251b39;font-size:13px;font-weight:700;white-space:nowrap}",
      ".do-wallet-stake-live-chip.all,.do-wallet-stake-live-chip.is-do{color:#fff;background:#9b3cff;border-color:#9b3cff}",
      ".do-wallet-stake-live-chip.more{background:transparent;color:#aa9dc6}",
      ".do-wallet-stake-live-chip .do-wallet-stake-live-icon,.do-wallet-stake-live-chip .do-wallet-stake-live-icon-fallback{width:18px;height:18px;font-size:8px}",
      ".do-wallet-stake-live-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:18px 28px;border-bottom:1px solid rgba(159,70,255,.26)}",
      ".do-wallet-stake-live-metric{min-height:96px;padding:18px 20px;border:1px solid rgba(159,70,255,.36);border-radius:8px;background:#171225}",
      ".do-wallet-stake-live-metric span{display:block;color:#fff;font-size:16px;font-weight:700}",
      ".do-wallet-stake-live-metric strong{display:block;margin-top:10px;color:#fff;font-size:25px;line-height:1;font-weight: 700}",
      ".do-wallet-stake-live-metric small{display:block;margin-top:8px;color:#bdb2da;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".do-wallet-stake-live-section-title{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 28px 12px}",
      ".do-wallet-stake-live-section-title strong{font-size:16px;font-weight: 700;color:#fff}",
      ".do-wallet-stake-live-section-title span{font-size:12px;font-weight: 700;color:#bdb2da}",
      ".do-wallet-stake-live-positions{display:grid;grid-template-columns:1fr;gap:0;border-top:1px solid rgba(159,70,255,.18)}",
      ".do-wallet-stake-live-position{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:82px;padding:16px 28px;border-top:1px solid rgba(159,70,255,.18)}",
      ".do-wallet-stake-live-position:nth-child(1){border-top:0}",
      ".do-wallet-stake-live-position.is-do{background:rgba(155,60,255,.08)}",
      ".do-wallet-stake-live-position-left{display:flex;align-items:center;gap:14px;min-width:0}",
      ".do-wallet-stake-live-position-left span{min-width:0}",
      ".do-wallet-stake-live-position-left strong{display:block;color:#fff;font-size:16px;line-height:1.2;font-weight: 700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".do-wallet-stake-live-position-left small{display:block;margin-top:5px;color:#bdb2da;font-size:12px;font-weight: 700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".do-wallet-stake-live-position-right{text-align:right;min-width:120px}",
      ".do-wallet-stake-live-position-right strong{display:block;color:#fff;font-size:18px;line-height:1.2;font-weight: 700}",
      ".do-wallet-stake-live-position-right small{display:block;margin-top:5px;color:#c8c0ef;font-size:12px;font-weight: 700;white-space:nowrap}",
      ".do-wallet-stake-live-icon{width:42px;height:42px;border-radius:50%;object-fit:cover;flex:0 0 auto}",
      ".do-wallet-stake-live-icon-fallback{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:#34264d;color:#fff;font-size:12px;font-weight: 700;flex:0 0 auto}",
      "@media (max-width:980px){.do-wallet-stake-live-summary{grid-template-columns:1fr}.do-wallet-stake-live-position{min-height:74px}}",
      "@media (max-width:560px){.do-wallet-stake-live-head,.do-wallet-stake-live-chips,.do-wallet-stake-live-summary,.do-wallet-stake-live-section-title,.do-wallet-stake-live-position{padding-left:18px;padding-right:18px}.do-wallet-stake-live-head{display:grid}.do-wallet-stake-live-head>strong{font-size:22px}.do-wallet-stake-live-position{align-items:flex-start;flex-direction:column}.do-wallet-stake-live-position-right{text-align:left;min-width:0}}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function visibleRect(node) {
    if (!node || !node.getBoundingClientRect) return null;
    var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) return null;
    var rect = node.getBoundingClientRect();
    if (!rect || rect.width < 1 || rect.height < 1) return null;
    return rect;
  }

  function nodeText(node) {
    return clean(node && (node.innerText || node.textContent || ""));
  }

  function rememberStakeSurface(parent, before) {
    if (parent && document.documentElement && document.documentElement.contains(parent)) {
      lastStakeSurface = { parent: parent, before: before || null };
    }
    return lastStakeSurface;
  }

  function rememberedStakeSurface() {
    if (
      lastStakeSurface &&
      lastStakeSurface.parent &&
      document.documentElement &&
      document.documentElement.contains(lastStakeSurface.parent)
    ) {
      return lastStakeSurface;
    }
    return null;
  }

  function activeStakeNavSelected() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("a,button,[role='button'],li,div"));
    for (var index = 0; index < nodes.length; index += 1) {
      var node = nodes[index];
      if (nodeText(node) !== "Stake") continue;
      var rect = visibleRect(node);
      if (!rect || rect.left > 420) continue;
      var target = node.closest && node.closest("a,button,[role='button'],li,[aria-current],[aria-selected]");
      target = target || node;
      var ariaCurrent = lower(target.getAttribute && target.getAttribute("aria-current"));
      var ariaSelected = lower(target.getAttribute && target.getAttribute("aria-selected"));
      var classes = clean(
        (target.className || "") + " " +
        ((target.parentElement && target.parentElement.className) || "")
      );
      if (ariaCurrent === "page" || ariaCurrent === "true" || ariaSelected === "true") return true;
      if (/\b(active|selected|current|is-active|is-selected)\b/i.test(classes)) return true;
      var style = window.getComputedStyle ? window.getComputedStyle(target) : null;
      var bg = style && style.backgroundColor;
      if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return true;
    }
    return false;
  }

  function findRightWalletPane() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("aside,section,article,div"));
    var best = null;
    nodes.forEach(function (node) {
      var rect = visibleRect(node);
      if (!rect || rect.width < 240 || rect.height < 420) return;
      if (rect.left < window.innerWidth * 0.45) return;
      var text = nodeText(node);
      if (!/\bPortfolio value\b/i.test(text) || !/\bAssets\b/i.test(text)) return;
      if (!/\bSend\b/i.test(text) || !/\bReceive\b/i.test(text)) return;
      var score = rect.left * 100000 + rect.height;
      if (!best || score > best.score) best = { node: node, rect: rect, score: score };
    });
    return best;
  }

  function findLeftNavPane() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("aside,nav,section,div"));
    var best = null;
    nodes.forEach(function (node) {
      var rect = visibleRect(node);
      if (!rect || rect.left > 80 || rect.width > 460 || rect.height < 420) return;
      var text = nodeText(node);
      if (!/\bDashboard\b/i.test(text) || !/\bStake\b/i.test(text) || !/\bNetworks\b/i.test(text)) return;
      var score = rect.width * rect.height;
      if (!best || score > best.score) best = { node: node, rect: rect, score: score };
    });
    return best;
  }

  function findCenterStakePane() {
    var right = findRightWalletPane();
    var left = findLeftNavPane();
    var leftLimit = left && left.rect ? left.rect.right - 20 : 200;
    var rightLimit = right && right.rect ? right.rect.left + 20 : window.innerWidth - 300;
    var nodes = Array.prototype.slice.call(document.querySelectorAll("main,section,article,div"));
    var best = null;
    nodes.forEach(function (node) {
      if (!node || (node.matches && node.matches(PANEL_SELECTOR))) return;
      if (node.closest && (node.closest(PANEL_SELECTOR) || node.closest(HOST_SELECTOR))) return;
      var rect = visibleRect(node);
      if (!rect || rect.width < 520 || rect.height < 340) return;
      if (rect.left < leftLimit - 32) return;
      if (rect.right > rightLimit + 32) return;
      if (right && right.rect && rect.left >= right.rect.left - 24) return;
      var text = nodeText(node);
      if (/\bPortfolio value\b/i.test(text) && /\bAssets\b/i.test(text) && /\bSend\b/i.test(text)) return;
      if (/\bDashboard\b/i.test(text) && /\bNetworks\b/i.test(text) && rect.left < 420) return;
      if (text.length > 40000) return;
      var stakeLike = /\bStake\b|\bStaked funds\b|\bDelegations\b|\bQuick Stake\b|\bManual Stake\b/i.test(text);
      var mostlyBlank = text.length < 2200;
      var score = rect.width * rect.height + (stakeLike ? 500000000 : 0) + (mostlyBlank ? 250000000 : 0);
      if (!best || score > best.score) best = { node: node, score: score };
    });
    return best && best.node;
  }

  function ensureStakeHost() {
    var host = document.querySelector(HOST_SELECTOR);
    if (host && document.documentElement && document.documentElement.contains(host)) {
      return rememberStakeSurface(host, null);
    }
    var pane = findCenterStakePane();
    if (!pane) return null;
    host = document.createElement("div");
    host.setAttribute("data-do-wallet-stake-snapshot-host", "live");
    host.className = "do-wallet-stake-live-host";
    host.innerHTML = '<div class="do-wallet-stake-live-host-title"><h1>Stake</h1></div>';
    pane.insertBefore(host, pane.firstChild || null);
    return rememberStakeSurface(host, null);
  }

  function findHiddenOldStakePanel() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(OLD_HIDDEN_SELECTOR));
    for (var index = 0; index < nodes.length; index += 1) {
      if (nodes[index] && nodes[index].parentElement) return nodes[index];
    }
    return null;
  }

  function liveStakePanelVisible() {
    var panel = document.querySelector(PANEL_SELECTOR);
    var rect = visibleRect(panel);
    return !!(rect && rect.width >= 360 && rect.height >= 160);
  }

  function containsLiveStakeNode(node) {
    return !!(node && node.querySelector && node.querySelector(PANEL_SELECTOR + "," + HOST_SELECTOR));
  }

  function findOldStakePanels() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("section,article,div,main"));
    var matches = [];
    nodes.forEach(function (node) {
      if (!node || node.matches && node.matches(PANEL_SELECTOR)) return;
      if (node.closest && node.closest(PANEL_SELECTOR)) return;
      if (node.closest && node.closest(HOST_SELECTOR)) return;
      if (containsLiveStakeNode(node)) return;
      if (node.hasAttribute && node.hasAttribute("data-do-wallet-old-stake-hidden")) return;
      var rect = visibleRect(node);
      if (!rect || rect.width < 360 || rect.height < 180) return;
      var text = nodeText(node);
      if (!text || text.length > 18000) return;
      if (!/\bStaked funds\b/i.test(text)) return;
      if (!/\bDelegations\b|\bUndelegations\b|\bStaking rewards\b/i.test(text)) return;
      var penalty = /\bQuick Stake\b|\bManual Stake\b/i.test(text) ? rect.width * rect.height : 0;
      var score = rect.width * rect.height + penalty;
      matches.push({ node: node, score: score });
    });
    return matches.sort(function (a, b) { return a.score - b.score; }).map(function (entry) { return entry.node; });
  }

  function findOldStakePanel() {
    return findOldStakePanels()[0] || null;
  }

  function stakeSurface() {
    var livePanel = document.querySelector(PANEL_SELECTOR);
    if (livePanel && livePanel.parentElement) {
      return rememberStakeSurface(livePanel.parentElement, livePanel.nextSibling);
    }
    var oldPanel = findOldStakePanel();
    if (oldPanel && oldPanel.parentElement) {
      return rememberStakeSurface(oldPanel.parentElement, oldPanel);
    }
    var hiddenOldPanel = findHiddenOldStakePanel();
    if (hiddenOldPanel && hiddenOldPanel.parentElement) {
      return rememberStakeSurface(hiddenOldPanel.parentElement, hiddenOldPanel);
    }
    var nodes = Array.prototype.slice.call(document.querySelectorAll("main,section,article,div"));
    var best = null;
    nodes.forEach(function (node) {
      var rect = visibleRect(node);
      if (!rect || rect.width < 520 || rect.height < 260) return;
      var text = nodeText(node);
      if (!/\bQuick Stake\b|\bManual Stake\b|\bWithdraw all rewards\b/i.test(text)) return;
      var score = rect.width * rect.height;
      if (!best || score < best.score) best = { node: node, score: score };
    });
    if (best) return rememberStakeSurface(best.node, best.node.firstChild);
    var host = ensureStakeHost();
    if (host) return host;
    return rememberedStakeSurface();
  }

  function onStakePage() {
    if (!document.body) return false;
    if (/\bstake\b/i.test(window.location.pathname + window.location.hash + window.location.search)) {
      lastStakePageSeenAt = Date.now();
      return true;
    }
    if (document.querySelector(PANEL_SELECTOR) && Date.now() - lastStakePageSeenAt < STAKE_PAGE_STICKY_MS) {
      return true;
    }
    if (activeStakeNavSelected()) {
      lastStakePageSeenAt = Date.now();
      return true;
    }
    if (findOldStakePanel()) {
      lastStakePageSeenAt = Date.now();
      return true;
    }
    if (findHiddenOldStakePanel() && Date.now() - lastStakePageSeenAt < STAKE_PAGE_STICKY_MS) {
      return true;
    }
    var text = nodeText(document.body);
    if (/\bQuick Stake\b|\bManual Stake\b|\bWithdraw all rewards\b/i.test(text)) {
      lastStakePageSeenAt = Date.now();
      return true;
    }
    return false;
  }

  function hideOldStakePanels() {
    if (!liveStakePanelVisible()) {
      return;
    }
    findOldStakePanels().forEach(function (old) {
      rememberStakeSurface(old.parentElement, old);
      old.setAttribute("data-do-wallet-old-stake-hidden", "1");
      if (!old.getAttribute("data-do-wallet-old-display")) {
        old.setAttribute("data-do-wallet-old-display", old.style.display || "");
      }
      old.style.display = "none";
    });
  }

  function restoreOldStakePanels() {
    Array.prototype.slice.call(document.querySelectorAll(OLD_HIDDEN_SELECTOR)).forEach(function (node) {
      node.style.display = node.getAttribute("data-do-wallet-old-display") || "";
      node.removeAttribute("data-do-wallet-old-display");
      node.removeAttribute("data-do-wallet-old-stake-hidden");
    });
  }

  function removePanel() {
    Array.prototype.slice.call(document.querySelectorAll(PANEL_SELECTOR)).forEach(function (node) {
      node.remove();
    });
    Array.prototype.slice.call(document.querySelectorAll(HOST_SELECTOR)).forEach(function (node) {
      if (!node.querySelector(PANEL_SELECTOR)) node.remove();
    });
    lastSignature = "";
  }

  function elementNode(node) {
    if (!node || node.nodeType !== 1) return null;
    return node;
  }

  function isLiveStakeNode(node) {
    var element = elementNode(node);
    return !!(element && (
      (element.matches && (element.matches(PANEL_SELECTOR) || element.matches(HOST_SELECTOR))) ||
      (element.closest && element.closest(PANEL_SELECTOR + "," + HOST_SELECTOR))
    ));
  }

  function mutationIsInternalStakePaint(mutation) {
    if (!mutation) return false;
    return isLiveStakeNode(mutation.target);
  }

  function render() {
    try {
      if (!document.body) return;
      lastRenderStartedAt = Date.now();
      suppressMutationsUntil = lastRenderStartedAt + MUTATION_SUPPRESS_MS;
      if (!onStakePage()) {
        removePanel();
        restoreOldStakePanels();
        return;
      }

      var snapshot = readJSON(SNAPSHOT_KEY, null);
      var rows = bestSnapshotStakingRows(snapshot);
      if (!rows.length || Date.now() - backendStakeFetchedAt > BACKEND_STAKE_REFRESH_MS) {
        requestBackendStakeRows(false);
      }
      if (!rows.length) {
        removePanel();
        restoreOldStakePanels();
        return;
      }
      var groups = groupStakingRows(rows);

      installStyles();
      lastStakePageSeenAt = Date.now();
      var signature = [
        clean(snapshot && snapshot.schemaVersion),
        clean(snapshot && snapshot.updatedAt),
        groups.map(function (group) {
          return [group.category, group.chainID, group.symbol, group.amount, group.value, group.validatorCount].join(":");
        }).join("|"),
      ].join("::");

      var panel = document.querySelector(PANEL_SELECTOR);
      if (!panel || signature !== lastSignature) {
        var wrapper = document.createElement("div");
        wrapper.innerHTML = panelHTML(groups);
        var nextPanel = wrapper.firstChild;
        var target = stakeSurface();
        if (!target || !target.parent) {
          restoreOldStakePanels();
          return;
        }
        if (panel && panel.parentNode) panel.parentNode.replaceChild(nextPanel, panel);
        else target.parent.insertBefore(nextPanel, target.before || null);
        panel = nextPanel;
        lastSignature = signature;
      }

      if (!liveStakePanelVisible()) {
        return;
      }
      hideOldStakePanels();
    } catch (error) {
      restoreOldStakePanels();
      try {
        console.warn("Do-Wallet stake snapshot render failed; restored original stake view", error);
      } catch (_) {}
    }
  }

  function scheduleRender(delay) {
    window.clearTimeout(renderTimer);
    var requestedDelay = delay == null ? RENDER_DEBOUNCE_MS : delay;
    var sinceLastRender = Date.now() - lastRenderStartedAt;
    if (lastRenderStartedAt && sinceLastRender < MIN_RENDER_INTERVAL_MS) {
      requestedDelay = Math.max(requestedDelay, MIN_RENDER_INTERVAL_MS - sinceLastRender);
    }
    renderTimer = window.setTimeout(render, requestedDelay);
  }

  function installObserver() {
    if (observer || !window.MutationObserver || !document.body) return;
    observer = new MutationObserver(function (mutations) {
      if (Date.now() < suppressMutationsUntil) return;
      var shouldRender = false;
      for (var index = 0; index < mutations.length; index += 1) {
        var mutation = mutations[index];
        if (mutationIsInternalStakePaint(mutation)) continue;
        if ((mutation.addedNodes && mutation.addedNodes.length) || (mutation.removedNodes && mutation.removedNodes.length)) {
          shouldRender = true;
          break;
        }
      }
      if (shouldRender) scheduleRender(1000);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(function () {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      installObserver();
      scheduleRender(400);
    }, { once: true });
  } else {
    installObserver();
    scheduleRender(400);
  }

  window.addEventListener("do_wallet_portfolio_snapshot", function () { scheduleRender(500); });
  window.addEventListener("hashchange", function () { installObserver(); scheduleRender(500); });
  window.addEventListener("popstate", function () { installObserver(); scheduleRender(500); });
  document.addEventListener("click", function () {
    installObserver();
    scheduleRender(700);
  }, true);
  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY || event.key === SNAPSHOTS_BY_WALLET_KEY) scheduleRender(500);
  });

  window.doWalletStakeSnapshot = {
    render: render,
    cleanup: function () {
      removePanel();
      restoreOldStakePanels();
    },
  };
})();
