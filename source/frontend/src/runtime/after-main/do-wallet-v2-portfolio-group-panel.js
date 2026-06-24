(function () {
  "use strict";

  if (window.__doWalletPortfolioGroupPanel20260624SideL1DetailGroups1) return;
  window.__doWalletPortfolioGroupPanel20260624SideL1DetailGroups1 = true;

  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var STYLE_ID = "do-wallet-portfolio-group-panel-style";
  var RENDER_ATTR = "data-do-wallet-grouped-assets-panel";
  var TABLE_ROW_SELECTOR = ".DoPortfolioAssetRow20260528";
  var TABLE_GROUP_ATTR = "data-do-wallet-l1-table-grouped";
  var SIDE_LIST_SELECTOR = "[class*='AssetList_assetlist__list']";
  var SIDE_GROUP_ATTR = "data-do-wallet-l1-side-grouped";
  var SIDE_SIGNATURE_ATTR = "data-do-wallet-l1-side-signature";
  var SIDE_PENDING_SIGNATURE_ATTR = "data-do-wallet-l1-side-pending-signature";
  var SIDE_PENDING_AT_ATTR = "data-do-wallet-l1-side-pending-at";
  var DETAIL_PANEL_ATTR = "data-do-wallet-l1-detail-assets";
  var DETAIL_GROUP_ATTR = "data-do-wallet-l1-detail-group";
  var SIDE_STABLE_DELAY = 1000;
  var VERSION = "20260624SideL1DetailGroups1";
  var lastSignature = "";
  var renderTimer = null;
  var tableTimer = null;
  var rendering = false;
  var tableApplying = false;
  var sideApplying = false;
  var observer = null;
  var tableObserver = null;

  function setDebug(reason, details) {
    window.__doWalletPortfolioGroupPanelDebug = Object.assign({
      version: VERSION,
      reason: reason,
      checkedAt: new Date().toISOString()
    }, details || {});
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function text(value) {
    return value == null ? "" : String(value);
  }

  function normalizedText(value) {
    return text(value).replace(/\s+/g, " ").trim();
  }

  function lowerText(value) {
    return normalizedText(value).toLowerCase();
  }

  function isVisibleElement(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    try {
      var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
      if (style && (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)) return false;
    } catch (error) {}
    return true;
  }

  function symbolOf(asset) {
    return text(asset && (asset.symbol || asset.tokenSymbol || asset.ticker || asset.denom || asset.name)).trim();
  }

  function upperSymbol(asset) {
    return symbolOf(asset).toUpperCase();
  }

  function chainNameOf(asset) {
    return text(asset && (asset.chainName || asset.chain || asset.networkName || asset.network || asset.chainID || asset.chainId)).trim();
  }

  function chainIdOf(asset) {
    return text(asset && (asset.chainID || asset.chainId || asset.network || asset.chainName || asset.chain)).trim();
  }

  function amountOf(asset) {
    return text(asset && (asset.displayAmount || asset.amountText || asset.amount || asset.balance || asset.quantity || asset.tokenAmount)).trim();
  }

  function valueOf(asset) {
    var value = asset && (asset.valueText || asset.usdValueText || asset.fiatValueText || asset.valueFormatted);
    if (value) return text(value);
    var numeric = asset && (asset.value || asset.usdValue || asset.fiatValue);
    if (numeric == null || numeric === "" || !isFinite(Number(numeric))) return "$-";
    var number = Number(numeric);
    if (number > 0 && number < 0.01) return "< $0.01";
    return "$" + number.toLocaleString(undefined, { maximumFractionDigits: number >= 1 ? 2 : 8 });
  }

  function priceOf(asset) {
    var value = asset && (asset.priceText || asset.usdPriceText || asset.priceFormatted);
    if (value) return text(value);
    var numeric = asset && (asset.price || asset.usdPrice);
    if (numeric == null || numeric === "" || !isFinite(Number(numeric))) return "";
    var number = Number(numeric);
    if (number > 0 && number < 0.01) return "< $0.01";
    return "$" + number.toLocaleString(undefined, { maximumFractionDigits: number >= 1 ? 4 : 10 });
  }

  function percentOf(asset) {
    var value = asset && (asset.changeText || asset.priceChangeText || asset.percentText || asset.change24hText);
    if (value) return text(value);
    var numeric = asset && (asset.change24h || asset.percentChange24h || asset.priceChangePercent);
    if (numeric == null || numeric === "" || !isFinite(Number(numeric))) return "";
    return Number(numeric).toFixed(2) + "%";
  }

  function iconOf(asset, fallback) {
    return text(asset && (asset.icon || asset.image || asset.logo || asset.logoURI || asset.logoUrl || asset.tokenIcon || asset.chainIcon)) || fallback || "";
  }

  function childrenOf(asset) {
    if (!asset) return [];
    var keys = ["childAssets", "expandedAssets", "subAssets", "tokens", "children"];
    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(asset[keys[i]]) && asset[keys[i]].length) return asset[keys[i]];
    }
    return [];
  }

  function assetArrays(snapshot) {
    if (!snapshot) return [];
    var keys = [
      "groupedPortfolioAssets",
      "chainGroupedAssets",
      "sidePanelAssets",
      "portfolioPanelAssets",
      "portfolioAssets",
      "assets",
      "spendableAssets"
    ];
    var rows = [];
    var seen = {};
    for (var i = 0; i < keys.length; i += 1) {
      if (!Array.isArray(snapshot[keys[i]])) continue;
      snapshot[keys[i]].forEach(function (asset) {
        var key = [
          upperSymbol(asset),
          chainIdOf(asset),
          chainNameOf(asset),
          amountOf(asset),
          valueOf(asset),
          childrenOf(asset).length
        ].join("|");
        if (seen[key]) return;
        seen[key] = true;
        rows.push(asset);
      });
    }
    return rows;
  }

  function nativeSymbolFor(chainId, chainName) {
    var id = text(chainId).toLowerCase();
    var name = text(chainName).toLowerCase();
    if (id === "do-chain" || id.indexOf("dochain") >= 0 || name.indexOf("do chain") >= 0 || name.indexOf("do-chain") >= 0 || name.indexOf("dochain") >= 0) return "DO";
    if (id === "columbus-5" || name.indexOf("terra classic") >= 0) return "LUNC";
    if (id === "phoenix-1" || name.indexOf("terra (luna)") >= 0) return "LUNA";
    if (id === "osmosis-1" || name.indexOf("osmosis") >= 0) return "OSMO";
    if (id === "secret-4" || name.indexOf("secret") >= 0) return "SCRT";
    if (id === "dungeon-1" || name.indexOf("dungeon") >= 0) return "DGN";
    if (id.indexOf("bitcoin") >= 0 || name.indexOf("bitcoin") >= 0) return "BTC";
    if (id.indexOf("ethereum") >= 0 || name.indexOf("ethereum") >= 0) return "ETH";
    if (id.indexOf("bnb") >= 0 || name.indexOf("bnb smart") >= 0 || name.indexOf("binance") >= 0) return "BNB";
    if (id.indexOf("solana") >= 0 || name.indexOf("solana") >= 0) return "SOL";
    if (id.indexOf("xrp") >= 0 || name.indexOf("xrp ledger") >= 0) return "XRP";
    if (id.indexOf("avalanche") >= 0 || name.indexOf("avalanche") >= 0) return "AVAX";
    if (id.indexOf("cosmos") >= 0 || name.indexOf("cosmos") >= 0) return "ATOM";
    if (id.indexOf("akash") >= 0 || name.indexOf("akash") >= 0) return "AKT";
    if (id.indexOf("polygon") >= 0 || name.indexOf("polygon") >= 0) return "MATIC";
    if (id.indexOf("cardano") >= 0 || name.indexOf("cardano") >= 0) return "ADA";
    if (id.indexOf("base") >= 0 || name.indexOf("base") >= 0) return "ETH";
    if (id.indexOf("arbitrum") >= 0 || name.indexOf("arbitrum") >= 0) return "ETH";
    if (id.indexOf("optimism") >= 0 || name.indexOf("optimism") >= 0) return "ETH";
    return "";
  }

  function mergeGroupRows(rows) {
    var groups = [];
    var byKey = {};

    rows.forEach(function (row) {
      if (!row) return;
      var children = childrenOf(row);
      if (children.length) {
        var groupKey = chainIdOf(row) || chainNameOf(row) || upperSymbol(row);
        byKey[groupKey] = byKey[groupKey] || {
          parent: row,
          children: [],
          chainId: chainIdOf(row),
          chainName: chainNameOf(row),
          icon: iconOf(row),
        };
        byKey[groupKey].parent = byKey[groupKey].parent || row;
        byKey[groupKey].children = byKey[groupKey].children.concat(children);
        return;
      }

      var chainId = chainIdOf(row);
      var chainName = chainNameOf(row);
      var key = chainId || chainName || upperSymbol(row);
      var native = nativeSymbolFor(chainId, chainName);
      var symbol = upperSymbol(row);
      var isNative = native && symbol === native;

      byKey[key] = byKey[key] || {
        parent: null,
        children: [],
        chainId: chainId,
        chainName: chainName,
        icon: iconOf(row),
      };

      if (isNative && !byKey[key].parent) {
        byKey[key].parent = row;
      } else if (isNative && byKey[key].parent) {
        byKey[key].children.unshift(row);
      } else {
        byKey[key].children.push(row);
      }
    });

    Object.keys(byKey).forEach(function (key) {
      var group = byKey[key];
      if (!group.parent && group.children.length) {
        var native = nativeSymbolFor(group.chainId, group.chainName);
        group.parent = {
          symbol: native || upperSymbol(group.children[0]),
          name: group.chainName || chainNameOf(group.children[0]) || symbolOf(group.children[0]),
          chainName: group.chainName || chainNameOf(group.children[0]),
          chainID: group.chainId || chainIdOf(group.children[0]),
          icon: group.icon || iconOf(group.children[0]),
          valueText: "",
          displayAmount: "",
          syntheticGroup: true
        };
      }
      if (group.parent) groups.push(group);
    });

    groups.sort(function (a, b) {
      var as = upperSymbol(a.parent);
      var bs = upperSymbol(b.parent);
      if (as === "DO") return -1;
      if (bs === "DO") return 1;
      return as.localeCompare(bs);
    });

    return groups;
  }

  function findRightPane() {
    var all = Array.prototype.slice.call(document.querySelectorAll("aside, section, main, div"));
    var best = null;
    var bestScore = -1;
    all.forEach(function (node) {
      if (!isVisibleElement(node)) return;
      var rect = node.getBoundingClientRect();
      var content = lowerText(node.textContent || "");
      var dashboardPane =
        content.indexOf("do-wallet overview") >= 0 ||
        content.indexOf("all spendable balances") >= 0;
      if (rect.width < 260 || rect.height < 260) return;
      if (rect.left < window.innerWidth * 0.35 && !dashboardPane) return;
      var score = 0;
      if (content.indexOf("portfolio value") >= 0 || content.indexOf("do-wallet overview") >= 0) score += 5;
      if (content.indexOf("all spendable balances") >= 0) score += 5;
      if (content.indexOf("assets") >= 0) score += 4;
      if (content.indexOf("manage") >= 0) score += 3;
      if (content.indexOf("send") >= 0 && content.indexOf("receive") >= 0) score += 2;
      if (content.indexOf("connect a wallet to see your portfolio") >= 0) score += 1;
      score -= Math.abs(rect.right - window.innerWidth) / 200;
      if (score > bestScore) {
        bestScore = score;
        best = node;
      }
    });
    return bestScore > 6 ? best : null;
  }

  function findCandidatePanes() {
    var all = Array.prototype.slice.call(document.querySelectorAll("aside, section, main, div"));
    var candidates = [];
    all.forEach(function (node) {
      if (!isVisibleElement(node)) return;
      var rect = node.getBoundingClientRect();
      var content = lowerText(node.textContent || "");
      var dashboardPane =
        content.indexOf("do-wallet overview") >= 0 ||
        content.indexOf("all spendable balances") >= 0;
      if (rect.width < 260 || rect.height < 160) return;
      if (rect.left < window.innerWidth * 0.35 && !dashboardPane) return;
      var score = 0;
      if (content.indexOf("portfolio value") >= 0) score += 8;
      if (content.indexOf("do-wallet overview") >= 0) score += 5;
      if (content.indexOf("all spendable balances") >= 0) score += 5;
      if (content.indexOf("assets") >= 0) score += 4;
      if (content.indexOf("manage") >= 0) score += 3;
      if (content.indexOf("send") >= 0 && content.indexOf("receive") >= 0) score += 2;
      if (content.indexOf("connect a wallet to see your portfolio") >= 0) score += 1;
      score -= Math.abs(rect.right - window.innerWidth) / 250;
      if (score > 6) candidates.push({ node: node, score: score });
    });
    candidates.sort(function (a, b) { return b.score - a.score; });
    return candidates.map(function (candidate) { return candidate.node; });
  }

  function findAssetsSection(pane) {
    if (!pane) return null;
    var currentPanel = pane.querySelector("[" + RENDER_ATTR + '="1"]');
    if (currentPanel && currentPanel.parentElement) return currentPanel.parentElement;

    var nodes = Array.prototype.slice.call(pane.querySelectorAll("section, div, aside"));
    var labelMatches = [];
    nodes.forEach(function (node) {
      if (!isVisibleElement(node)) return;
      var direct = Array.prototype.slice.call(node.childNodes).some(function (child) {
        return child.nodeType === 3 && child.nodeValue && lowerText(child.nodeValue) === "assets";
      });
      var ownLabel = node.children.length === 0 && lowerText(node.textContent || "") === "assets";
      var headingLabel = Array.prototype.slice.call(node.querySelectorAll("h1,h2,h3,h4,h5,h6,span,strong")).some(function (child) {
        return lowerText(child.textContent || "") === "assets";
      });
      if (direct || ownLabel || headingLabel) {
        labelMatches.push(node);
      }
    });

    var best = null;
    var bestScore = -1;
    function consider(node) {
      if (!isVisibleElement(node)) return;
      var rect = node.getBoundingClientRect();
      if (rect.width < 230 || rect.height < 130) return;
      var content = lowerText(node.textContent || "");
      var isDashboardAssets =
        content.indexOf("assets") >= 0 &&
        (
          content.indexOf("all spendable balances") >= 0 ||
          content.indexOf("no assets found") >= 0 ||
          content.indexOf("positions") >= 0
        ) &&
        content.indexOf("unbonding assets") < 0 &&
        content.indexOf("staked assets") < 0 &&
        content.indexOf("total assets") < 0;
      var isLegacyAssets = content.indexOf("assets") >= 0 && content.indexOf("manage") >= 0;
      var isPortfolioValueAssets =
        content.indexOf("portfolio value") >= 0 &&
        content.indexOf("assets") >= 0 &&
        (
          content.indexOf("manage") >= 0 ||
          content.indexOf("send") >= 0 ||
          content.indexOf("receive") >= 0 ||
          content.indexOf("positions") >= 0
        );
      if (!isDashboardAssets && !isLegacyAssets && !isPortfolioValueAssets) return;
      if (content.indexOf("portfolio value") >= 0 && rect.height > 900 && !node.hasAttribute(RENDER_ATTR)) return;
      var score = rect.top + Math.min(rect.height, 500) / 20;
      if (isPortfolioValueAssets) score += 650;
      if (isDashboardAssets) score += 500;
      if (content.indexOf("all spendable balances") >= 0) score += 250;
      if (isLegacyAssets) score += 100;
      if (node.hasAttribute(RENDER_ATTR)) score += 1000;
      if (score > bestScore) {
        bestScore = score;
        best = node;
      }
    }

    consider(pane);

    labelMatches.forEach(function (label) {
      var node = label;
      for (var depth = 0; node && node !== pane && depth < 8; depth += 1) {
        consider(node);
        node = node.parentElement;
      }
    });

    if (best) return best;
    nodes.forEach(consider);
    return best;
  }

  function findAssetsSections() {
    var sections = [];
    var seen = [];
    function add(section) {
      if (!section) return;
      for (var i = 0; i < seen.length; i += 1) {
        if (seen[i] === section) return;
        if (seen[i].contains && seen[i].contains(section)) return;
        if (section.contains && section.contains(seen[i])) {
          sections.splice(i, 1);
          seen.splice(i, 1);
          i -= 1;
        }
      }
      seen.push(section);
      sections.push(section);
    }

    Array.prototype.slice.call(document.querySelectorAll("[" + RENDER_ATTR + '="1"]')).forEach(function (panel) {
      if (panel && panel.parentElement) add(panel.parentElement);
    });

    findCandidatePanes().forEach(function (pane) {
      add(findAssetsSection(pane));
    });

    if (!sections.length) add(findAssetsSection(findRightPane()));
    return sections;
  }

  function escapeHTML(value) {
    return text(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function renderIcon(asset, groupClass) {
    var icon = iconOf(asset);
    var label = upperSymbol(asset).slice(0, 3) || "?";
    if (!icon) return '<span class="' + groupClass + ' do-wallet-grouped-fallback-icon">' + escapeHTML(label) + "</span>";
    return '<img class="' + groupClass + '" src="' + escapeHTML(icon) + '" alt="" loading="eager" decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\';" /><span class="' + groupClass + ' do-wallet-grouped-fallback-icon" style="display:none">' + escapeHTML(label) + "</span>";
  }

  function rowHTML(asset, child) {
    var symbol = symbolOf(asset);
    var chain = chainNameOf(asset);
    var price = priceOf(asset);
    var pct = percentOf(asset);
    var amount = amountOf(asset);
    var value = valueOf(asset);
    var iconClass = child ? "do-wallet-grouped-child-icon" : "do-wallet-grouped-icon";
    return [
      '<div class="do-wallet-grouped-row ' + (child ? "is-child" : "is-parent") + '">',
      '  <div class="do-wallet-grouped-left">',
      renderIcon(asset, iconClass),
      '    <div class="do-wallet-grouped-meta">',
      '      <div class="do-wallet-grouped-title"><span>' + escapeHTML(symbol) + '</span>' + (price ? '<small>' + escapeHTML(price) + "</small>" : "") + "</div>",
      '      <div class="do-wallet-grouped-chain">' + escapeHTML(chain || symbol) + "</div>",
      pct ? '      <div class="do-wallet-grouped-change ' + (pct.indexOf("-") >= 0 ? "negative" : "positive") + '">' + escapeHTML(pct) + "</div>" : "",
      "    </div>",
      "  </div>",
      '  <div class="do-wallet-grouped-right">',
      '    <strong>' + escapeHTML(value) + "</strong>",
      '    <span>' + escapeHTML(amount ? amount + " " + symbol : "") + "</span>",
      "  </div>",
      "</div>"
    ].join("");
  }

  function panelHTML(groups) {
    var rows = [];
    groups.forEach(function (group) {
      rows.push('<div class="do-wallet-grouped-chain-block">');
      rows.push(rowHTML(group.parent, false));
      group.children.forEach(function (child) {
        if (child === group.parent) return;
        rows.push(rowHTML(child, true));
      });
      rows.push("</div>");
    });
    return [
      '<div class="do-wallet-grouped-panel" ' + RENDER_ATTR + '="1">',
      '  <div class="do-wallet-grouped-header"><h3>Assets</h3><button type="button" class="do-wallet-grouped-manage">Manage <span>≡+</span></button></div>',
      '  <div class="do-wallet-grouped-list">' + rows.join("") + "</div>",
      "</div>"
    ].join("");
  }

  function assetIdentity(asset) {
    return [
      upperSymbol(asset),
      normalizeGroupKey(chainIdOf(asset) || chainNameOf(asset)),
      amountOf(asset),
      valueOf(asset)
    ].join("|");
  }

  function sameDisplayedAsset(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (assetIdentity(a) === assetIdentity(b)) return true;
    return upperSymbol(a) === upperSymbol(b) &&
      normalizeGroupKey(chainIdOf(a) || chainNameOf(a)) === normalizeGroupKey(chainIdOf(b) || chainNameOf(b)) &&
      amountOf(a) === amountOf(b);
  }

  function detailChildrenFor(group) {
    var children = [];
    var seen = {};
    (group.children || []).forEach(function (child) {
      if (!child || sameDisplayedAsset(group.parent, child)) return;
      var key = assetIdentity(child);
      if (seen[key]) return;
      seen[key] = true;
      children.push(child);
    });
    return children;
  }

  function detailGroupKey(group) {
    return normalizeGroupKey([
      group && (group.chainId || chainIdOf(group.parent)),
      group && (group.chainName || chainNameOf(group.parent)),
      group && upperSymbol(group.parent)
    ].join("|"));
  }

  function detailSignature(group, children) {
    return [
      detailGroupKey(group),
      children.map(function (child) { return assetIdentity(child); }).join(">")
    ].join("::");
  }

  function detailCoinHTML(asset) {
    var symbol = symbolOf(asset);
    var chain = chainNameOf(asset);
    var price = priceOf(asset);
    var pct = percentOf(asset);
    var amount = amountOf(asset);
    var value = valueOf(asset);
    return [
      '<div class="do-wallet-detail-l1-coin">',
      '  <div class="do-wallet-detail-l1-coin-left">',
      renderIcon(asset, "do-wallet-detail-l1-coin-icon"),
      '    <div class="do-wallet-detail-l1-coin-meta">',
      '      <div class="do-wallet-detail-l1-coin-title"><span>' + escapeHTML(symbol) + '</span>' + (price ? '<small>' + escapeHTML(price) + "</small>" : "") + "</div>",
      pct ? '      <div class="do-wallet-detail-l1-coin-change ' + (pct.indexOf("-") >= 0 ? "negative" : "positive") + '">' + escapeHTML(pct) + "</div>" : '      <div class="do-wallet-detail-l1-coin-chain">' + escapeHTML(chain || symbol) + "</div>",
      "    </div>",
      "  </div>",
      '  <div class="do-wallet-detail-l1-coin-right">',
      '    <strong>' + escapeHTML(value) + "</strong>",
      '    <span>' + escapeHTML(amount ? amount + " " + symbol : "") + "</span>",
      "  </div>",
      "</div>"
    ].join("");
  }

  function detailPanelHTML(group, children) {
    return [
      '<div class="do-wallet-detail-l1-assets" ' + DETAIL_PANEL_ATTR + '="1" ' + DETAIL_GROUP_ATTR + '="' + escapeHTML(detailGroupKey(group)) + '" data-do-wallet-l1-detail-signature="' + escapeHTML(detailSignature(group, children)) + '">',
      '  <div class="do-wallet-detail-l1-assets-title">Coins</div>',
      '  <div class="do-wallet-detail-l1-assets-list">' + children.map(detailCoinHTML).join("") + "</div>",
      "</div>"
    ].join("");
  }

  function findDetailPanes() {
    var candidates = [];
    Array.prototype.slice.call(document.querySelectorAll("aside, section, main, div")).forEach(function (node) {
      if (!isVisibleElement(node)) return;
      var rect = node.getBoundingClientRect();
      if (rect.width < 260 || rect.height < 300) return;
      var content = lowerText(node.textContent || "");
      if (content.indexOf("chains") < 0) return;
      if (content.indexOf("search for a chain") >= 0) return;
      var score = 0;
      if (content.indexOf("chains") >= 0) score += 10;
      if (content.indexOf("send") >= 0 && content.indexOf("receive") >= 0) score += 5;
      if (content.indexOf("buy / sell") >= 0 || content.indexOf("burn do") >= 0) score += 3;
      if (rect.width <= 620) score += 5;
      if (content.indexOf("portfolio value") >= 0) score -= 4;
      score -= Math.abs(rect.right - window.innerWidth) / 220;
      score -= Math.max(0, rect.width - 620) / 80;
      if (score > 8) candidates.push({ node: node, score: score });
    });
    candidates.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var ar = a.node.getBoundingClientRect();
      var br = b.node.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    });
    return candidates.length ? [candidates[0].node] : [];
  }

  function findDetailActionBar(pane) {
    var best = null;
    var bestArea = Infinity;
    Array.prototype.slice.call(pane.querySelectorAll("footer, section, div")).forEach(function (node) {
      if (!isVisibleElement(node) || node === pane) return;
      var content = lowerText(node.textContent || "");
      if (content.indexOf("send") < 0 || content.indexOf("receive") < 0) return;
      if (content.indexOf("buy / sell") < 0 && content.indexOf("burn do") < 0) return;
      var rect = node.getBoundingClientRect();
      var area = rect.width * rect.height;
      if (area < bestArea) {
        best = node;
        bestArea = area;
      }
    });
    return best;
  }

  function selectedDetailGroup(groups, pane) {
    var content = lowerText(pane.textContent || "");
    var best = null;
    var bestScore = -1;
    groups.forEach(function (group) {
      var children = detailChildrenFor(group);
      if (!children.length) return;
      var parent = group.parent;
      var symbol = lowerText(symbolOf(parent));
      var upper = upperSymbol(parent);
      var chainName = lowerText(chainNameOf(parent) || group.chainName);
      var chainId = lowerText(chainIdOf(parent) || group.chainId);
      var amount = lowerText(amountOf(parent));
      var value = lowerText(valueOf(parent));
      var score = 0;
      if (chainName && content.indexOf(chainName) >= 0) score += 12;
      if (chainId && content.indexOf(chainId) >= 0) score += 8;
      if (symbol && content.indexOf(symbol) >= 0) score += 5;
      if (upper && content.indexOf((" " + upper).toLowerCase()) >= 0) score += 3;
      if (amount && content.indexOf(amount) >= 0) score += 6;
      if (value && value !== "$-" && content.indexOf(value.toLowerCase()) >= 0) score += 4;
      if (score > bestScore) {
        best = group;
        bestScore = score;
      }
    });
    return bestScore >= 9 ? best : null;
  }

  function renderDetailPanel(pane, group) {
    var children = detailChildrenFor(group);
    var existing = pane.querySelector("[" + DETAIL_PANEL_ATTR + '="1"]');
    if (!children.length) {
      if (existing) existing.remove();
      return false;
    }

    var signature = detailSignature(group, children);
    if (existing && existing.getAttribute("data-do-wallet-l1-detail-signature") === signature) return false;

    var wrapper = document.createElement("div");
    wrapper.innerHTML = detailPanelHTML(group, children);
    var panel = wrapper.firstElementChild;
    if (!panel) return false;

    if (existing) {
      existing.parentElement.replaceChild(panel, existing);
      return true;
    }

    var actionBar = findDetailActionBar(pane);
    if (actionBar && actionBar.parentElement) {
      actionBar.parentElement.insertBefore(panel, actionBar);
    } else {
      pane.appendChild(panel);
    }
    return true;
  }

  function applyDetailPanelGrouping() {
    var snapshot = readJSON(SNAPSHOT_KEY, null);
    if (!snapshot) {
      Array.prototype.slice.call(document.querySelectorAll("[" + DETAIL_PANEL_ATTR + '="1"]')).forEach(function (node) { node.remove(); });
      window.__doWalletDetailAssetGroupDebug = { version: VERSION, reason: "no-snapshot", checkedAt: new Date().toISOString() };
      return { panes: 0, rendered: 0 };
    }
    var groups = mergeGroupRows(assetArrays(snapshot)).filter(function (group) {
      return detailChildrenFor(group).length > 0;
    });
    var panes = findDetailPanes();
    var rendered = 0;
    var matched = 0;

    panes.forEach(function (pane) {
      var group = selectedDetailGroup(groups, pane);
      if (!group) return;
      matched += 1;
      injectStyle();
      if (renderDetailPanel(pane, group)) rendered += 1;
    });

    Array.prototype.slice.call(document.querySelectorAll("[" + DETAIL_PANEL_ATTR + '="1"]')).forEach(function (node) {
      var keep = panes.some(function (pane) { return pane.contains(node); });
      if (!keep) node.remove();
    });

    if (matched) document.documentElement.setAttribute("data-do-wallet-detail-asset-groups", VERSION);
    window.__doWalletDetailAssetGroupDebug = {
      version: VERSION,
      reason: matched ? "rendered" : (panes.length ? "no-selected-group" : "no-detail-pane"),
      checkedAt: new Date().toISOString(),
      panes: panes.length,
      groups: groups.length,
      matched: matched,
      rendered: rendered
    };
    return { panes: panes.length, groups: groups.length, matched: matched, rendered: rendered };
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".do-wallet-grouped-panel{width:100%;height:100%;box-sizing:border-box;padding:0;color:inherit;background:transparent;font-family:inherit;overflow:auto;}",
      ".do-wallet-grouped-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;}",
      ".do-wallet-grouped-header h3{margin:0;font-size:18px;line-height:1.1;font-weight:800;letter-spacing:0;}",
      ".do-wallet-grouped-manage{border:0;background:transparent;color:#a33cff;font:inherit;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px;padding:4px;}",
      ".do-wallet-grouped-list{display:flex;flex-direction:column;gap:14px;}",
      ".do-wallet-grouped-chain-block{border-bottom:1px solid rgba(135,57,190,.28);padding-bottom:10px;}",
      ".do-wallet-grouped-chain-block:last-child{border-bottom:0;}",
      ".do-wallet-grouped-chain-block .do-wallet-grouped-row.is-parent+.do-wallet-grouped-row.is-child{margin-top:2px;}",
      ".do-wallet-grouped-row{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:48px;padding:6px 0;}",
      ".do-wallet-grouped-row.is-child{margin-left:48px;min-height:38px;opacity:.94;}",
      ".do-wallet-grouped-left{display:flex;align-items:center;gap:13px;min-width:0;}",
      ".do-wallet-grouped-icon,.do-wallet-grouped-child-icon{display:block;flex:0 0 auto;border-radius:50%;object-fit:cover;background:#2c2140;}",
      ".do-wallet-grouped-icon{width:42px;height:42px;}",
      ".do-wallet-grouped-child-icon{width:26px;height:26px;}",
      ".do-wallet-grouped-fallback-icon{place-items:center;color:#fff;font-weight:900;font-size:11px;}",
      ".do-wallet-grouped-meta{min-width:0;}",
      ".do-wallet-grouped-title{display:flex;align-items:baseline;gap:8px;min-width:0;}",
      ".do-wallet-grouped-title span{font-size:20px;font-weight:900;line-height:1;white-space:nowrap;}",
      ".do-wallet-grouped-row.is-child .do-wallet-grouped-title span{font-size:15px;}",
      ".do-wallet-grouped-title small{color:var(--text-muted,#7f7a8f);font-size:12px;font-weight:600;white-space:nowrap;}",
      ".do-wallet-grouped-chain{margin-top:4px;color:var(--text-muted,#7f7a8f);font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:185px;}",
      ".do-wallet-grouped-row.is-child .do-wallet-grouped-chain{font-size:12px;}",
      ".do-wallet-grouped-change{margin-top:4px;font-size:13px;font-weight:800;}",
      ".do-wallet-grouped-change.negative{color:#ff4b55;}",
      ".do-wallet-grouped-change.positive{color:#2f83ff;}",
      ".do-wallet-grouped-right{text-align:right;min-width:92px;}",
      ".do-wallet-grouped-right strong{display:block;font-size:18px;line-height:1.1;font-weight:900;white-space:nowrap;}",
      ".do-wallet-grouped-row.is-child .do-wallet-grouped-right strong{font-size:14px;}",
      ".do-wallet-grouped-right span{display:block;margin-top:5px;color:var(--text-muted,#7f7a8f);font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;}",
      ".DoPortfolioAssetRow20260528.do-wallet-l1-parent-row{border-top:1px solid rgba(135,57,190,.22);}",
      ".DoPortfolioAssetRow20260528.do-wallet-l1-parent-row:first-child{border-top:0;}",
      ".DoPortfolioAssetRow20260528.do-wallet-l1-child-row{opacity:.9;}",
      ".DoPortfolioAssetRow20260528.do-wallet-l1-child-row td:first-child{padding-left:44px!important;position:relative;}",
      ".DoPortfolioAssetRow20260528.do-wallet-l1-child-row td:first-child:before{content:'';position:absolute;left:22px;top:50%;width:12px;border-top:1px solid rgba(135,57,190,.45);}",
      ".DoPortfolioAssetRow20260528.do-wallet-l1-child-row td:first-child>*{transform:scale(.94);transform-origin:left center;}",
      ".do-wallet-side-l1-shell{display:flex;flex-direction:column;width:100%;}",
      ".do-wallet-side-l1-group{border-bottom:1px solid rgba(135,57,190,.28);}",
      ".do-wallet-side-l1-group:last-child{border-bottom:0;}",
      ".do-wallet-side-l1-group>article{width:100%;}",
      ".do-wallet-side-l1-parent-row{background:rgba(163,60,255,.045);}",
      ".do-wallet-side-l1-parent-row[data-do-wallet-l1-child-count]:not([data-do-wallet-l1-child-count='0']){cursor:pointer;}",
      ".do-wallet-side-l1-child-row{display:none!important;}",
      ".do-wallet-side-l1-synthetic-parent{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:14px 0;background:rgba(163,60,255,.045);}",
      ".do-wallet-side-l1-synthetic-left{display:flex;align-items:center;gap:12px;min-width:0;}",
      ".do-wallet-side-l1-synthetic-icon,.do-wallet-side-l1-synthetic-fallback{width:28px;height:28px;border-radius:50%;background:#2c2140;flex:0 0 auto;}",
      ".do-wallet-side-l1-synthetic-icon{object-fit:cover;display:block;}",
      ".do-wallet-side-l1-synthetic-fallback{display:grid;place-items:center;color:#fff;font-size:10px;font-weight:900;}",
      ".do-wallet-side-l1-synthetic-title{display:block;font-size:15px;font-weight:900;line-height:1.1;color:inherit;white-space:normal;}",
      ".do-wallet-side-l1-synthetic-chain{display:block;margin-top:4px;color:var(--text-muted,#aba3c2);font-size:12px;font-weight:800;}",
      ".do-wallet-side-l1-synthetic-count{color:var(--text-muted,#aba3c2);font-size:12px;font-weight:800;white-space:nowrap;}",
      ".do-wallet-detail-l1-assets{box-sizing:border-box;margin:18px 20px 108px;color:inherit;font-family:inherit;}",
      ".do-wallet-detail-l1-assets-title{margin:0 0 12px;font-size:16px;line-height:1.1;font-weight:900;letter-spacing:0;}",
      ".do-wallet-detail-l1-assets-list{display:flex;flex-direction:column;border-top:1px solid rgba(135,57,190,.32);}",
      ".do-wallet-detail-l1-coin{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:12px 0;border-bottom:1px solid rgba(135,57,190,.32);}",
      ".do-wallet-detail-l1-coin-left{display:flex;align-items:center;gap:12px;min-width:0;}",
      ".do-wallet-detail-l1-coin-icon{width:30px;height:30px;border-radius:50%;object-fit:cover;background:#2c2140;flex:0 0 auto;}",
      ".do-wallet-detail-l1-coin-icon.do-wallet-grouped-fallback-icon{display:grid;place-items:center;color:#fff;font-size:10px;font-weight:900;}",
      ".do-wallet-detail-l1-coin-meta{min-width:0;}",
      ".do-wallet-detail-l1-coin-title{display:flex;align-items:baseline;gap:7px;min-width:0;}",
      ".do-wallet-detail-l1-coin-title span{font-size:15px;font-weight:900;line-height:1;white-space:nowrap;}",
      ".do-wallet-detail-l1-coin-title small{color:var(--text-muted,#aba3c2);font-size:11px;font-weight:700;white-space:nowrap;}",
      ".do-wallet-detail-l1-coin-chain,.do-wallet-detail-l1-coin-change{margin-top:4px;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px;}",
      ".do-wallet-detail-l1-coin-chain{color:var(--text-muted,#aba3c2);}",
      ".do-wallet-detail-l1-coin-change.negative{color:#ff4b55;}",
      ".do-wallet-detail-l1-coin-change.positive{color:#2f83ff;}",
      ".do-wallet-detail-l1-coin-right{text-align:right;min-width:86px;}",
      ".do-wallet-detail-l1-coin-right strong{display:block;font-size:14px;line-height:1.1;font-weight:900;white-space:nowrap;}",
      ".do-wallet-detail-l1-coin-right span{display:block;margin-top:5px;color:var(--text-muted,#aba3c2);font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:126px;}",
      "@media(max-width:680px){.do-wallet-grouped-panel{padding:22px 18px}.do-wallet-grouped-row.is-child{margin-left:30px}.do-wallet-grouped-title span{font-size:18px}.do-wallet-grouped-right strong{font-size:16px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function normalizeGroupKey(value) {
    return lowerText(value).replace(/[^a-z0-9]+/g, " ").trim();
  }

  function sideFallbackChainForSymbol(symbol) {
    var upper = text(symbol).toUpperCase();
    var terraClassic = {
      LUNC: true,
      UST: true,
      USTC: true,
      KRT: true,
      MYT: true,
      IDT: true,
      THT: true,
      JPT: true
    };
    if (terraClassic[upper]) {
      return {
        key: "terra classic",
        name: "Terra Classic",
        nativeSymbol: "LUNC",
        icon: "/station-assets/img/chains/TerraClassic.svg"
      };
    }
    var bySymbol = {
      DO: ["Do Chain", "DO", "/station-assets/img/chains/DoChain.png"],
      BTC: ["Bitcoin", "BTC", "/station-assets/img/chains/Bitcoin.svg"],
      ETH: ["Ethereum", "ETH", "/station-assets/img/chains/Ethereum.svg"],
      BNB: ["BNB Smart Chain", "BNB", "/station-assets/img/chains/Bnb.svg"],
      SOL: ["Solana", "SOL", "/station-assets/img/chains/Solana.svg"],
      XRP: ["XRP Ledger", "XRP", "/station-assets/img/chains/XRP.svg"],
      AVAX: ["Avalanche C-Chain", "AVAX", "/station-assets/img/chains/Avalanche.svg"],
      ATOM: ["Cosmos", "ATOM", "/station-assets/img/chains/Cosmos.svg"],
      OSMO: ["Osmosis", "OSMO", "/station-assets/img/chains/Osmosis.svg"],
      AKT: ["Akash", "AKT", "/station-assets/img/chains/Akash.svg"],
      ACT: ["Akash", "AKT", "/station-assets/img/chains/Akash.svg"],
      MATIC: ["Polygon", "MATIC", "/station-assets/img/chains/Polygon.svg"],
      ADA: ["Cardano", "ADA", "/station-assets/img/chains/Cardano.svg"],
      LUNA: ["Terra", "LUNA", "/station-assets/img/chains/Terra.svg"]
    };
    if (!bySymbol[upper]) return null;
    return {
      key: normalizeGroupKey(bySymbol[upper][0]),
      name: bySymbol[upper][0],
      nativeSymbol: bySymbol[upper][1],
      icon: bySymbol[upper][2]
    };
  }

  function sideSymbolOfRow(row) {
    var symbolNode = row && row.querySelector && row.querySelector("[class*='Asset_symbol__name']");
    var symbol = normalizedText(symbolNode && symbolNode.textContent || "");
    if (symbol) return symbol.toUpperCase();
    var textValue = normalizedText(row && row.textContent || "");
    return (textValue.match(/^[A-Z0-9]{2,12}/) || [""])[0].toUpperCase();
  }

  function sideChainMetaOfRow(row, symbol) {
    var chainIcon = row && row.querySelector && row.querySelector("[class*='Asset_chain__icon']");
    var tokenIcon = row && row.querySelector && row.querySelector("[class*='TokenIcon_icon']");
    var fallback = sideFallbackChainForSymbol(symbol) || {};
    var chainName = normalizedText(chainIcon && (chainIcon.getAttribute("alt") || chainIcon.alt) || "") || fallback.name || symbol;
    var chainIconSrc = text(chainIcon && chainIcon.getAttribute("src"));
    var tokenIconSrc = text(tokenIcon && tokenIcon.getAttribute("src"));
    var nativeSymbol = nativeSymbolFor(chainName, chainName) || fallback.nativeSymbol || symbol;
    return {
      key: normalizeGroupKey(chainName || fallback.key || symbol),
      name: chainName,
      nativeSymbol: text(nativeSymbol).toUpperCase(),
      icon: chainIconSrc || fallback.icon || tokenIconSrc
    };
  }

  function sideRowInfo(row, index) {
    var symbol = sideSymbolOfRow(row);
    var meta = sideChainMetaOfRow(row, symbol);
    return {
      row: row,
      index: index,
      symbol: symbol,
      chainKey: meta.key || normalizeGroupKey(symbol),
      chainName: meta.name || symbol,
      nativeSymbol: meta.nativeSymbol || symbol,
      chainIcon: meta.icon || ""
    };
  }

  function sideRowSignature(info) {
    return [
      info.index,
      info.chainKey,
      info.chainName,
      info.nativeSymbol,
      info.symbol
    ].join("|");
  }

  function sideSignatureForInfos(infos) {
    return infos.map(sideRowSignature).join("||");
  }

  function findNativeSideAssetLists() {
    return Array.prototype.slice.call(document.querySelectorAll(SIDE_LIST_SELECTOR)).filter(function (list) {
      if (!isVisibleElement(list)) return false;
      var rows = list.querySelectorAll && list.querySelectorAll("article");
      if (!rows || !rows.length) return false;
      var node = list;
      for (var depth = 0; node && depth < 8; depth += 1) {
        var content = lowerText(node.textContent || "");
        if (content.indexOf("portfolio value") >= 0 && content.indexOf("assets") >= 0) return true;
        node = node.parentElement;
      }
      return false;
    });
  }

  function sideRowsInList(list) {
    return Array.prototype.slice.call(list.querySelectorAll("article")).filter(function (row) {
      return row && row.classList && !row.classList.contains("do-wallet-side-l1-synthetic-parent");
    });
  }

  function sideGroupsForInfos(infos) {
    var byKey = {};
    infos.forEach(function (info) {
      var key = info.chainKey || normalizeGroupKey(info.symbol);
      byKey[key] = byKey[key] || {
        key: key,
        chainName: info.chainName,
        nativeSymbol: info.nativeSymbol,
        chainIcon: info.chainIcon,
        rows: [],
        firstIndex: info.index
      };
      byKey[key].rows.push(info);
      byKey[key].firstIndex = Math.min(byKey[key].firstIndex, info.index);
      if (!byKey[key].chainIcon && info.chainIcon) byKey[key].chainIcon = info.chainIcon;
      if (!byKey[key].chainName && info.chainName) byKey[key].chainName = info.chainName;
      if (!byKey[key].nativeSymbol && info.nativeSymbol) byKey[key].nativeSymbol = info.nativeSymbol;
    });

    return Object.keys(byKey).map(function (key) {
      var group = byKey[key];
      group.parent = group.rows.filter(function (info) {
        return info.nativeSymbol && info.symbol === info.nativeSymbol;
      })[0] || null;
      if (group.parent) {
        group.children = group.rows.filter(function (info) { return info !== group.parent; });
      } else {
        group.children = group.rows.slice();
      }
      return group;
    }).sort(function (a, b) {
      return a.firstIndex - b.firstIndex;
    });
  }

  function createSideFallbackIcon(label) {
    var fallback = document.createElement("span");
    fallback.className = "do-wallet-side-l1-synthetic-fallback";
    fallback.textContent = (label || "?").slice(0, 3).toUpperCase();
    return fallback;
  }

  function createSideSyntheticParent(group) {
    var parent = document.createElement("article");
    parent.className = "do-wallet-side-l1-synthetic-parent";
    parent.setAttribute("data-do-wallet-l1-synthetic-parent", "1");

    var left = document.createElement("div");
    left.className = "do-wallet-side-l1-synthetic-left";
    if (group.chainIcon) {
      var icon = document.createElement("img");
      icon.className = "do-wallet-side-l1-synthetic-icon";
      icon.src = group.chainIcon;
      icon.alt = "";
      icon.loading = "eager";
      icon.decoding = "async";
      icon.onerror = function () {
        if (icon.parentElement) icon.parentElement.replaceChild(createSideFallbackIcon(group.nativeSymbol || group.chainName), icon);
      };
      left.appendChild(icon);
    } else {
      left.appendChild(createSideFallbackIcon(group.nativeSymbol || group.chainName));
    }

    var meta = document.createElement("div");
    var title = document.createElement("strong");
    title.className = "do-wallet-side-l1-synthetic-title";
    title.textContent = group.chainName + (group.nativeSymbol && group.chainName.toUpperCase().indexOf(group.nativeSymbol) < 0 ? " (" + group.nativeSymbol + ")" : "");
    var chain = document.createElement("span");
    chain.className = "do-wallet-side-l1-synthetic-chain";
    chain.textContent = group.children.length === 1 ? "1 asset" : group.children.length + " assets";
    meta.appendChild(title);
    meta.appendChild(chain);
    left.appendChild(meta);

    var count = document.createElement("span");
    count.className = "do-wallet-side-l1-synthetic-count";
    count.textContent = group.nativeSymbol || "";

    parent.appendChild(left);
    parent.appendChild(count);
    return parent;
  }

  function markSideRow(info, group, parent, hasChildren) {
    info.row.classList.remove("do-wallet-side-l1-parent-row", "do-wallet-side-l1-child-row");
    info.row.setAttribute(SIDE_GROUP_ATTR, VERSION);
    info.row.setAttribute("data-do-wallet-l1-group", group.chainName || group.key);
    info.row.setAttribute("data-do-wallet-l1-native-symbol", group.nativeSymbol || "");
    if (parent && hasChildren) {
      info.row.classList.add("do-wallet-side-l1-parent-row");
      info.row.setAttribute("data-do-wallet-l1-child-count", String((group.children || []).length));
      info.row.removeAttribute("data-do-wallet-l1-parent-symbol");
    } else if (!parent) {
      info.row.classList.add("do-wallet-side-l1-child-row");
      info.row.setAttribute("data-do-wallet-l1-parent-symbol", group.nativeSymbol || "");
      info.row.removeAttribute("data-do-wallet-l1-child-count");
    } else {
      info.row.removeAttribute("data-do-wallet-l1-parent-symbol");
      info.row.setAttribute("data-do-wallet-l1-child-count", "0");
    }
  }

  function applyNativeSidePanelGrouping() {
    if (sideApplying) return { skipped: true };
    sideApplying = true;
    try {
      var lists = findNativeSideAssetLists();
      var panelCount = 0;
      var groupCount = 0;
      var rowCount = 0;
      var childCount = 0;
      var changedCount = 0;

      if (!lists.length) {
        window.__doWalletSideAssetGroupDebug = {
          version: VERSION,
          reason: "no-side-list",
          checkedAt: new Date().toISOString()
        };
        return { panels: 0, groups: 0, rows: 0, changed: 0 };
      }

      injectStyle();
      lists.forEach(function (list) {
        var rows = sideRowsInList(list);
        if (rows.length < 2) {
          if (list.getAttribute(SIDE_GROUP_ATTR) === VERSION) {
            panelCount += 1;
            rowCount += rows.length;
          }
          return;
        }
        var infos = rows.map(sideRowInfo);
        var signature = sideSignatureForInfos(infos);
        if (list.getAttribute(SIDE_GROUP_ATTR) === VERSION && list.getAttribute(SIDE_SIGNATURE_ATTR) === signature) {
          panelCount += 1;
          rowCount += rows.length;
          return;
        }
        if (list.getAttribute(SIDE_GROUP_ATTR) !== VERSION) {
          var now = Date.now();
          var pendingSignature = list.getAttribute(SIDE_PENDING_SIGNATURE_ATTR) || "";
          var pendingAt = Number(list.getAttribute(SIDE_PENDING_AT_ATTR) || 0);
          if (pendingSignature !== signature) {
            list.setAttribute(SIDE_PENDING_SIGNATURE_ATTR, signature);
            list.setAttribute(SIDE_PENDING_AT_ATTR, String(now));
            schedule(SIDE_STABLE_DELAY + 100);
            return;
          }
          if (now - pendingAt < SIDE_STABLE_DELAY) {
            schedule(SIDE_STABLE_DELAY - (now - pendingAt) + 100);
            return;
          }
        }

        var groups = sideGroupsForInfos(infos);
        var shell = document.createElement("div");
        shell.className = "do-wallet-side-l1-shell";

        groups.forEach(function (group) {
          var block = document.createElement("div");
          block.className = "do-wallet-side-l1-group";
          block.setAttribute("data-do-wallet-l1-chain", group.chainName || group.key);
          if (group.parent) {
            markSideRow(group.parent, group, true, group.children.length > 0);
            block.appendChild(group.parent.row);
          } else {
            block.appendChild(createSideSyntheticParent(group));
          }
          group.children.forEach(function (child) {
            markSideRow(child, group, false, true);
            childCount += 1;
          });
          shell.appendChild(block);
          groupCount += 1;
        });

        list.innerHTML = "";
        list.appendChild(shell);
        list.setAttribute(SIDE_GROUP_ATTR, VERSION);
        list.setAttribute(SIDE_SIGNATURE_ATTR, signature);
        list.removeAttribute(SIDE_PENDING_SIGNATURE_ATTR);
        list.removeAttribute(SIDE_PENDING_AT_ATTR);
        panelCount += 1;
        rowCount += rows.length;
        changedCount += 1;
      });

      if (panelCount) {
        document.documentElement.setAttribute("data-do-wallet-side-asset-groups", VERSION);
      }
      window.__doWalletSideAssetGroupDebug = {
        version: VERSION,
        reason: panelCount ? "rendered" : "no-rows",
        checkedAt: new Date().toISOString(),
        panels: panelCount,
        groups: groupCount,
        rows: rowCount,
        children: childCount,
        changed: changedCount
      };
      return { panels: panelCount, groups: groupCount, rows: rowCount, children: childCount, changed: changedCount };
    } finally {
      sideApplying = false;
    }
  }

  function setTableDebug(reason, details) {
    window.__doWalletPortfolioTableGroupDebug = Object.assign({
      version: VERSION,
      reason: reason,
      checkedAt: new Date().toISOString()
    }, details || {});
  }

  function tableContainerFor(row) {
    var node = row;
    while (node && node.parentElement) {
      if (node.tagName === "TBODY") return node;
      if (node.tagName === "TABLE") return row.parentElement;
      node = node.parentElement;
    }
    return row.parentElement;
  }

  function tableRowsIn(container) {
    return Array.prototype.slice.call(container ? container.children : []).filter(function (child) {
      return child && child.matches && child.matches(TABLE_ROW_SELECTOR);
    });
  }

  function tableRowInfo(row, index) {
    var cells = row && row.children ? Array.prototype.slice.call(row.children) : [];
    var symbol = normalizedText(row.dataset && row.dataset.symbol || "");
    if (!symbol && cells[0]) symbol = normalizedText(cells[0].textContent || "").split(/\s+/)[0] || "";
    return {
      row: row,
      index: index,
      symbol: symbol.toUpperCase(),
      chainName: normalizedText(row.dataset && row.dataset.chain || (cells[1] && cells[1].textContent) || ""),
      denom: normalizedText(row.dataset && row.dataset.denom || ""),
      amount: normalizedText(row.dataset && row.dataset.amount || (cells[2] && cells[2].textContent) || ""),
      value: normalizedText(row.dataset && row.dataset.value || (cells[3] && cells[3].textContent) || "")
    };
  }

  function tableGroupKey(info) {
    return normalizeGroupKey(info.chainName || info.denom || info.symbol);
  }

  function tableRowKey(info) {
    return [tableGroupKey(info), info.symbol, info.denom, info.amount, info.value, info.index].join("|");
  }

  function isNativeTableRow(info) {
    var native = nativeSymbolFor(info.chainName, info.chainName);
    return !!native && info.symbol === native;
  }

  function collectTableContainers() {
    var containers = [];
    Array.prototype.slice.call(document.querySelectorAll(TABLE_ROW_SELECTOR)).forEach(function (row) {
      var container = tableContainerFor(row);
      if (!container) return;
      if (containers.indexOf(container) < 0) containers.push(container);
    });
    return containers;
  }

  function tableGroupsFor(rows) {
    var byKey = {};
    rows.map(tableRowInfo).forEach(function (info) {
      var key = tableGroupKey(info);
      if (!key) return;
      byKey[key] = byKey[key] || {
        key: key,
        chainName: info.chainName,
        rows: [],
        firstIndex: info.index
      };
      byKey[key].rows.push(info);
      byKey[key].firstIndex = Math.min(byKey[key].firstIndex, info.index);
    });

    return Object.keys(byKey).map(function (key) {
      var group = byKey[key];
      group.parent = group.rows.filter(isNativeTableRow)[0] || group.rows[0];
      group.children = group.rows.filter(function (info) { return info !== group.parent; });
      return group;
    }).sort(function (a, b) {
      var ap = a.parent && a.parent.symbol === "DO" ? -10000 : a.firstIndex;
      var bp = b.parent && b.parent.symbol === "DO" ? -10000 : b.firstIndex;
      return ap - bp;
    });
  }

  function markTableGroup(group) {
    var parentChain = group.chainName || group.key;
    group.rows.forEach(function (info) {
      info.row.setAttribute(TABLE_GROUP_ATTR, VERSION);
      info.row.setAttribute("data-do-wallet-l1-group", parentChain);
      info.row.classList.remove("do-wallet-l1-parent-row", "do-wallet-l1-child-row");
      if (info === group.parent) {
        info.row.classList.add("do-wallet-l1-parent-row");
        info.row.removeAttribute("data-do-wallet-l1-parent-symbol");
      } else {
        info.row.classList.add("do-wallet-l1-child-row");
        info.row.setAttribute("data-do-wallet-l1-parent-symbol", group.parent ? group.parent.symbol : "");
      }
    });
  }

  function applyPortfolioTableGrouping() {
    if (tableApplying) return;
    tableApplying = true;
    try {
      var containers = collectTableContainers();
      var tableCount = 0;
      var groupedCount = 0;
      var rowCount = 0;
      var changedCount = 0;

      containers.forEach(function (container) {
        var rows = tableRowsIn(container);
        if (rows.length < 2) return;
        var groups = tableGroupsFor(rows);
        var hasChildren = groups.some(function (group) { return group.children.length > 0; });
        if (!hasChildren) return;

        var desiredInfos = [];
        groups.forEach(function (group) {
          markTableGroup(group);
          desiredInfos.push(group.parent);
          group.children.forEach(function (child) { desiredInfos.push(child); });
          groupedCount += group.children.length > 0 ? 1 : 0;
        });

        var currentSignature = rows.map(function (row, index) {
          return tableRowKey(tableRowInfo(row, index));
        }).join(">");
        var desiredSignature = desiredInfos.map(tableRowKey).join(">");
        if (currentSignature !== desiredSignature) {
          var fragment = document.createDocumentFragment();
          desiredInfos.forEach(function (info) { fragment.appendChild(info.row); });
          container.appendChild(fragment);
          changedCount += 1;
        }
        tableCount += 1;
        rowCount += rows.length;
      });

      if (!tableCount) {
        setTableDebug("no-table", { tables: containers.length });
        return;
      }
      document.documentElement.setAttribute("data-do-wallet-portfolio-table-groups", VERSION);
      setTableDebug("rendered", {
        tables: tableCount,
        groups: groupedCount,
        rows: rowCount,
        changed: changedCount
      });
    } finally {
      tableApplying = false;
    }
  }

  function signatureOf(groups) {
    return groups.map(function (group) {
      return [
        upperSymbol(group.parent),
        valueOf(group.parent),
        amountOf(group.parent),
        group.children.map(function (child) {
          return upperSymbol(child) + ":" + valueOf(child) + ":" + amountOf(child);
        }).join("|")
      ].join(":");
    }).join("||");
  }

  function render() {
    if (rendering) return;
    rendering = true;
    try {
      var sideResult = applyNativeSidePanelGrouping();
      var detailResult = applyDetailPanelGrouping();
      if (sideResult && sideResult.panels > 0) {
        setDebug("native-side-rendered", { side: sideResult, detail: detailResult });
        return;
      }
      var snapshot = readJSON(SNAPSHOT_KEY, null);
      if (!snapshot) {
        setDebug("no-snapshot", { side: sideResult, detail: detailResult });
        return;
      }
      var rows = assetArrays(snapshot);
      var groups = mergeGroupRows(rows);
      if (!groups.length) {
        setDebug("no-groups", { rows: rows.length, snapshotKeys: Object.keys(snapshot || {}) });
        return;
      }
      var signature = signatureOf(groups);
      var sections = findAssetsSections();
      if (!sections.length) {
        setDebug("no-pane", { groups: groups.length });
        return;
      }
      if (signature === lastSignature && document.querySelectorAll("[" + RENDER_ATTR + '="1"]').length >= sections.length) return;
      injectStyle();
      sections.forEach(function (section) {
        var originalManage = Array.prototype.slice.call(section.querySelectorAll("button,a,[role='button']")).filter(function (node) {
          return (node.textContent || "").indexOf("Manage") >= 0;
        })[0];
        section.innerHTML = panelHTML(groups);
        var manage = section.querySelector(".do-wallet-grouped-manage");
        if (manage && originalManage) {
          manage.addEventListener("click", function () {
            try {
              originalManage.click();
            } catch (error) {}
          });
        }
      });
      lastSignature = signature;
      window.__doWalletPortfolioGroupPanelState = {
        version: VERSION,
        renderedAt: new Date().toISOString(),
        groups: groups.length,
        renderedPanels: sections.length,
        signature: signature
      };
      setDebug("rendered", { groups: groups.length, renderedPanels: sections.length });
      document.documentElement.setAttribute("data-do-wallet-portfolio-groups", VERSION);
    } finally {
      rendering = false;
    }
  }

  function hasSnapshot() {
    return !!readJSON(SNAPSHOT_KEY, null);
  }

  function ensureObserver() {
    if (observer) return;
    try {
      observer = new MutationObserver(function () { schedule(250); });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(function () {
        if (!observer) return;
        observer.disconnect();
        observer = null;
      }, 30000);
    } catch (error) {}
  }

  function mutationTouchesPortfolioTable(mutations) {
    for (var i = 0; i < mutations.length; i += 1) {
      var mutation = mutations[i];
      var nodes = Array.prototype.slice.call(mutation.addedNodes || []).concat(Array.prototype.slice.call(mutation.removedNodes || []));
      for (var j = 0; j < nodes.length; j += 1) {
        var node = nodes[j];
        if (!node || node.nodeType !== 1) continue;
        if (node.matches && node.matches(TABLE_ROW_SELECTOR)) return true;
        if (node.querySelector && node.querySelector(TABLE_ROW_SELECTOR)) return true;
      }
    }
    return false;
  }

  function ensureTableObserver() {
    if (tableObserver || !window.MutationObserver) return;
    var target = document.body || document.documentElement;
    if (!target) return;
    try {
      tableObserver = new MutationObserver(function (mutations) {
        if (tableApplying) return;
        if (mutationTouchesPortfolioTable(mutations)) scheduleTableGrouping(80);
      });
      tableObserver.observe(target, { childList: true, subtree: true });
    } catch (error) {}
  }

  function schedule(delay) {
    ensureObserver();
    if (renderTimer) return;
    renderTimer = setTimeout(function () {
      renderTimer = null;
      render();
    }, delay || 120);
  }

  function scheduleTableGrouping(delay) {
    ensureTableObserver();
    if (tableTimer) return;
    tableTimer = setTimeout(function () {
      tableTimer = null;
      applyPortfolioTableGrouping();
    }, delay || 120);
  }

  window.addEventListener("load", function () {
    schedule(300);
    scheduleTableGrouping(450);
  });
  window.addEventListener("storage", function (event) {
    if (!event || event.key === SNAPSHOT_KEY) {
      schedule(60);
      scheduleTableGrouping(80);
    }
  });
  window.addEventListener("do_wallet_portfolio_snapshot", function () {
    schedule(60);
    scheduleTableGrouping(80);
  });
  document.addEventListener("click", function () {
    schedule(180);
    window.setTimeout(function () { schedule(0); }, 750);
    window.setTimeout(function () { schedule(0); }, 1500);
    scheduleTableGrouping(400);
  }, true);

  schedule(500);
  scheduleTableGrouping(700);
})();
