module.exports = {
  chainID: "xrp-ledger-mainnet",
  name: "XRP Ledger",
  symbol: "XRP",
  cmcSymbol: "XRP",
  networkType: "mainnet",
  chainType: "xrp",

  lcd: "https://xrplcluster.com",
  api: "https://xrplcluster.com",
  rpc: "https://xrplcluster.com",

  gasAdjustment: 1,
  gasPrices: {},

  prefix: "r",
  coinType: 144,
  baseAsset: "drops",
  decimals: 6,
  icon: "/img/chains/XRP.svg",
  disabledModules: [],

  explorer: {
    name: "XRPSCAN",
    address: "https://xrpscan.com/account/{}",
    tx: "https://xrpscan.com/tx/{}",
    validator: "https://xrpscan.com/validator/{}",
    block: "https://xrpscan.com/ledger/{}",
  },

  channels: {},

  tokens: [
    {
      token: "drops",
      symbol: "XRP",
      name: "XRP Ledger",
      icon: "/img/coins/XRP.svg",
      decimals: 6,
    },
  ],
}
