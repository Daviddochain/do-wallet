const express = require("express")
const fs = require("fs")
const path = require("path")
const { SecretNetworkClient } = require("secretjs")

const router = express.Router()

const DEFAULT_CHAIN_ID = "secret-4"
const DEFAULT_LCD = "https://rest.lavenderfive.com:443/secretnetwork"
const ROUTE_TIMEOUT = Number(process.env.SECRET_ROUTE_TIMEOUT_MS || 20000)
const REQUEST_CONCURRENCY = Number(process.env.SECRET_CONCURRENCY || 4)
const MAX_TOKENS_PER_REQUEST = Number(process.env.SECRET_MAX_TOKENS || 50)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function findFirstExistingPath(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function getChainsJsonPath() {
  const candidates = [
    process.env.CHAINS_JSON_PATH,
    path.resolve(process.cwd(), "build/chains.json"),
    path.resolve(process.cwd(), "chains.json"),
    path.resolve(process.cwd(), "station-assets/build/chains.json"),
    path.resolve(__dirname, "../../build/chains.json"),
    path.resolve(__dirname, "../../../station-assets/build/chains.json"),
  ]

  return findFirstExistingPath(candidates)
}

function loadChainConfig(chainID = DEFAULT_CHAIN_ID) {
  try {
    const chainsPath = getChainsJsonPath()
    if (!chainsPath) return null

    const parsed = JSON.parse(fs.readFileSync(chainsPath, "utf8"))
    return parsed?.[chainID] || null
  } catch (err) {
    console.warn("Secret routes could not load chains.json:", err.message)
    return null
  }
}

function getSecretClient(chainID = DEFAULT_CHAIN_ID) {
  const chain = loadChainConfig(chainID)
  const url = process.env.SECRET_LCD || chain?.lcd || chain?.api || DEFAULT_LCD

  return new SecretNetworkClient({
    url: String(url).replace(/\/+$/, ""),
    chainId: chainID,
  })
}

function isSecretAddress(value) {
  return typeof value === "string" && /^secret1[0-9a-z]{38,90}$/i.test(value)
}

function normalizeToken(raw) {
  if (!raw || typeof raw !== "object") return null

  const contract = raw.contract || raw.token
  const viewingKey = raw.viewingKey || raw.key

  if (!isSecretAddress(contract) || typeof viewingKey !== "string") {
    return null
  }

  const trimmedKey = viewingKey.trim()
  if (!trimmedKey || trimmedKey.length > 256) return null

  return {
    contract,
    viewingKey: trimmedKey,
    codeHash:
      typeof raw.codeHash === "string" && raw.codeHash.trim()
        ? raw.codeHash.trim()
        : undefined,
    symbol: typeof raw.symbol === "string" ? raw.symbol : undefined,
    name: typeof raw.name === "string" ? raw.name : undefined,
    icon: typeof raw.icon === "string" ? raw.icon : undefined,
    decimals: typeof raw.decimals === "number" ? raw.decimals : undefined,
    verified: !!raw.verified,
  }
}

function extractTokenInfo(result) {
  return result?.token_info || result?.tokenInfo || result || {}
}

async function getCodeHash(client, contract, providedHash) {
  if (providedHash) return providedHash

  const result = await client.query.compute.codeHashByContractAddress({
    contract_address: contract,
  })

  return result?.code_hash || result
}

async function queryTokenInfo(client, contract, codeHash) {
  const result = await client.query.compute.queryContract({
    contract_address: contract,
    code_hash: codeHash,
    query: { token_info: {} },
  })

  return extractTokenInfo(result)
}

async function queryTokenBalance(client, token, address) {
  const codeHash = await getCodeHash(client, token.contract, token.codeHash)
  const [tokenInfo, balanceResult] = await Promise.all([
    queryTokenInfo(client, token.contract, codeHash).catch(() => ({})),
    client.query.compute.queryContract({
      contract_address: token.contract,
      code_hash: codeHash,
      query: {
        balance: {
          address,
          key: token.viewingKey,
        },
      },
    }),
  ])

  const balance =
    balanceResult?.balance?.amount ||
    balanceResult?.balance ||
    balanceResult?.amount ||
    "0"

  return {
    contract: token.contract,
    chainID: DEFAULT_CHAIN_ID,
    balance: String(balance),
    symbol: token.symbol || tokenInfo?.symbol || "",
    name: token.name || tokenInfo?.name || "",
    icon: token.icon || "",
    decimals:
      typeof token.decimals === "number"
        ? token.decimals
        : typeof tokenInfo?.decimals === "number"
          ? tokenInfo.decimals
          : 6,
    codeHash,
    verified: !!token.verified,
    private: true,
  }
}

async function runLimited(items, worker, concurrency, timeoutMs) {
  const results = []
  let index = 0
  let timedOut = false

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (!timedOut) {
      const currentIndex = index++
      if (currentIndex >= items.length) return

      const result = await worker(items[currentIndex])
      if (result) results.push(result)
    }
  })

  await Promise.race([
    Promise.all(runners),
    sleep(timeoutMs).then(() => {
      timedOut = true
    }),
  ])

  return results
}

router.post("/api/secret/snip20/token-info", async (req, res) => {
  try {
    const { contract, chainID = DEFAULT_CHAIN_ID, codeHash } = req.body || {}

    if (chainID !== DEFAULT_CHAIN_ID || !isSecretAddress(contract)) {
      return res.status(400).json({ error: "Invalid Secret token contract" })
    }

    const client = getSecretClient(chainID)
    const resolvedCodeHash = await getCodeHash(client, contract, codeHash)
    const tokenInfo = await queryTokenInfo(client, contract, resolvedCodeHash)

    res.json({
      token: contract,
      contract,
      codeHash: resolvedCodeHash,
      symbol: tokenInfo?.symbol || "",
      name: tokenInfo?.name || "",
      decimals:
        typeof tokenInfo?.decimals === "number" ? tokenInfo.decimals : 6,
      private: true,
    })
  } catch (err) {
    console.error("Secret token-info route failed:", err.message)
    res.status(502).json({ error: "Failed to query Secret token info" })
  }
})

router.post("/api/secret/snip20/balances", async (req, res) => {
  try {
    const {
      address,
      chainID = DEFAULT_CHAIN_ID,
      tokens = [],
    } = req.body || {}

    if (chainID !== DEFAULT_CHAIN_ID || !isSecretAddress(address)) {
      return res.status(400).json({ error: "Invalid Secret address" })
    }

    if (!Array.isArray(tokens)) {
      return res.status(400).json({ error: "tokens must be an array" })
    }

    const normalizedTokens = tokens
      .slice(0, MAX_TOKENS_PER_REQUEST)
      .map(normalizeToken)
      .filter(Boolean)

    if (!normalizedTokens.length) return res.json([])

    const client = getSecretClient(chainID)
    const balances = await runLimited(
      normalizedTokens,
      async (token) => {
        try {
          const result = await queryTokenBalance(client, token, address)
          return result.balance !== "0" ? result : null
        } catch (err) {
          const message = err?.message || "Unknown Secret token error"
          console.warn(`Secret SNIP-20 skipped ${token.contract}: ${message}`)
          return null
        }
      },
      REQUEST_CONCURRENCY,
      ROUTE_TIMEOUT
    )

    res.json(balances)
  } catch (err) {
    console.error("Secret balances route failed:", err.message)
    res.status(502).json({ error: "Failed to query Secret token balances" })
  }
})

module.exports = router
