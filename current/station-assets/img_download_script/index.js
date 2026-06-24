const path = require('path')
const { mkdir, writeFile } = require('fs').promises

const coins = [
  {
    token: 'uaud',
    symbol: 'AUTC',
    name: 'TerraAUD Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/AUT.svg',
    decimals: 6,
  },
  {
    token: 'ucad',
    symbol: 'CATC',
    name: 'TerraCAD Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/CAT.svg',
    decimals: 6,
  },
  {
    token: 'uchf',
    symbol: 'CHTC',
    name: 'TerraCHF Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/CHT.svg',
    decimals: 6,
  },
  {
    token: 'ucny',
    symbol: 'CNTC',
    name: 'TerraCNY Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/CNT.svg',
    decimals: 6,
  },
  {
    token: 'udkk',
    symbol: 'DKTC',
    name: 'TerraDKK Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/DKT.svg',
    decimals: 6,
  },
  {
    token: 'ueur',
    symbol: 'EUTC',
    name: 'TerraEUR Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/EUT.svg',
    decimals: 6,
  },
  {
    token: 'ugbp',
    symbol: 'GPTC',
    name: 'TerraGBP Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/GBT.svg',
    decimals: 6,
  },
  {
    token: 'uhkd',
    symbol: 'HKTC',
    name: 'TerraHKD Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/HKT.svg',
    decimals: 6,
  },
  {
    token: 'uidr',
    symbol: 'IDTC',
    name: 'TerraIDR Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/IDT.svg',
    decimals: 6,
  },
  {
    token: 'uinr',
    symbol: 'INTC',
    name: 'TerraINR Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/INT.svg',
    decimals: 6,
  },
  {
    token: 'ujpy',
    symbol: 'JPTC',
    name: 'TerraJPY Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/JPT.svg',
    decimals: 6,
  },
  {
    token: 'ukrw',
    symbol: 'KRTC',
    name: 'TerraKRW Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/KRT.svg',
    decimals: 6,
  },
  {
    token: 'uluna',
    symbol: 'LUNC',
    name: 'Luna Classic',
    icon: 'https://assets.terra.dev/icon/svg/LUNC.svg',
    decimals: 6,
  },
  {
    token: 'umnt',
    symbol: 'UMNTC',
    name: 'TerraMNT Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/MNT.svg',
    decimals: 6,
  },
  {
    token: 'umyr',
    symbol: 'MYTC',
    name: 'TerraMYR Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/MYT.svg',
    decimals: 6,
  },
  {
    token: 'unok',
    symbol: 'NOTC',
    name: 'TerraNOK Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/NOT.svg',
    decimals: 6,
  },
  {
    token: 'uphp',
    symbol: 'PHTC',
    name: 'TerraPHP Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/PHT.svg',
    decimals: 6,
  },
  {
    token: 'usdr',
    symbol: 'SDRC',
    name: 'TerraSDR Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/SDT.svg',
    decimals: 6,
  },
  {
    token: 'usek',
    symbol: 'SETC',
    name: 'TerraSEK Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/SET.svg',
    decimals: 6,
  },
  {
    token: 'usgd',
    symbol: 'SGTC',
    name: 'TerraSGD Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/SGT.svg',
    decimals: 6,
  },
  {
    token: 'uthb',
    symbol: 'THTC',
    name: 'TerraTHB Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/THT.svg',
    decimals: 6,
  },
  {
    token: 'utwd',
    symbol: 'TWTC',
    name: 'TerraTWD Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/TWT.svg',
    decimals: 6,
  },
  {
    token: 'uusd',
    symbol: 'USTC',
    name: 'TerraUSD Classic',
    icon: 'https://assets.terra.dev/icon/svg/Terra/UST.svg',
    decimals: 6,
  },
]

async function downloadIcon(coin) {
  try {
    if (!coin.icon || !(coin.icon.endsWith('.svg') || coin.icon.endsWith('.png'))) {
      return { ...coin, icon: '' }
    }

    const filename = `${coin.name.replaceAll(' ', '')}.${coin.icon.split('.').pop()}`
    const localPath = `img_download_script/img/${filename}`

    const response = await fetch(coin.icon)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await mkdir(path.dirname(localPath), { recursive: true })
    await writeFile(localPath, Buffer.from(await response.arrayBuffer()))

    console.log('Image downloaded successfully!')
    return { ...coin, icon: `PLACEHOLDER_URL/img/coins/${filename}` }
  } catch (e) {
    console.error(`Unable to fetch ${coin.name} icon`)
    return { ...coin, icon: '' }
  }
}

Promise.all(coins.map(downloadIcon)).then(console.log)
