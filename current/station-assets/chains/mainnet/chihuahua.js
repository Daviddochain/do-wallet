module.exports = {
  chainID: "chihuahua-1",

  name: "Chihuahua",
  networkType: "mainnet",

  lcd: "https://api.chihuahua.wtf",
  api: "https://api.chihuahua.wtf",
  rpc: "https://rpc.chihuahua.wtf",

  gasAdjustment: 2,

  gasPrices: {
    uhuahua: "250"
  },

  prefix: "chihuahua",

  coinType: 118,

  baseAsset: "uhuahua",

  icon: "/img/chains/Huahua.png",

  channels: {
    "phoenix-1": "channel-34",
    "juno-1": "channel-11",
    "migaloo-1": "channel-39",
    "osmosis-1": "channel-7",
    "stafihub-1": "channel-25"
  },

  explorer: {
    address: "https://www.mintscan.io/chihuahua/account/{}",
    tx: "https://www.mintscan.io/chihuahua/txs/{}",
    validator: "https://www.mintscan.io/chihuahua/validators/{}",
    block: "https://www.mintscan.io/chihuahua/blocks/id/{}"
  },

  tokens: [
    {
      token: "uhuahua",
      symbol: "HUAHUA",
      name: "Huahua",
      icon: "/img/coins/Huahua.png",
      decimals: 6
    },
    {
      token: "chihuahua1jz5n4aynhpxx7clf2m8hrv9dp5nz83k67fgaxhy4p9dfwl6zssrq3ymr6w",
      symbol: "bHUAHUA",
      name: "boneHUAHUA",
      icon: "/img/coins/bHUAHUA.png",
      decimals: 6
    }
  ]
};