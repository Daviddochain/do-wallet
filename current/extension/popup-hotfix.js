(() => {
  const SNAPSHOT_KEY = "portfolioSnapshot"
  const SNAPSHOTS_BY_WALLET_KEY = "portfolioSnapshotsByWallet"
  const WALLET_KEY = "wallet"
  const WEBSITE_TABS = [
    "https://do-wallet.com/*",
    "https://www.do-wallet.com/*",
    "https://do-chain.com/*",
    "https://www.do-chain.com/*",
    "http://do-wallet.com/*",
    "http://www.do-wallet.com/*",
    "https://136.243.174.47/*",
    "http://136.243.174.47/*",
    "https://localhost/*",
    "http://localhost/*",
    "https://127.0.0.1/*",
    "http://127.0.0.1/*",
  ]

  const chainLabels = {
    DO: "Do Chain",
    LUNC: "Terra Classic",
    USTC: "Terra Classic",
    KRTC: "Terra Classic",
    IDTC: "Terra Classic",
    JPTC: "Terra Classic",
    MYTC: "Terra Classic",
    UMNTC: "Terra Classic",
    THTC: "Terra Classic",
    BTC: "Bitcoin",
    ETH: "Ethereum",
    BNB: "BNB Smart Chain",
    SOL: "Solana",
    OSMO: "Osmosis",
    DEC: "Osmosis",
    HUAHUA: "Osmosis",
    DGN: "Dungeon",
    SCRT: "Secret Network",
    DVPN: "Decentr",
    XRP: "XRP Ledger",
    TRX: "Tron",
  }

  const escapeHtml = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")

  const getAddress = (wallet) => {
    if (!wallet) return ""
    if (typeof wallet.address === "string") return wallet.address
    if (wallet.addresses && typeof wallet.addresses === "object") {
      return (
        wallet.addresses["Do-Chain"] ||
        wallet.addresses["columbus-5"] ||
        wallet.addresses["phoenix-1"] ||
        Object.values(wallet.addresses).find((address) => typeof address === "string") ||
        ""
      )
    }
    return ""
  }

  const walletKeys = (wallet) =>
    Array.from(
      new Set(
        [getAddress(wallet), wallet?.name]
          .map((value) => String(value || "").trim().toLowerCase())
          .filter(Boolean)
      )
    )

  const numberValue = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0
    const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""))
    return Number.isFinite(parsed) ? parsed : 0
  }

  const formatUsd = (value) => {
    const numeric = numberValue(value)
    if (!numeric) return "$-"
    if (numeric > 0 && numeric < 0.01) return "< $0.01"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: numeric >= 1 ? 2 : 6,
    }).format(numeric)
  }

  const formatAmount = (value) => {
    const numeric = numberValue(value)
    if (!numeric) return "0"
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: numeric >= 1 ? 4 : 8,
    }).format(numeric)
  }

  const normalizeAsset = (asset) => {
    const symbol = String(asset?.symbol || asset?.denom || asset?.name || "ASSET").replace(/^\$/, "")
    const amount = numberValue(asset?.amount ?? asset?.balance ?? asset?.available)
    const value = numberValue(asset?.value ?? asset?.usd ?? asset?.fiatValue)
    const chain =
      asset?.chain ||
      asset?.chainName ||
      asset?.network ||
      asset?.chains?.[0]?.name ||
      asset?.chains?.[0]?.label ||
      chainLabels[symbol] ||
      ""

    return {
      id: String(asset?.id || `${symbol}:${amount}:${value}`).toLowerCase(),
      symbol,
      name: asset?.name || symbol,
      amount,
      value,
      change: numberValue(asset?.change ?? asset?.change24h ?? asset?.percent_change_24h),
      icon: asset?.icon || asset?.logo || asset?.image,
      chain,
    }
  }

  const snapshotTotal = (snapshot) => {
    const direct = numberValue(snapshot?.total ?? snapshot?.portfolioValue ?? snapshot?.value)
    if (direct) return direct
    return (snapshot?.assets || []).reduce((sum, asset) => sum + numberValue(asset?.value), 0)
  }

  const chooseSnapshot = (stored, wallet) => {
    const byWallet = stored?.[SNAPSHOTS_BY_WALLET_KEY] || {}
    const keyedSnapshots = walletKeys(wallet)
      .map((key) => byWallet[key])
      .filter(Boolean)
    const matchingSnapshots = keyedSnapshots.filter((snapshot) =>
      snapshotMatchesWallet(snapshot, wallet)
    )
    const nonEmptyKeyed = matchingSnapshots.find((snapshot) => (snapshot?.assets || []).length > 0)
    if (nonEmptyKeyed) return nonEmptyKeyed

    const globalSnapshot = stored?.[SNAPSHOT_KEY]
    if (snapshotMatchesWallet(globalSnapshot, wallet) && (globalSnapshot?.assets || []).length > 0) return globalSnapshot
    return matchingSnapshots[0] || null
  }

  const snapshotMatchesWallet = (snapshot, wallet) => {
    if (!snapshot || !wallet) return false
    const selectedKeys = walletKeys(wallet)
    const snapshotKeys = [snapshot?.wallet?.address, snapshot?.wallet?.name]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)

    return snapshotKeys.some((key) => selectedKeys.includes(key))
  }

  const sendTabMessage = async (tabId, message) => {
    try {
      return await chrome.tabs.sendMessage(tabId, message)
    } catch {
      return null
    }
  }

  const requestWebsiteSnapshot = async (wallet) => {
    if (!chrome?.tabs?.query || !chrome?.tabs?.sendMessage) return null
    let tabs = []
    try {
      tabs = await chrome.tabs.query({ url: WEBSITE_TABS })
    } catch {
      return null
    }

    const responses = []
    for (const tab of tabs || []) {
      if (typeof tab.id !== "number") continue
      responses.push(await sendTabMessage(tab.id, { type: "SYNC_WEBSITE_WALLET_NOW", wallet }))
      responses.push(await sendTabMessage(tab.id, { type: "SCRAPE_PORTFOLIO_DOM_NOW", wallet }))
    }

    return responses
      .map((response) => response?.snapshot)
      .find((snapshot) => snapshotMatchesWallet(snapshot, wallet) && (snapshot?.assets || []).length > 0) || null
  }

  const getStorage = (keys) =>
    new Promise((resolve) => chrome.storage.local.get(keys, resolve))

  const saveSnapshot = (snapshot, wallet) => {
    if (!snapshotMatchesWallet(snapshot, wallet)) return
    const keys = walletKeys(wallet)
    chrome.storage.local.get([SNAPSHOTS_BY_WALLET_KEY], (stored) => {
      const byWallet = stored?.[SNAPSHOTS_BY_WALLET_KEY] || {}
      const next = { ...byWallet }
      keys.forEach((key) => {
        next[key] = snapshot
      })
      chrome.storage.local.set({ [SNAPSHOT_KEY]: snapshot, [SNAPSHOTS_BY_WALLET_KEY]: next })
    })
  }

  const openDashboardForSelectedWallet = async () => {
    const stored = await getStorage([WALLET_KEY])
    const wallet = stored?.[WALLET_KEY]
    if (!wallet) {
      chrome.tabs?.create?.({ url: "https://www.do-wallet.com/#/" })
      return
    }

    const request = {
      name: wallet?.name,
      walletName: wallet?.name,
      address: getAddress(wallet),
      addresses: wallet?.addresses,
      pubkey: wallet?.pubkey,
      strict: true,
      allowWebsiteWrite: true,
      doWalletDashboardHandoff: true,
      requestedAt: Date.now(),
    }

    await new Promise((resolve) =>
      chrome.storage.local.set({ dashboardWalletRequest: request }, resolve)
    )
    chrome.tabs?.create?.({ url: "https://www.do-wallet.com/#/" })
  }

  const findSmallestElement = (predicate) =>
    Array.from(document.querySelectorAll("section, article, div"))
      .filter((element) => predicate(element.innerText || ""))
      .sort((a, b) => (a.innerText || "").length - (b.innerText || "").length)[0]

  const replaceTextNode = (root, matcher, nextText) => {
    if (!root) return
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    nodes.forEach((node) => {
      if (matcher(node.nodeValue || "")) node.nodeValue = nextText
    })
  }

  const renderPortfolioValue = (snapshot) => {
    const total = snapshotTotal(snapshot)
    const card = findSmallestElement((text) => text.includes("Unlocked") && text.includes("$-"))
    replaceTextNode(card, (text) => text.trim() === "$-", formatUsd(total))
  }

  const assetIcon = (asset) => {
    if (asset.icon) {
      return `<img class="dw-hotfix-asset-icon" src="${escapeHtml(asset.icon)}" alt="" />`
    }
    return `<span class="dw-hotfix-asset-fallback">${escapeHtml(asset.symbol.slice(0, 2))}</span>`
  }

  const renderAssets = (snapshot) => {
    const assets = (snapshot?.assets || [])
      .map(normalizeAsset)
      .filter((asset) => asset.amount > 0 || asset.value > 0)
      .sort((a, b) => b.value - a.value || b.amount - a.amount)

    if (!assets.length) return false

    const assetCard =
      findSmallestElement((text) => text.includes("Assets") && text.includes("No cached balances")) ||
      findSmallestElement((text) => text.includes("Assets") && text.includes("Sync balances"))
    if (!assetCard) return false

    assetCard.classList.add("dw-hotfix-card")
    assetCard.innerHTML = `
      <div class="dw-hotfix-heading">
        <div>
          <h2>Assets</h2>
          <p>${assets.length} synced tokens from Do-Wallet website</p>
        </div>
        <span>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div class="dw-hotfix-list">
        ${assets
          .map((asset) => {
            const changeClass = asset.change < 0 ? "down" : "up"
            const changeText = `${asset.change >= 0 ? "+" : ""}${asset.change.toFixed(2)}%`
            return `
              <div class="dw-hotfix-row" data-token="${escapeHtml(asset.symbol)}">
                <div class="dw-hotfix-left">
                  ${assetIcon(asset)}
                  <div class="dw-hotfix-token">
                    <div class="dw-hotfix-name">
                      <strong>${escapeHtml(asset.symbol)}</strong>
                      ${asset.chain ? `<span>${escapeHtml(asset.chain)}</span>` : ""}
                    </div>
                    <small class="${changeClass}">${changeText}</small>
                  </div>
                </div>
                <div class="dw-hotfix-right">
                  <strong>${formatAmount(asset.amount)}</strong>
                  <small>${formatUsd(asset.value)}</small>
                </div>
              </div>`
          })
          .join("")}
      </div>`
    return true
  }

  const ensureStyles = () => {
    if (document.getElementById("dw-hotfix-style")) return
    const style = document.createElement("style")
    style.id = "dw-hotfix-style"
    style.textContent = `
      .dw-hotfix-card { background: #111827 !important; border: 1px solid rgba(120, 144, 196, 0.28) !important; border-radius: 18px !important; color: #fff !important; padding: 18px !important; }
      .dw-hotfix-heading { align-items: flex-start; display: flex; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
      .dw-hotfix-heading h2 { color: #fff; font-size: 22px; line-height: 1; margin: 0 0 8px; }
      .dw-hotfix-heading p, .dw-hotfix-heading span { color: #9fb0d0; font-size: 12px; margin: 0; }
      .dw-hotfix-list { display: grid; gap: 4px; max-height: 410px; overflow: auto; padding-right: 2px; }
      .dw-hotfix-row { align-items: center; border-radius: 12px; display: flex; gap: 12px; justify-content: space-between; padding: 10px 8px; }
      .dw-hotfix-row:nth-child(4n) { background: rgba(38, 61, 108, 0.32); }
      .dw-hotfix-left { align-items: center; display: flex; gap: 12px; min-width: 0; }
      .dw-hotfix-asset-icon, .dw-hotfix-asset-fallback { border-radius: 50%; flex: 0 0 auto; height: 38px; width: 38px; }
      .dw-hotfix-asset-fallback { align-items: center; background: linear-gradient(135deg, #3467ff, #9c3cff); display: flex; font-size: 13px; font-weight: 900; justify-content: center; }
      .dw-hotfix-token { min-width: 0; }
      .dw-hotfix-name { align-items: center; display: flex; gap: 6px; min-width: 0; }
      .dw-hotfix-name strong { color: #fff; font-size: 18px; max-width: 112px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dw-hotfix-name span { background: #2d3b5d; border-radius: 4px; color: #fff; font-size: 10px; font-weight: 800; max-width: 96px; overflow: hidden; padding: 2px 6px; text-overflow: ellipsis; white-space: nowrap; }
      .dw-hotfix-token small { display: block; font-size: 13px; font-weight: 800; margin-top: 4px; }
      .dw-hotfix-token small.up { color: #36dfbd; }
      .dw-hotfix-token small.down { color: #ff6666; }
      .dw-hotfix-right { text-align: right; }
      .dw-hotfix-right strong { color: #fff; display: block; font-size: 19px; line-height: 1.1; }
      .dw-hotfix-right small { color: #9fb0d0; display: block; font-size: 14px; font-weight: 800; margin-top: 6px; }
    `
    document.head.appendChild(style)
  }

  let rendering = false
  const refresh = async () => {
    if (rendering) return
    rendering = true
    try {
      ensureStyles()
      const stored = await getStorage([WALLET_KEY, SNAPSHOT_KEY, SNAPSHOTS_BY_WALLET_KEY])
      const wallet = stored?.[WALLET_KEY]
      let snapshot = chooseSnapshot(stored, wallet)
      if (!(snapshot?.assets || []).length) {
        snapshot = await requestWebsiteSnapshot(wallet)
        if (snapshot) saveSnapshot(snapshot, wallet)
      }
      if ((snapshot?.assets || []).length) {
        renderPortfolioValue(snapshot)
        renderAssets(snapshot)
      }
    } finally {
      rendering = false
    }
  }

  const boot = () => {
    refresh()
    window.setTimeout(refresh, 500)
    window.setTimeout(refresh, 1500)
    window.setInterval(refresh, 6000)
    chrome.storage?.onChanged?.addListener((changes, area) => {
      if (area === "local" && (changes[SNAPSHOT_KEY] || changes[SNAPSHOTS_BY_WALLET_KEY] || changes[WALLET_KEY])) {
        refresh()
      }
    })
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target
        const button = target?.closest?.("button,a")
        const label = button?.innerText || button?.textContent || ""
        if (!/\bDashboard\b|Open website dashboard/i.test(label)) return

        event.preventDefault()
        event.stopPropagation()
        openDashboardForSelectedWallet().catch(() => {})
      },
      true
    )
    new MutationObserver(() => refresh()).observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true })
  } else {
    boot()
  }
})()
