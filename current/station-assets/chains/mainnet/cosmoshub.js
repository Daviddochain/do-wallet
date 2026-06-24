module.exports = {
  chainID: "cosmoshub-4",

  name: "Cosmos",
  networkType: "mainnet",

  lcd: "https://rest.cosmos.directory/cosmoshub",
  api: "https://rest.cosmos.directory/cosmoshub",
  rpc: "https://rpc.cosmos.directory/cosmoshub",

  gasAdjustment: 1.75,

  gasPrices: {
    uatom: "0.025"
  },

  prefix: "cosmos",

  coinType: 118,

  baseAsset: "uatom",

  icon: "/img/chains/Cosmos.svg",

  ibc: {
    fromTerra: "channel-2",
    toTerra: "channel-219"
  },

  channels: {
    "columbus-5": "channel-219",
    "phoenix-1": "channel-339",
    "axelar-dojo-1": "channel-293",
    "carbon-1": "channel-342",
    "akashnet-2": "channel-184",
    "crescent-1": "channel-326",
    "juno-1": "channel-207",
    "kaiyo-1": "channel-343",
    "osmosis-1": "channel-141",
    "stride-1": "channel-391",
    "pacific-1": "channel-584",
    "archway-1": "channel-623",
    "noble-1": "channel-536",
    "stafihub-1": "channel-369"
  },

  explorer: {
    address: "https://www.mintscan.io/cosmos/account/{}",
    tx: "https://www.mintscan.io/cosmos/txs/{}",
    validator: "https://www.mintscan.io/cosmos/validators/{}",
    block: "https://www.mintscan.io/cosmos/blocks/id/{}"
  },

  tokens: [
    {
      token: "uatom",
      symbol: "ATOM",
      name: "Cosmos",
      icon: "/img/coins/Cosmos.svg",
      decimals: 6
    }
  ]
};