const axios = require('axios')
const fs = require('fs')
const path = require('path')
const currencies = require('../currencies')

const MANUAL_PRICE_ALIASES = {
  uluna: 'LUNC',
  'columbus-5': 'LUNC',
  'columbus-5:uluna': 'LUNC',
  'uluna:classic': 'LUNC',
  uluna_classic: 'LUNC',
  lunc: 'LUNC',

  'uluna:phoenix': 'LUNA',
  luna2: 'LUNA',

  ustc: 'USTC',

  osmo: 'OSMO',
  atom: 'ATOM',
  juno: 'JUNO',
  sei: 'SEI',
  inj: 'INJ',
  akt: 'AKT',
  scrt: 'SCRT',
  huahua: 'HUAHUA',
  kuji: 'KUJI',
  stars: 'STARS',
  dydx: 'DYDX',
  ntrn: 'NTRN',
  whale: 'WHALE',
  run: 'RUN',
  usdc: 'USDC',
  usdt: 'USDT',
  eth: 'ETH',
  ethereum: 'ETH',
  btc: 'BTC',
  sol: 'SOL',
  solana: 'SOL',
  ada: 'ADA',
  cardano: 'ADA',
  xrp: 'XRP',
  xrpl: 'XRP',

  // DGN / Dungeon manual aliases
  dgn: 'DGN',
  dungeon: 'DGN',
  'dungeon-1:udgn': 'DGN',
}

const COINGECKO_DO_ID = 'lunc-cookie-do-coin'
const DO_PRICE_KEYS = [
  'udo',
  'do',
  'DO',
  'dt',
  'DT',
  'Do-Chain',
  'do-chain',
  'Do-Chain:udo',
  'do-chain:udo',
]
const DEPRECATED_DO_PRICE_KEYS = ['dochain-1', 'dochain-1:udo']
const COINGECKO_DO_CACHE_MS = 60 * 1000
let coinGeckoDoCache = null

const TERRA_CLASSIC_LCD =
  process.env.TERRA_CLASSIC_LCD || 'https://terra-classic-lcd.publicnode.com'

const TERRA_CLASSIC_FIAT_ALIASES = {
  uaud: ['autc'],
  ucad: ['catc'],
  uchf: ['chtc'],
  ucny: ['cntc'],
  udkk: ['dktc'],
  ueur: ['eutc'],
  ugbp: ['gptc'],
  uhkd: ['hktc'],
  uidr: ['idtc', 'idtc*uluna', 'columbus-5:idtc'],
  uinr: ['intc'],
  ujpy: ['jptc'],
  ukrw: ['krtc', 'krtc*uluna', 'columbus-5:krtc'],
  umnt: ['umntc'],
  umyr: ['mytc'],
  unok: ['notc'],
  uphp: ['phtc'],
  usdr: ['sdrc'],
  usek: ['setc'],
  usgd: ['sgtc'],
  uthb: ['thtc'],
  utwd: ['twtc'],
}

const COINGECKO_OVERRIDES = {
  decentr: {
    aliases: ['dec', 'udec', 'decentr', 'mainnet-3', 'mainnet-3:udec'],
    force: true,
  },
  sentinel: {
    aliases: ['dvpn', 'udvpn', 'sentinel', 'sentinelhub-2', 'sentinelhub-2:udvpn'],
    force: true,
  },
  'chihuahua-token': {
    aliases: ['huahua', 'uhuahua', 'chihuahua', 'chihuahua-1', 'chihuahua-1:uhuahua'],
  },
  bitcoin: {
    aliases: ['btc', 'BTC', 'sat', 'sats', 'satoshi', 'bitcoin-mainnet', 'bitcoin-mainnet:satoshi', 'bitcoin-mainnet:btc'],
  },
  ethereum: {
    aliases: ['eth', 'ETH', 'wei', 'ethereum', 'ethereum-mainnet', 'ethereum-mainnet:wei'],
  },
  secret: {
    aliases: ['scrt', 'SCRT', 'uscrt', 'secret', 'secret-4', 'secret-4:uscrt'],
  },
  osmosis: {
    aliases: ['osmo', 'uosmo', 'osmosis', 'osmosis-1', 'osmosis-1:uosmo'],
  },
  cosmos: {
    aliases: ['atom', 'uatom', 'cosmos', 'cosmoshub-4', 'cosmoshub-4:uatom'],
  },
  'akash-network': {
    aliases: ['akt', 'uakt', 'akash', 'akashnet-2', 'akashnet-2:uakt'],
  },
  'crescent-network': {
    aliases: ['cre', 'ucre', 'crescent', 'crescent-1', 'crescent-1:ucre'],
    force: true,
  },
  switcheo: {
    aliases: ['swth', 'carbon', 'carbon-1', 'carbon-1:swth'],
    force: true,
  },
  'polygon-ecosystem-token': {
    aliases: ['pol', 'matic', 'polygon', 'polygon-mainnet', 'polygon-mainnet:wei'],
    force: true,
  },
}

const CMC_ID_OVERRIDES = {
  2643: ['dvpn', 'DVPN', 'udvpn', 'sentinel', 'sentinelhub-2', 'sentinelhub-2:udvpn'],
}

const DECENTR_FALLBACK_PRICE = Number(process.env.DECENTR_USD_PRICE ?? 0.00004296)
const STATIC_PRICE_FALLBACKS = [
  {
    aliases: ['cre', 'ucre', 'crescent', 'crescent-1', 'crescent-1:ucre'],
    price: Number(process.env.CRESCENT_USD_PRICE ?? 0.00009829),
    source: 'coingecko-fallback',
  },
  {
    aliases: ['swth', 'carbon', 'carbon-1', 'carbon-1:swth'],
    price: Number(process.env.SWTH_USD_PRICE ?? 0.00028106),
    source: 'coingecko-fallback',
  },
  {
    aliases: ['pol', 'matic', 'polygon', 'polygon-mainnet', 'polygon-mainnet:wei'],
    price: Number(process.env.POLYGON_USD_PRICE ?? 0.072818),
    source: 'coingecko-fallback',
  },
]

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
    if (fs.existsSync(candidate)) return candidate
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

function normalizeTicker(value) {
  if (!value || typeof value !== 'string') return null
  return value.trim().toUpperCase()
}

function normalizeAliasKey(value) {
  if (!value || typeof value !== 'string') return null
  return value.trim().toLowerCase()
}

function getFallbackTickerForChain(chainID) {
  const fallback = {
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
    'dungeon-1': 'DGN',
  }

  return fallback[chainID] || null
}

function getTickerForChain(chainID, chain) {
  return (
    normalizeTicker(chain?.cmcSymbol) ||
    normalizeTicker(chain?.symbol) ||
    normalizeTicker(getFallbackTickerForChain(chainID))
  )
}

function buildCmcAliasMap() {
  const chains = loadChainsConfig()
  const aliases = { ...MANUAL_PRICE_ALIASES }

  Object.entries(chains).forEach(([chainID, chain]) => {
    if (!chain || typeof chain !== 'object') return

    const ticker = getTickerForChain(chainID, chain)
    if (!ticker) return

    const aliasCandidates = [
      chainID,
      chain?.chainID,
      chain?.baseAsset,
      chain?.baseAsset ? `${chainID}:${chain.baseAsset}` : null,
      chain?.chainID && chain?.baseAsset ? `${chain.chainID}:${chain.baseAsset}` : null,
      chain?.symbol,
      chain?.name,
    ]
      .map(normalizeAliasKey)
      .filter(Boolean)

    aliasCandidates.forEach((alias) => {
      aliases[alias] = ticker
    })

    // Special handling for Terra uluna split
    if (chainID === 'columbus-5') {
      aliases.uluna = ticker
      aliases['columbus-5:uluna'] = ticker
      aliases['uluna:classic'] = ticker
      aliases.uluna_classic = ticker
      aliases.lunc = ticker
    }

    if (chainID === 'phoenix-1') {
      aliases['phoenix-1:uluna'] = ticker
      aliases['uluna:phoenix'] = ticker
      aliases.luna = ticker
      aliases.luna2 = ticker
    }

    // Special handling for Bitcoin satoshi base asset
    if (chainID === 'bitcoin-mainnet') {
      aliases.satoshi = ticker
      aliases['bitcoin-mainnet:satoshi'] = ticker
      aliases.btc = ticker
      aliases.wbtc = ticker
    }

    if (chainID === 'ethereum-mainnet') {
      aliases.wei = ticker
      aliases['ethereum-mainnet:wei'] = ticker
      aliases.eth = ticker
      aliases.ethereum = ticker
    }

    if (chainID === 'solana-mainnet') {
      aliases.lamports = ticker
      aliases['solana-mainnet:lamports'] = ticker
      aliases.sol = ticker
      aliases.solana = ticker
    }

    if (chainID === 'cardano-mainnet') {
      aliases.lovelace = ticker
      aliases['cardano-mainnet:lovelace'] = ticker
      aliases.ada = ticker
      aliases.cardano = ticker
    }

    if (chainID === 'xrp-ledger-mainnet') {
      aliases.drops = ticker
      aliases['xrp-ledger-mainnet:drops'] = ticker
      aliases.xrp = ticker
      aliases.xrpl = ticker
    }

    if (chainID === 'bnb-smart-chain-mainnet') {
      aliases.bnb = ticker
      aliases.bsc = ticker
    }

    if (chainID === 'tron-mainnet') {
      aliases.sun = ticker
      aliases['tron-mainnet:sun'] = ticker
      aliases.trx = ticker
      aliases.tron = ticker
    }

    if (chainID === 'secret-4') {
      aliases.uscrt = ticker
      aliases['secret-4:uscrt'] = ticker
      aliases.scrt = ticker
      aliases.secret = ticker
    }
  })

  return aliases
}

function applyDoPrice(prices, price, change, source) {
  if (!Number.isFinite(price) || price <= 0) return prices

  DO_PRICE_KEYS.forEach((key) => {
    prices[key] = {
      price,
      change: Number.isFinite(change) ? change : 0,
      source,
    }
  })

  return prices
}

function hasUsablePrice(item) {
  const price = Number(item?.price)
  return Number.isFinite(price) && price > 0
}

function assignPriceAliases(prices, aliases, price, change, source, force = false) {
  const value = Number(price)
  if (!Number.isFinite(value) || value <= 0) return prices

  const item = {
    price: value,
    change: Number.isFinite(Number(change)) ? Number(change) : 0,
    source,
  }

  aliases
    .filter(Boolean)
    .forEach((alias) => {
      if (force || !hasUsablePrice(prices[alias])) {
        prices[alias] = item
      }
    })

  return prices
}

function copyPriceAlias(prices, fromKeys, toKeys, force = false) {
  const sourceKey = fromKeys.find((key) => hasUsablePrice(prices[key]))
  if (!sourceKey) return prices

  const item = prices[sourceKey]
  toKeys
    .filter(Boolean)
    .forEach((key) => {
      if (force || !hasUsablePrice(prices[key])) {
        prices[key] = item
      }
    })

  return prices
}

function removeDeprecatedDoAliases(prices) {
  DEPRECATED_DO_PRICE_KEYS.forEach((key) => {
    delete prices[key]
  })
  return prices
}

function applyStaticAliases(prices) {
  copyPriceAlias(
    prices,
    ['lunc', 'uluna', 'columbus-5', 'uluna:classic'],
    ['lunc', 'uluna', 'columbus-5', 'columbus-5:uluna', 'uluna:classic', 'uluna_classic', 'LUNC']
  )
  copyPriceAlias(
    prices,
    ['dgn', 'udgn', 'dungeon', 'dungeon-1'],
    ['dgn', 'DGN', 'udgn', 'dungeon', 'dungeon-1', 'dungeon-1:udgn']
  )
  copyPriceAlias(
    prices,
    ['scrt', 'uscrt', 'secret-4'],
    ['scrt', 'SCRT', 'uscrt', 'secret', 'secret-4', 'secret-4:uscrt']
  )
  copyPriceAlias(
    prices,
    ['huahua', 'uhuahua', 'chihuahua-1'],
    ['huahua', 'HUAHUA', 'uhuahua', 'chihuahua', 'chihuahua-1', 'chihuahua-1:uhuahua']
  )
  copyPriceAlias(
    prices,
    ['dec', 'udec', 'mainnet-3'],
    ['dec', 'DEC', 'udec', 'decentr', 'mainnet-3', 'mainnet-3:udec'],
    true
  )
  copyPriceAlias(
    prices,
    ['dvpn', 'udvpn', 'sentinelhub-2'],
    ['dvpn', 'DVPN', 'udvpn', 'sentinel', 'sentinelhub-2', 'sentinelhub-2:udvpn']
  )
  copyPriceAlias(
    prices,
    ['udo', 'do', 'Do-Chain'],
    ['udo', 'do', 'DO', 'dt', 'DT', 'Do-Chain', 'do-chain', 'Do-Chain:udo', 'do-chain:udo']
  )

  return removeDeprecatedDoAliases(prices)
}

async function applyCoinGeckoOverrides(prices) {
  const ids = Object.keys(COINGECKO_OVERRIDES)

  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'do-wallet-price-service/1.0',
      },
      params: {
        ids: ids.join(','),
        vs_currencies: 'usd',
        include_24hr_change: 'true',
      },
      timeout: 10000,
    })

    Object.entries(COINGECKO_OVERRIDES).forEach(([id, config]) => {
      const row = data?.[id]
      assignPriceAliases(
        prices,
        config.aliases,
        row?.usd,
        row?.usd_24h_change,
        'coingecko',
        Boolean(config.force)
      )
    })
  } catch (error) {
    console.error('CoinGecko price override fetch failed:', error.message)
  }

  return prices
}

async function applyCoinMarketCapIdOverrides(prices) {
  const apiKey = process.env.CMC_API_KEY || process.env.REACT_APP_CMC_API_KEY
  const ids = Object.keys(CMC_ID_OVERRIDES)
  if (!apiKey || !ids.length) return prices

  try {
    const { data } = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          id: ids.join(','),
          convert: 'USD',
        },
        timeout: 10000,
      }
    )

    const payload = data?.data || {}
    ids.forEach((id) => {
      const entry = payload[id]
      assignPriceAliases(
        prices,
        CMC_ID_OVERRIDES[id],
        entry?.quote?.USD?.price,
        entry?.quote?.USD?.percent_change_24h,
        'coinmarketcap',
        true
      )
    })
  } catch (error) {
    console.error('CoinMarketCap id override fetch failed:', error.message)
  }

  return prices
}

function applyDecentrFallback(prices) {
  const decentrKeys = ['dec', 'DEC', 'udec', 'decentr', 'mainnet-3', 'mainnet-3:udec']
  const current = prices.decentr || prices.udec || prices.dec
  if (hasUsablePrice(current) && current.source === 'coingecko') return prices

  return assignPriceAliases(
    prices,
    decentrKeys,
    DECENTR_FALLBACK_PRICE,
    0,
    'coingecko-fallback',
    true
  )
}

function applyStaticPriceFallbacks(prices) {
  STATIC_PRICE_FALLBACKS.forEach(({ aliases, price, source }) => {
    const current = aliases.map((key) => prices[key]).find(hasUsablePrice)
    if (current) return
    assignPriceAliases(prices, aliases, price, 0, source, true)
  })

  return prices
}

async function applyBinanceLuncFallback(prices) {
  if (hasUsablePrice(prices.lunc)) return prices

  try {
    const { data } = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'do-wallet-price-service/1.0',
      },
      params: { symbol: 'LUNCUSDT' },
      timeout: 8000,
    })

    assignPriceAliases(
      prices,
      ['lunc', 'uluna', 'columbus-5', 'columbus-5:uluna', 'uluna:classic', 'uluna_classic', 'LUNC'],
      data?.lastPrice,
      data?.priceChangePercent,
      'binance',
      true
    )
  } catch (error) {
    console.error('Binance LUNC price fallback failed:', error.message)
  }

  return prices
}

async function applyTerraClassicOraclePrices(prices) {
  const luncPrice = Number(prices.lunc?.price)
  if (!Number.isFinite(luncPrice) || luncPrice <= 0) return prices

  try {
    const { data } = await axios.get(
      `${TERRA_CLASSIC_LCD.replace(/\/+$/, '')}/terra/oracle/v1beta1/denoms/exchange_rates`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'do-wallet-price-service/1.0',
        },
        timeout: 10000,
      }
    )

    const rates = Array.isArray(data?.exchange_rates) ? data.exchange_rates : []
    rates.forEach(({ denom, amount }) => {
      const rate = Number(amount)
      if (!TERRA_CLASSIC_FIAT_ALIASES[denom] || !Number.isFinite(rate) || rate <= 0) {
        return
      }

      const aliases = [
        denom,
        `columbus-5:${denom}`,
        ...TERRA_CLASSIC_FIAT_ALIASES[denom],
      ]

      assignPriceAliases(
        prices,
        aliases,
        luncPrice / rate,
        prices.lunc?.change ?? 0,
        'terra-oracle',
        true
      )
    })
  } catch (error) {
    console.error('Terra Classic oracle price fetch failed:', error.message)
  }

  return prices
}

async function finalizePrices(prices) {
  let result = applyManualDgnFallback(prices)
  result = await applyCoinGeckoDoPrice(result)
  result = await applyCoinGeckoOverrides(result)
  result = await applyCoinMarketCapIdOverrides(result)
  result = applyDecentrFallback(result)
  result = applyStaticPriceFallbacks(result)
  result = await applyBinanceLuncFallback(result)
  result = await applyTerraClassicOraclePrices(result)
  return applyStaticAliases(result)
}

async function fetchCoinGeckoDoPrice() {
  if (coinGeckoDoCache?.expiresAt && coinGeckoDoCache.expiresAt > Date.now()) {
    return coinGeckoDoCache.value
  }

  try {
    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'do-wallet-price-service/1.0',
        },
        params: {
          ids: COINGECKO_DO_ID,
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_last_updated_at: 'true',
        },
        timeout: 10000,
      }
    )

    const entry = data?.[COINGECKO_DO_ID]
    const price = Number(entry?.usd ?? 0)

    if (!Number.isFinite(price) || price <= 0) return null

    const value = {
      price,
      change: Number(entry?.usd_24h_change ?? 0),
    }

    coinGeckoDoCache = {
      value,
      expiresAt: Date.now() + COINGECKO_DO_CACHE_MS,
    }

    return value
  } catch (error) {
    console.error('CoinGecko DO price fetch failed:', error.message)
    return null
  }
}

async function applyCoinGeckoDoPrice(prices) {
  const doPrice = await fetchCoinGeckoDoPrice()
  if (!doPrice) return prices
  return applyDoPrice(prices, doPrice.price, doPrice.change, 'coingecko')
}

function applyManualDgnFallback(prices) {
  const manualDgnPrice = Number(process.env.DGN_USD_PRICE ?? 0)
  const manualDgnChange = Number(process.env.DGN_24H_CHANGE ?? 0)
  const manualDoPrice = Number(process.env.DO_USD_PRICE ?? 0)
  const manualDoChange = Number(process.env.DO_24H_CHANGE ?? 0)

  if (manualDoPrice) {
    applyDoPrice(prices, manualDoPrice, manualDoChange, 'manual-fallback')
  }

  if (!manualDgnPrice) return prices

  prices.udgn = {
    price: manualDgnPrice,
    change: manualDgnChange,
    source: 'manual-fallback',
  }

  prices.dgn = {
    price: manualDgnPrice,
    change: manualDgnChange,
    source: 'manual-fallback',
  }

  prices.dungeon = {
    price: manualDgnPrice,
    change: manualDgnChange,
    source: 'manual-fallback',
  }

  prices['dungeon-1'] = {
    price: manualDgnPrice,
    change: manualDgnChange,
    source: 'manual-fallback',
  }

  return prices
}

async function fetchCoinMarketCapPrices() {
  const apiKey = process.env.CMC_API_KEY || process.env.REACT_APP_CMC_API_KEY

  if (!apiKey) {
    console.error('CMC_API_KEY missing')
    return finalizePrices({})
  }

  try {
    const cmcAliases = buildCmcAliasMap()
    const symbols = Array.from(new Set(Object.values(cmcAliases)))

    if (!symbols.length) {
      return finalizePrices({})
    }

    const { data } = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          symbol: symbols.join(','),
          convert: 'USD',
        },
        timeout: 10000,
      }
    )

    const payload = data?.data || {}
    const prices = {}

    Object.entries(cmcAliases).forEach(([key, symbol]) => {
      const entry = payload[symbol]

      prices[key] = {
        price: entry?.quote?.USD?.price ?? 0,
        change: entry?.quote?.USD?.percent_change_24h ?? 0,
        source: 'coinmarketcap',
      }
    })

    return finalizePrices(prices)
  } catch (error) {
    console.error('CoinMarketCap price fetch failed:', error.message)
    return finalizePrices({})
  }
}

async function fetchFiatRates() {
  const apiKey = process.env.CURRENCY_KEY
  const currencyIds = currencies
    .map((item) => item.id)
    .filter((id) => id && id !== 'USD')

  if (!apiKey) {
    return {
      USD: {
        rate: 1,
        name: 'United States Dollar',
        symbol: '$',
        source: 'fallback',
      },
    }
  }

  try {
    const { data } = await axios.get('https://apilayer.net/api/live', {
      params: {
        source: 'USD',
        currencies: currencyIds.join(','),
        access_key: apiKey,
      },
      timeout: 10000,
    })

    const quotes = data?.quotes || {}
    const result = {}

    currencies.forEach(({ id, name, symbol }) => {
      if (id === 'USD') {
        result[id] = {
          rate: 1,
          name,
          symbol,
          source: 'apilayer',
        }
        return
      }

      result[id] = {
        rate: quotes[`USD${id}`] ?? null,
        name,
        symbol,
        source: 'apilayer',
      }
    })

    if (!result.USD) {
      result.USD = {
        rate: 1,
        name: 'United States Dollar',
        symbol: '$',
        source: 'apilayer',
      }
    }

    return result
  } catch (error) {
    console.error('Fiat rate fetch failed:', error.message)
    return {
      USD: {
        rate: 1,
        name: 'United States Dollar',
        symbol: '$',
        source: 'fallback',
      },
    }
  }
}

async function priceRecoveryHandler(req, res) {
  try {
    const prices = await fetchCoinMarketCapPrices()
    res.json(prices)
  } catch (error) {
    console.error('Price recovery handler failed:', error.message)
    res.status(500).json({ error: 'Failed to fetch prices' })
  }
}

async function fiatRecoveryHandler(req, res) {
  try {
    const rates = await fetchFiatRates()
    res.json(rates)
  } catch (error) {
    console.error('Fiat recovery handler failed:', error.message)
    res.status(500).json({ error: 'Failed to fetch fiat rates' })
  }
}

module.exports = {
  fetchCoinMarketCapPrices,
  fetchFiatRates,
  priceRecoveryHandler,
  fiatRecoveryHandler,
}
