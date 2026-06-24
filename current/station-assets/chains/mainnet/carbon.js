module.exports = {
  chainID: "carbon-1",

  name: "Carbon",
  networkType: "mainnet",

  lcd: "https://api.carbon.network",
  api: "https://api.carbon.network",
  rpc: "https://tm-api.carbon.network",

  gasAdjustment: 1.75,

  gasPrices: {
    swth: "1000"
  },

  prefix: "swth",

  coinType: 118,

  baseAsset: "swth",

  icon: "/img/chains/Carbon.svg",

  alliance: true,

  channels: {
    "phoenix-1": "channel-12",
    "axelar-dojo-1": "channel-7",
    "stride-1": "channel-8",
    "cosmoshub-4": "channel-3",
    "kaiyo-1": "channel-9",
    "osmosis-1": "channel-0",
    "stafihub-1": "channel-13"
  },

  explorer: {
    address: "https://scan.carbon.network/account/{}?net=main",
    tx: "https://scan.carbon.network/transaction/{}?net=main",
    validator: "https://scan.carbon.network/validator/{}?net=main",
    block: "https://scan.carbon.network/block/{}?net=main"
  },

  tokens: [
    { token: "swth", symbol: "SWTH", name: "Carbon", icon: "/img/coins/Carbon.svg", decimals: 8 },
    { token: "cgt/1", symbol: "cgt/1", name: "Carbon Grouped USD", icon: "/img/coins/Carbon.svg", decimals: 18 },
    { token: "bnb.1.6.773edb", symbol: "BNB", name: "Carbon Binance Coin", icon: "/img/coins/Carbon.svg", decimals: 18 },
    { token: "eth.1.2.942d87", symbol: "cibETH", name: "Carbon Interest Bearing ETH", icon: "/img/coins/Carbon.svg", decimals: 18 },
    { token: "zwap.1.18.393529", symbol: "ZWAP", name: "Zilswap", icon: "/img/coins/Zwap.svg", decimals: 12 },
    { token: "ava1.1.6.95712b", symbol: "AVA", name: "Travala.com Token", icon: "/img/coins/Carbon.svg", decimals: 18 },
    { token: "blur.1.2.0c0069", symbol: "BLUR", name: "Blur", icon: "/img/coins/Carbon.svg", decimals: 18 },
    { token: "busd.1.6.754a80", symbol: "BUSD", name: "BUSD (BEP-20)", icon: "/img/coins/Carbon.svg", decimals: 18 },
    { token: "zil.1.18.1a4a06", symbol: "ZIL", name: "Zilliqa", icon: "/img/coins/Carbon.svg", decimals: 12 }
  ]
};
