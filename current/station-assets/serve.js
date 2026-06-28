require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const crypto = require('crypto')
const { execSync } = require('child_process')
const { Contract, JsonRpcProvider } = require('ethers')

const app = express()
let secp256k1
try {
  secp256k1 = require('secp256k1')
} catch (err) {
  console.error('serve.js: secp256k1 dependency unavailable for MFA service')
}
let cosmjsFromBech32
let cosmjsToBech32
try {
  ;({ fromBech32: cosmjsFromBech32, toBech32: cosmjsToBech32 } = require('@cosmjs/encoding'))
} catch (err) {
  console.warn('serve.js: @cosmjs/encoding unavailable; Do Chain LCD address prefix compatibility disabled')
}
const boolEnv = (name) => String(process.env[name] || '').toLowerCase() === 'true'
const boundedIntEnv = (name, fallback, min, max) => {
  const parsed = Number.parseInt(process.env[name] || '', 10)
  const value = Number.isFinite(parsed) ? parsed : fallback
  return Math.min(max, Math.max(min, value))
}
const ALLOWED_ORIGINS = new Set(
  (
    process.env.ALLOWED_ORIGINS ||
    [
      'https://do-wallet.com',
      'https://www.do-wallet.com',
      'http://136.243.174.47:8080',
      'http://localhost:3000',
      'http://localhost:3001',
    ].join(',')
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
)

app.disable('x-powered-by')
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        callback(null, true)
        return
      }

      callback(null, false)
    },
    methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  })
)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss: http://178.63.79.250:1317 http://178.63.79.250:26657",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  )
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  next()
})
app.use(express.json({ limit: '2mb' }))

const DOCHAIN_ONLY_ASSETS =
  String(process.env.DOCHAIN_ONLY_ASSETS || 'false').toLowerCase() === 'true'
const EXTERNAL_ASSET_ROUTE_PREFIXES = [
  '/api/address',
  '/api/bnb',
  '/api/cardano',
  '/api/cw20',
  '/api/eth',
  '/api/evm',
  '/api/fees',
  '/api/nfts',
  '/api/noncosmos',
  '/api/secret',
  '/api/solana',
  '/api/tron',
  '/api/tx',
  '/api/xrp',
]

const externalAssetDisabledResponse = (req) => {
  if (req.path.includes('/validators')) {
    return { validators: [] }
  }

  if (req.path.includes('/proposals')) {
    return { proposals: [] }
  }

  if (req.path.includes('/amendments')) {
    return { amendments: [] }
  }

  if (
    req.path.startsWith('/api/cw20') ||
    req.path.startsWith('/api/nfts') ||
    req.path.includes('/utxo') ||
    req.path.includes('/txs')
  ) {
    return []
  }

  if (req.path.startsWith('/api/fees')) {
    return {
      fastestFee: 0,
      halfHourFee: 0,
      hourFee: 0,
      economyFee: 0,
      minimumFee: 0,
    }
  }

  return {
    disabled: true,
    amount: '0',
    balance: '0',
    data: [],
  }
}

app.use((req, res, next) => {
  if (!DOCHAIN_ONLY_ASSETS) {
    next()
    return
  }

  if (EXTERNAL_ASSET_ROUTE_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    res.json(externalAssetDisabledResponse(req))
    return
  }

  next()
})

console.log('serve.js: starting')

const buildDir = path.join(__dirname, 'build')
const DOCHAIN_LCD = process.env.DOCHAIN_LCD || 'https://do-chain.com'
const DOCHAIN_RPC = process.env.DOCHAIN_RPC || 'https://do-chain.com/rpc'
const DOCHAIN_MFA_STORE =
  process.env.DOCHAIN_MFA_STORE || path.join(__dirname, 'data', 'mfa-approvals.json')
const DOCHAIN_MFA_RATE_STORE =
  process.env.DOCHAIN_MFA_RATE_STORE ||
  path.join(path.dirname(DOCHAIN_MFA_STORE), 'mfa-rate-limits.json')
const DOCHAIN_MFA_KEY_FILE =
  process.env.DOCHAIN_MFA_KEY_FILE || `${DOCHAIN_MFA_STORE}.key`
const IS_PRODUCTION = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
const DOCHAIN_MFA_REQUIRE_STORE_KEY =
  boolEnv('DOCHAIN_MFA_REQUIRE_STORE_KEY') || IS_PRODUCTION
const DOCHAIN_MFA_SIGNER_MODE = String(
  process.env.DOCHAIN_MFA_SIGNER_MODE || (IS_PRODUCTION ? 'external' : 'local')
).toLowerCase()
const DOCHAIN_MFA_ALLOW_LOCAL_SIGNER = boolEnv('DOCHAIN_MFA_ALLOW_LOCAL_SIGNER')
const DOCHAIN_MFA_SIGNER_URL = String(process.env.DOCHAIN_MFA_SIGNER_URL || '').replace(/\/+$/, '')
const DOCHAIN_MFA_SIGNER_TOKEN = String(process.env.DOCHAIN_MFA_SIGNER_TOKEN || '')
const DOCHAIN_CHAIN_ID = String(process.env.DOCHAIN_CHAIN_ID || 'Do-Chain')
const DOCHAIN_WALLET_CHAIN_ID = String(process.env.DOCHAIN_WALLET_CHAIN_ID || 'Do-Chain')
const DOCHAIN_MFA_TOTP_WINDOW = boundedIntEnv('DOCHAIN_MFA_TOTP_WINDOW', 3, 1, 6)
const SECRET_LCD =
  process.env.SECRET_LCD || 'https://rest.lavenderfive.com:443/secretnetwork'
const LCD_FALLBACKS = {
  'Do-Chain': [
    DOCHAIN_LCD,
    'http://178.63.79.250:1317',
    'https://do-chain.com',
  ],
  'secret-4': [
    SECRET_LCD,
    'https://rest.lavenderfive.com:443/secretnetwork',
    'https://rest.cosmos.directory/secretnetwork',
  ],
  'dungeon-1': [
    'https://api.dungeongames.io',
    'https://rest.cosmos.directory/dungeon',
  ],
  'cosmoshub-4': [
    'https://cosmos-rest.publicnode.com',
    'https://rest.cosmos.directory/cosmoshub',
    'https://rest.lavenderfive.com:443/cosmoshub',
    'https://rest.cosmoshub-main.ccvalidators.com:443',
  ],
  'osmosis-1': [
    'https://osmosis-rest.publicnode.com',
    'https://rest.cosmos.directory/osmosis',
    'https://osmosis-api.polkachu.com',
    'https://rest.lavenderfive.com:443/osmosis',
  ],
  'juno-1': [
    'https://juno-rest.publicnode.com',
    'https://rest.cosmos.directory/juno',
    'https://juno-api.polkachu.com',
    'https://rest.lavenderfive.com:443/juno',
  ],
  'akashnet-2': [
    'https://akash-rest.publicnode.com',
    'https://akash-api.polkachu.com',
    'https://rest-akash.ecostake.com',
  ],
  Oraichain: [
    'https://oraichain-rest.publicnode.com',
    'https://oraichain-mainnet-lcd.autostake.com:443',
    'https://api-oraichain.mms.team',
  ],
  'andromeda-1': [
    'https://andro.api.m.stavr.tech',
    'https://andromeda-api.polkachu.com',
    'https://rest.lavenderfive.com:443/andromeda',
  ],
  'archway-1': [
    'https://archway-api.polkachu.com',
    'https://api.mainnet.archway.io',
    'https://archway.api.kjnodes.com',
  ],
  'axelar-dojo-1': [
    'https://axelar-rest.publicnode.com',
    'https://axelar-api.polkachu.com',
    'https://lcd-axelar.imperator.co:443',
  ],
  celestia: [
    'https://celestia-rest.publicnode.com',
    'https://celestia-api.polkachu.com',
    'https://rest.lavenderfive.com:443/celestia',
  ],
  'cheqd-mainnet-1': [
    'https://cheqd-rest.publicnode.com',
    'https://cheqd-api.polkachu.com',
    'https://api.cheqd.net',
  ],
  'chihuahua-1': [
    'https://chihuahua-api.polkachu.com',
    'https://api.chihuahua.wtf',
    'https://rest.lavenderfive.com:443/chihuahua',
  ],
  'dydx-mainnet-1': [
    'https://lcd-dydx.tfl.foundation',
    'https://dydx-rest.publicnode.com',
    'https://dydx-api.polkachu.com',
  ],
  'injective-1': [
    'https://injective-rest.publicnode.com',
    'https://injective-api.polkachu.com',
    'https://rest.lavenderfive.com:443/injective',
  ],
  'kava_2222-10': [
    'https://lcd-kava.tfl.foundation',
    'https://kava-rest.publicnode.com',
    'https://api.data.kava.io',
  ],
  'migaloo-1': [
    'https://migaloo-rest.publicnode.com',
    'https://migaloo-api.kleomedes.network:443',
  ],
  'neutron-1': [
    'https://rest-lb.neutron.org',
    'https://neutron-api.polkachu.com',
    'https://rest.lavenderfive.com:443/neutron',
  ],
  'noble-1': [
    'https://noble-api.polkachu.com',
    'https://rest.lavenderfive.com:443/noble',
    'https://noble-rest.owallet.io',
  ],
  'pirin-1': [
    'https://nolus-api.polkachu.com',
    'https://lcd.nolus.network',
    'https://rest.lavenderfive.com:443/nolus',
  ],
  'pryzm-1': [
    'https://api.pryzm.zone',
    'https://pryzm-mainnet-api.autostake.com:443',
  ],
  'stafihub-1': [
    'https://public-rest-rpc1.stafihub.io',
    'https://api.stafihub.nodestake.org',
  ],
  'sentinelhub-2': [
    'https://lcd-sentinel.tfl.foundation',
    'https://sentinel-rest.publicnode.com',
  ],
  'stargaze-1': [
    'https://rest.stargaze-apis.com',
    'https://stargaze-mainnet-lcd.autostake.com:443',
    'https://stargaze-rest.publicnode.com',
  ],
  'stride-1': [
    'https://stride-api.polkachu.com',
    'https://rest.lavenderfive.com:443/stride',
    'https://stride.api.kjnodes.com',
  ],
}

const LCD_CHAIN_ALIASES = {
  'decentr-mainnet-1': 'mainnet-3',
  do: 'Do-Chain',
  dochain: 'Do-Chain',
  'do-main-1': 'Do-Chain',
  'dochain-1': 'Do-Chain',
  '888': 'Do-Chain',
}

const resolveLcdChainID = (chainID) => LCD_CHAIN_ALIASES[chainID] || chainID
const DOCHAIN_LCD_CHAIN_IDS = new Set([
  'Do-Chain',
  DOCHAIN_CHAIN_ID,
  DOCHAIN_WALLET_CHAIN_ID,
  'do-chain',
  'do',
  'dochain',
  'do-main-1',
  'dochain-1',
  '888',
])
const DOCHAIN_BECH32_PREFIXES = new Map([
  ['terra', 'do'],
  ['cosmos', 'do'],
  ['do', 'do'],
  ['terravaloper', 'dovaloper'],
  ['cosmosvaloper', 'dovaloper'],
  ['dovaloper', 'dovaloper'],
])
const DOCHAIN_COMPAT_BECH32_RE =
  /\b(?:terra|cosmos|do|terravaloper|cosmosvaloper|dovaloper)1[0-9a-z]{20,}\b/gi

function isDoChainLcdChainID(chainID) {
  const raw = String(chainID || '').trim()
  const lower = raw.toLowerCase()
  return (
    DOCHAIN_LCD_CHAIN_IDS.has(raw) ||
    DOCHAIN_LCD_CHAIN_IDS.has(lower) ||
    LCD_CHAIN_ALIASES[raw] === 'Do-Chain' ||
    LCD_CHAIN_ALIASES[lower] === 'Do-Chain'
  )
}

function recodeDoChainBech32Address(address) {
  if (!cosmjsFromBech32 || !cosmjsToBech32) return address
  try {
    const decoded = cosmjsFromBech32(address)
    const targetPrefix = DOCHAIN_BECH32_PREFIXES.get(String(decoded.prefix || '').toLowerCase())
    if (!targetPrefix || decoded.prefix === targetPrefix) return address
    return cosmjsToBech32(targetPrefix, decoded.data)
  } catch (_) {
    return address
  }
}

function normalizeDoChainLcdPath(upstreamPath, chainID) {
  if (!isDoChainLcdChainID(chainID)) return upstreamPath
  return String(upstreamPath || '').replace(DOCHAIN_COMPAT_BECH32_RE, (address) =>
    recodeDoChainBech32Address(address)
  )
}
const nativeEvmTokenIDs = new Set([
  'eth',
  'ethereum',
  'ether',
  'wei',
  'matic',
  'polygon',
  'bnb',
  'avax',
  'avalanche',
])

const isNativeEvmTokenID = (value) =>
  nativeEvmTokenIDs.has(String(value || '').trim().toLowerCase())
const ETHEREUM_RPC =
  process.env.ETHEREUM_RPC || 'https://ethereum-rpc.publicnode.com'
const EVM_CHAIN_RPC = {
  'ethereum-mainnet': ETHEREUM_RPC,
  'polygon-mainnet': process.env.POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com',
  'arbitrum-one': process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
  'optimism-mainnet': process.env.OPTIMISM_RPC || 'https://mainnet.optimism.io',
  'base-mainnet': process.env.BASE_RPC || 'https://mainnet.base.org',
  'bnb-smart-chain-mainnet':
    process.env.BSC_RPC || 'https://bsc-dataseed.binance.org',
  'avalanche-c-chain':
    process.env.AVALANCHE_RPC || 'https://api.avax.network/ext/bc/C/rpc',
}
const EVM_CHAIN_NATIVE = {
  'ethereum-mainnet': {
    denom: 'wei',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
  },
  'polygon-mainnet': {
    denom: 'wei',
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
  },
  'arbitrum-one': {
    denom: 'wei',
    symbol: 'ETH',
    name: 'Arbitrum One',
    decimals: 18,
  },
  'optimism-mainnet': {
    denom: 'wei',
    symbol: 'ETH',
    name: 'Optimism',
    decimals: 18,
  },
  'base-mainnet': {
    denom: 'wei',
    symbol: 'ETH',
    name: 'Base',
    decimals: 18,
  },
  'bnb-smart-chain-mainnet': {
    denom: 'wei',
    symbol: 'BNB',
    name: 'BNB Smart Chain',
    decimals: 18,
  },
  'avalanche-c-chain': {
    denom: 'wei',
    symbol: 'AVAX',
    name: 'Avalanche C-Chain',
    decimals: 18,
  },
}
const EVM_TOKEN_INDEXERS = {
  'ethereum-mainnet':
    process.env.ETHEREUM_BLOCKSCOUT_API || 'https://eth.blockscout.com',
}
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
const SOLANA_RPCS = Array.from(
  new Set(
    [
      SOLANA_RPC,
      'https://api.mainnet-beta.solana.com',
      'https://solana-rpc.publicnode.com',
    ].filter(Boolean)
  )
)
const SOLANA_TOKEN_PROGRAM_IDS = [
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
]
const CARDANO_API = process.env.CARDANO_API || 'https://api.koios.rest/api/v1'
const XRP_RPC = process.env.XRP_RPC || 'https://xrplcluster.com/'
const XRPSCAN_API = process.env.XRPSCAN_API || 'https://api.xrpscan.com/api/v1'
const TRON_API = process.env.TRON_API || 'https://api.trongrid.io'
const TRON_FULLNODE = process.env.TRON_FULLNODE || TRON_API
const BNB_STAKEHUB_ADDRESS =
  process.env.BNB_STAKEHUB_ADDRESS ||
  '0x0000000000000000000000000000000000002002'
const BNB_STAKEHUB_ABI = [
  'function getValidators(uint256 offset,uint256 limit) view returns (address[] operatorAddrs,address[] creditAddrs,uint256 totalLength)',
  'function getValidatorDescription(address operatorAddress) view returns (tuple(string moniker,string identity,string website,string details))',
  'function getValidatorCommission(address operatorAddress) view returns (tuple(uint64 rate,uint64 maxRate,uint64 maxChangeRate))',
  'function getValidatorBasicInfo(address operatorAddress) view returns (uint256 createdTime,bool jailed,uint256 jailUntil)',
  'function getValidatorConsensusAddress(address operatorAddress) view returns (address consensusAddress)',
  'function getValidatorElectionInfo(uint256 offset,uint256 limit) view returns (address[] consensusAddrs,uint256[] votingPowers,bytes[] voteAddrs,uint256 totalLength)',
]
const COINGECKO_API =
  process.env.COINGECKO_API || 'https://api.coingecko.com/api/v3'
const JUPITER_TOKEN_API =
  process.env.JUPITER_TOKEN_API || 'https://lite-api.jup.ag/tokens/v2'
const MAGIC_EDEN_SOLANA_API =
  process.env.MAGIC_EDEN_SOLANA_API || 'https://api-mainnet.magiceden.dev/v2'
const ORDINALS_API = process.env.ORDINALS_API || 'https://ordinals.com'

const API_CACHE = new Map()
const LCD_PROXY_CACHE = new Map()
const LCD_PROXY_INFLIGHT = new Map()
const LCD_PROXY_CACHE_TTL_MS = 15 * 1000
const LCD_PROXY_EMPTY_TTL_MS = 2 * 1000
const LCD_PROXY_TIMEOUT_MS = Number(process.env.LCD_PROXY_TIMEOUT_MS || 8000)

const cacheJson = async (key, ttlMs, fetcher) => {
  const cached = API_CACHE.get(key)
  const now = Date.now()

  if (cached && cached.expires > now) return cached.value

  try {
    const value = await fetcher()
    API_CACHE.set(key, { value, expires: now + ttlMs })
    return value
  } catch (err) {
    if (cached) return cached.value
    throw err
  }
}

const getCoinGeckoHeaders = () => {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'do-wallet-market-service/1.0',
  }

  const demoKey = process.env.COINGECKO_API_KEY
  const proKey = process.env.COINGECKO_PRO_API_KEY

  if (demoKey) headers['x-cg-demo-api-key'] = demoKey
  if (proKey) headers['x-cg-pro-api-key'] = proKey

  return headers
}

const clampInt = (value, min, max, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

const MARKET_CATEGORIES = new Set(['layer-1', 'layer-2'])
const MARKET_ORDERS = new Set([
  'market_cap_desc',
  'market_cap_asc',
  'volume_desc',
  'id_asc',
  'id_desc',
])

const MARKET_FALLBACK_COINS = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    current_price: 62863,
    market_cap: 1260000000000,
    market_cap_rank: 1,
    total_volume: 29290000000,
    price_change_percentage_24h_in_currency: 2.29,
    circulating_supply: 20040000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    current_price: 1658.99,
    market_cap: 200100000000,
    market_cap_rank: 2,
    total_volume: 12530000000,
    price_change_percentage_24h_in_currency: 1.64,
    circulating_supply: 120680000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'tether',
    symbol: 'usdt',
    name: 'Tether',
    image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    current_price: 1,
    market_cap: 112000000000,
    market_cap_rank: 3,
    total_volume: 39000000000,
    price_change_percentage_24h_in_currency: 0.01,
    circulating_supply: 112000000000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'binancecoin',
    symbol: 'bnb',
    name: 'BNB',
    image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    current_price: 580,
    market_cap: 86000000000,
    market_cap_rank: 4,
    total_volume: 1300000000,
    price_change_percentage_24h_in_currency: 0.4,
    circulating_supply: 148000000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'solana',
    symbol: 'sol',
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    current_price: 134,
    market_cap: 64000000000,
    market_cap_rank: 5,
    total_volume: 2900000000,
    price_change_percentage_24h_in_currency: 1.2,
    circulating_supply: 477000000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'terra-luna-classic',
    symbol: 'lunc',
    name: 'Terra Luna Classic',
    image: 'https://assets.coingecko.com/coins/images/8284/large/01_LunaClassic_color.png',
    current_price: 0.0000708,
    market_cap: 390000000,
    market_cap_rank: 170,
    total_volume: 21000000,
    price_change_percentage_24h_in_currency: 3.2,
    circulating_supply: 5580000000000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'secret',
    symbol: 'scrt',
    name: 'Secret',
    image: 'https://assets.coingecko.com/coins/images/11871/large/Secret.png',
    current_price: 0.18,
    market_cap: 54000000,
    market_cap_rank: 610,
    total_volume: 1100000,
    price_change_percentage_24h_in_currency: 0,
    circulating_supply: 300000000,
    last_updated: new Date().toISOString(),
  },
]

const normalizeMarketCoin = (coin) => ({
  id: coin?.id ?? '',
  symbol: String(coin?.symbol ?? '').toUpperCase(),
  name: coin?.name ?? '',
  image: coin?.image ?? '',
  current_price: coin?.current_price ?? null,
  market_cap: coin?.market_cap ?? null,
  market_cap_rank: coin?.market_cap_rank ?? null,
  fully_diluted_valuation: coin?.fully_diluted_valuation ?? null,
  total_volume: coin?.total_volume ?? null,
  high_24h: coin?.high_24h ?? null,
  low_24h: coin?.low_24h ?? null,
  price_change_percentage_1h_in_currency:
    coin?.price_change_percentage_1h_in_currency ?? null,
  price_change_percentage_24h_in_currency:
    coin?.price_change_percentage_24h_in_currency ??
    coin?.price_change_percentage_24h ??
    null,
  price_change_percentage_7d_in_currency:
    coin?.price_change_percentage_7d_in_currency ?? null,
  circulating_supply: coin?.circulating_supply ?? null,
  total_supply: coin?.total_supply ?? null,
  max_supply: coin?.max_supply ?? null,
  ath: coin?.ath ?? null,
  atl: coin?.atl ?? null,
  last_updated: coin?.last_updated ?? null,
})

const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const compactArray = (value, limit = 8) =>
  (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .slice(0, limit)

const usdValue = (value) => value?.usd ?? null

const normalizePlatformContracts = (coin) => {
  const platforms = coin?.platforms || {}
  const detailPlatforms = coin?.detail_platforms || {}
  const platformIDs = new Set([
    ...Object.keys(platforms),
    ...Object.keys(detailPlatforms),
  ])

  return Array.from(platformIDs)
    .map((platform) => {
      const detail = detailPlatforms[platform] || {}
      const address = detail.contract_address || platforms[platform] || ''
      const decimalPlace =
        typeof detail.decimal_place === 'number' ? detail.decimal_place : null

      return {
        platform,
        address,
        decimalPlace,
      }
    })
    .filter(({ address }) => typeof address === 'string' && address.trim())
}

const normalizeMarketCoinDetail = (coin) => {
  const market = coin?.market_data || {}
  const links = coin?.links || {}

  return {
    id: coin?.id ?? '',
    symbol: String(coin?.symbol ?? '').toUpperCase(),
    name: coin?.name ?? '',
    image: coin?.image?.large || coin?.image?.small || coin?.image?.thumb || '',
    assetPlatformID: coin?.asset_platform_id ?? null,
    hashingAlgorithm: coin?.hashing_algorithm ?? null,
    categories: compactArray(coin?.categories, 12),
    description: stripHtml(coin?.description?.en).slice(0, 1600),
    genesisDate: coin?.genesis_date ?? null,
    sentimentUpPercentage: coin?.sentiment_votes_up_percentage ?? null,
    sentimentDownPercentage: coin?.sentiment_votes_down_percentage ?? null,
    contracts: normalizePlatformContracts(coin),
    links: {
      homepage: compactArray(links.homepage, 3),
      blockchainSites: compactArray(links.blockchain_site, 6),
      forums: compactArray(links.official_forum_url, 3),
      subreddit: links.subreddit_url || '',
      github: compactArray(links.repos_url?.github, 6),
    },
    market: {
      currentPrice: usdValue(market.current_price),
      marketCap: usdValue(market.market_cap),
      marketCapRank: coin?.market_cap_rank ?? null,
      fullyDilutedValuation: usdValue(market.fully_diluted_valuation),
      totalVolume: usdValue(market.total_volume),
      high24h: usdValue(market.high_24h),
      low24h: usdValue(market.low_24h),
      priceChange24h: market.price_change_24h ?? null,
      priceChangePercentage1h:
        market.price_change_percentage_1h_in_currency?.usd ?? null,
      priceChangePercentage24h: market.price_change_percentage_24h ?? null,
      priceChangePercentage7d: market.price_change_percentage_7d ?? null,
      priceChangePercentage30d: market.price_change_percentage_30d ?? null,
      circulatingSupply: market.circulating_supply ?? null,
      totalSupply: market.total_supply ?? null,
      maxSupply: market.max_supply ?? null,
      ath: usdValue(market.ath),
      athDate: market.ath_date?.usd ?? null,
      atl: usdValue(market.atl),
      atlDate: market.atl_date?.usd ?? null,
      lastUpdated: market.last_updated ?? coin?.last_updated ?? null,
    },
  }
}

const normalizeMarketChart = (data) => ({
  prices: (Array.isArray(data?.prices) ? data.prices : []).map(
    ([timestamp, price]) => ({
      timestamp,
      price,
    })
  ),
  marketCaps: (Array.isArray(data?.market_caps) ? data.market_caps : []).map(
    ([timestamp, value]) => ({
      timestamp,
      value,
    })
  ),
  totalVolumes: (Array.isArray(data?.total_volumes)
    ? data.total_volumes
    : []
  ).map(([timestamp, value]) => ({
    timestamp,
    value,
  })),
})

const parseCoinID = (value) => {
  const id = String(value || '')
    .trim()
    .toLowerCase()

  if (!/^[a-z0-9._-]{1,120}$/.test(id)) {
    const error = new Error('Invalid coin id')
    error.statusCode = 400
    throw error
  }

  return id
}

const shortTokenId = (value) => {
  const token = String(value || '')
  if (token.length <= 18) return token
  return `${token.slice(0, 8)}...${token.slice(-6)}`
}

const buildBitcoinTokenSymbol = (value) => {
  const token = String(value || '').trim()
  const compact = token.replace(/\s+/g, '')
  const upper = compact.toUpperCase()

  if (/^[A-Z0-9.$]{2,12}$/.test(upper)) return upper
  if (/^[a-f0-9]{64}i\d+$/i.test(compact)) return 'ORD'
  if (compact.includes('\u2022')) {
    const rune = compact.replace(/\u2022/g, '').toUpperCase()
    if (rune) return rune.slice(0, 12)
  }

  return 'BTC-L2'
}

const normalizeExternalNativeToken = ({
  chainID,
  token,
  symbol,
  name,
  icon,
  decimals,
  source,
}) => ({
  chains: [chainID],
  chainID,
  token,
  symbol,
  name,
  icon,
  decimals,
  source,
})

const normalizeEvmChainID = (chainID) => String(chainID || '').trim()

const getEvmRpc = (chainID) => {
  const normalizedChainID = normalizeEvmChainID(chainID)
  return EVM_CHAIN_RPC[normalizedChainID] || null
}

const getEvmNativeToken = (chainID) => {
  const normalizedChainID = normalizeEvmChainID(chainID)
  return (
    EVM_CHAIN_NATIVE[normalizedChainID] || EVM_CHAIN_NATIVE['ethereum-mainnet']
  )
}

const zeroEvmNativeBalance = (chainID, address) => {
  const normalizedChainID = normalizeEvmChainID(chainID)
  const native = getEvmNativeToken(normalizedChainID)

  return {
    address,
    chainID: normalizedChainID,
    denom: native.denom,
    amount: '0',
    symbol: native.symbol,
    name: native.name,
    decimals: native.decimals,
  }
}

const assertEvmChainID = (chainID) => {
  const normalizedChainID = normalizeEvmChainID(chainID)

  if (!/^[a-z0-9._-]{2,80}$/i.test(normalizedChainID)) {
    const error = new Error('Invalid EVM chain id')
    error.statusCode = 400
    throw error
  }

  if (!getEvmRpc(normalizedChainID)) {
    const error = new Error('Unsupported EVM network')
    error.statusCode = 400
    throw error
  }

  return normalizedChainID
}

const stripHexPrefix = (value) => String(value || '').replace(/^0x/i, '')

const evmAddressParam = (address) =>
  stripHexPrefix(address).toLowerCase().padStart(64, '0')

const safeNumberFromHex = (hex, fallback = 0) => {
  try {
    const value = BigInt(hex || '0x0')
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return fallback
    return Number(value)
  } catch {
    return fallback
  }
}

const decodeEvmString = (hex) => {
  const data = stripHexPrefix(hex)
  if (!data) return ''

  try {
    if (data.length >= 128) {
      const offset = Number.parseInt(data.slice(0, 64), 16)
      const lengthStart = offset * 2
      const lengthHex = data.slice(lengthStart, lengthStart + 64)
      const byteLength = Number.parseInt(lengthHex, 16)

      if (
        Number.isFinite(offset) &&
        Number.isFinite(byteLength) &&
        byteLength > 0 &&
        byteLength < 2048
      ) {
        const valueHex = data.slice(
          lengthStart + 64,
          lengthStart + 64 + byteLength * 2
        )
        const decoded = decodeHexString(valueHex)
        if (decoded) return decoded
      }
    }

    return decodeHexString(data.slice(0, 64))
  } catch {
    return ''
  }
}

const evmRpcCall = async (chainID, payload) => {
  const rpc = getEvmRpc(chainID)
  if (!rpc) {
    const error = new Error('Unsupported EVM network')
    error.statusCode = 400
    throw error
  }

  return postJsonRpc(rpc, {
    jsonrpc: '2.0',
    id: 1,
    ...payload,
  })
}

const evmEthCall = async (chainID, contract, data) => {
  const response = await evmRpcCall(chainID, {
    method: 'eth_call',
    params: [{ to: contract, data }, 'latest'],
  })

  return response?.result || '0x'
}

const fetchEvmTokenInfo = async (chainID, contract) => {
  const normalizedChainID = assertEvmChainID(chainID)
  const normalizedContract = String(contract || '').trim()

  if (!isEthereumAddress(normalizedContract)) {
    const error = new Error('Invalid EVM token contract')
    error.statusCode = 400
    throw error
  }

  const code = await evmRpcCall(normalizedChainID, {
    method: 'eth_getCode',
    params: [normalizedContract, 'latest'],
  })

  if (!code?.result || code.result === '0x') {
    const error = new Error('No token contract found on this EVM network')
    error.statusCode = 404
    throw error
  }

  const [symbolHex, nameHex, decimalsHex] = await Promise.all([
    evmEthCall(normalizedChainID, normalizedContract, '0x95d89b41').catch(
      () => '0x'
    ),
    evmEthCall(normalizedChainID, normalizedContract, '0x06fdde03').catch(
      () => '0x'
    ),
    evmEthCall(normalizedChainID, normalizedContract, '0x313ce567').catch(
      () => '0x'
    ),
  ])

  const symbol =
    decodeEvmString(symbolHex).slice(0, 32) ||
    shortTokenId(normalizedContract).toUpperCase()
  const name =
    decodeEvmString(nameHex).slice(0, 96) ||
    `EVM token ${shortTokenId(normalizedContract)}`
  const decimals = safeNumberFromHex(decimalsHex, 18)

  return normalizeExternalNativeToken({
    chainID: normalizedChainID,
    token: normalizedContract,
    symbol,
    name,
    icon: '/img/chains/Ethereum.svg',
    decimals: decimals >= 0 && decimals <= 36 ? decimals : 18,
    source: 'evm-erc20',
  })
}

const fetchEvmTokenBalance = async ({ chainID, address, contract }) => {
  const normalizedChainID = assertEvmChainID(chainID)
  if (!isEthereumAddress(address) || !isEthereumAddress(contract)) {
    const error = new Error('Invalid EVM token balance request')
    error.statusCode = 400
    throw error
  }

  const result = await evmEthCall(
    normalizedChainID,
    contract,
    `0x70a08231${evmAddressParam(address)}`
  )

  return BigInt(result && result !== '0x' ? result : '0x0').toString()
}

const fetchEvmNativeBalance = async ({ chainID, address }) => {
  const normalizedChainID = assertEvmChainID(chainID)

  if (!isEthereumAddress(address)) {
    const error = new Error('Invalid EVM address')
    error.statusCode = 400
    throw error
  }

  const data = await evmRpcCall(normalizedChainID, {
    method: 'eth_getBalance',
    params: [address, 'latest'],
  })
  const native = getEvmNativeToken(normalizedChainID)

  return {
    address,
    chainID: normalizedChainID,
    denom: native.denom,
    amount: BigInt(data?.result || '0x0').toString(),
    symbol: native.symbol,
    name: native.name,
    decimals: native.decimals,
  }
}

const normalizeIndexedEvmToken = ({ chainID, address, item }) => {
  const token = item?.token || {}
  const contract = String(token.address_hash || token.address || '').trim()
  const amount = String(item?.value || item?.balance || '0')

  if (!isEthereumAddress(contract)) return null

  try {
    if (BigInt(amount || '0') <= 0n) return null
  } catch {
    return null
  }

  const decimals = Number.parseInt(token.decimals, 10)
  const priceUsd = Number(token.exchange_rate || token.price || 0)

  return {
    address,
    chainID,
    denom: contract,
    token: contract,
    contract,
    amount,
    symbol: String(token.symbol || shortTokenId(contract)).slice(0, 32),
    name: String(token.name || `EVM token ${shortTokenId(contract)}`).slice(
      0,
      96
    ),
    icon: token.icon_url || token.icon || '/img/chains/Ethereum.svg',
    decimals: Number.isFinite(decimals) && decimals >= 0 && decimals <= 36
      ? decimals
      : 18,
    priceUsd: Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : 0,
    source: 'blockscout-address-token-index',
  }
}

const fetchIndexedEvmTokens = async ({ chainID, address }) => {
  const normalizedChainID = assertEvmChainID(chainID)
  if (!isEthereumAddress(address)) {
    const error = new Error('Invalid EVM address')
    error.statusCode = 400
    throw error
  }

  const indexer = EVM_TOKEN_INDEXERS[normalizedChainID]
  if (!indexer) return []

  const endpoint = `${String(indexer).replace(/\/+$/, '')}/api/v2/addresses/${address}/tokens`
  let params = { type: 'ERC-20' }
  const rows = []

  for (let page = 0; params && page < 6 && rows.length < 500; page += 1) {
    const { data } = await axios.get(endpoint, {
      params,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'do-wallet-token-service/1.0',
      },
      timeout: 10000,
    })

    const items = Array.isArray(data?.items) ? data.items : []
    for (const item of items) {
      const row = normalizeIndexedEvmToken({
        chainID: normalizedChainID,
        address,
        item,
      })
      if (row) rows.push(row)
    }

    params = data?.next_page_params
      ? { ...data.next_page_params, type: 'ERC-20' }
      : null
  }

  return rows
}

const buildBitcoinTokenInfo = (query) => {
  const token = String(query || '').trim()

  if (token.length < 2 || token.length > 160) {
    const error = new Error('Invalid Bitcoin token identifier')
    error.statusCode = 400
    throw error
  }

  return normalizeExternalNativeToken({
    chainID: 'bitcoin-mainnet',
    token,
    symbol: buildBitcoinTokenSymbol(token),
    name: `Bitcoin token ${shortTokenId(token)}`,
    icon: '/img/chains/Bitcoin.svg',
    decimals: 0,
    source: 'manual-bitcoin-token',
  })
}

const normalizeSolanaTokenInfo = (token) => {
  const mint = token?.id || token?.address || token?.mint
  if (!mint || !isSolanaAddress(mint)) return null

  return normalizeExternalNativeToken({
    chainID: 'solana-mainnet',
    token: mint,
    symbol: String(token?.symbol || shortTokenId(mint)).toUpperCase(),
    name: token?.name || mint,
    icon: token?.icon || token?.logoURI || '/img/chains/Solana.svg',
    decimals: typeof token?.decimals === 'number' ? token.decimals : 9,
    source: 'jupiter-token-api',
  })
}

const fetchSolanaTokenInfo = async (query) => {
  const search = String(query || '').trim()
  if (search.length < 2 || search.length > 120) {
    const error = new Error('Invalid Solana token search')
    error.statusCode = 400
    throw error
  }

  const { data } = await axios.get(`${JUPITER_TOKEN_API}/search`, {
    params: { query: search },
    headers: {
      Accept: 'application/json',
      'User-Agent': 'do-wallet-token-service/1.0',
    },
    timeout: 15000,
  })

  const tokens = Array.isArray(data) ? data : []
  const exact = tokens.find((token) => {
    const id = String(token?.id || token?.address || token?.mint || '')
    return id === search
  })

  const normalized = normalizeSolanaTokenInfo(exact || tokens[0])
  if (!normalized) {
    const error = new Error('Solana token not found')
    error.statusCode = 404
    throw error
  }

  return normalized
}

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE58_MAP = new Map(
  BASE58_ALPHABET.split('').map((char, index) => [char, BigInt(index)])
)

const sha256Buffer = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest()

const base58Encode = (buffer) => {
  let value = BigInt(`0x${buffer.toString('hex') || '0'}`)
  let encoded = ''

  while (value > 0n) {
    const mod = value % 58n
    encoded = BASE58_ALPHABET[Number(mod)] + encoded
    value /= 58n
  }

  for (const byte of buffer) {
    if (byte !== 0) break
    encoded = BASE58_ALPHABET[0] + encoded
  }

  return encoded || BASE58_ALPHABET[0]
}

const base58Decode = (value) => {
  const input = String(value || '').trim()
  let decoded = 0n

  for (const char of input) {
    const index = BASE58_MAP.get(char)
    if (index === undefined) throw new Error('Invalid base58 character')
    decoded = decoded * 58n + index
  }

  let hex = decoded.toString(16)
  if (hex.length % 2) hex = `0${hex}`
  let buffer = Buffer.from(hex, 'hex')

  let leadingZeros = 0
  for (const char of input) {
    if (char !== BASE58_ALPHABET[0]) break
    leadingZeros += 1
  }

  if (leadingZeros) {
    buffer = Buffer.concat([Buffer.alloc(leadingZeros), buffer])
  }

  return buffer
}

const base58CheckEncode = (payload) => {
  const checksum = sha256Buffer(sha256Buffer(payload)).slice(0, 4)
  return base58Encode(Buffer.concat([payload, checksum]))
}

const base58CheckDecode = (value) => {
  const buffer = base58Decode(value)
  if (buffer.length < 5) throw new Error('Invalid base58check payload')

  const payload = buffer.slice(0, -4)
  const checksum = buffer.slice(-4)
  const expected = sha256Buffer(sha256Buffer(payload)).slice(0, 4)

  if (!checksum.equals(expected))
    throw new Error('Invalid base58check checksum')
  return payload
}

const tronHexToAddress = (hex) => {
  const value = stripHexPrefix(hex)
  const normalized =
    value.length === 40
      ? `41${value}`
      : value.toLowerCase().startsWith('41')
        ? value
        : ''

  if (!/^[a-fA-F0-9]{42}$/.test(normalized)) return ''
  return base58CheckEncode(Buffer.from(normalized, 'hex'))
}

const tronAddressToHex = (address) => {
  const payload = base58CheckDecode(address)
  if (payload.length !== 21 || payload[0] !== 0x41) {
    throw new Error('Invalid Tron address payload')
  }

  return payload.toString('hex')
}

const tronAddressAbiParam = (address) =>
  tronAddressToHex(address).slice(2).padStart(64, '0')

const assertTronChainID = (chainID) => {
  const normalizedChainID = String(chainID || '').trim()

  if (normalizedChainID !== 'tron-mainnet') {
    const error = new Error('Unsupported Tron network')
    error.statusCode = 400
    throw error
  }

  return normalizedChainID
}

const tronConstantCall = async ({
  ownerAddress,
  contract,
  functionSelector,
  parameter = '',
}) => {
  const ownerHex = tronAddressToHex(ownerAddress)
  const contractHex = tronAddressToHex(contract)

  const { data } = await axios.post(
    `${TRON_FULLNODE}/wallet/triggersmartcontract`,
    {
      owner_address: ownerHex,
      contract_address: contractHex,
      function_selector: functionSelector,
      parameter,
      visible: false,
    },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  )

  if (data?.result && data.result.result === false) {
    const error = new Error(data.result.message || 'Tron contract call failed')
    error.statusCode = 502
    throw error
  }

  return data?.constant_result?.[0] || '0x'
}

const fetchTronNativeBalance = async ({ address }) => {
  if (!isTronAddress(address)) {
    const error = new Error('Invalid Tron address')
    error.statusCode = 400
    throw error
  }

  const { data } = await axios.get(`${TRON_API}/v1/accounts/${address}`, {
    params: { only_confirmed: true },
    headers: { Accept: 'application/json' },
    timeout: 15000,
  })

  const account = Array.isArray(data?.data) ? data.data[0] : undefined

  return {
    address,
    chainID: 'tron-mainnet',
    denom: 'sun',
    amount: String(account?.balance ?? 0),
    symbol: 'TRX',
    name: 'Tron',
    decimals: 6,
  }
}

const fetchTronTokenInfo = async (chainID, contract) => {
  const normalizedChainID = assertTronChainID(chainID)
  const normalizedContract = String(contract || '').trim()

  if (!isTronAddress(normalizedContract)) {
    const error = new Error('Invalid TRC-20 token contract')
    error.statusCode = 400
    throw error
  }

  const [symbolHex, nameHex, decimalsHex] = await Promise.all([
    tronConstantCall({
      ownerAddress: normalizedContract,
      contract: normalizedContract,
      functionSelector: 'symbol()',
    }).catch(() => '0x'),
    tronConstantCall({
      ownerAddress: normalizedContract,
      contract: normalizedContract,
      functionSelector: 'name()',
    }).catch(() => '0x'),
    tronConstantCall({
      ownerAddress: normalizedContract,
      contract: normalizedContract,
      functionSelector: 'decimals()',
    }).catch(() => '0x'),
  ])

  const symbol =
    decodeEvmString(symbolHex).slice(0, 32) ||
    shortTokenId(normalizedContract).toUpperCase()
  const name =
    decodeEvmString(nameHex).slice(0, 96) ||
    `TRC-20 token ${shortTokenId(normalizedContract)}`
  const decimals = safeNumberFromHex(decimalsHex, 6)

  return normalizeExternalNativeToken({
    chainID: normalizedChainID,
    token: normalizedContract,
    symbol,
    name,
    icon: '/img/chains/Tron.svg',
    decimals: decimals >= 0 && decimals <= 36 ? decimals : 6,
    source: 'tron-trc20',
  })
}

const fetchTronTokenBalance = async ({ address, contract }) => {
  if (!isTronAddress(address) || !isTronAddress(contract)) {
    const error = new Error('Invalid TRC-20 token balance request')
    error.statusCode = 400
    throw error
  }

  const result = await tronConstantCall({
    ownerAddress: address,
    contract,
    functionSelector: 'balanceOf(address)',
    parameter: tronAddressAbiParam(address),
  })

  return BigInt(`0x${stripHexPrefix(result) || '0'}`).toString()
}

const fetchSolanaTokenBalance = async ({ address, mint }) => {
  const data = await postSolanaRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'getTokenAccountsByOwner',
    params: [
      address,
      { mint },
      {
        encoding: 'jsonParsed',
      },
    ],
  })

  const accounts = data?.result?.value
  if (!Array.isArray(accounts)) return '0'

  const total = accounts.reduce((sum, account) => {
    const amount =
      account?.account?.data?.parsed?.info?.tokenAmount?.amount ?? '0'

    try {
      return sum + BigInt(String(amount || '0'))
    } catch {
      return sum
    }
  }, 0n)

  return total.toString()
}

const fetchSolanaOwnedTokens = async (address) => {
  if (!isSolanaAddress(address)) {
    const error = new Error('Invalid Solana address')
    error.statusCode = 400
    throw error
  }

  const responses = await Promise.all(
    SOLANA_TOKEN_PROGRAM_IDS.map((programId) =>
      postSolanaRpc({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          address,
          { programId },
          {
            encoding: 'jsonParsed',
          },
        ],
      }).catch(() => ({ result: { value: [] } }))
    )
  )

  const byMint = new Map()

  for (const response of responses) {
    const accounts = response?.result?.value
    if (!Array.isArray(accounts)) continue

    for (const account of accounts) {
      const info = account?.account?.data?.parsed?.info
      const mint = String(info?.mint || '').trim()
      const tokenAmount = info?.tokenAmount || {}
      const raw = String(tokenAmount.amount || '0')
      if (!mint || !isSolanaAddress(mint)) continue

      let amount
      try {
        amount = BigInt(raw)
      } catch {
        amount = 0n
      }
      if (amount <= 0n) continue

      const previous = byMint.get(mint) || {
        mint,
        amount: 0n,
        decimals: Number(tokenAmount.decimals),
      }
      previous.amount += amount
      if (!Number.isFinite(previous.decimals)) {
        previous.decimals = Number(tokenAmount.decimals)
      }
      byMint.set(mint, previous)
    }
  }

  const rows = Array.from(byMint.values()).sort((a, b) =>
    compareBigIntDesc(a.amount, b.amount)
  )

  return rows.map((row) => {
    const decimals = Number.isFinite(row.decimals) ? row.decimals : 0
    const shortMint = shortTokenId(row.mint)

    return {
      address,
      chainID: 'solana-mainnet',
      denom: row.mint,
      token: row.mint,
      mint: row.mint,
      amount: row.amount.toString(),
      symbol: shortMint.toUpperCase(),
      name: `Solana token ${shortMint}`,
      icon: '/img/chains/Solana.svg',
      decimals,
      source: 'solana-token-account',
    }
  })
}

const normalizeNftImage = (value) => {
  if (typeof value !== 'string' || !value) return ''
  if (value.startsWith('ipfs://')) {
    return value.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/')
  }
  return value
}

const normalizeNftItem = ({
  chainID,
  id,
  name,
  collection,
  image,
  animationUrl,
  contract,
  tokenId,
  explorerUrl,
  description,
  attributes,
  source,
}) => ({
  chainID,
  id,
  name: name || shortTokenId(id),
  collection: collection || '',
  image: normalizeNftImage(image),
  animationUrl: normalizeNftImage(animationUrl),
  contract: contract || '',
  tokenId: tokenId || '',
  explorerUrl: explorerUrl || '',
  description: description || '',
  attributes: Array.isArray(attributes) ? attributes : [],
  source,
})

const decodeHexString = (value) => {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]+$/.test(value)) return ''

  try {
    return Buffer.from(value, 'hex').toString('utf8').replace(/\0/g, '').trim()
  } catch {
    return ''
  }
}

const fetchMetadataUri = async (uri) => {
  const url = normalizeNftImage(uri)
  if (!url || !/^https?:\/\//i.test(url)) return null

  try {
    const { data } = await axios.get(url, {
      headers: { Accept: 'application/json' },
      timeout: 10000,
    })

    return typeof data === 'object' && data ? data : null
  } catch {
    return null
  }
}

const fetchSolanaNFTs = async (address) => {
  const { data } = await axios.get(
    `${MAGIC_EDEN_SOLANA_API}/wallets/${address}/tokens`,
    {
      params: { offset: 0, limit: 100 },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'do-wallet-nft-service/1.0',
      },
      timeout: 20000,
    }
  )

  const tokens = Array.isArray(data) ? data : []

  return tokens.map((item) =>
    normalizeNftItem({
      chainID: 'solana-mainnet',
      id: item.mintAddress || item.tokenMint || item.id,
      name: item.name,
      collection: item.collectionName || item.collection,
      image: item.image,
      animationUrl: item.animationUrl,
      contract: item.collection || item.updateAuthority,
      tokenId: item.mintAddress,
      explorerUrl: item.mintAddress
        ? `https://magiceden.io/item-details/${item.mintAddress}`
        : '',
      attributes: item.attributes,
      source: 'magic-eden-solana',
    })
  )
}

const fetchXrpNFTs = async (address) => {
  const data = await postJsonRpc(XRP_RPC, {
    method: 'account_nfts',
    params: [
      {
        account: address,
        ledger_index: 'validated',
        limit: 100,
      },
    ],
  })

  const tokens = data?.result?.account_nfts
  if (!Array.isArray(tokens)) return []

  const normalized = await Promise.all(
    tokens.map(async (item) => {
      const uri = decodeHexString(item.URI)
      const metadata = await fetchMetadataUri(uri)
      const image =
        metadata?.image ||
        metadata?.image_url ||
        metadata?.properties?.image ||
        ''

      return normalizeNftItem({
        chainID: 'xrp-ledger-mainnet',
        id: item.NFTokenID,
        name: metadata?.name || shortTokenId(item.NFTokenID),
        collection: metadata?.collection?.name || 'XRP Ledger NFTs',
        image,
        animationUrl: metadata?.animation_url || metadata?.video || '',
        contract: item.Issuer,
        tokenId: item.NFTokenID,
        explorerUrl: item.NFTokenID
          ? `https://xrpscan.com/nft/${item.NFTokenID}`
          : '',
        description: metadata?.description,
        attributes: metadata?.attributes,
        source: 'xrpl-account-nfts',
      })
    })
  )

  return normalized
}

const fetchBitcoinOrdinals = async (address) => {
  try {
    const { data } = await axios.get(`${ORDINALS_API}/address/${address}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'do-wallet-nft-service/1.0',
      },
      timeout: 20000,
    })

    const rawItems = [
      ...(Array.isArray(data?.inscriptions) ? data.inscriptions : []),
      ...(Array.isArray(data?.outputs) ? data.outputs : []),
    ]

    const inscriptionIds = rawItems
      .map((item) =>
        typeof item === 'string' ? item : item?.id || item?.inscription_id
      )
      .filter((id) => typeof id === 'string' && /i\d+$/i.test(id))

    return Array.from(new Set(inscriptionIds)).map((id) =>
      normalizeNftItem({
        chainID: 'bitcoin-mainnet',
        id,
        name: `Ordinal ${shortTokenId(id)}`,
        collection: 'Bitcoin Ordinals',
        image: `${ORDINALS_API}/content/${id}`,
        tokenId: id,
        explorerUrl: `${ORDINALS_API}/inscription/${id}`,
        source: 'ord-address-api',
      })
    )
  } catch (err) {
    console.error('Bitcoin ordinals fetch failed:', err.message)
    return []
  }
}

const fetchCardanoNFTs = async (address) => {
  try {
    const { data } = await axios.post(
      `${CARDANO_API}/address_info`,
      { _addresses: [address] },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    )

    const entry = Array.isArray(data) ? data[0] : undefined
    const assets =
      entry?.asset_list || entry?.assets || entry?.tokens || entry?.utxos || []

    if (!Array.isArray(assets)) return []

    return assets
      .map((asset) => {
        const policy = asset.policy_id || asset.policyId || asset.policy
        const assetName =
          asset.asset_name || asset.assetName || asset.name || asset.fingerprint
        const quantity = String(asset.quantity || asset.amount || '1')
        const id = [policy, assetName].filter(Boolean).join('')

        if (!id || quantity !== '1') return null

        return normalizeNftItem({
          chainID: 'cardano-mainnet',
          id,
          name: assetName || shortTokenId(id),
          collection: policy ? `Policy ${shortTokenId(policy)}` : 'Cardano NFT',
          image: normalizeNftImage(asset.image || asset.logo || ''),
          contract: policy,
          tokenId: assetName || id,
          explorerUrl: `https://cardanoscan.io/token/${id}`,
          source: 'koios-address-assets',
        })
      })
      .filter(Boolean)
  } catch (err) {
    console.error('Cardano NFT fetch failed:', err.message)
    return []
  }
}

const fetchNFTsForChain = async (chainID, address) => {
  try {
    if (!chainID || !address) return []

    if (chainID === 'solana-mainnet' && isSolanaAddress(address)) {
      return fetchSolanaNFTs(address)
    }

    if (chainID === 'xrp-ledger-mainnet' && isXrpAddress(address)) {
      return fetchXrpNFTs(address)
    }

    if (chainID === 'bitcoin-mainnet' && isBitcoinAddress(address)) {
      return fetchBitcoinOrdinals(address)
    }

    if (chainID === 'cardano-mainnet' && isCardanoAddress(address)) {
      return fetchCardanoNFTs(address)
    }

    return []
  } catch (err) {
    console.error(`NFT fetch failed for ${chainID}:`, err.message)
    return []
  }
}

const fetchMarketCoins = async ({ page, perPage, category, order, search }) => {
  if (search) {
    const { data: searchData } = await axios.get(`${COINGECKO_API}/search`, {
      params: { query: search },
      headers: getCoinGeckoHeaders(),
      timeout: 20000,
    })

    const searchCoins = searchData?.coins ?? []
    const coinIds = searchCoins.map(({ id }) => id).filter(Boolean)
    const pagedIds = coinIds.slice((page - 1) * perPage, page * perPage)

    if (!pagedIds.length) {
      return {
        totalSearchResults: coinIds.length,
        coins: [],
      }
    }

    let coins = []

    try {
      const { data } = await axios.get(`${COINGECKO_API}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: pagedIds.join(','),
          order,
          per_page: perPage,
          page: 1,
          sparkline: false,
          price_change_percentage: '1h,24h,7d',
        },
        headers: getCoinGeckoHeaders(),
        timeout: 25000,
      })

      const orderById = new Map(pagedIds.map((id, index) => [id, index]))
      coins = (data ?? []).sort(
        (a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0)
      )
    } catch (err) {
      console.error('Market search price fetch failed:', err.message)
      coins = searchCoins
        .filter(({ id }) => pagedIds.includes(id))
        .map((coin) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.large || coin.thumb,
          market_cap_rank: coin.market_cap_rank,
        }))
    }

    return {
      totalSearchResults: coinIds.length,
      coins,
    }
  }

  const { data } = await axios.get(`${COINGECKO_API}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      ...(category ? { category } : {}),
      order,
      per_page: perPage,
      page,
      sparkline: false,
      price_change_percentage: '1h,24h,7d',
    },
    headers: getCoinGeckoHeaders(),
    timeout: 25000,
  })

  return {
    totalSearchResults: null,
    coins: data ?? [],
  }
}

const getCachedAllMarkets = ({ page, perPage, order, search }) => {
  const exactKey = [
    'markets:coins',
    page,
    perPage,
    'all',
    order,
    search.toLowerCase(),
  ].join(':')
  const exact = API_CACHE.get(exactKey)?.value
  if (exact) return exact

  for (const [key, cached] of API_CACHE.entries()) {
    const parts = key.split(':')
    const isAllMarketKey =
      parts[0] === 'markets' &&
      parts[1] === 'coins' &&
      Number(parts[2]) === page &&
      parts[4] === 'all' &&
      parts[5] === order

    if (!isAllMarketKey || !cached?.value) continue

    const cachedPerPage = Number(parts[3])
    const cachedSearch = parts.slice(6).join(':')
    if (cachedSearch !== search.toLowerCase()) continue
    if (Number.isFinite(cachedPerPage) && cachedPerPage >= perPage) {
      return {
        ...cached.value,
        coins: (cached.value.coins ?? []).slice(0, perPage),
      }
    }
  }

  return null
}

const searchMarketCoins = (coins, search) => {
  const query = String(search || '').trim().toLowerCase()
  const list = Array.isArray(coins) ? coins : []
  if (!query) return list
  return list.filter((coin) => {
    const fields = [coin?.id, coin?.symbol, coin?.name]
      .map((value) => String(value || '').toLowerCase())
    return fields.some((value) => value.includes(query))
  })
}

const sortMarketCoins = (coins, order) => {
  const list = Array.isArray(coins) ? coins.slice() : []
  switch (order) {
    case 'market_cap_asc':
      return list.sort((a, b) => Number(a?.market_cap || 0) - Number(b?.market_cap || 0))
    case 'volume_desc':
      return list.sort((a, b) => Number(b?.total_volume || 0) - Number(a?.total_volume || 0))
    case 'id_asc':
      return list.sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || '')))
    case 'id_desc':
      return list.sort((a, b) => String(b?.id || '').localeCompare(String(a?.id || '')))
    case 'market_cap_desc':
    default:
      return list.sort((a, b) => Number(b?.market_cap || 0) - Number(a?.market_cap || 0))
  }
}

const getCachedMarketSearch = ({ page, perPage, order, search }) => {
  if (!search) return null

  for (const [key, cached] of API_CACHE.entries()) {
    const parts = key.split(':')
    const isAllMarketKey =
      parts[0] === 'markets' &&
      parts[1] === 'coins' &&
      parts[4] === 'all' &&
      parts[6] === ''

    if (!isAllMarketKey || !cached?.value?.coins) continue

    const filtered = sortMarketCoins(searchMarketCoins(cached.value.coins, search), order)
    const start = (page - 1) * perPage
    return {
      totalSearchResults: filtered.length,
      coins: filtered.slice(start, start + perPage),
    }
  }

  return null
}

const getStaticMarketFallback = ({ page, perPage, order, search }) => {
  const filtered = sortMarketCoins(searchMarketCoins(MARKET_FALLBACK_COINS, search), order)
  const start = (page - 1) * perPage
  return {
    totalSearchResults: search ? filtered.length : null,
    coins: filtered.slice(start, start + perPage),
  }
}

const marketCoinMatches = (coin, id) => {
  const query = String(id || '').trim().toLowerCase()
  if (!query || !coin) return false
  return [coin.id, coin.symbol, coin.name]
    .map((value) => String(value || '').trim().toLowerCase())
    .some((value) => value === query)
}

const findMarketCoinInCache = (id) => {
  for (const [, cached] of API_CACHE.entries()) {
    const coins = cached?.value?.coins
    if (!Array.isArray(coins)) continue
    const match = coins.find((coin) => marketCoinMatches(coin, id))
    if (match) return match
  }
  return null
}

const findStaticMarketCoin = (id) =>
  MARKET_FALLBACK_COINS.find((coin) => marketCoinMatches(coin, id)) || null

const fallbackCoinToDetail = (coin) => {
  if (!coin) return null
  if (coin.market) return coin

  return {
    id: coin.id ?? '',
    symbol: String(coin.symbol ?? '').toUpperCase(),
    name: coin.name ?? '',
    image: coin.image ?? '',
    assetPlatformID: null,
    hashingAlgorithm: null,
    categories: [],
    description: '',
    genesisDate: null,
    sentimentUpPercentage: null,
    sentimentDownPercentage: null,
    contracts: [],
    links: {
      homepage: [],
      blockchainSites: [],
      forums: [],
      subreddit: '',
      github: [],
    },
    market: {
      currentPrice: coin.current_price ?? null,
      marketCap: coin.market_cap ?? null,
      marketCapRank: coin.market_cap_rank ?? null,
      fullyDilutedValuation: coin.fully_diluted_valuation ?? null,
      totalVolume: coin.total_volume ?? null,
      high24h: coin.high_24h ?? null,
      low24h: coin.low_24h ?? null,
      priceChange24h: coin.price_change_24h ?? null,
      priceChangePercentage1h: coin.price_change_percentage_1h_in_currency ?? null,
      priceChangePercentage24h:
        coin.price_change_percentage_24h_in_currency ??
        coin.price_change_percentage_24h ??
        null,
      priceChangePercentage7d: coin.price_change_percentage_7d_in_currency ?? null,
      priceChangePercentage30d: null,
      circulatingSupply: coin.circulating_supply ?? null,
      totalSupply: coin.total_supply ?? null,
      maxSupply: coin.max_supply ?? null,
      ath: coin.ath ?? null,
      athDate: coin.ath_date ?? null,
      atl: coin.atl ?? null,
      atlDate: coin.atl_date ?? null,
      lastUpdated: coin.last_updated ?? new Date().toISOString(),
    },
  }
}

const getFallbackMarketDetail = (id) => {
  const detail = API_CACHE.get(`markets:coin-detail:${id}`)?.value
  if (detail) return { source: 'cache', detail }

  const cachedCoin = findMarketCoinInCache(id)
  if (cachedCoin) {
    return { source: 'fallback-cache', detail: fallbackCoinToDetail(cachedCoin) }
  }

  const staticCoin = findStaticMarketCoin(id)
  if (staticCoin) {
    return { source: 'fallback-static', detail: fallbackCoinToDetail(staticCoin) }
  }

  return null
}

const findCachedMarketChart = (id, days) => {
  const exact = API_CACHE.get(`markets:coin-chart:${id}:${days}`)?.value
  if (exact) return exact

  for (const [key, cached] of API_CACHE.entries()) {
    if (key.startsWith(`markets:coin-chart:${id}:`) && cached?.value?.prices) {
      return cached.value
    }
  }

  return null
}

const buildFallbackMarketChart = (coin, days) => {
  if (!coin) return null
  const detail = fallbackCoinToDetail(coin)
  const market = detail?.market || {}
  const currentPrice = Number(market.currentPrice ?? coin.current_price ?? 0)
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null

  const currentCap = Number(market.marketCap ?? coin.market_cap ?? 0)
  const currentVolume = Number(market.totalVolume ?? coin.total_volume ?? 0)
  const changePct = Number(
    market.priceChangePercentage24h ??
      coin.price_change_percentage_24h_in_currency ??
      coin.price_change_percentage_24h ??
      0
  )
  const safeChange = Number.isFinite(changePct) ? Math.max(-95, Math.min(500, changePct)) : 0
  const startPrice = currentPrice / (1 + safeChange / 100 || 1)
  const pointCount = Math.max(2, Math.min(72, Number(days) * 24 || 24))
  const end = Date.now()
  const step = (Number(days) * 24 * 60 * 60 * 1000 || 24 * 60 * 60 * 1000) / (pointCount - 1)

  const prices = []
  const marketCaps = []
  const totalVolumes = []

  for (let index = 0; index < pointCount; index += 1) {
    const ratio = pointCount === 1 ? 1 : index / (pointCount - 1)
    const timestamp = Math.round(end - step * (pointCount - 1 - index))
    const price = startPrice + (currentPrice - startPrice) * ratio
    prices.push({ timestamp, price })
    marketCaps.push({
      timestamp,
      value: currentCap > 0 ? currentCap * (price / currentPrice) : null,
    })
    totalVolumes.push({
      timestamp,
      value: currentVolume > 0 ? currentVolume : null,
    })
  }

  return { prices, marketCaps, totalVolumes }
}

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const PROXY_HEADER_ALLOWLIST = new Set(['accept', 'content-type', 'user-agent'])

function buildProxyHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([key]) =>
        PROXY_HEADER_ALLOWLIST.has(key.toLowerCase()) &&
        !HOP_BY_HOP_HEADERS.has(key.toLowerCase())
    )
  )
}

function doWalletEmptyLcdPayload(path) {
  if (/cosmos\/base\/tendermint\/v1beta1\/node_info/.test(path)) {
    return {
      default_node_info: {
        network: '',
        moniker: '',
        other: {},
      },
      application_version: {
        name: '',
        app_name: '',
        version: '',
      },
    }
  }
  if (/cosmos\/bank\/v1beta1\/balances\/[^/?]+\/by_denom/.test(path)) {
    let denom = ''
    try {
      denom = new URL(String(path || ''), 'https://do-wallet.local').searchParams.get('denom') || ''
    } catch (_) {}
    return { balance: { denom, amount: '0' } }
  }
  if (/cosmos\/bank\/v1beta1\/balances/.test(path)) return { balances: [], pagination: { next_key: null, total: '0' } };
  if (/cosmos\/distribution\/v1beta1\/delegators\/.+\/rewards/.test(path)) return { rewards: [], total: [] };
  if (/cosmos\/staking\/v1beta1\/delegations/.test(path)) return { delegation_responses: [], pagination: { next_key: null, total: '0' } };
  if (/cosmos\/tx\/v1beta1\/txs/.test(path)) {
    return {
      txs: [],
      tx_responses: [],
      pagination: { next_key: null, total: '0' },
      total: '0',
    }
  }
  if (/cosmos\/staking\/v1beta1\/params/.test(path)) {
    return {
      params: {
        unbonding_time: '0s',
        max_validators: 0,
        max_entries: 0,
        historical_entries: 0,
        bond_denom: '',
      },
    }
  }
  if (/cosmos\/staking\/v1beta1\/delegators\/.+\/unbonding_delegations/.test(path)) return { unbonding_responses: [], pagination: { next_key: null, total: '0' } };
  if (/cosmos\/gov\/v1beta1\/proposals/.test(path)) return { proposals: [], pagination: { next_key: null, total: '0' } };
  if (/ibc\/core\/channel\/v1\/channels\/undefined/.test(path) && /client_state/.test(path)) {
    return {
      identified_client_state: { client_id: '', client_state: null },
      proof: null,
      proof_height: { revision_number: '0', revision_height: '0' },
    }
  }
  if (/ibc\/apps\/transfer\/v1\/denom_traces\/[^/?]+/.test(path)) return { denom_trace: { path: '', base_denom: '' } };
  if (/cosmwasm\/wasm\/v1\/contract\/[^/]+\/smart\/[^/?]+/.test(path)) {
    const query = decodeSmartQueryPath(path)
    if (query && /"balance"\s*:/.test(query)) return { data: { balance: '0' } }
    if (query && /"token_info"\s*:/.test(query)) return { data: { name: 'Unknown token', symbol: 'TOKEN', decimals: 6, total_supply: '0' } }
    if (query && /"all_accounts"\s*:/.test(query)) return { data: { accounts: [] } }
    return { data: {} }
  }
  return null;
}

function normalizeLcdProxyPayload(path, status, contentType, data) {
  if (status < 200 || status >= 300) return null

  const isJson =
    String(contentType || '').toLowerCase().includes('json') ||
    /cosmwasm\/wasm\/v1\/contract\/[^/]+\/smart\/[^/?]+/.test(path)
  if (!isJson) return null

  let parsed
  try {
    parsed = JSON.parse(Buffer.from(data).toString('utf8'))
  } catch (_) {
    return null
  }

  if (/cosmwasm\/wasm\/v1\/contract\/[^/]+\/smart\/[^/?]+/.test(path)) {
    if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'data')) {
      return parsed
    }
    if (parsed && typeof parsed === 'object') {
      return { data: parsed }
    }
    const fallback = doWalletEmptyLcdPayload(path)
    return fallback || { data: {} }
  }

  return null
}

function decodeSmartQueryPath(path) {
  try {
    const match = String(path || '').match(/\/smart\/([^/?]+)/)
    if (!match) return ''
    return Buffer.from(decodeURIComponent(match[1]), 'base64').toString('utf8')
  } catch (_) {
    return ''
  }
}

function stripNumericOnlyQueryParams(value) {
  const raw = String(value || '')
  if (!raw.includes('?')) return raw
  try {
    const url = new URL(raw, 'https://do-wallet.local')
    if (!/\/cosmwasm\/wasm\/v1\/contract\/[^/]+\/smart\/[^/]+$/i.test(url.pathname)) return raw
    let hasSearch = false
    let numericOnly = true
    url.searchParams.forEach((_paramValue, key) => {
      hasSearch = true
      if (!/^\d+$/.test(key)) numericOnly = false
    })
    if (!hasSearch || !numericOnly) return raw
    return url.pathname + url.hash
  } catch (_) {
    return raw
  }
}

function normalizeCosmosTxQueryPath(value) {
  const raw = String(value || '')
  if (!raw.includes('/cosmos/tx/v1beta1/txs') || !raw.includes('events=')) return raw
  try {
    const url = new URL(raw, 'https://do-wallet.local')
    if (!/\/cosmos\/tx\/v1beta1\/txs$/i.test(url.pathname)) return raw
    if (url.searchParams.get('query')) return raw
    const events = url.searchParams
      .getAll('events')
      .map((event) => String(event || '').trim())
      .filter(Boolean)
    if (!events.length) return raw
    url.searchParams.delete('events')
    url.searchParams.set('query', events.join(' AND '))
    return `${url.pathname}?${url.searchParams.toString()}${url.hash || ''}`
  } catch (_) {
    return raw
  }
}

function normalizeProxyBase(value) {
  const base = String(value || '').trim().replace(/\/+$/, '')
  if (!base) return ''

  try {
    const parsed = new URL(base)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
  } catch (_) {
    return ''
  }

  return base
}

function uniqueProxyBases(values) {
  const seen = new Set()
  return (Array.isArray(values) ? values : [values])
    .map(normalizeProxyBase)
    .filter((base) => {
      if (!base || seen.has(base)) return false
      seen.add(base)
      return true
    })
}

function lcdCandidatesForChain(chainID, chainConfig, primary) {
  const configured = [
    primary,
    chainConfig?.upstreamLcd,
    chainConfig?.lcd,
    chainConfig?.api,
    chainConfig?.rest,
    ...(Array.isArray(chainConfig?.lcds) ? chainConfig.lcds : []),
    ...(Array.isArray(chainConfig?.apis?.rest)
      ? chainConfig.apis.rest.map((entry) => entry?.address || entry)
      : []),
  ]

  return uniqueProxyBases([
    ...configured,
    ...(LCD_FALLBACKS[chainID] || []),
  ])
}

function shouldTryNextProxy(status) {
  return status === 403 || status === 404 || status === 408 || status === 429 || status >= 500
}

function isLcdProxyPrefix(prefix) {
  return (
    prefix &&
    (prefix.startsWith('/lcd/') ||
      prefix.startsWith('/api/lcd/') ||
      prefix === '/dochain-lcd' ||
      prefix === '/secret-lcd')
  )
}

function isCacheableLcdProxyRequest(req, upstreamPath) {
  if (!['GET', 'HEAD'].includes(req.method)) return false
  return /\/cosmos\/(bank|staking|distribution|gov|base)\//.test(upstreamPath)
}

function readLcdProxyCache(key) {
  const cached = LCD_PROXY_CACHE.get(key)
  if (!cached) return null
  if (cached.expires <= Date.now()) {
    LCD_PROXY_CACHE.delete(key)
    return null
  }
  return cached
}

function writeLcdProxyCache(key, status, contentType, body, ttlMs = LCD_PROXY_CACHE_TTL_MS) {
  if (!key || status < 200 || status >= 300) return
  LCD_PROXY_CACHE.set(key, {
    status,
    contentType,
    body: Buffer.from(body),
    expires: Date.now() + ttlMs,
  })
}

function sendCachedLcdProxy(res, cached) {
  if (cached.contentType) res.set('content-type', cached.contentType)
  return res.status(cached.status).send(Buffer.from(cached.body))
}

function jsonProxyBody(payload) {
  return Buffer.from(JSON.stringify(payload))
}

async function proxyRequest(req, res, prefix, targetBase, options = {}) {
  const proxyChainID = options.chainID || ''
  let upstreamPath = stripNumericOnlyQueryParams(req.originalUrl.slice(prefix.length) || '/')
  upstreamPath = normalizeCosmosTxQueryPath(upstreamPath)
  upstreamPath = normalizeDoChainLcdPath(upstreamPath, proxyChainID)
  const targetBases = uniqueProxyBases(targetBase)
  const emptyLcdPayload =
    isLcdProxyPrefix(prefix)
      ? doWalletEmptyLcdPayload(upstreamPath)
      : null
  const cacheKey =
    isLcdProxyPrefix(prefix) && isCacheableLcdProxyRequest(req, upstreamPath)
      ? `lcd-proxy:${req.method}:${prefix}:${upstreamPath}`
      : ''

  if (cacheKey) {
    const cached = readLcdProxyCache(cacheKey)
    if (cached) return sendCachedLcdProxy(res, cached)

    const inFlight = LCD_PROXY_INFLIGHT.get(cacheKey)
    if (inFlight) {
      try {
        const cachedResponse = await inFlight
        if (cachedResponse) return sendCachedLcdProxy(res, cachedResponse)
      } catch (_) {}
    }
  }

  const proxyWork = (async () => {
    let lastUpstream = null
    let lastUpstreamUrl = ''
    let lastError = null

    if (!targetBases.length) {
      if (emptyLcdPayload) {
        const body = jsonProxyBody(emptyLcdPayload)
        return {
          status: 200,
          contentType: 'application/json',
          body,
          cacheTtlMs: LCD_PROXY_EMPTY_TTL_MS,
        }
      }
      return {
        status: 404,
        contentType: 'application/json',
        body: jsonProxyBody({ error: 'Upstream endpoint not configured' }),
      }
    }

    for (const base of targetBases) {
      const upstreamUrl = `${base}${upstreamPath}`
      lastUpstreamUrl = upstreamUrl

      try {
        const upstream = await axios.request({
          method: req.method,
          url: upstreamUrl,
          headers: buildProxyHeaders(req.headers),
          data: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
          responseType: 'arraybuffer',
          validateStatus: () => true,
          timeout: LCD_PROXY_TIMEOUT_MS,
        })

        lastUpstream = upstream

        if (shouldTryNextProxy(upstream.status) && base !== targetBases[targetBases.length - 1]) {
          continue
        }

        const contentType = upstream.headers['content-type']
        if (emptyLcdPayload && upstream.status >= 400) {
          const body = jsonProxyBody(emptyLcdPayload)
          return {
            status: 200,
            contentType: 'application/json',
            body,
            cacheTtlMs: LCD_PROXY_EMPTY_TTL_MS,
          }
        }
        const normalizedPayload = normalizeLcdProxyPayload(
          upstreamPath,
          upstream.status,
          contentType,
          upstream.data
        )
        if (normalizedPayload) {
          return {
            status: upstream.status,
            contentType: 'application/json',
            body: jsonProxyBody(normalizedPayload),
          }
        }

        return {
          status: upstream.status,
          contentType,
          body: Buffer.from(upstream.data),
        }
      } catch (err) {
        lastError = err
      }
    }

    if (emptyLcdPayload) {
      return {
        status: 200,
        contentType: 'application/json',
        body: jsonProxyBody(emptyLcdPayload),
        cacheTtlMs: LCD_PROXY_EMPTY_TTL_MS,
      }
    }

    if (lastUpstream) {
      return {
        status: lastUpstream.status,
        contentType: lastUpstream.headers['content-type'],
        body: Buffer.from(lastUpstream.data),
      }
    }

    console.error(
      `Proxy request failed for ${lastUpstreamUrl}`,
      lastError?.message || 'all upstreams unavailable'
    )
    return {
      status: 502,
      contentType: 'application/json',
      body: jsonProxyBody({ error: 'Upstream endpoint unavailable' }),
    }
  })()

  if (cacheKey) {
    LCD_PROXY_INFLIGHT.set(cacheKey, proxyWork)
  }

  try {
    const result = await proxyWork
    if (cacheKey) {
      writeLcdProxyCache(
        cacheKey,
        result.status,
        result.contentType,
        result.body,
        result.cacheTtlMs || LCD_PROXY_CACHE_TTL_MS
      )
    }
    if (result.contentType) res.set('content-type', result.contentType)
    return res.status(result.status).send(Buffer.from(result.body))
  } finally {
    if (cacheKey) LCD_PROXY_INFLIGHT.delete(cacheKey)
  }
}

async function postJsonRpc(url, payload, options = {}) {
  const { data } = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: options.timeout || 30000,
  })

  if (data?.error) {
    throw new Error(data.error.message || 'RPC returned an error')
  }

  return data
}

async function postJsonRpcFirst(urls, payload, options = {}) {
  let lastError = null

  for (const url of urls) {
    try {
      return await postJsonRpc(url, payload, options)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('RPC unavailable')
}

const postSolanaRpc = (payload, options = {}) =>
  postJsonRpcFirst(SOLANA_RPCS, payload, {
    timeout: options.timeout || 8000,
  })

const isEthereumAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address)
const isBitcoinAddress = (address) =>
  /^(bc1[ac-hj-np-z02-9]+|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/i.test(address)
const isBitcoinTxId = (txid) => /^[a-fA-F0-9]{64}$/.test(txid)
const isSolanaAddress = (address) =>
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
const isCardanoAddress = (address) => /^addr1[0-9a-z]{20,}$/i.test(address)
const isXrpAddress = (address) => /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)
const isTronAddress = (address) => {
  if (
    typeof address !== 'string' ||
    !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)
  ) {
    return false
  }

  try {
    tronAddressToHex(address)
    return true
  } catch {
    return false
  }
}

const compareBigIntDesc = (a, b) => {
  const av = BigInt(String(a || '0'))
  const bv = BigInt(String(b || '0'))

  if (bv > av) return 1
  if (bv < av) return -1
  return 0
}

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length)
  let index = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await mapper(items[current], current)
    }
  })

  await Promise.all(workers)
  return results
}

const decimalFromBps = (value, denominator = 10000) => {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) return '0'
  return String(number / denominator)
}

const readContractOr = async (promise, fallback) => {
  try {
    return await promise
  } catch {
    return fallback
  }
}

let bnbStakeHub
const getBnbStakeHub = () => {
  if (!bnbStakeHub) {
    const provider = new JsonRpcProvider(
      EVM_CHAIN_RPC['bnb-smart-chain-mainnet'],
      undefined,
      { batchMaxCount: 1 }
    )
    bnbStakeHub = new Contract(BNB_STAKEHUB_ADDRESS, BNB_STAKEHUB_ABI, provider)
  }

  return bnbStakeHub
}

const toCosmosValidator = ({
  operatorAddress,
  moniker,
  details,
  website,
  tokens,
  commissionRate,
  identity = '',
  jailed = false,
  status = 'BOND_STATUS_BONDED',
  external = {},
}) => ({
  operator_address: operatorAddress,
  consensus_pubkey: null,
  jailed: !!jailed,
  status,
  tokens: String(tokens || '0'),
  delegator_shares: String(tokens || '0'),
  description: {
    moniker: moniker || operatorAddress,
    identity,
    website: website || '',
    security_contact: '',
    details: details || '',
  },
  unbonding_height: '0',
  unbonding_time: '1970-01-01T00:00:00Z',
  commission: {
    commission_rates: {
      rate: String(commissionRate || 0),
      max_rate: '1',
      max_change_rate: '0',
    },
    update_time: '1970-01-01T00:00:00Z',
  },
  min_self_delegation: '0',
  external,
})

const fetchBnbValidators = async () => {
  const hub = getBnbStakeHub()
  const pageSize = 100
  const firstPage = await hub.getValidators(0, pageSize)
  const totalLength = Number(firstPage.totalLength ?? firstPage[2] ?? 0)
  let operatorAddrs = Array.from(firstPage.operatorAddrs ?? firstPage[0] ?? [])
  let creditAddrs = Array.from(firstPage.creditAddrs ?? firstPage[1] ?? [])

  for (let offset = pageSize; offset < totalLength; offset += pageSize) {
    const page = await hub.getValidators(offset, pageSize)
    operatorAddrs.push(...Array.from(page.operatorAddrs ?? page[0] ?? []))
    creditAddrs.push(...Array.from(page.creditAddrs ?? page[1] ?? []))
  }

  const electionByConsensus = new Map()
  for (let offset = 0; offset < Math.max(totalLength, pageSize); offset += pageSize) {
    const electionPage = await hub.getValidatorElectionInfo(offset, pageSize)
    const consensusAddrs = Array.from(
      electionPage.consensusAddrs ?? electionPage[0] ?? []
    )
    const votingPowers = Array.from(electionPage.votingPowers ?? electionPage[1] ?? [])
    const electionTotal = Number(electionPage.totalLength ?? electionPage[3] ?? 0)

    consensusAddrs.forEach((address, index) => {
      electionByConsensus.set(String(address).toLowerCase(), votingPowers[index] ?? 0n)
    })

    if (offset + pageSize >= electionTotal) break
  }

  const validators = await mapWithConcurrency(operatorAddrs, 3, async (operator, index) => {
    const operatorAddress = String(operator)
    const [description, commission, basicInfo, consensusAddress] =
      await Promise.all([
        readContractOr(hub.getValidatorDescription(operatorAddress), {}),
        readContractOr(hub.getValidatorCommission(operatorAddress), {}),
        readContractOr(hub.getValidatorBasicInfo(operatorAddress), {}),
        readContractOr(hub.getValidatorConsensusAddress(operatorAddress), ''),
      ])

    const votingPower =
      electionByConsensus.get(String(consensusAddress).toLowerCase()) ?? 0n
    const moniker = description?.moniker || operatorAddress
    const website = description?.website || ''
    const details = [
      description?.details || '',
      `Operator: ${operatorAddress}`,
      `Consensus: ${consensusAddress}`,
      creditAddrs[index] ? `Credit contract: ${creditAddrs[index]}` : '',
    ]
      .filter(Boolean)
      .join(' - ')

    return toCosmosValidator({
      operatorAddress,
      moniker,
      details,
      website,
      tokens: votingPower.toString(),
      commissionRate: decimalFromBps(commission?.rate ?? commission?.[0] ?? 0),
      identity: description?.identity || '',
      jailed: basicInfo?.jailed ?? basicInfo?.[1] ?? false,
      external: {
        chainType: 'bnb',
        credit_address: creditAddrs[index] || '',
        consensus_address: String(consensusAddress),
        created_time: String(basicInfo?.createdTime ?? basicInfo?.[0] ?? 0),
        jail_until: String(basicInfo?.jailUntil ?? basicInfo?.[2] ?? 0),
        commission_bps: String(commission?.rate ?? commission?.[0] ?? 0),
        max_commission_bps: String(commission?.maxRate ?? commission?.[1] ?? 0),
        voting_power_wei: votingPower.toString(),
      },
    })
  })

  return validators.sort((a, b) => compareBigIntDesc(a.tokens, b.tokens))
}

const fetchSolanaValidators = async () => {
  const data = await postSolanaRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'getVoteAccounts',
    params: [{ keepUnstakedDelinquents: false }],
  })

  const current = Array.isArray(data?.result?.current)
    ? data.result.current
    : []
  const delinquent = Array.isArray(data?.result?.delinquent)
    ? data.result.delinquent
    : []

  return [...current, ...delinquent]
    .map((validator) => {
      const votePubkey = validator?.votePubkey || ''
      const nodePubkey = validator?.nodePubkey || votePubkey
      const delinquentValidator = delinquent.includes(validator)

      return toCosmosValidator({
        operatorAddress: votePubkey,
        moniker: nodePubkey
          ? `${nodePubkey.slice(0, 8)}...${nodePubkey.slice(-6)}`
          : votePubkey,
        details: [
          `Node: ${nodePubkey}`,
          `Vote account: ${votePubkey}`,
          validator?.epochVoteAccount ? 'Epoch vote account' : '',
          delinquentValidator ? 'Delinquent' : '',
        ]
          .filter(Boolean)
          .join(' - '),
        website: '',
        tokens: validator?.activatedStake || 0,
        commissionRate: decimalFromBps(validator?.commission ?? 0, 100),
        jailed: delinquentValidator,
        external: {
          chainType: 'solana',
          node_pubkey: nodePubkey,
          vote_pubkey: votePubkey,
          epoch_vote_account: !!validator?.epochVoteAccount,
          epoch_credits: validator?.epochCredits ?? [],
          last_vote: validator?.lastVote ?? null,
          root_slot: validator?.rootSlot ?? null,
          commission_percent: validator?.commission ?? null,
        },
      })
    })
    .filter((validator) => validator.operator_address)
    .sort((a, b) => compareBigIntDesc(a.tokens, b.tokens))
}

const fetchCardanoPools = async () => {
  const pageSize = 1000
  const pools = []

  for (let offset = 0; offset < 5000; offset += pageSize) {
    const { data } = await axios.get(`${CARDANO_API}/pool_list`, {
      params: {
        pool_status: 'eq.registered',
        active_stake: 'not.is.null',
        limit: pageSize,
        offset,
      },
      headers: { Accept: 'application/json' },
      timeout: 30000,
    })

    const page = Array.isArray(data) ? data : []
    pools.push(...page)

    if (page.length < pageSize) break
  }

  return pools
    .filter((pool) => pool?.pool_status === 'registered')
    .sort((a, b) => compareBigIntDesc(a.active_stake, b.active_stake))
}

const fetchXrpValidators = async () => {
  const { data } = await axios.get(`${XRPSCAN_API}/validatorregistry`, {
    headers: { Accept: 'application/json' },
    timeout: 30000,
  })

  return (Array.isArray(data) ? data : [])
    .filter((validator) => validator?.chain === 'main')
    .sort((a, b) => {
      const aTrusted = Array.isArray(a?.unl) && a.unl.length > 0 ? 1 : 0
      const bTrusted = Array.isArray(b?.unl) && b.unl.length > 0 ? 1 : 0

      if (bTrusted !== aTrusted) return bTrusted - aTrusted
      return String(
        a?.domain || a?.domain_legacy || a?.master_key || ''
      ).localeCompare(
        String(b?.domain || b?.domain_legacy || b?.master_key || '')
      )
    })
}

const fetchTronWitnesses = async () => {
  const { data } = await axios.post(
    `${TRON_FULLNODE}/wallet/listwitnesses`,
    {},
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  )

  return (Array.isArray(data?.witnesses) ? data.witnesses : []).sort(
    (a, b) => Number(b?.voteCount ?? 0) - Number(a?.voteCount ?? 0)
  )
}

const fetchTronProposals = async () => {
  const { data } = await axios.post(
    `${TRON_FULLNODE}/wallet/listproposals`,
    {},
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  )

  return Array.isArray(data?.proposals) ? data.proposals : []
}

if (process.env.SKIP_ASSET_BUILD === '1') {
  console.log('serve.js: skipping asset build')
} else {
  try {
    console.log('serve.js: running node index.js')
    execSync('node index.js', { stdio: 'inherit' })
    console.log('serve.js: asset build finished')
  } catch (e) {
    console.error('serve.js: asset build failed')
    console.error(e)
    process.exit(1)
  }
}

let priceRecoveryHandler = null
let fetchPriceRecoveryMap = null
let fiatRecoveryHandler = null
let volumeRoutes = null
let walletRoutes = null
let blockSpeedRoutes = null
let communityPoolRoutes = null
let oraclePoolRoutes = null
let cw20Routes = null
let secretRoutes = null

try {
  console.log('serve.js: loading pricerecovery...')
  const priceModule = require('./prices/pricerecovery')
  priceRecoveryHandler = priceModule.priceRecoveryHandler
  fetchPriceRecoveryMap = priceModule.fetchCoinMarketCapPrices
  fiatRecoveryHandler = priceModule.fiatRecoveryHandler
  console.log('serve.js: pricerecovery loaded')
} catch (err) {
  console.error('serve.js: FAILED to load pricerecovery')
  console.error(err)
}

try {
  console.log('serve.js: loading volume routes...')
  volumeRoutes = require('./Volume/volume')
  console.log('serve.js: volume routes loaded')
} catch (err) {
  console.error('serve.js: FAILED to load volume routes')
  console.error(err)
}

try {
  console.log('serve.js: loading wallet routes...')
  walletRoutes = require('./Wallets/wallets')
  console.log('serve.js: wallet routes loaded')
} catch (err) {
  console.error('serve.js: FAILED to load wallet routes')
  console.error(err)
}

try {
  console.log('serve.js: loading blockspeed routes...')
  blockSpeedRoutes = require('./Blockspeed/blockspeed')
  console.log('serve.js: blockspeed routes loaded')
} catch (err) {
  console.error('serve.js: FAILED to load blockspeed routes')
  console.error(err)
}

try {
  console.log('serve.js: loading community pool routes...')
  communityPoolRoutes = require('./Pools/communitypool')
  console.log('serve.js: community pool routes loaded')
} catch (err) {
  console.error('serve.js: FAILED to load community pool routes')
  console.error(err)
}

try {
  console.log('serve.js: loading oracle pool routes...')
  oraclePoolRoutes = require('./Pools/oraclepool')
  console.log('serve.js: oracle pool routes loaded')
} catch (err) {
  console.error('serve.js: FAILED to load oracle pool routes')
  console.error(err)
}

try {
  console.log('serve.js: loading cw20 routes...')
  cw20Routes = require('./api/cw20/cw20Routes')
  console.log('serve.js: cw20 routes loaded')
} catch (err) {
  console.error('serve.js: FAILED to load cw20 routes')
  console.error(err)
}

try {
  console.log('serve.js: loading secret routes...')
  secretRoutes = require('./api/secret/secretRoutes')
  console.log('serve.js: secret routes loaded')
} catch (err) {
  console.error('serve.js: FAILED to load secret routes')
  console.error(err)
}

const MFA_BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const MFA_APPROVAL_VERSION = 'dochain-mfa-v1'
const MFA_RATE_LIMIT = new Map()
const MFA_RECOVERY_CODE_COUNT = 10
const MFA_RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MFA_PENDING_SETUP_TTL_MS = 10 * 60 * 1000
const MFA_RECOVERY_REUSE_WINDOW_MS = 10 * 60 * 1000
const MFA_STORE_CIPHER_PREFIX = 'enc:v1:'

const mfaError = (res, status, message) =>
  res.status(status).json({ error: message })

const normalizeMfaCode = (code) => String(code || '').replace(/\s/g, '').trim()

const parseKeyMaterial = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')
  try {
    const key = Buffer.from(raw, 'base64')
    if (key.length >= 32) return key.subarray(0, 32)
  } catch (_) {
    return null
  }
  return null
}

let cachedMfaStoreKey
const getMfaStoreKey = () => {
  if (cachedMfaStoreKey) return cachedMfaStoreKey
  const envKey = parseKeyMaterial(process.env.DOCHAIN_MFA_STORE_KEY)
  if (envKey) {
    cachedMfaStoreKey = envKey
    return cachedMfaStoreKey
  }

  try {
    const fileKey = parseKeyMaterial(fs.readFileSync(DOCHAIN_MFA_KEY_FILE, 'utf8'))
    if (fileKey) {
      cachedMfaStoreKey = fileKey
      return cachedMfaStoreKey
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('MFA key file read failed:', err)
  }

  if (DOCHAIN_MFA_REQUIRE_STORE_KEY) {
    throw new Error('DOCHAIN_MFA_STORE_KEY or DOCHAIN_MFA_KEY_FILE is required')
  }

  fs.mkdirSync(path.dirname(DOCHAIN_MFA_KEY_FILE), { recursive: true, mode: 0o700 })
  cachedMfaStoreKey = crypto.randomBytes(32)
  fs.writeFileSync(DOCHAIN_MFA_KEY_FILE, cachedMfaStoreKey.toString('base64'), { mode: 0o600 })
  console.warn('Generated local MFA store key file. Set DOCHAIN_MFA_STORE_KEY for production.')
  return cachedMfaStoreKey
}

const sealMfaValue = (value) => {
  const plaintext = Buffer.from(String(value || ''), 'utf8')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getMfaStoreKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${MFA_STORE_CIPHER_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

const openMfaValue = (value) => {
  const raw = String(value || '')
  if (!raw.startsWith(MFA_STORE_CIPHER_PREFIX)) return raw
  const parts = raw.slice(MFA_STORE_CIPHER_PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted MFA value')
  const [ivText, tagText, ciphertextText] = parts
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getMfaStoreKey(),
    Buffer.from(ivText, 'base64')
  )
  decipher.setAuthTag(Buffer.from(tagText, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

const mfaKeyedHash = (value) =>
  crypto.createHmac('sha256', getMfaStoreKey()).update(String(value || '')).digest('hex')

const generateBase32Secret = (bytes = 20) => {
  const data = crypto.randomBytes(bytes)
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of data) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += MFA_BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += MFA_BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

const decodeBase32 = (secret) => {
  const normalized = String(secret || '')
    .replace(/=+$/g, '')
    .replace(/\s/g, '')
    .toUpperCase()
  let bits = 0
  let value = 0
  const bytes = []

  for (const char of normalized) {
    const index = MFA_BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Invalid MFA secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}

const hotp = (secret, counter) => {
  const counterBytes = Buffer.alloc(8)
  counterBytes.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBytes.writeUInt32BE(counter >>> 0, 4)
  const hash = crypto
    .createHmac('sha1', decodeBase32(secret))
    .update(counterBytes)
    .digest()
  const offset = hash[hash.length - 1] & 0x0f
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    (hash[offset + 1] << 16) |
    (hash[offset + 2] << 8) |
    hash[offset + 3]

  return String(binary % 1000000).padStart(6, '0')
}

const verifyTotp = (secret, code, window = DOCHAIN_MFA_TOTP_WINDOW) => {
  const normalized = normalizeMfaCode(code)
  if (!/^\d{6}$/.test(normalized)) return false
  const counter = Math.floor(Date.now() / 1000 / 30)

  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(secret, counter + offset) === normalized) return true
  }

  return false
}

const normalizeRecoveryCode = (code) =>
  String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

const generateRecoveryCode = () => {
  let raw = ''
  for (let index = 0; index < 12; index += 1) {
    raw += MFA_RECOVERY_CODE_ALPHABET[crypto.randomInt(0, MFA_RECOVERY_CODE_ALPHABET.length)]
  }
  return `DO-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`
}

const hashRecoveryCode = (code, salt) =>
  crypto
    .createHmac('sha256', getMfaStoreKey())
    .update(`${salt}:${normalizeRecoveryCode(code)}`)
    .digest('hex')

const generateRecoveryCodes = () => {
  const salt = crypto.randomBytes(16).toString('hex')
  const codes = []
  const hashes = []
  for (let index = 0; index < MFA_RECOVERY_CODE_COUNT; index += 1) {
    const code = generateRecoveryCode()
    codes.push(code)
    hashes.push(hashRecoveryCode(code, salt))
  }
  return { salt, codes, hashes }
}

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`
}

const hashMessages = (messages) => {
  const hash = crypto.createHash('sha256')
  for (const message of messages || []) {
    hash.update(Buffer.from(stableStringify(message)))
  }
  return hash.digest('hex')
}

const readMfaStore = () => {
  try {
    const store = JSON.parse(fs.readFileSync(DOCHAIN_MFA_STORE, 'utf8'))
    store.accounts = store.accounts || {}
    store.pending_setups = store.pending_setups || {}
    return store
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('MFA store read failed:', err)
    return { accounts: {}, pending_setups: {} }
  }
}

const writeMfaStore = (store) => {
  fs.mkdirSync(path.dirname(DOCHAIN_MFA_STORE), { recursive: true, mode: 0o700 })
  const tmp = `${DOCHAIN_MFA_STORE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, DOCHAIN_MFA_STORE)
}

const getRecordSecret = (record) => openMfaValue(record.secret_enc || record.secret)
const getRecordPrivateKey = (record) => openMfaValue(record.private_key_enc || record.private_key)

const sealRecordSecrets = (record) => {
  let changed = false
  if (record.secret && !record.secret_enc) {
    record.secret_enc = sealMfaValue(record.secret)
    delete record.secret
    changed = true
  }
  if (record.private_key && !record.private_key_enc) {
    record.private_key_enc = sealMfaValue(record.private_key)
    delete record.private_key
    changed = true
  }
  if (changed) record.updated_at = new Date().toISOString()
  return changed
}

const cleanupPendingSetups = (store) => {
  const now = Date.now()
  let changed = false
  for (const [setupID, pending] of Object.entries(store.pending_setups || {})) {
    if (!pending?.expires_at || Number(pending.expires_at) <= now) {
      delete store.pending_setups[setupID]
      changed = true
    }
  }
  return changed
}

const prunePendingSetupsForAccount = (store, account, keep = 5) => {
  const entries = Object.entries(store.pending_setups || {})
    .filter(([, pending]) => pending?.account === account)
    .sort(([, a], [, b]) => Number(b?.created_at ? Date.parse(b.created_at) : b?.expires_at || 0) -
      Number(a?.created_at ? Date.parse(a.created_at) : a?.expires_at || 0))
  let changed = false
  for (const [setupID] of entries.slice(keep)) {
    delete store.pending_setups[setupID]
    changed = true
  }
  return changed
}

const findPendingMfaSetup = (store, account, setupID, setupSecret) => {
  const expectedSecret = String(setupSecret || '').trim()
  if (expectedSecret) {
    for (const [candidateID, candidate] of Object.entries(store.pending_setups || {})) {
      if (
        candidate?.account === account &&
        Number(candidate.expires_at) > Date.now() &&
        openMfaValue(candidate.secret_enc || candidate.secret) === expectedSecret
      ) {
        return { setupID: candidateID, pending: candidate }
      }
    }
    return { setupID: '', pending: null, stale: true }
  }
  const pending = setupID ? store.pending_setups[setupID] : null
  if (!pending || pending.account !== account || Number(pending.expires_at) <= Date.now()) {
    return { setupID: '', pending: null, stale: true }
  }
  return { setupID, pending }
}

const generateMfaPrivateKey = () => {
  if (!secp256k1) throw new Error('MFA signing dependency unavailable')

  for (let attempts = 0; attempts < 32; attempts += 1) {
    const key = crypto.randomBytes(32)
    if (secp256k1.privateKeyVerify(key)) return key
  }

  throw new Error('Unable to generate MFA approval key')
}

const normalizeApprovalPubKey = (value) => {
  if (!secp256k1) throw new Error('MFA signing dependency unavailable')
  const pubKey = Buffer.from(String(value || ''), 'base64')
  if (!secp256k1.publicKeyVerify(pubKey)) {
    throw new Error('Invalid MFA approval public key from signer')
  }
  return pubKey.toString('base64')
}

const requireMfaSignerConfig = () => {
  if (!['local', 'external'].includes(DOCHAIN_MFA_SIGNER_MODE)) {
    throw new Error('DOCHAIN_MFA_SIGNER_MODE must be local or external')
  }
  if (IS_PRODUCTION && DOCHAIN_MFA_SIGNER_MODE === 'local' && !DOCHAIN_MFA_ALLOW_LOCAL_SIGNER) {
    throw new Error('Production MFA requires an external signer unless DOCHAIN_MFA_ALLOW_LOCAL_SIGNER=true')
  }
  if (DOCHAIN_MFA_SIGNER_MODE === 'external' && !DOCHAIN_MFA_SIGNER_URL) {
    throw new Error('DOCHAIN_MFA_SIGNER_URL is required when DOCHAIN_MFA_SIGNER_MODE=external')
  }
}

const mfaSignerRequest = async (endpoint, body) => {
  requireMfaSignerConfig()
  const headers = { 'Content-Type': 'application/json' }
  if (DOCHAIN_MFA_SIGNER_TOKEN) headers.Authorization = `Bearer ${DOCHAIN_MFA_SIGNER_TOKEN}`
  const response = await axios.post(`${DOCHAIN_MFA_SIGNER_URL}${endpoint}`, body, {
    headers,
    timeout: 8000,
  })
  return response.data || {}
}

const createMfaApprovalKey = async (account) => {
  requireMfaSignerConfig()
  if (DOCHAIN_MFA_SIGNER_MODE === 'external') {
    const result = await mfaSignerRequest('/keys', {
      account,
      purpose: 'mfa_approval',
      public_key_format: 'base64_compressed_secp256k1',
    })
    const approvalPubKey = normalizeApprovalPubKey(result.approval_pub_key || result.public_key)
    const approvalKeyID = String(result.approval_key_id || result.key_id || '').trim()
    if (!approvalKeyID) throw new Error('MFA external signer did not return a key id')
    return { approval_pub_key: approvalPubKey, approval_key_id: approvalKeyID }
  }

  const privateKey = generateMfaPrivateKey()
  const publicKey = secp256k1.publicKeyCreate(privateKey, true)
  return {
    approval_pub_key: Buffer.from(publicKey).toString('base64'),
    private_key_enc: sealMfaValue(privateKey.toString('base64')),
  }
}

const signLocalApprovalPayload = (payload, privateKeyBase64) => {
  if (IS_PRODUCTION && !DOCHAIN_MFA_ALLOW_LOCAL_SIGNER) {
    throw new Error('Local MFA approval signing is disabled in production')
  }
  if (!secp256k1) throw new Error('MFA signing dependency unavailable')
  const signBytes = Buffer.from(stableStringify(payload))
  const digest = crypto.createHash('sha256').update(signBytes).digest()
  const privateKey = Buffer.from(privateKeyBase64, 'base64')
  const signature = secp256k1.ecdsaSign(digest, privateKey).signature
  return Buffer.from(signature).toString('base64')
}

const verifyApprovalPayloadSignature = (payload, signatureBase64, approvalPubKeyBase64) => {
  if (!secp256k1) throw new Error('MFA signing dependency unavailable')
  const signature = Buffer.from(String(signatureBase64 || ''), 'base64')
  const approvalPubKey = Buffer.from(String(approvalPubKeyBase64 || ''), 'base64')
  const signBytes = Buffer.from(stableStringify(payload))
  const digest = crypto.createHash('sha256').update(signBytes).digest()
  if (!secp256k1.ecdsaVerify(signature, digest, approvalPubKey)) {
    throw new Error('MFA external signer returned an invalid signature')
  }
}

const signApprovalPayload = async (payload, record) => {
  if (record?.approval_key_id || DOCHAIN_MFA_SIGNER_MODE === 'external') {
    if (!record?.approval_key_id) throw new Error('MFA record does not have an external signer key id')
    const result = await mfaSignerRequest('/sign', {
      account: record.account,
      approval_key_id: record.approval_key_id,
      key_id: record.approval_key_id,
      payload,
      payload_format: 'dochain_mfa_v1_json',
    })
    const signature = String(result.signature || '').trim()
    if (!signature) throw new Error('MFA external signer did not return a signature')
    verifyApprovalPayloadSignature(payload, signature, record.approval_pub_key)
    return signature
  }

  return signLocalApprovalPayload(payload, getRecordPrivateKey(record))
}

const isValidMfaAccount = (account) =>
  typeof account === 'string' && /^do1[ac-hj-np-z02-9]{20,90}$/i.test(account)

const readMfaRateStore = () => {
  try {
    return JSON.parse(fs.readFileSync(DOCHAIN_MFA_RATE_STORE, 'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('MFA rate store read failed:', err)
    return {}
  }
}

const writeMfaRateStore = (store) => {
  try {
    fs.mkdirSync(path.dirname(DOCHAIN_MFA_RATE_STORE), { recursive: true, mode: 0o700 })
    const tmp = `${DOCHAIN_MFA_RATE_STORE}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 })
    fs.renameSync(tmp, DOCHAIN_MFA_RATE_STORE)
  } catch (err) {
    console.error('MFA rate store write failed:', err)
  }
}

const rateLimitMfa = (req, account) => {
  const key = mfaKeyedHash(`${req.ip}:${account}`)
  const now = Date.now()
  const persisted = readMfaRateStore()
  const item = MFA_RATE_LIMIT.get(key) || persisted[key] || { count: 0, resetAt: now + 60_000 }
  if (item.resetAt < now) {
    item.count = 0
    item.resetAt = now + 60_000
  }
  item.count += 1
  MFA_RATE_LIMIT.set(key, item)
  persisted[key] = item
  for (const [storedKey, storedItem] of Object.entries(persisted)) {
    if (!storedItem?.resetAt || storedItem.resetAt < now - 60_000) {
      delete persisted[storedKey]
    }
  }
  writeMfaRateStore(persisted)
  return item.count <= 20
}

const getAccountSequence = async (account) => {
  const url = `${DOCHAIN_LCD.replace(/\/+$/, '')}/cosmos/auth/v1beta1/accounts/${account}`
  let data
  try {
    ;({ data } = await axios.get(url, { timeout: 8000 }))
  } catch (err) {
    if (err?.response?.status === 404) return 0
    throw err
  }
  const accountData = data?.account
  const baseAccount =
    accountData?.base_account ||
    accountData?.base_vesting_account?.base_account ||
    accountData
  const sequence = Number(baseAccount?.sequence ?? 0)
  return Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : 0
}

const mfaPolicyKeyHex = (account) =>
  Buffer.concat([Buffer.from([1]), Buffer.from(String(account || ''), 'utf8')])
    .toString('hex')
    .toUpperCase()

const queryOnChainMfaPolicy = async (account) => {
  const url = `${DOCHAIN_RPC.replace(/\/+$/, '')}/abci_query`
  const { data } = await axios.get(url, {
    params: {
      path: '"/store/mfa/key"',
      data: `0x${mfaPolicyKeyHex(account)}`,
      prove: 'false',
    },
    timeout: 8000,
  })
  const response = data?.result?.response
  if (!response || Number(response.code || 0) !== 0) {
    throw new Error(response?.log || 'MFA policy query failed')
  }
  if (!response.value) return { active: false, policy: null }

  const policyJson = Buffer.from(response.value, 'base64').toString('utf8')
  const policy = JSON.parse(policyJson)
  return {
    active: policy?.enabled !== false && policy?.account === account,
    policy,
  }
}

const messageType = (message) =>
  String(message?.['@type'] || message?.type || message?.typeUrl || '').replace(/^\//, '')

const isOneUdoSelfSend = (message, account) => {
  const type = messageType(message)
  if (!type.includes('MsgSend')) return false
  if (message.from_address !== account || message.to_address !== account) return false
  const amount = Array.isArray(message.amount) ? message.amount : []
  return (
    amount.length === 1 &&
    String(amount[0]?.denom || '').toLowerCase() === 'udo' &&
    String(amount[0]?.amount || '') === '1'
  )
}

const recoveryCodeMayApprove = (body, account) => {
  const purpose = String(body?.purpose || '').trim()
  const action = String(body?.control_action || '').trim()
  if (!['mfa_control', 'mfa_recovery'].includes(purpose)) return false
  if (!['disable', 'rotate', 'recovery_start', 'recovery_cancel', 'recovery_execute'].includes(action)) return false
  const messages = Array.isArray(body?.messages) ? body.messages : []
  if (messages.length === 0) return true
  return messages.length === 1 && isOneUdoSelfSend(messages[0], account)
}

const markRecoveryCodeConsumed = (record, hash) => {
  record.recovery_codes.last_used_hash = hash
  record.recovery_codes.last_used_at = Date.now()
}

const recentlyConsumedRecoveryCode = (record, code) => {
  const recovery = record?.recovery_codes
  if (!recovery?.last_used_hash || !recovery?.last_used_at || !recovery?.salt) return false
  if (Date.now() - Number(recovery.last_used_at) > MFA_RECOVERY_REUSE_WINDOW_MS) return false
  return hashRecoveryCode(code, recovery.salt) === recovery.last_used_hash
}

const consumeRecoveryCodeForRecord = (record, code) => {
  const normalized = normalizeRecoveryCode(code)
  const recovery = record?.recovery_codes
  if (!normalized || !recovery?.salt || !Array.isArray(recovery.hashes)) {
    return { ok: false, hash: '' }
  }
  const hash = hashRecoveryCode(normalized, recovery.salt)
  const index = recovery.hashes.indexOf(hash)
  if (index === -1) return { ok: false, hash }
  recovery.hashes.splice(index, 1)
  recovery.used_at = new Date().toISOString()
  markRecoveryCodeConsumed(record, hash)
  record.updated_at = new Date().toISOString()
  return { ok: true, hash }
}

app.post('/api/mfa/setup/start', async (req, res) => {
  try {
    const account = String(req.body?.account || '').trim()
    const guardianAddress = String(req.body?.guardian_address || req.body?.guardianAddress || '').trim()
    if (!isValidMfaAccount(account)) return mfaError(res, 400, 'Invalid account')
    if (guardianAddress && !isValidMfaAccount(guardianAddress)) {
      return mfaError(res, 400, 'Invalid guardian address')
    }
    if (!rateLimitMfa(req, account)) return mfaError(res, 429, 'Too many MFA attempts')

    const approvalKey = await createMfaApprovalKey(account)
    const secret = generateBase32Secret()
    const setupID = crypto.randomBytes(24).toString('base64url')
    const expiresAt = Date.now() + MFA_PENDING_SETUP_TTL_MS
    const store = readMfaStore()
    cleanupPendingSetups(store)
    store.pending_setups[setupID] = {
      account,
      secret_enc: sealMfaValue(secret),
      private_key_enc: approvalKey.private_key_enc,
      approval_pub_key: approvalKey.approval_pub_key,
      approval_key_id: approvalKey.approval_key_id,
      guardian_address: guardianAddress,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }
    prunePendingSetupsForAccount(store, account)
    writeMfaStore(store)

    const issuer = 'Do-Wallet'
    const accountLabel = `${account.slice(0, 10)}...${account.slice(-6)}`
    const setupLabel = setupID.slice(-6)
    const label = encodeURIComponent(`${issuer}:${accountLabel}:${setupLabel}`)
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30',
    })
    res.json({
      account,
      setup_id: setupID,
      secret,
      approval_pub_key: store.pending_setups[setupID].approval_pub_key,
      guardian_address: guardianAddress,
      expires_at: expiresAt,
      issuer,
      otpauth_url: `otpauth://totp/${label}?${params.toString()}`,
    })
  } catch (err) {
    console.error('MFA setup start failed:', err)
    mfaError(res, 500, 'MFA setup start failed')
  }
})

app.post('/api/mfa/setup', async (req, res) => {
  try {
    const account = String(req.body?.account || '').trim()
    let setupID = String(req.body?.setup_id || req.body?.setupId || '').trim()
    const setupSecret = String(req.body?.setup_secret || req.body?.setupSecret || '').trim()
    const code = normalizeMfaCode(req.body?.code)
    const guardianAddress = String(req.body?.guardian_address || '').trim()

    if (!isValidMfaAccount(account)) return mfaError(res, 400, 'Invalid account')
    if (guardianAddress && !isValidMfaAccount(guardianAddress)) {
      return mfaError(res, 400, 'Invalid guardian address')
    }
    if (!rateLimitMfa(req, account)) return mfaError(res, 429, 'Too many MFA attempts')

    const store = readMfaStore()
    cleanupPendingSetups(store)
    const foundSetup = findPendingMfaSetup(store, account, setupID, setupSecret)
    setupID = foundSetup.setupID
    const pending = foundSetup.pending
    if (!pending) {
      writeMfaStore(store)
      return mfaError(res, 400, 'MFA setup was refreshed or expired. Press Start setup again and scan the new QR code.')
    }

    const secret = openMfaValue(pending.secret_enc)
    if (!verifyTotp(secret, code)) {
      return mfaError(res, 401, 'Incorrect authentication code')
    }

    const recovery = generateRecoveryCodes()
    const record = {
      account,
      secret_enc: pending.secret_enc,
      private_key_enc: pending.private_key_enc,
      approval_pub_key: pending.approval_pub_key,
      approval_key_id: pending.approval_key_id,
      guardian_address: guardianAddress || pending.guardian_address || '',
      recovery_codes: {
        salt: recovery.salt,
        hashes: recovery.hashes,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    store.accounts[account] = record
    delete store.pending_setups[setupID]
    writeMfaStore(store)

    res.json({
      account,
      approval_pub_key: record.approval_pub_key,
      guardian_address: record.guardian_address,
      recovery_codes: recovery.codes,
      issuer: 'Do-Wallet',
    })
  } catch (err) {
    console.error('MFA setup failed:', err)
    mfaError(res, 500, 'MFA setup failed')
  }
})

app.get('/api/mfa/status/:account', async (req, res) => {
  const account = String(req.params.account || '').trim()
  if (!isValidMfaAccount(account)) return mfaError(res, 400, 'Invalid account')
  const store = readMfaStore()
  const record = store.accounts[account]
  if (record && sealRecordSecrets(record)) writeMfaStore(store)
  let chainPolicyActive = false
  let chainPolicyChecked = false
  let chainPolicyError = ''
  try {
    const chainPolicy = await queryOnChainMfaPolicy(account)
    chainPolicyActive = !!chainPolicy.active
    chainPolicyChecked = true
  } catch (err) {
    chainPolicyError = err?.message || 'Unable to query on-chain MFA policy'
    console.error('MFA chain policy status failed:', chainPolicyError)
  }
  res.json({
    account,
    enrolled: !!record,
    chain_policy_active: chainPolicyActive,
    chain_policy_checked: chainPolicyChecked,
    chain_policy_error: chainPolicyError || undefined,
    approval_pub_key: record?.approval_pub_key,
    guardian_address: record?.guardian_address,
    recovery_codes_remaining: Array.isArray(record?.recovery_codes?.hashes)
      ? record.recovery_codes.hashes.length
      : 0,
  })
})

app.post('/api/mfa/approval', async (req, res) => {
  try {
    const account = String(req.body?.account || '').trim()
    if (!isValidMfaAccount(account)) return mfaError(res, 400, 'Invalid account')
    if (!rateLimitMfa(req, account)) return mfaError(res, 429, 'Too many MFA attempts')

    const store = readMfaStore()
    const record = store.accounts[account]
    if (!record) return mfaError(res, 404, 'MFA is not enrolled for this account')
    const recoveryCode = normalizeRecoveryCode(req.body?.recovery_code)
    const usedRecoveryCode = !!recoveryCode
    if (usedRecoveryCode) {
      if (!recoveryCodeMayApprove(req.body, account)) {
        return mfaError(res, 400, 'Recovery codes can only approve MFA recovery actions')
      }
      const consumed = consumeRecoveryCodeForRecord(record, recoveryCode)
      if (!consumed.ok) {
        return mfaError(res, 401, 'Incorrect recovery code')
      }
    } else if (!verifyTotp(getRecordSecret(record), req.body?.code)) {
      return mfaError(res, 401, 'Incorrect authentication code')
    }
    const migrated = sealRecordSecrets(record)

    const requestedChainID = String(req.body?.chain_id || DOCHAIN_CHAIN_ID)
    if (![DOCHAIN_CHAIN_ID, DOCHAIN_WALLET_CHAIN_ID].includes(requestedChainID)) {
      return mfaError(res, 400, 'Unsupported chain')
    }
    const chainID = DOCHAIN_CHAIN_ID
    const messagesHash =
      typeof req.body?.messages_hash === 'string' && /^[a-f0-9]{64}$/i.test(req.body.messages_hash)
        ? req.body.messages_hash.toLowerCase()
        : hashMessages(req.body?.messages)
    if (!/^[a-f0-9]{64}$/.test(messagesHash)) {
      return mfaError(res, 400, 'Invalid messages hash')
    }

    const expiresIn = Math.min(300, Math.max(30, Number(req.body?.expires_in || 120)))
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
    const timeoutHeight = Math.max(0, Number(req.body?.timeout_height || 0))
    const sequence =
      Number.isSafeInteger(Number(req.body?.sequence)) && Number(req.body.sequence) >= 0
        ? Number(req.body.sequence)
        : await getAccountSequence(account)
    const signers = Array.isArray(req.body?.signers) && req.body.signers.length
      ? req.body.signers.map((signer) => ({
          address: String(signer.address || account),
          sequence: Math.max(0, Number(signer.sequence || 0)),
        }))
      : [{ address: account, sequence }]

    const payload = {
      version: MFA_APPROVAL_VERSION,
      chain_id: chainID,
      account,
      expires_at: expiresAt,
      timeout_height: timeoutHeight,
      messages_hash: messagesHash,
      signers,
    }
    const signature = await signApprovalPayload(payload, record)
    const approval = { account, expires_at: expiresAt, signature }
    if (usedRecoveryCode || migrated) writeMfaStore(store)

    res.json({
      account,
      approval,
      approval_pub_key: record.approval_pub_key,
      recovery_code_used: usedRecoveryCode,
      recovery_codes_remaining: Array.isArray(record?.recovery_codes?.hashes)
        ? record.recovery_codes.hashes.length
        : 0,
      payload,
      memo: {
        dochain_mfa: {
          approvals: [approval],
        },
      },
    })
  } catch (err) {
    console.error('MFA approval failed:', err)
    mfaError(res, 500, 'MFA approval failed')
  }
})

app.post('/api/mfa/remove', (req, res) => {
  try {
    const account = String(req.body?.account || '').trim()
    if (!isValidMfaAccount(account)) return mfaError(res, 400, 'Invalid account')
    if (!rateLimitMfa(req, account)) return mfaError(res, 429, 'Too many MFA attempts')

    const store = readMfaStore()
    const record = store.accounts[account]
    if (!record) return res.json({ account, removed: false })
    const recoveryCode = normalizeRecoveryCode(req.body?.recovery_code)
    if (recoveryCode) {
      const consumed = consumeRecoveryCodeForRecord(record, recoveryCode)
      if (!consumed.ok && !recentlyConsumedRecoveryCode(record, recoveryCode)) {
        return mfaError(res, 401, 'Incorrect recovery code')
      }
    } else if (!verifyTotp(getRecordSecret(record), req.body?.code)) {
      return mfaError(res, 401, 'Incorrect authentication code')
    }

    delete store.accounts[account]
    writeMfaStore(store)
    res.json({ account, removed: true })
  } catch (err) {
    console.error('MFA remove failed:', err)
    mfaError(res, 500, 'MFA remove failed')
  }
})

app.post('/api/mfa/recovery-codes', (req, res) => {
  try {
    const account = String(req.body?.account || '').trim()
    if (!isValidMfaAccount(account)) return mfaError(res, 400, 'Invalid account')
    if (!rateLimitMfa(req, account)) return mfaError(res, 429, 'Too many MFA attempts')

    const store = readMfaStore()
    const record = store.accounts[account]
    if (!record) return mfaError(res, 404, 'MFA is not enrolled for this account')
    if (!verifyTotp(getRecordSecret(record), req.body?.code)) {
      return mfaError(res, 401, 'Incorrect authentication code')
    }

    const recovery = generateRecoveryCodes()
    record.recovery_codes = {
      salt: recovery.salt,
      hashes: recovery.hashes,
      created_at: new Date().toISOString(),
    }
    record.updated_at = new Date().toISOString()
    sealRecordSecrets(record)
    writeMfaStore(store)

    res.json({
      account,
      recovery_codes: recovery.codes,
      recovery_codes_remaining: recovery.codes.length,
    })
  } catch (err) {
    console.error('MFA recovery code regeneration failed:', err)
    mfaError(res, 500, 'MFA recovery code regeneration failed')
  }
})

app.use('/dochain-lcd', (req, res) =>
  proxyRequest(req, res, '/dochain-lcd', lcdCandidatesForChain(DOCHAIN_CHAIN_ID, {}, DOCHAIN_LCD), {
    chainID: DOCHAIN_CHAIN_ID,
  })
)

app.use('/dochain-rpc', (req, res) =>
  proxyRequest(req, res, '/dochain-rpc', DOCHAIN_RPC)
)

app.use('/secret-lcd', (req, res) =>
  proxyRequest(req, res, '/secret-lcd', lcdCandidatesForChain('secret-4', {}, SECRET_LCD))
)

app.use('/lcd/:chainID', async (req, res) => {
  try {
    const requestedChainID = String(req.params.chainID || '')
    const chainID = resolveLcdChainID(requestedChainID)
    if (!/^[a-zA-Z0-9._-]{2,64}$/.test(requestedChainID)) {
      res.status(400).json({ error: 'Invalid chainID' })
      return
    }

    const chainsPath = path.join(buildDir, 'chains.json')
    const chains = JSON.parse(await require('fs').promises.readFile(chainsPath, 'utf8'))
    const chainConfig =
      chains?.[chainID] ||
      chains?.mainnet?.[chainID] ||
      chains?.classic?.[chainID] ||
      chains?.testnet?.[chainID] ||
      {}
    let lcd = chainConfig.upstreamLcd || chainConfig.lcd
    if (chainID === DOCHAIN_CHAIN_ID || chainID === DOCHAIN_WALLET_CHAIN_ID || chainID === 'Do-Chain') {
      lcd = DOCHAIN_LCD
    } else if (chainID === 'secret-4') {
      lcd = SECRET_LCD
    }
    const lcdCandidates = lcdCandidatesForChain(chainID, chainConfig, lcd)
    if (!lcdCandidates.length) {
      res.status(404).json({ error: 'LCD endpoint not configured for chain' })
      return
    }

    proxyRequest(req, res, `/lcd/${requestedChainID}`, lcdCandidates, { chainID })
  } catch (err) {
    console.error('Generic LCD proxy failed:', err.message)
    res.status(502).json({ error: 'LCD proxy unavailable' })
  }
})

app.use('/api/lcd/:chainID', async (req, res) => {
  try {
    const requestedChainID = String(req.params.chainID || '')
    const chainID = resolveLcdChainID(requestedChainID)
    if (!/^[a-zA-Z0-9._-]{2,64}$/.test(requestedChainID)) {
      res.status(400).json({ error: 'Invalid chainID' })
      return
    }

    const chainsPath = path.join(buildDir, 'chains.json')
    const chains = JSON.parse(await require('fs').promises.readFile(chainsPath, 'utf8'))
    const chainConfig =
      chains?.[chainID] ||
      chains?.mainnet?.[chainID] ||
      chains?.classic?.[chainID] ||
      chains?.testnet?.[chainID] ||
      {}
    let lcd = chainConfig.upstreamLcd || chainConfig.lcd
    if (chainID === DOCHAIN_CHAIN_ID || chainID === DOCHAIN_WALLET_CHAIN_ID || chainID === 'Do-Chain') {
      lcd = DOCHAIN_LCD
    } else if (chainID === 'secret-4') {
      lcd = SECRET_LCD
    }
    const lcdCandidates = lcdCandidatesForChain(chainID, chainConfig, lcd)
    if (!lcdCandidates.length) {
      res.status(404).json({ error: 'LCD endpoint not configured for chain' })
      return
    }

    proxyRequest(req, res, `/api/lcd/${requestedChainID}`, lcdCandidates, { chainID })
  } catch (err) {
    console.error('Generic API LCD proxy failed:', err.message)
    res.status(502).json({ error: 'LCD proxy unavailable' })
  }
})


const priceFallbackCache = { at: 0, data: null }
const addPriceAlias = (out, keys, price, change = 0, source = 'fallback') => {
  const usd = Number(price)
  if (!Number.isFinite(usd) || usd <= 0) return
  const item = { price: usd, change: Number.isFinite(Number(change)) ? Number(change) : 0, source }
  keys.forEach((key) => {
    out[key] = item
    out[String(key).toLowerCase()] = item
  })
}
const fetchJson = (url, timeoutMs = 8000) => new Promise((resolve, reject) => {
  const mod = url.startsWith('https:') ? require('https') : require('http')
  const req = mod.get(url, { headers: { 'user-agent': 'do-wallet-price-hotfix/1.0' } }, (res) => {
    let body = ''
    res.setEncoding('utf8')
    res.on('data', (chunk) => { body += chunk })
    res.on('end', () => {
      try { resolve(JSON.parse(body)) } catch (err) { reject(err) }
    })
  })
  req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')))
  req.on('error', reject)
})
app.get('/api/prices', async (req, res) => {
  try {
    const now = Date.now()
    if (priceFallbackCache.data && now - priceFallbackCache.at < 60000) {
      res.json(priceFallbackCache.data)
      return
    }

    if (fetchPriceRecoveryMap) {
      try {
        const recovered = await fetchPriceRecoveryMap()
        priceFallbackCache.at = now
        priceFallbackCache.data = recovered
        res.json(recovered)
        return
      } catch (err) {
        console.warn('Price recovery map failed, using local fallback:', err.message)
      }
    }

    const out = {}
    addPriceAlias(out, ['udo', 'do', 'DO', 'dt', 'DT', 'Do-Chain', 'Do-Chain:udo'], 1.273e-9, -1.4001534713077377, 'coingecko')
    addPriceAlias(out, ['lunc', 'uluna', 'uluna:classic', 'uluna_classic', 'columbus-5', 'columbus-5:uluna'], 0.0000708, 0, 'fallback')
    addPriceAlias(out, ['dgn', 'udgn', 'dungeon', 'dungeon-1', 'dungeon-1:udgn'], 0.000282, 0, 'fallback')
    addPriceAlias(out, ['idtc', 'uidr', 'idtc*uluna', 'columbus-5:uidr', 'columbus-5:idtc'], 0.0000558, 0, 'fallback')
    addPriceAlias(out, ['krtc', 'ukrw', 'krtc*uluna', 'columbus-5:ukrw', 'columbus-5:krtc'], 0.000656, 0, 'fallback')
    try {
      const cg = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,secret,terra-luna-classic,terra-classic&vs_currencies=usd&include_24hr_change=true')
      const putCg = (id, keys) => {
        const row = cg && cg[id]
        if (row) addPriceAlias(out, keys, row.usd, row.usd_24h_change, 'coingecko')
      }
      putCg('bitcoin', ['btc', 'BTC', 'sat', 'sats', 'bitcoin-mainnet:sats', 'bitcoin-mainnet:btc'])
      putCg('ethereum', ['eth', 'ETH', 'wei', 'ethereum-mainnet:wei', 'optimism-mainnet:wei', 'base-mainnet:wei', 'arbitrum-one:wei'])
      putCg('secret', ['scrt', 'SCRT', 'uscrt', 'secret-4:uscrt'])
      putCg('terra-luna-classic', ['lunc', 'uluna:classic', 'uluna_classic', 'columbus-5:uluna'])
      putCg('terra-classic', ['lunc', 'uluna:classic', 'uluna_classic', 'columbus-5:uluna'])
    } catch (err) {
      console.warn('Price fallback CoinGecko fetch failed:', err.message)
    }
    priceFallbackCache.at = now
    priceFallbackCache.data = out
    res.json(out)
  } catch (err) {
    console.error('Price fallback failed:', err.message)
    res.status(502).json({ error: 'Price service unavailable' })
  }
})

const PORTFOLIO_SNAPSHOT_TTL_MS = boundedIntEnv('PORTFOLIO_SNAPSHOT_TTL_MS', 45000, 5000, 300000)
const PORTFOLIO_SNAPSHOT_STALE_MS = boundedIntEnv('PORTFOLIO_SNAPSHOT_STALE_MS', 10 * 60 * 1000, 30000, 60 * 60 * 1000)
const PORTFOLIO_SNAPSHOT_TIMEOUT_MS = boundedIntEnv('PORTFOLIO_SNAPSHOT_TIMEOUT_MS', 4500, 1500, 15000)
const PORTFOLIO_SNAPSHOT_CONCURRENCY = boundedIntEnv('PORTFOLIO_SNAPSHOT_CONCURRENCY', 12, 2, 24)
const PORTFOLIO_CW20_CONCURRENCY = boundedIntEnv('PORTFOLIO_CW20_CONCURRENCY', 4, 1, 8)
const PORTFOLIO_MAX_QUERY_PAIRS = boundedIntEnv('PORTFOLIO_MAX_QUERY_PAIRS', 240, 20, 500)
const PORTFOLIO_CW20_MAX_TOKENS = boundedIntEnv('PORTFOLIO_CW20_MAX_TOKENS', 12, 0, 80)
const portfolioSnapshotCache = new Map()
const portfolioSnapshotInflight = new Map()
const portfolioCatalogCache = { chains: null, denoms: null, cw20: null, at: 0 }
const PORTFOLIO_REMOVED_NETWORKS = new Set(['dochain-1', 'ares-1', 'pisco-1', 'localterra'])
const PORTFOLIO_CW20_CHAIN_ALLOWLIST = new Set(['columbus-5', 'phoenix-1', 'Do-Chain'])
const PORTFOLIO_CW20_CONTRACT_ALLOWLIST = new Set([
  'terra12ckccpalj2y9h54syyst4lpqp79duc9cpxfsyvne409rjw93s8qs2eneh3',
  'terra15p8su45k45axng8ue59rl6zph4at27s49u3agr6uqrx3dhcxpg3qt0ekdt',
])
const PORTFOLIO_CHAIN_ALIASES = {
  do: 'Do-Chain',
  dochain: 'Do-Chain',
  'do-main-1': 'Do-Chain',
  'dochain-1': 'Do-Chain',
  '888': 'Do-Chain',
  lunc: 'columbus-5',
  'terra-classic': 'columbus-5',
  classic: 'columbus-5',
  '330': 'columbus-5',
  luna: 'phoenix-1',
  terra: 'phoenix-1',
  eth: 'ethereum-mainnet',
  ethereum: 'ethereum-mainnet',
  'eip155:1': 'ethereum-mainnet',
  btc: 'bitcoin-mainnet',
  bitcoin: 'bitcoin-mainnet',
  sol: 'solana-mainnet',
  solana: 'solana-mainnet',
  secret: 'secret-4',
  scrt: 'secret-4',
  dungeon: 'dungeon-1',
  dgn: 'dungeon-1',
  decentr: 'mainnet-3',
  'decentr-mainnet-1': 'mainnet-3',
  ada: 'cardano-mainnet',
  cardano: 'cardano-mainnet',
  trx: 'tron-mainnet',
  tron: 'tron-mainnet',
  xrp: 'xrp-ledger-mainnet',
}
const PORTFOLIO_TERRA_CLASSIC_NATIVE_DENOMS = {
  uaud: { symbol: 'AUT', name: 'Terra Classic AUD' },
  ucad: { symbol: 'CAT', name: 'Terra Classic CAD' },
  uchf: { symbol: 'CHT', name: 'Terra Classic CHF' },
  ucny: { symbol: 'CNT', name: 'Terra Classic CNY' },
  udkk: { symbol: 'DKT', name: 'Terra Classic DKK' },
  ueur: { symbol: 'EUT', name: 'Terra Classic EUR' },
  ugbp: { symbol: 'GBT', name: 'Terra Classic GBP' },
  uhkd: { symbol: 'HKT', name: 'Terra Classic HKD' },
  uidr: { symbol: 'IDT', name: 'Terra Classic IDR' },
  uinr: { symbol: 'INT', name: 'Terra Classic INR' },
  ujpy: { symbol: 'JPT', name: 'Terra Classic JPY' },
  ukrw: { symbol: 'KRT', name: 'Terra Classic KRW' },
  uluna: { symbol: 'LUNC', name: 'Terra Classic (LUNC)' },
  umnt: { symbol: 'MNT', name: 'Terra Classic MNT' },
  umyr: { symbol: 'MYT', name: 'Terra Classic MYR' },
  unok: { symbol: 'NOT', name: 'Terra Classic NOK' },
  uphp: { symbol: 'PHT', name: 'Terra Classic PHP' },
  usdr: { symbol: 'SDT', name: 'Terra Classic SDR' },
  usek: { symbol: 'SET', name: 'Terra Classic SEK' },
  usgd: { symbol: 'SGT', name: 'Terra Classic SGD' },
  uthb: { symbol: 'THT', name: 'Terra Classic THB' },
  uusd: { symbol: 'UST', name: 'Terra Classic USD' },
}

const portfolioClean = (value) => String(value || '').trim()
const portfolioLower = (value) => portfolioClean(value).toLowerCase()
const portfolioReadJsonFile = (filePath, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

const portfolioLoadSourceChains = () => {
  const chainsDir = path.join(__dirname, 'chains', 'mainnet')
  const catalog = {}
  try {
    fs.readdirSync(chainsDir)
      .filter((file) => /\.js$/i.test(file) && !/\.disabled$/i.test(file))
      .forEach((file) => {
        const fullPath = path.join(chainsDir, file)
        try {
          delete require.cache[require.resolve(fullPath)]
          const chain = require(fullPath)
          const id = portfolioClean(chain?.chainID || chain?.chainId)
          if (!id || PORTFOLIO_REMOVED_NETWORKS.has(id) || chain?.networkType === 'testnet') return
          catalog[id] = { ...chain, chainID: id, networkType: chain.networkType || 'mainnet' }
        } catch (err) {
          console.warn(`Portfolio source chain load failed for ${file}:`, err.message)
        }
      })
  } catch (err) {
    console.warn('Portfolio source chain catalog unavailable:', err.message)
  }
  return catalog
}

const portfolioFlattenChains = (catalog) => {
  const out = {}
  const add = (chainID, chain, group) => {
    if (!chain || typeof chain !== 'object') return
    const id = portfolioClean(chain.chainID || chain.chainId || chainID)
    if (!id || PORTFOLIO_REMOVED_NETWORKS.has(id) || group === 'testnet') return
    out[id] = { ...chain, chainID: id, networkType: chain.networkType || (group === 'testnet' ? 'testnet' : 'mainnet') }
  }
  if (Array.isArray(catalog)) {
    catalog.forEach((chain) => add(chain?.chainID || chain?.chainId, chain))
  } else if (catalog && typeof catalog === 'object') {
    for (const group of ['mainnet', 'classic']) {
      const bucket = catalog[group]
      if (!bucket || typeof bucket !== 'object') continue
      Object.keys(bucket).forEach((chainID) => add(chainID, bucket[chainID], group))
    }
    if (!Object.keys(out).length) {
      Object.keys(catalog).forEach((chainID) => add(chainID, catalog[chainID]))
    }
  }
  return out
}

const portfolioFlattenDenoms = (catalog) => {
  const out = {}
  const add = (key, denom, group) => {
    if (!denom || typeof denom !== 'object') return
    const rawKey = portfolioClean(key)
    const keyParts = rawKey.includes(':') ? rawKey.split(':') : []
    const chainID = portfolioClean(denom.chainID || denom.chainId || (keyParts.length ? keyParts[0] : ''))
    const token = portfolioClean(denom.token || denom.denom || denom.contract || denom.address || (keyParts.length ? keyParts.slice(1).join(':') : rawKey))
    if (!token || group === 'testnet') return
    const fullKey = chainID ? `${chainID}:${token}` : token
    const normalized = {
      ...denom,
      chainID: chainID || denom.chainID,
      token,
      denom: portfolioClean(denom.denom || token),
    }
    out[fullKey] = normalized
    out[fullKey.toLowerCase()] = normalized
    if (!chainID) {
      out[token] = normalized
      out[token.toLowerCase()] = normalized
    }
  }
  if (Array.isArray(catalog)) {
    catalog.forEach((denom, index) => add(denom?.key || denom?.id || index, denom))
  } else if (catalog && typeof catalog === 'object') {
    let nested = false
    for (const group of ['mainnet', 'classic']) {
      const bucket = catalog[group]
      if (!bucket || typeof bucket !== 'object') continue
      nested = true
      Object.keys(bucket).forEach((key) => add(key, bucket[key], group))
    }
    if (!nested) Object.keys(catalog).forEach((key) => add(key, catalog[key]))
  }
  return out
}

const portfolioLoadCatalogs = () => {
  const now = Date.now()
  if (portfolioCatalogCache.chains && now - portfolioCatalogCache.at < 60000) return portfolioCatalogCache

  const buildChains = portfolioFlattenChains(portfolioReadJsonFile(path.join(buildDir, 'chains.json'), null))
  const liveChains = portfolioFlattenChains(portfolioReadJsonFile(path.join(__dirname, 'chains.live.json'), null))
  const localChains = portfolioFlattenChains(portfolioReadJsonFile(path.join(__dirname, 'chains.json'), null))
  const sourceChains = portfolioLoadSourceChains()
  const chains = Object.assign(
    {},
    Object.keys(buildChains).length ? buildChains : {},
    Object.keys(liveChains).length ? liveChains : {},
    localChains,
    sourceChains
  )
  const buildDenoms = portfolioFlattenDenoms(portfolioReadJsonFile(path.join(buildDir, 'denoms.json'), {}))
  const localDenoms = portfolioFlattenDenoms(portfolioReadJsonFile(path.join(__dirname, 'denoms.json'), {}))
  const denoms = Object.assign({}, buildDenoms, localDenoms)
  const cw20 = Object.assign(
    {},
    portfolioReadJsonFile(path.join(__dirname, 'api', 'cw20', 'cw20Tokens.json'), {}),
    portfolioReadJsonFile(path.join(buildDir, 'cw20', 'tokens.json'), {})
  )

  portfolioCatalogCache.chains = chains || {}
  portfolioCatalogCache.denoms = denoms || {}
  portfolioCatalogCache.cw20 = cw20 || {}
  portfolioCatalogCache.at = now
  return portfolioCatalogCache
}

const portfolioCanonicalChainID = (chainID, chains) => {
  const raw = portfolioClean(chainID)
  if (!raw) return ''
  if (chains[raw]) return raw
  const lower = raw.toLowerCase()
  const alias = PORTFOLIO_CHAIN_ALIASES[lower]
  if (alias && chains[alias]) return alias
  const match = Object.keys(chains).find((id) => id.toLowerCase() === lower)
  return match || alias || raw
}

const portfolioPublicAddress = (value) => {
  const text = portfolioClean(value)
  if (!text || text.length > 140) return ''
  if (
    isEthereumAddress(text) ||
    isBitcoinAddress(text) ||
    isSolanaAddress(text) ||
    isCardanoAddress(text) ||
    isXrpAddress(text) ||
    isTronAddress(text)
  ) return text
  if (/^[a-z][a-z0-9]{1,19}1[ac-hj-np-z02-9]{20,110}$/i.test(text)) return text
  return ''
}

const portfolioSensitiveKey = (key) =>
  /(seed|mnemonic|phrase|private|password|cipher|encrypted|secret|recovery|entropy)/i.test(String(key || ''))

const portfolioAddPair = (pairs, seen, chains, chainID, address, source) => {
  const id = portfolioCanonicalChainID(chainID, chains)
  const chain = chains[id]
  let cleanAddress = portfolioPublicAddress(address)
  if (isDoChainLcdChainID(id)) {
    cleanAddress = recodeDoChainBech32Address(cleanAddress)
  }
  if (!id || !chain || chain.networkType === 'testnet' || !cleanAddress) return
  const key = `${id}:${cleanAddress.toLowerCase()}`
  if (seen.has(key) || pairs.length >= PORTFOLIO_MAX_QUERY_PAIRS) return
  seen.add(key)
  pairs.push({ chainID: id, chain, address: cleanAddress, source: source || 'wallet' })
}

const portfolioCollectFromWalletObject = (pairs, seen, chains, wallet, source) => {
  if (!wallet || typeof wallet !== 'object') return
  const addKnownAddress = (chainID, value, fallbackSource) => {
    if (typeof value === 'string') {
      portfolioAddPair(pairs, seen, chains, chainID, value, fallbackSource || source)
    } else if (value && typeof value === 'object') {
      portfolioAddPair(
        pairs,
        seen,
        chains,
        value.chainID || value.chainId || value.network || value.chain || chainID,
        value.address || value.walletAddress || value.value,
        fallbackSource || value.source || source,
      )
    }
  }
  const maps = [wallet.addressMap, wallet.addresses, wallet.networks, wallet.addressesByChain]
  maps.forEach((map) => {
    if (!map || typeof map !== 'object') return
    Object.keys(map).forEach((key) => {
      const canonicalKey = portfolioCanonicalChainID(key, chains)
      if (portfolioSensitiveKey(key) && !chains[canonicalKey]) return
      const value = map[key]
      if (Array.isArray(value)) {
        value.forEach((entry) => addKnownAddress(canonicalKey || key, entry, source))
      } else {
        addKnownAddress(canonicalKey || key, value, source)
      }
    })
  })
  ;[wallet.allAddresses, wallet.activeAddresses, wallet.publicAddresses].forEach((list, listIndex) => {
    if (!Array.isArray(list)) return
    list.forEach((entry) => {
      if (typeof entry === 'string') portfolioAddPair(pairs, seen, chains, '', entry, `${source}-address-${listIndex}`)
      else addKnownAddress('', entry, entry?.source || `${source}-address-${listIndex}`)
    })
  })
  Object.keys(wallet).forEach((key) => {
    const guessed = portfolioCanonicalChainID(key, chains)
    if (portfolioSensitiveKey(key) && !chains[guessed]) return
    const value = wallet[key]
    if (typeof value === 'string') {
      if (chains[guessed] || key.toLowerCase().includes('address')) {
        portfolioAddPair(pairs, seen, chains, guessed || key, value, source)
      }
    }
  })
}

const portfolioDoAddressFromCandidate = (address) => {
  const raw = portfolioPublicAddress(address)
  if (!raw) return ''
  const recoded = recodeDoChainBech32Address(raw)
  return /^do1[ac-hj-np-z02-9]{20,110}$/i.test(recoded) ? recoded : ''
}

const portfolioBech32AddressWithPrefix = (address, prefix) => {
  const raw = portfolioPublicAddress(address)
  if (!raw || !cosmjsFromBech32 || !cosmjsToBech32) return ''
  try {
    const decoded = cosmjsFromBech32(raw)
    if (!decoded?.data) return ''
    return cosmjsToBech32(prefix, decoded.data)
  } catch {
    return ''
  }
}

const portfolioCollectDoChainAliasPairs = (pairs, seen, chains) => {
  const candidates = pairs
    .map((pair) => pair?.address)
    .filter(Boolean)
  candidates.forEach((address) => {
    if (chains?.['Do-Chain']) {
      const doAddress = portfolioDoAddressFromCandidate(address)
      if (doAddress) portfolioAddPair(pairs, seen, chains, 'Do-Chain', doAddress, 'do-chain-address-alias')
    }
    const terraAddress = portfolioBech32AddressWithPrefix(address, 'terra')
    if (/^terra1[ac-hj-np-z02-9]{20,110}$/i.test(terraAddress)) {
      portfolioAddPair(pairs, seen, chains, 'columbus-5', terraAddress, 'terra-classic-address-alias')
      portfolioAddPair(pairs, seen, chains, 'phoenix-1', terraAddress, 'terra-address-alias')
    }
  })
}

const portfolioCollectPairs = (body, chains) => {
  const pairs = []
  const seen = new Set()
  portfolioCollectFromWalletObject(pairs, seen, chains, { addressMap: body?.addressMap }, 'active-address-map')
  portfolioCollectFromWalletObject(pairs, seen, chains, { addressesByChain: body?.addressesByChain, allAddresses: body?.allAddresses }, 'active-address-list')
  portfolioCollectFromWalletObject(pairs, seen, chains, body?.wallet, 'active-wallet')
  ;(Array.isArray(body?.wallets) ? body.wallets : []).forEach((wallet, index) => {
    portfolioCollectFromWalletObject(pairs, seen, chains, wallet, `wallet-${index}`)
  })
  portfolioCollectDoChainAliasPairs(pairs, seen, chains)
  return pairs
}

const portfolioAtomicInteger = (amount) => {
  const raw = String(amount ?? '0').trim()
  if (!raw) return '0'
  const normalized = raw.includes('.') ? raw.split('.')[0] : raw
  if (!/^-?\d+$/.test(normalized)) return '0'
  return normalized
}

const portfolioPositiveAtomic = (amount) => {
  try {
    return BigInt(portfolioAtomicInteger(amount)) > 0n
  } catch {
    return false
  }
}

const portfolioDecimalValue = (amount, decimals = 6) => {
  let atomic
  try {
    atomic = BigInt(portfolioAtomicInteger(amount))
  } catch {
    return 0
  }
  const divisor = 10 ** Math.min(Math.max(Number(decimals) || 0, 0), 18)
  return Number(atomic) / divisor
}

const portfolioDecimalToAtomic = (amount, decimals = 6) => {
  const decimalPlaces = Math.min(Math.max(Number(decimals) || 0, 0), 18)
  const raw = String(amount ?? '0').trim()
  if (!raw) return '0'
  const negative = raw.startsWith('-')
  const normalized = negative ? raw.slice(1) : raw
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return '0'
  const [whole, fraction = ''] = normalized.split('.')
  const paddedFraction = (fraction + '0'.repeat(decimalPlaces)).slice(0, decimalPlaces)
  let atomic = 0n
  try {
    atomic = BigInt(whole || '0') * (10n ** BigInt(decimalPlaces)) + BigInt(paddedFraction || '0')
  } catch {
    return '0'
  }
  return `${negative ? '-' : ''}${atomic.toString()}`
}

const portfolioPriceFromMap = (prices, chainID, denom, symbol) => {
  const keys = [
    `${chainID}:${denom}`,
    `${chainID}:${symbol}`,
    denom,
    symbol,
    String(denom || '').toLowerCase(),
    String(symbol || '').toLowerCase(),
  ].filter(Boolean)
  for (const key of keys) {
    const row = prices?.[key]
    const price = Number(row?.price ?? row?.usd ?? row)
    if (Number.isFinite(price) && price > 0) return price
  }
  return 0
}

const portfolioDenomMeta = (chainID, chain, denom, denoms, fallback = {}) => {
  const terraClassicNative = chainID === 'columbus-5'
    ? PORTFOLIO_TERRA_CLASSIC_NATIVE_DENOMS[portfolioLower(denom)]
    : null
  const keys = [
    `${chainID}:${denom}`,
    `${chainID}:${String(denom || '').toLowerCase()}`,
    String(`${chainID}:${denom}`).toLowerCase(),
    denom,
    String(denom || '').toLowerCase(),
  ]
  let meta = terraClassicNative
    ? { ...terraClassicNative, decimals: 6, token: denom, denom, icon: chain?.icon }
    : null
  if (!meta) {
    for (const key of keys) {
      if (denoms?.[key]) {
        meta = denoms[key]
        break
      }
    }
  }
  if (!meta && /^ibc\//i.test(String(denom || ''))) {
    const shortIbc = String(denom).replace(/^ibc\//i, '').slice(0, 8).toUpperCase()
    meta = { symbol: shortIbc ? `${shortIbc}...` : 'IBC', name: 'IBC token', decimals: 6, token: denom, denom, icon: chain?.icon }
  }
  const symbol = portfolioClean(fallback.symbol || meta?.symbol || meta?.display || meta?.name || chain?.symbol || chain?.baseAsset || denom)
  const decimals = Number(fallback.decimals ?? meta?.decimals ?? meta?.exponent ?? chain?.decimals ?? 6)
  return {
    chainID,
    denom,
    token: fallback.token || meta?.token || meta?.contract || denom,
    symbol,
    name: portfolioClean(fallback.name || meta?.name || symbol),
    icon: fallback.icon || meta?.icon || chain?.icon || '/station-assets/img/chains/DoChain.png',
    decimals: Number.isFinite(decimals) ? decimals : 6,
  }
}

const portfolioBuildAsset = ({ chainID, chain, address, denom, amount, denoms, prices, category, extra = {} }) => {
  const meta = portfolioDenomMeta(chainID, chain, denom, denoms, extra)
  const rawAmount = portfolioAtomicInteger(amount)
  const amountValue = portfolioDecimalValue(amount, meta.decimals)
  const price = Number(extra.priceUsd || portfolioPriceFromMap(prices, chainID, denom, meta.symbol))
  const value = Number.isFinite(price) && price > 0 ? amountValue * price : 0
  return {
    id: `${chainID}:${address}:${denom}:${category || 'spendable'}`,
    chainID,
    chainName: chain?.name || chainID,
    address,
    walletAddress: address,
    denom,
    token: meta.token,
    amount: amountValue,
    quantity: amountValue,
    amountValue,
    balance: amountValue,
    rawAmount,
    symbol: meta.symbol,
    name: meta.name,
    icon: meta.icon,
    decimals: meta.decimals,
    price,
    value,
    valueUsd: value,
    usd: value,
    category: category || 'spendable',
    source: extra.source || 'do-wallet-backend-snapshot',
    validators: extra.validators,
    validatorCount: extra.validatorCount,
  }
}

const portfolioAggregateCoins = ({ coins, chainID, chain, address, denoms, prices, category, validators }) => {
  const totals = new Map()
  ;(Array.isArray(coins) ? coins : []).forEach((coin) => {
    const denom = portfolioClean(coin?.denom || coin?.token)
    if (!denom) return
    let amount
    try {
      amount = BigInt(portfolioAtomicInteger(coin?.amount))
    } catch {
      amount = 0n
    }
    if (amount <= 0n) return
    totals.set(denom, (totals.get(denom) || 0n) + amount)
  })
  return Array.from(totals.entries()).map(([denom, amount]) =>
    portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom,
      amount: amount.toString(),
      denoms,
      prices,
      category,
      extra: { validators, validatorCount: validators?.length || 0 },
    })
  )
}

const portfolioValidatorAddress = (row) => portfolioClean(
  row?.validatorAddress ||
  row?.validator_address ||
  row?.operatorAddress ||
  row?.operator_address ||
  row?.validator ||
  row?.delegation?.validator_address
)

const portfolioValidatorScopedAsset = ({ chainID, chain, address, coin, validator, denoms, prices, category }) => {
  const denom = portfolioClean(coin?.denom || coin?.token)
  if (!denom || !validator || !portfolioPositiveAtomic(coin?.amount)) return null
  const asset = portfolioBuildAsset({
    chainID,
    chain,
    address,
    denom,
    amount: coin.amount,
    denoms,
    prices,
    category,
  })
  asset.id = `${chainID}:${address}:${denom}:${category}:${String(validator).toLowerCase()}`
  asset.key = asset.id
  asset.parentAssetKey = `${chainID}:${address}:${denom}:${category}`
  asset.validatorAddress = validator
  asset.validator_address = validator
  asset.operatorAddress = validator
  asset.operator_address = validator
  asset.scope = 'validator'
  return asset
}

const portfolioValidatorRowsForDenom = (rows, denom) => {
  const target = portfolioLower(denom)
  return (Array.isArray(rows) ? rows : []).filter((row) => portfolioLower(row?.denom) === target)
}

const portfolioValidatorRowsByAddress = (rows) => {
  const out = {}
  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const validator = portfolioValidatorAddress(row)
    const key = portfolioLower(validator)
    if (!key) return
    if (!out[key]) {
      out[key] = {
        validatorAddress: validator,
        validator_address: validator,
        operatorAddress: validator,
        operator_address: validator,
        chainID: row.chainID,
        chainName: row.chainName,
        walletAddress: row.walletAddress || row.address,
        denom: row.denom,
        symbol: row.symbol,
        amount: 0,
        quantity: 0,
        valueUsd: 0,
        value: 0,
        rows: [],
      }
    }
    out[key].amount += Number(row.amount || row.quantity || row.balance || 0) || 0
    out[key].quantity = out[key].amount
    out[key].balance = String(out[key].amount)
    out[key].valueUsd += Number(row.valueUsd || row.value || 0) || 0
    out[key].value = out[key].valueUsd
    out[key].rows.push(row)
  })
  return out
}

const portfolioUniqueAssets = (assets) => {
  const out = []
  const seen = new Set()
  ;(Array.isArray(assets) ? assets : []).forEach((asset) => {
    if (!asset || !portfolioPositiveAtomic(asset.rawAmount || asset.amount)) return
    const key = [
      asset.category || 'spendable',
      asset.chainID || '',
      String(asset.walletAddress || asset.address || '').toLowerCase(),
      String(asset.token || asset.denom || '').toLowerCase(),
    ].join(':')
    if (seen.has(key)) return
    seen.add(key)
    out.push(asset)
  })
  return out
}

const portfolioLcdJson = async (chainID, chain, requestPath, timeoutMs = PORTFOLIO_SNAPSHOT_TIMEOUT_MS) => {
  const candidates = lcdCandidatesForChain(chainID, chain, chain?.upstreamLcd || chain?.lcd || chain?.api)
  if (!candidates.length) throw new Error(`No LCD configured for ${chainID}`)
  const normalizedRequestPath = normalizeDoChainLcdPath(requestPath, chainID)
  let lastError = null
  for (const base of candidates) {
    const url = `${String(base).replace(/\/+$/, '')}${
      normalizedRequestPath.startsWith('/') ? normalizedRequestPath : `/${normalizedRequestPath}`
    }`
    try {
      const { status, headers, data } = await axios.get(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'do-wallet-portfolio-snapshot/1.0' },
        timeout: timeoutMs,
        validateStatus: () => true,
      })
      const contentType = headers?.['content-type'] || ''
      const empty = doWalletEmptyLcdPayload(normalizedRequestPath)
      if (status >= 200 && status < 300) {
        if (data && typeof data === 'object') return data
        if (typeof data === 'string' || Buffer.isBuffer(data)) {
          if (String(contentType || '').toLowerCase().includes('json')) {
            try {
              return JSON.parse(Buffer.from(data).toString('utf8'))
            } catch {}
          }
        }
        return data ?? empty
      }
      if (empty && (status === 404 || status === 501)) return empty
      if (!shouldTryNextProxy(status)) {
        throw new Error(`LCD ${chainID} ${status}`)
      }
      lastError = new Error(`LCD ${chainID} ${status}`)
    } catch (err) {
      lastError = err
    }
  }
  const empty = doWalletEmptyLcdPayload(normalizedRequestPath)
  if (empty) return empty
  throw lastError || new Error(`LCD unavailable for ${chainID}`)
}

const portfolioFetchCw20Assets = async ({ chainID, chain, address, denoms, prices, cw20 }) => {
  if (!PORTFOLIO_CW20_MAX_TOKENS || !PORTFOLIO_CW20_CHAIN_ALLOWLIST.has(chainID)) return []
  const tokens = []
  const addToken = (token) => {
    if (!token || typeof token !== 'object') return
    const tokenChain = portfolioCanonicalChainID(token.chainID || token.chainId || token.network || chainID, { [chainID]: chain })
    const contract = portfolioClean(token.contract || token.token || token.denom || token.address)
    if (tokenChain !== chainID || !contract || !/^[a-z][a-z0-9]{1,19}1[ac-hj-np-z02-9]{38,110}$/i.test(contract)) return
    if (!token.verified && !token.alwaysShow && !PORTFOLIO_CW20_CONTRACT_ALLOWLIST.has(contract)) return
    tokens.push(token)
  }
  if (Array.isArray(cw20)) cw20.forEach(addToken)
  else if (cw20 && typeof cw20 === 'object') {
    Object.keys(cw20).forEach((key) => {
      const value = cw20[key]
      if (Array.isArray(value)) value.forEach((token) => addToken({ ...token, chainID: token.chainID || key }))
      else addToken({ ...value, chainID: value?.chainID || key })
    })
  }
  const limited = tokens.slice(0, PORTFOLIO_CW20_MAX_TOKENS)
  const rows = await mapWithConcurrency(limited, PORTFOLIO_CW20_CONCURRENCY, async (token) => {
    try {
      const contract = portfolioClean(token.contract || token.token || token.denom || token.address)
      const query = Buffer.from(JSON.stringify({ balance: { address } })).toString('base64')
      const json = await portfolioLcdJson(chainID, chain, `/cosmwasm/wasm/v1/contract/${contract}/smart/${query}`, 2500)
      const amount = json?.data?.balance || json?.balance || json?.data?.amount || '0'
      if (!portfolioPositiveAtomic(amount)) return null
      return portfolioBuildAsset({
        chainID,
        chain,
        address,
        denom: contract,
        amount,
        denoms,
        prices,
        category: 'wallet',
        extra: {
          token: contract,
          symbol: token.symbol,
          name: token.name || token.symbol,
          decimals: token.decimals,
          icon: token.icon || token.logoURI,
          source: 'cw20-known-token',
        },
      })
    } catch {
      return null
    }
  })
  return rows.filter(Boolean)
}

const portfolioModuleDisabled = (chain, moduleName) => {
  const target = String(moduleName || '').toLowerCase()
  return (Array.isArray(chain?.disabledModules) ? chain.disabledModules : [])
    .some((module) => String(module || '').toLowerCase() === target)
}

const portfolioOptionalQuery = async (label, work) => {
  try {
    return { data: await work(), error: null }
  } catch (err) {
    return { data: null, error: `${label}: ${String(err?.message || err).slice(0, 160)}` }
  }
}

const portfolioFetchCosmosPair = async ({ chainID, chain, address }, denoms, prices, cw20) => {
  const base = encodeURIComponent(address)
  const stakingDisabled = portfolioModuleDisabled(chain, 'staking')
  const [bankResult, delegationResult, rewardResult, unbondingResult, cw20Result] = await Promise.all([
    portfolioOptionalQuery('bank balances', () => portfolioLcdJson(chainID, chain, `/cosmos/bank/v1beta1/balances/${base}`)),
    stakingDisabled
      ? Promise.resolve({ data: null, error: null })
      : portfolioOptionalQuery('staking delegations', () =>
          portfolioLcdJson(chainID, chain, `/cosmos/staking/v1beta1/delegations/${base}?pagination.limit=2000`, 3000)
        ),
    stakingDisabled
      ? Promise.resolve({ data: null, error: null })
      : portfolioOptionalQuery('staking rewards', () =>
          portfolioLcdJson(chainID, chain, `/cosmos/distribution/v1beta1/delegators/${base}/rewards`, 3000)
        ),
    stakingDisabled
      ? Promise.resolve({ data: null, error: null })
      : portfolioOptionalQuery('unbonding delegations', () =>
          portfolioLcdJson(chainID, chain, `/cosmos/staking/v1beta1/delegators/${base}/unbonding_delegations?pagination.limit=2000`, 3000)
        ),
    portfolioOptionalQuery('cw20 tokens', () => portfolioFetchCw20Assets({ chainID, chain, address, denoms, prices, cw20 })),
  ])

  const errors = [bankResult, delegationResult, rewardResult, unbondingResult, cw20Result]
    .filter((result) => result?.error)
    .map((result) => ({ chainID, address, message: result.error }))

  const bank = bankResult.data || {}
  const delegations = delegationResult.data || {}
  const rewards = rewardResult.data || {}
  const unbonding = unbondingResult.data || {}
  const cw20Assets = Array.isArray(cw20Result.data) ? cw20Result.data : []

  const balanceCoins = Array.isArray(bank?.balances) ? bank.balances : []
  const assets = portfolioAggregateCoins({
    coins: balanceCoins,
    chainID,
    chain,
    address,
    denoms,
    prices,
    category: 'wallet',
  }).concat(cw20Assets)

  const delegationRows = Array.isArray(delegations?.delegation_responses) ? delegations.delegation_responses : []
  const validators = Array.from(new Set(delegationRows.map((row) => row?.delegation?.validator_address).filter(Boolean)))
  const stakingCoins = delegationRows.map((row) => row?.balance).filter(Boolean)
  const validatorDelegations = delegationRows
    .map((row) => portfolioValidatorScopedAsset({
      chainID,
      chain,
      address,
      coin: row?.balance,
      validator: portfolioValidatorAddress(row),
      denoms,
      prices,
      category: 'staking',
    }))
    .filter(Boolean)
  const validatorRewards = []
  ;(Array.isArray(rewards?.rewards) ? rewards.rewards : []).forEach((row) => {
    const validator = portfolioValidatorAddress(row)
    ;(Array.isArray(row?.reward) ? row.reward : []).forEach((coin) => {
      const rewardRow = portfolioValidatorScopedAsset({
        chainID,
        chain,
        address,
        coin,
        validator,
        denoms,
        prices,
        category: 'reward',
      })
      if (rewardRow) validatorRewards.push(rewardRow)
    })
  })
  const rewardCoins = Array.isArray(rewards?.total) ? rewards.total : []
  const unbondingCoins = []
  const validatorUnbondings = []
  ;(Array.isArray(unbonding?.unbonding_responses) ? unbonding.unbonding_responses : []).forEach((row) => {
    const validator = portfolioValidatorAddress(row)
    ;(Array.isArray(row?.entries) ? row.entries : []).forEach((entry) => {
      if (entry?.balance) {
        const coin = { denom: chain.baseAsset || chain.denom || 'udo', amount: entry.balance }
        unbondingCoins.push(coin)
        const unbondingRow = portfolioValidatorScopedAsset({
          chainID,
          chain,
          address,
          coin,
          validator,
          denoms,
          prices,
          category: 'unbonding',
        })
        if (unbondingRow) validatorUnbondings.push(unbondingRow)
      }
    })
  })

  const staking = []
    .concat(portfolioAggregateCoins({ coins: stakingCoins, chainID, chain, address, denoms, prices, category: 'staking', validators }))
    .concat(portfolioAggregateCoins({ coins: rewardCoins, chainID, chain, address, denoms, prices, category: 'reward', validators }))
    .concat(portfolioAggregateCoins({ coins: unbondingCoins, chainID, chain, address, denoms, prices, category: 'unbonding', validators }))
    .map((asset) => {
      const delegations = portfolioValidatorRowsForDenom(validatorDelegations, asset.denom)
      const rewardsByValidator = portfolioValidatorRowsForDenom(validatorRewards, asset.denom)
      const unbondings = portfolioValidatorRowsForDenom(validatorUnbondings, asset.denom)
      return {
        ...asset,
        validatorDelegations: delegations,
        validatorDelegationsByAddress: portfolioValidatorRowsByAddress(delegations),
        validatorRewards: rewardsByValidator,
        validatorRewardsByAddress: portfolioValidatorRowsByAddress(rewardsByValidator),
        validatorUnbondings: unbondings,
        validatorUnbondingsByAddress: portfolioValidatorRowsByAddress(unbondings),
        validatorBreakdown: {
          delegations,
          delegationsByAddress: portfolioValidatorRowsByAddress(delegations),
          rewards: rewardsByValidator,
          rewardsByAddress: portfolioValidatorRowsByAddress(rewardsByValidator),
          unbondings,
          unbondingsByAddress: portfolioValidatorRowsByAddress(unbondings),
        },
      }
    })

  return { assets, staking, errors }
}

const portfolioChainSupportsCosmos = (chainID, chain, address) =>
  Boolean(chain?.lcd || chain?.api || chain?.upstreamLcd) &&
  !isEthereumAddress(address) &&
  !isBitcoinAddress(address) &&
  !(chainID === 'solana-mainnet') &&
  /^[a-z][a-z0-9]{1,19}1/i.test(address)

const portfolioFetchEvmPair = async ({ chainID, chain, address }, denoms, prices) => {
  const assets = []
  const native = await fetchEvmNativeBalance({ chainID, address }).catch(() => null)
  if (native && portfolioPositiveAtomic(native.amount)) {
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: native.denom,
      amount: native.amount,
      denoms,
      prices,
      category: 'wallet',
      extra: native,
    }))
  }
  const indexed = await fetchIndexedEvmTokens({ chainID, address }).catch(() => [])
  indexed.forEach((token) => {
    if (!portfolioPositiveAtomic(token.amount)) return
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: token.contract || token.token || token.denom,
      amount: token.amount,
      denoms,
      prices,
      category: 'wallet',
      extra: token,
    }))
  })
  return { assets: portfolioUniqueAssets(assets), staking: [], errors: [] }
}

const portfolioFetchSolanaPair = async ({ chainID, chain, address }, denoms, prices) => {
  const assets = []
  const balance = await postSolanaRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'getBalance',
    params: [address],
  }).catch(() => ({ result: { value: 0 } }))
  const lamports = String(balance?.result?.value || '0')
  if (portfolioPositiveAtomic(lamports)) {
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: 'lamports',
      amount: lamports,
      denoms,
      prices,
      category: 'wallet',
      extra: { symbol: 'SOL', name: 'Solana', decimals: 9, icon: '/img/chains/Solana.svg' },
    }))
  }
  const tokens = await fetchSolanaOwnedTokens(address).catch(() => [])
  tokens.forEach((token) => {
    if (!portfolioPositiveAtomic(token.amount)) return
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: token.mint || token.token || token.denom,
      amount: token.amount,
      denoms,
      prices,
      category: 'wallet',
      extra: token,
    }))
  })
  return { assets: portfolioUniqueAssets(assets), staking: [], errors: [] }
}

const portfolioFetchBitcoinPair = async ({ chainID, chain, address }, denoms, prices) => {
  const { data } = await axios.get(`https://blockstream.info/api/address/${address}`, { timeout: 6000 })
  const funded = Number(data?.chain_stats?.funded_txo_sum || 0) + Number(data?.mempool_stats?.funded_txo_sum || 0)
  const spent = Number(data?.chain_stats?.spent_txo_sum || 0) + Number(data?.mempool_stats?.spent_txo_sum || 0)
  const amount = Math.max(0, funded - spent).toString()
  const assets = portfolioPositiveAtomic(amount)
    ? [portfolioBuildAsset({
        chainID,
        chain,
        address,
        denom: 'sats',
        amount,
        denoms,
        prices,
        category: 'wallet',
        extra: { symbol: 'BTC', name: 'Bitcoin', decimals: 8, icon: '/img/chains/Bitcoin.svg' },
      })]
    : []
  return { assets, staking: [], errors: [] }
}

const portfolioFetchCardanoPair = async ({ chainID, chain, address }, denoms, prices) => {
  if (!isCardanoAddress(address)) return { assets: [], staking: [], errors: [] }
  const { data } = await axios.post(
    `${CARDANO_API}/address_info`,
    { _addresses: [address] },
    {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: PORTFOLIO_SNAPSHOT_TIMEOUT_MS,
    }
  )
  const entry = Array.isArray(data) ? data[0] : data
  const assets = []
  const lovelace = entry?.balance ?? entry?.lovelace ?? entry?.total_balance ?? entry?.value ?? '0'
  if (portfolioPositiveAtomic(lovelace)) {
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: 'lovelace',
      amount: lovelace,
      denoms,
      prices,
      category: 'wallet',
      extra: { symbol: 'ADA', name: 'Cardano', decimals: 6, icon: '/img/chains/Cardano.svg' },
    }))
  }

  const tokenRows = Array.isArray(entry?.asset_list)
    ? entry.asset_list
    : Array.isArray(entry?.assets)
      ? entry.assets
      : Array.isArray(entry?.tokens)
        ? entry.tokens
        : []

  tokenRows.forEach((token) => {
    const policy = portfolioClean(token?.policy_id || token?.policyId || token?.policy)
    const assetName = portfolioClean(token?.asset_name || token?.assetName || token?.name || token?.fingerprint)
    const denom = portfolioClean(token?.fingerprint || [policy, assetName].filter(Boolean).join('') || token?.asset || token?.unit)
    const amount = portfolioAtomicInteger(token?.quantity || token?.amount || token?.balance || '0')
    if (!denom || !portfolioPositiveAtomic(amount)) return
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom,
      amount,
      denoms,
      prices,
      category: 'wallet',
      extra: {
        token: denom,
        symbol: portfolioClean(token?.ticker || token?.symbol || assetName || shortTokenId(denom).toUpperCase()),
        name: portfolioClean(token?.display_name || token?.name || assetName || `Cardano token ${shortTokenId(denom)}`),
        decimals: Number(token?.decimals ?? token?.decimal_places ?? 0),
        icon: token?.logo || token?.image || '/img/chains/Cardano.svg',
        source: 'cardano-address-info',
      },
    }))
  })

  return { assets: portfolioUniqueAssets(assets), staking: [], errors: [] }
}

const portfolioFetchTronPair = async ({ chainID, chain, address }, denoms, prices) => {
  if (!isTronAddress(address)) return { assets: [], staking: [], errors: [] }
  const { data } = await axios.get(`${TRON_API}/v1/accounts/${address}`, {
    params: { only_confirmed: true },
    headers: { Accept: 'application/json' },
    timeout: PORTFOLIO_SNAPSHOT_TIMEOUT_MS,
  })
  const account = Array.isArray(data?.data) ? data.data[0] : undefined
  const assets = []
  const staking = []
  const nativeAmount = String(account?.balance ?? 0)
  if (portfolioPositiveAtomic(nativeAmount)) {
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: 'sun',
      amount: nativeAmount,
      denoms,
      prices,
      category: 'wallet',
      extra: { symbol: 'TRX', name: 'Tron', decimals: 6, icon: '/img/chains/Tron.svg' },
    }))
  }

  const frozenRows = []
  if (Array.isArray(account?.frozenV2)) frozenRows.push(...account.frozenV2)
  if (Array.isArray(account?.frozen)) frozenRows.push(...account.frozen)
  const frozenTotal = frozenRows.reduce((sum, row) => {
    try {
      return sum + BigInt(portfolioAtomicInteger(row?.amount || row?.frozen_balance || row?.balance || 0))
    } catch {
      return sum
    }
  }, 0n)
  if (frozenTotal > 0n) {
    staking.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: 'sun',
      amount: frozenTotal.toString(),
      denoms,
      prices,
      category: 'staking',
      extra: { symbol: 'TRX', name: 'Staked TRX', decimals: 6, icon: '/img/chains/Tron.svg', source: 'tron-frozen-balance' },
    }))
  }

  const trc20Rows = []
  ;(Array.isArray(account?.trc20) ? account.trc20 : []).forEach((row) => {
    if (!row || typeof row !== 'object') return
    Object.keys(row).forEach((contract) => {
      const amount = portfolioAtomicInteger(row[contract])
      if (isTronAddress(contract) && portfolioPositiveAtomic(amount)) trc20Rows.push({ contract, amount })
    })
  })

  const tokenAssets = await mapWithConcurrency(trc20Rows.slice(0, 40), 4, async ({ contract, amount }) => {
    const tokenInfo = await fetchTronTokenInfo('tron-mainnet', contract).catch(() => ({
      token: contract,
      symbol: shortTokenId(contract).toUpperCase(),
      name: `TRC-20 token ${shortTokenId(contract)}`,
      decimals: 6,
      icon: '/img/chains/Tron.svg',
    }))
    return portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: contract,
      amount,
      denoms,
      prices,
      category: 'wallet',
      extra: tokenInfo,
    })
  })

  return { assets: portfolioUniqueAssets(assets.concat(tokenAssets.filter(Boolean))), staking, errors: [] }
}

const portfolioFetchXrpPair = async ({ chainID, chain, address }, denoms, prices) => {
  if (!isXrpAddress(address)) return { assets: [], staking: [], errors: [] }
  const assets = []
  const accountInfo = await postJsonRpc(XRP_RPC, {
    method: 'account_info',
    params: [{ account: address, ledger_index: 'validated', api_version: 1 }],
  })
  const accountData = accountInfo?.result?.account_data
  const drops = accountInfo?.result?.error === 'actNotFound' ? '0' : String(accountData?.Balance || '0')
  if (portfolioPositiveAtomic(drops)) {
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom: 'drops',
      amount: drops,
      denoms,
      prices,
      category: 'wallet',
      extra: { symbol: 'XRP', name: 'XRP Ledger', decimals: 6, icon: '/img/chains/XRP.svg' },
    }))
  }

  const lines = await postJsonRpc(XRP_RPC, {
    method: 'account_lines',
    params: [{ account: address, ledger_index: 'validated', limit: 400 }],
  }).catch(() => null)

  ;(Array.isArray(lines?.result?.lines) ? lines.result.lines : []).forEach((line) => {
    const amount = portfolioDecimalToAtomic(line?.balance, 6)
    if (!portfolioPositiveAtomic(amount)) return
    const currency = portfolioClean(line?.currency || 'IOU')
    const issuer = portfolioClean(line?.account || line?.issuer)
    const denom = `${currency}:${issuer}`
    assets.push(portfolioBuildAsset({
      chainID,
      chain,
      address,
      denom,
      amount,
      denoms,
      prices,
      category: 'wallet',
      extra: {
        token: denom,
        symbol: currency.length > 12 ? `${currency.slice(0, 8)}...` : currency,
        name: `${currency} on XRP Ledger`,
        decimals: 6,
        icon: '/img/chains/XRP.svg',
        source: 'xrp-account-lines',
      },
    }))
  })

  return { assets: portfolioUniqueAssets(assets), staking: [], errors: [] }
}

const portfolioFetchPair = async (pair, denoms, prices, cw20) => {
  try {
    if (pair.chainID === 'cardano-mainnet' || isCardanoAddress(pair.address)) return await portfolioFetchCardanoPair(pair, denoms, prices)
    if (pair.chainID === 'tron-mainnet' || isTronAddress(pair.address)) return await portfolioFetchTronPair(pair, denoms, prices)
    if (pair.chainID === 'xrp-ledger-mainnet' || isXrpAddress(pair.address)) return await portfolioFetchXrpPair(pair, denoms, prices)
    if (isEthereumAddress(pair.address)) return await portfolioFetchEvmPair(pair, denoms, prices)
    if (pair.chainID === 'solana-mainnet' || (isSolanaAddress(pair.address) && /solana/i.test(pair.chain?.name || pair.chainID))) {
      return await portfolioFetchSolanaPair(pair, denoms, prices)
    }
    if (pair.chainID === 'bitcoin-mainnet' || isBitcoinAddress(pair.address)) return await portfolioFetchBitcoinPair(pair, denoms, prices)
    if (portfolioChainSupportsCosmos(pair.chainID, pair.chain, pair.address)) return await portfolioFetchCosmosPair(pair, denoms, prices, cw20)
    return { assets: [], staking: [], errors: [] }
  } catch (err) {
    return {
      assets: [],
      staking: [],
      errors: [{ chainID: pair.chainID, address: pair.address, message: String(err?.message || err).slice(0, 180) }],
    }
  }
}

const portfolioBuildSnapshot = async (body, pairs) => {
  const { chains, denoms, cw20 } = portfolioLoadCatalogs()
  const prices = await cacheJson('portfolio:prices', 60000, async () => {
    const out = {}
    addPriceAlias(out, ['udo', 'do', 'DO', 'Do-Chain:udo'], 1.273e-9, -1.4, 'fallback')
    addPriceAlias(out, ['uluna', 'lunc', 'columbus-5:uluna'], 0.0000708, 0, 'fallback')
    addPriceAlias(out, ['udgn', 'dgn', 'dungeon-1:udgn'], 0.000282, 0, 'fallback')
    addPriceAlias(out, ['uidr', 'idtc', 'IDT', 'columbus-5:uidr', 'columbus-5:idtc'], 0.0000558, 0, 'fallback')
    addPriceAlias(out, ['ukrw', 'krtc', 'KRT', 'columbus-5:ukrw', 'columbus-5:krtc'], 0.000656, 0, 'fallback')
    addPriceAlias(out, ['ujpy', 'jptc', 'JPT', 'columbus-5:ujpy', 'columbus-5:jptc'], 0.0062, 0, 'fallback')
    addPriceAlias(out, ['umyr', 'mytc', 'MYT', 'columbus-5:umyr', 'columbus-5:mytc'], 0.24, 0, 'fallback')
    addPriceAlias(out, ['uthb', 'thtc', 'THT', 'columbus-5:uthb', 'columbus-5:thtc'], 0.03, 0, 'fallback')
    addPriceAlias(out, ['uusd', 'ustc', 'UST', 'USTC', 'columbus-5:uusd', 'columbus-5:ustc'], 0.006, 0, 'fallback')
    if (priceFallbackCache.data && Date.now() - priceFallbackCache.at < 60000) {
      return Object.assign(out, priceFallbackCache.data)
    }
    if (typeof fetchPriceRecoveryMap === 'function') {
      try {
        const recovered = await fetchPriceRecoveryMap()
        if (recovered && typeof recovered === 'object') {
          priceFallbackCache.at = Date.now()
          priceFallbackCache.data = recovered
          return Object.assign(out, recovered)
        }
      } catch (err) {
        console.warn('Portfolio price recovery failed, using fallback map:', err.message)
      }
    }
    return Object.assign(out, priceFallbackCache.data || {})
  }).catch(() => priceFallbackCache.data || {})

  const startedAt = Date.now()
  const results = await mapWithConcurrency(pairs, PORTFOLIO_SNAPSHOT_CONCURRENCY, (pair) =>
    portfolioFetchPair(pair, denoms, prices, cw20)
  )
  const assets = portfolioUniqueAssets(results.flatMap((result) => result?.assets || []))
  const staking = portfolioUniqueAssets(results.flatMap((result) => result?.staking || []))
  const errors = results.flatMap((result) => result?.errors || [])
  const totalValue = assets.reduce((sum, asset) => sum + Number(asset.value || 0), 0) + staking.reduce((sum, asset) => sum + Number(asset.value || 0), 0)
  const totalStakedValue = staking.filter((asset) => asset.category === 'staking').reduce((sum, asset) => sum + Number(asset.value || 0), 0)
  const totalRewardsValue = staking.filter((asset) => asset.category === 'reward').reduce((sum, asset) => sum + Number(asset.value || 0), 0)
  const totalUnbondingValue = staking.filter((asset) => asset.category === 'unbonding').reduce((sum, asset) => sum + Number(asset.value || 0), 0)
  const addresses = {}
  pairs.forEach((pair) => {
    if (!addresses[pair.chainID]) addresses[pair.chainID] = pair.address
  })
  return {
    ok: true,
    snapshot: {
      source: 'do-wallet-backend-snapshot',
      updatedAt: Date.now(),
      wallet: body?.wallet && typeof body.wallet === 'object' ? {
        name: portfolioClean(body.wallet.name || body.wallet.walletName || body.wallet.label || body.wallet.id || 'Website wallet'),
        address: portfolioPublicAddress(body.wallet.address),
      } : null,
      addresses,
      activeAddresses: addresses,
      allAddresses: pairs.map((pair) => ({ chainID: pair.chainID, address: pair.address, source: pair.source })),
      totalValue,
      totalStakedValue,
      totalRewardsValue,
      totalUnbondingValue,
      assets,
      spendableAssets: assets,
      staking,
      portfolioAssets: assets.concat(staking),
      errors,
    },
    stats: {
      pairs: pairs.length,
      assets: assets.length,
      staking: staking.length,
      errors: errors.length,
      durationMs: Date.now() - startedAt,
      chains: Object.keys(chains).length,
    },
  }
}

app.post('/api/portfolio/snapshot', async (req, res) => {
  try {
    const { chains } = portfolioLoadCatalogs()
    const pairs = portfolioCollectPairs(req.body || {}, chains)
    const cacheKey = crypto
      .createHash('sha256')
      .update(JSON.stringify(pairs.map((pair) => [pair.chainID, pair.address]).sort()))
      .digest('hex')
    const now = Date.now()
    const cached = portfolioSnapshotCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      res.json({ ...cached.value, cached: true })
      return
    }
    if (cached && cached.staleUntil > now) {
      if (!portfolioSnapshotInflight.has(cacheKey)) {
        portfolioSnapshotInflight.set(cacheKey, portfolioBuildSnapshot(req.body || {}, pairs)
          .then((value) => {
            portfolioSnapshotCache.set(cacheKey, {
              value,
              expiresAt: Date.now() + PORTFOLIO_SNAPSHOT_TTL_MS,
              staleUntil: Date.now() + PORTFOLIO_SNAPSHOT_STALE_MS,
            })
            return value
          })
          .finally(() => portfolioSnapshotInflight.delete(cacheKey)))
      }
      res.json({ ...cached.value, cached: true, stale: true, refreshing: true })
      return
    }
    if (!pairs.length) {
      res.json({
        ok: true,
        snapshot: {
          source: 'do-wallet-backend-snapshot',
          updatedAt: Date.now(),
          addresses: {},
          activeAddresses: {},
          allAddresses: [],
          totalValue: 0,
          totalStakedValue: 0,
          totalRewardsValue: 0,
          totalUnbondingValue: 0,
          assets: [],
          spendableAssets: [],
          staking: [],
          portfolioAssets: [],
          errors: [],
        },
        stats: { pairs: 0, assets: 0, staking: 0, errors: 0, durationMs: 0, chains: Object.keys(chains).length },
      })
      return
    }
    let work = portfolioSnapshotInflight.get(cacheKey)
    if (!work) {
      work = portfolioBuildSnapshot(req.body || {}, pairs)
        .then((value) => {
          portfolioSnapshotCache.set(cacheKey, {
            value,
            expiresAt: Date.now() + PORTFOLIO_SNAPSHOT_TTL_MS,
            staleUntil: Date.now() + PORTFOLIO_SNAPSHOT_STALE_MS,
          })
          return value
        })
        .finally(() => portfolioSnapshotInflight.delete(cacheKey))
      portfolioSnapshotInflight.set(cacheKey, work)
    }
    res.json(await work)
  } catch (err) {
    console.error('Portfolio snapshot failed:', err.message)
    res.status(502).json({ ok: false, error: 'Portfolio snapshot unavailable' })
  }
})

app.get('/ibc_tokens.json', (_req, res) => {
  res.sendFile(path.join(buildDir, 'ibc_tokens.json'))
})

app.use(express.static(buildDir))

if (priceRecoveryHandler) {
  app.get('/api/prices', priceRecoveryHandler)
}

if (fiatRecoveryHandler) {
  app.get('/api/fiat', fiatRecoveryHandler)
}

if (volumeRoutes) {
  app.use(volumeRoutes)
}

if (walletRoutes) {
  app.use(walletRoutes)
}

if (blockSpeedRoutes) {
  app.use(blockSpeedRoutes)
}

if (communityPoolRoutes) {
  app.use(communityPoolRoutes)
}

if (oraclePoolRoutes) {
  app.use(oraclePoolRoutes)
}

if (cw20Routes) {
  app.use(cw20Routes)
}

if (secretRoutes) {
  app.use(secretRoutes)
}

/* =========================
   BTC API PROXY ROUTES
   ========================= */

app.get('/api/address/:address', async (req, res) => {
  try {
    const { address } = req.params
    if (!isBitcoinAddress(address)) {
      return res.status(400).json({ error: 'Invalid Bitcoin address' })
    }

    const response = await axios.get(
      `https://blockstream.info/api/address/${address}`
    )

    res.json(response.data)
  } catch (err) {
    const { address } = req.params
    console.error('BTC address fetch failed:', err.message)
    res.json({
      address,
      chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0 },
      mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 },
    })
  }
})

app.get('/api/address/:address/utxo', async (req, res) => {
  try {
    const { address } = req.params
    if (!isBitcoinAddress(address)) {
      return res.status(400).json({ error: 'Invalid Bitcoin address' })
    }

    const response = await axios.get(
      `https://blockstream.info/api/address/${address}/utxo`
    )

    res.json(response.data)
  } catch (err) {
    console.error('BTC utxo fetch failed:', err.message)
    res.json([])
  }
})

app.get('/api/address/:address/txs', async (req, res) => {
  try {
    const { address } = req.params
    if (!isBitcoinAddress(address)) {
      return res.status(400).json({ error: 'Invalid Bitcoin address' })
    }

    const response = await axios.get(
      `https://blockstream.info/api/address/${address}/txs`
    )

    res.json(response.data)
  } catch (err) {
    console.error('BTC tx fetch failed:', err.message)
    res.json([])
  }
})

app.get('/api/address/:address/txs/chain/:lastSeenTxid', async (req, res) => {
  try {
    const { address, lastSeenTxid } = req.params
    if (!isBitcoinAddress(address) || !isBitcoinTxId(lastSeenTxid)) {
      return res.status(400).json({ error: 'Invalid Bitcoin request' })
    }

    const response = await axios.get(
      `https://blockstream.info/api/address/${address}/txs/chain/${lastSeenTxid}`
    )

    res.json(response.data)
  } catch (err) {
    console.error('BTC paged tx fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch paged BTC transactions' })
  }
})

app.get('/api/tx/:txid', async (req, res) => {
  try {
    const { txid } = req.params
    if (!isBitcoinTxId(txid)) {
      return res.status(400).json({ error: 'Invalid Bitcoin txid' })
    }

    const response = await axios.get(`https://blockstream.info/api/tx/${txid}`)

    res.json(response.data)
  } catch (err) {
    console.error('BTC tx detail fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch BTC transaction' })
  }
})

app.get('/api/tx/:txid/status', async (req, res) => {
  try {
    const { txid } = req.params
    if (!isBitcoinTxId(txid)) {
      return res.status(400).json({ error: 'Invalid Bitcoin txid' })
    }

    const response = await axios.get(
      `https://blockstream.info/api/tx/${txid}/status`
    )

    res.json(response.data)
  } catch (err) {
    console.error('BTC tx status fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch BTC transaction status' })
  }
})

app.get('/api/tx/:txid/hex', async (req, res) => {
  try {
    const { txid } = req.params
    if (!isBitcoinTxId(txid)) {
      return res.status(400).json({ error: 'Invalid Bitcoin txid' })
    }

    const response = await axios.get(
      `https://blockstream.info/api/tx/${txid}/hex`
    )

    res.send(response.data)
  } catch (err) {
    console.error('BTC tx hex fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch BTC transaction hex' })
  }
})

app.get('/api/fees/recommended', async (req, res) => {
  try {
    const response = await axios.get(
      'https://mempool.space/api/v1/fees/recommended'
    )

    res.json(response.data)
  } catch (err) {
    console.error('BTC fee fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch BTC fees' })
  }
})

app.post('/api/tx', async (req, res) => {
  try {
    const { rawTx } = req.body

    if (
      typeof rawTx !== 'string' ||
      !/^[a-fA-F0-9]+$/.test(rawTx) ||
      rawTx.length > 400000
    ) {
      return res.status(400).json({ error: 'Invalid raw Bitcoin transaction' })
    }

    const response = await axios.post(
      'https://blockstream.info/api/tx',
      rawTx,
      {
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    )

    res.json({ txid: response.data })
  } catch (err) {
    console.error('BTC broadcast failed:', err.response?.data || err.message)
    res.status(500).json({
      error: 'Failed to broadcast BTC transaction',
      details: err.response?.data || err.message,
    })
  }
})

/* =========================
   ETH / SOL API PROXY ROUTES
   ========================= */

app.get('/api/evm/:chainID/address/:address', async (req, res) => {
  try {
    const { chainID, address } = req.params
    const balance = await fetchEvmNativeBalance({ chainID, address })
    res.json(balance)
  } catch (err) {
    const status = err.statusCode || 500
    console.error('EVM balance fetch failed:', err.message)
    if (status >= 500) {
      const { chainID, address } = req.params
      return res.json(zeroEvmNativeBalance(chainID, address))
    }
    res.status(status).json({ error: err.message || 'Failed to fetch balance' })
  }
})

app.get('/api/evm/:chainID/address/:address/tokens', async (req, res) => {
  try {
    const { chainID, address } = req.params
    const tokens = await fetchIndexedEvmTokens({ chainID, address })
    res.json(tokens)
  } catch (err) {
    const status = err.statusCode || 500
    console.error('EVM indexed token fetch failed:', err.message)
    if (status >= 500) return res.json([])
    res
      .status(status)
      .json({ error: err.message || 'Failed to fetch EVM token balances' })
  }
})

app.get(
  '/api/evm/:chainID/address/:address/token/:contract',
  async (req, res) => {
    try {
      const { chainID, address, contract } = req.params
      const normalizedChainID = assertEvmChainID(chainID)

      if (isNativeEvmTokenID(contract)) {
        const balance = await fetchEvmNativeBalance({
          chainID: normalizedChainID,
          address,
        })
        return res.json(balance)
      }

      if (!isEthereumAddress(address) || !isEthereumAddress(contract)) {
        return res.status(400).json({ error: 'Invalid EVM token request' })
      }

      const [amount, tokenInfo] = await Promise.all([
        fetchEvmTokenBalance({
          chainID: normalizedChainID,
          address,
          contract,
        }),
        cacheJson(
          `evm:token:${normalizedChainID}:${contract.toLowerCase()}`,
          10 * 60 * 1000,
          () => fetchEvmTokenInfo(normalizedChainID, contract)
        ),
      ])

      res.json({
        address,
        chainID: normalizedChainID,
        denom: contract,
        token: contract,
        amount,
        symbol: tokenInfo?.symbol,
        name: tokenInfo?.name,
        icon: tokenInfo?.icon,
        decimals: tokenInfo?.decimals,
      })
    } catch (err) {
      const status = err.statusCode || 500
      console.error('EVM token balance fetch failed:', err.message)
      if (status >= 500) {
        const { chainID, address, contract } = req.params
        return res.json({
          address,
          chainID: normalizeEvmChainID(chainID),
          denom: contract,
          token: contract,
          amount: '0',
          symbol: shortTokenId(contract).toUpperCase(),
          name: `EVM token ${shortTokenId(contract)}`,
          decimals: 18,
        })
      }
      res
        .status(status)
        .json({ error: err.message || 'Failed to fetch EVM token balance' })
    }
  }
)

app.get('/api/eth/address/:address', async (req, res) => {
  try {
    const { address } = req.params

    const balance = await fetchEvmNativeBalance({
      chainID: 'ethereum-mainnet',
      address,
    })

    res.json(balance)
  } catch (err) {
    const status = err.statusCode || 500
    console.error('ETH balance fetch failed:', err.message)
    if (status >= 500) {
      const { address } = req.params
      return res.json(zeroEvmNativeBalance('ethereum-mainnet', address))
    }
    res
      .status(status)
      .json({ error: err.message || 'Failed to fetch ETH balance' })
  }
})

app.post('/api/eth/rpc', async (req, res) => {
  try {
    const data = await postJsonRpc(ETHEREUM_RPC, req.body)
    res.json(data)
  } catch (err) {
    console.error('ETH RPC proxy failed:', err.message)
    res.status(502).json({ error: 'Ethereum RPC unavailable' })
  }
})

app.get('/api/solana/address/:address', async (req, res) => {
  try {
    const { address } = req.params

    if (!isSolanaAddress(address)) {
      return res.status(400).json({ error: 'Invalid Solana address' })
    }

    const data = await postSolanaRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address],
    })

    res.json({
      address,
      chainID: 'solana-mainnet',
      denom: 'lamports',
      amount: String(data?.result?.value ?? 0),
      symbol: 'SOL',
      decimals: 9,
    })
  } catch (err) {
    const { address } = req.params
    console.error('SOL balance fetch failed:', err.message)
    res.json({
      address,
      chainID: 'solana-mainnet',
      denom: 'lamports',
      amount: '0',
      symbol: 'SOL',
      decimals: 9,
    })
  }
})

app.get('/api/solana/address/:address/tokens', async (req, res) => {
  try {
    const { address } = req.params
    const tokens = await fetchSolanaOwnedTokens(address)
    res.json(tokens)
  } catch (err) {
    const status = err.statusCode || 500
    console.error('SOL owned token fetch failed:', err.message)
    if (status >= 500) return res.json([])
    res
      .status(status)
      .json({ error: err.message || 'Failed to fetch Solana token balances' })
  }
})

app.get('/api/solana/address/:address/token/:mint', async (req, res) => {
  try {
    const { address, mint } = req.params

    if (String(mint || '').trim().toLowerCase() === 'sol' || String(mint || '').trim().toLowerCase() === 'lamports') {
      if (!isSolanaAddress(address)) {
        return res.status(400).json({ error: 'Invalid Solana address' })
      }

      const data = await postSolanaRpc({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      })

      return res.json({
        address,
        chainID: 'solana-mainnet',
        denom: 'lamports',
        amount: String(data?.result?.value ?? 0),
        symbol: 'SOL',
        decimals: 9,
      })
    }

    if (!isSolanaAddress(address) || !isSolanaAddress(mint)) {
      return res.status(400).json({ error: 'Invalid Solana token request' })
    }

    const [amount, tokenInfo] = await Promise.all([
      fetchSolanaTokenBalance({ address, mint }),
      cacheJson(`solana:token:${mint}`, 10 * 60 * 1000, () =>
        fetchSolanaTokenInfo(mint)
      ).catch(() => null),
    ])

    res.json({
      address,
      chainID: 'solana-mainnet',
      denom: mint,
      amount,
      symbol: tokenInfo?.symbol,
      name: tokenInfo?.name,
      icon: tokenInfo?.icon,
      decimals: tokenInfo?.decimals,
    })
  } catch (err) {
    const { address, mint } = req.params
    console.error('SOL token balance fetch failed:', err.message)
    res.json({
      address,
      chainID: 'solana-mainnet',
      denom: mint,
      amount: '0',
      symbol: shortTokenId(mint).toUpperCase(),
      name: `Solana token ${shortTokenId(mint)}`,
      decimals: 0,
    })
  }
})

app.post('/api/solana/rpc', async (req, res) => {
  try {
    const data = await postSolanaRpc(req.body)
    res.json(data)
  } catch (err) {
    console.error('SOL RPC proxy failed:', err.message)
    res.status(502).json({ error: 'Solana RPC unavailable' })
  }
})

app.get('/api/tron/address/:address', async (req, res) => {
  try {
    const { address } = req.params
    const balance = await fetchTronNativeBalance({ address })
    res.json(balance)
  } catch (err) {
    const status = err.statusCode || 500
    console.error('TRX balance fetch failed:', err.message)
    if (status >= 500) {
      const { address } = req.params
      return res.json({
        address,
        chainID: 'tron-mainnet',
        denom: 'sun',
        amount: '0',
        symbol: 'TRX',
        name: 'Tron',
        decimals: 6,
      })
    }
    res
      .status(status)
      .json({ error: err.message || 'Failed to fetch TRX balance' })
  }
})

app.get('/api/tron/address/:address/token/:contract', async (req, res) => {
  try {
    const { address, contract } = req.params

    if (!isTronAddress(address) || !isTronAddress(contract)) {
      return res.status(400).json({ error: 'Invalid TRC-20 token request' })
    }

    const [amount, tokenInfo] = await Promise.all([
      fetchTronTokenBalance({ address, contract }),
      cacheJson(`tron:token:${contract}`, 10 * 60 * 1000, () =>
        fetchTronTokenInfo('tron-mainnet', contract)
      ),
    ])

    res.json({
      address,
      chainID: 'tron-mainnet',
      denom: contract,
      token: contract,
      amount,
      symbol: tokenInfo?.symbol,
      name: tokenInfo?.name,
      icon: tokenInfo?.icon,
      decimals: tokenInfo?.decimals,
    })
  } catch (err) {
    const status = err.statusCode || 500
    console.error('TRC-20 token balance fetch failed:', err.message)
    if (status >= 500) {
      const { address, contract } = req.params
      return res.json({
        address,
        chainID: 'tron-mainnet',
        denom: contract,
        token: contract,
        amount: '0',
        symbol: shortTokenId(contract).toUpperCase(),
        name: `TRC-20 token ${shortTokenId(contract)}`,
        decimals: 6,
      })
    }
    res
      .status(status)
      .json({ error: err.message || 'Failed to fetch TRC-20 token balance' })
  }
})

app.get('/api/noncosmos/token', async (req, res) => {
  const chainID = String(req.query.chainID ?? '').trim()
  const query = String(req.query.query ?? '').trim()

  try {
    if (chainID === 'bitcoin-mainnet') {
      return res.json(buildBitcoinTokenInfo(query))
    }

    if (chainID === 'solana-mainnet') {
      const token = await cacheJson(
        `solana:token-search:${query.toLowerCase()}`,
        5 * 60 * 1000,
        () => fetchSolanaTokenInfo(query)
      )

      return res.json(token)
    }

    if (chainID === 'tron-mainnet') {
      const token = await cacheJson(`tron:token:${query}`, 10 * 60 * 1000, () =>
        fetchTronTokenInfo(chainID, query)
      )

      return res.json(token)
    }

    if (getEvmRpc(chainID)) {
      const token = await cacheJson(
        `evm:token:${chainID}:${query.toLowerCase()}`,
        10 * 60 * 1000,
        () => fetchEvmTokenInfo(chainID, query)
      )

      return res.json(token)
    }

    res.status(400).json({ error: 'Unsupported token lookup network' })
  } catch (err) {
    const status = err.statusCode || 502
    console.error('External token lookup failed:', err.message)
    res.status(status).json({ error: err.message || 'Token lookup failed' })
  }
})

/* =========================
   CARDANO / XRP API PROXY ROUTES
   ========================= */

app.get('/api/bnb/validators', async (_req, res) => {
  try {
    const validators = await cacheJson(
      'bnb:validators',
      5 * 60 * 1000,
      fetchBnbValidators
    )

    res.json({
      chainID: 'bnb-smart-chain-mainnet',
      validators,
      notes: [
        'StakeHub validator data is read-only in Do-Wallet until EVM staking transaction signing is wired.',
      ],
    })
  } catch (err) {
    console.error('BNB validators fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch BNB validators' })
  }
})

app.get('/api/solana/validators', async (_req, res) => {
  try {
    const validators = await cacheJson(
      'solana:validators',
      2 * 60 * 1000,
      fetchSolanaValidators
    )

    res.json({
      chainID: 'solana-mainnet',
      validators,
      notes: [
        'Solana validator data is read-only in Do-Wallet until stake-account transaction signing is wired.',
      ],
    })
  } catch (err) {
    console.error('Solana validators fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch Solana validators' })
  }
})

app.get('/api/cardano/validators', async (_req, res) => {
  try {
    const validators = await cacheJson(
      'cardano:validators',
      10 * 60 * 1000,
      async () => {
        const pools = await fetchCardanoPools()

        return pools.map((pool) =>
          toCosmosValidator({
            operatorAddress: pool.pool_id_bech32,
            moniker: pool.ticker || pool.pool_group || pool.pool_id_bech32,
            details: [
              pool.pool_group ? `Group: ${pool.pool_group}` : '',
              pool.pledge ? `Pledge: ${pool.pledge} lovelace` : '',
              Array.isArray(pool.owners)
                ? `${pool.owners.length} owner${pool.owners.length === 1 ? '' : 's'}`
                : '',
            ]
              .filter(Boolean)
              .join(' - '),
            website: pool.meta_url,
            tokens: pool.active_stake,
            commissionRate: pool.margin,
            external: {
              chainType: 'cardano',
              pool_id_hex: pool.pool_id_hex,
              active_epoch_no: pool.active_epoch_no,
              fixed_cost: pool.fixed_cost,
              pledge: pool.pledge,
              reward_addr: pool.reward_addr,
              owners: pool.owners,
              relays: pool.relays,
              ticker: pool.ticker,
              pool_group: pool.pool_group,
              meta_url: pool.meta_url,
              active_stake: pool.active_stake,
            },
          })
        )
      }
    )

    res.json({
      chainID: 'cardano-mainnet',
      validators,
    })
  } catch (err) {
    console.error('ADA validators fetch failed:', err.message)
    res.json({
      chainID: 'cardano-mainnet',
      validators: [],
      error: 'Cardano validator provider unavailable',
    })
  }
})

app.get('/api/xrp/validators', async (_req, res) => {
  try {
    const validators = await cacheJson(
      'xrp:validators',
      5 * 60 * 1000,
      async () => {
        const registry = await fetchXrpValidators()

        return registry.map((validator) => {
          const unl = Array.isArray(validator.unl) ? validator.unl : []
          const domain =
            validator.domain || validator.domain_legacy || validator.master_key
          const version = validator.server_version?.version_full

          return toCosmosValidator({
            operatorAddress: validator.master_key,
            moniker: domain,
            details: [
              unl.length ? `UNL: ${unl.join(', ')}` : 'Not on a known UNL',
              version ? `Server: ${version}` : '',
              validator.last_seen ? `Last seen: ${validator.last_seen}` : '',
            ]
              .filter(Boolean)
              .join(' - '),
            website: domain && domain.includes('.') ? `https://${domain}` : '',
            tokens: unl.length ? 1 : 0,
            commissionRate: 0,
            external: {
              chainType: 'xrp',
              ephemeral_key: validator.ephemeral_key,
              last_seen: validator.last_seen,
              ledger_index: validator.ledger_index,
              server_version: validator.server_version,
              unl,
              votes: validator.votes,
              verified: validator.meta?.verified,
            },
          })
        })
      }
    )

    res.json({
      chainID: 'xrp-ledger-mainnet',
      validators,
    })
  } catch (err) {
    console.error('XRP validators fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch XRP validators' })
  }
})

app.get('/api/tron/validators', async (_req, res) => {
  try {
    const validators = await cacheJson(
      'tron:validators',
      5 * 60 * 1000,
      async () => {
        const witnesses = await fetchTronWitnesses()

        return witnesses.map((witness) => {
          const address = tronHexToAddress(witness.address) || witness.address
          const produced = Number(witness.totalProduced ?? 0)
          const missed = Number(witness.totalMissed ?? 0)
          const reliability =
            produced + missed > 0 ? produced / (produced + missed) : 0

          return toCosmosValidator({
            operatorAddress: address,
            moniker: witness.url || address,
            details: [
              witness.url ? `URL: ${witness.url}` : '',
              `Produced blocks: ${produced}`,
              `Missed blocks: ${missed}`,
            ]
              .filter(Boolean)
              .join(' - '),
            website: witness.url || '',
            tokens: witness.voteCount || 0,
            commissionRate: 0,
            external: {
              chainType: 'tron',
              address_hex: witness.address,
              brokerage: witness.brokerage,
              latestBlockNum: witness.latestBlockNum,
              totalProduced: produced,
              totalMissed: missed,
              reliability,
              voteCount: witness.voteCount,
            },
          })
        })
      }
    )

    res.json({
      chainID: 'tron-mainnet',
      validators,
    })
  } catch (err) {
    console.error('Tron validators fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch Tron validators' })
  }
})

app.get('/api/cardano/proposals', async (_req, res) => {
  try {
    const proposals = await cacheJson(
      'cardano:proposals',
      5 * 60 * 1000,
      async () => {
        const { data } = await axios.get(`${CARDANO_API}/proposal_list`, {
          params: { limit: 100 },
          headers: { Accept: 'application/json' },
          timeout: 30000,
        })

        return Array.isArray(data) ? data : []
      }
    )

    res.json({
      chainID: 'cardano-mainnet',
      proposals,
    })
  } catch (err) {
    console.error('ADA proposals fetch failed:', err.message)
    res.json({
      chainID: 'cardano-mainnet',
      proposals: [],
      error: 'Cardano proposal provider unavailable',
    })
  }
})

app.get('/api/xrp/amendments', async (_req, res) => {
  try {
    const amendments = await cacheJson(
      'xrp:amendments',
      5 * 60 * 1000,
      async () => {
        const { data } = await axios.get(`${XRPSCAN_API}/amendments`, {
          headers: { Accept: 'application/json' },
          timeout: 30000,
        })

        return Array.isArray(data) ? data : []
      }
    )

    res.json({
      chainID: 'xrp-ledger-mainnet',
      amendments,
    })
  } catch (err) {
    console.error('XRP amendments fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch XRP amendments' })
  }
})

app.get('/api/tron/proposals', async (_req, res) => {
  try {
    const proposals = await cacheJson('tron:proposals', 5 * 60 * 1000, () =>
      fetchTronProposals()
    )

    res.json({
      chainID: 'tron-mainnet',
      proposals,
    })
  } catch (err) {
    console.error('Tron proposals fetch failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch Tron proposals' })
  }
})

app.get('/api/cardano/address/:address', async (req, res) => {
  try {
    const { address } = req.params

    if (!isCardanoAddress(address)) {
      return res.status(400).json({ error: 'Invalid Cardano address' })
    }

    const { data } = await axios.post(
      `${CARDANO_API}/address_info`,
      { _addresses: [address] },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    )

    const entry = Array.isArray(data) ? data[0] : undefined
    const amount =
      entry?.balance ??
      entry?.lovelace ??
      entry?.total_balance ??
      entry?.value ??
      '0'

    res.json({
      address,
      chainID: 'cardano-mainnet',
      denom: 'lovelace',
      amount: String(amount ?? '0'),
      symbol: 'ADA',
      decimals: 6,
    })
  } catch (err) {
    const { address } = req.params
    console.error('ADA balance fetch failed:', err.message)
    res.json({
      address,
      chainID: 'cardano-mainnet',
      denom: 'lovelace',
      amount: '0',
      symbol: 'ADA',
      decimals: 6,
    })
  }
})

app.get('/api/xrp/address/:address', async (req, res) => {
  try {
    const { address } = req.params

    if (!isXrpAddress(address)) {
      return res.status(400).json({ error: 'Invalid XRP address' })
    }

    const data = await postJsonRpc(XRP_RPC, {
      method: 'account_info',
      params: [
        {
          account: address,
          ledger_index: 'validated',
          api_version: 1,
        },
      ],
    })

    const result = data?.result
    const accountData = result?.account_data

    if (result?.error === 'actNotFound') {
      return res.json({
        address,
        chainID: 'xrp-ledger-mainnet',
        denom: 'drops',
        amount: '0',
        symbol: 'XRP',
        decimals: 6,
      })
    }

    if (!accountData?.Balance) {
      throw new Error(result?.error_message || 'Missing XRP account data')
    }

    res.json({
      address,
      chainID: 'xrp-ledger-mainnet',
      denom: 'drops',
      amount: String(accountData.Balance),
      symbol: 'XRP',
      decimals: 6,
    })
  } catch (err) {
    const { address } = req.params
    console.error('XRP balance fetch failed:', err.message)
    res.json({
      address,
      chainID: 'xrp-ledger-mainnet',
      denom: 'drops',
      amount: '0',
      symbol: 'XRP',
      decimals: 6,
    })
  }
})

app.get('/api/nfts/:chainID/:address', async (req, res) => {
  const { chainID, address } = req.params

  try {
    const nfts = await cacheJson(
      `nfts:${chainID}:${address}`,
      2 * 60 * 1000,
      () => fetchNFTsForChain(chainID, address)
    )

    res.json({
      chainID,
      address,
      count: nfts.length,
      nfts,
    })
  } catch (err) {
    console.error('NFT fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch NFTs' })
  }
})

app.post('/api/nfts', async (req, res) => {
  const addresses =
    req.body?.addresses && typeof req.body.addresses === 'object'
      ? req.body.addresses
      : {}

  try {
    const entries = Object.entries(addresses)
      .filter(([, address]) => typeof address === 'string' && address)
      .slice(0, 120)

    const groups = await Promise.all(
      entries.map(async ([chainID, address]) => {
        const nfts = await cacheJson(
          `nfts:${chainID}:${address}`,
          2 * 60 * 1000,
          () => fetchNFTsForChain(chainID, address)
        )

        return {
          chainID,
          address,
          count: nfts.length,
          nfts,
        }
      })
    )

    res.json({
      groups: groups.filter((group) => group.nfts.length > 0),
    })
  } catch (err) {
    console.error('NFT fetch failed:', err.message)
    res.status(502).json({ error: 'Failed to fetch NFTs' })
  }
})

app.get('/api/markets/coins', async (req, res) => {
  const page = clampInt(req.query.page, 1, 500, 1)
  const perPage = clampInt(req.query.per_page ?? req.query.perPage, 1, 250, 250)
  const rawCategory = String(req.query.category ?? '')
    .trim()
    .toLowerCase()
  const category = MARKET_CATEGORIES.has(rawCategory) ? rawCategory : ''
  const rawOrder = String(req.query.order ?? 'market_cap_desc')
    .trim()
    .toLowerCase()
  const order = MARKET_ORDERS.has(rawOrder) ? rawOrder : 'market_cap_desc'
  const search = String(req.query.search ?? '')
    .trim()
    .slice(0, 120)

  try {
    const cacheKey = [
      'markets:coins',
      page,
      perPage,
      category || 'all',
      order,
      search.toLowerCase(),
    ].join(':')

    const result = await cacheJson(cacheKey, 60 * 1000, () =>
      fetchMarketCoins({ page, perPage, category, order, search })
    )

    res.json({
      source: 'coingecko',
      vsCurrency: 'usd',
      page,
      perPage,
      category,
      order,
      search,
      count: result.coins.length,
      totalSearchResults: result.totalSearchResults,
      hasMore: search
        ? page * perPage < (result.totalSearchResults ?? 0)
        : result.coins.length === perPage,
      coins: result.coins.map(normalizeMarketCoin),
    })
  } catch (err) {
    console.error('Market coins fetch failed:', err.message)
    const fallback =
      (search && getCachedMarketSearch({ page, perPage, order, search })) ||
      (category && getCachedAllMarkets({ page, perPage, order, search })) ||
      getStaticMarketFallback({ page, perPage, order, search })

    if (fallback && Array.isArray(fallback.coins)) {
      return res.json({
        source: fallback.coins.length ? 'fallback' : 'fallback-empty',
        vsCurrency: 'usd',
        page,
        perPage,
        category,
        order,
        search,
        count: fallback.coins.length,
        totalSearchResults: fallback.totalSearchResults,
        hasMore: search
          ? page * perPage < (fallback.totalSearchResults ?? 0)
          : fallback.coins.length === perPage,
        fallback: true,
        coins: fallback.coins.map(normalizeMarketCoin),
      })
    }

    res.status(502).json({ error: 'Failed to fetch crypto markets' })
  }
})

app.get('/api/markets/coins/:id', async (req, res) => {
  try {
    const id = parseCoinID(req.params.id)
    const detail = await cacheJson(
      `markets:coin-detail:${id}`,
      5 * 60 * 1000,
      async () => {
        const { data } = await axios.get(`${COINGECKO_API}/coins/${id}`, {
          params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: true,
            developer_data: true,
            sparkline: false,
          },
          headers: getCoinGeckoHeaders(),
          timeout: 25000,
        })

        return normalizeMarketCoinDetail(data)
      }
    )

    res.json({
      source: 'coingecko',
      vsCurrency: 'usd',
      coin: detail,
    })
  } catch (err) {
    const status = err.statusCode || err.response?.status || 502
    console.error('Market coin detail fetch failed:', err.message)

    const fallback = getFallbackMarketDetail(parseCoinID(req.params.id))
    if (fallback?.detail) {
      return res.json({
        source: fallback.source,
        vsCurrency: 'usd',
        fallback: true,
        coin: fallback.detail,
      })
    }

    res.status(status).json({ error: 'Failed to fetch coin details' })
  }
})

app.get('/api/markets/coins/:id/chart', async (req, res) => {
  try {
    const id = parseCoinID(req.params.id)
    const days = clampInt(req.query.days, 1, 365, 30)
    const chart = await cacheJson(
      `markets:coin-chart:${id}:${days}`,
      5 * 60 * 1000,
      async () => {
        const { data } = await axios.get(
          `${COINGECKO_API}/coins/${id}/market_chart`,
          {
            params: {
              vs_currency: 'usd',
              days,
            },
            headers: getCoinGeckoHeaders(),
            timeout: 25000,
          }
        )

        return normalizeMarketChart(data)
      }
    )

    res.json({
      source: 'coingecko',
      vsCurrency: 'usd',
      id,
      days,
      ...chart,
    })
  } catch (err) {
    const status = err.statusCode || err.response?.status || 502
    console.error('Market chart fetch failed:', err.message)

    const id = parseCoinID(req.params.id)
    const days = clampInt(req.query.days, 1, 365, 30)
    const cachedChart = findCachedMarketChart(id, days)
    const fallbackDetail = getFallbackMarketDetail(id)
    let fallbackChart = cachedChart
    if (!fallbackChart) {
      const chartCandidates = [
        findMarketCoinInCache(id),
        findStaticMarketCoin(id),
        fallbackDetail?.detail,
      ]
      for (const candidate of chartCandidates) {
        fallbackChart = buildFallbackMarketChart(candidate, days)
        if (fallbackChart) break
      }
    }

    if (fallbackChart?.prices) {
      return res.json({
        source: cachedChart ? 'cache' : fallbackDetail?.source || 'fallback-static',
        vsCurrency: 'usd',
        id,
        days,
        fallback: true,
        ...fallbackChart,
      })
    }

    res.status(status).json({ error: 'Failed to fetch coin chart' })
  }
})

app.get('/', (req, res) => {
  res.send(
    [
      `<h3>station-assets local server</h3>`,
      `<ul>`,
      `<li><a href="/chains.json">/chains.json</a></li>`,
      `<li><a href="/denoms.json">/denoms.json</a></li>`,
      `<li><a href="/ibc_denoms.json">/ibc_denoms.json</a></li>`,
      `<li><a href="/ibc_tokens.json">/ibc_tokens.json</a></li>`,
      `<li><a href="/currencies.json">/currencies.json</a></li>`,
      `<li><a href="/api/prices">/api/prices</a></li>`,
      `<li><a href="/api/fiat">/api/fiat</a></li>`,
      `<li><a href="/api/cmc/volume/current?chainID=columbus-5">/api/cmc/volume/current</a></li>`,
      `<li><a href="/api/wallets/active?chainID=columbus-5&hours=24">/api/wallets/active</a></li>`,
      `<li><a href="/api/blockspeed?chainID=columbus-5">/api/blockspeed</a></li>`,
      `<li><a href="/api/pools/community?chainID=columbus-5">/api/pools/community</a></li>`,
      `<li><a href="/api/pools/oracle?chainID=columbus-5">/api/pools/oracle</a></li>`,
      `<li><a href="/api/cw20/terra1wt907kgcmql3whjggla26sh6tawelhj3tddfnm">/api/cw20/test</a></li>`,
      `<li><a href="/api/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh">/api/address/btc-test</a></li>`,
      `<li><a href="/api/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh/utxo">/api/address/btc-test/utxo</a></li>`,
      `<li><a href="/api/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh/txs">/api/address/btc-test/txs</a></li>`,
      `<li><a href="/api/fees/recommended">/api/fees/recommended</a></li>`,
      `<li><a href="/api/eth/address/0x0000000000000000000000000000000000000000">/api/eth/address/test</a></li>`,
      `<li><a href="/api/noncosmos/token?chainID=ethereum-mainnet&query=0xdac17f958d2ee523a2206206994597c13d831ec7">/api/noncosmos/token/erc20</a></li>`,
      `<li><a href="/api/solana/address/11111111111111111111111111111111">/api/solana/address/test</a></li>`,
      `<li><a href="/api/noncosmos/token?chainID=solana-mainnet&query=So11111111111111111111111111111111111111112">/api/noncosmos/token/solana</a></li>`,
      `<li><a href="/api/noncosmos/token?chainID=bitcoin-mainnet&query=ordi">/api/noncosmos/token/bitcoin</a></li>`,
      `<li><a href="/api/noncosmos/token?chainID=tron-mainnet&query=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t">/api/noncosmos/token/tron</a></li>`,
      `<li><a href="/api/cardano/validators">/api/cardano/validators</a></li>`,
      `<li><a href="/api/cardano/proposals">/api/cardano/proposals</a></li>`,
      `<li><a href="/api/xrp/validators">/api/xrp/validators</a></li>`,
      `<li><a href="/api/xrp/amendments">/api/xrp/amendments</a></li>`,
      `<li><a href="/api/tron/validators">/api/tron/validators</a></li>`,
      `<li><a href="/api/tron/proposals">/api/tron/proposals</a></li>`,
      `<li><a href="/api/nfts/solana-mainnet/11111111111111111111111111111111">/api/nfts/solana</a></li>`,
      `<li><a href="/api/markets/coins?per_page=10">/api/markets/coins</a></li>`,
      `<li><a href="/api/markets/coins/bitcoin">/api/markets/coins/bitcoin</a></li>`,
      `<li><a href="/api/markets/coins/bitcoin/chart?days=30">/api/markets/coins/bitcoin/chart</a></li>`,
      `</ul>`,
    ].join('')
  )
})

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

requireMfaSignerConfig()
if (DOCHAIN_MFA_REQUIRE_STORE_KEY) getMfaStoreKey()

app.listen(PORT, HOST, () => {
  console.log(`station-assets server running on http://${HOST}:${PORT}`)
})
