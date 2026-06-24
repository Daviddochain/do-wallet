module.exports = {
  chainID: "akashnet-2",

  name: "Akash",
  networkType: "mainnet",

  lcd: "https://rest.cosmos.directory/akash",
  api: "https://rest.cosmos.directory/akash",
  rpc: "https://rpc.cosmos.directory/akash",

  gasAdjustment: 1.75,

  gasPrices: {
    uakt: 0.025
  },

  prefix: "akash",

  coinType: 118,

  baseAsset: "uakt",

  icon: "/img/chains/Akash.svg",

  channels: {
    "phoenix-1": "channel-56",
    "cosmoshub-4": "channel-17",
    "crescent-1": "channel-70",
    "juno-1": "channel-35",
    "kaiyo-1": "channel-63",
    "osmosis-1": "channel-9"
  },

  explorer: {
    address: "https://www.mintscan.io/akash/account/{}",
    tx: "https://www.mintscan.io/akash/txs/{}",
    validator: "https://www.mintscan.io/akash/validators/{}",
    block: "https://www.mintscan.io/akash/blocks/id/{}"
  },

  tokens: [
    {
      token: "uakt",
      symbol: "AKT",
      name: "Akash",
      icon: "/img/coins/Akash.svg",
      decimals: 6
    }
  ]
};