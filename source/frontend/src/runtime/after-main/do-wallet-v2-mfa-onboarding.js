(function () {
  'use strict'

  window.doChainMfaOnboardingLoaded = true

  var API = '/station-assets/api/mfa'
  var CHAIN_ID = 'Do-Chain'
  var WALLET_CHAIN_ID = CHAIN_ID
  var LEGACY_WALLET_CHAIN_ID = 'do-main-1'
  var OLD_WALLET_CHAIN_ID = 'dochain-1'
  var WALLET_CHAIN_IDS = [CHAIN_ID, LEGACY_WALLET_CHAIN_ID, OLD_WALLET_CHAIN_ID]
  var DENOM = 'udo'
  var WALLET_BRIDGE_KEY = 'do-wallet-bridge-wallet'
  var WALLET_AUTH_KEY = 'do-wallet-extension-authority.v1'
  var SELECTED_WALLET_KEY = 'do-wallet-selected-recovered-wallet.v1'
  var WALLET_BRIDGE_TTL_MS = 10 * 60 * 1000
  var WALLET_OPEN_TARGET = 'dochain-mfa-content'
  var WALLET_OPEN_TYPE = 'OPEN_WALLET_POPUP'
  var buttonId = 'dochain-mfa-chain-button'
  var modalId = 'dochain-mfa-modal'
  var activeSetup = null
  var enableBusy = false
  var activationAwaitingWallet = false
  var mfaStatusCache = { account: '', checkedAt: 0, status: null, promise: null }

  var setupKey = function (account) {
    return 'dochain_mfa_setup:' + account
  }
  var pendingSetupKey = function (account) {
    return 'dochain_mfa_pending_setup:' + account
  }
  var enabledKey = function (account) {
    return 'dochain_mfa_chain_enabled:' + account
  }

  function isObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value))
  }

  function safeJson(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback
    } catch (error) {
      return fallback
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {}
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }[char]
    })
  }

  function readStoragePayload(key, ttlMs) {
    var payload = safeJson(window.localStorage.getItem(key), null)
    if (!isObject(payload)) return null
    var updatedAt = Number(payload.updatedAt || payload.selectedAt)
    if (ttlMs && Number.isFinite(updatedAt) && Date.now() - updatedAt > ttlMs) return null
    return payload
  }

  function readBridgePayload() {
    var bridge = readStoragePayload(WALLET_BRIDGE_KEY, WALLET_BRIDGE_TTL_MS)
    if (!isObject(bridge)) return null
    var updatedAt = Number(bridge.updatedAt)
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt > WALLET_BRIDGE_TTL_MS) return null
    return bridge
  }

  function readSelectedPayload() {
    return readStoragePayload(SELECTED_WALLET_KEY, 0)
  }

  function readAuthPayload() {
    return readStoragePayload(WALLET_AUTH_KEY, 0)
  }

  function readUserWallet() {
    var wallet = safeJson(window.localStorage.getItem('user'), null)
    return isObject(wallet) ? wallet : null
  }

  function readWallet() {
    var selectedPayload = readSelectedPayload()
    var selectedWallet = isObject(selectedPayload && selectedPayload.wallet)
      ? selectedPayload.wallet
      : selectedPayload
    if (isObject(selectedWallet)) return selectedWallet

    var bridgePayload = readBridgePayload()
    var bridgeWallet = isObject(bridgePayload && bridgePayload.wallet)
      ? bridgePayload.wallet
      : bridgePayload
    var authPayload = readAuthPayload()
    var authWallet = isObject(authPayload && authPayload.wallet)
      ? authPayload.wallet
      : authPayload
    var userWallet = readUserWallet()
    var bridgeSource = String((bridgePayload && bridgePayload.source) || '')
    var bridgeIsExtension =
      bridgeSource.indexOf('do-wallet-extension') === 0 ||
      bridgeSource.indexOf('do-wallet-dashboard') === 0
    var wallet = bridgeIsExtension && isObject(bridgeWallet) ? bridgeWallet : authWallet || userWallet || bridgeWallet
    return isObject(wallet) ? wallet : null
  }

  function getDoAddress(wallet) {
    if (!isObject(wallet)) return ''
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {}
    var addressMap = isObject(wallet.addressMap) ? wallet.addressMap : {}
    var words = isObject(wallet.words) ? wallet.words : {}
    var candidates = [
      addresses[CHAIN_ID],
      addresses['Do Chain'],
      addresses['do-chain'],
      addresses[LEGACY_WALLET_CHAIN_ID],
      addresses['dochain-1'],
      addresses.dochain,
      addressMap[CHAIN_ID],
      addressMap['Do Chain'],
      addressMap['do-chain'],
      addressMap[LEGACY_WALLET_CHAIN_ID],
      addressMap['dochain-1'],
      addressMap.dochain,
      words[CHAIN_ID],
      words['Do Chain'],
      words['do-chain'],
      words[LEGACY_WALLET_CHAIN_ID],
      words['dochain-1'],
      words[888],
      words['888'],
      wallet.address,
      wallet.accAddress,
      wallet.accountAddress,
      wallet.doAddress,
      wallet.doChainAddress,
      addresses['phoenix-1'],
      addresses['columbus-5'],
    ]

    function addNested(value, depth) {
      if (!value || depth > 4) return
      if (typeof value === 'string') {
        candidates.push(value)
        return
      }
      if (Array.isArray(value)) {
        value.forEach(function (entry) { addNested(entry, depth + 1) })
        return
      }
      if (!isObject(value)) return
      Object.keys(value).forEach(function (key) {
        if (/private|seed|mnemonic|password|secret|token/i.test(key)) return
        addNested(value[key], depth + 1)
      })
    }

    addNested(addresses, 0)
    addNested(addressMap, 0)
    addNested(words, 0)
    addNested(wallet.chains, 0)
    addNested(wallet.accounts, 0)
    addNested(wallet.account, 0)

    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = String(candidates[i] || '').trim()
      if (/^do1[ac-hj-np-z02-9]{20,90}$/i.test(candidate)) return candidate
    }
    return ''
  }

  function getVisibleDoAddress() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('header,nav,[data-do-wallet-panel],.wallet-panel')).slice(0, 6)
    for (var i = 0; i < roots.length; i += 1) {
      var text = textOf(roots[i]).slice(0, 3000)
      var match = text.match(/\bdo1[ac-hj-np-z02-9]{20,90}\b/i)
      if (match) return match[0]
    }
    return ''
  }

  function getCurrentAccount() {
    return getDoAddress(readWallet()) || getVisibleDoAddress()
  }

  function findKnownWalletChainID(value, depth) {
    if (!value || depth > 4) return ''
    if (typeof value === 'string') {
      var text = value.trim()
      return WALLET_CHAIN_IDS.indexOf(text) >= 0 ? CHAIN_ID : ''
    }
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) {
        var foundInArray = findKnownWalletChainID(value[i], depth + 1)
        if (foundInArray) return foundInArray
      }
      return ''
    }
    if (!isObject(value)) return ''
    var direct = [
      value.chainID,
      value.chainId,
      value.chain_id,
      value.selectedChainID,
      value.selectedChainId,
      value.selectedChain,
      value.network,
      value.chain && value.chain.chainID,
      value.chain && value.chain.chainId,
      value.chain && value.chain.chain_id,
    ]
    for (var j = 0; j < direct.length; j += 1) {
      var foundDirect = findKnownWalletChainID(direct[j], depth + 1)
      if (foundDirect) return foundDirect
    }
    return ''
  }

  function getCurrentWalletChainID() {
    var bridge = readBridgePayload()
    var wallet = readWallet()
    var fromBridge = findKnownWalletChainID(bridge, 0)
    if (fromBridge) return fromBridge
    var fromWallet = findKnownWalletChainID(wallet, 0)
    if (fromWallet) return fromWallet
    try {
      for (var i = 0; i < window.localStorage.length; i += 1) {
        var key = window.localStorage.key(i)
        if (!/chain|network|wallet|station|do/i.test(key || '')) continue
        var fromStorage = findKnownWalletChainID(window.localStorage.getItem(key), 0)
        if (fromStorage) return fromStorage
      }
    } catch (error) {}
    return CHAIN_ID
  }

  function fetchJson(path, options) {
    return fetch(API + path, options).then(function (response) {
      return response.json().catch(function () { return {} }).then(function (data) {
        if (!response.ok) throw new Error(data.error || 'MFA request failed (' + response.status + ')')
        return data
      })
    })
  }

  function postJson(path, body) {
    return fetchJson(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body || {}),
    })
  }

  function getStatus(account) {
    if (!account) return Promise.resolve(null)
    return fetchJson('/status/' + encodeURIComponent(account), {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    }).catch(function () { return null })
  }

  function rememberStatus(account, status) {
    if (!account || !status) return
    mfaStatusCache.account = account
    mfaStatusCache.status = status
    mfaStatusCache.checkedAt = Date.now()
    mfaStatusCache.promise = null
  }

  function isChainMfaActive(status) {
    return Boolean(status && status.chain_policy_checked && status.chain_policy_active)
  }

  function isPendingServiceMfa(status) {
    return Boolean(status && status.enrolled && status.chain_policy_checked && !status.chain_policy_active)
  }

  function clearAccountMfaStorage(account) {
    if (!account) return
    try {
      window.localStorage.removeItem(enabledKey(account))
      window.localStorage.removeItem(setupKey(account))
      window.localStorage.removeItem(pendingSetupKey(account))
    } catch (error) {}
  }

  function updateCancelPanel(account, status) {
    var panel = document.querySelector('#' + modalId + ' [data-role="cancel-panel"]')
    if (!panel) return
    if (!account || !isPendingServiceMfa(status)) {
      panel.innerHTML = ''
      return
    }
    panel.innerHTML =
      '<div class="dochain-mfa-panel dochain-mfa-cancel-panel">' +
      '<h3>Cancel pending MFA setup</h3>' +
      '<p>MFA exists in the Do-Wallet service for this address, but it is not active on-chain. If you do not want to activate it, remove the pending service setup with your authenticator code or one recovery code.</p>' +
      '<div class="dochain-mfa-grid dochain-mfa-cancel-grid">' +
      '<label class="dochain-mfa-field"><span>Authenticator code</span><input class="dochain-mfa-input" inputmode="numeric" autocomplete="one-time-code" data-role="cancel-code" placeholder="123456"></label>' +
      '<label class="dochain-mfa-field"><span>Recovery code</span><input class="dochain-mfa-input" data-role="cancel-recovery" placeholder="Optional"></label>' +
      '</div>' +
      '<div class="dochain-mfa-actions"><button class="dochain-mfa-secondary dochain-mfa-danger" type="button" data-action="cancel-service-mfa">Cancel pending setup</button></div>' +
      '</div>'
  }

  function sleep(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms) })
  }

  function getWalletPoster() {
    var wallet = window.doWallet
    return wallet && typeof wallet.post === 'function' ? wallet : null
  }

  function requestWalletPopup() {
    try {
      window.postMessage({
        target: WALLET_OPEN_TARGET,
        type: WALLET_OPEN_TYPE,
        source: 'dochain-mfa-onboarding',
      }, window.location.origin)
    } catch (error) {}
    try {
      window.dispatchEvent(new CustomEvent('dochain_mfa_open_wallet_popup'))
    } catch (error) {}
  }

  function qrToBytes(value) {
    if (window.TextEncoder) return Array.prototype.slice.call(new TextEncoder().encode(value))
    return unescape(encodeURIComponent(value)).split('').map(function (char) { return char.charCodeAt(0) })
  }

  function qrGfMultiply(x, y) {
    var z = 0
    for (var i = 7; i >= 0; i -= 1) {
      z = ((z << 1) ^ ((z >>> 7) * 0x11d)) & 0xff
      if (((y >>> i) & 1) !== 0) z ^= x
    }
    return z
  }

  function qrReedSolomonGenerator(degree) {
    var result = new Array(degree).fill(0)
    result[degree - 1] = 1
    var root = 1
    for (var i = 0; i < degree; i += 1) {
      for (var j = 0; j < degree; j += 1) {
        result[j] = qrGfMultiply(result[j], root)
        if (j + 1 < degree) result[j] ^= result[j + 1]
      }
      root = qrGfMultiply(root, 2)
    }
    return result
  }

  function qrReedSolomonRemainder(data, degree) {
    var generator = qrReedSolomonGenerator(degree)
    var result = new Array(degree).fill(0)
    data.forEach(function (byte) {
      var factor = byte ^ result.shift()
      result.push(0)
      for (var i = 0; i < degree; i += 1) result[i] ^= qrGfMultiply(generator[i], factor)
    })
    return result
  }

  function qrDrawFinder(modules, reserved, x, y) {
    var size = modules.length
    for (var dy = -1; dy <= 7; dy += 1) {
      for (var dx = -1; dx <= 7; dx += 1) {
        var xx = x + dx
        var yy = y + dy
        if (xx < 0 || xx >= size || yy < 0 || yy >= size) continue
        var dark = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
          (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4))
        modules[yy][xx] = dark
        reserved[yy][xx] = true
      }
    }
  }

  function qrDrawAlignment(modules, reserved, x, y) {
    for (var dy = -2; dy <= 2; dy += 1) {
      for (var dx = -2; dx <= 2; dx += 1) {
        var distance = Math.max(Math.abs(dx), Math.abs(dy))
        modules[y + dy][x + dx] = distance !== 1
        reserved[y + dy][x + dx] = true
      }
    }
  }

  function qrBchRemainder(value, generator, degree) {
    var result = value
    for (var i = Math.floor(Math.log(result) / Math.LN2); i >= degree; i -= 1) {
      if (((result >>> i) & 1) !== 0) result ^= generator << (i - degree)
    }
    return result
  }

  function qrFormatBits(mask) {
    var data = (1 << 3) | mask
    return ((data << 10) | qrBchRemainder(data << 10, 0x537, 10)) ^ 0x5412
  }

  function qrVersionBits(version) {
    return (version << 12) | qrBchRemainder(version << 12, 0x1f25, 12)
  }

  function createQrDataUri(value) {
    try {
      var version = 10
      var size = 4 * version + 17
      var dataCodewords = 274
      var ecCodewords = 18
      var bytes = qrToBytes(value)
      if (bytes.length > dataCodewords - 4) return ''
      var bits = []
      var addBits = function (val, len) {
        for (var i = len - 1; i >= 0; i -= 1) bits.push((val >>> i) & 1)
      }
      addBits(4, 4)
      addBits(bytes.length, 16)
      bytes.forEach(function (byte) { addBits(byte, 8) })
      var capacity = dataCodewords * 8
      addBits(0, Math.min(4, capacity - bits.length))
      while (bits.length % 8 !== 0) bits.push(0)
      var codewords = []
      for (var i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2))
      for (var pad = 0; codewords.length < dataCodewords; pad += 1) codewords.push(pad % 2 === 0 ? 0xec : 0x11)

      var dataBlocks = [
        codewords.slice(0, 68),
        codewords.slice(68, 136),
        codewords.slice(136, 205),
        codewords.slice(205, 274),
      ]
      var eccBlocks = dataBlocks.map(function (block) { return qrReedSolomonRemainder(block, ecCodewords) })
      var allCodewords = []
      for (i = 0; i < 69; i += 1) dataBlocks.forEach(function (block) { if (i < block.length) allCodewords.push(block[i]) })
      for (i = 0; i < ecCodewords; i += 1) eccBlocks.forEach(function (block) { allCodewords.push(block[i]) })

      var modules = Array.from({ length: size }, function () { return new Array(size).fill(false) })
      var reserved = Array.from({ length: size }, function () { return new Array(size).fill(false) })
      var setFunction = function (x, y, dark) {
        modules[y][x] = dark
        reserved[y][x] = true
      }

      qrDrawFinder(modules, reserved, 0, 0)
      qrDrawFinder(modules, reserved, size - 7, 0)
      qrDrawFinder(modules, reserved, 0, size - 7)
      for (i = 8; i < size - 8; i += 1) {
        setFunction(i, 6, i % 2 === 0)
        setFunction(6, i, i % 2 === 0)
      }
      ;[6, 28, 50].forEach(function (x) {
        ;[6, 28, 50].forEach(function (y) {
          if (!((x === 6 && y === 6) || (x === 6 && y === 50) || (x === 50 && y === 6))) {
            qrDrawAlignment(modules, reserved, x, y)
          }
        })
      })
      setFunction(8, size - 8, true)
      for (i = 0; i < 9; i += 1) {
        if (i !== 6) {
          setFunction(8, i, false)
          setFunction(i, 8, false)
        }
      }
      for (i = 0; i < 8; i += 1) {
        setFunction(size - 1 - i, 8, false)
        setFunction(8, size - 1 - i, false)
      }
      var vbits = qrVersionBits(version)
      for (i = 0; i < 18; i += 1) {
        var bit = ((vbits >>> i) & 1) !== 0
        var a = size - 11 + (i % 3)
        var b = Math.floor(i / 3)
        setFunction(a, b, bit)
        setFunction(b, a, bit)
      }

      var dataBits = []
      allCodewords.forEach(function (byte) { for (var j = 7; j >= 0; j -= 1) dataBits.push((byte >>> j) & 1) })
      var bitIndex = 0
      var upward = true
      for (var x = size - 1; x >= 1; x -= 2) {
        if (x === 6) x -= 1
        for (var y = 0; y < size; y += 1) {
          var yy = upward ? size - 1 - y : y
          for (var dx = 0; dx < 2; dx += 1) {
            var xx = x - dx
            if (reserved[yy][xx]) continue
            var dataBit = bitIndex < dataBits.length && dataBits[bitIndex] === 1
            bitIndex += 1
            if ((xx + yy) % 2 === 0) dataBit = !dataBit
            modules[yy][xx] = dataBit
          }
        }
        upward = !upward
      }

      var fbits = qrFormatBits(0)
      for (i = 0; i <= 5; i += 1) setFunction(8, i, ((fbits >>> i) & 1) !== 0)
      setFunction(8, 7, ((fbits >>> 6) & 1) !== 0)
      setFunction(8, 8, ((fbits >>> 7) & 1) !== 0)
      setFunction(7, 8, ((fbits >>> 8) & 1) !== 0)
      for (i = 9; i < 15; i += 1) setFunction(14 - i, 8, ((fbits >>> i) & 1) !== 0)
      for (i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, ((fbits >>> i) & 1) !== 0)
      for (i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, ((fbits >>> i) & 1) !== 0)
      setFunction(8, size - 8, true)

      var border = 4
      var dim = size + border * 2
      var path = []
      for (y = 0; y < size; y += 1) {
        for (x = 0; x < size; x += 1) {
          if (modules[y][x]) path.push('M' + (x + border) + ' ' + (y + border) + 'h1v1h-1z')
        }
      }
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '">' +
        '<rect width="' + dim + '" height="' + dim + '" fill="#fff"/>' +
        '<path d="' + path.join('') + '" fill="#111"/>' +
        '</svg>'
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    } catch (error) {
      return ''
    }
  }

  function makeSelfSend(account) {
    var data = {
      '@type': '/cosmos.bank.v1beta1.MsgSend',
      from_address: account,
      to_address: account,
      amount: [{ denom: DENOM, amount: '1' }],
    }
    var amino = {
      type: 'cosmos-sdk/MsgSend',
      value: {
        from_address: account,
        to_address: account,
        amount: [{ denom: DENOM, amount: '1' }],
      },
    }
    return {
      toData: function () { return data },
      toJSON: function () { return amino },
    }
  }

  function makeFee() {
    var fee = {
      amount: [{ denom: DENOM, amount: '5000' }],
      gas: '200000',
    }
    return {
      toData: function () { return fee },
      toJSON: function () { return fee },
    }
  }

  function toTxData(value) {
    if (!value || typeof value === 'string') return value
    if (typeof value.toData === 'function') {
      try {
        return value.toData(false)
      } catch (_) {
        return value.toData()
      }
    }
    if (typeof value.toJSON === 'function') return value.toJSON()
    return value
  }

  function toPostJson(value) {
    if (typeof value === 'string') return value
    return JSON.stringify(toTxData(value))
  }

  function serializeForExtensionPost(tx) {
    return {
      ...tx,
      msgs: (tx.msgs || []).map(toPostJson),
      fee: tx.fee ? toPostJson(tx.fee) : tx.fee,
    }
  }

  async function postEnableTransaction(account, code, setup, guardianAddress, setStatus) {
    if (typeof window.doChainMfaBeforePost !== 'function') {
      throw new Error('Do Chain MFA transaction helper is still loading. Refresh and try again.')
    }
    var poster = getWalletPoster()
    if (!poster) {
      throw new Error('Do-Wallet extension signing was not detected. Use Settings > Multi-factor authentication to finish activation from the connected web wallet.')
    }

    var tx = {
      chainID: getCurrentWalletChainID(),
      msgs: [makeSelfSend(account)],
      fee: makeFee(),
      memo: '',
      waitForConfirmation: true,
      __dochainMfaCode: code,
      __dochainMfaControl: {
        account: account,
        enablePubKey: setup.approval_pub_key,
        guardianAddress: setup.guardian_address || guardianAddress || '',
      },
    }

    setStatus('Preparing the on-chain MFA enable memo...')
    tx = await window.doChainMfaBeforePost(tx)
    setStatus('Opening Do-Wallet for the signing request.')
    updateWalletApprovalPanel(true, 'A signing request has been sent to Do-Wallet. Approve it there to activate MFA on-chain.')
    requestWalletPopup()
    window.setTimeout(requestWalletPopup, 500)
    window.setTimeout(function () {
      if (activationAwaitingWallet) {
        setStatus('Waiting for Do-Wallet approval. Open the extension popup if it is not visible.')
        updateWalletApprovalPanel(true, 'The on-chain activation transaction is waiting in Do-Wallet. Open Do-Wallet and approve the request.')
      }
    }, 1500)
    var result = await poster.post(serializeForExtensionPost(tx))
    updateWalletApprovalPanel(false)
    return result
  }

  function installStyles() {
    if (document.getElementById('dochain-mfa-onboarding-style')) return
    var style = document.createElement('style')
    style.id = 'dochain-mfa-onboarding-style'
    style.textContent = [
      '.dochain-mfa-identity{position:relative;padding-right:128px;min-width:260px;max-width:100%}',
      '.dochain-mfa-identity h2{margin-bottom:0}',
      '.dochain-mfa-button{position:absolute;right:0;bottom:0;z-index:2;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #fbbf24;background:#f59e0b;color:#140b02;border-radius:8px;padding:8px 12px;font:inherit;font-size:13px;font-weight: 700;line-height:1;cursor:pointer;vertical-align:middle;white-space:nowrap;box-shadow:0 0 0 1px rgba(255,255,255,.18) inset}',
      '.dochain-mfa-button:hover{background:#ffb020;border-color:#ffe08a}',
      '.dochain-mfa-button[data-enabled="true"]{border-color:#86efac;background:#16a34a;color:#fff}',
      '.dochain-mfa-button[data-enabled="true"]:hover{background:#15803d;border-color:#bbf7d0}',
      '.dochain-mfa-title-fallback{display:inline-flex;margin-left:14px;position:static;vertical-align:middle}',
      '.dochain-mfa-chain-pill-fallback{display:inline-flex;position:static;margin-left:10px;min-height:33px;vertical-align:middle}',
      '.dochain-mfa-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,2,14,.76);backdrop-filter:blur(8px)}',
      '.dochain-mfa-dialog{width:min(760px,100%);max-height:min(820px,calc(100vh - 32px));overflow:auto;border:1px solid #4b276d;border-radius:8px;background:#120b1d;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.48)}',
      '.dochain-mfa-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 24px 16px;border-bottom:1px solid #332044}',
      '.dochain-mfa-eyebrow{margin:0 0 8px;color:#f6b44b;font-size:12px;font-weight: 700;text-transform:uppercase}',
      '.dochain-mfa-title{margin:0;font-size:28px;line-height:1.12;letter-spacing:0}',
      '.dochain-mfa-close{border:1px solid #4b276d;border-radius:8px;background:#1b1228;color:#fff;width:36px;height:36px;font-size:24px;line-height:30px;cursor:pointer}',
      '.dochain-mfa-body{padding:20px 24px 24px}',
      '.dochain-mfa-body p{color:#cfbfed;line-height:1.48;margin:0 0 12px}',
      '.dochain-mfa-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}',
      '.dochain-mfa-panel{border:1px solid #38234f;background:#171020;border-radius:8px;padding:14px}',
      '.dochain-mfa-panel h3{margin:0 0 8px;font-size:14px;color:#fff}',
      '.dochain-mfa-panel ul,.dochain-mfa-panel ol{margin:0;padding-left:18px;color:#cfbfed;font-size:13px;line-height:1.42}',
      '.dochain-mfa-panel li{margin:0 0 6px}',
      '.dochain-mfa-form{display:grid;gap:12px;margin-top:18px;padding-top:18px;border-top:1px solid #332044}',
      '.dochain-mfa-field{display:grid;gap:7px}',
      '.dochain-mfa-field span{font-size:12px;color:#bda9e5;font-weight: 700;text-transform:uppercase}',
      '.dochain-mfa-input{width:100%;box-sizing:border-box;border:1px solid #4b276d;border-radius:8px;background:#080411;color:#fff;padding:11px 12px;font:inherit}',
      '.dochain-mfa-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}',
      '.dochain-mfa-primary,.dochain-mfa-secondary{border-radius:8px;padding:10px 13px;font:inherit;font-weight: 700;cursor:pointer}',
      '.dochain-mfa-primary{border:1px solid #f59e0b;background:#f59e0b;color:#130a04}',
      '.dochain-mfa-primary:disabled{opacity:.5;cursor:not-allowed}',
      '.dochain-mfa-secondary{border:1px solid #5f2f95;background:#241936;color:#fff}',
      '.dochain-mfa-danger{border-color:#ef4444;background:#2a1018;color:#ffd5dc}',
      '.dochain-mfa-danger:hover{background:#43131f;border-color:#fb7185}',
      '.dochain-mfa-cancel-panel{margin-top:12px}',
      '.dochain-mfa-cancel-grid{grid-template-columns:repeat(2,minmax(0,1fr));margin:10px 0}',
      '.dochain-mfa-qr{display:flex;align-items:center;gap:14px;border:1px solid #4b276d;border-radius:8px;background:#080411;padding:12px;margin:8px 0}',
      '.dochain-mfa-qr img{width:164px;height:164px;flex:0 0 auto;border-radius:8px;background:#fff;padding:8px;box-sizing:border-box}',
      '.dochain-mfa-qr p{margin:0;color:#cfbfed;font-size:13px;line-height:1.42}',
      '.dochain-mfa-secret{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px solid #4b276d;border-radius:8px;background:#080411;padding:10px 12px;color:#fff;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;word-break:break-all}',
      '.dochain-mfa-link{color:#ffd28a;font-weight: 700;text-decoration:none}',
      '.dochain-mfa-status{min-height:20px;color:#d8c8ff;font-size:13px}',
      '.dochain-mfa-error{color:#ff9baa}',
      '.dochain-mfa-success{color:#a7f3d0}',
      '.dochain-mfa-codes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}',
      '.dochain-mfa-code{border:1px solid #3b2454;border-radius:8px;background:#0c0714;padding:8px 10px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#fff}',
      '@media (max-width:760px){.dochain-mfa-grid,.dochain-mfa-cancel-grid{grid-template-columns:1fr}.dochain-mfa-head{padding:18px}.dochain-mfa-body{padding:18px}.dochain-mfa-codes{grid-template-columns:1fr}.dochain-mfa-title{font-size:23px}.dochain-mfa-qr{align-items:flex-start;flex-direction:column}.dochain-mfa-identity{padding-right:0}.dochain-mfa-button{position:static;margin-top:10px}.dochain-mfa-title-fallback,.dochain-mfa-chain-pill-fallback{margin-left:0;margin-top:10px}}',
    ].join('')
    document.head.appendChild(style)
  }

  function setStatus(message, kind) {
    var node = document.querySelector('#' + modalId + ' .dochain-mfa-status')
    if (!node) return
    node.className = 'dochain-mfa-status' + (kind ? ' dochain-mfa-' + kind : '')
    node.textContent = message || ''
  }

  function updateWalletApprovalPanel(show, message) {
    var panel = document.querySelector('#' + modalId + ' [data-role="wallet-panel"]')
    if (!panel) return
    if (!show) {
      panel.innerHTML = ''
      return
    }
    panel.innerHTML =
      '<div class="dochain-mfa-panel dochain-mfa-wallet-panel">' +
      '<h3>Approve in Do-Wallet</h3>' +
      '<p>' + escapeHtml(message || 'A signing request is waiting in Do-Wallet. Open the extension popup, enter your wallet password if asked, then approve the transaction.') + '</p>' +
      '<div class="dochain-mfa-actions"><button class="dochain-mfa-primary" type="button" data-action="open-wallet">Open Do-Wallet</button></div>' +
      '</div>'
  }

  function updateSetupPanel(setup) {
    var panel = document.querySelector('#' + modalId + ' [data-role="setup-panel"]')
    if (!panel) return
    if (!setup) {
      panel.innerHTML = ''
      return
    }
    var qrData = setup.otpauth_url ? createQrDataUri(setup.otpauth_url) : ''
    panel.innerHTML =
      '<div class="dochain-mfa-field">' +
      '<span>Authenticator setup</span>' +
      '<p>Scan the QR code with your authenticator app, or copy the manual secret, then enter the current 6-digit code.</p>' +
      (qrData ? '<div class="dochain-mfa-qr"><img src="' + escapeHtml(qrData) + '" alt="Authenticator setup QR code"><p>Scan this QR code in Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app.</p></div>' : '') +
      '<div class="dochain-mfa-secret"><code>' + escapeHtml(setup.secret) + '</code><button class="dochain-mfa-secondary" type="button" data-action="copy-secret">Copy</button></div>' +
      (setup.otpauth_url ? '<a class="dochain-mfa-link" href="' + escapeHtml(setup.otpauth_url) + '">Open authenticator link</a>' : '') +
      '</div>' +
      '<label class="dochain-mfa-field"><span>Authentication code</span><input class="dochain-mfa-input" inputmode="numeric" autocomplete="one-time-code" data-role="code" placeholder="123456"></label>' +
      '<label class="dochain-mfa-field"><span>Before enabling</span><label><input type="checkbox" data-role="saved"> I have stored the manual secret and understand recovery codes are shown once.</label></label>'
  }

  function showRecoveryCodes(codes) {
    var panel = document.querySelector('#' + modalId + ' [data-role="recovery-panel"]')
    if (!panel || !Array.isArray(codes) || !codes.length) return
    panel.innerHTML =
      '<div class="dochain-mfa-panel">' +
      '<h3>Save these recovery codes now</h3>' +
      '<p>These are shown once. Store them offline with your wallet recovery records. Recovery codes do not activate on-chain MFA by themselves; approve the Do-Wallet signing popup to finish activation.</p>' +
      '<div class="dochain-mfa-codes">' +
      codes.map(function (code) { return '<div class="dochain-mfa-code">' + escapeHtml(code) + '</div>' }).join('') +
      '</div>' +
      '<div class="dochain-mfa-actions" style="margin-top:10px"><button class="dochain-mfa-secondary" type="button" data-action="copy-codes">Copy recovery codes</button></div>' +
      '</div>'
  }

  function modalMarkup(account) {
    var chainEnabled = account && window.localStorage.getItem(enabledKey(account))
    return (
      '<div class="dochain-mfa-overlay" role="presentation">' +
      '<section class="dochain-mfa-dialog" role="dialog" aria-modal="true" aria-labelledby="dochain-mfa-title">' +
      '<header class="dochain-mfa-head">' +
      '<div><p class="dochain-mfa-eyebrow">Do Chain only</p><h2 class="dochain-mfa-title" id="dochain-mfa-title">' + (chainEnabled ? 'Manage Do Chain MFA' : 'Activate Do Chain MFA') + '</h2></div>' +
      '<button class="dochain-mfa-close" type="button" data-action="close" aria-label="Close">×</button>' +
      '</header>' +
      '<div class="dochain-mfa-body">' +
      '<p>MFA adds a second approval step for protected Do Chain transactions. Your wallet still signs the transaction, then your authenticator code unlocks a short-lived MFA approval that Do Chain validators verify on-chain for that exact transaction.</p>' +
      '<div class="dochain-mfa-grid">' +
      '<article class="dochain-mfa-panel"><h3>How it works</h3><ol><li>Scan a Do-Wallet authenticator secret.</li><li>Sign a Do Chain enable transaction.</li><li>Protected udo sends, undelegations, redelegations, IBC transfers, and supported swaps require MFA approval.</li></ol></article>' +
      '<article class="dochain-mfa-panel"><h3>Store safely</h3><ul><li>Your wallet recovery phrase or private key.</li><li>The authenticator entry or manual secret.</li><li>The recovery codes shown after setup.</li><li>Any guardian wallet details you choose to use.</li></ul></article>' +
      '<article class="dochain-mfa-panel"><h3>If a device is lost</h3><ul><li>Use a recovery code for a disable or rotate action.</li><li>Use a guardian approval if one is set.</li><li>Use delayed recovery after 72 hours.</li><li>You still need your wallet key to sign.</li></ul></article>' +
      '</div>' +
      '<form class="dochain-mfa-form">' +
      '<label class="dochain-mfa-field"><span>Do Chain account</span><input class="dochain-mfa-input" data-role="account" value="' + escapeHtml(account) + '" placeholder="do1..."></label>' +
      '<label class="dochain-mfa-field"><span>Recovery guardian (optional)</span><input class="dochain-mfa-input" data-role="guardian" placeholder="do1..."></label>' +
      '<div class="dochain-mfa-actions"><button class="dochain-mfa-primary" type="button" data-action="begin">Start setup</button><button class="dochain-mfa-secondary" type="button" data-action="check">Check status</button><button class="dochain-mfa-secondary" type="button" data-action="close">Close</button></div>' +
      '<div data-role="setup-panel"></div>' +
      '<div class="dochain-mfa-actions"><button class="dochain-mfa-primary" type="button" data-action="enable" disabled>Activate on-chain MFA</button></div>' +
      '<div class="dochain-mfa-status"></div>' +
      '<div data-role="cancel-panel"></div>' +
      '<div data-role="wallet-panel"></div>' +
      '<div data-role="recovery-panel"></div>' +
      '</form>' +
      '</div>' +
      '</section>' +
      '</div>'
    )
  }

  function currentFormValue(role) {
    var node = document.querySelector('#' + modalId + ' [data-role="' + role + '"]')
    return node ? String(node.value || '').trim() : ''
  }

  function setEnableDisabled() {
    var button = document.querySelector('#' + modalId + ' [data-action="enable"]')
    var code = currentFormValue('code').replace(/\s/g, '')
    var saved = document.querySelector('#' + modalId + ' [data-role="saved"]')
    if (!button) return
    var reason = ''
    if (enableBusy) reason = 'MFA activation is already in progress.'
    else if (!activeSetup) reason = 'Start setup first.'
    else if (!/^\d{6}$/.test(code)) reason = 'Enter the current 6-digit authenticator code.'
    else if (!(saved && saved.checked)) reason = 'Confirm you saved the authenticator secret and recovery codes.'
    button.disabled = Boolean(reason)
    button.title = reason || 'Create the on-chain MFA activation transaction.'
  }

  async function beginSetup() {
    var account = currentFormValue('account')
    var guardian = currentFormValue('guardian')
    if (!/^do1[ac-hj-np-z02-9]{20,90}$/i.test(account)) {
      setStatus('Enter a valid Do Chain account first.', 'error')
      return
    }
    setStatus('Creating authenticator secret...')
    try {
      activeSetup = await postJson('/setup/start', {
        account: account,
        guardian_address: guardian,
      })
      writeJson(pendingSetupKey(account), activeSetup)
      updateSetupPanel(activeSetup)
      setStatus('Authenticator secret created. Scan it, then enter the 6-digit code.')
      setEnableDisabled()
    } catch (error) {
      setStatus(error.message || 'MFA setup failed', 'error')
    }
  }

  async function checkStatus() {
    var account = currentFormValue('account')
    if (!account) {
      setStatus('Enter a Do Chain account to check.', 'error')
      return
    }
    setStatus('Checking MFA status...')
    var status = await getStatus(account)
    if (!status) {
      setStatus('MFA status is unavailable right now.', 'error')
      updateCancelPanel(account, null)
      return
    }
    rememberStatus(account, status)
    applyButtonStatus(document.getElementById(buttonId), account, status, false)
    updateCancelPanel(account, status)
    var chainStatus = ''
    if (status.chain_policy_checked) {
      chainStatus = status.chain_policy_active
        ? ' On-chain policy is active.'
        : ' On-chain policy is not active yet.'
    } else if (status.enrolled) {
      chainStatus = ' On-chain policy could not be checked.'
    }
    setStatus(
      status.enrolled
        ? 'MFA service enrollment exists. Recovery codes remaining: ' + status.recovery_codes_remaining + '.' + chainStatus
        : 'No MFA service enrollment found for this account.' + chainStatus,
      status.enrolled && status.chain_policy_active ? 'success' : status.enrolled ? 'error' : ''
    )
  }

  async function enableMfa() {
    if (enableBusy) return
    var account = currentFormValue('account')
    var guardian = currentFormValue('guardian')
    var code = currentFormValue('code').replace(/\s/g, '')
    if (!activeSetup) {
      setStatus('Start setup first.', 'error')
      return
    }
    if (!/^\d{6}$/.test(code)) {
      setStatus('Enter the current 6-digit authenticator code.', 'error')
      return
    }
    enableBusy = true
    setEnableDisabled()
    setStatus('Verifying authenticator code...')
    try {
      var setup = await postJson('/setup', {
        account: account,
        setup_id: activeSetup.setup_id,
        setup_secret: activeSetup.secret,
        code: code,
        guardian_address: guardian,
      })
      writeJson(setupKey(account), setup)
      window.localStorage.removeItem(pendingSetupKey(account))
      showRecoveryCodes(setup.recovery_codes)
      activationAwaitingWallet = true
      setStatus('Recovery codes created. Save them, then approve the Do-Wallet popup to activate MFA on-chain.')
      await postEnableTransaction(account, code, setup, guardian, setStatus)
      var active = await waitForChainMfaActive(account, setStatus)
      if (active) {
        updateCancelPanel(account, { enrolled: true, chain_policy_checked: true, chain_policy_active: true })
        setStatus('Do Chain MFA is active on-chain. Save the recovery codes before closing.', 'success')
      } else {
        setStatus('MFA service setup is complete, but the on-chain policy is not active yet. Press Check status after the transaction confirms.', 'error')
      }
    } catch (error) {
      updateWalletApprovalPanel(false)
      if (/setup was refreshed|setup was not started|expired/i.test(error.message || '')) {
        activeSetup = null
        updateSetupPanel(null)
        window.localStorage.removeItem(pendingSetupKey(account))
      }
      setStatus(error.message || 'MFA activation failed', 'error')
    } finally {
      activationAwaitingWallet = false
      enableBusy = false
      setEnableDisabled()
    }
  }

  async function cancelPendingMfaSetup() {
    var account = currentFormValue('account')
    var code = currentFormValue('cancel-code').replace(/\s/g, '')
    var recovery = currentFormValue('cancel-recovery')
    if (!account) {
      setStatus('Enter a Do Chain account first.', 'error')
      return
    }
    if (!/^\d{6}$/.test(code) && !recovery) {
      setStatus('Enter the current authenticator code or one recovery code to cancel the pending MFA setup.', 'error')
      return
    }
    setStatus('Cancelling pending MFA setup...')
    try {
      var body = { account: account }
      if (recovery) body.recovery_code = recovery
      else body.code = code
      var result = await postJson('/remove', body)
      clearAccountMfaStorage(account)
      activeSetup = null
      updateSetupPanel(null)
      updateWalletApprovalPanel(false)
      var status = {
        account: account,
        enrolled: false,
        chain_policy_checked: true,
        chain_policy_active: false,
        recovery_codes_remaining: 0,
      }
      rememberStatus(account, status)
      applyButtonStatus(document.getElementById(buttonId), account, status, false)
      updateCancelPanel(account, status)
      setStatus(
        result && result.removed
          ? 'Pending MFA setup removed. On-chain MFA was not active, so no chain transaction was needed.'
          : 'No pending MFA setup was found for this address.',
        'success'
      )
    } catch (error) {
      setStatus(error.message || 'Could not cancel pending MFA setup.', 'error')
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
    }
    var input = document.createElement('textarea')
    input.value = text
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    return Promise.resolve()
  }

  function openModal() {
    installStyles()
    closeModal()
    activeSetup = null
    var account = getCurrentAccount()
    var modal = document.createElement('div')
    modal.id = modalId
    modal.innerHTML = modalMarkup(account)
    document.body.appendChild(modal)
    document.body.style.overflow = 'hidden'
    modal.addEventListener('click', async function (event) {
      var actionNode = event.target && event.target.closest('[data-action]')
      var action = actionNode && actionNode.getAttribute('data-action')
      if (!action) return
      if (action === 'close') closeModal()
      if (action === 'begin') beginSetup()
      if (action === 'check') checkStatus()
      if (action === 'enable') enableMfa()
      if (action === 'cancel-service-mfa') cancelPendingMfaSetup()
      if (action === 'open-wallet') {
        requestWalletPopup()
        setStatus('Opening Do-Wallet. Approve the signing request there.')
      }
      if (action === 'copy-secret' && activeSetup) {
        await copyText(activeSetup.secret)
        setStatus('Manual secret copied.')
      }
      if (action === 'copy-codes') {
        var codes = Array.prototype.slice.call(modal.querySelectorAll('.dochain-mfa-code'))
          .map(function (node) { return node.textContent.trim() })
          .filter(Boolean)
        await copyText(codes.join('\n'))
        setStatus(
          activationAwaitingWallet
            ? 'Recovery codes copied. Now approve the Do-Wallet popup to activate MFA on-chain.'
            : 'Recovery codes copied. Store them offline.',
          'success'
        )
      }
    })
    modal.addEventListener('input', setEnableDisabled)
    modal.querySelector('[data-role="account"]').focus()
    var pending = account ? safeJson(window.localStorage.getItem(pendingSetupKey(account)), null) : null
    if (pending && pending.setup_id && pending.secret) {
      activeSetup = pending
      updateSetupPanel(activeSetup)
      setStatus('Authenticator setup restored. Enter the current 6-digit code, tick the saved box, then activate on-chain MFA.')
      setEnableDisabled()
    }
    if (account && !(pending && pending.setup_id && pending.secret)) checkStatus()
  }

  function closeModal() {
    var modal = document.getElementById(modalId)
    if (modal) modal.remove()
    if (!document.getElementById(modalId)) document.body.style.overflow = ''
  }

  function textOf(node) {
    return String((node && (node.textContent || node.innerText)) || '').trim()
  }

  function findSelectedDoChainBlock() {
    var labels = Array.prototype.slice.call(document.querySelectorAll('p,span,div'))
      .filter(function (node) { return textOf(node) === 'Selected chain' })
    for (var i = 0; i < labels.length; i += 1) {
      var label = labels[i]
      var section = label.closest('section')
      if (!section) continue
      var text = textOf(section)
      if (text.indexOf('Do Chain') !== -1 && text.indexOf(CHAIN_ID) !== -1) {
        return label.parentElement || section
      }
    }
    return null
  }

  function findDoChainTitle() {
    var headings = Array.prototype.slice.call(document.querySelectorAll('h1'))
      .filter(function (node) { return textOf(node) === 'Do Chain' })
      .concat(Array.prototype.slice.call(document.querySelectorAll('h2'))
        .filter(function (node) { return textOf(node) === 'Do Chain' }))
    for (var i = 0; i < headings.length; i += 1) {
      var heading = headings[i]
      if (heading.closest('#' + modalId)) continue
      return heading
    }
    return null
  }

  function isVisibleNode(node) {
    if (!node || !node.getBoundingClientRect) return false
    if (node.closest('#' + modalId)) return false
    var rect = node.getBoundingClientRect()
    var style = window.getComputedStyle ? window.getComputedStyle(node) : null
    return rect.width > 0 && rect.height > 0 &&
      rect.bottom >= 0 && rect.top <= window.innerHeight &&
      (!style || (style.visibility !== 'hidden' && style.display !== 'none'))
  }

  function findDoChainPill() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll('button,a,[role="button"],span,p,div'))
      .filter(function (node) { return textOf(node) === 'Do Chain' && isVisibleNode(node) })
      .map(function (node) {
        var clickable = node.closest('button,a,[role="button"]') || node
        var rect = clickable.getBoundingClientRect()
        return { node: clickable, rect: rect }
      })
      .filter(function (entry) {
        return entry.rect.top < 180 && entry.rect.left < Math.max(720, window.innerWidth * 0.75)
      })
      .sort(function (a, b) {
        return (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left)
      })
    return candidates.length ? candidates[0].node : null
  }

  function updateButtonLabel() {
    var button = document.getElementById(buttonId)
    if (!button) return
    var account = getCurrentAccount()
    if (!account) {
      applyButtonStatus(button, '', null, false)
      return
    }
    if (
      mfaStatusCache.account === account &&
      mfaStatusCache.status &&
      Date.now() - mfaStatusCache.checkedAt < 30000
    ) {
      applyButtonStatus(button, account, mfaStatusCache.status, false)
      return
    }
    applyButtonStatus(button, account, mfaStatusCache.account === account ? mfaStatusCache.status : null, false)
    if (!mfaStatusCache.promise || mfaStatusCache.account !== account) {
      mfaStatusCache.account = account
      mfaStatusCache.promise = window.setTimeout(function () {
        mfaStatusCache.promise = getStatus(account).then(function (status) {
          rememberStatus(account, status)
          if (getCurrentAccount() === account) {
            applyButtonStatus(document.getElementById(buttonId), account, status, false)
          }
          return status
        }).catch(function () {
          mfaStatusCache.promise = null
          applyButtonStatus(document.getElementById(buttonId), account, null, false)
        })
      }, 600)
    }
  }

  function applyButtonStatus(button, account, status, checking) {
    if (!button) return
    var active = isChainMfaActive(status)
    if (active) {
      window.localStorage.setItem(enabledKey(account), 'true')
      button.textContent = 'MFA ACTIVATED'
      button.title = 'On-chain MFA is active for this Do Chain account.'
      button.setAttribute('data-enabled', 'true')
      return
    }
    if (account && status && status.chain_policy_checked && !status.chain_policy_active) {
      window.localStorage.removeItem(enabledKey(account))
    }
    button.textContent = checking ? 'Checking MFA' : 'On-chain MFA'
    button.title = account && status && status.enrolled
      ? 'MFA service setup exists, but on-chain activation is not complete.'
      : 'Activate on-chain MFA for this Do Chain account.'
    button.setAttribute('data-enabled', 'false')
  }

  async function waitForChainMfaActive(account, setStatus) {
    for (var attempt = 0; attempt < 12; attempt += 1) {
      if (attempt === 0) setStatus('Activation transaction sent. Waiting for on-chain MFA policy...')
      else await sleep(1500)
      var status = await getStatus(account)
      if (status) {
        rememberStatus(account, status)
        applyButtonStatus(document.getElementById(buttonId), account, status, false)
        if (isChainMfaActive(status)) return true
      }
    }
    return false
  }

  function injectButton() {
    installStyles()
    var block = findSelectedDoChainBlock()
    var button = document.getElementById(buttonId)
    if (!button) {
      button = document.createElement('button')
      button.id = buttonId
      button.type = 'button'
      button.className = 'dochain-mfa-button'
    }
    var title = findDoChainTitle()
    if (title) {
      button.className = 'dochain-mfa-button dochain-mfa-title-fallback'
      title.insertAdjacentElement('afterend', button)
      updateButtonLabel()
      return
    }
    var pill = findDoChainPill()
    if (pill) {
      button.className = 'dochain-mfa-button dochain-mfa-chain-pill-fallback'
      pill.insertAdjacentElement('afterend', button)
      updateButtonLabel()
      return
    }
    if (!block) {
      return
    }
    block.classList.add('dochain-mfa-identity')
    button.className = 'dochain-mfa-button'
    var h2 = block.querySelector('h2')
    var chainId = Array.prototype.slice.call(block.querySelectorAll('span'))
      .filter(function (node) { return textOf(node) === CHAIN_ID })[0]
    if (chainId && chainId.parentElement) chainId.insertAdjacentElement('afterend', button)
    else if (h2 && h2.parentElement) h2.insertAdjacentElement('afterend', button)
    else block.appendChild(button)
    updateButtonLabel()
  }

  function scheduleInject() {
    var now = Date.now()
    var elapsed = now - (scheduleInject.lastRunAt || 0)
    var delay = elapsed > 900 ? 150 : 900 - elapsed
    window.clearTimeout(scheduleInject.timer)
    scheduleInject.timer = window.setTimeout(function () {
      scheduleInject.lastRunAt = Date.now()
      injectButton()
    }, delay)
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeModal()
  })
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest && event.target.closest('#' + buttonId)
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    openModal()
  }, true)
  window.addEventListener('load', scheduleInject)
  window.addEventListener('hashchange', scheduleInject)
  window.addEventListener('do_wallet_bridge_update', scheduleInject)
  window.addEventListener('storage', function (event) {
    if (!event.key || event.key.indexOf('dochain_mfa_') === 0 || event.key === 'user' || event.key === WALLET_BRIDGE_KEY || event.key === WALLET_AUTH_KEY || event.key === SELECTED_WALLET_KEY) {
      scheduleInject()
    }
  })

  try {
    var observer = new MutationObserver(scheduleInject)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
    window.setTimeout(function () {
      observer.disconnect()
    }, 8000)
  } catch (error) {}

  scheduleInject()
})()
