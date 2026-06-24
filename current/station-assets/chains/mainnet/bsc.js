module.exports = {
  chainID: 'bnb-smart-chain-mainnet',
  name: 'BNB Smart Chain',
  symbol: 'BNB',
  cmcSymbol: 'BNB',
  networkType: 'mainnet',
  chainType: 'evm',

  lcd: 'https://bsc-dataseed.binance.org',
  api: 'https://bsc-dataseed.binance.org',
  rpc: 'https://bsc-dataseed.binance.org',

  gasAdjustment: 1,
  gasPrices: {},

  prefix: '0x',
  coinType: 60,
  baseAsset: 'wei',
  decimals: 18,
  icon: '/img/chains/BNB.svg',
  disabledModules: ['gov'],

  explorer: {
    name: 'BscScan',
    address: 'https://bscscan.com/address/{}',
    validator: 'https://bscscan.com/address/{}',
    tx: 'https://bscscan.com/tx/{}',
    block: 'https://bscscan.com/block/{}',
  },

  channels: {},

  tokens: [
    {
      token: 'wei',
      symbol: 'BNB',
      name: 'BNB',
      icon: '/img/coins/Bnb.svg',
      decimals: 18,
    },
  ],
}
