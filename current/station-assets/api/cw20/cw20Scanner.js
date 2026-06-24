const fs = require("fs")
const path = require("path")
const axios = require("axios")

const DEFAULT_CHAIN_ID = "columbus-5"
const OUTPUT_FILE = path.join(__dirname, "cw20Tokens.json")

const SMART_QUERY_TIMEOUT = 15000
const PAGE_LIMIT = 100
const CONCURRENCY = 4
const RECENT_CODE_IDS = Number(process.env.CW20_RECENT_CODE_IDS || 500)
const REFRESH_EXISTING = String(process.env.CW20_REFRESH_EXISTING || "false").toLowerCase() === "true"

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function findFirstExistingPath(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function getChainsJsonPath() {
  const candidates = [
    process.env.CHAINS_JSON_PATH,

    path.resolve(process.cwd(), "public/chains.json"),
    path.resolve(process.cwd(), "src/chains.json"),
    path.resolve(process.cwd(), "chains.json"),
    path.resolve(process.cwd(), "build/chains.json"),

    path.resolve(process.cwd(), "../station-assets/build/chains.json"),
    path.resolve(process.cwd(), "../../station-assets/build/chains.json"),
    path.resolve(process.cwd(), "station-assets/build/chains.json"),

    path.resolve(__dirname, "../public/chains.json"),
    path.resolve(__dirname, "../../public/chains.json"),
    path.resolve(__dirname, "../../../public/chains.json"),

    path.resolve(__dirname, "../build/chains.json"),
    path.resolve(__dirname, "../../build/chains.json"),
    path.resolve(__dirname, "../../../build/chains.json"),

    path.resolve(__dirname, "../station-assets/build/chains.json"),
    path.resolve(__dirname, "../../station-assets/build/chains.json"),
    path.resolve(__dirname, "../../../station-assets/build/chains.json"),
  ]

  const found = findFirstExistingPath(candidates)

  if (found) return found

  throw new Error(
    "Could not find chains.json. Set CHAINS_JSON_PATH or place chains.json in a standard project location."
  )
}

function loadChainsConfig() {
  const chainsPath = getChainsJsonPath()
  const raw = fs.readFileSync(chainsPath, "utf8")
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("chains.json did not contain a valid chain map")
  }

  return parsed
}

function getChainConfig(chainID) {
  const chains = loadChainsConfig()
  const chain = chains[chainID]

  if (!chain || typeof chain !== "object") {
    throw new Error(`Chain "${chainID}" not found in chains.json`)
  }

  const lcd = chain.lcd || chain.api || ""
  if (!lcd) {
    throw new Error(`Chain "${chainID}" has no lcd/api in chains.json`)
  }

  return {
    chainID: chain.chainID || chainID,
    lcd,
    chainType: chain.chainType || "cosmos",
    name: chain.name || chainID,
  }
}

const { chainID: ACTIVE_CHAIN_ID, lcd: LCD, chainType: ACTIVE_CHAIN_TYPE } =
  getChainConfig(process.env.CW20_SCAN_CHAIN_ID || DEFAULT_CHAIN_ID)

if (ACTIVE_CHAIN_TYPE === "bitcoin") {
  throw new Error(`Chain "${ACTIVE_CHAIN_ID}" is not a CosmWasm chain`)
}

const toBase64Query = (queryObj) => {
  return Buffer.from(JSON.stringify(queryObj)).toString("base64")
}

const readExistingTokens = () => {
  try {
    const raw = fs.readFileSync(OUTPUT_FILE, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeTokens = (tokens) => {
  const sorted = [...tokens].sort((a, b) =>
    String(a.symbol || a.contract).localeCompare(String(b.symbol || b.contract))
  )

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2), "utf8")
}

const getAllCodeIds = async () => {
  const codeIds = []
  let nextKey = null

  while (true) {
    const url = `${LCD}/cosmwasm/wasm/v1/code`
    const params = {
      "pagination.limit": PAGE_LIMIT,
    }

    if (nextKey) {
      params["pagination.key"] = nextKey
    }

    const { data } = await axios.get(url, {
      params,
      timeout: 30000,
    })

    const codes = Array.isArray(data?.code_infos) ? data.code_infos : []
    for (const item of codes) {
      if (item?.code_id) {
        codeIds.push(String(item.code_id))
      }
    }

    nextKey = data?.pagination?.next_key
    if (!nextKey) break

    await sleep(150)
  }

  return codeIds
}

const getContractsForCodeId = async (codeId) => {
  const contracts = []
  let nextKey = null

  while (true) {
    const url = `${LCD}/cosmwasm/wasm/v1/code/${codeId}/contracts`
    const params = {
      "pagination.limit": PAGE_LIMIT,
    }

    if (nextKey) {
      params["pagination.key"] = nextKey
    }

    const { data } = await axios.get(url, {
      params,
      timeout: 30000,
    })

    const list = Array.isArray(data?.contracts) ? data.contracts : []
    for (const contract of list) {
      if (typeof contract === "string" && contract.startsWith("terra1")) {
        contracts.push(contract)
      }
    }

    nextKey = data?.pagination?.next_key
    if (!nextKey) break

    await sleep(150)
  }

  return contracts
}

const queryTokenInfo = async (contract) => {
  const query = toBase64Query({ token_info: {} })
  const url = `${LCD}/cosmwasm/wasm/v1/contract/${contract}/smart/${query}`

  const { data } = await axios.get(url, {
    timeout: SMART_QUERY_TIMEOUT,
  })

  const info = data?.data
  if (!info) return null

  const symbol = typeof info.symbol === "string" ? info.symbol : ""
  const name = typeof info.name === "string" ? info.name : ""
  const decimals =
    typeof info.decimals === "number" ? info.decimals : Number(info.decimals)

  if (!symbol || !name || Number.isNaN(decimals)) {
    return null
  }

  return {
    symbol,
    name,
    decimals,
    totalSupply:
      typeof info.total_supply === "string" ? info.total_supply : "",
  }
}

const runPool = async (items, worker, concurrency = CONCURRENCY) => {
  const results = []
  let index = 0

  const runners = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = items[index++]
      try {
        const result = await worker(current)
        if (result) results.push(result)
      } catch {
      }
      await sleep(100)
    }
  })

  await Promise.all(runners)
  return results
}

const main = async () => {
  console.log(`Reading existing CW20 tokens for ${ACTIVE_CHAIN_ID}...`)
  const existing = readExistingTokens()
  const existingMap = new Map(existing.map((t) => [t.contract, t]))

  console.log(`Fetching all code IDs from ${LCD}...`)
  const allCodeIds = await getAllCodeIds()

  const codeIds =
    RECENT_CODE_IDS > 0 ? allCodeIds.slice(-RECENT_CODE_IDS) : allCodeIds

  console.log(`Scanning ${codeIds.length} code IDs on ${ACTIVE_CHAIN_ID}`)

  const discovered = []

  for (let i = 0; i < codeIds.length; i++) {
    const codeId = codeIds[i]
    console.log(`Scanning code ID ${codeId} (${i + 1}/${codeIds.length})...`)

    let contracts = []
    try {
      contracts = await getContractsForCodeId(codeId)
    } catch (err) {
      console.log(`Skipping code ID ${codeId}: ${err.message}`)
      continue
    }

    if (!contracts.length) continue

    const filteredContracts = REFRESH_EXISTING
      ? contracts
      : contracts.filter((contract) => !existingMap.has(contract))

    if (!filteredContracts.length) continue

    const cw20Results = await runPool(
      filteredContracts,
      async (contract) => {
        const info = await queryTokenInfo(contract)
        if (!info) return null

        const existingToken = existingMap.get(contract)

        return {
          contract,
          symbol: info.symbol,
          name: info.name,
          decimals: info.decimals,
          icon: existingToken?.icon || "",
          chainID: existingToken?.chainID || ACTIVE_CHAIN_ID,
          verified: existingToken?.verified ?? false,
          codeId,
          totalSupply: info.totalSupply,
          lastChecked: new Date().toISOString(),
        }
      },
      CONCURRENCY
    )

    if (cw20Results.length) {
      console.log(
        `Found ${cw20Results.length} CW20 token(s) under code ID ${codeId}`
      )
      discovered.push(...cw20Results)

      const mergedMap = new Map(existing.map((t) => [t.contract, t]))
      for (const token of discovered) {
        mergedMap.set(token.contract, token)
      }

      writeTokens([...mergedMap.values()])
      console.log(`Saved progress to ${OUTPUT_FILE}`)
    }
  }

  const finalMap = new Map(existing.map((t) => [t.contract, t]))
  for (const token of discovered) {
    finalMap.set(token.contract, token)
  }

  const finalTokens = [...finalMap.values()]
  writeTokens(finalTokens)

  console.log(`Done. Saved ${finalTokens.length} CW20 token(s) to:`)
  console.log(OUTPUT_FILE)
}

main().catch((err) => {
  console.error("CW20 scan failed:")
  console.error(err)
  process.exit(1)
})