(function () {
  "use strict";

  if (window.__doWalletDashboardOverviewAssets20260626) return;
  window.__doWalletDashboardOverviewAssets20260626 = true;

  var VERSION = "20260628DashboardOverviewAssets3";
  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var STYLE_ID = "do-wallet-dashboard-overview-assets-style";
  var CARD_ATTR = "data-do-wallet-dashboard-overview-assets";
  var SIGNATURE_ATTR = "data-do-wallet-dashboard-overview-signature";
  var RENDER_DELAY_MS = 180;
  var renderTimer = 0;
  var assetActionPayloads = {};

  var CHAIN_ICON = {
    "Do-Chain": "/do-logo.jpg",
    "columbus-5": "/img/chains/TerraClassic.svg",
    "osmosis-1": "/img/chains/Osmosis.svg",
    "phoenix-1": "/img/chains/Terra.svg",
    "bitcoin-mainnet": "/img/chains/Bitcoin.svg",
    "ethereum-mainnet": "/img/chains/Ethereum.svg",
    "bnb-smart-chain-mainnet": "/img/chains/BNB.svg",
    "solana-mainnet": "/img/chains/Solana.svg",
    "arbitrum-one": "/img/chains/Arbitrum.svg",
    "avalanche-c-chain": "/img/chains/Avalanche.svg",
    "base-mainnet": "/img/chains/Base.svg",
    "polygon-mainnet": "/img/chains/Polygon.svg",
    "optimism-mainnet": "/img/chains/Optimism.svg",
    "cardano-mainnet": "/img/chains/Cardano.svg",
    "tron-mainnet": "/img/chains/Tron.svg",
    "xrp-ledger-mainnet": "/img/chains/XRP.svg",
    "cosmoshub-4": "/img/chains/Cosmos.svg",
    "secret-4": "/img/chains/Secret.png"
  };

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function upper(value) {
    return clean(value).toUpperCase();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function escapeHTML(value) {
    return clean(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function walletIdentityKeys(wallet) {
    wallet = walletFromPayload(wallet) || wallet;
    if (!isObject(wallet)) return [];
    var keys = [wallet.address, wallet.name, wallet.walletName, wallet.label, wallet.id];
    [wallet.addresses, wallet.addressMap].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        keys.push(key + ":" + map[key]);
        keys.push(map[key]);
      });
    });
    return keys.map(lower).filter(Boolean).filter(function (key, index, list) {
      return list.indexOf(key) === index;
    });
  }

  function activeWalletKeys() {
    var payloads = [
      readJSON("do-wallet-selected-recovered-wallet.v1", null),
      readJSON("user", null),
      readJSON("do-wallet-bridge-wallet", null),
      readJSON("do-wallet-extension-authority.v1", null)
    ];
    for (var index = 0; index < payloads.length; index += 1) {
      var keys = walletIdentityKeys(payloads[index]);
      if (keys.length) return keys;
    }
    return [];
  }

  function snapshotKeys(snapshot) {
    if (!isObject(snapshot)) return [];
    var keys = walletIdentityKeys(snapshot.wallet || snapshot);
    if (snapshot.walletKey) keys.push(lower(snapshot.walletKey));
    [snapshot.addresses, snapshot.activeAddresses, snapshot.allAddresses].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        keys.push(lower(key + ":" + map[key]));
        keys.push(lower(map[key]));
      });
    });
    return keys.filter(Boolean).filter(function (key, index, list) {
      return list.indexOf(key) === index;
    });
  }

  function snapshotMatchesActiveWallet(snapshot, activeKeys) {
    if (!activeKeys.length) return true;
    var keys = snapshotKeys(snapshot);
    if (!keys.length) return false;
    return keys.some(function (key) { return activeKeys.indexOf(key) >= 0; });
  }

  function collectSnapshots() {
    var snapshots = [];
    var seen = {};
    var activeKeys = activeWalletKeys();
    function add(snapshot) {
      if (!isObject(snapshot) || !snapshotMatchesActiveWallet(snapshot, activeKeys)) return;
      var key = clean(snapshot.schemaVersion || "") + ":" + clean(snapshot.updatedAt || "") + ":" + snapshotKeys(snapshot).join("|");
      if (seen[key]) return;
      seen[key] = true;
      snapshots.push(snapshot);
    }
    add(readJSON(SNAPSHOT_KEY, null));
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (isObject(byWallet)) Object.keys(byWallet).forEach(function (key) { add(byWallet[key]); });
    return snapshots.sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); });
  }

  function firstArray(source, keys) {
    if (!isObject(source)) return [];
    for (var index = 0; index < keys.length; index += 1) {
      if (Array.isArray(source[keys[index]])) return source[keys[index]];
    }
    return [];
  }

  function rawRowsFromSnapshots(kind) {
    var keys = kind === "spendable"
      ? ["flatSpendableAssets", "unGroupedSpendableAssets", "rawSpendableAssets", "sourceSpendableAssets", "rawTokenSpendableAssets", "detailPortfolioAssets", "flatPortfolioAssets", "rawPortfolioAssets", "portfolioAssets", "assets"]
      : ["staking", "sourceStakingAssets", "flatPortfolioAssets", "rawPortfolioAssets", "detailPortfolioAssets", "portfolioAssets", "assets"];
    var rows = [];
    collectSnapshots().forEach(function (snapshot) {
      firstArray(snapshot, keys).forEach(function (asset) {
        flattenAsset(asset, rows);
      });
    });
    return uniqueRows(rows.map(normalizeRow).filter(displayableRow));
  }

  function flattenAsset(asset, rows) {
    if (!isObject(asset)) return;
    var children = firstArray(asset, ["childAssets", "expandedAssets", "subAssets", "tokens", "children"]);
    if (children.length) {
      children.forEach(function (child) { flattenAsset(child, rows); });
      if (asset.isChainGroup || asset.portfolioGroup || asset.groupedUnderChain) return;
    }
    rows.push(asset);
  }

  function numberFrom(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    var text = clean(value).replace(/[$,%]/g, "").replace(/,/g, "");
    if (!text || text === "-") return 0;
    var parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatUSD(value) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "$-";
    var digits = value >= 100 ? 2 : value >= 1 ? 4 : 8;
    return "$" + value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function formatAmount(value, symbol) {
    value = Number(value);
    if (!Number.isFinite(value) || value <= 0) return "";
    var digits = value >= 100 ? 2 : value >= 1 ? 4 : 8;
    return value.toLocaleString(undefined, { maximumFractionDigits: digits }) + (symbol ? " " + symbol : "");
  }

  function categoryOf(asset) {
    return lower(asset && (asset.category || asset.type || asset.assetType || "wallet"));
  }

  function symbolOf(asset) {
    return upper(asset && (asset.symbol || asset.tokenSymbol || asset.ticker || asset.denom || asset.name));
  }

  function chainIDOf(asset) {
    return clean(asset && (asset.chainID || asset.chainId || asset.chain || asset.network || asset.networkID || asset.networkId));
  }

  function chainNameOf(asset) {
    return clean(asset && (asset.chainName || asset.networkName || asset.chainLabel || asset.networkLabel));
  }

  function iconOf(asset, chainID) {
    return clean(asset && (asset.chainIcon || asset.icon || asset.logo || asset.image)) || CHAIN_ICON[chainID] || "";
  }

  function normalizeRow(asset) {
    var symbol = symbolOf(asset);
    var chainID = chainIDOf(asset);
    var category = categoryOf(asset);
    var amount = numberFrom(asset && (asset.amount || asset.quantity || asset.balance || asset.displayAmount || asset.tokenAmount || asset.amountText));
    var value = numberFrom(asset && (asset.valueUsd || asset.groupedValueUsd || asset.value || asset.usdValue || asset.usd || asset.valueText || asset.usdValueText));
    var amountText = clean(asset && (asset.displayAmount || asset.amountText || asset.balanceText || asset.quantityText)) || formatAmount(amount, symbol);
    var valueText = clean(asset && (asset.valueText || asset.usdValueText || asset.fiatValueText || asset.valueFormatted));
    return {
      category: category,
      symbol: symbol,
      name: clean(asset && (asset.displayName || asset.name || asset.label)) || symbol,
      chainID: chainID,
      chainName: chainNameOf(asset) || clean(asset && asset.network) || chainID || symbol,
      denom: lower(asset && (asset.denom || asset.baseDenom || asset.token || symbol)),
      validator: lower(asset && (asset.validator || asset.validatorAddress || asset.validator_address || "")),
      validatorCount: numberFrom(asset && (asset.validatorCount || asset.validatorsCount || asset.validator_count || 0)),
      validators: Array.isArray(asset && asset.validators) ? asset.validators.map(lower).filter(Boolean) : [],
      icon: iconOf(asset, chainID),
      amount: amount,
      amountText: amountText,
      value: value,
      valueText: valueText && valueText !== "$0" ? valueText : formatUSD(value),
      priceText: clean(asset && (asset.priceText || asset.usdPriceText || asset.priceFormatted || asset.unitPriceText)),
      changeText: clean(asset && (asset.changeText || asset.priceChangeText || asset.percentText || asset.change24hText)),
      raw: asset
    };
  }

  function rowForVisibility(row) {
    return Object.assign({}, isObject(row && row.raw) ? row.raw : {}, isObject(row) ? row : {});
  }

  function rowVisibilityKey(row) {
    try {
      var quarantine = window.doWalletQuarantine;
      if (quarantine && typeof quarantine.keyForAsset === "function") return clean(quarantine.keyForAsset(rowForVisibility(row)));
    } catch (error) {}
    return [row.chainID || "global", row.denom || row.symbol, row.name].join(":").toLowerCase();
  }

  function rowAllowedByVisibility(row) {
    try {
      var quarantine = window.doWalletQuarantine;
      var payload = rowForVisibility(row);
      if (quarantine && typeof quarantine.isVisibleAsset === "function") return quarantine.isVisibleAsset(payload);
      if (quarantine && typeof quarantine.isHiddenAsset === "function" && quarantine.isHiddenAsset(payload)) return false;
      if (quarantine && typeof quarantine.isBlockedAsset === "function" && quarantine.isBlockedAsset(payload)) return false;
    } catch (error) {}
    return true;
  }

  function rowDecisionPayload(row) {
    return Object.assign({}, rowForVisibility(row), {
      displayName: row.name || row.symbol,
      name: row.name || row.symbol,
      symbol: row.symbol,
      chainName: row.chainName,
      chainID: row.chainID,
      denom: row.denom,
      amountText: row.amountText,
      valueText: row.valueText,
      priceText: row.priceText,
      changeText: row.changeText
    });
  }

  function displayableRow(row) {
    if (!row || !row.symbol || /^[0-9.]+$/.test(row.symbol)) return false;
    if (!rowAllowedByVisibility(row)) return false;
    if (row.amount > 0 || row.value > 0) return true;
    if (row.amountText) return true;
    if (row.valueText && row.valueText !== "$-") return true;
    return row.symbol === "DO" && row.chainID === "Do-Chain";
  }

  function rowKey(row) {
    return [row.chainID, row.category, row.denom || row.symbol, row.validator, lower(row.name)].join("|");
  }

  function betterRow(left, right) {
    if (!left) return right;
    if (!right) return left;
    if (right.value !== left.value) return right.value > left.value ? right : left;
    if (right.amount !== left.amount) return right.amount > left.amount ? right : left;
    return left;
  }

  function uniqueRows(rows) {
    var byKey = {};
    rows.forEach(function (row) {
      byKey[rowKey(row)] = betterRow(byKey[rowKey(row)], row);
    });
    return Object.keys(byKey).map(function (key) { return byKey[key]; }).sort(compareRows);
  }

  function compareRows(a, b) {
    if (b.value !== a.value) return b.value - a.value;
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.name.localeCompare(b.name);
  }

  function spendableRows() {
    return rawRowsFromSnapshots("spendable").filter(function (row) {
      return row.category === "wallet" || row.category === "asset" || row.category === "balance" || row.category === "spendable";
    });
  }

  function stakingRows() {
    return rawRowsFromSnapshots("staking").filter(function (row) {
      return row.category === "staking" || row.category === "staked";
    });
  }

  function unbondingRows() {
    return rawRowsFromSnapshots("staking").filter(function (row) {
      return row.category === "unbonding";
    });
  }

  function rewardRows() {
    return rawRowsFromSnapshots("staking").filter(function (row) {
      return row.category === "reward" || row.category === "rewards";
    });
  }

  function sumRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce(function (sum, row) {
      return sum + (Number(row && row.value) || 0);
    }, 0);
  }

  function addAddressValues(source, out) {
    if (!isObject(source)) return;
    Object.keys(source).forEach(function (key) {
      var value = clean(source[key]);
      if (value) out[value.toLowerCase()] = true;
    });
  }

  function walletCountFromSnapshots() {
    var count = 0;
    collectSnapshots().forEach(function (snapshot) {
      var addresses = {};
      addAddressValues(snapshot.addresses, addresses);
      addAddressValues(snapshot.activeAddresses, addresses);
      addAddressValues(snapshot.allAddresses, addresses);
      addAddressValues(snapshot.addressMap, addresses);
      count = Math.max(count, Object.keys(addresses).length);
      count = Math.max(count, Number(snapshot.walletCount || snapshot.addressCount || 0) || 0);
    });
    return count;
  }

  function existingWalletCount() {
    var match = bodyText(document.body).match(/(\d+)\s+wallets?,\s*\d+\s+assets?,\s*\d+\s+validators?/i);
    return match ? Number(match[1]) || 0 : 0;
  }

  function addValidator(value, seen) {
    value = lower(value);
    if (value) seen[value] = true;
  }

  function addValidatorsFromRaw(raw, seen) {
    if (!isObject(raw)) return;
    addValidator(raw.validator, seen);
    addValidator(raw.validatorAddress, seen);
    addValidator(raw.validator_address, seen);
    if (Array.isArray(raw.validators)) raw.validators.forEach(function (validator) { addValidator(validator, seen); });
    if (isObject(raw.validatorBreakdown)) {
      ["delegations", "delegationsByAddress", "unbondings", "unbondingsByAddress", "rewards", "rewardsByAddress"].forEach(function (key) {
        var value = raw.validatorBreakdown[key];
        if (Array.isArray(value)) value.forEach(function (entry) { addValidatorsFromRaw(entry, seen); });
        else if (isObject(value)) Object.keys(value).forEach(function (subKey) {
          addValidator(subKey, seen);
          addValidatorsFromRaw(value[subKey], seen);
        });
      });
    }
  }

  function validatorCount(rows) {
    var seen = {};
    var fallback = 0;
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      addValidator(row && row.validator, seen);
      if (Array.isArray(row && row.validators)) row.validators.forEach(function (validator) { addValidator(validator, seen); });
      addValidatorsFromRaw(row && row.raw, seen);
      fallback = Math.max(fallback, Number(row && row.validatorCount) || 0);
    });
    return Math.max(Object.keys(seen).length, fallback);
  }

  function dashboardMetrics() {
    var assets = spendableRows();
    var staked = stakingRows();
    var rewards = rewardRows();
    var unbonding = unbondingRows();
    var stakedValue = sumRows(staked);
    var rewardsValue = sumRows(rewards);
    var unbondingValue = sumRows(unbonding);
    var availableValue = sumRows(assets);
    return {
      assets: assets,
      staked: staked,
      rewards: rewards,
      unbonding: unbonding,
      assetCount: assets.length,
      walletCount: walletCountFromSnapshots() || existingWalletCount(),
      validatorCount: validatorCount(staked.concat(rewards).concat(unbonding)),
      availableValue: availableValue,
      stakedValue: stakedValue,
      rewardsValue: rewardsValue,
      unbondingValue: unbondingValue,
      totalValue: availableValue + stakedValue + rewardsValue + unbondingValue
    };
  }

  function textNodes(root) {
    var out = [];
    if (!root) return out;
    try {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          return clean(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      while (walker.nextNode()) out.push(walker.currentNode);
    } catch (error) {}
    return out;
  }

  function isMoneyText(value) {
    value = clean(value);
    return /^\$-?$/.test(value) || /^\$\s?-?[\d,]+(?:\.\d+)?$/.test(value);
  }

  function isNumberText(value) {
    return /^\d+(?:,\d{3})*$/.test(clean(value));
  }

  function isDecimalTail(value) {
    return /^\.\d+$/.test(clean(value));
  }

  function visible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 80) return false;
    try {
      var style = window.getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    } catch (error) {
      return true;
    }
  }

  function bodyText(node) {
    return clean(node && (node.innerText || node.textContent || ""));
  }

  function textMatches(node, value) {
    return lower(node && (node.innerText || node.textContent || "")) === lower(value);
  }

  function isDashboardRoute() {
    var path = lower((window.location && window.location.pathname) || "/").replace(/\/+$/, "") || "/";
    return path === "/" || path === "/dashboard";
  }

  function hasPageLevelDashboardContent(text) {
    return (
      text.indexOf("portfolio") >= 0 ||
      text.indexOf("do-wallet overview") >= 0 ||
      text.indexOf("wallet overview") >= 0 ||
      text.indexOf("individual chain addresses") >= 0 ||
      text.indexOf("spendable wallet assets") >= 0 ||
      text.indexOf("validator positions") >= 0 ||
      (text.indexOf("portfolio value") >= 0 && text.indexOf("send") >= 0 && text.indexOf("receive") >= 0)
    );
  }

  function cardIsSafeHost(node, title, subtitle) {
    if (!node || !visible(node)) return false;
    if (node.closest && node.closest("nav,aside,header,footer")) return false;
    var text = lower(bodyText(node));
    if (text.indexOf(lower(title)) < 0 || text.indexOf(lower(subtitle)) < 0) return false;
    if (hasPageLevelDashboardContent(text)) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width < 320 || rect.height < 170) return false;
    if (rect.height > Math.max(620, Math.floor((window.innerHeight || 900) * 0.72))) return false;
    return true;
  }

  function findOverviewCard(title, subtitle) {
    if (!isDashboardRoute()) return null;
    var candidates = [];
    Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,strong")).forEach(function (heading) {
      if (!textMatches(heading, title)) return;
      var node = heading.parentElement;
      for (var depth = 0; node && node !== document.body && depth < 7; depth += 1) {
        if (cardIsSafeHost(node, title, subtitle)) candidates.push(node);
        node = node.parentElement;
      }
    });
    return candidates.filter(function (node, index, list) {
      return list.indexOf(node) === index;
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    })[0] || null;
  }

  function findPortfolioSummaryCard() {
    if (!isDashboardRoute()) return null;
    var candidates = [];
    Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,strong,span,small,div")).forEach(function (node) {
      if (!textMatches(node, "DO-WALLET OVERVIEW")) return;
      var parent = node.parentElement;
      for (var depth = 0; parent && parent !== document.body && depth < 8; depth += 1) {
        if (visible(parent)) {
          var text = lower(bodyText(parent));
          if (text.indexOf("staked") >= 0 && text.indexOf("rewards") >= 0 && text.indexOf("unbonding") >= 0) candidates.push(parent);
        }
        parent = parent.parentElement;
      }
    });
    return candidates.filter(function (node, index, list) {
      return list.indexOf(node) === index;
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    })[0] || null;
  }

  function setFirstTextAfterLabel(root, label, matcher, value) {
    var nodes = textNodes(root);
    var labelIndex = -1;
    for (var index = 0; index < nodes.length; index += 1) {
      if (lower(nodes[index].nodeValue) === lower(label)) {
        labelIndex = index;
        break;
      }
    }
    if (labelIndex < 0) return false;
    for (var next = labelIndex + 1; next < Math.min(nodes.length, labelIndex + 12); next += 1) {
      if (!matcher(nodes[next].nodeValue)) continue;
      nodes[next].nodeValue = value;
      if (isMoneyText(value) && nodes[next + 1] && isDecimalTail(nodes[next + 1].nodeValue)) nodes[next + 1].nodeValue = "";
      return true;
    }
    return false;
  }

  function patchPortfolioSummary(metrics) {
    var card = findPortfolioSummaryCard();
    if (!card) return false;
    var nodes = textNodes(card);
    var changed = false;
    for (var index = 0; index < nodes.length; index += 1) {
      var value = clean(nodes[index].nodeValue);
      if (/^\d+\s+wallets?,\s*\d+\s+assets?,\s*\d+\s+validators?$/i.test(value)) {
        nodes[index].nodeValue = [
          metrics.walletCount || 0,
          (metrics.walletCount || 0) === 1 ? " wallet, " : " wallets, ",
          metrics.assetCount,
          metrics.assetCount === 1 ? " asset, " : " assets, ",
          metrics.validatorCount,
          metrics.validatorCount === 1 ? " validator" : " validators"
        ].join("");
        changed = true;
        break;
      }
    }
    changed = setFirstTextAfterLabel(card, "DO-WALLET OVERVIEW", isMoneyText, formatUSD(metrics.totalValue)) || changed;
    changed = setFirstTextAfterLabel(card, "Staked", isMoneyText, formatUSD(metrics.stakedValue)) || changed;
    changed = setFirstTextAfterLabel(card, "Rewards", isMoneyText, formatUSD(metrics.rewardsValue)) || changed;
    changed = setFirstTextAfterLabel(card, "Unbonding", isMoneyText, formatUSD(metrics.unbondingValue)) || changed;
    card.setAttribute("data-do-wallet-dashboard-summary", VERSION);
    return changed;
  }

  function findMetricCard(label) {
    var candidates = [];
    Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,strong,span,small,div,p")).forEach(function (node) {
      if (!textMatches(node, label)) return;
      var parent = node.parentElement;
      for (var depth = 0; parent && parent !== document.body && depth < 7; depth += 1) {
        if (visible(parent)) {
          var rect = parent.getBoundingClientRect();
          var text = lower(bodyText(parent));
          if (text.indexOf(lower(label)) >= 0 && rect.width >= 160 && rect.width <= 420 && rect.height >= 80 && rect.height <= 230) candidates.push(parent);
        }
        parent = parent.parentElement;
      }
    });
    return candidates.filter(function (node, index, list) {
      return list.indexOf(node) === index;
    }).sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    })[0] || null;
  }

  function patchMetricCard(label, matcher, value) {
    var card = findMetricCard(label);
    if (!card) return false;
    var changed = setFirstTextAfterLabel(card, label, matcher, value);
    card.setAttribute("data-do-wallet-dashboard-metric", lower(label).replace(/[^a-z0-9]+/g, "-"));
    return changed;
  }

  function patchDashboardSummary(metrics) {
    var changed = patchPortfolioSummary(metrics);
    changed = patchMetricCard("Total assets", isMoneyText, formatUSD(metrics.totalValue)) || changed;
    changed = patchMetricCard("Wallets", isNumberText, String(metrics.walletCount || 0)) || changed;
    changed = patchMetricCard("Available", isMoneyText, formatUSD(metrics.availableValue)) || changed;
    changed = patchMetricCard("Staked assets", isMoneyText, formatUSD(metrics.stakedValue)) || changed;
    changed = patchMetricCard("Staking rewards", isMoneyText, formatUSD(metrics.rewardsValue)) || changed;
    changed = patchMetricCard("Unbonding", isMoneyText, formatUSD(metrics.unbondingValue)) || changed;
    changed = patchMetricCard("Validators", isNumberText, String(metrics.validatorCount || 0)) || changed;
    return changed;
  }

  function iconHTML(row) {
    if (!row.icon) return '<span class="do-wallet-dashboard-overview-icon-fallback">' + escapeHTML(row.symbol.slice(0, 3)) + '</span>';
    return '<img class="do-wallet-dashboard-overview-icon" src="' + escapeHTML(row.icon) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';" />';
  }

  function rowHTML(row) {
    var changeClass = row.changeText && row.changeText.indexOf("-") >= 0 ? "negative" : "positive";
    var key = rowVisibilityKey(row);
    assetActionPayloads[key] = rowDecisionPayload(row);
    return [
      '<button type="button" class="do-wallet-dashboard-overview-row" data-do-wallet-dashboard-asset-key="' + escapeHTML(key) + '">',
        '<div class="do-wallet-dashboard-overview-left">',
          iconHTML(row),
          '<span>',
            '<strong>' + escapeHTML(row.name) + (row.priceText ? ' <small>' + escapeHTML(row.priceText) + '</small>' : '') + '</strong>',
            row.changeText ? '<em class="' + changeClass + '">' + escapeHTML(row.changeText) + '</em>' : '<small>' + escapeHTML(row.chainName) + '</small>',
          '</span>',
        '</div>',
        '<div class="do-wallet-dashboard-overview-right">',
          '<strong>' + escapeHTML(row.valueText) + '</strong>',
          '<small>' + escapeHTML(row.amountText || row.symbol) + '</small>',
        '</div>',
      '</button>'
    ].join("");
  }

  function renderCard(card, kind, title, subtitle, rows) {
    if (!card || !rows.length) return false;
    if (!cardIsSafeHost(card, title, subtitle)) return false;
    var signature = VERSION + ":" + kind + ":" + rows.map(function (row) {
      return rowKey(row) + ":" + row.valueText + ":" + row.amountText;
    }).join("||");
    if (card.getAttribute(SIGNATURE_ATTR) === signature) return true;
    card.setAttribute(CARD_ATTR, kind);
    card.setAttribute(SIGNATURE_ATTR, signature);
    card.innerHTML = [
      '<div class="do-wallet-dashboard-overview-head">',
        '<div>',
          '<h2>' + escapeHTML(title) + '</h2>',
          '<p>' + escapeHTML(subtitle) + '</p>',
        '</div>',
        '<strong>' + escapeHTML(rows.length + " " + (rows.length === 1 ? "position" : "positions")) + '</strong>',
      '</div>',
      '<div class="do-wallet-dashboard-overview-list">',
        rows.map(rowHTML).join(""),
      '</div>'
    ].join("");
    return true;
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "[" + CARD_ATTR + "]{box-sizing:border-box;min-height:260px!important;padding:28px 32px!important;color:#fff!important;overflow:hidden!important;}",
      "[" + CARD_ATTR + "] *{box-sizing:border-box;}",
      ".do-wallet-dashboard-overview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin:0 0 18px;}",
      ".do-wallet-dashboard-overview-head h2{margin:0 0 4px;font-size:28px;line-height:1.1;font-weight:var(--bold,500);letter-spacing:0;color:#fff;}",
      ".do-wallet-dashboard-overview-head p{margin:0;color:#aaa0bd;font-size:14px;line-height:1.3;font-weight:var(--bold,500);}",
      ".do-wallet-dashboard-overview-head>strong{color:#aaa0bd;font-size:14px;line-height:1.2;font-weight:var(--bold,500);white-space:nowrap;}",
      ".do-wallet-dashboard-overview-list{max-height:330px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;border-top:1px solid rgba(135,57,190,.24);}",
      ".do-wallet-dashboard-overview-row{display:flex;align-items:center;justify-content:space-between;gap:18px;width:100%;min-height:70px;margin:0;padding:12px 0;border:0;border-bottom:1px solid rgba(135,57,190,.24);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}",
      ".do-wallet-dashboard-overview-row:hover,.do-wallet-dashboard-overview-row:focus-visible{background:rgba(163,60,255,.09);outline:0;}",
      ".do-wallet-dashboard-overview-left{display:flex;align-items:center;gap:14px;min-width:0;flex:1 1 auto;}",
      ".do-wallet-dashboard-overview-left>span{display:flex;flex-direction:column;gap:4px;min-width:0;}",
      ".do-wallet-dashboard-overview-left strong{display:block;color:#fff;font-size:15px;line-height:1.12;font-weight:var(--bold,500);letter-spacing:0;white-space:normal;}",
      ".do-wallet-dashboard-overview-left strong small{color:#c9bbef;font-size:11px;font-weight:var(--bold,500);}",
      ".do-wallet-dashboard-overview-left small,.do-wallet-dashboard-overview-left em{font-size:12px;line-height:1.1;font-style:normal;font-weight:var(--bold,500);color:#c9bbef;}",
      ".do-wallet-dashboard-overview-left em.negative{color:#ff4b55;}",
      ".do-wallet-dashboard-overview-left em.positive{color:#00c68f;}",
      ".do-wallet-dashboard-overview-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:128px;max-width:42%;text-align:right;}",
      ".do-wallet-dashboard-overview-right strong{display:block;color:#fff;font-size:15px;line-height:1.1;font-weight:var(--bold,500);}",
      ".do-wallet-dashboard-overview-right small{display:block;color:#c9bbef;font-size:12px;line-height:1.1;font-weight:var(--bold,500);white-space:normal;}",
      ".do-wallet-dashboard-overview-icon,.do-wallet-dashboard-overview-icon-fallback{width:34px;height:34px;min-width:34px;border-radius:50%;object-fit:cover;background:#2c2140;}",
      ".do-wallet-dashboard-overview-icon-fallback{display:grid;place-items:center;color:#fff;font-size:10px;font-weight:var(--bold,500);}",
      "@media(max-width:760px){[" + CARD_ATTR + "]{padding:20px 18px!important}.do-wallet-dashboard-overview-head h2{font-size:24px}.do-wallet-dashboard-overview-row{gap:10px}.do-wallet-dashboard-overview-right{min-width:104px}.do-wallet-dashboard-overview-left strong{font-size:14px}.do-wallet-dashboard-overview-right strong{font-size:14px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function render() {
    if (!document.body) return;
    if (!isDashboardRoute()) return;
    installStyle();
    var metrics = dashboardMetrics();
    var assets = metrics.assets;
    var staked = metrics.staked;
    var unbonding = metrics.unbonding;
    var changed = false;
    changed = patchDashboardSummary(metrics) || changed;
    changed = renderCard(findOverviewCard("Assets", "All spendable balances"), "assets", "Assets", "All spendable balances", assets) || changed;
    changed = renderCard(findOverviewCard("Validators staked with", "Delegations across all chains"), "staking", "Validators staked with", "Delegations across all chains", staked) || changed;
    changed = renderCard(findOverviewCard("Unbonding", "Assets currently leaving staking"), "unbonding", "Unbonding", "Assets currently leaving staking", unbonding) || changed;
    try {
      window.__doWalletDashboardOverviewAssetsDebug = {
        version: VERSION,
        changed: changed,
        assets: metrics.assetCount,
        staking: staked.length,
        rewards: metrics.rewards.length,
        unbonding: unbonding.length,
        walletCount: metrics.walletCount,
        validatorCount: metrics.validatorCount,
        totalValue: metrics.totalValue,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {}
  }

  function schedule() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, RENDER_DELAY_MS);
  }

  window.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("load", schedule);
  window.addEventListener("focus", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("do_wallet_portfolio_snapshot", schedule);
  window.addEventListener("do_wallet_quarantine_change", schedule);
  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest && event.target.closest("[data-do-wallet-dashboard-asset-key]");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    var key = target.getAttribute("data-do-wallet-dashboard-asset-key") || "";
    var quarantine = window.doWalletQuarantine;
    if (quarantine && typeof quarantine.inspectAsset === "function" && key) {
      quarantine.inspectAsset(assetActionPayloads[key] || { symbol: key, denom: key });
    }
    schedule();
  }, true);
  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY || event.key === SNAPSHOTS_BY_WALLET_KEY) schedule();
  });

  try {
    var observer = new MutationObserver(function (mutations) {
      var shouldRender = false;
      Array.prototype.slice.call(mutations || []).forEach(function (mutation) {
        if (shouldRender) return;
        var nodes = Array.prototype.slice.call(mutation.addedNodes || []);
        nodes.forEach(function (node) {
          if (shouldRender || !node || node.nodeType !== 1) return;
          if (node.hasAttribute && node.hasAttribute(CARD_ATTR)) return;
          var text = lower(node.textContent || "");
          if (text.indexOf("all spendable balances") >= 0 || text.indexOf("delegations across all chains") >= 0 || text.indexOf("assets currently leaving staking") >= 0) shouldRender = true;
        });
      });
      if (shouldRender) schedule();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {}

  schedule();
  window.setTimeout(schedule, 1200);
  window.setTimeout(schedule, 3000);
})();
