module.exports = {
  chainID: "dungeon-1",

  name: "Dungeon Chain",
  networkType: "mainnet",

  lcd: "https://api.dungeongames.io",
  api: "https://api.dungeongames.io",
  rpc: "https://rpc.dungeongames.io",

  gasAdjustment: 1.75,

  gasPrices: {
    udgn: 0.05,
  },

  prefix: "dungeon",

  coinType: 118,

  baseAsset: "udgn",

  icon: "/img/chains/Dungeon.png",

  channels: {},

  explorer: {
    address: "https://ping.pub/Dungeonchain/account/{}",
    tx: "https://ping.pub/Dungeonchain/tx/{}",
    validator: "https://ping.pub/Dungeonchain/validator/{}",
    block: "https://ping.pub/Dungeonchain/block/{}",
  },

  tokens: [
    {
  token: "udgn",
  symbol: "DGN",
  name: "Dungeon",
  icon: "/img/chains/Dungeon.png",
  decimals: 6,
},
    
  ],
};
