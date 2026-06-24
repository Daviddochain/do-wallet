module.exports = {
  chainID: 'polygon-mainnet',
  name: 'Polygon',
  symbol: 'MATIC',
  cmcSymbol: 'MATIC',
  networkType: 'mainnet',
  chainType: 'evm',

  lcd: 'https://polygon-bor-rpc.publicnode.com',
  api: 'https://polygon-bor-rpc.publicnode.com',
  rpc: 'https://polygon-bor-rpc.publicnode.com',

  gasAdjustment: 1,
  gasPrices: {},

  prefix: '0x',
  coinType: 60,
  baseAsset: 'wei',
  decimals: 18,
  icon: '/img/chains/Polygon.svg',
  disabledModules: ['staking', 'gov'],

  explorer: {
    name: 'Polygonscan',
    address: 'https://polygonscan.com/address/{}',
    tx: 'https://polygonscan.com/tx/{}',
    block: 'https://polygonscan.com/block/{}',
  },

  channels: {},

  tokens: [
    {
      token: 'wei',
      symbol: 'MATIC',
      name: 'Polygon',
      icon: '/img/coins/MATIC.svg',
      decimals: 18,
    },
  ],
}
