(function () {
  "use strict";

  if (window.__doWalletMultichainAssets20260624L1DashboardGroup2) return;
  window.__doWalletMultichainAssets20260624L1DashboardGroup2 = true;
  window.__doWalletMultichainAssets20260615 = true;

  var SNAPSHOT_KEY = "do-wallet-portfolio-snapshot";
  var SNAPSHOTS_BY_WALLET_KEY = "do-wallet-portfolio-snapshots-by-wallet";
  var SNAPSHOT_RESET_KEY = "do-wallet-portfolio-snapshot-reset-version";
  var BRIDGE_KEY = "do-wallet-bridge-wallet";
  var AUTH_KEY = "do-wallet-extension-authority.v1";
  var RECOVERED_WALLETS_KEY = "do-wallet-recovered-wallets.v1";
  var SELECTED_WALLET_KEY = "do-wallet-selected-recovered-wallet.v1";
  var SNAPSHOT_SCHEMA_VERSION = "20260625FullWalletPortfolio4";
  var PAGE_TARGET = "do-wallet-page";
  var CONTENT_TARGET = "do-wallet-content";
  var PORTFOLIO_REFRESH_MS = 120000;
  var MIN_PORTFOLIO_REFRESH_INTERVAL_MS = 60000;
  var MIN_RUN_INTERVAL_MS = 5000;
  var CATALOG_FETCH_TIMEOUT_MS = 7000;
  var COSMOS_BANK_FETCH_TIMEOUT_MS = 4500;
  var COSMOS_STAKE_FETCH_TIMEOUT_MS = 5500;
  var TOKEN_FETCH_TIMEOUT_MS = 3000;
  var ACCOUNT_FETCH_TIMEOUT_MS = 5500;
  var BACKEND_PORTFOLIO_SNAPSHOT_TIMEOUT_MS = 10000;
  var BACKEND_PORTFOLIO_MAX_WALLETS = 240;
  var BACKEND_PORTFOLIO_SNAPSHOT_PATH = "/station-assets/api/portfolio/snapshot?v=" + SNAPSHOT_SCHEMA_VERSION;
  var WETH_CONTRACT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  var L2_CONTRACT = "terra12ckccpalj2y9h54syyst4lpqp79duc9cpxfsyvne409rjw93s8qs2eneh3";
  var LEGACY_REGISTRY_KEYS = {
    CustomLCD: true,
    CustomChains: true,
    CustomTokens: true,
    CustomTokensInterchain: true,
    DisplayChains: true,
    EnabledNetworks: true,
    CustomNetworks: true,
    StationNetworks: true,
    StationAssets: true,
    StationChains: true,
    StationLCD: true,
  };
  var TRUSTED_PUBLIC_STORAGE_KEYS = {};
  [
    SNAPSHOT_KEY,
    SNAPSHOTS_BY_WALLET_KEY,
    BRIDGE_KEY,
    AUTH_KEY,
    RECOVERED_WALLETS_KEY,
    SELECTED_WALLET_KEY,
    "keys",
    "user",
    "wallet",
    "wallets"
  ].forEach(function (key) {
    TRUSTED_PUBLIC_STORAGE_KEYS[key] = true;
    TRUSTED_PUBLIC_STORAGE_KEYS[String(key).toLowerCase()] = true;
  });
  var REMOVED_NETWORKS = ["dochain-1", "ares-1", "pisco-1", "localterra", "sentinelhub-2"];
  var REMOVED_ADDRESS_ALIASES = REMOVED_NETWORKS.slice();
  var STALE_NETWORK_ALIASES = ["dochain-1", "do-main-1", "dochain", "do", "888", "terra", "330", "lunc", "luna", "terra-classic"];
  var DISPLAY_ALIAS_KEYS = ["address", "0", "60", "118", "144", "195", "330", "501", "529", "888", "1815", "terra", "lunc", "luna", "terra-classic", "do", "dochain", "cosmos", "osmo", "eth", "evm", "ethereum", "eip155:1", "btc", "bitcoin", "bip122:000000000019d6689c085ae165831e93", "sol", "solana", "secret", "dungeon", "ada", "cardano", "trx", "tron", "xrp"];
  var PRIORITY_NETWORKS = [
    "Do-Chain",
    "columbus-5",
    "dungeon-1",
    "secret-4",
    "phoenix-1",
    "cosmoshub-4",
    "osmosis-1",
    "juno-1",
    "akashnet-2",
    "carbon-1",
    "cheqd-mainnet-1",
    "chihuahua-1",
    "archway-1",
    "axelar-dojo-1",
    "comdex-1",
    "crescent-1",
    "mainnet-3",
    "kaiyo-1",
    "mars-1",
    "migaloo-1",
    "pacific-1",
    "stafihub-1",
    "stride-1",
    "ethereum-mainnet",
    "arbitrum-one",
    "avalanche-c-chain",
    "base-mainnet",
    "bnb-smart-chain-mainnet",
    "optimism-mainnet",
    "polygon-mainnet",
    "bitcoin-mainnet",
    "solana-mainnet",
    "cardano-mainnet",
    "tron-mainnet",
    "xrp-ledger-mainnet",
  ];

  var CHAINS = {
    "Do-Chain": {
      chainID: "Do-Chain",
      name: "Do Chain",
      networkType: "mainnet",
      lcd: "https://do-chain.com",
      api: "https://do-chain.com",
      rpc: "https://do-chain.com/rpc",
      gasAdjustment: 2,
      gasPrices: { udo: 0.025 },
      prefix: "do",
      coinType: "888",
      baseAsset: "udo",
      symbol: "DO",
      icon: "/do-logo.jpg",
      alliance: false,
      channels: {},
      explorer: {
        name: "Do Chain Stats",
        url: "https://www.do-chain.com/stats",
        address: "https://www.do-chain.com/stats",
        tx: "https://www.do-chain.com/stats",
        validator: "https://www.do-chain.com/stats",
        block: "https://www.do-chain.com/stats",
      },
    },
    "columbus-5": {
      chainID: "columbus-5",
      name: "Terra Classic (LUNC)",
      networkType: "mainnet",
      lcd: "https://terra-classic-lcd.publicnode.com",
      api: "https://terra-classic-lcd.publicnode.com",
      rpc: "https://terra-classic-rpc.publicnode.com",
      gasAdjustment: 1.75,
      gasPrices: { uluna: 28.325 },
      prefix: "terra",
      coinType: "330",
      baseAsset: "uluna",
      symbol: "LUNC",
      cmcSymbol: "LUNC",
      icon: "/img/chains/TerraClassic.svg",
      alliance: false,
      channels: {},
      explorer: {
        address: "https://finder.terra.money/classic/address/{}",
        tx: "https://finder.terra.money/classic/tx/{}",
        validator: "https://finder.terra.money/classic/validator/{}",
        block: "https://finder.terra.money/classic/block/{}",
      },
    },
    "phoenix-1": {
      chainID: "phoenix-1",
      name: "Terra (LUNA)",
      networkType: "mainnet",
      lcd: "https://terra-lcd.publicnode.com",
      api: "https://terra-lcd.publicnode.com",
      rpc: "https://terra-rpc.publicnode.com:443",
      gasAdjustment: 1.75,
      gasPrices: { uluna: 28.325 },
      prefix: "terra",
      coinType: "330",
      baseAsset: "uluna",
      symbol: "LUNA",
      cmcSymbol: "LUNA",
      icon: "/img/chains/Terra.svg",
      alliance: false,
      channels: {},
      explorer: {
        address: "https://finder.terra.money/mainnet/address/{}",
        tx: "https://finder.terra.money/mainnet/tx/{}",
        validator: "https://finder.terra.money/mainnet/validator/{}",
        block: "https://finder.terra.money/mainnet/block/{}",
      },
    },
    "secret-4": {
      chainID: "secret-4",
      name: "Secret Network",
      networkType: "mainnet",
      lcd: "https://rest.lavenderfive.com:443/secretnetwork",
      api: "https://rest.lavenderfive.com:443/secretnetwork",
      rpc: "https://rpc.lavenderfive.com:443/secretnetwork",
      gasAdjustment: 1.75,
      gasPrices: { uscrt: 0.1 },
      prefix: "secret",
      coinType: "529",
      baseAsset: "uscrt",
      symbol: "SCRT",
      cmcSymbol: "SCRT",
      icon: "/img/chains/Secret.png",
      alliance: false,
      channels: {},
      explorer: {
        address: "https://www.mintscan.io/secret/account/{}",
        tx: "https://www.mintscan.io/secret/txs/{}",
        validator: "https://www.mintscan.io/secret/validators/{}",
        block: "https://www.mintscan.io/secret/blocks/id/{}",
      },
    },
    "dungeon-1": {
      chainID: "dungeon-1",
      name: "Dungeon Chain",
      networkType: "mainnet",
      lcd: "https://api.dungeongames.io",
      api: "https://api.dungeongames.io",
      rpc: "https://rpc.dungeongames.io",
      gasAdjustment: 1.75,
      gasPrices: { udgn: 0.07 },
      prefix: "dungeon",
      coinType: "118",
      baseAsset: "udgn",
      symbol: "DGN",
      cmcSymbol: "DGN",
      icon: "https://raw.githubusercontent.com/cosmos/chain-registry/master/dungeon/images/DGN.png",
      alliance: false,
      channels: {},
      explorer: {
        address: "https://explorer.dungeongames.io/account/{}",
        tx: "https://explorer.dungeongames.io/tx/{}",
        validator: "https://explorer.dungeongames.io/validator/{}",
        block: "https://explorer.dungeongames.io/block/{}",
      },
    },
    "ethereum-mainnet": {
      chainID: "ethereum-mainnet",
      name: "Ethereum",
      networkType: "mainnet",
      rpc: "https://ethereum.publicnode.com",
      api: "https://ethereum.publicnode.com",
      prefix: "0x",
      coinType: "60",
      baseAsset: "eth",
      symbol: "ETH",
      icon: "/img/chains/Ethereum.svg",
      evm: true,
      chainNamespace: "eip155",
      caip2: "eip155:1",
      explorer: {
        address: "https://etherscan.io/address/{}",
        tx: "https://etherscan.io/tx/{}",
        block: "https://etherscan.io/block/{}",
      },
    },
    "bitcoin-mainnet": {
      chainID: "bitcoin-mainnet",
      name: "Bitcoin",
      networkType: "mainnet",
      prefix: "bc",
      coinType: "0",
      baseAsset: "btc",
      symbol: "BTC",
      icon: "/img/chains/Bitcoin.svg",
      chainNamespace: "bip122",
      caip2: "bip122:000000000019d6689c085ae165831e93",
      explorer: {
        address: "https://mempool.space/address/{}",
        tx: "https://mempool.space/tx/{}",
        block: "https://mempool.space/block/{}",
      },
    },
    "solana-mainnet": {
      chainID: "solana-mainnet",
      name: "Solana",
      networkType: "mainnet",
      rpc: "https://api.mainnet-beta.solana.com",
      api: "https://api.mainnet-beta.solana.com",
      prefix: "sol",
      coinType: "501",
      baseAsset: "sol",
      symbol: "SOL",
      icon: "/img/chains/Solana.svg",
      chainNamespace: "solana",
      explorer: {
        address: "https://solscan.io/account/{}",
        tx: "https://solscan.io/tx/{}",
        block: "https://solscan.io/block/{}",
      },
    },
    "cosmoshub-4": {
      chainID: "cosmoshub-4",
      name: "Cosmos Hub",
      networkType: "mainnet",
      lcd: "https://cosmos-rest.publicnode.com",
      api: "https://cosmos-rest.publicnode.com",
      rpc: "https://cosmos-rpc.publicnode.com",
      prefix: "cosmos",
      coinType: "118",
      baseAsset: "uatom",
      symbol: "ATOM",
      icon: "/img/chains/Cosmos.png",
      alliance: false,
      channels: {},
    },
    "osmosis-1": {
      chainID: "osmosis-1",
      name: "Osmosis",
      networkType: "mainnet",
      lcd: "https://osmosis-rest.publicnode.com",
      api: "https://osmosis-rest.publicnode.com",
      rpc: "https://osmosis-rpc.publicnode.com",
      prefix: "osmo",
      coinType: "118",
      baseAsset: "uosmo",
      symbol: "OSMO",
      icon: "/img/chains/Osmosis.png",
      alliance: false,
      channels: {},
    },
    "juno-1": {
      chainID: "juno-1",
      name: "Juno",
      networkType: "mainnet",
      lcd: "https://juno-rest.publicnode.com",
      api: "https://juno-rest.publicnode.com",
      rpc: "https://juno-rpc.publicnode.com",
      prefix: "juno",
      coinType: "118",
      baseAsset: "ujuno",
      symbol: "JUNO",
      icon: "/img/chains/Juno.png",
      alliance: false,
      channels: {},
    },
    "akashnet-2": {
      chainID: "akashnet-2",
      name: "Akash",
      networkType: "mainnet",
      lcd: "https://akash-rest.publicnode.com",
      api: "https://akash-rest.publicnode.com",
      rpc: "https://akash-rpc.publicnode.com",
      prefix: "akash",
      coinType: "118",
      baseAsset: "uakt",
      symbol: "AKT",
      icon: "/img/chains/Akash.png",
      alliance: false,
      channels: {},
    },
    "carbon-1": {
      chainID: "carbon-1",
      name: "Carbon",
      networkType: "mainnet",
      prefix: "swth",
      coinType: "118",
      baseAsset: "swth",
      symbol: "SWTH",
      icon: "/img/chains/Carbon.png",
      alliance: false,
      channels: {},
    },
    "cheqd-mainnet-1": {
      chainID: "cheqd-mainnet-1",
      name: "cheqd",
      networkType: "mainnet",
      prefix: "cheqd",
      coinType: "118",
      baseAsset: "ncheq",
      symbol: "CHEQ",
      icon: "/img/chains/Cheqd.png",
      alliance: false,
      channels: {},
    },
    "sentinelhub-2": {
      chainID: "sentinelhub-2",
      name: "DVPN",
      networkType: "mainnet",
      prefix: "sent",
      coinType: "118",
      baseAsset: "udvpn",
      symbol: "DVPN",
      icon: "/img/chains/Sentinel.png",
      alliance: false,
      channels: {},
    },
    "decentr-mainnet-1": {
      chainID: "decentr-mainnet-1",
      name: "DEC",
      networkType: "mainnet",
      prefix: "decentr",
      coinType: "118",
      baseAsset: "udec",
      symbol: "DEC",
      icon: "/img/chains/Decentr.png",
      alliance: false,
      channels: {},
    },
    "chihuahua-1": {
      chainID: "chihuahua-1",
      name: "HUAHUA",
      networkType: "mainnet",
      prefix: "chihuahua",
      coinType: "118",
      baseAsset: "uhuahua",
      symbol: "HUAHUA",
      icon: "/img/chains/Chihuahua.png",
      alliance: false,
      channels: {},
    },
    "arbitrum-one": {
      chainID: "arbitrum-one",
      name: "Arbitrum One",
      networkType: "mainnet",
      rpc: "https://arb1.arbitrum.io/rpc",
      api: "https://arb1.arbitrum.io/rpc",
      prefix: "0x",
      coinType: "60",
      baseAsset: "eth",
      symbol: "ETH",
      icon: "/img/chains/Arbitrum.svg",
      evm: true,
      chainNamespace: "eip155",
      caip2: "eip155:42161",
      explorer: {
        address: "https://arbiscan.io/address/{}",
        tx: "https://arbiscan.io/tx/{}",
        block: "https://arbiscan.io/block/{}",
      },
    },
  };

  var NATIVE_TOKENS = {
    "Do-Chain": { denom: "udo", id: "Do-Chain:udo", token: "udo", symbol: "DO", name: "Do Token", decimals: 6, chainID: "Do-Chain", verified: true },
    "columbus-5": { denom: "uluna", id: "columbus-5:uluna", token: "uluna", symbol: "LUNC", name: "Terra Classic (LUNC)", decimals: 6, chainID: "columbus-5", verified: true },
    "phoenix-1": { denom: "uluna", id: "phoenix-1:uluna", token: "uluna", symbol: "LUNA", name: "Terra (LUNA)", decimals: 6, chainID: "phoenix-1", verified: true },
    "secret-4": { denom: "uscrt", id: "secret-4:uscrt", token: "uscrt", symbol: "SCRT", name: "Secret Network", decimals: 6, chainID: "secret-4", verified: true },
    "dungeon-1": { denom: "udgn", id: "dungeon-1:udgn", token: "udgn", symbol: "DGN", name: "Dungeon Chain", decimals: 6, chainID: "dungeon-1", verified: true },
    "ethereum-mainnet": { denom: "eth", id: "ethereum-mainnet:eth", token: "eth", symbol: "ETH", name: "Ethereum", decimals: 18, chainID: "ethereum-mainnet", verified: true },
    "bitcoin-mainnet": { denom: "btc", id: "bitcoin-mainnet:btc", token: "btc", symbol: "BTC", name: "Bitcoin", decimals: 8, chainID: "bitcoin-mainnet", verified: true },
    "solana-mainnet": { denom: "sol", id: "solana-mainnet:sol", token: "sol", symbol: "SOL", name: "Solana", decimals: 9, chainID: "solana-mainnet", verified: true },
    "cosmoshub-4": { denom: "uatom", id: "cosmoshub-4:uatom", token: "uatom", symbol: "ATOM", name: "Cosmos Hub", decimals: 6, chainID: "cosmoshub-4", verified: true },
    "osmosis-1": { denom: "uosmo", id: "osmosis-1:uosmo", token: "uosmo", symbol: "OSMO", name: "Osmosis", decimals: 6, chainID: "osmosis-1", verified: true },
    "juno-1": { denom: "ujuno", id: "juno-1:ujuno", token: "ujuno", symbol: "JUNO", name: "Juno", decimals: 6, chainID: "juno-1", verified: true },
    "akashnet-2": { denom: "uakt", id: "akashnet-2:uakt", token: "uakt", symbol: "AKT", name: "Akash", decimals: 6, chainID: "akashnet-2", verified: true },
    "carbon-1": { denom: "swth", id: "carbon-1:swth", token: "swth", symbol: "SWTH", name: "Carbon", decimals: 8, chainID: "carbon-1", verified: true },
    "cheqd-mainnet-1": { denom: "ncheq", id: "cheqd-mainnet-1:ncheq", token: "ncheq", symbol: "CHEQ", name: "cheqd", decimals: 9, chainID: "cheqd-mainnet-1", verified: true },
    "sentinelhub-2": { denom: "udvpn", id: "sentinelhub-2:udvpn", token: "udvpn", symbol: "DVPN", name: "DVPN", decimals: 6, chainID: "sentinelhub-2", verified: true },
    "decentr-mainnet-1": { denom: "udec", id: "decentr-mainnet-1:udec", token: "udec", symbol: "DEC", name: "DEC", decimals: 6, chainID: "decentr-mainnet-1", verified: true },
    "chihuahua-1": { denom: "uhuahua", id: "chihuahua-1:uhuahua", token: "uhuahua", symbol: "HUAHUA", name: "HUAHUA", decimals: 6, chainID: "chihuahua-1", verified: true },
    "arbitrum-one": { denom: "eth", id: "arbitrum-one:eth", token: "eth", symbol: "ETH", name: "Ethereum on Arbitrum", decimals: 18, chainID: "arbitrum-one", verified: true },
  };

  var TERRA_CLASSIC_NATIVE_DENOMS = {
    uaud: { symbol: "AUT", name: "Terra Classic AUD" },
    ucad: { symbol: "CAT", name: "Terra Classic CAD" },
    uchf: { symbol: "CHT", name: "Terra Classic CHF" },
    ucny: { symbol: "CNT", name: "Terra Classic CNY" },
    udkk: { symbol: "DKT", name: "Terra Classic DKK" },
    ueur: { symbol: "EUT", name: "Terra Classic EUR" },
    ugbp: { symbol: "GBT", name: "Terra Classic GBP" },
    uhkd: { symbol: "HKT", name: "Terra Classic HKD" },
    uidr: { symbol: "IDT", name: "Terra Classic IDR" },
    uinr: { symbol: "INT", name: "Terra Classic INR" },
    ujpy: { symbol: "JPT", name: "Terra Classic JPY" },
    ukrw: { symbol: "KRT", name: "Terra Classic KRW" },
    umnt: { symbol: "MNT", name: "Terra Classic MNT" },
    umyr: { symbol: "MYT", name: "Terra Classic MYR" },
    unok: { symbol: "NOT", name: "Terra Classic NOK" },
    uphp: { symbol: "PHT", name: "Terra Classic PHP" },
    usdr: { symbol: "SDT", name: "Terra Classic SDR" },
    usek: { symbol: "SET", name: "Terra Classic SEK" },
    usgd: { symbol: "SGT", name: "Terra Classic SGD" },
    uthb: { symbol: "THT", name: "Terra Classic THB" },
    uusd: { symbol: "USTC", name: "Terra Classic USD" },
  };

  var PORTFOLIO_CHAIN_FALLBACKS = [
    ["Oraichain", "Oraichain", "orai", "118", "orai", "ORAI", 6, "https://lcd-oraichain.tfl.foundation", "/img/chains/Oraichain.png"],
    ["andromeda-1", "Andromeda", "andr", "118", "uandr", "ANDR", 6, "https://andromeda.api.kjnodes.com", "/img/chains/Andromeda.png"],
    ["archway-1", "Archway", "archway", "118", "aarch", "ARCH", 18, "https://lcd-archway.tfl.foundation", "/img/chains/Archway.png"],
    ["axelar-dojo-1", "Axelar", "axelar", "118", "uaxl", "AXL", 6, "https://lcd-axelar.tfl.foundation", "/img/chains/Axelar.png"],
    ["carbon-1", "Carbon", "swth", "118", "swth", "SWTH", 8, "https://lcd-carbon.tfl.foundation", "/img/chains/Carbon.png"],
    ["celestia", "Celestia", "celestia", "118", "utia", "TIA", 6, "https://lcd-celestia.tfl.foundation", "/img/chains/Celestia.png"],
    ["cheqd-mainnet-1", "Cheqd", "cheqd", "118", "ncheq", "CHEQ", 9, "https://lcd-cheqd.tfl.foundation", "/img/chains/Cheqd.png"],
    ["chihuahua-1", "Chihuahua", "chihuahua", "118", "uhuahua", "HUAHUA", 6, "https://lcd-chihuahua.tfl.foundation", "/img/chains/Chihuahua.png"],
    ["comdex-1", "Comdex", "comdex", "118", "ucmdx", "CMDX", 6, "https://lcd-comdex.tfl.foundation", "/img/chains/Comdex.png"],
    ["crescent-1", "Crescent", "cre", "118", "ucre", "CRE", 6, "https://lcd-crescent.tfl.foundation", "/img/chains/Crescent.png"],
    ["dydx-mainnet-1", "dYdX Protocol", "dydx", "118", "adydx", "DYDX", 18, "https://lcd-dydx.tfl.foundation", "/img/chains/Dydx.png"],
    ["injective-1", "Injective", "inj", "60", "inj", "INJ", 18, "https://lcd-injective.tfl.foundation", "/img/chains/Injective.png"],
    ["kaiyo-1", "Kujira", "kujira", "118", "ukuji", "KUJI", 6, "https://lcd-kujira.tfl.foundation", "/img/chains/Kujira.png"],
    ["kava_2222-10", "Kava", "kava", "459", "ukava", "KAVA", 6, "https://lcd-kava.tfl.foundation", "/img/chains/Kava.png"],
    ["decentr-mainnet-1", "Decentr", "decentr", "118", "udec", "DEC", 6, "https://lcd-decentr.tfl.foundation", "/img/chains/Decentr.png"],
    ["migaloo-1", "Migaloo", "migaloo", "118", "uwhale", "WHALE", 6, "https://lcd-migaloo.tfl.foundation", "/img/chains/Migaloo.png"],
    ["neutron-1", "Neutron", "neutron", "118", "untrn", "NTRN", 6, "https://lcd-neutron.tfl.foundation", "/img/chains/Neutron.png"],
    ["noble-1", "Noble", "noble", "118", "uusdc", "USDC", 6, "https://lcd-noble.tfl.foundation", "/img/chains/Noble.png"],
    ["pacific-1", "Sei", "sei", "118", "usei", "SEI", 6, "https://lcd-sei.tfl.foundation", "/img/chains/Sei.png"],
    ["pirin-1", "Nolus", "nolus", "118", "unls", "NLS", 6, "https://pirin-cl-arc.nolus.network:1317", "/img/chains/Nolus.png"],
    ["pryzm-1", "Pryzm", "pryzm", "118", "upryzm", "PRYZM", 6, "https://api.pryzm.zone", "/img/chains/Pryzm.png"],
    ["sentinelhub-2", "DVPN", "sent", "118", "udvpn", "DVPN", 6, "https://lcd-sentinel.tfl.foundation", "/img/chains/Sentinel.png"],
    ["stafihub-1", "StaFiHub", "stafi", "118", "ufis", "FIS", 6, "https://lcd-stafihub.tfl.foundation", "/img/chains/StaFiHub.png"],
    ["stargaze-1", "Stargaze", "stars", "118", "ustars", "STARS", 6, "https://lcd-stargaze.tfl.foundation", "/img/chains/Stargaze.png"],
    ["stride-1", "Stride", "stride", "118", "ustrd", "STRD", 6, "https://stride-fleet.main.stridenet.co/api", "/img/chains/Stride.png"],
  ];

  var RECEIVE_BECH32_PREFIXES = [
    "do", "terra", "secret", "dungeon", "cosmos", "osmo", "juno", "akash", "axelar", "archway",
    "kujira", "migaloo", "stride", "stars", "inj", "noble", "neutron", "celestia", "sei", "kava",
    "cre", "comdex", "andr", "orai", "pryzm", "nolus", "stafi", "swth", "cheqd", "sent",
    "decentr", "chihuahua", "dydx"
  ];

  function installPortfolioChainFallbacks() {
    PORTFOLIO_CHAIN_FALLBACKS.forEach(function (item) {
      var chainID = item[0];
      if (isRemovedNetwork(chainID)) return;
      var chain = {
        chainID: chainID,
        name: item[1],
        networkType: "mainnet",
        lcd: item[7],
        api: item[7],
        rpc: item[7],
        gasAdjustment: 1.75,
        gasPrices: {},
        prefix: item[2],
        coinType: item[3],
        baseAsset: item[4],
        symbol: item[5],
        cmcSymbol: item[5],
        icon: item[8],
        alliance: false,
        channels: {},
      };
      CHAINS[chainID] = Object.assign({}, chain, CHAINS[chainID] || {}, {
        lcd: (CHAINS[chainID] && CHAINS[chainID].lcd) || chain.lcd,
        api: (CHAINS[chainID] && CHAINS[chainID].api) || chain.api,
        rpc: (CHAINS[chainID] && CHAINS[chainID].rpc) || chain.rpc,
        prefix: (CHAINS[chainID] && CHAINS[chainID].prefix) || chain.prefix,
        coinType: String((CHAINS[chainID] && CHAINS[chainID].coinType) || chain.coinType),
        baseAsset: (CHAINS[chainID] && CHAINS[chainID].baseAsset) || chain.baseAsset,
        symbol: (CHAINS[chainID] && CHAINS[chainID].symbol) || chain.symbol,
      });
      if (!NATIVE_TOKENS[chainID]) {
        NATIVE_TOKENS[chainID] = {
          denom: item[4],
          id: chainID + ":" + item[4],
          token: item[4],
          symbol: item[5],
          name: item[1],
          decimals: item[6],
          chainID: chainID,
          verified: true,
        };
      }
    });
  }

  installPortfolioChainFallbacks();

  var EXTRA_NATIVE_TOKENS = {
    "Do-Chain:udodx": { denom: "udodx", id: "Do-Chain:udodx", token: "udodx", symbol: "DODx", name: "DODx", decimals: 6, chainID: "Do-Chain", verified: true, icon: "/do-logo.jpg" },
  };

  var CONTRACT_TOKENS = {
    "columbus-5": [{
      contract: L2_CONTRACT,
      token: L2_CONTRACT,
      denom: L2_CONTRACT,
      id: "columbus-5:" + L2_CONTRACT,
      symbol: "BAKED",
      name: "Baked Coin",
      decimals: 6,
      chainID: "columbus-5",
      verified: true,
      standard: "cw20",
      icon: "/do-logo.jpg",
    }],
    "ethereum-mainnet": [{
      contract: WETH_CONTRACT,
      token: WETH_CONTRACT,
      denom: WETH_CONTRACT,
      id: "ethereum-mainnet:" + WETH_CONTRACT.toLowerCase(),
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
      chainID: "ethereum-mainnet",
      verified: true,
      standard: "erc20",
    }],
  };

  var TOKEN_CATALOG_PATHS = {
    chains: "/station-assets/chains.json?v=20260620chainAudit2",
    denoms: "/station-assets/denoms.json?v=20260620chainAudit2",
    buildDenoms: "/station-assets/build/denoms.json?v=20260620chainAudit2",
    cw20: "/station-assets/build/cw20/tokens.json?v=20260620chainAudit2",
    prices: "/station-assets/api/prices?v=20260620chainAudit2",
  };
  var dynamicChains = {};
  var chainCatalogRunning = false;
  var chainCatalogLoaded = false;
  var portfolioRunning = false;
  var portfolioRefreshTimer = 0;
  var runTimer = 0;
  var lastRunStartedAt = 0;
  var rerunRequested = false;
  var lastPortfolioWalletKey = "";
  var lastPortfolioRefreshStartedAt = 0;
  var activePortfolioWalletKey = "";
  var pendingPortfolioRefresh = false;
  var pendingPortfolioForceRefresh = false;
  var providerWallet = null;
  var providerSyncRunning = false;
  var providerSyncAt = 0;

  function shouldRunHere() {
    try {
      var protocol = window.location.protocol;
      if (protocol === "chrome-extension:" || protocol === "moz-extension:") return true;
      if (protocol !== "https:" && protocol !== "http:") return false;
      var host = window.location.hostname.toLowerCase();
      return (
        host === "do-wallet.com" ||
        host === "www.do-wallet.com" ||
        host.endsWith(".do-wallet.com") ||
        host === "do-chain.com" ||
        host === "www.do-chain.com" ||
        host.endsWith(".do-chain.com")
      );
    } catch (error) {
      return false;
    }
  }

  if (!shouldRunHere()) return;

  function markStatus(stage, details) {
    try {
      var root = document.documentElement;
      if (!root) return;
      root.setAttribute("data-dochain-multichain-assets", stage);
      root.setAttribute("data-dochain-multichain-assets-at", String(Date.now()));
      if (details && typeof details === "object") {
        Object.keys(details).forEach(function (key) {
          root.setAttribute("data-dochain-multichain-" + key, String(details[key]));
        });
      }
    } catch (error) {}
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function websiteLCDProxy(chainID) {
    try {
      if (!chainID) return "";
      var protocol = window.location.protocol;
      if (protocol !== "https:" && protocol !== "http:") return "";
      var host = window.location.hostname.toLowerCase();
      var isWalletHost = (
        host === "do-wallet.com" ||
        host === "www.do-wallet.com" ||
        host.endsWith(".do-wallet.com") ||
        host === "localhost" ||
        host === "127.0.0.1"
      );
      if (!isWalletHost) return "";
      return window.location.origin + "/station-assets/api/lcd/" + encodeURIComponent(String(chainID));
    } catch (error) {
      return "";
    }
  }

  function withWebsiteLCDProxy(chainID, chain) {
    if (!isObject(chain)) return chain;
    var proxy = websiteLCDProxy(chainID);
    if (!proxy) return chain;
    var next = Object.assign({}, chain);
    if (next.lcd && next.lcd !== proxy) next.upstreamLcd = next.upstreamLcd || next.lcd;
    if (next.api && next.api !== proxy) next.upstreamApi = next.upstreamApi || next.api;
    next.lcd = proxy;
    next.api = proxy;
    return next;
  }

  function registryLCD(chainID, chain) {
    return websiteLCDProxy(chainID) || (chain && (chain.lcd || chain.api || chain.rpc)) || "";
  }

  function isRemovedNetwork(chainID) {
    return REMOVED_NETWORKS.indexOf(String(chainID || "")) >= 0;
  }

  function canonicalNetwork(chainID) {
    var raw = String(chainID || "").trim();
    var lower = raw.toLowerCase();
    if (!raw) return "";
    if (lower === "dochain-1" || lower === "do-main-1" || lower === "dochain" || lower === "do" || lower === "888") return "Do-Chain";
    if (lower === "lunc" || lower === "terra-classic") return "columbus-5";
    if (lower === "luna") return "phoenix-1";
    if (lower === "terra" || lower === "330") return "";
    if (lower === "0" || lower === "btc" || lower === "bitcoin") return "bitcoin-mainnet";
    if (lower === "60" || lower === "eth" || lower === "evm" || lower === "ethereum" || lower === "eip155:1") return "ethereum-mainnet";
    if (lower === "501" || lower === "sol" || lower === "solana") return "solana-mainnet";
    if (lower === "529" || lower === "secret") return "secret-4";
    if (lower === "dungeon" || lower === "dgn") return "dungeon-1";
    if (lower === "118" || lower === "cosmos") return "cosmoshub-4";
    if (lower === "osmo") return "osmosis-1";
    if (lower === "mainnet-3" || lower === "decentr-mainnet-1" || lower === "decentr" || lower === "dec") return "mainnet-3";
    if (lower === "1815" || lower === "ada" || lower === "cardano") return "cardano-mainnet";
    if (lower === "195" || lower === "trx" || lower === "tron") return "tron-mainnet";
    if (lower === "144" || lower === "xrp") return "xrp-ledger-mainnet";
    return raw;
  }

  function liveChainOverrides(chainID, chain) {
    if (!isObject(chain)) return chain;
    var next = Object.assign({}, chain);
    if (chainID === "Do-Chain") {
      next.lcd = "https://do-chain.com";
      next.api = "https://do-chain.com";
      next.rpc = "https://do-chain.com/rpc";
      next.prefix = next.prefix || "do";
      next.coinType = next.coinType || "888";
      next.baseAsset = next.baseAsset || "udo";
      next.icon = "/do-logo.jpg";
    } else if (chainID === "secret-4") {
      next.lcd = "https://rest.lavenderfive.com:443/secretnetwork";
      next.api = "https://rest.lavenderfive.com:443/secretnetwork";
      next.rpc = next.rpc || "https://rpc.lavenderfive.com:443/secretnetwork";
    } else if (chainID === "dungeon-1") {
      next.lcd = "https://api.dungeongames.io";
      next.api = "https://api.dungeongames.io";
      next.rpc = next.rpc || "https://rpc.dungeongames.io";
      next.prefix = next.prefix || "dungeon";
      next.coinType = next.coinType || "118";
      next.baseAsset = next.baseAsset || "udgn";
    }
    return withWebsiteLCDProxy(chainID, next);
  }

  function registryStorageBlocked(key) {
    return LEGACY_REGISTRY_KEYS[key] && window.__DO_WALLET_DISABLE_LEGACY_REGISTRY_WRITES__ === true;
  }

  function readJSON(key, fallback) {
    if (registryStorageBlocked(key)) return fallback;
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    if (registryStorageBlocked(key)) return false;
    try {
      var next = JSON.stringify(value);
      if (window.localStorage.getItem(key) === next) return false;
      window.localStorage.setItem(key, next);
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeJSON(key) {
    if (registryStorageBlocked(key)) return false;
    try {
      if (window.localStorage.getItem(key) === null) return false;
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearPortfolioSnapshotsOnceForSchema() {
    if (readJSON(SNAPSHOT_RESET_KEY, "") === SNAPSHOT_SCHEMA_VERSION) return false;
    var changed = false;
    var migrated = false;
    var snapshot = readJSON(SNAPSHOT_KEY, null);
    if (snapshotHasDisplayRows(snapshot)) {
      snapshot.schemaVersion = SNAPSHOT_SCHEMA_VERSION;
      changed = writeJSON(SNAPSHOT_KEY, snapshot) || changed;
      migrated = true;
    }
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (isObject(byWallet)) {
      Object.keys(byWallet).forEach(function (key) {
        if (!snapshotHasDisplayRows(byWallet[key])) return;
        byWallet[key].schemaVersion = SNAPSHOT_SCHEMA_VERSION;
        migrated = true;
      });
      if (migrated) changed = writeJSON(SNAPSHOTS_BY_WALLET_KEY, byWallet) || changed;
    }
    if (!migrated) {
      changed = removeJSON(SNAPSHOT_KEY) || changed;
      changed = removeJSON(SNAPSHOTS_BY_WALLET_KEY) || changed;
    }
    writeJSON(SNAPSHOT_RESET_KEY, SNAPSHOT_SCHEMA_VERSION);
    markStatus("portfolio-cache-cleared-for-schema", {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      migrated: migrated,
      removedKeys: !migrated && changed ? 2 : 0,
    });
    return changed;
  }

  function ensureOrdered(list) {
    var existing = Array.isArray(list) ? list.slice() : [];
    var seen = {};
    return PRIORITY_NETWORKS.concat(Object.keys(allChains())).concat(existing).map(canonicalNetwork).filter(function (item) {
      if (!item || isRemovedNetwork(item) || seen[item]) return false;
      if (chainCatalogLoaded && !allChains()[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function ensureNativeToken(tokens, chainID, token) {
    var current = isObject(tokens[chainID]) ? Object.assign({}, tokens[chainID]) : {};
    var native = Array.isArray(current.native) ? current.native.slice() : [];
    var tokenChainID = token.chainID || chainID;
    native = native.filter(function (item) {
      var itemChainID = item && (item.chainID || chainID);
      return item && item.id !== token.id && !(itemChainID === tokenChainID && (item.denom === token.denom || item.token === token.token));
    });
    native.unshift(Object.assign({}, token));
    current.native = native;
    if (!Array.isArray(current.cw20)) current.cw20 = [];
    if (!Array.isArray(current.cw721)) current.cw721 = [];
    tokens[chainID] = current;
  }

  function ensureContractTokens(tokens, chainID, tokenList) {
    var current = isObject(tokens[chainID]) ? Object.assign({}, tokens[chainID]) : {};
    var tokenContracts = tokenList.map(function (token) {
      return String(token.contract || token.token || "").toLowerCase();
    }).filter(Boolean);
    ["erc20", "cw20"].forEach(function (bucket) {
      var list = Array.isArray(current[bucket]) ? current[bucket].slice() : [];
      list = list.filter(function (item) {
        return tokenContracts.indexOf(String(item && (item.contract || item.token || item.denom || "")).toLowerCase()) === -1;
      });
      tokenList.filter(function (token) {
        var standard = String(token.standard || "").toLowerCase();
        return bucket === "erc20" ? standard === "erc20" : standard !== "erc20";
      }).forEach(function (token) {
        list.push(Object.assign({}, token));
      });
      current[bucket] = list;
    });
    if (!Array.isArray(current.native)) current.native = [];
    if (!Array.isArray(current.cw721)) current.cw721 = [];
    tokens[chainID] = current;
  }

  function assetCatalogUrl(path) {
    try {
      var protocol = window.location.protocol;
      if (protocol === "chrome-extension:" || protocol === "moz-extension:") {
        return "https://www.do-wallet.com" + path;
      }
    } catch (error) {}
    return path;
  }

  function assetCatalogCacheMode(path) {
    var value = String(path || "");
    if (/\/station-assets\/api\/prices(?:[?#]|$)/.test(value)) return "default";
    if (/\/station-assets\/(?:chains\.json|denoms\.json|build\/denoms\.json|build\/cw20\/tokens\.json)(?:[?#]|$)/.test(value)) return "force-cache";
    return "no-store";
  }

  function fetchJSON(path) {
    if (!window.fetch || !window.Promise) return Promise.resolve(null);
    return window.fetch(assetCatalogUrl(path), { cache: assetCatalogCacheMode(path) }).then(function (response) {
      return response && response.ok ? response.json() : null;
    }).catch(function () {
      return null;
    });
  }

  function fetchJSONTimed(path, timeoutMs) {
    if (!window.fetch || !window.Promise) return Promise.resolve(null);
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeout = window.setTimeout(function () {
      try { if (controller) controller.abort(); } catch (error) {}
    }, timeoutMs || 10000);
    return window.fetch(assetCatalogUrl(path), {
      cache: assetCatalogCacheMode(path),
      signal: controller ? controller.signal : undefined,
    }).then(function (response) {
      window.clearTimeout(timeout);
      return response && response.ok ? response.json() : null;
    }).catch(function () {
      window.clearTimeout(timeout);
      return null;
    });
  }

  function postJSONTimed(path, payload, timeoutMs) {
    if (!window.fetch || !window.Promise) return Promise.resolve(null);
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeout = window.setTimeout(function () {
      try { if (controller) controller.abort(); } catch (error) {}
    }, timeoutMs || 10000);
    return window.fetch(assetCatalogUrl(path), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload || {}),
      signal: controller ? controller.signal : undefined,
    }).then(function (response) {
      window.clearTimeout(timeout);
      return response && response.ok ? response.json() : null;
    }).catch(function () {
      window.clearTimeout(timeout);
      return null;
    });
  }

  var BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  var BECH32_INDEX = {};
  for (var bech32Index = 0; bech32Index < BECH32_ALPHABET.length; bech32Index += 1) {
    BECH32_INDEX[BECH32_ALPHABET.charAt(bech32Index)] = bech32Index;
  }

  function bech32Polymod(values) {
    var chk = 1;
    for (var i = 0; i < values.length; i += 1) {
      var top = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ values[i];
      if (top & 1) chk ^= 0x3b6a57b2;
      if (top & 2) chk ^= 0x26508e6d;
      if (top & 4) chk ^= 0x1ea119fa;
      if (top & 8) chk ^= 0x3d4233dd;
      if (top & 16) chk ^= 0x2a1462b3;
    }
    return chk;
  }

  function bech32HrpExpand(prefix) {
    var out = [];
    for (var i = 0; i < prefix.length; i += 1) out.push(prefix.charCodeAt(i) >> 5);
    out.push(0);
    for (var j = 0; j < prefix.length; j += 1) out.push(prefix.charCodeAt(j) & 31);
    return out;
  }

  function bech32Decode(address) {
    var value = clean(address).toLowerCase();
    var separator = value.lastIndexOf("1");
    if (separator <= 0 || separator + 7 > value.length) return null;
    var prefix = value.slice(0, separator);
    var data = [];
    for (var i = separator + 1; i < value.length; i += 1) {
      var word = BECH32_INDEX[value.charAt(i)];
      if (word === undefined) return null;
      data.push(word);
    }
    if (bech32Polymod(bech32HrpExpand(prefix).concat(data)) !== 1) return null;
    return { prefix: prefix, words: data.slice(0, -6) };
  }

  function bech32Encode(prefix, words) {
    var cleanPrefix = clean(prefix).toLowerCase();
    if (!cleanPrefix || !Array.isArray(words) || !words.length) return "";
    var values = bech32HrpExpand(cleanPrefix).concat(words);
    var polymod = bech32Polymod(values.concat([0, 0, 0, 0, 0, 0])) ^ 1;
    var checksum = [];
    for (var i = 0; i < 6; i += 1) checksum.push((polymod >> (5 * (5 - i))) & 31);
    return cleanPrefix + "1" + words.concat(checksum).map(function (word) {
      return BECH32_ALPHABET.charAt(word);
    }).join("");
  }

  function reencodeBech32Address(address, prefix) {
    var decoded = bech32Decode(address);
    if (!decoded) return "";
    return bech32Encode(prefix, decoded.words);
  }

  function walletFromPayload(payload) {
    if (!isObject(payload)) return null;
    return isObject(payload.wallet) ? payload.wallet : payload;
  }

  function activeWallet() {
    var selectedWallet = walletFromPayload(readJSON(SELECTED_WALLET_KEY, null));
    if (selectedWallet) return selectedWallet;
    var storedUser = walletFromPayload(readJSON("user", null));
    if (storedUser) return storedUser;
    var recovered = recoveredWallets()
      .map(walletFromPayload)
      .filter(Boolean)
      .sort(function (left, right) {
        var leftScore = Number(left.walletPriority || 0) + (left.validatorWallet ? 2000 : 0) + (left.adminWallet ? 1000 : 0);
        var rightScore = Number(right.walletPriority || 0) + (right.validatorWallet ? 2000 : 0) + (right.adminWallet ? 1000 : 0);
        return rightScore - leftScore;
      });
    if (recovered.length) return recovered[0];
    return (
      providerWallet ||
      walletFromPayload(readJSON(BRIDGE_KEY, null)) ||
      walletFromPayload(readJSON(AUTH_KEY, null)) ||
      null
    );
  }

  function walletName(wallet) {
    if (!isObject(wallet)) return "";
    return clean(wallet.name || wallet.walletName || wallet.label || wallet.id || wallet.accountName);
  }

  function visibleWalletName() {
    var ignored = /^(send|receive|swap|history|settings|copy|copied|qr|back|manage|dashboard|buy|sell|assets|activity|connect|connect wallet|edit validator|do chain|bitcoin|ethereum|solana|terra|lunc|luna)$/i;
    return Array.prototype.slice.call(document.querySelectorAll("header button, header [role='button'], header *, button, [role='button']"))
      .map(function (node) {
        var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { top: 999, left: 0, width: 0, height: 0 };
        return { text: clean(node.textContent).replace(/\s+/g, " "), rect: rect };
      })
      .filter(function (entry) {
        return entry.text && entry.text.length >= 2 && entry.text.length <= 42 && entry.rect.top >= 0 && entry.rect.top < 170 && entry.rect.width > 40 && !ignored.test(entry.text);
      })
      .sort(function (a, b) { return b.rect.left - a.rect.left; })[0]?.text || "";
  }

  function bridgeRequest(method, params) {
    return new Promise(function (resolve, reject) {
      var id = "do-wallet-assets-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      var timeout = window.setTimeout(function () {
        window.removeEventListener("message", onMessage);
        reject(new Error("No Do-Wallet bridge response was received."));
      }, 9000);
      function onMessage(event) {
        if (event.source !== window || event.origin !== window.location.origin) return;
        var message = event.data;
        if (!message || message.target !== PAGE_TARGET || message.id !== id) return;
        window.clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        if (message.success) resolve(message.result);
        else reject(new Error(String(message.error && (message.error.message || message.error) || "Do-Wallet bridge request failed.")));
      }
      window.addEventListener("message", onMessage);
      window.postMessage({
        target: CONTENT_TARGET,
        type: "DO_WALLET_DAPP_REQUEST",
        id: id,
        method: method,
        params: Array.isArray(params) ? params : [],
      }, window.location.origin);
    });
  }

  function mergeAddressMaps(left, right) {
    var out = {};
    [left, right].forEach(function (map) {
      if (!isObject(map)) return;
      Object.keys(map).forEach(function (key) {
        var chainID = canonicalNetwork(key);
        var value = normalizeAddressForChain(chainID, map[key]);
        if (chainID && isPublicAddress(value)) out[chainID] = value;
      });
    });
    return Object.keys(out).length ? out : undefined;
  }

  function normalizeBridgeWallet(result, chainID) {
    var wallet = Array.isArray(result)
      ? { address: result[0] || "", addresses: result[0] ? { "Do-Chain": result[0] } : {} }
      : isObject(result && result.wallet)
        ? result.wallet
        : isObject(result)
          ? result
          : {};
    if (!isObject(wallet)) return null;
    var addresses = mergeAddressMaps(wallet.addresses, wallet.addressMap);
    var address = clean(
      (addresses && (addresses[chainID] || addresses["Do-Chain"])) ||
      wallet.address ||
      wallet.doAddress ||
      wallet.doChainAddress ||
      (addresses && Object.keys(addresses).map(function (key) { return addresses[key]; }).find(Boolean))
    );
    if (address && !addresses) addresses = { "Do-Chain": address };
    if (!address && addresses) address = clean(Object.keys(addresses).map(function (key) { return addresses[key]; }).find(Boolean));
    if (!address && !addresses) return null;
    return {
      name: walletName(wallet) || visibleWalletName() || "Do-Wallet",
      walletName: walletName(wallet) || visibleWalletName() || "Do-Wallet",
      address: address || undefined,
      addresses: addresses,
      addressMap: addresses,
      source: "do-wallet-extension",
      walletSource: "extension-content-bridge",
      syncedFromExtension: true,
      updatedAt: Date.now(),
    };
  }

  function mergeWallet(left, right) {
    left = isObject(left) ? left : {};
    right = isObject(right) ? right : {};
    var addresses = mergeAddressMaps(left.addresses || left.addressMap, right.addresses || right.addressMap);
    var next = Object.assign({}, left, right);
    if (addresses) {
      next.addresses = addresses;
      next.addressMap = addresses;
    }
    next.name = walletName(right) || walletName(left) || visibleWalletName() || "Do-Wallet";
    next.walletName = next.name;
    next.address = clean(right.address || left.address || (addresses && Object.keys(addresses).map(function (key) { return addresses[key]; }).find(Boolean))) || undefined;
    return next;
  }

  function persistProviderWallet(wallet) {
    if (!isObject(wallet)) return;
    var existing = walletFromPayload(readJSON(BRIDGE_KEY, null)) || walletFromPayload(readJSON(AUTH_KEY, null)) || {};
    providerWallet = mergeWallet(existing, wallet);
    var payload = {
      source: "do-wallet-extension",
      wallet: providerWallet,
      updatedAt: Date.now(),
    };
    writeJSON(BRIDGE_KEY, payload);
    writeJSON(AUTH_KEY, Object.assign({}, payload, { expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
    dispatchUpdates();
  }

  function requestProviderWallet(force) {
    if (!window.Promise || !shouldRunHere()) return;
    if (walletFromPayload(readJSON(SELECTED_WALLET_KEY, null))) {
      markStatus("provider-wallet-skipped-selected");
      return;
    }
    if (providerSyncRunning) return;
    if (!force && Date.now() - providerSyncAt < 15000) return;
    providerSyncRunning = true;
    providerSyncAt = Date.now();
    bridgeRequest("connect", ["Do-Chain"])
      .then(function (result) {
        var wallet = normalizeBridgeWallet(result, "Do-Chain");
        if (wallet) persistProviderWallet(wallet);
        markStatus(wallet ? "provider-wallet-loaded" : "provider-wallet-empty");
      })
      .catch(function (error) {
        markStatus("provider-wallet-error", { error: String(error && error.message || error).slice(0, 100) });
      })
      .then(function () {
        providerSyncRunning = false;
      });
  }

  function isPublicAddress(value) {
    var address = clean(value);
    return Boolean(
      bech32Decode(address) ||
      isEth(address) ||
      isBtc(address) ||
      isSol(address) ||
      isCardano(address) ||
      isTron(address) ||
      isXrp(address)
    );
  }

  function deriveDoAddressFromLegacyTerra(value) {
    value = clean(value);
    if (isDo(value)) return value;
    if (!isTerra(value)) return "";
    var derived = reencodeBech32Address(value, "do");
    return isDo(derived) ? derived : "";
  }

  function normalizeAddressForChain(chainID, value) {
    var address = clean(value);
    if (!address) return "";
    if (chainID === "Do-Chain") return isDo(address) ? address : "";
    if (chainID === "columbus-5" || chainID === "phoenix-1") return isTerra(address) ? address : "";
    return address;
  }

  function collectRawAddresses(value) {
    var out = [];
    var seen = {};
    function add(address) {
      address = clean(address);
      if (!isPublicAddress(address)) return;
      var key = address.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(address);
    }
    function scan(node, depth) {
      if (depth > 6 || node === null || node === undefined) return;
      if (typeof node === "string") {
        add(node);
        return;
      }
      if (Array.isArray(node)) {
        node.slice(0, 120).forEach(function (item) { scan(item, depth + 1); });
        return;
      }
      if (!isObject(node)) return;
      Object.keys(node).slice(0, 180).forEach(function (key) {
        if (/word|mnemonic|seed|private|encrypted|cipher|password/i.test(key)) return;
        scan(node[key], depth + 1);
      });
    }
    scan(value, 0);
    return out;
  }

  function walletIdentityKeys(wallet) {
    if (!isObject(wallet)) return [];
    var addresses = isObject(wallet.addresses) ? wallet.addresses : {};
    var keys = [wallet.address, wallet.name, wallet.walletName, wallet.label]
      .concat(Object.keys(addresses).map(function (key) { return addresses[key]; }))
      .map(function (value) { return clean(value).toLowerCase(); })
      .filter(Boolean);
    return keys.filter(function (key, index) { return keys.indexOf(key) === index; });
  }

  function chainSupportsCosmosQueries(chain) {
    if (!isObject(chain)) return false;
    if (chain.evm || chain.chainNamespace === "eip155" || chain.chainNamespace === "bip122" || chain.chainNamespace === "solana") return false;
    return Boolean(chain.prefix && (chain.lcd || chain.api || chain.rpc || chain.chainID === "Do-Chain"));
  }

  function chainSupportsEvmQueries(chain) {
    return Boolean(chain && (chain.evm || chain.chainNamespace === "eip155" || clean(chain.prefix) === "0x"));
  }

  function chainSupportsBtcQueries(chainID, chain) {
    return chainID === "bitcoin-mainnet" || (chain && chain.chainNamespace === "bip122");
  }

  function chainSupportsSolQueries(chainID, chain) {
    return chainID === "solana-mainnet" || (chain && chain.chainNamespace === "solana");
  }

  function chainSupportsCardanoQueries(chainID, chain) {
    return chainID === "cardano-mainnet" || (chain && (chain.chainNamespace === "cardano" || clean(chain.prefix).toLowerCase() === "addr"));
  }

  function chainSupportsTronQueries(chainID, chain) {
    return chainID === "tron-mainnet" || (chain && (chain.chainNamespace === "tron" || clean(chain.prefix).toLowerCase() === "t"));
  }

  function chainSupportsXrpQueries(chainID, chain) {
    return chainID === "xrp-ledger-mainnet" || (chain && (chain.chainNamespace === "xrpl" || clean(chain.prefix).toLowerCase() === "r"));
  }

  function buildWalletAddressMap(wallet) {
    if (!isObject(wallet)) return {};
    var chains = allChains();
    var map = {};
    var stored = isObject(wallet.addresses) ? wallet.addresses : {};
    var raw = collectRawAddresses(wallet);
    Object.keys(stored).forEach(function (key) {
      var chainID = canonicalNetwork(key);
      var address = normalizeAddressForChain(chainID, stored[key]);
      if (chainID && chains[chainID] && isPublicAddress(address)) map[chainID] = address;
    });
    raw.forEach(function (address) {
      if (isDo(address)) map["Do-Chain"] = map["Do-Chain"] || address;
      else if (isTerra(address)) {
        map["columbus-5"] = map["columbus-5"] || address;
        map["phoenix-1"] = map["phoenix-1"] || address;
        map["Do-Chain"] = map["Do-Chain"] || deriveDoAddressFromLegacyTerra(address);
      } else if (isSecret(address)) map["secret-4"] = map["secret-4"] || address;
      else if (isDungeon(address)) map["dungeon-1"] = map["dungeon-1"] || address;
      else if (isCosmos(address)) map["cosmoshub-4"] = map["cosmoshub-4"] || address;
      else if (isOsmo(address)) map["osmosis-1"] = map["osmosis-1"] || address;
      else if (isEth(address)) map["ethereum-mainnet"] = map["ethereum-mainnet"] || address;
      else if (isBtc(address)) map["bitcoin-mainnet"] = map["bitcoin-mainnet"] || address;
      else if (isSol(address)) map["solana-mainnet"] = map["solana-mainnet"] || address;
      else if (isCardano(address)) map["cardano-mainnet"] = map["cardano-mainnet"] || address;
      else if (isTron(address)) map["tron-mainnet"] = map["tron-mainnet"] || address;
      else if (isXrp(address)) map["xrp-ledger-mainnet"] = map["xrp-ledger-mainnet"] || address;
    });

    var decoded = raw.map(function (address) {
      return { address: address, decoded: bech32Decode(address) };
    }).filter(function (entry) { return entry.decoded; });
    var sourceByPrefix = {};
    var sourceByChainID = {};
    var sourceByCoinType = {};
    var coinTypeByPrefix = {
      do: "888",
      terra: "330",
      secret: "529",
      dungeon: "118",
      cosmos: "118",
      osmo: "118",
      juno: "118",
      akash: "118",
      inj: "60",
      kujira: "118",
      stars: "118",
      stride: "118",
      noble: "118",
      neutron: "118",
      celestia: "118",
      archway: "118",
      axelar: "118",
      andr: "118",
      migaloo: "118",
      sei: "118",
      kava: "459",
      cre: "118",
      comdex: "118",
      orai: "118",
      pryzm: "118",
      nolus: "118",
      stafi: "118",
      dydx: "118",
      chihuahua: "118",
      cheqd: "118",
      sent: "118",
      decentr: "118",
      swth: "118",
    };
    function rememberBech32Source(chainID, decodedValue) {
      var chain = chains[chainID];
      if (!chain || !decodedValue) return;
      var prefix = clean(chain.prefix).toLowerCase();
      var coinType = clean(chain.coinType);
      if (prefix && !sourceByPrefix[prefix]) sourceByPrefix[prefix] = decodedValue;
      if (chainID && !sourceByChainID[chainID]) sourceByChainID[chainID] = decodedValue;
      if (coinType && !sourceByCoinType[coinType]) sourceByCoinType[coinType] = decodedValue;
    }
    decoded.forEach(function (entry) {
      var decodedValue = entry.decoded;
      var prefix = clean(decodedValue && decodedValue.prefix).toLowerCase();
      if (!prefix) return;
      if (!sourceByPrefix[prefix]) sourceByPrefix[prefix] = decodedValue;
      if (coinTypeByPrefix[prefix] && !sourceByCoinType[coinTypeByPrefix[prefix]]) {
        sourceByCoinType[coinTypeByPrefix[prefix]] = decodedValue;
      }
      Object.keys(chains).forEach(function (chainID) {
        var chain = chains[chainID];
        if (chain && clean(chain.prefix).toLowerCase() === prefix) rememberBech32Source(chainID, decodedValue);
      });
    });
    var genericBech32Source = decoded.map(function (entry) {
      return entry.decoded;
    }).find(function (decodedValue) {
      return RECEIVE_BECH32_PREFIXES.indexOf(clean(decodedValue && decodedValue.prefix).toLowerCase()) >= 0;
    }) || (decoded[0] && decoded[0].decoded);
    var ethAddress = raw.find(isEth);
    var btcAddress = raw.find(isBtc);
    var solAddress = raw.find(function (address) {
      return isSol(address) && !bech32Decode(address);
    });
    var cardanoAddress = raw.find(isCardano);
    var tronAddress = raw.find(isTron);
    var xrpAddress = raw.find(isXrp);

    Object.keys(chains).forEach(function (chainID) {
      var chain = chains[chainID];
      if (!chain || chain.networkType === "testnet") return;
      var prefix = clean(chain.prefix);
      if (map[chainID]) return;
      if (chainSupportsEvmQueries(chain)) {
        if (ethAddress) map[chainID] = ethAddress;
        return;
      }
      if (chainSupportsBtcQueries(chainID, chain)) {
        if (btcAddress) map[chainID] = btcAddress;
        return;
      }
      if (chainSupportsSolQueries(chainID, chain)) {
        if (solAddress) map[chainID] = solAddress;
        return;
      }
      if (chainSupportsCardanoQueries(chainID, chain)) {
        if (cardanoAddress) map[chainID] = cardanoAddress;
        return;
      }
      if (chainSupportsTronQueries(chainID, chain)) {
        if (tronAddress) map[chainID] = tronAddress;
        return;
      }
      if (chainSupportsXrpQueries(chainID, chain)) {
        if (xrpAddress) map[chainID] = xrpAddress;
        return;
      }
      if (prefix) {
        var coinType = clean(chain.coinType);
        var sourceBech32 =
          sourceByChainID[chainID] ||
          sourceByPrefix[prefix.toLowerCase()] ||
          (coinType && sourceByCoinType[coinType]) ||
          (RECEIVE_BECH32_PREFIXES.indexOf(prefix.toLowerCase()) >= 0 && genericBech32Source);
        if (sourceBech32) map[chainID] = bech32Encode(prefix, sourceBech32.words);
      }
    });

    var historical = historicalAddressMapForWallet(wallet);
    Object.keys(historical).forEach(function (chainID) {
      if (!map[chainID]) map[chainID] = historical[chainID];
    });

    return map;
  }

  function recoveredWallets() {
    var payload = readJSON(RECOVERED_WALLETS_KEY, null);
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.wallets)) return payload.wallets;
    return [];
  }

  function addSnapshotAddress(out, chainID, value) {
    var chains = allChains();
    chainID = canonicalNetwork(chainID);
    var address = normalizeAddressForChain(chainID, value);
    if (!chainID || !chains[chainID] || !isPublicAddress(address)) return;
    if (!out[chainID]) out[chainID] = address;
  }

  function addSnapshotAddressContainer(out, container) {
    if (!container) return;
    if (Array.isArray(container)) {
      container.forEach(function (entry) {
        if (!isObject(entry)) return;
        addSnapshotAddress(out, entry.chainID || entry.chainId || entry.network || entry.chain, entry.address || entry.walletAddress);
      });
      return;
    }
    if (isObject(container)) {
      Object.keys(container).forEach(function (key) {
        var value = container[key];
        if (typeof value === "string") addSnapshotAddress(out, key, value);
        else if (isObject(value)) addSnapshotAddress(out, key, value.address || value.walletAddress);
      });
    }
  }

  function snapshotBelongsToWallet(snapshot, wallet) {
    if (!isObject(snapshot) || !isObject(wallet)) return false;
    if (walletsMatchSnapshot(snapshot, wallet)) return true;
    var wanted = walletIdentityKeys(wallet);
    var snapshotKey = clean(snapshot.walletKey || "").toLowerCase();
    return Boolean(snapshotKey && wanted.indexOf(snapshotKey) >= 0);
  }

  function historicalAddressMapForWallet(wallet) {
    var out = {};
    function add(snapshot) {
      if (!snapshotBelongsToWallet(snapshot, wallet)) return;
      addSnapshotAddressContainer(out, snapshot.allAddresses);
      addSnapshotAddressContainer(out, snapshot.activeAddresses);
      addSnapshotAddressContainer(out, snapshot.addresses);
    }

    add(readJSON(SNAPSHOT_KEY, null));
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (isObject(byWallet)) {
      Object.keys(byWallet).forEach(function (key) {
        add(byWallet[key]);
      });
    }
    return out;
  }

  function collectDoChainAddresses(wallet, addressMap) {
    var seen = {};
    var priorityAddresses = [];
    var addresses = [];
    function add(value, priority) {
      value = clean(value);
      if (!isDo(value)) return;
      var key = value.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      (priority ? priorityAddresses : addresses).push(value);
    }
    function addLegacy(value) {
      var derived = deriveDoAddressFromLegacyTerra(value);
      if (derived) add(derived, true);
    }
    if (isObject(addressMap)) {
      add(addressMap["Do-Chain"], true);
      Object.keys(addressMap).forEach(function (key) { addLegacy(addressMap[key]); });
    }
    collectRawAddresses(wallet).forEach(function (address) {
      add(address);
      addLegacy(address);
    });
    return priorityAddresses.concat(addresses).slice(0, 96);
  }

  function portfolioWalletCandidates(activeWallet) {
    var out = [];
    var seen = {};
    function add(payload) {
      var wallet = walletFromPayload(payload);
      if (!isObject(wallet)) return;
      patchWallet(wallet);
      var addressMap = wallet.publicAddressMapOnly === true
        ? cleanAddressMapForSnapshot(wallet.addressMap || wallet.addresses || {})
        : buildWalletAddressMap(wallet);
      if (!Object.keys(addressMap).length && !collectRawAddresses(wallet).length) return;
      wallet.addresses = Object.assign({}, isObject(wallet.addresses) ? wallet.addresses : {}, addressMap);
      wallet.addressMap = Object.assign({}, isObject(wallet.addressMap) ? wallet.addressMap : {}, addressMap);
      var raw = collectRawAddresses(wallet);
      var key = walletIdentityKeys(wallet).join("|") || raw.slice(0, 12).join("|") || walletName(wallet);
      key = clean(key).toLowerCase();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(wallet);
    }
    add(activeWallet);
    add(readJSON(SELECTED_WALLET_KEY, null));
    add(readJSON("user", null));
    add(readJSON(BRIDGE_KEY, null));
    add(readJSON(AUTH_KEY, null));
    recoveredWallets().forEach(add);
    var keys = readJSON("keys", null);
    if (Array.isArray(keys)) keys.forEach(add);
    else if (keys && Array.isArray(keys.wallets)) keys.wallets.forEach(add);
    localStoragePublicWalletCandidates().forEach(add);
    return out;
  }

  function chainIDsForPublicAddress(address) {
    address = clean(address);
    if (!address) return [];
    if (isDo(address)) return ["Do-Chain"];
    if (isTerra(address)) return ["columbus-5", "phoenix-1"];
    if (isSecret(address)) return ["secret-4"];
    if (isDungeon(address)) return ["dungeon-1"];
    if (isCosmos(address)) return ["cosmoshub-4"];
    if (isOsmo(address)) return ["osmosis-1"];
    if (/^akash1/i.test(address)) return ["akashnet-2"];
    if (/^juno1/i.test(address)) return ["juno-1"];
    if (/^kujira1/i.test(address)) return ["kaiyo-1"];
    if (/^mars1/i.test(address)) return ["mars-1"];
    if (/^swth1/i.test(address)) return ["carbon-1"];
    if (/^cheqd1/i.test(address)) return ["cheqd-mainnet-1"];
    if (/^chihuahua1/i.test(address)) return ["chihuahua-1"];
    if (/^archway1/i.test(address)) return ["archway-1"];
    if (/^axelar1/i.test(address)) return ["axelar-dojo-1"];
    if (/^cre1/i.test(address)) return ["crescent-1"];
    if (/^decentr1/i.test(address)) return ["decentr-3"];
    if (/^sei1/i.test(address)) return ["pacific-1"];
    if (/^stride1/i.test(address)) return ["stride-1"];
    if (/^noble1/i.test(address)) return ["noble-1"];
    if (/^neutron1/i.test(address)) return ["neutron-1"];
    if (/^stars1/i.test(address)) return ["stargaze-1"];
    if (/^migaloo1/i.test(address)) return ["migaloo-1"];
    if (/^kava1/i.test(address)) return ["kava_2222-10"];
    if (/^orai1/i.test(address)) return ["Oraichain"];
    if (/^pryzm1/i.test(address)) return ["pryzm-1"];
    if (/^nolus1/i.test(address)) return ["pirin-1"];
    if (/^stafi1/i.test(address)) return ["stafihub-1"];
    if (/^dydx1/i.test(address)) return ["dydx-mainnet-1"];
    if (/^sent1/i.test(address)) return ["sentinelhub-2"];
    if (/^andr1/i.test(address)) return ["andromeda-1"];
    if (isEth(address)) return [
      "ethereum-mainnet",
      "bnb-smart-chain-mainnet",
      "polygon-mainnet",
      "base-mainnet",
      "arbitrum-one",
      "avalanche-c-chain",
      "optimism-mainnet",
    ];
    if (isBtc(address)) return ["bitcoin-mainnet"];
    if (isCardano(address)) return ["cardano-mainnet"];
    if (isTron(address)) return ["tron-mainnet"];
    if (isXrp(address)) return ["xrp-ledger-mainnet"];
    if (isSol(address)) return ["solana-mainnet"];
    return [];
  }

  function collectPublicAddressesFromText(value) {
    var text = clean(value);
    if (!text || text.length > 500000) return [];
    var patterns = [
      /\b(?:do|terra|cosmos|osmo|secret|dungeon|akash|juno|kujira|mars|swth|cheqd|chihuahua|archway|axelar|cre|decentr|sei|stride|noble|neutron|stars|migaloo|kava|orai|pryzm|nolus|stafi|dydx|sent|andr)1[ac-hj-np-z02-9]{20,110}\b/gi,
      /\b0x[a-fA-F0-9]{40}\b/g,
      /\baddr1[0-9a-z]{30,160}\b/gi,
      /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g,
      /\br[1-9A-HJ-NP-Za-km-z]{24,34}\b/g,
    ];
    var out = [];
    var seen = {};
    function add(address) {
      address = clean(address);
      if (!isPublicAddress(address)) return;
      var key = address.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(address);
    }
    patterns.forEach(function (pattern) {
      var match;
      while ((match = pattern.exec(text))) add(match[0]);
    });
    return out;
  }

  function publicWalletAddressContext(key, inherited) {
    var lowerKey = String(key || "").toLowerCase();
    if (!lowerKey) return inherited === true;
    if (publicStorageSensitiveKey(lowerKey)) return false;
    if (/contract|token|denom|asset|coin|price|market|icon|logo|image|explorer|validator|operator|valoper|proposal|governance|txhash|transaction/i.test(lowerKey)) return false;
    if (/address|addresses|addressmap|wallet|wallets|account|accounts|delegator|owner|sender|receiver/i.test(lowerKey)) return true;
    if (/^(do-chain|columbus-5|phoenix-1|osmosis-1|cosmoshub-4|secret-4|dungeon-1|akashnet-2|juno-1|kaiyo-1|mars-1|archway-1|axelar-dojo-1|chihuahua-1|carbon-1|cheqd-mainnet-1|crescent-1|decentr-3|ethereum-mainnet|bnb-smart-chain-mainnet|polygon-mainnet|base-mainnet|arbitrum-one|avalanche-c-chain|optimism-mainnet|bitcoin-mainnet|solana-mainnet|cardano-mainnet|tron-mainnet|xrp-ledger-mainnet)$/i.test(lowerKey)) return inherited === true;
    return inherited === true;
  }

  function isLikelyWalletPublicAddress(address) {
    address = clean(address);
    if (!isPublicAddress(address)) return false;
    if (/^[a-z][a-z0-9]{1,19}1/i.test(address) && address.length > 64) return false;
    return true;
  }

  function collectPublicWalletAddressesFromValue(value) {
    var out = [];
    var seen = {};
    function add(address) {
      address = clean(address);
      if (!isLikelyWalletPublicAddress(address)) return;
      var key = address.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(address);
    }
    function scan(node, depth, key, allowed) {
      if (depth > 8 || node === null || node === undefined) return;
      var nextAllowed = publicWalletAddressContext(key, allowed);
      if (!nextAllowed) return;
      if (typeof node === "string") {
        add(node);
        return;
      }
      if (Array.isArray(node)) {
        node.slice(0, 250).forEach(function (item) { scan(item, depth + 1, key, nextAllowed); });
        return;
      }
      if (!isObject(node)) return;
      Object.keys(node).slice(0, 250).forEach(function (childKey) {
        scan(node[childKey], depth + 1, childKey, nextAllowed);
      });
    }
    scan(value, 0, "wallets", true);
    return out;
  }

  function publicStorageSensitiveKey(key) {
    return /(seed|mnemonic|phrase|private|password|cipher|encrypted|secret|recovery|entropy)/i.test(String(key || ""));
  }

  function publicStorageWalletKeyAllowed(key) {
    var raw = String(key || "");
    var lower = raw.toLowerCase();
    if (!raw) return false;
    if (TRUSTED_PUBLIC_STORAGE_KEYS[raw] || TRUSTED_PUBLIC_STORAGE_KEYS[lower]) return true;
    if (
      lower.indexOf("do-wallet-multichain-live") >= 0 ||
      lower.indexOf("do-wallet-portfolio") >= 0 ||
      lower.indexOf("portfolio-snapshot") >= 0 ||
      (lower.indexOf("portfolio") >= 0 && (lower.indexOf("wallet") >= 0 || lower.indexOf("address") >= 0))
    ) return true;
    if (LEGACY_REGISTRY_KEYS[raw]) return false;
    if (/custom|catalog|token|lcd|network|price|market|proposal|validator|governance/i.test(raw)) return false;
    if (/chain/i.test(raw) && lower.indexOf("wallet") < 0 && lower.indexOf("portfolio") < 0 && lower.indexOf("address") < 0) return false;
    if (publicStorageSensitiveKey(raw)) return false;
    return (
      raw === "keys" ||
      raw === "user" ||
      raw === "wallet" ||
      raw === "wallets" ||
      lower.indexOf("wallet") >= 0 ||
      lower.indexOf("account") >= 0 ||
      lower.indexOf("address") >= 0 ||
      lower.indexOf("bridge") >= 0 ||
      lower.indexOf("authority") >= 0 ||
      lower.indexOf("auth") >= 0 ||
      lower.indexOf("recovered") >= 0 ||
      lower.indexOf("portfolio") >= 0
    );
  }

  function localStoragePublicWalletCandidates() {
    var wallets = [];
    var seen = {};
    var chains = allChains();
    var priority = {
      "Do-Chain": 1,
      "columbus-5": 2,
      "osmosis-1": 3,
      "secret-4": 4,
      "dungeon-1": 5,
      "cosmoshub-4": 6,
      "juno-1": 7,
      "akashnet-2": 8,
    };
    function addAddress(address, sourceKey) {
      chainIDsForPublicAddress(address).forEach(function (chainID) {
        chainID = canonicalNetwork(chainID);
        if (!chainID || !chains[chainID] || isRemovedNetwork(chainID)) return;
        var normalized = normalizeAddressForChain(chainID, address) || clean(address);
        if (!isPublicAddress(normalized)) return;
        var key = chainID + ":" + normalized.toLowerCase();
        if (seen[key]) return;
        seen[key] = true;
        var addressMap = {};
        addressMap[chainID] = normalized;
        wallets.push({
          id: "local-public-address:" + key,
          name: "Local wallet address",
          walletName: "Local wallet address",
          address: normalized,
          addresses: addressMap,
          addressMap: addressMap,
          publicAddressMapOnly: true,
          source: "local-storage-public-addresses",
          sourceKey: sourceKey,
          priority: priority[chainID] || 100,
        });
      });
    }
    try {
      for (var index = 0; index < window.localStorage.length; index += 1) {
        var key = window.localStorage.key(index);
        if (!publicStorageWalletKeyAllowed(key)) continue;
        var raw = window.localStorage.getItem(key);
        if (!raw || raw.length > 750000) continue;
        var parsed = null;
        try { parsed = JSON.parse(raw); } catch (error) {}
        collectPublicWalletAddressesFromValue(parsed || raw).forEach(function (address) {
          addAddress(address, key);
        });
        if (!parsed) {
          collectPublicAddressesFromText(raw).forEach(function (address) {
            if (isLikelyWalletPublicAddress(address)) addAddress(address, key);
          });
        }
      }
    } catch (error) {}
    return wallets.sort(function (left, right) {
      return (Number(left.priority || 100) - Number(right.priority || 100)) ||
        clean(left.address).localeCompare(clean(right.address));
    }).slice(0, BACKEND_PORTFOLIO_MAX_WALLETS);
  }

  function normalizeDirectChainAddress(chainID, chain, value) {
    var address = normalizeAddressForChain(chainID, value);
    if (!address || !isPublicAddress(address)) return "";
    if (chainID === "Do-Chain") return isDo(address) ? address : "";
    if (chainID === "secret-4") return isSecret(address) ? address : "";
    if (chainID === "dungeon-1") return isDungeon(address) ? address : "";
    if (chainSupportsEvmQueries(chain)) return isEth(address) ? address : "";
    if (chainSupportsBtcQueries(chainID, chain)) return isBtc(address) ? address : "";
    if (chainSupportsSolQueries(chainID, chain)) return isSol(address) ? address : "";
    if (chainSupportsCardanoQueries(chainID, chain)) return isCardano(address) ? address : "";
    if (chainSupportsTronQueries(chainID, chain)) return isTron(address) ? address : "";
    if (chainSupportsXrpQueries(chainID, chain)) return isXrp(address) ? address : "";
    var decoded = bech32Decode(address);
    var expectedPrefix = clean(chain && chain.prefix).toLowerCase();
    return decoded && expectedPrefix && clean(decoded.prefix).toLowerCase() === expectedPrefix ? address : "";
  }

  function collectDirectChainAddresses(chainID, chain, wallets, addressMap, limit) {
    var out = [];
    var seen = {};
    function add(value) {
      var address = normalizeDirectChainAddress(chainID, chain, value);
      if (!address) return;
      var key = address.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(address);
    }
    if (isObject(addressMap)) add(addressMap[chainID]);
    (Array.isArray(wallets) ? wallets : []).forEach(function (wallet) {
      [wallet.addresses, wallet.addressMap].forEach(function (map) {
        if (!isObject(map)) return;
        Object.keys(map).forEach(function (key) {
          var canonical = canonicalNetwork(key);
          var lowerKey = clean(key).toLowerCase();
          var prefix = clean(chain && chain.prefix).toLowerCase();
          if (canonical === chainID || lowerKey === clean(chainID).toLowerCase() || (prefix && lowerKey === prefix)) {
            add(map[key]);
          }
        });
      });
      collectRawAddresses(wallet).forEach(function (address) {
        add(address);
      });
    });
    return out.slice(0, limit || 24);
  }

  function normalizeDenomCatalog(catalog) {
    var out = {};
    function add(key, item) {
      if (!isObject(item)) return;
      var chainID = canonicalNetwork(item.chainID || chainIDFromKey(key));
      var denom = clean(item.denom || item.token || tokenFromKey(key));
      if (!chainID || !denom || isRemovedNetwork(chainID)) return;
      out[chainID + ":" + denom] = Object.assign({}, item, {
        chainID: chainID,
        denom: denom,
        token: item.token || denom,
      });
    }
    collectCatalogEntries(catalog).forEach(function (entry) {
      add(entry.key, entry.item);
    });
    Object.keys(NATIVE_TOKENS).forEach(function (chainID) {
      var token = NATIVE_TOKENS[chainID];
      add(chainID + ":" + token.denom, token);
    });
    Object.keys(EXTRA_NATIVE_TOKENS).forEach(function (key) {
      add(key, EXTRA_NATIVE_TOKENS[key]);
    });
    Object.keys(CONTRACT_TOKENS).forEach(function (chainID) {
      CONTRACT_TOKENS[chainID].forEach(function (token) {
        add(chainID + ":" + (token.denom || token.token || token.contract), token);
      });
    });
    return out;
  }

  function mergeObjects() {
    var out = {};
    Array.prototype.slice.call(arguments).forEach(function (value) {
      if (!isObject(value)) return;
      Object.keys(value).forEach(function (key) { out[key] = value[key]; });
    });
    return out;
  }

  function tokenMeta(chainID, denom, chain, denoms) {
    chainID = canonicalNetwork(chainID) || chainID;
    denom = clean(denom);
    denoms = isObject(denoms) ? denoms : {};
    var lowerDenom = denom.toLowerCase();
    var meta = chainID === "columbus-5" && lowerDenom === "uluna" ? NATIVE_TOKENS["columbus-5"] : null;
    if (!meta && chainID === "columbus-5" && TERRA_CLASSIC_NATIVE_DENOMS[lowerDenom]) {
      meta = Object.assign({
        denom: lowerDenom,
        token: lowerDenom,
        id: chainID + ":" + lowerDenom,
        decimals: 6,
        chainID: chainID,
        verified: true,
        icon: "/img/chains/TerraClassic.svg",
      }, TERRA_CLASSIC_NATIVE_DENOMS[lowerDenom]);
    }
    if (!meta) meta = denoms[chainID + ":" + denom] || denoms[chainID + ":" + lowerDenom] || null;
    if (!meta) meta = EXTRA_NATIVE_TOKENS[chainID + ":" + denom] || EXTRA_NATIVE_TOKENS[chainID + ":" + lowerDenom] || null;
    if (!meta && denom === "wei") meta = denoms[chainID + ":eth"] || NATIVE_TOKENS[chainID];
    if (!meta && denom === "lamports") meta = denoms[chainID + ":sol"] || NATIVE_TOKENS[chainID];
    if (!meta && (denom === "sat" || denom === "sats" || denom === "satoshi")) meta = denoms[chainID + ":btc"] || NATIVE_TOKENS[chainID];
    if (!meta && chain && chain.baseAsset && lowerDenom === clean(chain.baseAsset).toLowerCase()) meta = NATIVE_TOKENS[chainID];
    if (!meta) meta = NATIVE_TOKENS[chainID];
    var decimals = Number(meta && meta.decimals);
    if (!Number.isFinite(decimals)) {
      if (denom === "wei") decimals = 18;
      else if (denom === "lamports") decimals = 9;
      else if (denom === "sat" || denom === "sats" || denom === "satoshi") decimals = 8;
      else decimals = 6;
    }
    return {
      denom: denom,
      token: (meta && (meta.token || meta.denom)) || denom,
      symbol: (meta && meta.symbol) || (chain && chain.symbol) || denom.replace(/^u/, "").toUpperCase(),
      name: (meta && meta.name) || (chain && chain.name) || denom,
      icon: (meta && meta.icon) || (chain && chain.icon) || "",
      decimals: decimals,
      contract: meta && (meta.contract || meta.tokenAddress),
    };
  }

  function atomicIntegerString(raw) {
    var value = clean(raw).replace(/,/g, "");
    if (/^\d+$/.test(value)) return value.replace(/^0+(?=\d)/, "") || "0";
    if (/^\d+\.\d+$/.test(value)) return value.split(".")[0].replace(/^0+(?=\d)/, "") || "0";
    var number = Number(value);
    if (Number.isFinite(number) && number > 0) return String(Math.floor(number));
    return "0";
  }

  function decimalString(raw, decimals) {
    var value = clean(raw).replace(/,/g, "");
    var negative = value.charAt(0) === "-";
    if (negative) value = value.slice(1);
    if (!/^\d+$/.test(value)) value = atomicIntegerString(value);
    decimals = Math.max(0, Number(decimals) || 0);
    if (decimals <= 0) return (negative ? "-" : "") + value;
    if (value.length <= decimals) value = "0".repeat(decimals - value.length + 1) + value;
    var whole = value.slice(0, -decimals) || "0";
    var fraction = value.slice(-decimals).replace(/0+$/, "");
    return (negative ? "-" : "") + (fraction ? whole + "." + fraction : whole);
  }

  function numberFromDecimal(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function readPriceEntry(prices, keys) {
    if (!isObject(prices)) return { price: 0, change: 0 };
    for (var i = 0; i < keys.length; i += 1) {
      var key = clean(keys[i]);
      if (!key) continue;
      var entry = prices[key] || prices[key.toLowerCase()] || prices[key.toUpperCase()];
      if (typeof entry === "number") return { price: entry, change: 0 };
      if (isObject(entry)) {
        var price = Number(entry.price || entry.usd || entry.value || entry.current_price);
        var change = Number(entry.change || entry.usd_24h_change || entry.price_change_percentage_24h || 0);
        if (Number.isFinite(price) && price > 0) {
          return { price: price, change: Number.isFinite(change) ? change : 0 };
        }
      }
    }
    return { price: 0, change: 0 };
  }

  function priceFor(prices, chainID, denom, symbol) {
    var keys = [chainID + ":" + denom, chainID + ":" + symbol, denom, symbol];
    var lowerDenom = clean(denom).toLowerCase();
    var lowerSymbol = clean(symbol).toLowerCase();
    if (chainID === "columbus-5" && lowerDenom === "uluna") keys.push("uluna:classic", "uluna_classic", "lunc");
    if (chainID === "phoenix-1" && lowerDenom === "uluna") keys.push("uluna:phoenix", "luna2", "luna");
    if (chainID === "Do-Chain" && lowerDenom === "udo") keys.push("do", "DO", "dt", "Do-Chain:udo");
    if (lowerDenom === "wei" || lowerSymbol === "eth") keys.push("eth", "ethereum", chainID + ":wei");
    if (lowerDenom === "lamports" || lowerSymbol === "sol") keys.push("sol", "solana");
    if (lowerDenom === "sats" || lowerDenom === "sat" || lowerSymbol === "btc") keys.push("btc", "bitcoin-mainnet:btc");
    return readPriceEntry(prices, keys);
  }

  function rawAmountPositive(raw) {
    var value = clean(raw).replace(/,/g, "");
    if (/^\d+$/.test(value)) return value.replace(/^0+/, "") !== "";
    return Number(value) > 0;
  }

  function buildAsset(chainID, chain, denom, rawAmount, prices, denoms, extra) {
    if (!rawAmountPositive(rawAmount)) return null;
    var meta = tokenMeta(chainID, denom, chain, denoms);
    var balance = decimalString(rawAmount, meta.decimals);
    var amount = numberFromDecimal(balance);
    var price = priceFor(prices, chainID, denom, meta.symbol);
    var valueUsd = amount > 0 && price.price > 0 ? amount * price.price : 0;
    var id = chainID + ":" + clean(denom).toLowerCase() + (extra && extra.category && extra.category !== "wallet" ? ":" + extra.category : "");
    return Object.assign({
      id: id,
      key: id,
      chainID: chainID,
      chainId: chainID,
      chainName: (chain && chain.name) || chainID,
      network: chainID,
      denom: denom,
      token: meta.token,
      symbol: meta.symbol,
      name: meta.name,
      icon: meta.icon,
      contract: meta.contract,
      amount: amount,
      balance: balance,
      quantity: amount,
      rawAmount: clean(rawAmount),
      decimals: meta.decimals,
      priceUsd: price.price,
      valueUsd: valueUsd,
      value: valueUsd,
      change: price.change,
      whitelisted: true,
      source: "do-wallet-multichain-live",
      category: "wallet",
      updatedAt: Date.now(),
    }, extra || {});
  }

  function aggregateCoinAssets(entries, chainID, chain, prices, denoms, category, namePrefix) {
    var totals = {};
    entries.forEach(function (coin) {
      if (!coin || !coin.denom || !rawAmountPositive(coin.amount)) return;
      var key = clean(coin.denom);
      var amount = atomicIntegerString(coin.amount);
      if (!rawAmountPositive(amount)) return;
      if (!totals[key]) totals[key] = "0";
      try {
        if (typeof BigInt === "function") totals[key] = (BigInt(totals[key]) + BigInt(amount)).toString();
        else totals[key] = String(Number(totals[key]) + Number(amount));
      } catch (error) {
        totals[key] = String(Number(totals[key]) + Number(amount));
      }
    });
    return Object.keys(totals).map(function (denom) {
      var asset = buildAsset(chainID, chain, denom, totals[denom], prices, denoms, {
        category: category,
        name: namePrefix ? namePrefix + " " + tokenMeta(chainID, denom, chain, denoms).symbol : undefined,
      });
      return asset;
    }).filter(Boolean);
  }

  function validatorAddressFromEntry(entry) {
    return clean(
      entry && (
        entry.validatorAddress ||
        entry.validator_address ||
        entry.operatorAddress ||
        entry.operator_address ||
        entry.validator ||
        entry.delegation && entry.delegation.validator_address
      )
    );
  }

  function validatorScopedCoinAsset(chainID, chain, coin, validator, address, prices, denoms, category) {
    validator = clean(validator);
    if (!coin || !validator || !coin.denom || !rawAmountPositive(coin.amount)) return null;
    var asset = buildAsset(chainID, chain, coin.denom, coin.amount, prices, denoms, {
      category: category,
      walletAddress: address,
      validatorAddress: validator,
      validator_address: validator,
      operatorAddress: validator,
      operator_address: validator,
      scope: "validator",
    });
    if (!asset) return null;
    asset.id = [
      chainID,
      clean(coin.denom).toLowerCase(),
      category,
      validator.toLowerCase(),
    ].join(":");
    asset.key = asset.id;
    asset.parentAssetKey = [
      chainID,
      clean(coin.denom).toLowerCase(),
      category,
    ].join(":");
    return asset;
  }

  function validatorRowsForDenom(rows, denom) {
    denom = clean(denom).toLowerCase();
    return (Array.isArray(rows) ? rows : []).filter(function (row) {
      return clean(row && row.denom).toLowerCase() === denom;
    });
  }

  function validatorRowsByAddress(rows) {
    var out = {};
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var validator = validatorAddressFromEntry(row);
      var key = validator.toLowerCase();
      if (!key) return;
      if (!out[key]) {
        out[key] = {
          validatorAddress: validator,
          validator_address: validator,
          operatorAddress: validator,
          operator_address: validator,
          chainID: row.chainID || row.chainId || "",
          chainId: row.chainID || row.chainId || "",
          chainName: row.chainName || "",
          walletAddress: row.walletAddress || "",
          denom: row.denom || "",
          symbol: row.symbol || "",
          amount: 0,
          quantity: 0,
          valueUsd: 0,
          value: 0,
          rows: [],
        };
      }
      out[key].amount += Number(row.amount || row.quantity || row.balance || 0) || 0;
      out[key].quantity = out[key].amount;
      out[key].valueUsd += Number(row.valueUsd || row.value || 0) || 0;
      out[key].value = out[key].valueUsd;
      out[key].balance = String(out[key].amount);
      out[key].rows.push(row);
    });
    return out;
  }

  function lcdURL(chainID, path) {
    return "/station-assets/api/lcd/" + encodeURIComponent(chainID) + path;
  }

  function chainHasKnownCw20(chainID) {
    return (CONTRACT_TOKENS[chainID] || []).some(function (token) {
      return String(token && token.standard || "").toLowerCase() === "cw20";
    });
  }

  function fetchCosmosPortfolio(chainID, chain, address, prices, denoms) {
    var bankPath = lcdURL(chainID, "/cosmos/bank/v1beta1/balances/" + encodeURIComponent(address) + "?pagination.limit=2000");
    var delegationsPath = lcdURL(chainID, "/cosmos/staking/v1beta1/delegations/" + encodeURIComponent(address) + "?pagination.limit=2000");
    var rewardsPath = lcdURL(chainID, "/cosmos/distribution/v1beta1/delegators/" + encodeURIComponent(address) + "/rewards");
    var unbondingPath = lcdURL(chainID, "/cosmos/staking/v1beta1/delegators/" + encodeURIComponent(address) + "/unbonding_delegations");
    var cw20Path = "/station-assets/api/cw20/" + encodeURIComponent(address) + "?chainID=" + encodeURIComponent(chainID);
    return Promise.all([
      fetchJSONTimed(bankPath, COSMOS_BANK_FETCH_TIMEOUT_MS),
      fetchJSONTimed(delegationsPath, COSMOS_STAKE_FETCH_TIMEOUT_MS),
      fetchJSONTimed(rewardsPath, COSMOS_STAKE_FETCH_TIMEOUT_MS),
      fetchJSONTimed(unbondingPath, COSMOS_STAKE_FETCH_TIMEOUT_MS),
      chainHasKnownCw20(chainID) ? fetchJSONTimed(cw20Path, TOKEN_FETCH_TIMEOUT_MS) : Promise.resolve([]),
    ]).then(function (responses) {
      var bank = responses[0] || {};
      var delegations = responses[1] || {};
      var rewards = responses[2] || {};
      var unbonding = responses[3] || {};
      var cw20 = Array.isArray(responses[4]) ? responses[4] : [];
      var assets = (Array.isArray(bank.balances) ? bank.balances : []).map(function (coin) {
        return buildAsset(chainID, chain, coin.denom, coin.amount, prices, denoms, {
          walletAddress: address,
          category: "wallet",
        });
      }).filter(Boolean);
      cw20.forEach(function (row) {
        var contract = row && (row.contract || row.token || row.denom);
        var amount = row && (row.balance || row.amount);
        if (!contract || !amount) return;
        var asset = buildAsset(chainID, chain, contract, amount, prices, denoms, {
          walletAddress: address,
          category: "wallet",
          contract: contract,
          standard: "cw20",
          symbol: row.symbol || undefined,
          name: row.name || undefined,
          decimals: row.decimals,
        });
        if (asset) {
          if (row.symbol) asset.symbol = row.symbol;
          if (row.name) asset.name = row.name;
          if (row.decimals !== undefined) {
            asset.decimals = Number(row.decimals);
            asset.balance = decimalString(amount, asset.decimals);
            asset.amount = numberFromDecimal(asset.balance);
            asset.quantity = asset.amount;
            asset.valueUsd = asset.amount > 0 && asset.priceUsd > 0 ? asset.amount * asset.priceUsd : 0;
            asset.value = asset.valueUsd;
          }
          assets.push(asset);
        }
      });

      var delegationEntries = Array.isArray(delegations.delegation_responses)
        ? delegations.delegation_responses.slice()
        : [];
      var rewardEntries = Array.isArray(rewards.rewards) ? rewards.rewards : [];
      var rewardValidatorAddresses = rewardEntries.map(function (entry) {
        return clean(entry && entry.validator_address);
      }).filter(Boolean);

      function finishWithDelegations(entries) {
        var stakedCoins = [];
        var validators = {};
        var validatorDelegations = [];
        var validatorRewards = [];
        var validatorUnbondings = [];
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
          if (entry && entry.balance) stakedCoins.push(entry.balance);
          var validator = validatorAddressFromEntry(entry);
          if (validator) validators[validator] = true;
          var delegationRow = validatorScopedCoinAsset(chainID, chain, entry && entry.balance, validator, address, prices, denoms, "staking");
          if (delegationRow) validatorDelegations.push(delegationRow);
        });
        rewardEntries.forEach(function (entry) {
          var validator = validatorAddressFromEntry(entry);
          (Array.isArray(entry && entry.reward) ? entry.reward : []).forEach(function (coin) {
            var rewardRow = validatorScopedCoinAsset(chainID, chain, coin, validator, address, prices, denoms, "reward");
            if (rewardRow) validatorRewards.push(rewardRow);
          });
        });
        var rewardCoins = Array.isArray(rewards.total) ? rewards.total : [];
        var unbondingCoins = [];
        (Array.isArray(unbonding.unbonding_responses) ? unbonding.unbonding_responses : []).forEach(function (entry) {
          var validator = validatorAddressFromEntry(entry);
          (Array.isArray(entry.entries) ? entry.entries : []).forEach(function (release) {
            if (release && release.balance) {
              var coin = { denom: chain.baseAsset || "udo", amount: release.balance };
              unbondingCoins.push(coin);
              var unbondingRow = validatorScopedCoinAsset(chainID, chain, coin, validator, address, prices, denoms, "unbonding");
              if (unbondingRow) validatorUnbondings.push(unbondingRow);
            }
          });
        });

        var staking = aggregateCoinAssets(stakedCoins, chainID, chain, prices, denoms, "staking", "Staked").concat(
          aggregateCoinAssets(rewardCoins, chainID, chain, prices, denoms, "reward", "Rewards"),
          aggregateCoinAssets(unbondingCoins, chainID, chain, prices, denoms, "unbonding", "Unbonding")
        ).map(function (asset) {
          asset.walletAddress = address;
          asset.validators = Object.keys(validators);
          asset.validatorCount = Object.keys(validators).length;
          asset.validatorDelegations = validatorRowsForDenom(validatorDelegations, asset.denom);
          asset.validatorDelegationsByAddress = validatorRowsByAddress(asset.validatorDelegations);
          asset.validatorRewards = validatorRowsForDenom(validatorRewards, asset.denom);
          asset.validatorRewardsByAddress = validatorRowsByAddress(asset.validatorRewards);
          asset.validatorUnbondings = validatorRowsForDenom(validatorUnbondings, asset.denom);
          asset.validatorUnbondingsByAddress = validatorRowsByAddress(asset.validatorUnbondings);
          asset.validatorBreakdown = {
            delegations: asset.validatorDelegations,
            delegationsByAddress: asset.validatorDelegationsByAddress,
            rewards: asset.validatorRewards,
            rewardsByAddress: asset.validatorRewardsByAddress,
            unbondings: asset.validatorUnbondings,
            unbondingsByAddress: asset.validatorUnbondingsByAddress,
          };
          return asset;
        });

        return { assets: assets, staking: staking, chainID: chainID, address: address };
      }

      if (chainID !== "columbus-5" && !delegationEntries.length && rewardValidatorAddresses.length) {
        return Promise.all(rewardValidatorAddresses.map(function (validator) {
          var path = lcdURL(chainID, "/cosmos/staking/v1beta1/validators/" + encodeURIComponent(validator) + "/delegations/" + encodeURIComponent(address));
          return fetchJSONTimed(path, COSMOS_STAKE_FETCH_TIMEOUT_MS).then(function (json) {
            return json && json.delegation_response ? json.delegation_response : null;
          }, function () {
            return null;
          });
        })).then(function (validatorDelegations) {
          (Array.isArray(validatorDelegations) ? validatorDelegations : []).forEach(function (entry) {
            if (entry && entry.balance) delegationEntries.push(entry);
          });
          return finishWithDelegations(delegationEntries);
        });
      }

      return finishWithDelegations(delegationEntries);
    });
  }

  function fetchEvmPortfolio(chainID, chain, address, prices, denoms) {
    var nativePath = "/station-assets/api/evm/" + encodeURIComponent(chainID) + "/address/" + encodeURIComponent(address);
    var tokenFetches = (CONTRACT_TOKENS[chainID] || []).filter(function (token) {
      return String(token.standard || "").toLowerCase() === "erc20" && isEvmContract(token.contract || token.token);
    }).map(function (token) {
      return fetchJSONTimed("/station-assets/api/evm/" + encodeURIComponent(chainID) + "/address/" + encodeURIComponent(address) + "/token/" + encodeURIComponent(token.contract || token.token), TOKEN_FETCH_TIMEOUT_MS);
    });
    return Promise.all([fetchJSONTimed(nativePath, ACCOUNT_FETCH_TIMEOUT_MS)].concat(tokenFetches)).then(function (responses) {
      var assets = [];
      responses.forEach(function (row) {
        if (!row || !row.amount) return;
        var denom = row.denom || row.token || (chain && chain.baseAsset) || "wei";
        var asset = buildAsset(chainID, chain, denom, row.amount, prices, denoms, {
          walletAddress: address,
          category: "wallet",
          symbol: row.symbol || undefined,
          name: row.name || undefined,
          decimals: row.decimals,
        });
        if (asset) {
          if (row.symbol) asset.symbol = row.symbol;
          if (row.name) asset.name = row.name;
          if (row.decimals !== undefined) {
            asset.decimals = Number(row.decimals);
            asset.balance = decimalString(row.amount, asset.decimals);
            asset.amount = numberFromDecimal(asset.balance);
            asset.quantity = asset.amount;
            asset.valueUsd = asset.amount > 0 && asset.priceUsd > 0 ? asset.amount * asset.priceUsd : 0;
            asset.value = asset.valueUsd;
          }
          assets.push(asset);
        }
      });
      return { assets: assets, staking: [], chainID: chainID, address: address };
    });
  }

  function fetchBitcoinPortfolio(chainID, chain, address, prices, denoms) {
    return fetchJSONTimed("/station-assets/api/address/" + encodeURIComponent(address), ACCOUNT_FETCH_TIMEOUT_MS).then(function (json) {
      json = json || {};
      var confirmed = Number(json.chain_stats && json.chain_stats.funded_txo_sum || 0) - Number(json.chain_stats && json.chain_stats.spent_txo_sum || 0);
      var mempool = Number(json.mempool_stats && json.mempool_stats.funded_txo_sum || 0) - Number(json.mempool_stats && json.mempool_stats.spent_txo_sum || 0);
      var sats = Math.max(0, confirmed + mempool);
      var asset = buildAsset(chainID, chain, "sats", String(Math.round(sats)), prices, denoms, {
        walletAddress: address,
        category: "wallet",
      });
      return { assets: asset ? [asset] : [], staking: [], chainID: chainID, address: address };
    });
  }

  function fetchSolanaPortfolio(chainID, chain, address, prices, denoms) {
    return fetchJSONTimed("/station-assets/api/solana/address/" + encodeURIComponent(address), ACCOUNT_FETCH_TIMEOUT_MS).then(function (row) {
      row = row || {};
      var asset = buildAsset(chainID, chain, row.denom || "lamports", row.amount || "0", prices, denoms, {
        walletAddress: address,
        category: "wallet",
        symbol: row.symbol || "SOL",
        name: row.name || "Solana",
        decimals: row.decimals !== undefined ? Number(row.decimals) : 9,
      });
      if (asset && row.decimals !== undefined) {
        asset.decimals = Number(row.decimals);
        asset.balance = decimalString(row.amount || "0", asset.decimals);
        asset.amount = numberFromDecimal(asset.balance);
        asset.quantity = asset.amount;
        asset.valueUsd = asset.amount > 0 && asset.priceUsd > 0 ? asset.amount * asset.priceUsd : 0;
        asset.value = asset.valueUsd;
      }
      return { assets: asset ? [asset] : [], staking: [], chainID: chainID, address: address };
    });
  }

  function uniqueAssets(assets) {
    var seen = {};
    return (Array.isArray(assets) ? assets : []).filter(function (asset) {
      if (!asset) return false;
      var key = [
        clean(asset.chainID || asset.chainId),
        clean(asset.category || "wallet"),
        clean(asset.denom || asset.token || asset.contract || asset.symbol).toLowerCase(),
        clean(asset.walletAddress).toLowerCase(),
      ].join(":");
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (a, b) {
      return (Number(b.valueUsd || b.value || 0) - Number(a.valueUsd || a.value || 0)) ||
        clean(a.chainName || a.chainID).localeCompare(clean(b.chainName || b.chainID)) ||
        clean(a.symbol).localeCompare(clean(b.symbol));
    });
  }

  function assetHasBalance(asset) {
    if (!asset) return false;
    var amount = Number(asset.amount || asset.quantity || asset.balance || 0);
    var value = Number(asset.valueUsd || asset.value || asset.usd || 0);
    if (Number.isFinite(amount) && amount > 0) return true;
    if (Number.isFinite(value) && value > 0) return true;
    return rawAmountPositive(asset.rawAmount || "");
  }

  function invalidDisplayToken(value) {
    value = clean(value);
    return Boolean(value && /^[0-9]+(?:\.[0-9]+)?$/.test(value));
  }

  function assetHasValidDisplay(asset) {
    if (!asset) return false;
    var symbol = clean(asset.symbol || "");
    var name = clean(asset.name || "");
    var denom = clean(asset.denom || asset.token || "");
    if (invalidDisplayToken(symbol) && invalidDisplayToken(name)) return false;
    if (invalidDisplayToken(symbol) && invalidDisplayToken(denom)) return false;
    return true;
  }

  function displayableAssets(assets) {
    return (Array.isArray(assets) ? assets : []).filter(function (asset) {
      return assetHasBalance(asset) && assetHasValidDisplay(asset);
    });
  }

  function assetCategory(asset) {
    return clean(asset && asset.category || "wallet").toLowerCase();
  }

  function rawSpendableRowsFromSnapshot(snapshot) {
    var rows = Array.isArray(snapshot && snapshot.flatSpendableAssets)
      ? snapshot.flatSpendableAssets
      : Array.isArray(snapshot && snapshot.unGroupedSpendableAssets)
        ? snapshot.unGroupedSpendableAssets
        : Array.isArray(snapshot && snapshot.rawSpendableAssets)
          ? snapshot.rawSpendableAssets
          : Array.isArray(snapshot && snapshot.spendableAssets)
            ? snapshot.spendableAssets
            : Array.isArray(snapshot && snapshot.assets)
              ? snapshot.assets
              : [];
    return displayableAssets(rows).filter(function (asset) {
      var category = assetCategory(asset);
      var symbol = clean(asset.symbol || asset.name || "");
      return category === "wallet" && !/^(staked|rewards|unbonding)\b/i.test(symbol);
    });
  }

  function spendableRowsFromSnapshot(snapshot) {
    var rows = Array.isArray(snapshot && snapshot.portfolioPanelAssets)
      ? snapshot.portfolioPanelAssets
      : Array.isArray(snapshot && snapshot.spendableAssets)
        ? snapshot.spendableAssets
        : Array.isArray(snapshot && snapshot.assets)
          ? snapshot.assets
          : Array.isArray(snapshot && snapshot.rawSpendableAssets)
            ? snapshot.rawSpendableAssets
            : [];
    var displayRows = displayableAssets(rows).filter(function (asset) {
      var category = assetCategory(asset);
      var symbol = clean(asset.symbol || asset.name || "");
      return category === "wallet" && !/^(staked|rewards|unbonding)\b/i.test(symbol);
    });
    var groupedRows = chainGroupedPortfolioAssets(displayRows);
    return groupedRows.length ? groupedRows : displayRows;
  }

  function stakingRowsFromSnapshot(snapshot) {
    var rows = Array.isArray(snapshot && snapshot.staking)
      ? snapshot.staking
      : Array.isArray(snapshot && snapshot.flatPortfolioAssets)
        ? snapshot.flatPortfolioAssets
        : Array.isArray(snapshot && snapshot.unGroupedPortfolioAssets)
          ? snapshot.unGroupedPortfolioAssets
          : Array.isArray(snapshot && snapshot.rawPortfolioAssets)
            ? snapshot.rawPortfolioAssets
            : Array.isArray(snapshot && snapshot.detailPortfolioAssets)
              ? snapshot.detailPortfolioAssets
              : Array.isArray(snapshot && snapshot.portfolioAssets)
                ? snapshot.portfolioAssets
                : Array.isArray(snapshot && snapshot.assets)
                  ? snapshot.assets
                  : [];
    return displayableAssets(rows).filter(function (asset) {
      var category = assetCategory(asset);
      var symbol = clean(asset.symbol || asset.name || "");
      return category !== "wallet" || /^(staked|rewards|unbonding)\b/i.test(symbol);
    });
  }

  function walletsMatchSnapshot(snapshot, wallet) {
    if (!isObject(snapshot) || !isObject(wallet)) return false;
    var left = walletIdentityKeys(snapshot.wallet || {});
    var right = walletIdentityKeys(wallet);
    if (!left.length || !right.length) return false;
    return left.some(function (key) { return right.indexOf(key) >= 0; });
  }

  function previousSnapshotForWallet(wallet) {
    var snapshot = readJSON(SNAPSHOT_KEY, null);
    if (walletsMatchSnapshot(snapshot, wallet)) return snapshot;
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (!isObject(byWallet)) return null;
    var keys = walletIdentityKeys(wallet);
    for (var index = 0; index < keys.length; index += 1) {
      var candidate = byWallet[keys[index]];
      if (walletsMatchSnapshot(candidate, wallet)) return candidate;
    }
    return null;
  }

  function snapshotHasDisplayRows(snapshot) {
    if (!isObject(snapshot)) return false;
    return (
      spendableRowsFromSnapshot(snapshot).length > 0 ||
      stakingRowsFromSnapshot(snapshot).length > 0 ||
      (Array.isArray(snapshot.portfolioAssets) && snapshot.portfolioAssets.length > 0)
    );
  }

  function publishCachedPortfolioSnapshot(wallet) {
    var snapshot = previousSnapshotForWallet(wallet);
    if (!snapshotHasDisplayRows(snapshot)) return false;
    if (snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
      snapshot.schemaVersion = SNAPSHOT_SCHEMA_VERSION;
      writeJSON(SNAPSHOT_KEY, snapshot);
      markStatus("portfolio-cache-skipped-version", {
        cachedVersion: "migrated",
      });
    }
    markStatus("portfolio-cache-retained-without-paint", {
      balanceAssets: spendableRowsFromSnapshot(snapshot).length,
      stakingAssets: stakingRowsFromSnapshot(snapshot).length,
    });
    return false;
  }

  function assetChainID(asset) {
    return canonicalNetwork(asset && (asset.chainID || asset.chainId || asset.network || asset.chain)) || "";
  }

  function portfolioChainID(asset) {
    var rawID = clean(asset && (asset.chainID || asset.chainId || asset.network || asset.chain));
    var canonical = canonicalNetwork(rawID);
    var raw = rawID.toLowerCase();
    var chainName = clean(asset && (asset.chainName || asset.networkName || asset.chainLabel)).toLowerCase();
    var name = clean(asset && asset.name).toLowerCase();
    var symbol = clean(asset && asset.symbol).toLowerCase();
    var denom = clean(asset && (asset.denom || asset.token || asset.contract)).toLowerCase();
    var terraClassicSymbols = {
      lunc: true,
      luna: true,
      ust: true,
      ustc: true,
      krt: true,
      myt: true,
      idt: true,
      tht: true,
      jpt: true,
      gbt: true,
      set: true,
      not: true,
      int: true,
      dkt: true,
      pht: true,
      hkt: true,
      mnt: true,
      sgt: true,
    };
    var hasTerraClassicContext =
      raw === "330" ||
      raw === "columbus-5" ||
      raw === "terra" ||
      raw === "terra-classic" ||
      raw === "lunc" ||
      (
        terraClassicSymbols[symbol] &&
        raw !== "phoenix-1" &&
        raw !== "do-chain" &&
        raw !== "do" &&
        raw !== "888" &&
        raw !== "osmosis-1" &&
        raw !== "osmosis" &&
        raw !== "osmo" &&
        raw !== "ethereum" &&
        raw !== "eth" &&
        raw !== "bitcoin" &&
        raw !== "btc" &&
        raw !== "solana" &&
        raw !== "sol"
      ) ||
      TERRA_CLASSIC_NATIVE_DENOMS[denom] ||
      denom.indexOf("terra1") === 0 ||
      chainName.indexOf("terra classic") >= 0 ||
      name.indexOf("terra classic") >= 0 ||
      symbol === "lunc" ||
      (terraClassicSymbols[symbol] && (
        raw === "columbus-5" ||
        raw === "330" ||
        raw === "terra" ||
        raw === "terra-classic" ||
        chainName.indexOf("terra") >= 0 ||
        name.indexOf("terra") >= 0 ||
        denom.indexOf("terra1") === 0
      ));
    var hasDoContext =
      raw === "888" ||
      raw === "do" ||
      raw === "do-chain" ||
      raw.indexOf("dochain") >= 0 ||
      raw.indexOf("do-chain") >= 0 ||
      chainName.indexOf("do chain") >= 0 ||
      name.indexOf("do chain") >= 0 ||
      denom === "udo" ||
      denom === "udodx" ||
      denom === "dodx";

    if (hasTerraClassicContext) return "columbus-5";
    if (hasDoContext) return "Do-Chain";
    if (raw === "luna" || raw === "phoenix-1" || chainName.indexOf("terra (luna)") >= 0) return "phoenix-1";
    if (raw === "osmo" || raw === "osmosis" || raw === "osmosis-1" || chainName.indexOf("osmosis") >= 0) return "osmosis-1";
    if (canonical) return canonical;
    return rawID || clean(asset && (asset.chainName || asset.networkName)) || "unknown";
  }

  function extraStakeScanChainIDs(chains, wallet, addressMap, candidateWallets) {
    var out = {};
    function add(chainID) {
      chainID = canonicalNetwork(chainID);
      var chain = chainID && chains[chainID];
      if (!chain || chain.networkType === "testnet" || !chainSupportsCosmosQueries(chain)) return;
      out[chainID] = true;
    }
    [
      "Do-Chain",
      "secret-4",
      "dungeon-1",
      "columbus-5",
      "osmosis-1",
      "cosmoshub-4",
      "juno-1",
      "akashnet-2",
      "chihuahua-1",
      "stargaze-1",
      "injective-1",
    ].forEach(add);
    Object.keys(addressMap || {}).forEach(add);
    Object.keys(chains || {}).forEach(function (chainID) {
      var chain = chains[chainID];
      if (!chain || chain.networkType === "testnet" || !chainSupportsCosmosQueries(chain)) return;
      if (chainID === "Do-Chain") {
        if (collectDoChainAddresses(wallet, addressMap).length) add(chainID);
        return;
      }
      if (collectDirectChainAddresses(chainID, chain, candidateWallets || [wallet], addressMap || {}, 1).length) add(chainID);
    });
    stakingRowsFromSnapshot(previousSnapshotForWallet(wallet)).forEach(function (asset) {
      add(assetChainID(asset));
    });
    return Object.keys(out);
  }

  function activeAddressMap(addressMap, rows) {
    var active = {};
    addressMap = isObject(addressMap) ? addressMap : {};
    (Array.isArray(rows) ? rows : []).forEach(function (asset) {
      if (!assetHasBalance(asset)) return;
      var chainID = assetChainID(asset);
      if (chainID && addressMap[chainID]) active[chainID] = addressMap[chainID];
    });
    return active;
  }

  function cleanAddressMapForSnapshot(addressMap) {
    var chains = allChains();
    var out = {};
    addressMap = isObject(addressMap) ? addressMap : {};
    Object.keys(addressMap).forEach(function (key) {
      var chainID = canonicalNetwork(key);
      var address = normalizeAddressForChain(chainID, addressMap[key]);
      if (!chainID || !chains[chainID] || isRemovedNetwork(chainID) || !isPublicAddress(address)) return;
      out[chainID] = address;
    });
    return out;
  }

  function assetStableKey(asset) {
    var chainID = assetChainID(asset);
    var token = clean(asset && (asset.contract || asset.token || asset.denom || asset.symbol || asset.name)).toLowerCase();
    return [chainID, assetCategory(asset), token].join(":");
  }

  function mergeFreshWithPreviousRows(freshRows, previousRows, addressMap) {
    var next = Array.isArray(freshRows) ? freshRows.slice() : [];
    var seen = {};
    next.forEach(function (asset) {
      var key = assetStableKey(asset);
      if (key) seen[key] = true;
    });
    (Array.isArray(previousRows) ? previousRows : []).forEach(function (asset) {
      var chainID = assetChainID(asset);
      var key = assetStableKey(asset);
      if (!chainID || !key || seen[key]) return;
      if (isObject(addressMap) && !addressMap[chainID]) return;
      next.push(Object.assign({}, asset, {
        preservedFromPreviousSnapshot: true,
        stale: true,
      }));
      seen[key] = true;
    });
    return uniqueAssets(next);
  }

  function baseTokenForChain(chainID, chain, assets) {
    chain = chain || allChains()[chainID] || {};
    var baseDenom = clean(chain.baseAsset || chain.denom || "").toLowerCase();
    var nativeSymbol = clean(chain.symbol || chain.ticker || "").toLowerCase();
    var rows = Array.isArray(assets) ? assets : [];
    for (var index = 0; index < rows.length; index += 1) {
      var asset = rows[index];
      if (!asset || portfolioChainID(asset) !== chainID) continue;
      var denom = clean(asset.denom || asset.token || "").toLowerCase();
      var symbol = clean(asset.symbol || asset.name || "").toLowerCase();
      if ((baseDenom && denom === baseDenom) || (nativeSymbol && symbol === nativeSymbol)) return asset;
    }
    return rows.filter(function (asset) { return portfolioChainID(asset) === chainID; }).sort(function (a, b) {
      return Number(b.valueUsd || b.value || 0) - Number(a.valueUsd || a.value || 0);
    })[0] || null;
  }

  function chainGroupedPortfolioAssets(assets) {
    var chains = allChains();
    var groups = {};
    uniqueAssets(displayableAssets(assets)).forEach(function (asset) {
      var chainID = portfolioChainID(asset) || "unknown";
      if (!groups[chainID]) groups[chainID] = [];
      groups[chainID].push(asset);
    });
    return Object.keys(groups).map(function (chainID) {
      var children = groups[chainID];
      var chain = chains[chainID] || {};
      var base = baseTokenForChain(chainID, chain, children) || children[0];
      var totalValue = children.reduce(function (sum, asset) {
        return sum + (Number(asset && (asset.valueUsd || asset.value || asset.usd)) || 0);
      }, 0);
      var grouped = Object.assign({}, base, {
        id: "portfolio-chain-group:" + chainID,
        key: "portfolio-chain-group:" + chainID,
        category: "wallet",
        isChainGroup: true,
        portfolioGroup: true,
        chainID: chainID,
        chainName: clean(chain.name || base.chainName || base.chainID || chainID),
        symbol: clean(chain.symbol || base.symbol || base.name || chainID),
        name: clean(chain.name || base.chainName || base.name || chainID),
        valueUsd: totalValue,
        value: totalValue,
        groupedValueUsd: totalValue,
        groupedAssetCount: children.length,
        childAssets: children,
        expandedAssets: children,
        subAssets: children,
        tokens: children,
        children: children,
      });
      if (children.length > 1) grouped.groupedUnderChain = true;
      return grouped;
    }).sort(function (a, b) {
      return (Number(b.valueUsd || b.value || 0) - Number(a.valueUsd || a.value || 0)) ||
        clean(a.chainName || a.chainID).localeCompare(clean(b.chainName || b.chainID));
    });
  }

  function runLimited(thunks, limit, onResult) {
    thunks = Array.isArray(thunks) ? thunks : [];
    limit = Math.max(1, Number(limit) || 6);
    var results = [];
    var index = 0;
    var active = 0;
    return new Promise(function (resolve) {
      function pump() {
        if (index >= thunks.length && active === 0) {
          resolve(results);
          return;
        }
        while (active < limit && index < thunks.length) {
          (function (resultIndex, task) {
            index += 1;
            active += 1;
            Promise.resolve()
              .then(task)
              .catch(function (error) {
                return { assets: [], staking: [], error: String(error && error.message || error).slice(0, 120) };
              })
              .then(function (result) {
                results[resultIndex] = result;
                try {
                  if (typeof onResult === "function") onResult(result, resultIndex);
                } catch (error) {}
                active -= 1;
                pump();
              });
          })(index, thunks[index]);
        }
      }
      pump();
    });
  }

  function publicWalletForBackend(wallet, addressMap) {
    if (!isObject(wallet)) return null;
    var sourceMap = addressMap || (wallet.publicAddressMapOnly === true
      ? (wallet.addressMap || wallet.addresses || {})
      : buildWalletAddressMap(wallet));
    var map = cleanAddressMapForSnapshot(sourceMap);
    if (!Object.keys(map).length) return null;
    return {
      name: walletName(wallet) || "Do-Wallet",
      walletName: walletName(wallet) || "Do-Wallet",
      label: clean(wallet.label || ""),
      id: clean(wallet.id || ""),
      address: clean(wallet.address || Object.keys(map).map(function (key) { return map[key]; }).find(Boolean)),
      addresses: map,
      addressMap: map,
      validatorWallet: wallet.validatorWallet === true,
      adminWallet: wallet.adminWallet === true,
    };
  }

  function addCleanAddressMap(target, source, replaceExisting) {
    target = isObject(target) ? target : {};
    var cleanMap = cleanAddressMapForSnapshot(source);
    Object.keys(cleanMap).forEach(function (chainID) {
      if (replaceExisting || !target[chainID]) target[chainID] = cleanMap[chainID];
    });
    return target;
  }

  function addressMapForPortfolioCandidate(candidate) {
    if (!isObject(candidate)) return {};
    if (candidate.publicAddressMapOnly === true) {
      return cleanAddressMapForSnapshot(candidate.addressMap || candidate.addresses || {});
    }
    return buildWalletAddressMap(candidate);
  }

  function completePortfolioAddressMap(wallet, activeMap, candidateWallets) {
    var out = {};
    addCleanAddressMap(out, activeMap, false);
    addCleanAddressMap(out, buildWalletAddressMap(wallet), false);
    (Array.isArray(candidateWallets) ? candidateWallets : portfolioWalletCandidates(wallet)).forEach(function (candidate) {
      addCleanAddressMap(out, addressMapForPortfolioCandidate(candidate), false);
    });
    return out;
  }

  function backendPortfolioWallets(wallet, activeMap, candidateWallets) {
    var wallets = [];
    var seen = {};
    function add(publicWallet) {
      if (!isObject(publicWallet) || !isObject(publicWallet.addressMap)) return;
      if (!Object.keys(publicWallet.addressMap).length) return;
      var addressKey = Object.keys(publicWallet.addressMap).sort().map(function (key) {
        return key + ":" + clean(publicWallet.addressMap[key]).toLowerCase();
      }).join("|");
      var key = clean(publicWallet.id || "") || walletIdentityKeys(publicWallet).join("|") || addressKey;
      key = clean(key || addressKey).toLowerCase();
      if (!key || seen[key] || wallets.length >= BACKEND_PORTFOLIO_MAX_WALLETS) return;
      seen[key] = true;
      wallets.push(publicWallet);
    }

    add(publicWalletForBackend(wallet, activeMap));
    (Array.isArray(candidateWallets) ? candidateWallets : portfolioWalletCandidates(wallet)).forEach(function (candidate) {
      add(publicWalletForBackend(candidate));
    });
    return wallets;
  }

  function backendPortfolioPayload(wallet, addressMap, candidateWallets) {
    var activeMap = cleanAddressMapForSnapshot(addressMap);
    var candidates = backendPortfolioWallets(wallet, activeMap, candidateWallets);
    var active = publicWalletForBackend(wallet, activeMap) || candidates[0] || null;
    return {
      version: SNAPSHOT_SCHEMA_VERSION,
      wallet: active,
      wallets: candidates,
      addressMap: activeMap,
    };
  }

  function persistBackendPortfolioSnapshot(wallet, addressMap, response) {
    var snapshot = response && (response.snapshot || response);
    if (!snapshotHasDisplayRows(snapshot)) return false;
    var spendable = Array.isArray(snapshot.spendableAssets)
      ? snapshot.spendableAssets
      : Array.isArray(snapshot.assets)
        ? snapshot.assets
        : [];
    var staking = Array.isArray(snapshot.staking) ? snapshot.staking : [];
    var mergedAddressMap = Object.assign({}, addressMap || {});
    if (isObject(snapshot.addresses)) mergedAddressMap = Object.assign(mergedAddressMap, snapshot.addresses);
    if (isObject(snapshot.activeAddresses)) mergedAddressMap = Object.assign(mergedAddressMap, snapshot.activeAddresses);
    if (Array.isArray(snapshot.allAddresses)) {
      snapshot.allAddresses.forEach(function (entry) {
        if (!isObject(entry)) return;
        var chainID = canonicalNetwork(entry.chainID || entry.chainId || entry.network);
        var address = normalizeAddressForChain(chainID, entry.address || entry.walletAddress);
        if (chainID && isPublicAddress(address) && !mergedAddressMap[chainID]) mergedAddressMap[chainID] = address;
      });
    }
    writePortfolioSnapshot(wallet, mergedAddressMap, spendable, staking, snapshot.errors || (response && response.errors) || []);
    markStatus("portfolio-backend-loaded", {
      balanceAssets: displayableAssets(spendable).length,
      stakingAssets: displayableAssets(staking).length,
      balanceChains: Object.keys(mergedAddressMap).length,
      durationMs: response && response.stats && response.stats.durationMs || 0,
    });
    return true;
  }

  function fetchBackendPortfolioSnapshot(wallet, addressMap, candidateWallets) {
    var payload = backendPortfolioPayload(wallet, addressMap, candidateWallets);
    if (!payload.wallet && !Object.keys(payload.addressMap || {}).length) return Promise.resolve(false);
    return postJSONTimed(BACKEND_PORTFOLIO_SNAPSHOT_PATH, payload, BACKEND_PORTFOLIO_SNAPSHOT_TIMEOUT_MS)
      .then(function (response) {
        if (!response || response.ok === false) return false;
        var persisted = persistBackendPortfolioSnapshot(wallet, addressMap, response);
        if (persisted) return response;
        if (response.stats && Number(response.stats.pairs || 0) > 0) {
          markStatus("portfolio-backend-empty", {
            balanceChains: Number(response.stats.pairs || 0),
            durationMs: Number(response.stats.durationMs || 0),
          });
          return false;
        }
        return false;
      });
  }

  function snapshotDisplayRowCount(snapshot) {
    if (!isObject(snapshot)) return 0;
    return rawSpendableRowsFromSnapshot(snapshot).length + stakingRowsFromSnapshot(snapshot).length;
  }

  function backendSnapshotNeedsBrowserRecovery(response, previousRowCount, addressCount) {
    if (!response || response === false) return true;
    var stats = isObject(response.stats) ? response.stats : {};
    var snapshot = readJSON(SNAPSHOT_KEY, null);
    var currentRows = snapshotDisplayRowCount(snapshot);
    var backendRows = Number(stats.assets || 0) + Number(stats.staking || 0);
    var pairCount = Number(stats.pairs || 0);
    var expectedChains = Math.max(Number(addressCount) || 0, pairCount);
    if (previousRowCount > 1 && currentRows > 0 && currentRows < previousRowCount) return true;
    if (expectedChains > 1 && currentRows <= 1) return true;
    if (pairCount > 1 && backendRows <= 1) return true;
    return false;
  }

  function writePortfolioSnapshot(wallet, addressMap, assets, staking, errors) {
    addressMap = cleanAddressMapForSnapshot(addressMap);
    var spendableAssets = uniqueAssets(displayableAssets(assets));
    var stakingAssets = uniqueAssets(displayableAssets(staking));
    var freshRowCount = spendableAssets.length + stakingAssets.length;
    var previousSnapshot = previousSnapshotForWallet(wallet);
    var preservedSpendable = false;
    var preservedStaking = false;

    var previousSpendable = previousSnapshot ? uniqueAssets(rawSpendableRowsFromSnapshot(previousSnapshot)) : [];
    var previousStaking = previousSnapshot ? uniqueAssets(stakingRowsFromSnapshot(previousSnapshot)) : [];

    if (!spendableAssets.length && previousSnapshot) {
      if (previousSpendable.length) {
        spendableAssets = previousSpendable;
        preservedSpendable = true;
      }
    }
    if (!stakingAssets.length && previousSnapshot) {
      if (previousStaking.length) {
        stakingAssets = previousStaking;
        preservedStaking = true;
      }
    }
    if (previousSnapshot && spendableAssets.length && previousSpendable.length) {
      var mergedSpendable = mergeFreshWithPreviousRows(spendableAssets, previousSpendable, addressMap);
      preservedSpendable = preservedSpendable || mergedSpendable.length > spendableAssets.length;
      spendableAssets = mergedSpendable;
    }
    if (previousSnapshot && stakingAssets.length && previousStaking.length) {
      var mergedStaking = mergeFreshWithPreviousRows(stakingAssets, previousStaking, addressMap);
      preservedStaking = preservedStaking || mergedStaking.length > stakingAssets.length;
      stakingAssets = mergedStaking;
    }

    var rawPortfolioAssets = uniqueAssets(spendableAssets.concat(stakingAssets));
    var groupedSpendableAssets = chainGroupedPortfolioAssets(spendableAssets);
    var groupedPortfolioAssets = chainGroupedPortfolioAssets(rawPortfolioAssets);
    var sidePanelAssets = groupedPortfolioAssets.length
      ? groupedPortfolioAssets
      : (groupedSpendableAssets.length ? groupedSpendableAssets : spendableAssets);
    // Keep UI-facing asset fields grouped, but preserve true flat rows for refresh/merge logic.
    var sourceSpendableAssets = spendableAssets;
    var sourcePortfolioAssets = rawPortfolioAssets;
    var displayPortfolioAssets = sidePanelAssets;
    if (!displayPortfolioAssets.length && !freshRowCount) {
      markStatus("portfolio-empty-preserved", {
        balanceAssets: 0,
        stakingAssets: 0,
        balanceErrors: (errors || []).length,
      });
      return;
    }
    var fullAddressMap = Object.assign({}, addressMap || {});
    rawPortfolioAssets.forEach(function (asset) {
      var chainID = assetChainID(asset);
      var address = normalizeAddressForChain(chainID, asset && (asset.walletAddress || asset.address));
      if (chainID && isPublicAddress(address) && !fullAddressMap[chainID]) fullAddressMap[chainID] = address;
    });
    var visibleAddresses = activeAddressMap(fullAddressMap, rawPortfolioAssets);
    var totalValue = displayPortfolioAssets.reduce(function (sum, asset) {
      return sum + (Number(asset && (asset.valueUsd || asset.value || asset.usd)) || 0);
    }, 0);
    var snapshot = {
      source: "do-wallet-multichain-live",
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      updatedAt: Date.now(),
      wallet: wallet,
      walletKey: walletIdentityKeys(wallet)[0] || "",
      addresses: visibleAddresses,
      activeAddresses: visibleAddresses,
      allAddresses: fullAddressMap,
      totalValue: totalValue,
      totalStakedValue: stakingAssets.filter(function (asset) { return asset.category === "staking"; }).reduce(function (sum, asset) { return sum + (Number(asset.valueUsd || 0) || 0); }, 0),
      totalRewardsValue: stakingAssets.filter(function (asset) { return asset.category === "reward"; }).reduce(function (sum, asset) { return sum + (Number(asset.valueUsd || 0) || 0); }, 0),
      totalUnbondingValue: stakingAssets.filter(function (asset) { return asset.category === "unbonding"; }).reduce(function (sum, asset) { return sum + (Number(asset.valueUsd || 0) || 0); }, 0),
      assets: sidePanelAssets,
      spendableAssets: sidePanelAssets,
      rawSpendableAssets: sourceSpendableAssets,
      flatSpendableAssets: sourceSpendableAssets,
      unGroupedSpendableAssets: sourceSpendableAssets,
      tokenSpendableAssets: sidePanelAssets,
      rawTokenSpendableAssets: sourceSpendableAssets,
      portfolioPanelAssets: sidePanelAssets,
      portfolioAssets: sidePanelAssets,
      sidePanelAssets: sidePanelAssets,
      groupedSpendableAssets: groupedSpendableAssets.length ? groupedSpendableAssets : sidePanelAssets,
      groupedPortfolioAssets: sidePanelAssets,
      chainGroupedAssets: sidePanelAssets,
      detailPortfolioAssets: sourcePortfolioAssets,
      rawPortfolioAssets: sourcePortfolioAssets,
      flatPortfolioAssets: sourcePortfolioAssets,
      unGroupedPortfolioAssets: sourcePortfolioAssets,
      tokenPortfolioAssets: sidePanelAssets,
      rawTokenPortfolioAssets: sourcePortfolioAssets,
      sourceSpendableAssets: sourceSpendableAssets,
      sourcePortfolioAssets: sourcePortfolioAssets,
      sourceStakingAssets: stakingAssets,
      staking: stakingAssets,
      preservedSpendable: preservedSpendable,
      preservedStaking: preservedStaking,
      errors: errors || [],
    };
    writeJSON(SNAPSHOT_KEY, snapshot);
    var byWallet = readJSON(SNAPSHOTS_BY_WALLET_KEY, {});
    if (!isObject(byWallet)) byWallet = {};
    walletIdentityKeys(wallet).forEach(function (key) {
      byWallet[key] = snapshot;
    });
    writeJSON(SNAPSHOTS_BY_WALLET_KEY, byWallet);
    try {
      window.dispatchEvent(new CustomEvent("do_wallet_portfolio_snapshot", { detail: snapshot }));
    } catch (error) {}
    markStatus("portfolio-loaded", {
      balanceAssets: spendableAssets.length,
      stakingAssets: stakingAssets.length,
      balanceChains: Object.keys(addressMap || {}).length,
      activeBalanceChains: Object.keys(visibleAddresses || {}).length,
      balanceErrors: (errors || []).length,
      preservedSpendable: preservedSpendable,
      preservedStaking: preservedStaking,
    });
  }

  function refreshPortfolio(options) {
    options = isObject(options) ? options : {};
    var forceRefresh = options.force === true;
    if (!window.Promise) {
      pendingPortfolioRefresh = true;
      pendingPortfolioForceRefresh = pendingPortfolioForceRefresh || forceRefresh;
      return;
    }
    var wallet = activeWallet();
    if (!wallet) {
      markStatus("portfolio-no-wallet");
      return;
    }
    patchWallet(wallet);
    publishCachedPortfolioSnapshot(wallet);
    var walletKey = walletIdentityKeys(wallet)[0] || walletName(wallet) || "";
    if (portfolioRunning) {
      if (forceRefresh || (walletKey && walletKey !== activePortfolioWalletKey)) {
        pendingPortfolioRefresh = true;
        pendingPortfolioForceRefresh = pendingPortfolioForceRefresh || forceRefresh;
      } else {
        markStatus("portfolio-refresh-suppressed", { balanceWallet: walletKey.slice(0, 24) });
      }
      return;
    }
    var now = Date.now();
    if (!forceRefresh && walletKey && walletKey === lastPortfolioWalletKey && now - lastPortfolioRefreshStartedAt < MIN_PORTFOLIO_REFRESH_INTERVAL_MS) {
      markStatus("portfolio-refresh-throttled", { nextMs: Math.max(0, MIN_PORTFOLIO_REFRESH_INTERVAL_MS - (now - lastPortfolioRefreshStartedAt)) });
      return;
    }
    var candidateWallets = portfolioWalletCandidates(wallet);
    var addressMap = completePortfolioAddressMap(wallet, buildWalletAddressMap(wallet), candidateWallets);
    var addressCount = Object.keys(addressMap).length;
    if (!addressCount) {
      markStatus("portfolio-no-addresses");
      return;
    }
    portfolioRunning = true;
    activePortfolioWalletKey = walletKey;
    lastPortfolioWalletKey = walletKey;
    lastPortfolioRefreshStartedAt = now;
    pendingPortfolioRefresh = false;
    pendingPortfolioForceRefresh = false;
    markStatus("portfolio-loading", { balanceChains: addressCount, forced: forceRefresh ? 1 : 0 });
    var previousRowCount = snapshotDisplayRowCount(previousSnapshotForWallet(wallet));
    function runBrowserPortfolioScan() {
      return Promise.all([
        fetchJSONTimed(TOKEN_CATALOG_PATHS.prices, CATALOG_FETCH_TIMEOUT_MS),
        fetchJSONTimed(TOKEN_CATALOG_PATHS.denoms, CATALOG_FETCH_TIMEOUT_MS),
        fetchJSONTimed(TOKEN_CATALOG_PATHS.buildDenoms, CATALOG_FETCH_TIMEOUT_MS),
      ]).then(function (catalogs) {
        var prices = catalogs[0] || {};
        var denoms = mergeObjects(normalizeDenomCatalog(catalogs[1]), normalizeDenomCatalog(catalogs[2]));
        var chains = allChains();
        var tasks = [];
        var liveAssets = [];
        var liveStaking = [];
        var liveErrors = [];
        var queuedPortfolioQueries = {};
        function acceptResult(result) {
          if (!result) return;
          if (result.error) liveErrors.push(result.error);
          liveAssets = liveAssets.concat(result.assets || []);
          liveStaking = liveStaking.concat(result.staking || []);
          markStatus("portfolio-loading", {
            balanceChains: addressCount,
            balanceAssets: displayableAssets(liveAssets).length,
            stakingAssets: displayableAssets(liveStaking).length,
            balanceErrors: liveErrors.length,
          });
        }
        function queuePortfolioQuery(chainID, chain, address, priority) {
          if (!chain || !address || chain.networkType === "testnet") return;
          var cleanAddress = clean(address);
          var queryKey = chainID + ":" + cleanAddress.toLowerCase();
          if (!cleanAddress || queuedPortfolioQueries[queryKey]) return;
          queuedPortfolioQueries[queryKey] = true;
          var task;
          if (chainSupportsCosmosQueries(chain)) {
            task = function () { return fetchCosmosPortfolio(chainID, chain, cleanAddress, prices, denoms); };
          } else if (chainSupportsEvmQueries(chain)) {
            task = function () { return fetchEvmPortfolio(chainID, chain, cleanAddress, prices, denoms); };
          } else if (chainSupportsBtcQueries(chainID, chain)) {
            task = function () { return fetchBitcoinPortfolio(chainID, chain, cleanAddress, prices, denoms); };
          } else if (chainSupportsSolQueries(chainID, chain)) {
            task = function () { return fetchSolanaPortfolio(chainID, chain, cleanAddress, prices, denoms); };
          }
          if (!task) return;
          if (priority) tasks.unshift(task);
          else tasks.push(task);
        }
        Object.keys(addressMap).forEach(function (chainID) {
          var chain = chains[chainID];
          var address = addressMap[chainID];
          queuePortfolioQuery(chainID, chain, address, false);
        });
        extraStakeScanChainIDs(chains, wallet, addressMap, candidateWallets).forEach(function (chainID) {
          var chain = chains[chainID];
          var priorityStakeChain = chainID === "Do-Chain" || chainID === "secret-4" || chainID === "dungeon-1" || chainID === "columbus-5";
          var limit = priorityStakeChain ? 96 : 12;
          var addresses = chainID === "Do-Chain"
            ? collectDoChainAddresses(wallet, addressMap).slice(0, limit)
            : collectDirectChainAddresses(chainID, chain, candidateWallets, addressMap, limit);
          addresses.forEach(function (address) {
            var priority = priorityStakeChain;
            queuePortfolioQuery(chainID, chain, address, priority);
          });
        });
        return runLimited(tasks, 5, acceptResult);
      }).then(function (results) {
        var assets = [];
        var staking = [];
        var errors = [];
        (Array.isArray(results) ? results : []).forEach(function (result) {
          if (!result) return;
          if (result.error) errors.push(result.error);
          assets = assets.concat(result.assets || []);
          staking = staking.concat(result.staking || []);
        });
        writePortfolioSnapshot(wallet, addressMap, assets, staking, errors);
      });
    }
    fetchBackendPortfolioSnapshot(wallet, addressMap, candidateWallets).then(function (backendResponse) {
      if (!backendSnapshotNeedsBrowserRecovery(backendResponse, previousRowCount, addressCount)) return true;
      markStatus(backendResponse ? "portfolio-backend-thin-browser-recovery" : "portfolio-backend-unavailable", {
        balanceChains: addressCount,
        previousRows: previousRowCount,
        backendPairs: backendResponse && backendResponse.stats && backendResponse.stats.pairs || 0,
        backendAssets: backendResponse && backendResponse.stats && backendResponse.stats.assets || 0,
        backendStaking: backendResponse && backendResponse.stats && backendResponse.stats.staking || 0,
      });
      return runBrowserPortfolioScan().then(function () { return true; });
    }).catch(function (error) {
      markStatus("portfolio-error", { error: String(error && error.message || error).slice(0, 120) });
    }).then(function () {
      portfolioRunning = false;
      activePortfolioWalletKey = "";
      if (pendingPortfolioRefresh) {
        var queuedForceRefresh = pendingPortfolioForceRefresh;
        pendingPortfolioRefresh = false;
        pendingPortfolioForceRefresh = false;
        window.setTimeout(function () {
          refreshPortfolio({ force: queuedForceRefresh });
        }, queuedForceRefresh ? 2000 : 5000);
      }
    });
  }

  function allChains() {
    return Object.keys(dynamicChains).length ? Object.assign({}, CHAINS, dynamicChains) : Object.assign({}, CHAINS);
  }

  function chainIsKnown(chainID) {
    if (!chainCatalogLoaded) return true;
    return Boolean(allChains()[chainID]);
  }

  function normalizeChainCatalog(catalog) {
    var chains = {};
    function add(chainID, chain, group) {
      if (!isObject(chain)) return;
      chainID = canonicalNetwork(chain.chainID || chain.chainId || chainID);
      if (!chainID || isRemovedNetwork(chainID)) return;
      chains[chainID] = liveChainOverrides(chainID, Object.assign({}, chain, {
        chainID: chainID,
        networkType: chain.networkType || (group === "testnet" ? "testnet" : "mainnet"),
      }));
    }
    if (Array.isArray(catalog)) {
      catalog.forEach(function (chain) { add(chain && (chain.chainID || chain.chainId), chain); });
    } else if (isObject(catalog)) {
      ["mainnet", "classic", "testnet"].forEach(function (group) {
        if (!isObject(catalog[group])) return;
        Object.keys(catalog[group]).forEach(function (chainID) {
          add(chainID, catalog[group][chainID], group);
        });
      });
      if (!Object.keys(chains).length) {
        Object.keys(catalog).forEach(function (chainID) { add(chainID, catalog[chainID]); });
      }
    }
    return chains;
  }

  function loadChainCatalog() {
    if (chainCatalogRunning || chainCatalogLoaded || !window.Promise) return;
    chainCatalogRunning = true;
    markStatus("loading-chains");
    fetchJSON(TOKEN_CATALOG_PATHS.chains).then(function (catalog) {
      var loaded = normalizeChainCatalog(catalog);
      if (Object.keys(loaded).length) {
        dynamicChains = loaded;
        chainCatalogLoaded = true;
        markStatus("chains-loaded", { chains: Object.keys(dynamicChains).length });
        if (seedRegistries()) dispatchUpdates();
        loadTokenCatalog();
        window.clearTimeout(portfolioRefreshTimer);
        refreshPortfolio({ force: true });
      }
    }).then(function () {
      chainCatalogRunning = false;
    }, function () {
      chainCatalogRunning = false;
    });
  }

  function chainIDFromKey(key) {
    var parts = String(key || "").split(":");
    return parts.length > 1 ? parts[0] : "";
  }

  function tokenFromKey(key) {
    var value = String(key || "");
    var index = value.indexOf(":");
    return index >= 0 ? value.slice(index + 1) : value;
  }

  function isEvmContract(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(clean(value));
  }

  function isBech32ContractLike(value) {
    return /^[a-z][a-z0-9]{1,19}1[ac-hj-np-z02-9]{38,110}$/i.test(clean(value));
  }

  function isContractToken(token) {
    var standard = String(token && token.standard || "").toLowerCase();
    var value = token && (token.contract || token.token || token.denom || "");
    return standard === "cw20" || standard === "erc20" || isEvmContract(value) || isBech32ContractLike(value);
  }

  function normalizeCatalogToken(key, item, forcedStandard) {
    if (!isObject(item)) return null;
    var chainID = canonicalNetwork(item.chainID || chainIDFromKey(key));
    if (!chainID || isRemovedNetwork(chainID)) return null;

    var rawToken = clean(item.contract || item.token || item.denom || tokenFromKey(key));
    if (!rawToken || rawToken === chainID) return null;

    var decimals = Number(item.decimals);
    if (!Number.isFinite(decimals)) decimals = 6;

    var standard = clean(item.standard || forcedStandard || "");
    if (!standard && isEvmContract(rawToken)) standard = "erc20";
    else if (!standard && isBech32ContractLike(rawToken)) standard = "cw20";

    var tokenID = standard === "erc20" ? rawToken.toLowerCase() : rawToken;
    var token = Object.assign({}, item, {
      chainID: chainID,
      decimals: decimals,
      denom: item.denom || rawToken,
      id: item.id || chainID + ":" + tokenID,
      name: item.name || item.symbol || rawToken,
      symbol: item.symbol || rawToken,
      token: item.token || rawToken,
      verified: item.verified !== false,
    });

    if (standard) token.standard = standard;
    if (standard === "cw20" || standard === "erc20") token.contract = item.contract || rawToken;
    return token;
  }

  function collectCatalogEntries(catalog) {
    var entries = [];
    if (!isObject(catalog)) return entries;
    var groups = ["mainnet", "classic", "testnet"];
    var grouped = groups.some(function (group) { return isObject(catalog[group]); });
    if (grouped) {
      groups.forEach(function (group) {
        if (!isObject(catalog[group])) return;
        Object.keys(catalog[group]).forEach(function (key) {
          entries.push({ key: key, item: catalog[group][key] });
        });
      });
      return entries;
    }
    Object.keys(catalog).forEach(function (key) {
      entries.push({ key: key, item: catalog[key] });
    });
    return entries;
  }

  function seedCatalogToken(tokens, token) {
    if (!token || !token.chainID) return 0;
    if (!chainIsKnown(token.chainID)) return 0;
    if (isContractToken(token)) {
      ensureContractTokens(tokens, token.chainID, [token]);
      ensureContractTokens(tokens, "mainnet", [token]);
    } else {
      ensureNativeToken(tokens, token.chainID, token);
      ensureNativeToken(tokens, "mainnet", token);
    }
    return 1;
  }

  function seedCatalogTokens(tokens, denomsCatalog, cw20Catalog) {
    var count = 0;
    var seen = {};
    collectCatalogEntries(denomsCatalog).forEach(function (entry) {
      var token = normalizeCatalogToken(entry.key, entry.item, "");
      if (!token) return;
      var uniqueKey = token.chainID + ":" + String(token.contract || token.token || token.denom || "").toLowerCase();
      if (seen[uniqueKey]) return;
      seen[uniqueKey] = true;
      count += seedCatalogToken(tokens, token);
    });
    collectCatalogEntries(cw20Catalog).forEach(function (entry) {
      var token = normalizeCatalogToken(entry.key, entry.item, "cw20");
      if (!token) return;
      var uniqueKey = token.chainID + ":" + String(token.contract || token.token || token.denom || "").toLowerCase();
      if (seen[uniqueKey]) return;
      seen[uniqueKey] = true;
      count += seedCatalogToken(tokens, token);
    });
    return count;
  }

  var tokenCatalogRunning = false;
  var tokenCatalogLoaded = false;

  function seedStaticTokens(tokens) {
    Object.keys(NATIVE_TOKENS).forEach(function (chainID) {
      if (!chainIsKnown(chainID)) return;
      ensureNativeToken(tokens, chainID, NATIVE_TOKENS[chainID]);
      ensureNativeToken(tokens, "mainnet", NATIVE_TOKENS[chainID]);
    });
    Object.keys(EXTRA_NATIVE_TOKENS).forEach(function (key) {
      var token = EXTRA_NATIVE_TOKENS[key];
      if (!token || !chainIsKnown(token.chainID)) return;
      ensureNativeToken(tokens, token.chainID, token);
      ensureNativeToken(tokens, "mainnet", token);
    });
    Object.keys(CONTRACT_TOKENS).forEach(function (chainID) {
      if (!chainIsKnown(chainID)) return;
      ensureContractTokens(tokens, chainID, CONTRACT_TOKENS[chainID]);
      ensureContractTokens(tokens, "mainnet", CONTRACT_TOKENS[chainID]);
    });
  }

  function cleanRemovedTokenBuckets(tokens) {
    REMOVED_NETWORKS.forEach(function (chainID) { delete tokens[chainID]; });
    STALE_NETWORK_ALIASES.forEach(function (chainID) { delete tokens[chainID]; });
    if (chainCatalogLoaded) {
      var chains = allChains();
      Object.keys(tokens).forEach(function (chainID) {
        if (chainID !== "mainnet" && !chains[chainID]) delete tokens[chainID];
      });
    }
  }

  function loadTokenCatalog() {
    if (tokenCatalogRunning || tokenCatalogLoaded || !window.Promise) return;
    tokenCatalogRunning = true;
    markStatus("loading-tokens");
    Promise.all([
      fetchJSON(TOKEN_CATALOG_PATHS.denoms),
      fetchJSON(TOKEN_CATALOG_PATHS.cw20),
    ]).then(function (catalogs) {
      var customTokens = readJSON("CustomTokensInterchain", {});
      if (!isObject(customTokens)) customTokens = {};
      var added = seedCatalogTokens(customTokens, catalogs[0], catalogs[1]);
      seedStaticTokens(customTokens);
      cleanRemovedTokenBuckets(customTokens);
      var changed = writeJSON("CustomTokensInterchain", customTokens);
      tokenCatalogLoaded = added > 0;
      markStatus("tokens-loaded", {
        chains: Object.keys(allChains()).length,
        tokenBuckets: Object.keys(customTokens).length,
        catalogTokens: added,
      });
      if (changed) dispatchUpdates();
    }).then(function () {
      tokenCatalogRunning = false;
    }, function () {
      tokenCatalogRunning = false;
    });
  }

  function seedRegistries() {
    if (window.__DO_WALLET_DISABLE_LEGACY_REGISTRY_WRITES__ === true) return false;
    var changed = false;
    var customChains = readJSON("CustomChains", {});
    if (!isObject(customChains)) customChains = {};
    var chains = allChains();
    Object.keys(chains).forEach(function (chainID) {
      customChains[chainID] = Object.assign({}, customChains[chainID] || {}, withWebsiteLCDProxy(chainID, chains[chainID]));
    });
    REMOVED_NETWORKS.forEach(function (chainID) { delete customChains[chainID]; });
    STALE_NETWORK_ALIASES.forEach(function (chainID) { delete customChains[chainID]; });
    if (chainCatalogLoaded) {
      Object.keys(customChains).forEach(function (chainID) {
        if (!chains[chainID]) delete customChains[chainID];
      });
    }
    changed = writeJSON("CustomChains", customChains) || changed;

    var customLCD = readJSON("CustomLCD", {});
    if (!isObject(customLCD)) customLCD = {};
    Object.keys(chains).forEach(function (chainID) {
      var lcd = registryLCD(chainID, chains[chainID]);
      if (lcd) {
        customLCD[chainID] = lcd;
      }
    });
    REMOVED_NETWORKS.forEach(function (chainID) { delete customLCD[chainID]; });
    STALE_NETWORK_ALIASES.forEach(function (chainID) { delete customLCD[chainID]; });
    if (chainCatalogLoaded) {
      Object.keys(customLCD).forEach(function (chainID) {
        if (!chains[chainID]) delete customLCD[chainID];
      });
    }
    changed = writeJSON("CustomLCD", customLCD) || changed;

    var customTokens = readJSON("CustomTokensInterchain", {});
    if (!isObject(customTokens)) customTokens = {};
    seedStaticTokens(customTokens);
    cleanRemovedTokenBuckets(customTokens);
    changed = writeJSON("CustomTokensInterchain", customTokens) || changed;

    var enabled = readJSON("EnabledNetworks", { time: 0, networks: [] });
    if (!isObject(enabled)) enabled = { time: 0, networks: [] };
    var enabledNetworks = ensureOrdered(enabled.networks);
    if (JSON.stringify(enabledNetworks) !== JSON.stringify(enabled.networks || [])) {
      changed = writeJSON("EnabledNetworks", Object.assign({}, enabled, {
        time: Date.now(),
        networks: enabledNetworks,
      })) || changed;
    }

    var display = readJSON("DisplayChains", {});
    if (!isObject(display)) display = {};
    ["all", "mainnet", "receive", "assets"].forEach(function (key) {
      display[key] = ensureOrdered(display[key]);
    });
    changed = writeJSON("DisplayChains", display) || changed;

    return changed;
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function isDo(value) { return /^do1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isTerra(value) { return /^terra1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isSecret(value) { return /^secret1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isDungeon(value) { return /^dungeon1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isCosmos(value) { return /^cosmos1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isOsmo(value) { return /^osmo1[ac-hj-np-z02-9]{20,90}$/i.test(clean(value)); }
  function isEth(value) { return /^0x[a-fA-F0-9]{40}$/.test(clean(value)); }
  function isBtc(value) { return /^(bc1[a-z0-9]{20,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,40})$/i.test(clean(value)); }
  function isSol(value) { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean(value)); }
  function isCardano(value) { return /^addr1[0-9a-z]{20,120}$/i.test(clean(value)); }
  function isTron(value) { return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(clean(value)); }
  function isXrp(value) { return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(clean(value)); }

  function setAliases(addresses, aliases, value) {
    var address = clean(value);
    if (!address) return false;
    var changed = false;
    aliases.forEach(function (key) {
      if (!addresses[key]) {
        addresses[key] = address;
        changed = true;
      }
    });
    return changed;
  }

  function patchWallet(wallet) {
    if (!isObject(wallet)) return false;
    var changed = false;
    var addresses = Object.assign({}, isObject(wallet.addresses) ? wallet.addresses : {}, isObject(wallet.addressMap) ? wallet.addressMap : {});
    var values = [
      wallet.address,
      wallet.doAddress,
      wallet.doChainAddress,
      wallet.terraAddress,
      wallet.luncAddress,
      wallet.lunaAddress,
      wallet.ethereumAddress,
      wallet.evmAddress,
      wallet.bitcoinAddress,
      wallet.solanaAddress,
      wallet.cardanoAddress,
      wallet.adaAddress,
      wallet.tronAddress,
      wallet.trxAddress,
      wallet.xrpAddress
    ];
    Object.keys(addresses).forEach(function (key) { values.push(addresses[key]); });

    values.forEach(function (value) {
      var address = clean(value);
      if (isDo(address)) changed = setAliases(addresses, ["Do-Chain"], address) || changed;
      else if (isTerra(address)) changed = setAliases(addresses, ["columbus-5", "phoenix-1"], address) || changed;
      else if (isSecret(address)) changed = setAliases(addresses, ["secret-4"], address) || changed;
      else if (isDungeon(address)) changed = setAliases(addresses, ["dungeon-1", "dungeon"], address) || changed;
      else if (isCosmos(address)) changed = setAliases(addresses, ["cosmoshub-4", "cosmos"], address) || changed;
      else if (isOsmo(address)) changed = setAliases(addresses, ["osmosis-1", "osmo"], address) || changed;
      else if (isEth(address)) changed = setAliases(addresses, ["ethereum-mainnet", "eip155:1", "ethereum", "eth", "evm"], address) || changed;
      else if (isBtc(address)) changed = setAliases(addresses, ["bitcoin-mainnet", "bip122:000000000019d6689c085ae165831e93", "bitcoin", "btc"], address) || changed;
      else if (isCardano(address)) changed = setAliases(addresses, ["cardano-mainnet", "cardano", "ada", "1815"], address) || changed;
      else if (isTron(address)) changed = setAliases(addresses, ["tron-mainnet", "tron", "trx", "195"], address) || changed;
      else if (isXrp(address)) changed = setAliases(addresses, ["xrp-ledger-mainnet", "xrp", "144"], address) || changed;
    });

    var explicitSol = clean(wallet.solanaAddress || addresses["solana-mainnet"] || addresses.solana || addresses.sol || addresses["501"]);
    if (isSol(explicitSol)) changed = setAliases(addresses, ["solana-mainnet", "solana", "sol"], explicitSol) || changed;

    var explicitDo = values.map(clean).filter(isDo)[0] || "";
    if (explicitDo && addresses["Do-Chain"] !== explicitDo) {
      addresses["Do-Chain"] = explicitDo;
      changed = true;
    } else if (addresses["Do-Chain"] && !isDo(addresses["Do-Chain"])) {
      delete addresses["Do-Chain"];
      changed = true;
    }

    REMOVED_ADDRESS_ALIASES.concat(DISPLAY_ALIAS_KEYS).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(addresses, key)) {
        delete addresses[key];
        changed = true;
      }
    });

    if (changed || Object.keys(addresses).length) {
      wallet.addresses = addresses;
      wallet.addressMap = addresses;
    }
    return changed;
  }

  function patchStoredWallet(key) {
    var payload = readJSON(key, null);
    if (!payload) return false;
    var wallet = isObject(payload.wallet) ? payload.wallet : payload;
    var changed = patchWallet(wallet);
    if (!changed) return false;
    if (wallet !== payload) {
      payload.wallet = wallet;
      payload.updatedAt = Date.now();
    }
    return writeJSON(key, payload);
  }

  function patchKeys() {
    var keys = readJSON("keys", null);
    if (!Array.isArray(keys)) return false;
    var changed = false;
    keys.forEach(function (wallet) {
      changed = patchWallet(wallet) || changed;
    });
    return changed ? writeJSON("keys", keys) : false;
  }

  function dispatchUpdates() {
    ["do_wallet_chain_assets_update", "do_wallet_bridge_update"].forEach(function (eventName) {
      try {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { source: "dochain-multichain-assets-20260615", updatedAt: Date.now() },
        }));
      } catch (error) {}
    });
  }

  var running = false;

  function schedulePortfolioRefresh(delay, forceRefresh) {
    window.clearTimeout(portfolioRefreshTimer);
    portfolioRefreshTimer = window.setTimeout(function () {
      refreshPortfolio({ force: forceRefresh === true });
    }, delay || 0);
  }

  function scheduleRun(delay) {
    delay = Math.max(0, Number(delay) || 0);
    var sinceLastRun = Date.now() - lastRunStartedAt;
    if (lastRunStartedAt && sinceLastRun < MIN_RUN_INTERVAL_MS) {
      delay = Math.max(delay, MIN_RUN_INTERVAL_MS - sinceLastRun);
    }
    window.clearTimeout(runTimer);
    runTimer = window.setTimeout(run, delay);
  }

  function run() {
    if (running) {
      rerunRequested = true;
      return;
    }
    running = true;
    lastRunStartedAt = Date.now();
    try {
      markStatus("running");
      clearPortfolioSnapshotsOnceForSchema();
      var changed = false;
      requestProviderWallet(false);
      changed = seedRegistries() || changed;
      changed = patchStoredWallet("user") || changed;
      changed = patchStoredWallet(SELECTED_WALLET_KEY) || changed;
      changed = patchStoredWallet("do-wallet-bridge-wallet") || changed;
      changed = patchStoredWallet("do-wallet-extension-authority.v1") || changed;
      changed = patchKeys() || changed;
      if (changed) dispatchUpdates();
      loadChainCatalog();
      loadTokenCatalog();
      refreshPortfolio();
      if (!chainCatalogLoaded) schedulePortfolioRefresh(2500, true);
      markStatus("seeded", {
        chains: Object.keys(allChains()).length,
        enabled: (readJSON("EnabledNetworks", { networks: [] }).networks || []).length,
        tokenBuckets: Object.keys(readJSON("CustomTokensInterchain", {})).length,
      });
    } catch (error) {
      markStatus("error", { error: String(error && error.message || error).slice(0, 120) });
      throw error;
    } finally {
      running = false;
      if (rerunRequested) {
        rerunRequested = false;
        scheduleRun(MIN_RUN_INTERVAL_MS);
      }
    }
  }

  run();
  scheduleRun(1500);
  window.setInterval(function () { refreshPortfolio(); }, PORTFOLIO_REFRESH_MS);
  window.addEventListener("storage", function (event) {
    var key = event && event.key;
    if (key === SNAPSHOT_KEY || key === SNAPSHOTS_BY_WALLET_KEY || key === SNAPSHOT_RESET_KEY) return;
    scheduleRun(750);
  });
  window.addEventListener("focus", function () { scheduleRun(500); });
  window.addEventListener("do_wallet_bridge_update", function (event) {
    var source = event && event.detail && event.detail.source;
    if (source === "dochain-multichain-assets-20260615") return;
    scheduleRun(300);
  });
  window.addEventListener("do_wallet_chain_assets_update", function (event) {
    var source = event && event.detail && event.detail.source;
    if (source === "dochain-multichain-assets-20260615") return;
    scheduleRun(2500);
  });
  window.doWalletMultichainAssets = { run: run, loadChainCatalog: loadChainCatalog, loadTokenCatalog: loadTokenCatalog, chains: allChains, tokens: NATIVE_TOKENS };
})();
