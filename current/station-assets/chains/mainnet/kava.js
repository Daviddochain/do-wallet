module.exports = {
  chainID: "kava_2222-10",
  name: "Kava",
  networkType: "mainnet",

  lcd: "https://lcd-kava.tfl.foundation",
  api: "https://lcd-kava.tfl.foundation",
  rpc: "https://kava-rpc.publicnode.com",

  gasAdjustment: 1.75,

  gasPrices: {
    ukava: 0.25,
  },

  prefix: "kava",
  coinType: 459,
  baseAsset: "ukava",

  icon: "/img/coins/unknown.svg",

  channels: {
    "cosmoshub-4": "channel-0",
    "osmosis-1": "channel-1",
    "akashnet-2": "channel-117",
    "axelar-dojo-1": "channel-114",
    "dydx-mainnet-1": "channel-95",
  },

  explorer: {
    address: "https://www.mintscan.io/kava/account/{}",
    tx: "https://www.mintscan.io/kava/txs/{}",
    validator: "https://www.mintscan.io/kava/validators/{}",
    block: "https://www.mintscan.io/kava/blocks/id/{}",
  },

  tokens: [
    { token: "ukava", symbol: "KAVA", name: "Kava", icon: "/img/coins/unknown.svg", decimals: 6 },
    { token: "erc20/tether/usdt", symbol: "USDT", name: "Tether USD", icon: "/img/coins/unknown.svg", decimals: 6 },
    { token: "hard", symbol: "HARD", name: "Kava Hard", icon: "/img/coins/unknown.svg", decimals: 6 },
    { token: "swp", symbol: "SWP", name: "Kava Swap", icon: "/img/coins/unknown.svg", decimals: 6 },
    { token: "usdx", symbol: "USDX", name: "USDX", icon: "/img/coins/unknown.svg", decimals: 6 },
  ],
}
