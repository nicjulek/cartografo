import { BIOME_INDEX } from './biomes'
import { DIR_COST, DIRS, HEIGHT, idx, inside, MinHeap, SIZE, WIDTH } from './grid'
import { hashString } from './random'
import type { Point } from './types'

export interface Site {
  cell: number
  x: number
  y: number
  score: number
  port: boolean
}

const FERTILITY: Record<number, number> = {
  [BIOME_INDEX.grassland]: 1,
  [BIOME_INDEX.forest]: 0.7,
  [BIOME_INDEX.steppe]: 0.5,
  [BIOME_INDEX.beach]: 0.6,
  [BIOME_INDEX.rainforest]: 0.45,
  [BIOME_INDEX.taiga]: 0.35,
  [BIOME_INDEX.marsh]: 0.2,
  [BIOME_INDEX.desert]: 0.15,
  [BIOME_INDEX.tundra]: 0.1
}

export function placeSites(
  count: number,
  seed: string,
  biome: Uint8Array,
  elevation: Float32Array,
  oceanDistance: Float32Array,
  riverCell: Uint8Array,
  flow: Float32Array,
  landCells: number
): Site[] {
  const candidates: Site[] = []
  for (let y = 3; y < HEIGHT - 3; y++) {
    for (let x = 3; x < WIDTH - 3; x++) {
      const i = idx(x, y)
      const fert = FERTILITY[biome[i]]
      if (fert === undefined) continue
      let nearWater = false
      let coast = false
      for (let d = 0; d < 8; d++) {
        const n = idx(x + DIRS[d][0], y + DIRS[d][1])
        if (biome[n] === BIOME_INDEX.ocean) coast = true
        if (riverCell[n] || biome[n] === BIOME_INDEX.lake) nearWater = true
      }
      const port = coast && oceanDistance[i] <= 1.5
      let score = fert
      if (port) score += 0.7
      if (riverCell[i]) score += 0.4 + Math.min(0.6, Math.log10(1 + flow[i]) * 0.15)
      else if (nearWater) score += 0.45
      score -= elevation[i] * 0.8
      score += (hashString(`${seed}:site:${i}`) / 4294967296) * 0.35
      candidates.push({ cell: i, x: x + 0.5, y: y + 0.5, score, port })
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  const spacing = Math.max(5, Math.sqrt(landCells / Math.max(1, count)) * 0.62)
  const chosen: Site[] = []
  for (const c of candidates) {
    if (chosen.length >= count) break
    if (chosen.every((s) => (s.x - c.x) ** 2 + (s.y - c.y) ** 2 >= spacing * spacing)) chosen.push(c)
  }
  return chosen
}

export function pickCapitals(sites: Site[], count: number): number[] {
  if (!sites.length) return []
  const capitals = [0]
  while (capitals.length < Math.min(count, sites.length)) {
    let best = -1
    let bestValue = -Infinity
    sites.forEach((s, i) => {
      if (capitals.includes(i)) return
      const near = Math.min(...capitals.map((c) => Math.hypot(sites[c].x - s.x, sites[c].y - s.y)))
      const value = near * (0.6 + s.score * 0.4)
      if (value > bestValue) {
        bestValue = value
        best = i
      }
    })
    capitals.push(best)
  }
  return capitals
}

export function territory(
  capitals: Site[],
  elevation: Float32Array,
  biome: Uint8Array,
  oceanDistance: Float32Array,
  riverCell: Uint8Array
): Int16Array {
  const owner = new Int16Array(SIZE).fill(-1)
  const cost = new Float32Array(SIZE).fill(Infinity)
  const heap = new MinHeap()
  capitals.forEach((c, k) => {
    owner[c.cell] = k
    cost[c.cell] = 0
    heap.push(c.cell, 0)
  })
  const ocean = BIOME_INDEX.ocean
  while (heap.size) {
    const c = heap.pop()
    const cx = c % WIDTH
    const cy = (c / WIDTH) | 0
    for (let d = 0; d < 8; d++) {
      const nx = cx + DIRS[d][0]
      const ny = cy + DIRS[d][1]
      if (!inside(nx, ny)) continue
      const n = idx(nx, ny)
      let step: number
      if (biome[n] === ocean) {
        if (oceanDistance[n] > 7) continue
        step = 7
      } else {
        const slope = Math.abs(elevation[n] - elevation[c]) * 60
        step = 1 + slope + (biome[n] === BIOME_INDEX.mountain || biome[n] === BIOME_INDEX.snow ? 2.5 : 0)
        if (riverCell[n] && !riverCell[c]) step += 3
      }
      const nc = cost[c] + step * DIR_COST[d]
      if (nc < cost[n]) {
        cost[n] = nc
        owner[n] = owner[c]
        heap.push(n, nc)
      }
    }
  }
  for (let i = 0; i < SIZE; i++) {
    if (biome[i] === ocean) {
      owner[i] = -1
      continue
    }
    if (owner[i] >= 0) continue
    const x = i % WIDTH
    const y = (i / WIDTH) | 0
    let best = 0
    let bestD = Infinity
    capitals.forEach((c, k) => {
      const dd = (c.x - x) ** 2 + (c.y - y) ** 2
      if (dd < bestD) {
        bestD = dd
        best = k
      }
    })
    owner[i] = best
  }
  return owner
}

export function routeRoads(
  sites: Site[],
  elevation: Float32Array,
  biome: Uint8Array,
  riverCell: Uint8Array
): Point[][] {
  const pairs = new Set<string>()
  const edges: [number, number][] = []
  sites.forEach((a, i) => {
    const nearest = sites
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2)
    for (const { j, d } of nearest) {
      if (d > 60) continue
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (pairs.has(key)) continue
      pairs.add(key)
      edges.push([i, j])
    }
  })
  edges.sort((p, q) => {
    const dp = Math.hypot(sites[p[0]].x - sites[p[1]].x, sites[p[0]].y - sites[p[1]].y)
    const dq = Math.hypot(sites[q[0]].x - sites[q[1]].x, sites[q[0]].y - sites[q[1]].y)
    return dp - dq
  })

  const road = new Uint8Array(SIZE)
  const paths: Point[][] = []
  for (const [a, b] of edges) {
    const path = aStar(sites[a].cell, sites[b].cell, elevation, biome, riverCell, road)
    if (!path) continue
    for (const c of path) road[c] = 1
    const points = path
      .filter((_, k) => k % 2 === 0 || k === path.length - 1)
      .map((c) => ({ x: (c % WIDTH) + 0.5, y: ((c / WIDTH) | 0) + 0.5 }))
    paths.push(points)
  }
  return paths
}

function aStar(
  start: number,
  goal: number,
  elevation: Float32Array,
  biome: Uint8Array,
  riverCell: Uint8Array,
  road: Uint8Array
): number[] | null {
  const gx = goal % WIDTH
  const gy = (goal / WIDTH) | 0
  const cost = new Map<number, number>([[start, 0]])
  const from = new Map<number, number>()
  const heap = new MinHeap()
  heap.push(start, 0)
  const ocean = BIOME_INDEX.ocean
  const lake = BIOME_INDEX.lake
  let expanded = 0
  while (heap.size) {
    const c = heap.pop()
    if (c === goal) {
      const path = [c]
      let k = c
      while (from.has(k)) {
        k = from.get(k)!
        path.push(k)
      }
      return path.reverse()
    }
    if (++expanded > 9000) return null
    const cx = c % WIDTH
    const cy = (c / WIDTH) | 0
    for (let d = 0; d < 8; d++) {
      const nx = cx + DIRS[d][0]
      const ny = cy + DIRS[d][1]
      if (!inside(nx, ny)) continue
      const n = idx(nx, ny)
      if (biome[n] === ocean || biome[n] === lake) continue
      let step = 1 + Math.abs(elevation[n] - elevation[c]) * 90
      if (biome[n] === BIOME_INDEX.mountain) step += 5
      if (biome[n] === BIOME_INDEX.snow) step += 9
      if (biome[n] === BIOME_INDEX.marsh) step += 2
      if (riverCell[n] && !riverCell[c]) step += 4
      if (road[n]) step *= 0.35
      const nc = cost.get(c)! + step * DIR_COST[d]
      if (nc < (cost.get(n) ?? Infinity)) {
        cost.set(n, nc)
        from.set(n, c)
        heap.push(n, nc + Math.hypot(nx - gx, ny - gy) * 0.35)
      }
    }
  }
  return null
}
