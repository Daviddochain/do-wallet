(function () {
  'use strict'

  const REQUEST_TARGET = 'do-wallet-extension-delete-bridge'
  const RESPONSE_TARGET = 'do-wallet-website-delete-sync'
  const REQUEST_TYPE = 'DO_WALLET_DELETE_WALLET_FROM_EXTENSION'
  const RESPONSE_TYPE = 'DO_WALLET_DELETE_WALLET_FROM_EXTENSION_RESULT'
  const REQUEST_KEY = 'doWalletDeleteWalletRequest'

  const allowedOrigin = () =>
    /^https:\/\/(www\.)?do-wallet\.com$/i.test(window.location.origin) ||
    /^https:\/\/(www\.)?do-chain\.com$/i.test(window.location.origin) ||
    /^https:\/\/wallet\.do-chain\.com$/i.test(window.location.origin)

  if (window.top !== window || !allowedOrigin()) return

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

  const getStorage = (keys) =>
    new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolve({})
      chrome.storage.local.get(keys, (result) => resolve(result || {}))
    })

  const setStorage = (value) =>
    new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolve()
      chrome.storage.local.set(value, () => {
        const error = chrome.runtime?.lastError
        if (error) reject(new Error(error.message))
        else resolve()
      })
    })

  const respond = (requestId, payload) => {
    window.postMessage(
      {
        target: RESPONSE_TARGET,
        type: RESPONSE_TYPE,
        requestId,
        ...payload,
      },
      window.location.origin
    )
  }

  const handleDelete = async (requestId, wallet) => {
    const identity = toIdentity(wallet)
    if (!identity) {
      respond(requestId, { success: false, message: 'No wallet identity was provided.' })
      return
    }

    try {
      const stored = await getStorage(['wallet', 'walletSource', 'websiteWallets'])
      const currentWallet = stored.wallet || null
      const websiteWallets = Array.isArray(stored.websiteWallets) ? stored.websiteWallets : []
      const nextWebsiteWallets = websiteWallets.filter((item) => !identityMatches(wallet, item))
      const removedCurrent = identityMatches(wallet, currentWallet)
      const removedWebsiteWallets = websiteWallets.length - nextWebsiteWallets.length

      await setStorage({
        wallet: removedCurrent ? null : currentWallet,
        walletSource: removedCurrent ? 'extension' : stored.walletSource,
        walletSelectedAt: Date.now(),
        websiteWallets: nextWebsiteWallets,
        [REQUEST_KEY]: {
          id: requestId,
          wallet: {
            name: identity.name,
            walletName: identity.name,
            address: identity.addresses[0] || '',
            addresses: identity.addresses,
          },
          requestedAt: Date.now(),
        },
      })

      respond(requestId, {
        success: true,
        result: {
          queued: true,
          removedCurrent,
          removedWebsiteWallets,
        },
      })
    } catch (err) {
      respond(requestId, {
        success: false,
        message: err?.message || 'Extension storage update failed.',
      })
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return
    const data = event.data || {}
    if (data.target !== REQUEST_TARGET || data.type !== REQUEST_TYPE) return
    void handleDelete(data.requestId, data.wallet)
  })
})()
