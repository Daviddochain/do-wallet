const express = require("express")
const axios = require("axios")
const fs = require("fs")
const path = require("path")

const router = express.Router()

const DEFAULT_CHAIN_ID = "columbus-5"
const SAMPLE_BLOCKS = 120
const REQUEST_TIMEOUT = 15000

function average(numbers) {
  if (!numbers.length) return 0
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

function toSeconds(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 1000
}

function getStatus(currentBlockTime, averageWindow, target) {
  const compare = Math.max(currentBlockTime, averageWindow)

  if (compare <= target * 1.15) return "Healthy"
  if (compare <= target * 1.75) return "Slightly Slow"
  return "Degraded"
}

function getDefaultTargetBlockTime(chainConfig) {
  if (chainConfig?.chainType === "bitcoin") return 600
  return 6
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
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

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
  const chain = chains[chainID]

  if (!chain || typeof chain !== "object") return null

  return {
    chainID: chain.chainID || chainID,
    name: chain.name || chainID,
    lcd: chain.lcd || chain.api || "",
    api: chain.api || chain.lcd || "",
    rpc: chain.rpc || "",
    chainType: chain.chainType || "cosmos",
    networkType: chain.networkType || "mainnet",
    baseAsset: chain.baseAsset || "",
    disabledModules: Array.isArray(chain.disabledModules)
      ? chain.disabledModules
      : [],
    targetBlockTime:
      typeof chain.targetBlockTime === "number"
        ? chain.targetBlockTime
        : getDefaultTargetBlockTime(chain),
    raw: chain,
  }
}

function getAllBlockspeedChains() {
  const chains = loadChainsConfig()

  return Object.entries(chains)
    .filter(([, chain]) => chain && typeof chain === "object")
    .map(([chainID, chain]) => {
      const chainType = chain.chainType || "cosmos"
      const lcd = chain.lcd || chain.api || ""
      const supported =
        (chainType === "cosmos" || chainType === "bitcoin") && !!lcd

      return {
        chainID: chain.chainID || chainID,
        name: chain.name || chainID,
        chainType,
        networkType: chain.networkType || "mainnet",
        lcd,
        targetBlockTime:
          typeof chain.targetBlockTime === "number"
            ? chain.targetBlockTime
            : getDefaultTargetBlockTime(chain),
        supported,
      }
    })
}

async function cosmosGetLatestHeight(lcd) {
  const { data } = await axios.get(
    `${lcd}/cosmos/base/tendermint/v1beta1/blocks/latest`,
    { timeout: REQUEST_TIMEOUT }
  )

  const height = Number(data?.block?.header?.height)
  if (!height) {
    throw new Error("Could not get latest block height")
  }

  return height
}

async function cosmosGetBlockByHeight(lcd, height) {
  const { data } = await axios.get(
    `${lcd}/cosmos/base/tendermint/v1beta1/blocks/${height}`,
    { timeout: REQUEST_TIMEOUT }
  )

  const header = data?.block?.header
  if (!header?.time) {
    throw new Error(`Missing block time for height ${height}`)
  }

  return {
    height: Number(header.height),
    time: header.time,
  }
}

async function buildCosmosBlockSpeed(chainConfig) {
  const latestHeight = await cosmosGetLatestHeight(chainConfig.lcd)

  const heights = []
  for (let i = 0; i < SAMPLE_BLOCKS; i++) {
    const h = latestHeight - i
    if (h > 0) heights.push(h)
  }

  const blocks = await Promise.all(
    heights.map(async (height) => {
      try {
        return await cosmosGetBlockByHeight(chainConfig.lcd, height)
      } catch (error) {
        return null
      }
    })
  )

  const validBlocks = blocks.filter(Boolean).sort((a, b) => a.height - b.height)

  if (validBlocks.length < 3) {
    throw new Error("Not enough blocks returned to calculate block speed")
  }

  const intervals = []
  for (let i = 1; i < validBlocks.length; i++) {
    const diff = toSeconds(validBlocks[i].time, validBlocks[i - 1].time)
    if (diff > 0 && diff < 60) {
      intervals.push(diff)
    }
  }

  const currentBlockTime = intervals.length
    ? Number(intervals[intervals.length - 1].toFixed(2))
    : 0

  const averageWindow = Number(average(intervals).toFixed(2))
  const status = getStatus(
    currentBlockTime,
    averageWindow,
    chainConfig.targetBlockTime
  )

  return {
    chainID: chainConfig.chainID,
    chainName: chainConfig.name,
    chainType: chainConfig.chainType,
    lcd: chainConfig.lcd,
    latest_height: latestHeight,
    sample_blocks: validBlocks.length,
    current_block_time: currentBlockTime,
    average_sample_block_time: averageWindow,
    target_block_time: chainConfig.targetBlockTime,
    status,
  }
}

async function bitcoinGetLatestHeight(apiBase) {
  const { data } = await axios.get(`${apiBase}/blocks/tip/height`, {
    timeout: REQUEST_TIMEOUT,
  })

  const height = Number(data)
  if (!height) {
    throw new Error("Could not get latest Bitcoin block height")
  }

  return height
}

async function bitcoinGetBlockByHeight(apiBase, height) {
  const { data: hash } = await axios.get(`${apiBase}/block-height/${height}`, {
    timeout: REQUEST_TIMEOUT,
  })

  if (!hash || typeof hash !== "string") {
    throw new Error(`Missing block hash for height ${height}`)
  }

  const { data: block } = await axios.get(`${apiBase}/block/${hash}`, {
    timeout: REQUEST_TIMEOUT,
  })

  const blockHeight = Number(block?.height)
  const blockTime = Number(block?.timestamp)

  if (!blockHeight || !blockTime) {
    throw new Error(`Missing Bitcoin block data for height ${height}`)
  }

  return {
    height: blockHeight,
    time: new Date(blockTime * 1000).toISOString(),
  }
}

async function buildBitcoinBlockSpeed(chainConfig) {
  const latestHeight = await bitcoinGetLatestHeight(chainConfig.lcd)

  const heights = []
  for (let i = 0; i < SAMPLE_BLOCKS; i++) {
    const h = latestHeight - i
    if (h > 0) heights.push(h)
  }

  const blocks = await Promise.all(
    heights.map(async (height) => {
      try {
        return await bitcoinGetBlockByHeight(chainConfig.lcd, height)
      } catch (error) {
        return null
      }
    })
  )

  const validBlocks = blocks.filter(Boolean).sort((a, b) => a.height - b.height)

  if (validBlocks.length < 3) {
    throw new Error("Not enough Bitcoin blocks returned to calculate block speed")
  }

  const intervals = []
  for (let i = 1; i < validBlocks.length; i++) {
    const diff = toSeconds(validBlocks[i].time, validBlocks[i - 1].time)
    if (diff > 0 && diff < 7200) {
      intervals.push(diff)
    }
  }

  const currentBlockTime = intervals.length
    ? Number(intervals[intervals.length - 1].toFixed(2))
    : 0

  const averageWindow = Number(average(intervals).toFixed(2))
  const status = getStatus(
    currentBlockTime,
    averageWindow,
    chainConfig.targetBlockTime
  )

  return {
    chainID: chainConfig.chainID,
    chainName: chainConfig.name,
    chainType: chainConfig.chainType,
    lcd: chainConfig.lcd,
    latest_height: latestHeight,
    sample_blocks: validBlocks.length,
    current_block_time: currentBlockTime,
    average_sample_block_time: averageWindow,
    target_block_time: chainConfig.targetBlockTime,
    status,
  }
}

async function buildBlockSpeed(chainConfig) {
  if (!chainConfig?.lcd) {
    throw new Error(`No LCD/API configured for ${chainConfig?.chainID || "chain"}`)
  }

  if (chainConfig.chainType === "bitcoin") {
    return buildBitcoinBlockSpeed(chainConfig)
  }

  return buildCosmosBlockSpeed(chainConfig)
}

router.get("/api/blockspeed", async (req, res) => {
  try {
    const requestedChainID = String(
      req.query.chainID || DEFAULT_CHAIN_ID
    ).trim()

    const chainConfig = getChainConfig(requestedChainID)

    if (!chainConfig) {
      return res.status(400).json({
        error: "Unsupported chain",
        supportedChains: getAllBlockspeedChains().map((c) => c.chainID),
      })
    }

    const data = await buildBlockSpeed(chainConfig)
    res.json(data)
  } catch (error) {
    console.error("Block speed error:", error.message)
    res.status(500).json({
      error: "Failed to calculate block speed",
      details: error.message,
    })
  }
})

router.get("/api/blockspeed/chains", async (req, res) => {
  try {
    const chains = getAllBlockspeedChains()
    res.json(chains)
  } catch (error) {
    console.error("Block speed chains error:", error.message)
    res.status(500).json({
      error: "Failed to load supported chains",
      details: error.message,
    })
  }
})

module.exports = router
