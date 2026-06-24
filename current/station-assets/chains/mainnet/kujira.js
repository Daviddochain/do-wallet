module.exports = {
  chainID: "kaiyo-1",

  name: "Kujira",
  networkType: "mainnet",

  lcd: "https://rest.cosmos.directory/kujira",
  api: "https://rest.cosmos.directory/kujira",
  rpc: "https://rpc.cosmos.directory/kujira",

  gasAdjustment: 1.75,

  gasPrices: {
    ukuji: "0.00119",
    "ibc/DA59C009A0B3B95E0549E6BF7B075C8239285989FF457A8EDDBB56F10B2A6986": "0.000625",
    "ibc/295548A78785A1007F232DE286149A6FF512F180AF5657780FC89C009E2C348F": "0.0015",
    "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2": "0.000125",
    "ibc/47BD209179859CDE4A2806763D7189B6E6FE13A17880FE2B42DE1E6C1E329E23": "0.00126",
  },

  prefix: "kujira",
  coinType: 118,
  baseAsset: "ukuji",

  icon: "/img/chains/Kujira.png",

  channels: {
    "phoenix-1": "channel-5",
    "axelar-dojo-1": "channel-9",
    "carbon-1": "channel-46",
    "akashnet-2": "channel-64",
    "cosmoshub-4": "channel-0",
    "crescent-1": "channel-67",
    "mars-1": "channel-55",
    "migaloo-1": "channel-58",
    "osmosis-1": "channel-3",
    "stride-1": "channel-35",
    "archway-1": "channel-99",
    "noble-1": "channel-62",
    "stafihub-1": "channel-63",
  },

  alliance: true,

  explorer: {
    address: "https://www.mintscan.io/kujira/account/{}",
    tx: "https://www.mintscan.io/kujira/txs/{}",
    validator: "https://www.mintscan.io/kujira/validators/{}",
    block: "https://www.mintscan.io/kujira/blocks/id/{}",
  },

  tokens: [
    {
      token: "ukuji",
      symbol: "KUJI",
      name: "Kujira",
      icon: "/img/coins/Kuji.svg",
      decimals: 6,
    },
    {
      token: "factory/kujira1qk00h5atutpsv900x202pxx42npjr9thg58dnqpa72f2p7m2luase444a7/uusk",
      symbol: "USK",
      name: "USK",
      icon: "/img/coins/USK.svg",
      decimals: 6,
    },
    {
      token: "factory/kujira1n3fr5f56r2ce0s37wdvwrk98yhhq3unnxgcqus8nzsfxvllk0yxquurqty/ampKUJI",
      symbol: "ampKUJI",
      name: "ERIS Amplified KUJI",
      icon: "/img/coins/ampKUJI.svg",
      decimals: 6,
    },
    {
      token: "factory/kujira1swkuyt08z74n5jl7zr6hx0ru5sa2yev5v896p6/local",
      symbol: "LOCAL",
      name: "Local Money",
      icon: "/img/coins/Local.png",
      decimals: 6,
    },
    {
      token: "factory/kujira13y8hs83sk0la7na2w5g5nzrnjjpnkvmd7e87yd35g8dcph7dn0ksenay2a/ulp",
      symbol: "LP KUJI-ATOM",
      name: "LP KUJI-ATOM",
      icon: "",
      decimals: 6,
    },
    {
      token: "factory/kujira1643jxg8wasy5cfcn7xm8rd742yeazcksqlg4d7/umnta",
      symbol: "MNTA",
      name: "MNTA",
      icon: "",
      decimals: 6,
    },
  ],
};