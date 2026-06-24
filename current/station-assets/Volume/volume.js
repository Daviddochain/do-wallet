const express = require('express')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const router = express.Router()

const CMC_API_KEY = process.env.CMC_API_KEY
const CMC_BASE_URL =
  process.env.CMC_BASE_URL || 'https://pro-api.coinmarketcap.com'

const CHAIN_TO_CMC_FALLBACK = {
  'columbus-5': 'LUNC',
  'phoenix-1': 'LUNA',
  'cosmoshub-4': 'ATOM',
  'osmosis-1': 'OSMO',
  'juno-1': 'JUNO',
  'akashnet-2': 'AKT',
  'axelar-dojo-1': 'AXL',
  'crescent-1': 'CRE',
  'kaiyo-1': 'KUJI',
  'mars-1': 'MARS',
  'migaloo-1': 'WHALE',
  'pacific-1': 'SEI',
  'stride-1': 'STRD',
  'chihuahua-1': 'HUAHUA',
  'comdex-1': 'CMDX',
  'cheqd-mainnet-1': 'CHEQ',
  'stafihub-1': 'FIS',
  'mainnet-3': 'DEC',
  'archway-1': 'ARCH',
  'carbon-1': 'SWTH',
  'pion-1': 'NTRN',
  'bitcoin-mainnet': 'BTC',
  'ethereum-mainnet': 'ETH',
  'solana-mainnet': 'SOL',
  'cardano-mainnet': 'ADA',
  'xrp-ledger-mainnet': 'XRP',
  'bnb-smart-chain-mainnet': 'BNB',
  'tron-mainnet': 'TRX',
  'secret-4': 'SCRT',
}

function getChainsJsonPath() {
  const candidates = [
    process.env.CHAINS_JSON_PATH,
    path.resolve(process.cwd(), 'public/chains.json'),
    path.resolve(process.cwd(), 'src/chains.json'),
    path.resolve(process.cwd(), 'chains.json'),
    path.resolve(process.cwd(), 'build/chains.json'),
    path.resolve(process.cwd(), '../station-assets/build/chains.json'),
    path.resolve(process.cwd(), '../../station-assets/build/chains.json'),
    path.resolve(process.cwd(), 'station-assets/build/chains.json'),
    path.resolve(__dirname, '../public/chains.json'),
    path.resolve(__dirname, '../../public/chains.json'),
    path.resolve(__dirname, '../../../public/chains.json'),
    path.resolve(__dirname, '../build/chains.json'),
    path.resolve(__dirname, '../../build/chains.json'),
    path.resolve(__dirname, '../../../build/chains.json'),
    path.resolve(__dirname, '../station-assets/build/chains.json'),
    path.resolve(__dirname, '../../station-assets/build/chains.json'),
    path.resolve(__dirname, '../../../station-assets/build/chains.json'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    'Could not find chains.json. Set CHAINS_JSON_PATH or place chains.json in a standard project location.'
  )
}

function loadChainsConfig() {
  const chainsPath = getChainsJsonPath()
  const raw = fs.readFileSync(chainsPath, 'utf8')
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('chains.json did not contain a valid chain map')
  }

  return parsed
}

function getChainConfig(chainID) {
  const chains = loadChainsConfig()
  const chain = chains[chainID]

  if (!chain || typeof chain !== 'object') return null

  return {
    chainID: chain.chainID || chainID,
    name: chain.name || chainID,
    symbol: chain.symbol || null,
    cmcSymbol: chain.cmcSymbol || null,
    baseAsset: chain.baseAsset || null,
    networkType: chain.networkType || 'mainnet',
    chainType: chain.chainType || 'cosmos',
    icon: chain.icon || null,
    raw: chain,
  }
}

function getCmcSymbol(chainConfig) {
  if (!chainConfig) return null

  if (
    typeof chainConfig.cmcSymbol === 'string' &&
    chainConfig.cmcSymbol.trim()
  ) {
    return chainConfig.cmcSymbol.trim().toUpperCase()
  }

  if (typeof chainConfig.symbol === 'string' && chainConfig.symbol.trim()) {
    return chainConfig.symbol.trim().toUpperCase()
  }

  return CHAIN_TO_CMC_FALLBACK[chainConfig.chainID] || null
}

async function fetchCmcQuoteBySymbol(symbol) {
  const response = await axios.get(
    `${CMC_BASE_URL}/v1/cryptocurrency/quotes/latest`,
    {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
        Accept: 'application/json',
      },
      params: {
        symbol,
        convert: 'USD',
      },
      timeout: 15000,
    }
  )

  const asset = response.data?.data?.[symbol]
  const usd = asset?.quote?.USD

  return {
    asset,
    usd,
  }
}

router.get('/api/cmc/volume/current', async (req, res) => {
  try {
    const chainID = String(req.query.chainID || '').trim()

    if (!chainID) {
      return res.status(400).json({
        error: 'Missing chainID',
      })
    }

    if (!CMC_API_KEY) {
      return res.status(500).json({
        error: 'CMC_API_KEY is missing from .env',
      })
    }

    const chainConfig = getChainConfig(chainID)

    if (!chainConfig) {
      return res.status(404).json({
        error: 'Chain not found in chains.json',
        chainID,
      })
    }

    const cmcSymbol = getCmcSymbol(chainConfig)

    if (!cmcSymbol) {
      return res.status(404).json({
        error: 'No CoinMarketCap symbol found for chain',
        chainID,
        suggestion:
          'Add cmcSymbol to chains.json for this chain, or extend the fallback map.',
      })
    }

    const { asset, usd } = await fetchCmcQuoteBySymbol(cmcSymbol)

    if (!usd) {
      return res.status(404).json({
        error: 'No USD quote returned from CMC',
        chainID,
        symbol: cmcSymbol,
      })
    }

    return res.json({
      chainID: chainConfig.chainID,
      name: chainConfig.name,
      symbol: cmcSymbol,
      chainType: chainConfig.chainType,
      networkType: chainConfig.networkType,
      baseAsset: chainConfig.baseAsset,
      price: usd.price ?? null,
      volume_24h: usd.volume_24h ?? null,
      market_cap: usd.market_cap ?? null,
      percent_change_24h: usd.percent_change_24h ?? null,
      last_updated: usd.last_updated ?? null,
      cmc_id: asset?.id ?? null,
      cmc_name: asset?.name ?? null,
      cmc_slug: asset?.slug ?? null,
    })
  } catch (error) {
    return res.status(error?.response?.status || 500).json({
      error: 'Failed to fetch current CMC volume',
      details: error?.response?.data || error.message,
    })
  }
})

router.get('/api/cmc/volume/chains', async (req, res) => {
  try {
    const chains = loadChainsConfig()

    const result = Object.entries(chains)
      .filter(([, chain]) => chain && typeof chain === 'object')
      .map(([chainID, chain]) => {
        const chainConfig = {
          chainID: chain.chainID || chainID,
          name: chain.name || chainID,
          symbol: chain.symbol || null,
          cmcSymbol: chain.cmcSymbol || null,
          baseAsset: chain.baseAsset || null,
          networkType: chain.networkType || 'mainnet',
          chainType: chain.chainType || 'cosmos',
          icon: chain.icon || null,
        }

        return {
          chainID: chainConfig.chainID,
          name: chainConfig.name,
          chainType: chainConfig.chainType,
          networkType: chainConfig.networkType,
          baseAsset: chainConfig.baseAsset,
          symbol: getCmcSymbol(chainConfig),
          icon: chainConfig.icon,
          hasCmcMapping: !!getCmcSymbol(chainConfig),
        }
      })

    return res.json(result)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to load CMC chain mappings',
      details: error.message,
    })
  }
})

module.exports = router
