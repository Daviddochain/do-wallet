module.exports = {
  chainID: 'avalanche-c-chain',
  name: 'Avalanche C-Chain',
  symbol: 'AVAX',
  cmcSymbol: 'AVAX',
  networkType: 'mainnet',
  chainType: 'evm',

  lcd: 'https://api.avax.network/ext/bc/C/rpc',
  api: 'https://api.avax.network/ext/bc/C/rpc',
  rpc: 'https://api.avax.network/ext/bc/C/rpc',

  gasAdjustment: 1,
  gasPrices: {},

  prefix: '0x',
  coinType: 60,
  baseAsset: 'wei',
  decimals: 18,
  icon: '/img/chains/Avalanche.svg',
  disabledModules: ['staking', 'gov'],

  explorer: {
    name: 'Snowtrace',
    address: 'https://snowtrace.io/address/{}',
    tx: 'https://snowtrace.io/tx/{}',
    block: 'https://snowtrace.io/block/{}',
  },

  channels: {},

  tokens: [
    {
      token: 'wei',
      symbol: 'AVAX',
      name: 'Avalanche',
      icon: '/img/coins/Avax.svg',
      decimals: 18,
    },
  ],
}
