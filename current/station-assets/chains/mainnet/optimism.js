module.exports = {
  chainID: 'optimism-mainnet',
  name: 'Optimism',
  symbol: 'ETH',
  cmcSymbol: 'ETH',
  networkType: 'mainnet',
  chainType: 'evm',

  lcd: 'https://mainnet.optimism.io',
  api: 'https://mainnet.optimism.io',
  rpc: 'https://mainnet.optimism.io',

  gasAdjustment: 1,
  gasPrices: {},

  prefix: '0x',
  coinType: 60,
  baseAsset: 'wei',
  decimals: 18,
  icon: '/img/chains/Optimism.svg',
  disabledModules: ['staking', 'gov'],

  explorer: {
    name: 'Optimistic Etherscan',
    address: 'https://optimistic.etherscan.io/address/{}',
    tx: 'https://optimistic.etherscan.io/tx/{}',
    block: 'https://optimistic.etherscan.io/block/{}',
  },

  channels: {},

  tokens: [
    {
      token: 'wei',
      symbol: 'ETH',
      name: 'Ethereum on Optimism',
      icon: '/img/coins/ETH.svg',
      decimals: 18,
    },
  ],
}
