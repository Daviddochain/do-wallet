module.exports = {
  chainID: 'arbitrum-one',
  name: 'Arbitrum One',
  symbol: 'ETH',
  cmcSymbol: 'ETH',
  networkType: 'mainnet',
  chainType: 'evm',

  lcd: 'https://arb1.arbitrum.io/rpc',
  api: 'https://arb1.arbitrum.io/rpc',
  rpc: 'https://arb1.arbitrum.io/rpc',

  gasAdjustment: 1,
  gasPrices: {},

  prefix: '0x',
  coinType: 60,
  baseAsset: 'wei',
  decimals: 18,
  icon: '/img/chains/Arbitrum.svg',
  disabledModules: ['staking', 'gov'],

  explorer: {
    name: 'Arbiscan',
    address: 'https://arbiscan.io/address/{}',
    tx: 'https://arbiscan.io/tx/{}',
    block: 'https://arbiscan.io/block/{}',
  },

  channels: {},

  tokens: [
    {
      token: 'wei',
      symbol: 'ETH',
      name: 'Ethereum on Arbitrum',
      icon: '/img/coins/ETH.svg',
      decimals: 18,
    },
  ],
}
