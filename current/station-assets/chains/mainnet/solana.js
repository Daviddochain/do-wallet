module.exports = {
  chainID: "solana-mainnet",
  name: "Solana",
  symbol: "SOL",
  cmcSymbol: "SOL",
  networkType: "mainnet",
  chainType: "solana",

  lcd: "https://solana-rpc.publicnode.com",
  api: "https://solana-rpc.publicnode.com",
  rpc: "https://solana-rpc.publicnode.com",

  gasAdjustment: 1,
  gasPrices: {},

  prefix: "sol",
  coinType: 501,
  baseAsset: "lamports",
  decimals: 9,
  icon: "/img/chains/Solana.svg",
  disabledModules: ["gov"],

  explorer: {
    name: "Solscan",
    address: "https://solscan.io/account/{}",
    validator: "https://solscan.io/account/{}",
    tx: "https://solscan.io/tx/{}",
    block: "https://solscan.io/block/{}",
  },

  channels: {},

  tokens: [
    {
      token: "lamports",
      symbol: "SOL",
      name: "Solana",
      icon: "/img/coins/SOL.svg",
      decimals: 9,
    },
  ],
}
