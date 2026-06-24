const DEFAULT_REOWN_PROJECT_ID = "a17e4448b2df98da253b69f609a4fcf6"
const STORAGE_KEYS = {
  wallet: "wallet",
  quarantine: "quarantineByWallet",
  reownProjectId: "reownProjectId",
  wcStatus: "walletConnectStatus",
  wcProposal: "walletConnectProposal",
  wcRequest: "walletConnectRequest",
  wcSessions: "walletConnectSessions",
}

const $ = (id) => document.getElementById(id)
const short = (value = "") => value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value
const getState = async () => chrome.storage.local.get(Object.values(STORAGE_KEYS))
const walletKey = (wallet) => wallet?.address || "unknown-wallet"
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]))

const renderWallet = (wallet) => {
  const card = $("wallet-card")
  if (!wallet) {
    card.innerHTML = `<img src="icons/do-logo.jpg" alt=""><h1>No wallet connected</h1><p class="muted">Connect the wallet already open on do-wallet.com.</p>`
    return
  }
  card.innerHTML = `<img src="icons/do-logo.jpg" alt=""><h1>${escapeHtml(wallet.name || "Do-Wallet")}</h1><p class="addr">${escapeHtml(wallet.address)}</p><p class="muted">${Object.keys(wallet.addresses || {}).length || 1} address set</p>`
}

const renderQuarantine = (wallet, quarantineByWallet = {}) => {
  const bucket = quarantineByWallet[walletKey(wallet)] || { declined: [] }
  const declined = Array.isArray(bucket.declined) ? bucket.declined : []
  $("quarantine-count").textContent = `${declined.length} blocked`
  $("quarantine-list").innerHTML = declined.length
    ? declined.map((item) => `<div class="row"><code>${escapeHtml(item)}</code><button data-unblock="${escapeHtml(item)}">Unblock</button></div>`).join("")
    : `<p class="muted">No blocked contracts for this wallet.</p>`
}

const wcStatusClass = (state = "") => {
  if (["ready", "proposal", "request", "pairing"].includes(state)) return "status-good"
  if (["starting"].includes(state)) return "status-warn"
  if (["error", "blocked"].includes(state)) return "status-bad"
  return ""
}

const renderWalletConnect = (state) => {
  const status = state[STORAGE_KEYS.wcStatus] || { state: "not started", message: "ReOwn runtime is idle." }
  $("wc-state").textContent = status.state || "idle"
  $("wc-state").className = wcStatusClass(status.state)
  $("wc-message").textContent = status.message || "Paste a wc: URI from a dApp to pair."
  $("reown-project-id").value = state[STORAGE_KEYS.reownProjectId] || DEFAULT_REOWN_PROJECT_ID

  const proposal = state[STORAGE_KEYS.wcProposal]
  $("wc-proposal").innerHTML = proposal ? `
    <div class="panel-row">
      <div class="details">
        <strong>Session proposal</strong>
        <span class="meta">${escapeHtml(proposal.proposer?.name || "Unknown dApp")}</span>
        <span class="meta">${escapeHtml(proposal.proposer?.url || "")}</span>
        <span class="meta">Required: <code>${escapeHtml(Object.keys(proposal.requiredNamespaces || {}).join(", ") || "none")}</code></span>
        <span class="meta">Optional: <code>${escapeHtml(Object.keys(proposal.optionalNamespaces || {}).join(", ") || "none")}</code></span>
      </div>
      <div class="button-row">
        <button class="purple" data-wc-approve-proposal="${escapeHtml(String(proposal.id))}">Approve</button>
        <button class="danger" data-wc-reject-proposal="${escapeHtml(String(proposal.id))}">Reject</button>
      </div>
    </div>` : ""

  const request = state[STORAGE_KEYS.wcRequest]
  $("wc-request").innerHTML = request ? `
    <div class="panel-row">
      <div class="details">
        <strong>Signing request</strong>
        <span class="meta">Method: <code>${escapeHtml(request.method || "unknown")}</code></span>
        <span class="meta">Chain: <code>${escapeHtml(request.chainId || "unknown")}</code></span>
        <span class="meta">This V2 build will not silently sign. Reject unless you are actively testing signing.</span>
      </div>
      <div class="button-row">
        <button class="danger" data-wc-reject-request="${escapeHtml(`${request.topic}|${request.id}`)}">Reject</button>
        <button data-wc-safe-reject-request="${escapeHtml(`${request.topic}|${request.id}`)}">Not enabled yet</button>
      </div>
    </div>` : ""

  const sessions = Array.isArray(state[STORAGE_KEYS.wcSessions]) ? state[STORAGE_KEYS.wcSessions] : []
  $("wc-sessions").innerHTML = sessions.length
    ? sessions.map((session) => `<div class="row"><span>${escapeHtml(session.peer?.name || "Connected dApp")}</span><code>${escapeHtml(short(session.topic || ""))}</code></div>`).join("")
    : `<p class="muted">No active ReOwn sessions yet.</p>`
}

const render = async () => {
  const state = await getState()
  const wallet = state[STORAGE_KEYS.wallet]
  renderWallet(wallet)
  renderQuarantine(wallet, state[STORAGE_KEYS.quarantine])
  renderWalletConnect(state)
}

const addBlocked = async () => {
  const value = $("quarantine-input").value.trim().toLowerCase()
  if (!value) return
  const state = await getState()
  const wallet = state[STORAGE_KEYS.wallet]
  const key = walletKey(wallet)
  const quarantineByWallet = state[STORAGE_KEYS.quarantine] || {}
  const bucket = quarantineByWallet[key] || { declined: [], approved: [], pending: {} }
  bucket.declined = Array.from(new Set([...(bucket.declined || []), value]))
  quarantineByWallet[key] = bucket
  await chrome.storage.local.set({ [STORAGE_KEYS.quarantine]: quarantineByWallet })
  $("quarantine-input").value = ""
  await render()
}

const unblock = async (value) => {
  const state = await getState()
  const wallet = state[STORAGE_KEYS.wallet]
  const key = walletKey(wallet)
  const quarantineByWallet = state[STORAGE_KEYS.quarantine] || {}
  const bucket = quarantineByWallet[key] || { declined: [] }
  bucket.declined = (bucket.declined || []).filter((item) => item !== value)
  quarantineByWallet[key] = bucket
  await chrome.storage.local.set({ [STORAGE_KEYS.quarantine]: quarantineByWallet })
  await render()
}

const pairWalletConnect = async () => {
  const projectId = $("reown-project-id").value.trim() || DEFAULT_REOWN_PROJECT_ID
  const uri = $("wc-uri").value.trim()
  await chrome.storage.local.set({ [STORAGE_KEYS.reownProjectId]: projectId })
  const response = await chrome.runtime.sendMessage({ type: "DO_WALLET_V2_WC_PAIR", projectId, uri })
  if (!response?.success) alert(response?.message || "Could not pair ReOwn session.")
  else $("wc-uri").value = ""
  await render()
}

const approveProposal = async (proposalId) => {
  const response = await chrome.runtime.sendMessage({ type: "DO_WALLET_V2_WC_APPROVE_PROPOSAL", proposalId })
  if (!response?.success) alert(response?.message || "Could not approve ReOwn proposal.")
  await render()
}

const rejectProposal = async (proposalId) => {
  const response = await chrome.runtime.sendMessage({ type: "DO_WALLET_V2_WC_REJECT_PROPOSAL", proposalId })
  if (!response?.success) alert(response?.message || "Could not reject ReOwn proposal.")
  await render()
}

const rejectRequest = async (encoded, safe = false) => {
  const [topic, requestId] = encoded.split("|")
  const response = await chrome.runtime.sendMessage({ type: safe ? "DO_WALLET_V2_WC_SAFE_REJECT_REQUEST" : "DO_WALLET_V2_WC_REJECT_REQUEST", topic, requestId })
  if (!response?.success) alert(response?.message || "Could not respond to ReOwn request.")
  await render()
}

$("connect-website").addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "DO_WALLET_V2_SYNC_FROM_WEBSITE" })
  if (!response?.success) alert(response?.message || "Could not connect website wallet.")
  await render()
})

$("open-website").addEventListener("click", () => chrome.tabs.create({ url: "https://www.do-wallet.com", active: true }))
$("disconnect").addEventListener("click", async () => { await chrome.runtime.sendMessage({ type: "DO_WALLET_V2_CLEAR_WALLET" }); await render() })
$("refresh").addEventListener("click", async () => { await chrome.runtime.sendMessage({ type: "DO_WALLET_V2_WC_STATUS" }).catch(() => {}); await render() })
$("quarantine-add").addEventListener("click", addBlocked)
$("wc-pair").addEventListener("click", pairWalletConnect)
$("reown-project-id").addEventListener("change", async () => {
  await chrome.storage.local.set({ [STORAGE_KEYS.reownProjectId]: $("reown-project-id").value.trim() || DEFAULT_REOWN_PROJECT_ID })
})

document.addEventListener("click", (event) => {
  const value = event.target?.dataset?.unblock
  if (value) unblock(value)
  const approve = event.target?.dataset?.wcApproveProposal
  if (approve) approveProposal(approve)
  const reject = event.target?.dataset?.wcRejectProposal
  if (reject) rejectProposal(reject)
  const rejectRequestValue = event.target?.dataset?.wcRejectRequest
  if (rejectRequestValue) rejectRequest(rejectRequestValue)
  const safeRejectRequestValue = event.target?.dataset?.wcSafeRejectRequest
  if (safeRejectRequestValue) rejectRequest(safeRejectRequestValue, true)
})

chrome.storage.onChanged.addListener(render)
render()