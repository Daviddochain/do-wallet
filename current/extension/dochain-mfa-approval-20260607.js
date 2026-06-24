(function () {
  'use strict'

  const API =
    window.location.protocol === 'chrome-extension:'
      ? 'https://www.do-wallet.com/station-assets/api/mfa'
      : '/station-assets/api/mfa'
  const CHAIN_ID = 'Do-Chain'
  const WALLET_CHAIN_ID = 'Do-Chain'
  const LEGACY_WALLET_CHAIN_ID = CHAIN_ID
  const CHAIN_IDS = new Set([CHAIN_ID, WALLET_CHAIN_ID, LEGACY_WALLET_CHAIN_ID])
  const DENOM = 'udo'
  const setupKey = (account) => `dochain_mfa_setup:${account}`
  const pendingSetupKey = (account) => `dochain_mfa_pending_setup:${account}`
  const enabledKey = (account) => `dochain_mfa_chain_enabled:${account}`

  const readJson = (key) => {
    try {
      return JSON.parse(window.localStorage.getItem(key) || 'null')
    } catch (_) {
      return null
    }
  }

  const writeJson = (key, value) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }

  const fetchJson = async (path, body) => {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body || {}),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `MFA request failed (${response.status})`)
    return data
  }

  const fetchStatus = async (account) => {
    if (!account) return null
    const response = await fetch(`${API}/status/${encodeURIComponent(account)}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return null
    return data
  }

  const clearLocalEnrollment = (account) => {
    window.localStorage.removeItem(enabledKey(account))
    window.localStorage.removeItem(setupKey(account))
  }

  const blurActiveElement = () => {
    const active = document.activeElement
    if (active && typeof active.blur === 'function') active.blur()
  }

  const stableStringify = (value) => {
    if (value === undefined) return undefined
    if (value === null || typeof value !== 'object') return JSON.stringify(value)
    if (Array.isArray(value)) {
      return `[${value.map((item) => stableStringify(item) || 'null').join(',')}]`
    }
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }

  const sha256Hex = async (text) => {
    const bytes = new TextEncoder().encode(text)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  const messageData = (msg) => {
    if (!msg) return msg
    if (typeof msg.toData === 'function') {
      try {
        return msg.toData(false)
      } catch (_) {
        return msg.toData()
      }
    }
    if (typeof msg.toJSON === 'function') return msg.toJSON()
    return msg
  }

  const messagesHash = async (messages) => {
    const canonical = messages.map((msg) => stableStringify(messageData(msg))).join('')
    return sha256Hex(canonical)
  }

  const typeOf = (msg) =>
    String(msg?.['@type'] || msg?.type || msg?.constructor?.name || '').replace(/^\//, '')

  const messageBody = (msg) => {
    if (!msg || typeof msg !== 'object') return msg
    if (msg.value && typeof msg.value === 'object' && !Array.isArray(msg.value)) return msg.value
    if (msg.body && typeof msg.body === 'object' && !Array.isArray(msg.body)) return msg.body
    return msg
  }

  const scalarText = (value) => {
    if (value === undefined || value === null) return ''
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
      return String(value)
    }
    if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
      return String(value.toString())
    }
    return ''
  }

  const positiveAmount = (value) => {
    const text = scalarText(value).trim()
    if (!text) return false
    if (/^0+(\.0+)?$/.test(text)) return false
    return /^(\d+|\d+\.\d+)$/.test(text)
  }

  const coinHasDo = (coin, seen = new Set()) => {
    if (!coin) return false
    if (typeof coin === 'string') return /(^|[^a-z])\d+udo$/i.test(coin.trim())
    if (Array.isArray(coin)) return coin.some((item) => coinHasDo(item, seen))
    if (typeof coin !== 'object') return false
    if (seen.has(coin)) return false
    seen.add(coin)
    if (typeof coin.toData === 'function') return coinHasDo(coin.toData(), seen)
    if (String(coin.denom || '').toLowerCase() === DENOM && positiveAmount(coin.amount)) return true
    return Object.keys(coin).some((key) => key !== 'denom' && coinHasDo(coin[key], seen))
  }

  const isProtectedMessage = (raw) => {
    const msg = messageData(raw)
    const body = messageBody(msg)
    const type = typeOf(msg)
    if (type.includes('MsgSend')) return coinHasDo(body)
    if (type.includes('MsgMultiSend')) return coinHasDo(body)
    if (type.includes('MsgUndelegate')) return coinHasDo(body)
    if (type.includes('MsgBeginRedelegate')) return coinHasDo(body)
    if (type.includes('MsgTransfer')) return coinHasDo(body)
    if (type.includes('MsgExecuteContract')) return coinHasDo(body)
    if (type.includes('MsgSwap')) return coinHasDo(body)
    return false
  }

  const stripInvalidIntegerField = (target, field) => {
    if (!target || typeof target !== 'object' || !(field in target)) return
    const value = target[field]
    if (value === undefined || value === null || value === '') return
    const text = scalarText(value).trim()
    if (/^\d+$/.test(text)) {
      target[field] = text
      return
    }
    delete target[field]
  }

  const normalizeValidatorEditMessage = (raw) => {
    const msg = raw && typeof raw === 'object' ? raw : null
    if (!msg) return
    const data = messageData(msg)
    const type = typeOf(data || msg)
    if (!type.includes('MsgEditValidator')) return
    for (const target of [msg, msg.value, msg.body, data, data?.value, data?.body]) {
      stripInvalidIntegerField(target, 'min_self_delegation')
      stripInvalidIntegerField(target, 'minSelfDelegation')
    }
  }

  const normalizeTxMessages = (tx) => {
    for (const msg of tx?.msgs || []) normalizeValidatorEditMessage(msg)
  }

  const accountFromMessage = (raw) => {
    const msg = messageData(raw)
    const body = messageBody(msg)
    return (
      body?.from_address ||
      body?.fromAddress ||
      body?.delegator_address ||
      body?.delegatorAddress ||
      body?.sender ||
      body?.trader ||
      body?.inputs?.[0]?.address ||
      ''
    )
  }

  const accountFromTx = (tx) => {
    for (const msg of tx?.msgs || []) {
      const account = accountFromMessage(msg)
      if (typeof account === 'string' && account.startsWith('do1')) return account
    }
    return ''
  }

  const mergeMemo = (memo, mfa) => {
    let envelope = {}
    const trimmed = typeof memo === 'string' ? memo.trim() : ''
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) envelope = parsed
        else envelope.note = trimmed
      } catch (_) {
        envelope.note = trimmed
      }
    }
    envelope.dochain_mfa = mfa
    return JSON.stringify(envelope)
  }

  const getCode = (tx) => {
    const supplied = String(tx.__dochainMfaCode || '').replace(/\s/g, '').trim()
    delete tx.__dochainMfaCode
    if (/^\d{6}$/.test(supplied)) return supplied
    const prompted = window.prompt('Enter your DoChain authenticator code to approve this transaction')
    return String(prompted || '').replace(/\s/g, '').trim()
  }

  const getRecoveryCode = (tx) => {
    const supplied = String(tx.__dochainMfaRecoveryCode || '').trim()
    delete tx.__dochainMfaRecoveryCode
    return supplied
  }

  const applyControlFields = (mfa, control, account) => {
    if (control?.enablePubKey) {
      mfa.enable = { account, approval_pub_key: control.enablePubKey }
      if (control.guardianAddress) mfa.enable.guardian_address = control.guardianAddress
    } else if (!control?.disable && !window.localStorage.getItem(enabledKey(account))) {
      const setup = readJson(setupKey(account))
      if (setup?.approval_pub_key) {
        mfa.enable = { account, approval_pub_key: setup.approval_pub_key }
        if (setup.guardian_address) mfa.enable.guardian_address = setup.guardian_address
      }
    }
    if (control?.disable) mfa.disable = { account }
    if (control?.setGuardian) {
      mfa.set_guardian = { account, guardian_address: control.guardianAddress || '' }
    }
    if (control?.guardianApproval) mfa.guardian_approval = control.guardianApproval
  }

  const recoveryControlMemo = (control, account) => {
    if (control?.recoveryStart) {
      const recovery = { account, action: control.action || 'disable' }
      if (control.approvalPubKey) recovery.approval_pub_key = control.approvalPubKey
      return { recovery_start: recovery }
    }
    if (control?.recoveryCancel) return { recovery_cancel: { account } }
    if (control?.recoveryExecute) return { recovery_execute: { account } }
    return null
  }

  const controlActionName = (control) => {
    if (control?.disable) return 'disable'
    if (control?.enablePubKey) return 'rotate'
    if (control?.recoveryStart) return 'recovery_start'
    if (control?.recoveryCancel) return 'recovery_cancel'
    if (control?.recoveryExecute) return 'recovery_execute'
    return ''
  }

  const attachMfaMemo = async (txOptions) => {
    const tx = { ...txOptions }
    const control = tx.__dochainMfaControl
    delete tx.__dochainMfaControl
    normalizeTxMessages(tx)

    if (!CHAIN_IDS.has(tx.chainID) && !control) return tx
    const protectedTx = !!control || (tx.msgs || []).some(isProtectedMessage)
    if (!protectedTx) {
      delete tx.__dochainMfaCode
      return tx
    }

    const account = control?.account || accountFromTx(tx)
    if (!account) {
      delete tx.__dochainMfaCode
      return tx
    }

    const recoveryMemo = recoveryControlMemo(control, account)
    if (recoveryMemo) {
      tx.memo = mergeMemo(tx.memo, recoveryMemo)
      return tx
    }

    if (control?.guardianApproval) {
      const mfa = {}
      applyControlFields(mfa, control, account)
      tx.memo = mergeMemo(tx.memo, mfa)
      return tx
    }

    if (!control?.enablePubKey) {
      const status = await fetchStatus(account)
      if (status?.enrolled) {
        if (status.chain_policy_checked && !status.chain_policy_active) {
          clearLocalEnrollment(account)
          throw new Error(
            'MFA is enrolled in the wallet service but is not active on-chain. Open Activate MFA and complete the on-chain activation signing request.',
          )
        }
        if (!status.chain_policy_checked) {
          throw new Error('Unable to confirm on-chain MFA status. Try again in a moment.')
        }
        window.localStorage.setItem(enabledKey(account), 'true')
      } else if (status && !status.enrolled) {
        clearLocalEnrollment(account)
        delete tx.__dochainMfaCode
        if (control) throw new Error('MFA is not enrolled for this account. Activate MFA first.')
        return tx
      } else if (!control && !window.localStorage.getItem(enabledKey(account))) {
        delete tx.__dochainMfaCode
        return tx
      }
    }

    const recoveryCode = getRecoveryCode(tx)
    const code = recoveryCode ? '' : getCode(tx)
    if (!recoveryCode && !/^\d{6}$/.test(code)) throw new Error('MFA approval cancelled')

    const hash = await messagesHash(tx.msgs || [])
    const approvalResponse = await fetchJson('/approval', {
      account,
      code,
      recovery_code: recoveryCode || undefined,
      purpose: recoveryCode ? 'mfa_control' : undefined,
      control_action: recoveryCode ? controlActionName(control) : undefined,
      chain_id: CHAIN_ID,
      timeout_height: Number(tx.timeoutHeight || tx.timeout_height || 0),
      messages_hash: hash,
      messages: (tx.msgs || []).map(messageData),
    })

    const mfa = { approvals: [approvalResponse.approval] }
    applyControlFields(mfa, control, account)

    tx.memo = mergeMemo(tx.memo, mfa)
    return tx
  }

  const makeControlTx = ({
    account,
    code,
    recoveryCode,
    password,
    post,
    MsgSend,
    Fee,
    Coin,
    Coins,
    control,
    onStatus,
  }) => {
    if (!post || !MsgSend || !Fee || !Coin || !Coins) {
      throw new Error('Do-Wallet MFA transaction tools are unavailable')
    }
    const fee = new Fee(200000, new Coins([new Coin(DENOM, '5000')]))
    blurActiveElement()
    if (typeof onStatus === 'function') onStatus('Check your wallet for the signing request.')
    const signed = post(
      {
        chainID: WALLET_CHAIN_ID,
        msgs: [new MsgSend(account, account, `1${DENOM}`)],
        fee,
        memo: '',
        __dochainMfaCode: code,
        __dochainMfaRecoveryCode: recoveryCode,
        __dochainMfaControl: control,
      },
      password || '',
    )
    return Promise.race([
      signed,
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Wallet signing request did not complete. Check for a hidden wallet prompt, then try again.',
              ),
            ),
          45000,
        ),
      ),
    ])
  }

  window.doChainMfaBeforePost = attachMfaMemo

  window.doChainMfaBeginSetup = async (params) => {
    const account = params?.account
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    const setup = await fetchJson('/setup/start', {
      account,
      guardian_address: params.guardianAddress || params.guardian_address || '',
    })
    writeJson(pendingSetupKey(account), setup)
    return setup
  }

  window.doChainMfaEnableOnChain = async (params) => {
    const account = params?.account
    const code = String(params?.code || '').replace(/\s/g, '').trim()
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    if (!/^\d{6}$/.test(code)) throw new Error('Authentication code is required')

    let pending = readJson(pendingSetupKey(account))
    if (!pending || pending.secret !== params.secret) {
      pending = await window.doChainMfaBeginSetup(params)
      throw new Error('A new MFA setup secret was created. Scan the new QR code and enter the next code.')
    }
    const setup = await fetchJson('/setup', {
      account,
      setup_id: pending.setup_id,
      setup_secret: pending.secret,
      code,
      guardian_address: params.guardianAddress || params.guardian_address || '',
    })
    writeJson(setupKey(account), setup)
    window.localStorage.removeItem(pendingSetupKey(account))
    if (typeof params.onStatus === 'function') params.onStatus('MFA code accepted. Opening wallet signing request.')

    const result = await makeControlTx({
      ...params,
      account,
      code,
      control: {
        account,
        enablePubKey: setup.approval_pub_key,
        guardianAddress: setup.guardian_address || '',
      },
    })
    window.localStorage.setItem(enabledKey(account), 'true')
    return { setup, result }
  }

  window.doChainMfaDisableOnChain = async (params) => {
    const account = params?.account
    const code = String(params?.code || '').replace(/\s/g, '').trim()
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    if (!/^\d{6}$/.test(code)) throw new Error('Authentication code is required')

    const result = await makeControlTx({
      ...params,
      account,
      code,
      control: { account, disable: true },
    })
    window.localStorage.removeItem(enabledKey(account))
    window.localStorage.removeItem(setupKey(account))

    try {
      await fetchJson('/remove', { account, code })
    } catch (err) {
      console.warn('DoChain MFA service cleanup failed', err)
    }

    return result
  }

  window.doChainMfaDisableWithRecoveryCode = async (params) => {
    const account = params?.account
    const recoveryCode = String(params?.recoveryCode || params?.recovery_code || '').trim()
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    if (!recoveryCode) throw new Error('Recovery code is required')

    const result = await makeControlTx({
      ...params,
      account,
      recoveryCode,
      control: { account, disable: true },
    })
    window.localStorage.removeItem(enabledKey(account))
    window.localStorage.removeItem(setupKey(account))

    try {
      await fetchJson('/remove', { account, recovery_code: recoveryCode })
    } catch (err) {
      console.warn('DoChain MFA service cleanup failed', err)
    }

    return result
  }

  window.doChainMfaDisableWithGuardianApproval = async (params) => {
    const account = params?.account
    const guardianApproval =
      typeof params?.guardianApproval === 'string'
        ? JSON.parse(params.guardianApproval)
        : params?.guardianApproval || params?.guardian_approval
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    if (!guardianApproval || typeof guardianApproval !== 'object') {
      throw new Error('Guardian approval is required')
    }

    const result = await makeControlTx({
      ...params,
      account,
      control: { account, disable: true, guardianApproval },
    })
    window.localStorage.removeItem(enabledKey(account))
    window.localStorage.removeItem(setupKey(account))
    return result
  }

  window.doChainMfaSetGuardianOnChain = async (params) => {
    const account = params?.account
    const code = String(params?.code || '').replace(/\s/g, '').trim()
    const guardianAddress = String(params?.guardianAddress || params?.guardian_address || '').trim()
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    if (guardianAddress && !guardianAddress.startsWith('do1')) throw new Error('Guardian address is invalid')
    if (!/^\d{6}$/.test(code)) throw new Error('Authentication code is required')

    return makeControlTx({
      ...params,
      account,
      code,
      control: { account, setGuardian: true, guardianAddress },
    })
  }

  window.doChainMfaStartDelayedRecovery = async (params) => {
    const account = params?.account
    const action = String(params?.action || 'disable')
    const approvalPubKey = String(params?.approvalPubKey || params?.approval_pub_key || '')
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    if (action !== 'disable' && action !== 'rotate') throw new Error('Recovery action is invalid')
    if (action === 'rotate' && !approvalPubKey) throw new Error('New approval key is required')

    return makeControlTx({
      ...params,
      account,
      control: { account, recoveryStart: true, action, approvalPubKey },
    })
  }

  window.doChainMfaCancelDelayedRecovery = async (params) => {
    const account = params?.account
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    return makeControlTx({
      ...params,
      account,
      control: { account, recoveryCancel: true },
    })
  }

  window.doChainMfaExecuteDelayedRecovery = async (params) => {
    const account = params?.account
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    const result = await makeControlTx({
      ...params,
      account,
      control: { account, recoveryExecute: true },
    })
    window.localStorage.removeItem(enabledKey(account))
    window.localStorage.removeItem(setupKey(account))
    return result
  }

  window.doChainMfaRegenerateRecoveryCodes = async (params) => {
    const account = params?.account
    const code = String(params?.code || '').replace(/\s/g, '').trim()
    if (!account || !account.startsWith('do1')) throw new Error('DoChain MFA account is unavailable')
    if (!/^\d{6}$/.test(code)) throw new Error('Authentication code is required')
    return fetchJson('/recovery-codes', { account, code })
  }

  function ensureMfaOnboardingLoaded() {
    if (window.doChainMfaOnboardingLoaded) return
    if (document.querySelector('script[src*="dochain-mfa-onboarding-20260607.js"]')) return
    const script = document.createElement('script')
    script.defer = true
    script.src = '/static/js/dochain-mfa-onboarding-20260607.js?v=20260607mfachain5'
    document.head.appendChild(script)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureMfaOnboardingLoaded, { once: true })
  } else {
    ensureMfaOnboardingLoaded()
  }
})()
