module.exports = {
  chainID: 'bitcoin-mainnet',
  name: 'Bitcoin',
  symbol: 'BTC',
  networkType: 'mainnet',
  chainType: 'bitcoin',
  cmcSymbol: 'BTC',

  lcd: 'https://blockstream.info/api',
  api: 'https://blockstream.info/api',
  rpc: 'https://blockstream.info/api',

  feeApi: 'https://mempool.space/api/v1/fees/recommended',

  prefix: 'bc',
  coinType: 0,
  baseAsset: 'satoshi',
  decimals: 8,
  icon: '/img/chains/Bitcoin.svg',
  disabledModules: ['staking', 'gov'],

  explorer: {
    name: 'Blockstream',
    address: 'https://blockstream.info/address/{address}',
    tx: 'https://blockstream.info/tx/{tx}',
    block: 'https://blockstream.info/block/{block}',
  },

  tokens: [
    {
      token: 'satoshi',
      symbol: 'BTC',
      name: 'Bitcoin',
      icon: '/img/coins/BTC.svg',
      decimals: 8,
    },
  ],
}
