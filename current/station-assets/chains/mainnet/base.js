module.exports = {
  chainID: 'base-mainnet',
  name: 'Base',
  symbol: 'ETH',
  cmcSymbol: 'ETH',
  networkType: 'mainnet',
  chainType: 'evm',

  lcd: 'https://mainnet.base.org',
  api: 'https://mainnet.base.org',
  rpc: 'https://mainnet.base.org',

  gasAdjustment: 1,
  gasPrices: {},

  prefix: '0x',
  coinType: 60,
  baseAsset: 'wei',
  decimals: 18,
  icon: '/img/chains/Base.svg',
  disabledModules: ['staking', 'gov'],

  explorer: {
    name: 'Basescan',
    address: 'https://basescan.org/address/{}',
    tx: 'https://basescan.org/tx/{}',
    block: 'https://basescan.org/block/{}',
  },

  channels: {},

  tokens: [
    {
      token: 'wei',
      symbol: 'ETH',
      name: 'Ethereum on Base',
      icon: '/img/coins/ETH.svg',
      decimals: 18,
    },
  ],
}
