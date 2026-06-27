const ASSET_BASE = process.env.CF_PAGES_URL || "/station-assets"

module.exports = {
  chainID: "dydx-mainnet-1",
  name: "dYdX Protocol",
  networkType: "mainnet",

  lcd: "https://lcd-dydx.tfl.foundation",
  api: "https://lcd-dydx.tfl.foundation",
  rpc: "https://rpc-dydx.tfl.foundation",

  gasAdjustment: 1.75,

  gasPrices: {
    adydx: 12500000000,
  },

  prefix: "dydx",
  coinType: 118,
  baseAsset: "adydx",

  icon: `${ASSET_BASE}/img/chains/dydx.svg`,

  channels: {
    "kaiyo-1": "channel-5",
    "noble-1": "channel-0",
    "osmosis-1": "channel-3",
    "stride-1": "channel-1",
    "kava_2222-10": "channel-7",
  },

  explorer: {
    address: "https://www.mintscan.io/dydx/account/{}",
    tx: "https://www.mintscan.io/dydx/txs/{}",
    validator: "https://www.mintscan.io/dydx/validators/{}",
    block: "https://www.mintscan.io/dydx/blocks/id/{}",
  },

  tokens: [
    {
      token: "adydx",
      symbol: "DYDX",
      name: "dYdX",
      icon: `${ASSET_BASE}/img/coins/dydx.svg`,
      decimals: 18,
    },
  ],
}
