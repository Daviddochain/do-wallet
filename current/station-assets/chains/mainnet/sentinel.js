module.exports = {
  chainID: "sentinelhub-2",
  name: "DVPN",
  networkType: "mainnet",

  lcd: "https://lcd-sentinel.tfl.foundation",
  api: "https://lcd-sentinel.tfl.foundation",
  rpc: "https://sentinel-rpc.publicnode.com",

  gasAdjustment: 1.75,

  gasPrices: {
    udvpn: 0.1,
  },

  prefix: "sent",
  coinType: 118,
  baseAsset: "udvpn",

  icon: "/img/coins/unknown.svg",

  channels: {
    "cosmoshub-4": "channel-0",
    "osmosis-1": "channel-2",
  },

  explorer: {
    address: "https://www.mintscan.io/sentinel/account/{}",
    tx: "https://www.mintscan.io/sentinel/txs/{}",
    validator: "https://www.mintscan.io/sentinel/validators/{}",
    block: "https://www.mintscan.io/sentinel/blocks/id/{}",
  },

  tokens: [
    { token: "udvpn", symbol: "DVPN", name: "DVPN", icon: "/img/coins/unknown.svg", decimals: 6 },
  ],
}
