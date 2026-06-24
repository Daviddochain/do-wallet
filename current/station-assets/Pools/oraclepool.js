const express = require("express")
const axios = require("axios")
const fs = require("fs")
const path = require("path")

const router = express.Router()

const REQUEST_TIMEOUT = 15000

// Set this to the exact PublicNode FCD oracle-pool route from Swagger.
const ORACLE_POOL_FCD_PATH = ""

function findFirstExistingPath(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function getDenomsJsonPath() {
  const candidates = [
    process.env.DENOMS_JSON_PATH,
    path.resolve(process.cwd(), "build/denoms.json"),
    path.resolve(process.cwd(), "public/denoms.json"),
    path.resolve(process.cwd(), "src/denoms.json"),
    path.resolve(process.cwd(), "../station-assets/build/denoms.json"),
    path.resolve(process.cwd(), "../../station-assets/build/denoms.json"),
    path.resolve(process.cwd(), "station-assets/build/denoms.json"),
    path.resolve(__dirname, "../build/denoms.json"),
    path.resolve(__dirname, "../../build/denoms.json"),
    path.resolve(__dirname, "../../../build/denoms.json"),
    path.resolve(__dirname, "../station-assets/build/denoms.json"),
    path.resolve(__dirname, "../../station-assets/build/denoms.json"),
    path.resolve(__dirname, "../../../station-assets/build/denoms.json"),
  ]

  return findFirstExistingPath(candidates)
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

let denomList = []

try {
  const denomPath = getDenomsJsonPath()

  if (denomPath) {
    const raw = fs.readFileSync(denomPath, "utf8")
    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      denomList = parsed
      console.log(`✅ Loaded ${denomList.length} denoms from ${denomPath}`)
    } else {
      console.warn(`⚠️ ${denomPath} did not contain an array`)
    }
  } else {
    console.warn("⚠️ Could not find denoms.json, symbol resolution will be limited")
  }
} catch (error) {
  console.warn("⚠️ Failed to load denoms.json:", error.message)
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

function normalizeRequestedChainID(requestedChainID) {
  const value = String(requestedChainID || "").trim()
  if (!value) return ""

  const lowered = value.toLowerCase()

  if (lowered === "lunc") return "columbus-5"
  if (lowered === "terra-classic") return "columbus-5"
  if (lowered === "terra classic") return "columbus-5"
  if (lowered === "classic") return "columbus-5"
  if (lowered === "columbus5") return "columbus-5"

  if (lowered === "cosmos") return "cosmoshub-4"
  if (lowered === "cosmoshub") return "cosmoshub-4"

  return value
}

function getChainConfig(requestedChainID) {
  const normalizedChainID = normalizeRequestedChainID(requestedChainID)
  if (!normalizedChainID) return null

  const chains = loadChainsConfig()

  let chain = chains[normalizedChainID]
  let resolvedChainID = normalizedChainID

  if (!chain) {
    const lowered = normalizedChainID.toLowerCase()

    for (const [chainID, candidate] of Object.entries(chains)) {
      const candidateName = String(candidate?.name || "").trim().toLowerCase()
      const candidateChainID = String(candidate?.chainID || chainID)
        .trim()
        .toLowerCase()

      if (candidateChainID === lowered || candidateName === lowered) {
        chain = candidate
        resolvedChainID = candidate.chainID || chainID
        break
      }
    }
  }

  if (!chain || typeof chain !== "object") return null

  return {
    chainID: chain.chainID || resolvedChainID,
    name: chain.name || resolvedChainID,
    fcd: chain.fcd || chain.fcdUrl || "",
    chainType: chain.chainType || "cosmos",
    baseAsset: chain.baseAsset || "",
    raw: chain,
  }
}

function resolveDenomSymbol(denom) {
  if (!denom) return ""
  if (denom === "uluna") return "LUNC"
  if (denom === "uusd") return "USTC"
  if (denom === "satoshi") return "BTC"

  const found = denomList.find((item) => item?.denom === denom)
  if (found?.symbol) return found.symbol
  if (found?.display) return found.display
  if (found?.base) return found.base

  return denom
}

function normalizeCoin(coin) {
  const denom = coin?.denom || ""

  return {
    denom,
    symbol: resolveDenomSymbol(denom),
    amount: String(coin?.amount ?? coin?.value ?? "0"),
  }
}

function toNumericAmount(amount) {
  const value = Number(amount)
  return Number.isFinite(value) ? value : 0
}

function isPositiveAmount(amount) {
  return toNumericAmount(amount) > 0
}

function sortCoinsForChain(coins, chainConfig) {
  const baseAsset = chainConfig?.baseAsset || ""

  return [...coins].sort((a, b) => {
    const aIsBase = a?.denom === baseAsset ? 1 : 0
    const bIsBase = b?.denom === baseAsset ? 1 : 0
    if (aIsBase !== bIsBase) return bIsBase - aIsBase

    const aPositive = isPositiveAmount(a?.amount) ? 1 : 0
    const bPositive = isPositiveAmount(b?.amount) ? 1 : 0
    if (aPositive !== bPositive) return bPositive - aPositive

    return toNumericAmount(b?.amount) - toNumericAmount(a?.amount)
  })
}

function buildErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unknown error"
  )
}

function isLikelyNotFound(error) {
  const status = error?.response?.status
  return status === 404 || status === 501
}

function isCosmosStyleChain(chainConfig) {
  return chainConfig?.chainType !== "bitcoin"
}

function getBaseAssetCoin(coins, chainConfig) {
  const baseAsset = chainConfig?.baseAsset || ""
  if (!baseAsset) return null
  return coins.find((coin) => coin?.denom === baseAsset) || null
}

function mapFcdOraclePoolResponse(payload, chainConfig) {
  const possibleCoinArrays = [
    payload?.coins,
    payload?.pool,
    payload?.balances,
    payload?.result,
    payload?.data?.coins,
    payload?.data?.pool,
    payload?.data?.balances,
    payload?.oracle_pool,
    payload?.oraclePool,
    payload?.data?.oracle_pool,
    payload?.data?.oraclePool,
  ]

  const rawCoins = possibleCoinArrays.find(Array.isArray) || []

  const coins = sortCoinsForChain(
    rawCoins.map(normalizeCoin).filter((coin) => isPositiveAmount(coin.amount)),
    chainConfig
  )

  const baseAssetCoin = getBaseAssetCoin(coins, chainConfig)

  return {
    chainID: chainConfig.chainID,
    chainName: chainConfig.name,
    type: "oracle",
    baseAsset: chainConfig.baseAsset || "",
    primaryCoin: baseAssetCoin || coins[0] || null,
    baseAssetCoin,
    coins,
    count: coins.length,
    raw: payload,
  }
}

async function fetchOraclePool(chainConfig) {
  if (!isCosmosStyleChain(chainConfig)) {
    const error = new Error(
      `Oracle pool is not supported for chain type "${chainConfig.chainType}"`
    )
    error.code = "UNSUPPORTED_CHAIN_TYPE"
    throw error
  }

  if (!chainConfig?.fcd) {
    throw new Error(`No FCD configured for ${chainConfig?.chainID || "chain"}`)
  }

  if (!ORACLE_POOL_FCD_PATH) {
    throw new Error("Oracle FCD route has not been set")
  }

  const response = await axios.get(`${chainConfig.fcd}${ORACLE_POOL_FCD_PATH}`, {
    timeout: REQUEST_TIMEOUT,
  })

  return mapFcdOraclePoolResponse(response.data, chainConfig)
}

router.get("/api/pools/oracle", async (req, res) => {
  try {
    if (!req.query.chainID) {
      return res.status(400).json({
        error: "chainID is required",
      })
    }

    const chainConfig = getChainConfig(req.query.chainID)

    if (!chainConfig) {
      return res.status(404).json({
        error: "Chain not found in chains.json",
        chainID: normalizeRequestedChainID(req.query.chainID),
      })
    }

    const data = await fetchOraclePool(chainConfig)
    return res.json(data)
  } catch (error) {
    const message = buildErrorMessage(error)
    console.error("❌ Oracle pool fetch failed:", message)

    if (error.code === "UNSUPPORTED_CHAIN_TYPE") {
      return res.status(400).json({
        error: "Oracle pool not supported for this chain",
        details: message,
      })
    }

    if (isLikelyNotFound(error)) {
      return res.status(404).json({
        error: "Oracle pool FCD endpoint not available",
        details: message,
      })
    }

    return res.status(500).json({
      error: "Failed to fetch oracle pool",
      details: message,
    })
  }
})

module.exports = router