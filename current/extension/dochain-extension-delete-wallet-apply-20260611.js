(function () {
  'use strict'

  const REQUEST_KEY = 'doWalletDeleteWalletRequest'
  const RESULT_KEY = 'doWalletDeleteWalletResult'
  const APPLIED_KEY = 'doWalletDeleteWalletAppliedId'
  const LOCAL_KEYS = ['keys', 'wallets', 'user', 'wallet']

  const normalizeText = (value) =>
    String(value || '')
      .trim()
      .replace(/\s+/g, ' ')

  const normalizeAddress = (value) => normalizeText(value).toLowerCase()

  const looksLikeAddress = (value) => {
    const text = normalizeAddress(value)
    return (
      /^0x[a-f0-9]{40}$/.test(text) ||
      /^bc1[a-z0-9]{18,90}$/.test(text) ||
      /^(do|terra|secret|dungeon|cosmos|osmo|akash|swth|cheqd|juno|stars|kujira|stride|fetch|cro|xion|dym|noble|neutron|bitsong|chihuahua|persistence|comdex|dec)[a-z0-9]{20,90}$/.test(text)
    )
  }

  const collectAddresses = (value, set, depth) => {
    if (depth > 4 || !value) return
    if (typeof value === 'string') {
      const text = normalizeAddress(value)
      if (looksLikeAddress(text)) set.add(text)
      return
    }
    if (Array.isArray(value)) {
      value.slice(0, 50).forEach((item) => collectAddresses(item, set, depth + 1))
      return
    }
    if (typeof value !== 'object') return
    Object.entries(value).forEach(([key, item]) => {
      const lowerKey = String(key || '').toLowerCase()
      if (lowerKey.includes('private') || lowerKey.includes('mnemonic') || lowerKey.includes('seed')) return
      if (lowerKey.includes('address') || lowerKey === 'addresses' || lowerKey === 'accounts' || lowerKey === 'chains') {
        collectAddresses(item, set, depth + 1)
      }
    })
  }

  const toIdentity = (wallet) => {
    if (!wallet || typeof wallet !== 'object') return null
    const addresses = new Set()
    collectAddresses(wallet, addresses, 0)
    const name =
      normalizeText(wallet.name) ||
      normalizeText(wallet.walletName) ||
      normalizeText(wallet.accountName) ||
      normalizeText(wallet.label) ||
      normalizeText(wallet.alias)
    const addressList = Array.from(addresses)
    if (!name && !addressList.length) return null
    return { name, addresses: addressList }
  }

  const identityMatches = (target, candidate) => {
    const wanted = toIdentity(target)
    const current = toIdentity(candidate)
    if (!wanted || !current) return false

    const wantedAddresses = new Set(wanted.addresses)
    if (wantedAddresses.size && current.addresses.some((address) => wantedAddresses.has(address))) {
      return true
    }

    return Boolean(
      wanted.name &&
        current.name &&
        wanted.name.toLowerCase() === current.name.toLowerCase()
    )
  }

  const safeParse = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null
    try {
      return JSON.parse(value)
    } catch (_) {
      return null
    }
  }

  const getStorage = (keys) =>
    new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolve({})
      chrome.storage.local.get(keys, (result) => resolve(result || {}))
    })

  const setStorage = (value) =>
    new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolve()
      chrome.storage.local.set(value, () => resolve())
    })

  const removeStorage = (keys) =>
    new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolve()
      chrome.storage.local.remove(keys, () => resolve())
    })

  const filterValue = (value, wallet) => {
    if (Array.isArray(value)) {
      const filtered = value.filter((item) => !identityMatches(wallet, item))
      return {
        changed: filtered.length !== value.length,
        value: filtered,
        removed: value.length - filtered.length,
      }
    }

    if (value && typeof value === 'object' && identityMatches(wallet, value)) {
      return { changed: true, value: null, removed: 1 }
    }

    return { changed: false, value, removed: 0 }
  }

  const dispatchWalletChanged = () => {
    const detail = { source: 'do-wallet-extension-delete', wallet: null, updatedAt: Date.now() }
    ;['do_wallet_change', 'station_wallet_change', 'do_wallet_bridge_update'].forEach((name) => {
      try {
        window.dispatchEvent(new CustomEvent(name, { detail }))
      } catch (_) {}
    })
  }

  const applyRequest = async () => {
    const stored = await getStorage([REQUEST_KEY, 'wallet', 'walletSource', 'websiteWallets'])
    const request = stored[REQUEST_KEY]
    if (!request?.id || !request.wallet) return
    if (window.localStorage.getItem(APPLIED_KEY) === request.id) return
    const requestedAt = Number(request.requestedAt)
    if (!Number.isFinite(requestedAt) || Date.now() - requestedAt > 5 * 60 * 1000) {
      await removeStorage([REQUEST_KEY])
      return
    }

    let removed = 0
    let changed = false

    LOCAL_KEYS.forEach((key) => {
      const raw = window.localStorage.getItem(key)
      const parsed = safeParse(raw)
      if (!parsed) return

      const result = filterValue(parsed, request.wallet)
      if (!result.changed) return

      changed = true
      removed += result.removed
      if (result.value === null) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, JSON.stringify(result.value))
      }
    })

    const currentWallet = stored.wallet || null
    const websiteWallets = Array.isArray(stored.websiteWallets) ? stored.websiteWallets : []
    const nextWebsiteWallets = websiteWallets.filter((item) => !identityMatches(request.wallet, item))
    const removedCurrent = identityMatches(request.wallet, currentWallet)
    const removedWebsiteWallets = websiteWallets.length - nextWebsiteWallets.length

    await setStorage({
      wallet: removedCurrent ? null : currentWallet,
      walletSource: removedCurrent ? 'extension' : stored.walletSource,
      walletSelectedAt: Date.now(),
      websiteWallets: nextWebsiteWallets,
      [RESULT_KEY]: {
        id: request.id,
        success: true,
        removedLocalWallets: removed,
        removedCurrent,
        removedWebsiteWallets,
        appliedAt: Date.now(),
      },
    })

    window.localStorage.setItem(APPLIED_KEY, request.id)
    await removeStorage([REQUEST_KEY])

    if (changed || removedCurrent || removedWebsiteWallets) {
      dispatchWalletChanged()
    }
  }

  const scheduleApply = () => window.setTimeout(() => void applyRequest(), 50)

  try {
    scheduleApply()
    window.addEventListener('focus', scheduleApply)
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[REQUEST_KEY]) scheduleApply()
      })
    }
  } catch (err) {
    console.warn('[Do-Wallet] Extension delete apply could not start:', err)
  }
})()
