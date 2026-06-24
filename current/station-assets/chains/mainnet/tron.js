module.exports = {
  chainID: 'tron-mainnet',
  name: 'Tron',
  symbol: 'TRX',
  cmcSymbol: 'TRX',
  networkType: 'mainnet',
  chainType: 'tron',

  lcd: 'https://api.trongrid.io',
  api: 'https://api.trongrid.io',
  rpc: 'https://api.trongrid.io',

  gasAdjustment: 1,
  gasPrices: {},

  prefix: 'T',
  coinType: 195,
  baseAsset: 'sun',
  decimals: 6,
  icon: '/img/chains/Tron.svg',
  disabledModules: [],

  explorer: {
    name: 'Tronscan',
    address: 'https://tronscan.org/#/address/{}',
    tx: 'https://tronscan.org/#/transaction/{}',
    validator: 'https://tronscan.org/#/sr/{}',
    block: 'https://tronscan.org/#/block/{}',
  },

  channels: {},

  tokens: [
    {
      token: 'sun',
      symbol: 'TRX',
      name: 'Tron',
      icon: '/img/coins/TRX.svg',
      decimals: 6,
    },
  ],
}
