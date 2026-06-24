module.exports = {
  chainID: "secret-4",

  name: "Secret Network",
  networkType: "mainnet",

  lcd: "https://rest.lavenderfive.com:443/secretnetwork",
  api: "https://rest.lavenderfive.com:443/secretnetwork",
  rpc: "https://rpc.lavenderfive.com:443/secretnetwork",

  gasAdjustment: 1.75,

  gasPrices: {
    uscrt: 0.1,
  },

  prefix: "secret",
  coinType: 529,
  baseAsset: "uscrt",

  symbol: "SCRT",
  cmcSymbol: "SCRT",
  icon: "/img/chains/Secret.png",

  alliance: false,

  channels: {
    "cosmoshub-4": "channel-1",
    "osmosis-1": "channel-2",
    "juno-1": "channel-8",
    "akashnet-2": "channel-21",
    "columbus-5": "channel-6",
  },

  explorer: {
    address: "https://www.mintscan.io/secret/account/{}",
    tx: "https://www.mintscan.io/secret/txs/{}",
    validator: "https://www.mintscan.io/secret/validators/{}",
    block: "https://www.mintscan.io/secret/blocks/id/{}",
  },

  tokens: [
    {
      token: "uscrt",
      symbol: "SCRT",
      name: "Secret Network",
      icon: "/img/coins/SCRT.png",
      decimals: 6,
    },
  ],
}
