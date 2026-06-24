const { glob } = require("glob");
const path = require("path");
const { Buffer } = require("buffer");
const { Hash } = require("@keplr-wallet/crypto");
const { AccAddress } = require("@terra-money/feather.js");
const fs = require("fs").promises;

const normalizeAssetUrl = (value) =>
  typeof value === "string" && value.startsWith("/img/")
    ? `/station-assets${value}`
    : value;

const normalizeAssetIcons = (value) => {
  if (Array.isArray(value)) return value.map(normalizeAssetIcons);
  if (!value || typeof value !== "object") return value;

  const next = { ...value };
  Object.keys(next).forEach((key) => {
    if (key === "icon") {
      next[key] = normalizeAssetUrl(next[key]);
    } else if (next[key] && typeof next[key] === "object") {
      next[key] = normalizeAssetIcons(next[key]);
    }
  });
  return next;
};

(async () => {
  await fs.mkdir("./build", { recursive: true });

  const chainsOutPath = "./build/chains.json";
  const coinsOutPath = "./build/coins.json";
  const ibcDenomMapOutPath = "./build/ibc_denoms.json";

  const chains = {};
  const coinsOut = {};
  const ibcDenomMapOut = {};
  const tokens = [];

  const groupedChainFiles = await glob("./chains/*/*.js");
  const flatChainFiles = await glob("./chains/*.js");
  const chainFiles = [...new Set([...groupedChainFiles, ...flatChainFiles])];

  chainFiles.forEach((file) => {
    const normalizedFile = file.replace(/\\/g, "/");
    const parts = normalizedFile.split("/");

    let networkType = "mainnet";
    if (parts.length >= 4) {
      networkType = parts[2];
    }

    const fullPath = path.resolve(file);
    delete require.cache[fullPath];
    const chainData = normalizeAssetIcons(require(fullPath));

    if (!chainData || !chainData.chainID) {
      console.log(`Skipping invalid chain file: ${file}`);
      return;
    }

    if (chainData.lcd && networkType !== "localterra" && !isValidUrl(chainData.lcd)) {
      console.log(`${chainData.chainID}: Invalid LCD URL: ${chainData.lcd}`);
      return;
    }

    const chainTokens = Array.isArray(chainData.tokens) ? chainData.tokens : [];

    tokens.push(
      ...chainTokens.map((t) => ({
        ...t,
        chainID: chainData.chainID,
        networkType: chainData.networkType || networkType,
      }))
    );

    const chainOut = {
      ...chainData,
      networkType: chainData.networkType || networkType,
    };

    delete chainOut.tokens;

    chains[chainData.chainID] = chainOut;
  });

  tokens.forEach((token) => {
    const { chainID, networkType, ...coinData } = token;
    const sourceChain = chains[chainID];

    if (!sourceChain) {
      console.log(`${chainID} used by ${coinData.token} is disabled.`);
      return;
    }

    const tokenId = `${chainID}:${coinData.token}`;

    coinsOut[tokenId] = {
      ...coinData,
      chainID,
      networkType,
      chains: [chainID],
    };

    const isICS = AccAddress.validate(coinData.token);
    const terraChain = Object.values(chains).find(({ prefix }) => prefix === "terra");

    if (!isICS && sourceChain.ibc) {
      const channel = sourceChain.ibc.fromTerra;
      const ibcDenomOnTerra = calculateIBCDenom(channel, coinData.token);
      const nonHashedDenom = `transfer/${channel}/${coinData.token}`;

      ibcDenomMapOut[`${terraChain?.chainID}:${ibcDenomOnTerra}`] = {
        token: tokenId,
        chainID: terraChain?.chainID,
        networkType: terraChain?.networkType,
      };

      Object.values(chains).forEach(({ chainID: chainID2, ibc }) => {
        if (!ibc || chainID === chainID2) return;

        const otherChannel = ibc.toTerra;
        const ibcDenomOnOther = calculateIBCDenom(otherChannel, nonHashedDenom);

        ibcDenomMapOut[`${chainID2}:${ibcDenomOnOther}`] = {
          token: tokenId,
          chainID: chainID2,
          networkType: chains[chainID2]?.networkType,
        };
      });
    } else if (isICS && sourceChain?.ibc?.ics) {
      const channel = sourceChain.ibc.ics.fromTerra;
      const denom = `cw20:${coinData.token}`;
      const ibcDenomOnTerra = calculateIBCDenom(channel, denom);
      const nonHashedDenom = `transfer/${channel}/${denom}`;

      ibcDenomMapOut[`${terraChain?.chainID}:${ibcDenomOnTerra}`] = {
        token: tokenId,
        chainID: terraChain?.chainID,
        networkType: terraChain?.networkType,
        icsChannel: channel,
      };

      if (!coinData.isAxelar) {
        Object.values(chains).forEach(({ chainID: chainID2, ibc }) => {
          if (!ibc || chainID === chainID2) return;

          const otherChannel = ibc.toTerra;
          const ibcDenomOnOther = calculateIBCDenom(otherChannel, nonHashedDenom);

          ibcDenomMapOut[`${chainID2}:${ibcDenomOnOther}`] = {
            token: tokenId,
            chainID: chainID2,
            networkType: chains[chainID2]?.networkType,
          };
        });
      }
    } else if (sourceChain.prefix === "terra") {
      if (!isICS) {
        Object.values(chains).forEach(({ chainID: chainID2, ibc }) => {
          if (!ibc || chainID === chainID2) return;

          const ibcDenomOnOther = calculateIBCDenom(ibc.toTerra, coinData.token);

          ibcDenomMapOut[`${chainID2}:${ibcDenomOnOther}`] = {
            token: tokenId,
            chainID: chainID2,
            networkType: chains[chainID2]?.networkType,
          };
        });
      } else {
        Object.values(chains).forEach(({ chainID: chainID2, ibc }) => {
          if (!ibc?.icsFromTerra || chainID === chainID2) return;

          const denom = `cw20:${coinData.token}`;
          const channel = ibc.icsFromTerra.toTerra;
          const ibcDenomOnOther = calculateIBCDenom(channel, denom);

          ibcDenomMapOut[`${chainID2}:${ibcDenomOnOther}`] = {
            token: tokenId,
            chainID: chainID2,
            networkType: chains[chainID2]?.networkType,
            icsChannel: channel,
          };
        });
      }
    }
  });

  await fs.writeFile(chainsOutPath, JSON.stringify(chains, null, 2));
  await fs.writeFile(coinsOutPath, JSON.stringify(coinsOut, null, 2));
  await fs.writeFile(ibcDenomMapOutPath, JSON.stringify(ibcDenomMapOut, null, 2));

  const currenciesList = require("./currencies.js");
  await fs.writeFile(
    "./build/currencies.json",
    JSON.stringify(currenciesList, null, 2)
  );

  const images = [
    ...(await glob("./img/*/*.{png,svg}")),
    ...(await glob("./img/*.{png,svg}")),
  ];

  await Promise.all(
    images.map(async (file) => {
      await fs.mkdir(`./build/${path.dirname(file).replace("./", "")}`, {
        recursive: true,
      });
      await fs.copyFile(file, `./build/${file.replace("./", "")}`);
    })
  );
})();

function calculateIBCDenom(channel, denom) {
  return (
    "ibc/" +
    Buffer.from(Hash.sha256(Buffer.from(`transfer/${channel}/${denom}`)))
      .toString("hex")
      .toUpperCase()
  );
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "136.243.174.47" ||
      parsed.hostname === "do-wallet.com" ||
      parsed.hostname === "www.do-wallet.com"
    ) {
      return true;
    }
    return parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
}
