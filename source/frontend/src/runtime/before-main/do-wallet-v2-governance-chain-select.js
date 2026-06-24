(function () {
  "use strict";

  if (window.__doWalletGovernanceChainSelect20260624AllProposals1) return;
  window.__doWalletGovernanceChainSelect20260624AllProposals1 = true;

  var WRAPPER_CLASS = "do-wallet-governance-chain-select";
  var HIDDEN_CLASS = "do-wallet-governance-chip-row-hidden";
  var ALL_PROPOSALS_CLASS = "do-wallet-governance-all-proposals";
  var ALL_PROPOSALS_ACTIVE_CLASS = "do-wallet-governance-all-proposals-active";
  var CACHE_TTL = 120000;
  var GOV_CHAINS = [
    { key: "dochain", label: "Do Chain", chainID: "Do-Chain", icon: "/station-assets/img/chains/DoChain.png" },
    { key: "akash", label: "Akash", chainID: "akashnet-2", icon: "/station-assets/img/chains/Akash.svg" },
    { key: "archway", label: "Archway", chainID: "archway-1", icon: "/station-assets/img/chains/Archway.png" },
    { key: "axelar", label: "Axelar", chainID: "axelar-dojo-1", icon: "/station-assets/img/chains/Axelar.png" },
    { key: "carbon", label: "Carbon", chainID: "carbon-1", icon: "/station-assets/img/chains/Carbon.png" },
    { key: "cheqd", label: "cheqd", chainID: "cheqd-mainnet-1", icon: "/station-assets/img/chains/Cheqd.png" },
    { key: "chihuahua", label: "Chihuahua", chainID: "chihuahua-1", icon: "/station-assets/img/chains/Chihuahua.png" },
    { key: "cosmos", label: "Cosmos", chainID: "cosmoshub-4", icon: "/station-assets/img/chains/Cosmos.svg" },
    { key: "crescent", label: "Crescent", chainID: "crescent-1", icon: "/station-assets/img/chains/Crescent.png" },
    { key: "decentr", label: "Decentr", chainID: "decentr-mainnet-1", icon: "/station-assets/img/chains/Decentr.png" },
    { key: "dungeon", label: "Dungeon", chainID: "dungeon-1", icon: "/station-assets/img/chains/Dungeon.png" },
    { key: "juno", label: "Juno", chainID: "juno-1", icon: "/station-assets/img/chains/Juno.png" },
    { key: "kujira", label: "Kujira", chainID: "kaiyo-1", icon: "/station-assets/img/chains/Kujira.png" },
    { key: "luna", label: "LUNA", chainID: "phoenix-1", icon: "/station-assets/img/chains/Terra.svg" },
    { key: "mars", label: "Mars", chainID: "mars-1", icon: "/station-assets/img/chains/Mars.png" },
    { key: "osmosis", label: "Osmosis", chainID: "osmosis-1", icon: "/station-assets/img/chains/Osmosis.svg" },
    { key: "secretnetwork", label: "Secret Network", chainID: "secret-4", icon: "/station-assets/img/chains/Secret.png" },
    { key: "sei", label: "Sei", chainID: "pacific-1", icon: "/station-assets/img/chains/Sei.png" },
    { key: "stafihub", label: "StaFiHub", chainID: "stafihub-1", icon: "/station-assets/img/chains/StaFiHub.png" },
    { key: "stride", label: "Stride", chainID: "stride-1", icon: "/station-assets/img/chains/Stride.png" },
    { key: "terraclassiclunc", label: "Terra Classic (LUNC)", chainID: "columbus-5", icon: "/station-assets/img/chains/TerraClassic.svg" }
  ];
  var GOV_CHAIN_BY_KEY = GOV_CHAINS.reduce(function (acc, chain) {
    acc[chain.key] = chain;
    return acc;
  }, Object.create(null));
  var proposalCache = Object.create(null);
  var proposalRenderToken = 0;
  var lastProposalRenderKey = "";

  function text(node) {
    return (node && node.textContent ? node.textContent : "").replace(/\s+/g, " ").trim();
  }

  function isVisible(node) {
    if (!node || !node.getBoundingClientRect) return false;
    var style = window.getComputedStyle(node);
    var rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function isGovernancePage() {
    if (/governance|proposal/i.test(window.location.pathname || "")) return true;
    return Array.prototype.some.call(document.querySelectorAll("h1,h2"), function (heading) {
      return /^Governance$/i.test(text(heading));
    });
  }

  function cleanLabel(label) {
    return String(label || "")
      .replace(/\+\s*\d+\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalKey(label) {
    var value = cleanLabel(label).toLowerCase();
    if (value === "do" || value === "do-chain" || value === "do chain") return "dochain";
    if (value.indexOf("terra classic") !== -1 || value === "lunc") return "terraclassiclunc";
    return value.replace(/[^a-z0-9]+/g, "");
  }

  function displayLabel(label) {
    var clean = cleanLabel(label);
    var key = normalKey(clean);
    if (key === "dochain") return "Do Chain";
    if (key === "terraclassiclunc") return "Terra Classic (LUNC)";
    return clean;
  }

  function scoreHost(node) {
    var buttons = Array.prototype.filter.call(node.querySelectorAll("button,[role='button']"), isVisible);
    var labels = buttons.map(text).filter(Boolean);
    if (!labels.some(function (label) { return /^All$/i.test(label); })) return -1;
    if (!labels.some(function (label) { return /^\+\s*\d+$/i.test(label); })) return -1;
    if (labels.length < 3) return -1;
    return labels.length;
  }

  function findFilterHost() {
    var buttons = Array.prototype.filter.call(document.querySelectorAll("button,[role='button']"), isVisible);
    var plusButtons = buttons.filter(function (button) {
      return /^\+\s*\d+$/i.test(text(button));
    });

    var best = null;
    var bestScore = Infinity;
    plusButtons.forEach(function (button) {
      var node = button.parentElement;
      var depth = 0;
      while (node && depth < 8) {
        var score = scoreHost(node);
        if (score > -1 && score < bestScore) {
          best = node;
          bestScore = score;
        }
        node = node.parentElement;
        depth += 1;
      }
    });

    return best;
  }

  function collectButtonOptions(host) {
    var seen = Object.create(null);
    var options = [];
    var buttons = Array.prototype.filter.call(host.querySelectorAll("button,[role='button']"), function (button) {
      return !/^\+\s*\d+$/i.test(text(button));
    });

    buttons.forEach(function (button) {
      var label = displayLabel(text(button));
      var key = normalKey(label);
      if (key !== "all" && !GOV_CHAIN_BY_KEY[key]) return;
      if (!label || seen[key]) return;
      seen[key] = true;
      options.push({ key: key, label: GOV_CHAIN_BY_KEY[key] ? GOV_CHAIN_BY_KEY[key].label : label, button: button });
    });

    if (!seen.all) {
      options.unshift({ key: "all", label: "All", button: null });
      seen.all = true;
    }
    if (!seen.dochain) {
      options.push({ key: "dochain", label: "Do Chain", button: null });
      seen.dochain = true;
    }

    return options;
  }

  function optionFromNode(node, button) {
    var label = displayLabel(text(node));
    var key = normalKey(label);
    if (!label || key === "networks" || key === "dashboard" || key === "stake" || key === "governance") return null;
    if (!GOV_CHAIN_BY_KEY[key]) return null;
    if (label.length > 48 || /^\+\s*\d+$/.test(label)) return null;
    return { key: key, label: GOV_CHAIN_BY_KEY[key].label || label, button: button || null };
  }

  function collectSidebarOptions() {
    var networkHeading = Array.prototype.find.call(document.querySelectorAll("*"), function (node) {
      return isVisible(node) && /^NETWORKS$/i.test(text(node));
    });
    if (!networkHeading) return [];

    var sidebar = networkHeading.closest("aside,nav") || networkHeading.parentElement;
    var depth = 0;
    while (sidebar && depth < 5) {
      var sidebarText = text(sidebar);
      if (/Do Chain/i.test(sidebarText) && /Bitcoin|Ethereum|Solana/i.test(sidebarText)) break;
      sidebar = sidebar.parentElement;
      depth += 1;
    }
    if (!sidebar) return [];

    var interactive = Array.prototype.filter.call(sidebar.querySelectorAll("button,[role='button'],a"), isVisible);
    var rows = interactive.length ? interactive : Array.prototype.filter.call(sidebar.querySelectorAll("div,li"), isVisible);

    return rows.map(function (row) {
      return optionFromNode(row, null);
    }).filter(Boolean);
  }

  function orderedOptions(rawOptions) {
    var byKey = Object.create(null);
    rawOptions.concat(GOV_CHAINS.map(function (chain) {
      return { key: chain.key, label: chain.label, button: null };
    })).forEach(function (option) {
      if (!option || !option.key || byKey[option.key]) return;
      byKey[option.key] = option;
    });

    var all = byKey.all || { key: "all", label: "All", button: null };
    var doChain = byKey.dochain || { key: "dochain", label: "Do Chain", button: null };
    delete byKey.all;
    delete byKey.dochain;

    var rest = Object.keys(byKey).map(function (key) {
      return byKey[key];
    }).sort(function (a, b) {
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });

    return [all, doChain].concat(rest);
  }

  function selectedKeyFromButtons(host) {
    var buttons = Array.prototype.filter.call(host.querySelectorAll("button,[role='button']"), function (button) {
      return !/^\+\s*\d+$/i.test(text(button));
    });

    var selected = buttons.find(function (button) {
      var aria = button.getAttribute("aria-selected") || button.getAttribute("aria-pressed");
      var cls = button.className ? String(button.className) : "";
      return aria === "true" || /\b(active|selected|current)\b/i.test(cls);
    });

    return selected ? normalKey(text(selected)) : "all";
  }

  function installStyles() {
    if (document.getElementById("do-wallet-governance-chain-select-style")) return;
    var style = document.createElement("style");
    style.id = "do-wallet-governance-chain-select-style";
    style.textContent = [
      "." + HIDDEN_CLASS + "{display:none!important;}",
      "." + WRAPPER_CLASS + "{display:flex;align-items:center;gap:14px;padding:26px 40px;border-bottom:1px solid rgba(120,55,165,.45);}",
      "." + WRAPPER_CLASS + "__label{font-weight:800;color:#fff;font-size:16px;}",
      "." + WRAPPER_CLASS + "__select{min-width:280px;max-width:min(520px,100%);height:48px;border-radius:13px;border:1px solid rgba(158,67,255,.75);background:#1d142a;color:#fff;font-size:16px;font-weight:800;padding:0 44px 0 16px;outline:none;box-shadow:none;}",
      "." + WRAPPER_CLASS + "__select:focus{border-color:#a845ff;box-shadow:0 0 0 2px rgba(168,69,255,.18);}",
      "." + ALL_PROPOSALS_ACTIVE_CLASS + ">:not(." + ALL_PROPOSALS_CLASS + "){display:none!important;}",
      "." + ALL_PROPOSALS_CLASS + "{display:grid;gap:16px;padding:20px;color:inherit;}",
      "." + ALL_PROPOSALS_CLASS + "__status{color:var(--text-muted,#aba3c2);font-size:14px;font-weight:800;padding:18px 10px;}",
      "." + ALL_PROPOSALS_CLASS + "__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;}",
      "." + ALL_PROPOSALS_CLASS + "__card{border:1px solid rgba(120,55,165,.55);border-radius:8px;background:#151122;padding:24px 28px;min-height:164px;color:#fff;}",
      "." + ALL_PROPOSALS_CLASS + "__meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:26px;font-size:12px;font-weight:800;color:#cfc4ee;}",
      "." + ALL_PROPOSALS_CLASS + "__chain{display:inline-flex;align-items:center;gap:7px;color:#fff;}",
      "." + ALL_PROPOSALS_CLASS + "__chain img{width:28px;height:28px;border-radius:50%;object-fit:cover;background:#2c2140;}",
      "." + ALL_PROPOSALS_CLASS + "__pill{border:1px solid rgba(158,67,255,.45);border-radius:5px;background:rgba(158,67,255,.14);padding:3px 7px;}",
      "." + ALL_PROPOSALS_CLASS + "__state{margin-left:auto;color:#00d99d;}",
      "." + ALL_PROPOSALS_CLASS + "__state.is-failed{color:#ff4b55;}",
      "." + ALL_PROPOSALS_CLASS + "__state.is-deposit{color:#ffbf35;}",
      "." + ALL_PROPOSALS_CLASS + "__state.is-voting{color:#8f45ff;}",
      "." + ALL_PROPOSALS_CLASS + "__title{display:block;font-size:19px;line-height:1.25;font-weight:900;margin-bottom:14px;}",
      "." + ALL_PROPOSALS_CLASS + "__submitted{color:#cfc4ee;font-size:12px;font-weight:700;}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function activeStatusGroup() {
    var value = String(window.location.hash || "").toUpperCase();
    if (value.indexOf("PASSED") >= 0) return "passed";
    if (value.indexOf("FAILED") >= 0 || value.indexOf("REJECTED") >= 0) return "failed";
    if (value.indexOf("DEPOSIT") >= 0) return "deposit";
    return "voting";
  }

  function statusLabel(status) {
    var value = String(status || "").toUpperCase();
    if (value.indexOf("PASSED") >= 0) return "Passed";
    if (value.indexOf("REJECTED") >= 0) return "Rejected";
    if (value.indexOf("FAILED") >= 0) return "Failed";
    if (value.indexOf("DEPOSIT") >= 0) return "Deposit";
    if (value.indexOf("VOTING") >= 0) return "Voting";
    return "Unspecified";
  }

  function statusMatchesGroup(status, group) {
    var value = String(status || "").toUpperCase();
    if (group === "passed") return value.indexOf("PASSED") >= 0;
    if (group === "failed") return value.indexOf("FAILED") >= 0 || value.indexOf("REJECTED") >= 0;
    if (group === "deposit") return value.indexOf("DEPOSIT") >= 0;
    return value.indexOf("VOTING") >= 0;
  }

  function statusClass(status) {
    var value = String(status || "").toUpperCase();
    if (value.indexOf("FAILED") >= 0 || value.indexOf("REJECTED") >= 0) return "is-failed";
    if (value.indexOf("DEPOSIT") >= 0) return "is-deposit";
    if (value.indexOf("VOTING") >= 0) return "is-voting";
    return "";
  }

  function proposalID(proposal) {
    return String(proposal && (proposal.id || proposal.proposal_id || proposal.proposalId || "") || "");
  }

  function proposalMessage(proposal) {
    var messages = proposal && proposal.messages;
    return Array.isArray(messages) && messages.length ? messages[0] : {};
  }

  function proposalContent(proposal) {
    var message = proposalMessage(proposal);
    return message && message.content ? message.content : {};
  }

  function proposalType(proposal) {
    var message = proposalMessage(proposal);
    var content = proposalContent(proposal);
    var raw = content["@type"] || message["@type"] || proposal && proposal.type || "";
    var tail = String(raw).split(".").pop().split("/").pop() || "Proposal";
    return tail.replace(/^MsgExecLegacyContent$/, "Text proposal").replace(/^Msg/, "Msg ");
  }

  function proposalTitle(proposal) {
    var message = proposalMessage(proposal);
    var content = proposalContent(proposal);
    var metadataTitle = "";
    try {
      var metadata = proposal && proposal.metadata ? JSON.parse(proposal.metadata) : null;
      metadataTitle = metadata && (metadata.title || metadata.name) || "";
    } catch (error) {}
    return String(
      proposal && (proposal.title || proposal.name) ||
      message.title ||
      content.title ||
      metadataTitle ||
      proposal && proposal.summary ||
      "Untitled proposal"
    );
  }

  function proposalSubmitted(proposal) {
    var value = proposal && (proposal.submit_time || proposal.submitTime || proposal.voting_start_time || proposal.deposit_end_time);
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function proposalSortTime(row) {
    var value = row.proposal && (row.proposal.submit_time || row.proposal.submitTime || row.proposal.voting_start_time || row.proposal.deposit_end_time);
    var time = value ? new Date(value).getTime() : 0;
    return isNaN(time) ? 0 : time;
  }

  function selectedGovernanceChains(select) {
    var value = select && select.value || "all";
    if (value === "all") return GOV_CHAINS.slice();
    return GOV_CHAIN_BY_KEY[value] ? [GOV_CHAIN_BY_KEY[value]] : [];
  }

  function proposalsContentNode(wrapper) {
    var header = wrapper && wrapper.parentElement;
    var filter = header && header.parentElement;
    if (!filter) return null;
    var children = Array.prototype.slice.call(filter.children || []);
    return children.filter(function (child) {
      return child !== header && /ChainFilter_content/.test(String(child.className || ""));
    })[0] || null;
  }

  function proposalEndpoint(chainID) {
    return "/station-assets/api/lcd/" + encodeURIComponent(chainID) + "/cosmos/gov/v1/proposals";
  }

  function loadChainProposals(chain) {
    var cached = proposalCache[chain.chainID];
    if (cached && Date.now() - cached.time < CACHE_TTL) return Promise.resolve(cached.rows);
    return fetch(proposalEndpoint(chain.chainID), { headers: { accept: "application/json" } })
      .then(function (response) { return response.ok ? response.json() : { proposals: [] }; })
      .then(function (json) {
        var proposals = Array.isArray(json && json.proposals) ? json.proposals : [];
        var rows = proposals.map(function (proposal) {
          return { chain: chain, proposal: proposal };
        });
        proposalCache[chain.chainID] = { time: Date.now(), rows: rows };
        return rows;
      })
      .catch(function () {
        proposalCache[chain.chainID] = { time: Date.now(), rows: [] };
        return [];
      });
  }

  function cardHTML(row) {
    var chain = row.chain;
    var proposal = row.proposal;
    var status = proposal && proposal.status || "";
    var submitted = proposalSubmitted(proposal);
    return [
      '<article class="' + ALL_PROPOSALS_CLASS + '__card">',
      '  <div class="' + ALL_PROPOSALS_CLASS + '__meta">',
      '    <span class="' + ALL_PROPOSALS_CLASS + '__chain"><img src="' + escapeHTML(chain.icon) + '" alt="" loading="eager" decoding="async" />' + escapeHTML(chain.label) + '</span>',
      '    <span class="' + ALL_PROPOSALS_CLASS + '__pill">' + escapeHTML(proposalID(proposal) || "-") + ' | ' + escapeHTML(proposalType(proposal)) + '</span>',
      '    <span class="' + ALL_PROPOSALS_CLASS + '__state ' + statusClass(status) + '">' + escapeHTML(statusLabel(status)) + '</span>',
      "  </div>",
      '  <strong class="' + ALL_PROPOSALS_CLASS + '__title">' + escapeHTML(proposalTitle(proposal)) + '</strong>',
      submitted ? '  <div class="' + ALL_PROPOSALS_CLASS + '__submitted">Submitted ' + escapeHTML(submitted) + '</div>' : "",
      "</article>"
    ].join("");
  }

  function renderProposalRows(panel, rows, group) {
    var filtered = rows.filter(function (row) {
      return statusMatchesGroup(row.proposal && row.proposal.status, group);
    }).sort(function (a, b) {
      return proposalSortTime(b) - proposalSortTime(a);
    });

    if (!filtered.length) {
      panel.innerHTML = '<div class="' + ALL_PROPOSALS_CLASS + '__status">No proposals in this period</div>';
      return;
    }

    panel.innerHTML = '<div class="' + ALL_PROPOSALS_CLASS + '__grid">' + filtered.slice(0, 120).map(cardHTML).join("") + "</div>";
  }

  function renderAllChainProposals(wrapper, select) {
    var content = proposalsContentNode(wrapper);
    if (!content || !select) return;

    var chains = selectedGovernanceChains(select);
    if (!chains.length) {
      content.classList.remove(ALL_PROPOSALS_ACTIVE_CLASS);
      return;
    }

    var group = activeStatusGroup();
    var renderKey = select.value + "|" + group + "|" + chains.map(function (chain) { return chain.chainID; }).join(",");
    var panel = content.querySelector(":scope > ." + ALL_PROPOSALS_CLASS);
    if (!panel) {
      panel = document.createElement("div");
      panel.className = ALL_PROPOSALS_CLASS;
      content.insertBefore(panel, content.firstChild);
    }
    content.classList.add(ALL_PROPOSALS_ACTIVE_CLASS);
    if (lastProposalRenderKey !== renderKey) {
      panel.innerHTML = '<div class="' + ALL_PROPOSALS_CLASS + '__status">Loading proposals...</div>';
      lastProposalRenderKey = renderKey;
    }

    var token = ++proposalRenderToken;
    Promise.all(chains.map(loadChainProposals)).then(function (results) {
      if (token !== proposalRenderToken) return;
      var rows = [];
      results.forEach(function (items) { rows = rows.concat(items); });
      renderProposalRows(panel, rows, group);
    });
  }

  function renderSelect(host) {
    var parent = host.parentElement;
    if (!parent) return;

    var existing = parent.querySelector(":scope > ." + WRAPPER_CLASS);
    var options = orderedOptions(collectButtonOptions(host).concat(collectSidebarOptions()));
    var selectedKey = selectedKeyFromButtons(host);

    if (!existing) {
      existing = document.createElement("div");
      existing.className = WRAPPER_CLASS;
      existing.innerHTML = '<label class="' + WRAPPER_CLASS + '__label" for="do-wallet-governance-chain-select-input">Network</label><select id="do-wallet-governance-chain-select-input" class="' + WRAPPER_CLASS + '__select"></select>';
      parent.insertBefore(existing, host);
    }

    var select = existing.querySelector("select");
    var currentValue = select.value || selectedKey;
    select.innerHTML = "";

    options.forEach(function (option) {
      var node = document.createElement("option");
      node.value = option.key;
      node.textContent = option.label;
      select.appendChild(node);
    });

    select.value = options.some(function (option) { return option.key === currentValue; }) ? currentValue : selectedKey;

    if (select.__doWalletGovernanceSelectBound !== true) {
      select.__doWalletGovernanceSelectBound = true;
      select.addEventListener("change", function () {
        lastProposalRenderKey = "";
        renderAllChainProposals(existing, select);
      });
    }

    host.classList.add(HIDDEN_CLASS);
    host.setAttribute("aria-hidden", "true");
    host.dataset.doWalletGovernanceSelectApplied = "1";
    renderAllChainProposals(existing, select);
  }

  function apply() {
    installStyles();
    if (!isGovernancePage()) return;
    var host = findFilterHost();
    if (!host) return;
    renderSelect(host);
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    window.setTimeout(function () {
      queued = false;
      apply();
    }, 80);
  }

  window.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  new MutationObserver(function () {
    if (isGovernancePage()) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
