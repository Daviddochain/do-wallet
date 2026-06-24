module.exports = {
  chainID: "ethereum-mainnet",
  name: "Ethereum",
  symbol: "ETH",
  cmcSymbol: "ETH",
  networkType: "mainnet",
  chainType: "ethereum",

  lcd: "https://ethereum-rpc.publicnode.com",
  api: "https://ethereum-rpc.publicnode.com",
  rpc: "https://ethereum-rpc.publicnode.com",

  gasAdjustment: 1,
  gasPrices: {},

  prefix: "0x",
  coinType: 60,
  baseAsset: "wei",
  decimals: 18,
  icon: "/img/chains/Ethereum.svg",
  disabledModules: ["staking", "gov"],

  explorer: {
    name: "Etherscan",
    address: "https://etherscan.io/address/{}",
    tx: "https://etherscan.io/tx/{}",
    block: "https://etherscan.io/block/{}",
  },

  channels: {},

  tokens: [
    {
      token: "wei",
      symbol: "ETH",
      name: "Ethereum",
      icon: "/img/coins/ETH.svg",
      decimals: 18,
    },
  ],
}
