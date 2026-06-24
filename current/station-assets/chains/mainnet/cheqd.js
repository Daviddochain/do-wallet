module.exports = {
  chainID: "cheqd-mainnet-1",

  name: "cheqd",
  networkType: "mainnet",

  lcd: "https://api.cheqd.net",
  api: "https://api.cheqd.net",
  rpc: "https://rpc.cheqd.net",

  gasAdjustment: 1.75,

  gasPrices: {
    ncheq: "50"
  },

  prefix: "cheqd",

  coinType: 118,

  baseAsset: "ncheq",

  icon: "/img/chains/Cheqd.svg",

  channels: {
    "phoenix-1": "channel-9",
    "osmosis-1": "channel-0"
  },

  explorer: {
    address: "https://explorer.cheqd.io/accounts/{}",
    tx: "https://explorer.cheqd.io/transactions/{}",
    validator: "https://explorer.cheqd.io/validators/{}",
    block: "https://explorer.cheqd.io/blocks/{}"
  },

  tokens: [
    {
      token: "ncheq",
      symbol: "CHEQ",
      name: "Cheq",
      icon: "/img/coins/Cheqd.svg",
      decimals: 9
    }
  ]
};