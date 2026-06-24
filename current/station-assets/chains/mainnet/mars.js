module.exports = {
  chainID: "mars-1",

  name: "Mars",
  networkType: "mainnet",

  lcd: "https://rest.cosmos.directory/mars",
  api: "https://rest.cosmos.directory/mars",
  rpc: "https://rpc.cosmos.directory/mars",

  gasAdjustment: 1.75,

  gasPrices: {
    umars: "0",
  },

  prefix: "mars",
  coinType: 330,
  baseAsset: "umars",
  disabledModules: ["staking", "gov"],

  icon: "/img/chains/Mars.svg",

  version: "0.46",

  channels: {
    "phoenix-1": "channel-2",
    "crescent-1": "channel-5",
    "kaiyo-1": "channel-0",
    "osmosis-1": "channel-1",
  },

  explorer: {
    address: "https://explorer.marsprotocol.io/accounts/{}",
    tx: "https://explorer.marsprotocol.io/transactions/{}",
    validator: "https://explorer.marsprotocol.io/validators/{}",
    block: "https://explorer.marsprotocol.io/blocks/{}",
  },

  tokens: [
    {
      token: "umars",
      symbol: "MARS",
      name: "Mars",
      icon: "/img/coins/Mars.svg",
      decimals: 6,
    },
  ],
};
