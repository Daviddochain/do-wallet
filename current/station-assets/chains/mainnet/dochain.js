const ASSET_BASE = process.env.CF_PAGES_URL || "/station-assets"
const WALLET_PUBLIC_URL =
  process.env.WALLET_PUBLIC_URL || "https://do-wallet.com"

module.exports = {
  chainID: "Do-Chain",
  name: "Do Chain",
  networkType: "mainnet",

  lcd: `${WALLET_PUBLIC_URL}/station-assets/api/lcd/Do-Chain`,
  api: `${WALLET_PUBLIC_URL}/station-assets/api/lcd/Do-Chain`,
  rpc: `${WALLET_PUBLIC_URL}/station-assets/dochain-rpc`,

  gasAdjustment: 2,

  gasPrices: {
    udo: 0.025,
  },

  prefix: "do",
  coinType: 888,
  baseAsset: "udo",

  icon: `${ASSET_BASE}/img/chains/DoChain.png`,

  alliance: false,

  explorer: {
    name: "Do Chain Stats",
    url: "https://www.do-chain.com/stats",
    address: "https://www.do-chain.com/stats",
    tx: "https://www.do-chain.com/stats",
    validator: "https://www.do-chain.com/stats",
    block: "https://www.do-chain.com/stats",
  },

  channels: {},

  tokens: [
    {
      token: "udo",
      symbol: "DO",
      name: "Do Token",
      icon: `${ASSET_BASE}/img/coins/DoToken.png`,
      decimals: 6,
    },
  ],
}
