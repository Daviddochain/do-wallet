const express = require("express")
const axios = require("axios")

const router = express.Router()

const CHAIN_LCDS = {
  "columbus-5": "https://terra-classic-lcd.publicnode.com",
  "phoenix-1": "https://phoenix-lcd.terra.dev",
  "cosmoshub-4": "https://rest.cosmos.directory/cosmoshub",
  "osmosis-1": "https://rest.cosmos.directory/osmosis",
  "juno-1": "https://rest.cosmos.directory/juno",
  "akashnet-2": "https://rest.cosmos.directory/akash",
  "axelar-dojo-1": "https://axelar-rest.publicnode.com",
  "crescent-1": "https://rest.cosmos.directory/crescent",
  "kaiyo-1": "https://rest.cosmos.directory/kujira",
  "mars-1": "https://rest.cosmos.directory/mars",
  "migaloo-1": "https://rest.cosmos.directory/migaloo",
  "pacific-1": "https://sei-rest.publicnode.com",
  "stride-1": "https://rest.cosmos.directory/stride",
  "chihuahua-1": "https://api.chihuahua.wtf",
  "comdex-1": "https://rest.comdex.one",
  "cheqd-mainnet-1": "https://api.cheqd.net",
  "stafihub-1": "https://rest.cosmos.directory/stafihub",
  "mainnet-3": "https://rest.cosmos.directory/decentr",
  "archway-1": "https://rest.cosmos.directory/archway",
  "carbon-1": "https://query-api.carbon.network",
}

function getLcdForChain(chainID) {
  return CHAIN_LCDS[chainID] || null
}

function uniqueSortedHeights(latestHeight, minHeight, sampleCount) {
  if (latestHeight <= minHeight) return [latestHeight]

  const span = latestHeight - minHeight
  const heights = new Set()

  for (let i = 0; i < sampleCount; i++) {
    const ratio = sampleCount === 1 ? 0 : i / (sampleCount - 1)
    const height = Math.round(latestHeight - span * ratio)
    if (height >= minHeight && height <= latestHeight) {
      heights.add(height)
    }
  }

  return Array.from(heights).sort((a, b) => b - a)
}

function addIfAddress(set, value) {
  if (!value || typeof value !== "string") return
  if (value.length < 10) return
  if (!value.includes("1")) return
  if (value.includes(" ")) return
  if (value.startsWith("ibc/")) return
  if (value.startsWith("/")) return
  set.add(value)
}

function extractAddresses(obj, set) {
  if (!obj) return

  if (typeof obj === "string") {
    addIfAddress(set, obj)
    return
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => extractAddresses(item, set))
    return
  }

  if (typeof obj === "object") {
    for (const value of Object.values(obj)) {
      extractAddresses(value, set)
    }
  }
}

router.get("/api/wallets/active", async (req, res) => {
  try {
    const chainID = req.query.chainID
    const hours = Math.max(1, Math.min(Number(req.query.hours || 24), 24 * 30))

    if (!chainID) {
      return res.status(400).json({ error: "Missing chainID" })
    }

    const lcd = getLcdForChain(chainID)
    if (!lcd) {
      return res.status(404).json({ error: "Unsupported chainID", chainID })
    }

    const base = lcd.replace(/\/$/, "")

    const latestBlockRes = await axios.get(
      `${base}/cosmos/base/tendermint/v1beta1/blocks/latest`,
      { timeout: 10000 }
    )

    const latestHeight = Number(latestBlockRes.data?.block?.header?.height || 0)

    if (!latestHeight) {
      return res.status(500).json({
        error: "Could not determine latest block height",
        chainID,
      })
    }

    // Approx 24h window on Terra Classic
    const windowBlocks = 14400
    const minHeight = Math.max(1, latestHeight - windowBlocks + 1)

    // Sample only part of the window
    const sampleCount =
      hours <= 24 ? 300 : hours <= 24 * 7 ? 450 : 600

    const sampledHeights = uniqueSortedHeights(
      latestHeight,
      minHeight,
      sampleCount
    )

    const batchSize = 20
    let sampledBlocks = 0
    let sampledTxs = 0
    let decodedTxs = 0

    const uniqueWallets = new Set()

    for (let i = 0; i < sampledHeights.length; i += batchSize) {
      const batch = sampledHeights.slice(i, i + batchSize)

      const blockResults = await Promise.allSettled(
        batch.map((height) =>
          axios.get(`${base}/cosmos/base/tendermint/v1beta1/blocks/${height}`, {
            timeout: 5000,
          })
        )
      )

      const txsToDecode = []

      for (const result of blockResults) {
        if (result.status !== "fulfilled") continue

        sampledBlocks += 1

        const txs = result.value?.data?.block?.data?.txs || []
        if (Array.isArray(txs) && txs.length) {
          sampledTxs += txs.length
          txsToDecode.push(...txs.slice(0, 25))
        }
      }

      // Decode a capped number of txs from this batch for speed
      const decodeResults = await Promise.allSettled(
        txsToDecode.map((txBase64) =>
          axios.post(
            `${base}/cosmos/tx/v1beta1/decode`,
            { tx_bytes: txBase64 },
            { timeout: 6000 }
          )
        )
      )

      for (const decodeResult of decodeResults) {
        if (decodeResult.status !== "fulfilled") continue

        const tx = decodeResult.value?.data?.tx
        if (!tx) continue

        decodedTxs += 1

        extractAddresses(tx, uniqueWallets)
      }
    }

    if (sampledBlocks === 0) {
      return res.status(500).json({
        error: "No blocks could be sampled from the selected chain",
        chainID,
      })
    }

    const walletDensity =
      decodedTxs > 0 ? uniqueWallets.size / decodedTxs : 0

    const estimatedActiveWallets = Math.round(sampledTxs * walletDensity)

    return res.json({
      chainID,
      hours,
      active_wallets: estimatedActiveWallets,
      sampled_blocks: sampledBlocks,
      sampled_txs: sampledTxs,
      decoded_txs: decodedTxs,
      unique_wallets_in_sample: uniqueWallets.size,
      wallet_density_per_tx: Number(walletDensity.toFixed(4)),
      note: "Estimated active wallets based on unique deduplicated addresses from decoded sampled transactions.",
    })
  } catch (error) {
    return res.status(error?.response?.status || 500).json({
      error: "Failed to calculate active wallets",
      details: error?.response?.data || error.message,
    })
  }
})

module.exports = router