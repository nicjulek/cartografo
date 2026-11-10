import { createNoise2D } from 'simplex-noise'
import { blur, HEIGHT, idx, SIZE, WIDTH } from './grid'
import { WATER_LAKE, WATER_OCEAN } from './hydrology'
import { Rng } from './random'
import type { Biome, WorldParams } from './types'

export const BIOMES: Biome[] = [
  'ocean', 'lake', 'beach', 'desert', 'steppe', 'grassland', 'forest',
  'rainforest', 'taiga', 'tundra', 'marsh', 'mountain', 'snow'
]

export const BIOME_INDEX = Object.fromEntries(BIOMES.map((b, i) => [b, i])) as Record<Biome, number>

export const BIOME_LABEL: Record<Biome, string> = {
  ocean: 'Mar',
  lake: 'Lago',
  beach: 'Praia',
  desert: 'Deserto',
  steppe: 'Estepe',
  grassland: 'Campos',
  forest: 'Floresta',
  rainforest: 'Selva',
  taiga: 'Taiga',
  tundra: 'Tundra',
  marsh: 'Pântano',
  mountain: 'Montanhas',
  snow: 'Neves eternas'
}

export function buildMoisture(params: WorldParams, oceanDistance: Float32Array, water: Uint8Array): Float32Array {
  const rng = new Rng(`${params.seed}:moisture`)
  const noise = createNoise2D(() => rng.next())
  const out = new Float32Array(SIZE)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = idx(x, y)
      const n = noise(x / 34, y / 34) * 0.6 + noise(x / 12, y / 12) * 0.2
      const sea = Math.exp(-oceanDistance[i] / 14)
      const lake = water[i] === WATER_LAKE ? 0.4 : 0
      out[i] = Math.min(1, Math.max(0, params.moisture * 0.75 + n * 0.32 + sea * 0.22 + lake - 0.12))
    }
  }
  return out
}

export function buildTemperature(params: WorldParams, elevation: Float32Array): Float32Array {
  const rng = new Rng(`${params.seed}:temperature`)
  const noise = createNoise2D(() => rng.next())
  const out = new Float32Array(SIZE)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = idx(x, y)
      const latitude = y / (HEIGHT - 1)
      const e = Math.max(0, elevation[i])
      out[i] = params.temperature * 0.8 + (latitude - 0.5) * 0.55 + 0.12 - e * 0.55 + noise(x / 50, y / 50) * 0.08
    }
  }
  return out
}

export function classify(
  elevation: Float32Array,
  water: Uint8Array,
  moisture: Float32Array,
  temperature: Float32Array,
  oceanDistance: Float32Array,
  riverCell: Uint8Array
): Uint8Array {
  const wet = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) wet[i] = riverCell[i] ? 1 : 0
  const nearRiver = blur(wet, 3)
  const biome = new Uint8Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    if (water[i] === WATER_OCEAN) {
      biome[i] = BIOME_INDEX.ocean
      continue
    }
    if (water[i] === WATER_LAKE) {
      biome[i] = BIOME_INDEX.lake
      continue
    }
    const e = elevation[i]
    const t = temperature[i]
    const m = Math.min(1, moisture[i] + nearRiver[i] * 0.5)
    let b: Biome
    if (e > 0.78 || (e > 0.5 && t < 0.1)) b = 'snow'
    else if (e > 0.6) b = 'mountain'
    else if (t < 0.12) b = 'tundra'
    else if (oceanDistance[i] <= 1.5 && e < 0.07 && t > 0.3) b = 'beach'
    else if (m > 0.78 && e < 0.12 && t > 0.25) b = 'marsh'
    else if (t < 0.32) b = m > 0.42 ? 'taiga' : 'tundra'
    else if (m < 0.22 && t > 0.48) b = 'desert'
    else if (m < 0.36) b = 'steppe'
    else if (m > 0.66 && t > 0.62) b = 'rainforest'
    else if (m > 0.5) b = 'forest'
    else b = 'grassland'
    biome[i] = BIOME_INDEX[b]
  }
  return biome
}
