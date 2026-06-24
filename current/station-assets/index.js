const { glob } = require("glob")
const path = require("path")
const { Buffer } = require("buffer")
const { Hash } = require("@keplr-wallet/crypto")
const { AccAddress } = require("@terra-money/feather.js")
const fs = require("fs").promises

const normalizeAssetUrl = (value) =>
  typeof value === "string" && value.startsWith("/img/")
    ? `/station-assets${value}`
    : value

const normalizeAssetIcons = (value) => {
  if (Array.isArray(value)) return value.map(normalizeAssetIcons)
  if (!value || typeof value !== "object") return value

  const next = { ...value }
  Object.keys(next).forEach((key) => {
    if (key === "icon") {
      next[key] = normalizeAssetUrl(next[key])
    } else if (next[key] && typeof next[key] === "object") {
      next[key] = normalizeAssetIcons(next[key])
    }
  })
  return next
}

;(async () => {
  await fs.rm("./build", { recursive: true, force: true })
  await fs.mkdir("./build", { recursive: true })
  await fs.mkdir("./build/cw20", { recursive: true })
  await fs.mkdir("./build/station", { recursive: true })

  const chains = {}
  const coinsOut = {}
  const ibcDenomMapOut = {}
  const prefixOwners = {}

  const groupedChainFiles = await glob("./chains/*/*.js")
  const flatChainFiles = await glob("./chains/*.js")
  const chainFiles = [...new Set([...groupedChainFiles, ...flatChainFiles])]

  const tokens = []
  const cw20TokensOut = {}

  chainFiles.forEach((file) => {
    try {
      const fullPath = path.resolve(file)
      delete require.cache[fullPath]
      const chainData = normalizeAssetIcons(require(fullPath))

      if (!chainData || !chainData.chainID) {
        console.log(`Skipping invalid chain file: ${file}`)
        return
      }

      const validationLcd = chainData.upstreamLcd || chainData.lcd
      if (chainData.chainID !== "localterra" && !isValidUrl(validationLcd)) {
        console.log(`${chainData.chainID}: Invalid LCD URL: ${validationLcd}`)
        return
      }

      if (!chainData.prefix) {
        console.log(`${chainData.chainID}: Missing prefix`)
        return
      }

      const existingOwner = prefixOwners[chainData.prefix]
      if (existingOwner) {
        console.log(
          `Allowing ${chainData.chainID}: duplicate bech32 prefix "${chainData.prefix}" also used by ${existingOwner}`
        )
      } else {
        prefixOwners[chainData.prefix] = chainData.chainID
      }

      tokens.push(
        ...(chainData.tokens ?? []).map((t) => ({
          ...t,
          chainID: chainData.chainID,
        }))
      )

      const chainOut = { ...chainData, gasAdjustment: chainData.gasAdjustment ?? 1 }
      delete chainOut.tokens

      chains[chainData.chainID] = chainOut
    } catch (error) {
      console.error(`Failed loading chain file: ${file}`)
      console.error(error)
    }
  })

  tokens.forEach((token) => {
    try {
      const { chainID, ...coinData } = token
      const tokenId = `${chainID}:${coinData.token}`

      coinsOut[tokenId] = {
        ...coinData,
        chainID,
        chains: [chainID],
      }

      const isCW20 = AccAddress.validate(coinData.token)
      if (isCW20) {
        const cw20Token = {
          ...coinData,
          chainID,
          contract: coinData.token,
        }

        cw20TokensOut[tokenId] = cw20Token
        cw20TokensOut[coinData.token] = cw20Token
      }

      if (!chains[chainID]) return

      if (!isCW20 && chains[chainID]?.channels) {
        Object.entries(chains[chainID].channels).forEach(
          ([otherChainID, channel]) => {
            try {
              if (!chains[otherChainID]) return
              if (!channel) return

              const denom =
                chains[chainID].prefix === "kujira"
                  ? coinData.token?.replaceAll("/", ":")
                  : coinData.token

              const ibcDenom = calculateIBCDenom(channel, denom)

              ibcDenomMapOut[ibcDenom] = {
                token: tokenId,
                chainID: otherChainID,
              }
            } catch (error) {
              console.error(
                `Failed processing IBC channel for ${chainID} -> ${otherChainID}`
              )
              console.error(error)
            }
          }
        )
      }

      if (isCW20 && chains[chainID]?.icsChannels) {
        Object.entries(chains[chainID].icsChannels).forEach(
          ([otherChainID, value]) => {
            try {
              if (!chains[otherChainID]) return
              if (!value?.otherChannel || !value?.channel) return

              const denom = `cw20:${coinData.token}`
              const ibcDenom = calculateIBCDenom(value.otherChannel, denom)

              ibcDenomMapOut[ibcDenom] = {
                token: tokenId,
                chainID: otherChainID,
                icsChannel: value.channel,
              }
            } catch (error) {
              console.error(
                `Failed processing ICS channel for ${chainID} -> ${otherChainID}`
              )
              console.error(error)
            }
          }
        )
      }
    } catch (error) {
      console.error(`Failed processing token: ${token?.chainID}:${token?.token}`)
      console.error(error)
    }
  })

  const denomsOut = Object.values(coinsOut).map((coin) => ({
    ...coin,
    denom: coin.token,
  }))

  await fs.writeFile("./build/chains.json", JSON.stringify(chains, null, 2))
  await fs.writeFile("./build/coins.json", JSON.stringify(coinsOut, null, 2))
  await fs.writeFile("./build/denoms.json", JSON.stringify(denomsOut, null, 2))
  await fs.writeFile(
    "./build/ibc_denoms.json",
    JSON.stringify(ibcDenomMapOut, null, 2)
  )
  await fs.writeFile(
    "./build/ibc_tokens.json",
    JSON.stringify({ all: ibcDenomMapOut }, null, 2)
  )

  await fs.writeFile(
    "./build/cw20/tokens.json",
    JSON.stringify(cw20TokensOut, null, 2)
  )

  await fs.writeFile("./build/station/tfm.json", JSON.stringify({}, null, 2))

  let currenciesList = []
  try {
    const fullPath = path.resolve("./currencies.js")
    delete require.cache[fullPath]
    currenciesList = require(fullPath)
  } catch (error) {
    console.error("Failed loading currencies.js")
    console.error(error)
  }

  await fs.writeFile(
    "./build/currencies.json",
    JSON.stringify(currenciesList, null, 2)
  )

  const images = [
    ...(await glob("./img/*/*.{png,svg}")),
    ...(await glob("./img/*.{png,svg}")),
  ]

  await Promise.all(
    images.map(async (file) => {
      try {
        await fs.mkdir(`./build/${path.dirname(file).replace("./", "")}`, {
          recursive: true,
        })
        await fs.copyFile(file, `./build/${file.replace("./", "")}`)
      } catch (error) {
        console.error(`Failed copying image: ${file}`)
        console.error(error)
      }
    })
  )
})().catch((error) => {
  console.error("index.js failed:")
  console.error(error)
  process.exit(1)
})

function calculateIBCDenom(channel, denom) {
  return (
    "ibc/" +
    Buffer.from(Hash.sha256(Buffer.from(`transfer/${channel}/${denom}`)))
      .toString("hex")
      .toUpperCase()
  )
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "136.243.174.47" ||
      parsed.hostname === "do-wallet.com" ||
      parsed.hostname === "www.do-wallet.com"
    ) {
      return true
    }
    return parsed.protocol === "https:"
  } catch (e) {
    return false
  }
}
