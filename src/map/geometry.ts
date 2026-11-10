import { contours } from 'd3-contour'
import { curveCatmullRom, line } from 'd3-shape'
import { BIOME_INDEX, BIOMES } from '../gen/biomes'
import { blur, HEIGHT, SIZE, WIDTH } from '../gen/grid'
import type { Biome, Point, World } from '../gen/types'

export const CELL = 6
export const MAP_W = WIDTH * CELL
export const MAP_H = HEIGHT * CELL
export const MARGIN = { top: 66, side: 30, bottom: 48 }
export const VIEW = {
  x: -MARGIN.side,
  y: -MARGIN.top,
  w: MAP_W + MARGIN.side * 2,
  h: MAP_H + MARGIN.top + MARGIN.bottom
}
const PAD = 36
export const HOME = { x: VIEW.x - PAD, y: VIEW.y - PAD, w: VIEW.w + PAD * 2, h: VIEW.h + PAD * 2 }

type Ring = number[][]

function chaikin(ring: Ring): Ring {
  if (ring.length < 4) return ring
  const out: Ring = []
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[i + 1]
    out.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75])
  }
  out.push(out[0])
  return out
}

function ringPath(ring: Ring): string {
  let d = ''
  for (let i = 0; i < ring.length; i++) {
    const x = (ring[i][0] * CELL).toFixed(1)
    const y = (ring[i][1] * CELL).toFixed(1)
    d += (i === 0 ? 'M' : 'L') + x + ',' + y
  }
  return d + 'Z'
}

export function isoPath(values: Float32Array | number[], threshold: number, smooth = 1, minRing = 0): string {
  const [shape] = contours().size([WIDTH, HEIGHT]).thresholds([threshold])(values as number[])
  let d = ''
  for (const polygon of shape.coordinates) {
    for (const raw of polygon) {
      if (raw.length < minRing) continue
      let ring = raw as Ring
      for (let k = 0; k < smooth; k++) ring = chaikin(ring)
      d += ringPath(ring)
    }
  }
  return d
}

function indicator(test: (i: number) => boolean, passes: number): Float32Array {
  const field = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) field[i] = test(i) ? 1 : 0
  return passes ? blur(field, passes) : field
}

const curve = line<Point>()
  .x((p) => p.x * CELL)
  .y((p) => p.y * CELL)
  .curve(curveCatmullRom.alpha(0.5))

export function smoothLine(points: Point[]): string {
  return curve(points) ?? ''
}

export interface RiverSegment {
  d: string
  w: number
}

export interface MapGeometry {
  land: string
  lakes: string
  waves: string[]
  biomes: { biome: Biome; d: string }[]
  relief: string[]
  kingdoms: { index: number; d: string }[]
  rivers: RiverSegment[]
  roads: string[]
}

const WASH: Biome[] = ['beach', 'desert', 'steppe', 'grassland', 'forest', 'rainforest', 'taiga', 'tundra', 'marsh', 'mountain', 'snow']

export function buildGeometry(world: World): MapGeometry {
  const { biome, elevation, oceanDistance, kingdomOf } = world
  const ocean = BIOME_INDEX.ocean
  const lake = BIOME_INDEX.lake

  const landField = indicator((i) => biome[i] !== ocean, 1)
  const land = isoPath(landField, 0.5, 2)
  const lakes = isoPath(indicator((i) => biome[i] === lake, 1), 0.5, 2, 6)

  const seaDistance = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) seaDistance[i] = biome[i] === ocean ? oceanDistance[i] : 0
  const waves = [2.2, 4.4, 7.4].map((t) => isoPath(seaDistance, t, 2, 10))

  const biomes = WASH.map((b) => {
    const k = BIOMES.indexOf(b)
    return { biome: b, d: isoPath(indicator((i) => biome[i] === k, 1), 0.45, 2, 8) }
  }).filter((x) => x.d)

  const reliefField = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) reliefField[i] = biome[i] === ocean ? -1 : elevation[i]
  const smoothRelief = blur(reliefField, 1)
  const relief = [0.2, 0.38, 0.56, 0.74].map((t) => isoPath(smoothRelief, t, 1, 10))

  const extended = extendOwners(kingdomOf)
  const kingdoms = world.kingdoms.map((k) => ({
    index: k.index,
    d: isoPath(indicator((i) => extended[i] === k.index, 1), 0.5, 2)
  }))

  const rivers: RiverSegment[] = []
  for (const r of world.rivers) {
    const chunk = 4
    for (let s = 0; s < r.points.length - 1; s += chunk) {
      const part = r.points.slice(Math.max(0, s - 1), s + chunk + 1)
      const widths = r.widths.slice(s, s + chunk)
      const w = widths.reduce((a, b) => a + b, 0) / widths.length
      rivers.push({ d: smoothLine(part), w })
    }
  }

  const roads = world.roads.map((r) => smoothLine(r.points))

  return { land, lakes, waves, biomes, relief, kingdoms, rivers, roads }
}

function extendOwners(kingdomOf: Int16Array): Int16Array {
  const out = kingdomOf.slice()
  let frontier: number[] = []
  for (let i = 0; i < SIZE; i++) if (out[i] >= 0) frontier.push(i)
  while (frontier.length) {
    const next: number[] = []
    for (const c of frontier) {
      const x = c % WIDTH
      const y = (c / WIDTH) | 0
      const around = [x > 0 ? c - 1 : -1, x < WIDTH - 1 ? c + 1 : -1, y > 0 ? c - WIDTH : -1, y < HEIGHT - 1 ? c + WIDTH : -1]
      for (const n of around) {
        if (n >= 0 && out[n] < 0) {
          out[n] = out[c]
          next.push(n)
        }
      }
    }
    frontier = next
  }
  return out
}
