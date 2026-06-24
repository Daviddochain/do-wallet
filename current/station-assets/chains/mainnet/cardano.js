module.exports = {
  chainID: "cardano-mainnet",
  name: "Cardano",
  symbol: "ADA",
  cmcSymbol: "ADA",
  networkType: "mainnet",
  chainType: "cardano",

  lcd: "https://api.koios.rest/api/v1",
  api: "https://api.koios.rest/api/v1",
  rpc: "https://api.koios.rest/api/v1",

  gasAdjustment: 1,
  gasPrices: {},

  prefix: "addr",
  coinType: 1815,
  baseAsset: "lovelace",
  decimals: 6,
  icon: "/img/chains/Cardano.svg",
  disabledModules: [],

  explorer: {
    name: "Cardanoscan",
    address: "https://cardanoscan.io/address/{}",
    tx: "https://cardanoscan.io/transaction/{}",
    validator: "https://cardanoscan.io/pool/{}",
    block: "https://cardanoscan.io/block/{}",
  },

  channels: {},

  tokens: [
    {
      token: "lovelace",
      symbol: "ADA",
      name: "Cardano",
      icon: "/img/coins/ADA.svg",
      decimals: 6,
    },
  ],
}
