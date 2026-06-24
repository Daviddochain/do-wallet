const express = require("express")
const axios = require("axios")
const fs = require("fs")
const path = require("path")

const router = express.Router()

const TOKENS_FILE = path.join(__dirname, "cw20Tokens.json")
const BUILD_TOKENS_FILE = path.resolve(__dirname, "../../build/cw20/tokens.json")
const REQUEST_TIMEOUT = Number(process.env.CW20_REQUEST_TIMEOUT_MS || 8000)
const ROUTE_TIMEOUT = Number(process.env.CW20_ROUTE_TIMEOUT_MS || 18000)
const CONCURRENCY = Number(process.env.CW20_CONCURRENCY || 8)
const MAX_TOKENS = Math.max(0, Number(process.env.CW20_MAX_TOKENS || 12))
const CHAIN_ALLOWLIST = new Set(
  String(process.env.CW20_CHAIN_ALLOWLIST || "columbus-5,phoenix-1,Do-Chain")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
)
const CONTRACT_ALLOWLIST = new Set(
  String(
    process.env.CW20_CONTRACT_ALLOWLIST ||
      "terra12ckccpalj2y9h54syyst4lpqp79duc9cpxfsyvne409rjw93s8qs2eneh3,terra15p8su45k45axng8ue59rl6zph4at27s49u3agr6uqrx3dhcxpg3qt0ekdt"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
)
const BROKEN_CONTRACT_TTL = Number(
  process.env.CW20_BROKEN_CONTRACT_TTL_MS || 10 * 60 * 1000
)
const DEFAULT_CHAIN_ID = "columbus-5"

const brokenContracts = new Map()

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
    path.resolve(process.cwd(), "public/chains.json"),
    path.resolve(process.cwd(), "src/chains.json"),
    path.resolve(process.cwd(), "chains.json"),
    path.resolve(process.cwd(), "build/chains.json"),
    path.resolve(process.cwd(), "../station-assets/build/chains.json"),
    path.resolve(process.cwd(), "../../station-assets/build/chains.json"),
    path.resolve(process.cwd(), "station-assets/build/chains.json"),
    path.resolve(__dirname, "../public/chains.json"),
    path.resolve(__dirname, "../../public/chains.json"),
    path.resolve(__dirname, "../../../public/chains.json"),
    path.resolve(__dirname, "../build/chains.json"),
    path.resolve(__dirname, "../../build/chains.json"),
    path.resolve(__dirname, "../../../build/chains.json"),
    path.resolve(__dirname, "../station-assets/build/chains.json"),
    path.resolve(__dirname, "../../station-assets/build/chains.json"),
    path.resolve(__dirname, "../../../station-assets/build/chains.json"),
  ]

  const found = findFirstExistingPath(candidates)

  if (found) return found

  throw new Error(
    "Could not find chains.json. Set CHAINS_JSON_PATH or place chains.json in a standard project location."
  )
}

function loadChainsConfig() {
  const chainsPath = getChainsJsonPath()
  const raw = fs.readFileSync(chainsPath, "utf8")
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("chains.json did not contain a valid chain map")
  }

  return parsed
}

function getChainConfig(chainID) {
  const chains = loadChainsConfig()
  const chain =
    chains[chainID] ||
    chains?.mainnet?.[chainID] ||
    chains?.classic?.[chainID] ||
    chains?.testnet?.[chainID]

  if (!chain || typeof chain !== "object") return null

  return {
    chainID: chain.chainID || chainID,
    name: chain.name || chainID,
    lcd: chain.lcd || chain.api || "",
    api: chain.api || chain.lcd || "",
    prefix: chain.prefix || "",
    chainType: chain.chainType || "cosmos",
  }
}

function loadCW20Tokens() {
  const tokens = []

  try {
    const raw = fs.readFileSync(TOKENS_FILE, "utf8")
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) tokens.push(...parsed)
  } catch (err) {
    console.error("Failed to load cw20Tokens.json", err.message)
  }

  try {
    const raw = fs.readFileSync(BUILD_TOKENS_FILE, "utf8")
    const parsed = JSON.parse(raw)
    const buildTokens = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed || {})

    tokens.push(...buildTokens)
  } catch (err) {
    console.error("Failed to load build/cw20/tokens.json", err.message)
  }

  return Array.from(
    tokens
      .filter((token) => token?.contract || token?.token)
      .reduce((acc, token) => {
        const contract = token.contract || token.token
        const chainID = token.chainID || DEFAULT_CHAIN_ID
        acc.set(`${chainID}:${contract}`, {
          ...token,
          contract,
          chainID,
        })
        return acc
      }, new Map())
      .values()
  )
}

function toBase64Query(queryObj) {
  return Buffer.from(JSON.stringify(queryObj)).toString("base64")
}

async function queryCW20Balance(lcd, contract, address) {
  const baseURL = String(lcd || "").replace(/\/+$/, "")
  const queryData = toBase64Query({
    balance: { address },
  })

  const { data } = await axios.get(
    `${baseURL}/cosmwasm/wasm/v1/contract/${contract}/smart/${queryData}`,
    {
      timeout: REQUEST_TIMEOUT,
    }
  )

  return data?.data?.balance || "0"
}

function getTokenLCDCandidates(token) {
  const chainID = token.chainID || DEFAULT_CHAIN_ID
  const chainConfig = getChainConfig(chainID)
  const candidates = [chainConfig?.lcd, chainConfig?.api].filter(Boolean)

  return Array.from(new Set(candidates))
}

function getBrokenKey(token) {
  return `${token.chainID || DEFAULT_CHAIN_ID}:${token.contract}`
}

function isTemporarilyBroken(token) {
  const key = getBrokenKey(token)
  const brokenAt = brokenContracts.get(key)

  if (!brokenAt) return false

  if (Date.now() - brokenAt > BROKEN_CONTRACT_TTL) {
    brokenContracts.delete(key)
    return false
  }

  return true
}

function markTemporarilyBroken(token) {
  brokenContracts.set(getBrokenKey(token), Date.now())
}

function prioritizeTokens(tokens) {
  return [...tokens].sort((a, b) => {
    const aSymbol = String(a.symbol || "").toUpperCase()
    const bSymbol = String(b.symbol || "").toUpperCase()

    if (aSymbol === "DO" && bSymbol !== "DO") return -1
    if (bSymbol === "DO" && aSymbol !== "DO") return 1
    if (!!a.verified !== !!b.verified) return a.verified ? -1 : 1
    if (!!a.icon !== !!b.icon) return a.icon ? -1 : 1

    return String(aSymbol || a.contract).localeCompare(
      String(bSymbol || b.contract)
    )
  })
}

function isAllowedCW20Token(token) {
  const chainID = token.chainID || DEFAULT_CHAIN_ID
  const contract = token.contract || token.token || ""

  if (!CHAIN_ALLOWLIST.has(chainID)) return false
  if (CONTRACT_ALLOWLIST.has(contract)) return true
  if (token.alwaysShow || token.verified) return true

  return false
}

function addressMatchesChain(address, chainID) {
  const chainConfig = getChainConfig(chainID)
  const prefix = chainConfig?.prefix

  if (!prefix) return true
  return address.startsWith(`${prefix}1`)
}

async function queryTokenBalance(token, address) {
  const lcds = getTokenLCDCandidates(token)
  let lastError

  for (const lcd of lcds) {
    try {
      return await queryCW20Balance(lcd, token.contract, address)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
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

router.get("/api/cw20/:address", async (req, res) => {
  try {
    const { address } = req.params
    const requestedChainID =
      typeof req.query.chainID === "string" ? req.query.chainID : ""

    if (requestedChainID && !CHAIN_ALLOWLIST.has(requestedChainID)) {
      return res.json([])
    }

    const tokens = prioritizeTokens(loadCW20Tokens()).filter((token) => {
      if (!isAllowedCW20Token(token)) return false
      if (!requestedChainID) return true
      return (token.chainID || DEFAULT_CHAIN_ID) === requestedChainID
    }).slice(0, MAX_TOKENS)

    if (requestedChainID && !addressMatchesChain(address, requestedChainID)) {
      return res.json([])
    }

    const results = await runLimited(tokens, async (token) => {
      const contract = token.contract
      if (!contract) return null
      if (isTemporarilyBroken(token)) return null

      const lcds = getTokenLCDCandidates(token)
      if (!lcds.length) return null

      try {
        const balance = await queryTokenBalance(token, address)

        if (balance !== "0") {
          return {
            contract,
            symbol: token.symbol || "",
            name: token.name || "",
            decimals: typeof token.decimals === "number" ? token.decimals : 6,
            icon: token.icon || "",
            chainID: token.chainID || DEFAULT_CHAIN_ID,
            verified: !!token.verified,
            balance,
          }
        }
      } catch (err) {
        const status = err?.response?.status
        const msg = err?.message || "Unknown error"

        if (status === 404 || status === 501) {
          markTemporarilyBroken(token)
        }

        console.warn(`CW20 skipped ${contract}: ${msg}`)
      }

      return null
    }, CONCURRENCY, ROUTE_TIMEOUT)

    res.json(results)
  } catch (error) {
    console.error("CW20 route failed:", error.message)
    res.status(500).json({
      error: "Failed to fetch CW20 balances",
      details: error.message,
    })
  }
})

module.exports = router
