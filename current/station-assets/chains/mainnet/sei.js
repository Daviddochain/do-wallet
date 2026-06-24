module.exports = {
  chainID: "pacific-1",

  name: "Sei",
  networkType: "mainnet",

  lcd: "https://sei-rest.publicnode.com",
  api: "https://sei-rest.publicnode.com",
  rpc: "https://sei-rpc.publicnode.com:443",

  gasAdjustment: 2,

  gasPrices: { usei: 0.1 },

  prefix: "sei",

  coinType: 118,

  baseAsset: "usei",

  icon: "/img/chains/sei.svg",

  channels: {
    "osmosis-1": "channel-0",
    "axelar-dojo-1": "channel-2",
    "phoenix-1": "channel-3",
    "cosmoshub-4": "channel-1",
    "migaloo-1": "channel-10",
    "stride-1": "channel-11",
  },

  explorer: {
    address: "https://www.mintscan.io/sei/account/{}",
    tx: "https://www.mintscan.io/sei/txs/{}",
    validator: "https://www.mintscan.io/sei/validators/{}",
    block: "https://www.mintscan.io/sei/blocks/id/{}",
  },

  tokens: [
    {
      token: "usei",
      symbol: "SEI",
      name: "Sei",
      icon: "/img/coins/sei.svg",
      decimals: 6,
    },
  ],
};