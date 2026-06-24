(function () {
  'use strict'

  const PRESENCE_KEY = 'do-wallet-extension-present.v1'
  const WATCHED_KEYS = ['keys', 'user', 'wallets', 'wallet']
  const REQUEST_TARGET = 'do-wallet-extension-delete-bridge'
  const RESPONSE_TARGET = 'do-wallet-website-delete-sync'
  const REQUEST_TYPE = 'DO_WALLET_DELETE_WALLET_FROM_EXTENSION'
  const RESPONSE_TYPE = 'DO_WALLET_DELETE_WALLET_FROM_EXTENSION_RESULT'
  const ASK_TTL_MS = 10 * 60 * 1000
  const RESPONSE_TIMEOUT_MS = 15000

  let ready = false
  let snapshot = null
  let scheduled = 0
  const recentlyAsked = new Map()

  const safeParse = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null
    try {
      return JSON.parse(value)
    } catch (_) {
      return null
    }
  }

  const normalizeText = (value) =>
    String(value || '')
      .trim()
      .replace(/\s+/g, ' ')

  const normalizeAddress = (value) => normalizeText(value).toLowerCase()

  const looksLikeAddress = (value) => {
    const text = normalizeAddress(value)
    if (!text) return false
    return (
      /^0x[a-f0-9]{40}$/.test(text) ||
      /^bc1[a-z0-9]{18,90}$/.test(text) ||
      /^(do|terra|secret|dungeon|cosmos|osmo|akash|swth|cheqd|juno|stars|kujira|stride|fetch|cro|xion|dym|noble|neutron|bitsong|chihuahua|persistence|comdex|dec)[a-z0-9]{20,90}$/.test(text)
    )
  }

  const addAddress = (set, value) => {
    const text = normalizeAddress(value)
    if (looksLikeAddress(text)) set.add(text)
  }

  const collectAddresses = (value, set, depth) => {
    if (depth > 4 || !value) return
    if (typeof value === 'string') {
      addAddress(set, value)
      return
    }
    if (Array.isArray(value)) {
      value.slice(0, 50).forEach((item) => collectAddresses(item, set, depth + 1))
      return
    }
    if (typeof value !== 'object') return

    Object.entries(value).forEach(([key, item]) => {
      const lowerKey = String(key || '').toLowerCase()
      if (lowerKey.includes('private') || lowerKey.includes('mnemonic') || lowerKey.includes('seed')) {
        return
      }
      if (lowerKey.includes('address') || lowerKey === 'bech32address' || lowerKey === 'ethaddress') {
        collectAddresses(item, set, depth + 1)
        return
      }
      if (lowerKey === 'addresses' || lowerKey === 'accounts' || lowerKey === 'chains') {
        collectAddresses(item, set, depth + 1)
      }
    })
  }

  const pickName = (wallet) => {
    if (!wallet || typeof wallet !== 'object') return ''
    return (
      normalizeText(wallet.name) ||
      normalizeText(wallet.walletName) ||
      normalizeText(wallet.accountName) ||
      normalizeText(wallet.label) ||
      normalizeText(wallet.alias) ||
      normalizeText(wallet.title)
    )
  }

  const toIdentity = (wallet) => {
    if (!wallet || typeof wallet !== 'object') return null
    const addresses = new Set()
    collectAddresses(wallet, addresses, 0)

    const name = pickName(wallet)
    const addressList = Array.from(addresses)
    if (!name && addressList.length === 0) return null

    return {
      name,
      walletName: name,
      address: addressList[0] || '',
      addresses: addressList,
    }
  }

  const identityKey = (identity) => {
    if (!identity) return ''
    if (identity.addresses && identity.addresses.length) {
      return identity.addresses.slice().sort().join('|')
    }
    return `name:${normalizeText(identity.name).toLowerCase()}`
  }

  const collectWalletsFromParsed = (value, out, depth) => {
    if (depth > 3 || !value) return
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const identity = toIdentity(item)
        if (identity) out.set(identityKey(identity), identity)
        collectWalletsFromParsed(item, out, depth + 1)
      })
      return
    }
    if (typeof value !== 'object') return

    const directIdentity = toIdentity(value)
    if (directIdentity) out.set(identityKey(directIdentity), directIdentity)

    ;['keys', 'wallets', 'accounts', 'items', 'list'].forEach((field) => {
      if (value[field]) collectWalletsFromParsed(value[field], out, depth + 1)
    })
  }

  const takeSnapshot = () => {
    const wallets = new Map()
    WATCHED_KEYS.forEach((key) => {
      const parsed = safeParse(window.localStorage.getItem(key))
      collectWalletsFromParsed(parsed, wallets, 0)
    })
    return wallets
  }

  const isExtensionFresh = () => {
    const presence = safeParse(window.localStorage.getItem(PRESENCE_KEY))
    return Boolean(
      presence &&
        presence.source === 'do-wallet-extension' &&
        Number.isFinite(Number(presence.updatedAt)) &&
        Date.now() - Number(presence.updatedAt) < 30000
    )
  }

  const pruneAsked = () => {
    const now = Date.now()
    recentlyAsked.forEach((time, key) => {
      if (now - time > ASK_TTL_MS) recentlyAsked.delete(key)
    })
  }

  const sendDeleteRequest = (wallet) =>
    new Promise((resolve) => {
      const requestId = `delete-${Date.now()}-${Math.random().toString(16).slice(2)}`
      let done = false

      const finish = (result) => {
        if (done) return
        done = true
        window.removeEventListener('message', onMessage)
        resolve(result)
      }

      const onMessage = (event) => {
        if (event.source !== window || event.origin !== window.location.origin) return
        const data = event.data || {}
        if (
          data.target !== RESPONSE_TARGET ||
          data.type !== RESPONSE_TYPE ||
          data.requestId !== requestId
        ) {
          return
        }
        finish(data)
      }

      window.addEventListener('message', onMessage)
      window.postMessage(
        {
          target: REQUEST_TARGET,
          type: REQUEST_TYPE,
          requestId,
          wallet,
        },
        window.location.origin
      )

      window.setTimeout(() => finish({ success: false, message: 'Extension did not respond.' }), RESPONSE_TIMEOUT_MS)
    })

  const handleRemovedWallets = async (removed) => {
    if (!removed.length || !isExtensionFresh()) return
    pruneAsked()

    for (const wallet of removed) {
      const key = identityKey(wallet)
      if (!key || recentlyAsked.has(key)) continue
      recentlyAsked.set(key, Date.now())

      const label = wallet.name || wallet.address || 'this wallet'
      const yes = window.confirm(
        `Do you want to delete this wallet from the Do-Wallet extension too?\n\n${label}`
      )
      if (!yes) continue

      const result = await sendDeleteRequest(wallet)
      if (!result || result.success !== true) {
        window.alert(
          `The website wallet was deleted, but the extension copy could not be deleted automatically.\n\n${result?.message || 'Please open the extension and delete it there.'}`
        )
      }
    }
  }

  const scanForDeletes = () => {
    scheduled = 0
    const next = takeSnapshot()
    if (!ready || !snapshot) {
      snapshot = next
      ready = true
      return
    }

    const removed = []
    snapshot.forEach((identity, key) => {
      if (!next.has(key)) removed.push(identity)
    })

    snapshot = next
    if (removed.length) {
      void handleRemovedWallets(removed)
    }
  }

  const scheduleScan = () => {
    if (scheduled) window.clearTimeout(scheduled)
    scheduled = window.setTimeout(scanForDeletes, 80)
  }

  const patchStorageMethod = (name) => {
    const proto = window.Storage && window.Storage.prototype
    const original = proto && proto[name]
    if (typeof original !== 'function') return

    proto[name] = function patchedLocalStorageMethod(key, value) {
      const result = original.apply(this, arguments)
      if (this === window.localStorage && (name === 'clear' || WATCHED_KEYS.includes(String(key)))) {
        scheduleScan()
      }
      return result
    }
  }

  try {
    patchStorageMethod('setItem')
    patchStorageMethod('removeItem')
    patchStorageMethod('clear')
    window.addEventListener('storage', (event) => {
      if (!event.key || WATCHED_KEYS.includes(event.key)) scheduleScan()
    })
    window.setTimeout(scanForDeletes, 250)
  } catch (err) {
    console.warn('[Do-Wallet] Delete extension sync could not start:', err)
  }
})()
