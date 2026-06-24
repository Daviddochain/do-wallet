module.exports = {
  chainID: "axelar-dojo-1",

  name: "Axelar",
  networkType: "mainnet",

  lcd: "https://axelar-rest.publicnode.com",
  api: "https://axelar-rest.publicnode.com",
  rpc: "https://axelar-rpc.publicnode.com:443",

  gasAdjustment: 1.75,

  gasPrices: { uaxl: 0.007 },

  prefix: "axelar",

  coinType: 118,

  baseAsset: "uaxl",

  icon: "/img/chains/Axelar.svg",

  ibc: {
    fromTerra: "channel-19",
    toTerra: "channel-0",
  },

  channels: {
    "columbus-5": "channel-0",
    "phoenix-1": "channel-11",
    "kaiyo-1": "channel-14",
    "crescent-1": "channel-7",
    "juno-1": "channel-4",
    "osmosis-1": "channel-3",
    "cosmoshub-4": "channel-2",
    "carbon-1": "channel-37",
    "comdex-1": "channel-31",
    "stride-1": "channel-64",
    "pacific-1": "channel-103",
    "archway-1": "channel-111",
  },

  explorer: {
    address: "https://www.mintscan.io/axelar/account/{}",
    tx: "https://www.mintscan.io/axelar/txs/{}",
    validator: "https://www.mintscan.io/axelar/validators/{}",
    block: "https://www.mintscan.io/axelar/blocks/id/{}",
  },

  tokens: [
    {
      token: "uaxl",
      symbol: "AXL",
      name: "Axelar",
      icon: "/img/coins/Axelar.svg",
      decimals: 6,
    },
  ],
};