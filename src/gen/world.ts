import { BIOME_INDEX, buildMoisture, buildTemperature, classify } from './biomes'
import { largestRegion, placeGlyphs } from './features'
import { DIRS, HEIGHT, idx, inside, SIZE, WIDTH } from './grid'
import { accumulate, distanceFrom, drain, traceRivers, WATER_OCEAN } from './hydrology'
import { cityName, desertName, forestName, makeLanguage, NameMaker, rangeName, realmName, seaName, type Language } from './names'
import { Rng } from './random'
import { pickCapitals, placeSites, routeRoads, territory } from './settlements'
import { buildElevation } from './terrain'
import type { City, Kingdom, Label, Sketch, World, WorldParams } from './types'

export const DEFAULT_PARAMS: WorldParams = {
  seed: 'bruma-farol-412',
  shape: 'ilha',
  seaLevel: 0.5,
  mountains: 0.45,
  moisture: 0.5,
  temperature: 0.5,
  rivers: 0.55,
  cities: 16,
  kingdoms: 4
}

export function generateWorld(params: WorldParams, sketch: Sketch | null = null): World {
  const elevation = buildElevation(params, sketch)
  const drainage = drain(elevation)
  const { water } = drainage

  const toOcean = distanceFrom((i) => water[i] === WATER_OCEAN, () => true)
  const toLand = distanceFrom((i) => water[i] !== WATER_OCEAN, () => true)
  const oceanDistance = new Float32Array(SIZE)
  let landCells = 0
  for (let i = 0; i < SIZE; i++) {
    const ocean = water[i] === WATER_OCEAN
    oceanDistance[i] = ocean ? toLand[i] : toOcean[i]
    if (!water[i]) landCells++
  }

  const moisture = buildMoisture(params, toOcean, water)
  const temperature = buildTemperature(params, elevation)
  const flow = accumulate(drainage, moisture)
  const { rivers, riverCell } = traceRivers(drainage, flow, params.rivers, params.seed)
  const biome = classify(elevation, water, moisture, temperature, toOcean, riverCell)

  const sites = placeSites(params.cities, params.seed, biome, elevation, toOcean, riverCell, flow, landCells)
  const capitalIdx = pickCapitals(sites, params.kingdoms)
  const capitals = capitalIdx.map((i) => sites[i])
  const kingdomOf = capitals.length
    ? territory(capitals, elevation, biome, toLand.map((d, i) => (water[i] === WATER_OCEAN ? d : 0)), riverCell)
    : new Int16Array(SIZE).fill(-1)

  const rng = new Rng(`${params.seed}:names`)
  const namer = new NameMaker(rng.fork('words'))
  const worldLanguage = makeLanguage(rng.fork('world'))
  const worldName = namer.word(worldLanguage)
  const dialects = new Map<string, Language>()
  const dialectAt = (x: number, y: number) => {
    const key = `${Math.floor(x / 40)}:${Math.floor(y / 40)}`
    let lang = dialects.get(key)
    if (!lang) {
      lang = makeLanguage(new Rng(`${params.seed}:lang:${key}`))
      dialects.set(key, lang)
    }
    return lang
  }

  const cities: City[] = sites.map((s, i) => {
    const k = kingdomOf[s.cell]
    const lang = dialectAt(s.x, s.y)
    const local = new Rng(`${params.seed}:city:${s.cell}`)
    return {
      id: `c${s.cell}`,
      name: cityName(local, namer.word(lang, local), s.port),
      x: s.x,
      y: s.y,
      capital: capitalIdx.includes(i),
      kingdom: k,
      port: s.port
    }
  })

  const border = new Uint8Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    if (kingdomOf[i] < 0) {
      border[i] = 1
      continue
    }
    const x = i % WIDTH
    const y = (i / WIDTH) | 0
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d][0]
      const ny = y + DIRS[d][1]
      if (!inside(nx, ny) || kingdomOf[idx(nx, ny)] !== kingdomOf[i]) {
        border[i] = 1
        break
      }
    }
  }
  const inner = distanceFrom((i) => border[i] === 1, () => true)

  const crowded = new Uint8Array(SIZE)
  for (const c of cities) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -14; dx <= 14; dx++) {
        const x = Math.floor(c.x) + dx
        const y = Math.floor(c.y) + dy
        if (inside(x, y)) crowded[idx(x, y)] = 1
      }
    }
  }

  const hueStep = 360 / Math.max(1, capitals.length)
  const hueOffset = rng.range(0, 360)
  const kingdoms: Kingdom[] = capitals.map((_, k) => {
    let area = 0
    let best = -1
    let bestD = -1
    for (let i = 0; i < SIZE; i++) {
      if (kingdomOf[i] !== k) continue
      area++
      if (crowded[i]) continue
      if (inner[i] > bestD) {
        bestD = inner[i]
        best = i
      }
    }
    const capitalCity = cities[capitalIdx[k]]
    const realm = new Rng(`${params.seed}:realm:${capitals[k].cell}`)
    const word = capitalCity.name.replace(/^(Porto|Vila) /, '')
    return {
      id: `k${capitals[k].cell}`,
      index: k,
      name: realmName(realm, realm.chance(0.5) ? word : namer.word(dialectAt(capitals[k].x, capitals[k].y), realm)),
      capital: capitalCity.id,
      label: best >= 0 ? { x: (best % WIDTH) + 0.5, y: ((best / WIDTH) | 0) + 0.5 } : { x: capitalCity.x, y: capitalCity.y },
      area,
      hue: (hueOffset + k * hueStep) % 360
    }
  })

  const roads = routeRoads(sites, elevation, biome, riverCell).map((points, i) => ({ id: `e${i}`, points }))
  const glyphs = placeGlyphs(params.seed, biome, elevation, riverCell, cities)

  const labelRng = (kind: string) => new Rng(`${params.seed}:label:${kind}`)
  const labels: Label[] = []
  let seaCell = -1
  let seaD = 0
  for (let i = 0; i < SIZE; i++) {
    if (water[i] === WATER_OCEAN && oceanDistance[i] > seaD) {
      const x = i % WIDTH
      const y = (i / WIDTH) | 0
      if (x < 18 || x > WIDTH - 18 || y < 8 || y > HEIGHT - 8) continue
      seaD = oceanDistance[i]
      seaCell = i
    }
  }
  if (seaCell >= 0 && seaD > 6) {
    labels.push({ id: 'sea', kind: 'sea', name: seaName(labelRng('sea'), namer.word(worldLanguage, labelRng('seaw'))), x: (seaCell % WIDTH) + 0.5, y: ((seaCell / WIDTH) | 0) + 0.5 })
  }
  const range = largestRegion((i) => biome[i] === BIOME_INDEX.mountain || biome[i] === BIOME_INDEX.snow, 18)
  if (range) labels.push({ id: 'range', kind: 'range', name: rangeName(labelRng('range'), namer.word(worldLanguage, labelRng('rangew'))), x: range.x, y: range.y + 3 })
  const forest = largestRegion((i) => biome[i] === BIOME_INDEX.forest || biome[i] === BIOME_INDEX.rainforest || biome[i] === BIOME_INDEX.taiga, 70)
  if (forest) labels.push({ id: 'forest', kind: 'forest', name: forestName(labelRng('forest'), namer.word(worldLanguage, labelRng('forestw'))), x: forest.x, y: forest.y })
  const desert = largestRegion((i) => biome[i] === BIOME_INDEX.desert, 40)
  if (desert) labels.push({ id: 'desert', kind: 'desert', name: desertName(labelRng('desert'), namer.word(worldLanguage, labelRng('desertw'))), x: desert.x, y: desert.y })

  return {
    params,
    width: WIDTH,
    height: HEIGHT,
    name: worldName,
    elevation,
    biome,
    kingdomOf,
    oceanDistance,
    rivers,
    cities,
    kingdoms,
    roads,
    glyphs,
    labels,
    landRatio: landCells / SIZE
  }
}
