import { createNoise2D } from 'simplex-noise'
import { DIR_COST, DIRS, HEIGHT, idx, inside, MinHeap, SIZE, WIDTH } from './grid'
import { Rng } from './random'
import type { Point, River } from './types'

export const WATER_NONE = 0
export const WATER_OCEAN = 1
export const WATER_LAKE = 2

export interface Drainage {
  water: Uint8Array
  down: Int32Array
  order: Int32Array
}

function components(mask: Uint8Array): Int32Array {
  const comp = new Int32Array(SIZE).fill(-1)
  let id = 0
  const stack: number[] = []
  for (let s = 0; s < SIZE; s++) {
    if (!mask[s] || comp[s] >= 0) continue
    comp[s] = id
    stack.push(s)
    while (stack.length) {
      const c = stack.pop()!
      const cx = c % WIDTH
      const cy = (c / WIDTH) | 0
      for (let d = 0; d < 4; d++) {
        const nx = cx + DIRS[d][0]
        const ny = cy + DIRS[d][1]
        if (!inside(nx, ny)) continue
        const n = idx(nx, ny)
        if (mask[n] && comp[n] < 0) {
          comp[n] = id
          stack.push(n)
        }
      }
    }
    id++
  }
  return comp
}

export function drain(elevation: Float32Array): Drainage {
  const below = new Uint8Array(SIZE)
  for (let i = 0; i < SIZE; i++) below[i] = elevation[i] < 0 ? 1 : 0
  const comp = components(below)
  const oceanComps = new Set<number>()
  for (let x = 0; x < WIDTH; x++) {
    oceanComps.add(comp[idx(x, 0)])
    oceanComps.add(comp[idx(x, HEIGHT - 1)])
  }
  for (let y = 0; y < HEIGHT; y++) {
    oceanComps.add(comp[idx(0, y)])
    oceanComps.add(comp[idx(WIDTH - 1, y)])
  }
  oceanComps.delete(-1)

  const water = new Uint8Array(SIZE)
  for (let i = 0; i < SIZE; i++) if (comp[i] >= 0 && oceanComps.has(comp[i])) water[i] = WATER_OCEAN
  const islands = components(water.map((w) => (w ? 0 : 1)))
  const islandSize = new Map<number, number>()
  for (let i = 0; i < SIZE; i++) if (islands[i] >= 0) islandSize.set(islands[i], (islandSize.get(islands[i]) ?? 0) + 1)
  for (let i = 0; i < SIZE; i++) {
    if (islands[i] >= 0 && (islandSize.get(islands[i]) ?? 0) < 10) elevation[i] = Math.min(elevation[i], -0.02)
  }
  const filled = new Float32Array(SIZE)
  const down = new Int32Array(SIZE).fill(-1)
  const visited = new Uint8Array(SIZE)
  const order = new Int32Array(SIZE)
  let count = 0
  const heap = new MinHeap()

  for (let i = 0; i < SIZE; i++) {
    if (water[i] === WATER_OCEAN || (islands[i] >= 0 && (islandSize.get(islands[i]) ?? 0) < 10)) {
      water[i] = WATER_OCEAN
      filled[i] = elevation[i]
      visited[i] = 1
      heap.push(i, elevation[i])
    }
  }

  while (heap.size) {
    const c = heap.pop()
    order[count++] = c
    const cx = c % WIDTH
    const cy = (c / WIDTH) | 0
    for (let d = 0; d < 8; d++) {
      const nx = cx + DIRS[d][0]
      const ny = cy + DIRS[d][1]
      if (!inside(nx, ny)) continue
      const n = idx(nx, ny)
      if (visited[n]) continue
      visited[n] = 1
      filled[n] = Math.max(elevation[n], filled[c] + 1e-5)
      down[n] = c
      heap.push(n, filled[n])
    }
  }

  const pooled = new Uint8Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    if (water[i]) continue
    if (filled[i] - elevation[i] > 0.02 || elevation[i] < 0) pooled[i] = 1
  }
  const lakes = components(pooled)
  const sizes = new Map<number, number>()
  for (let i = 0; i < SIZE; i++) if (lakes[i] >= 0) sizes.set(lakes[i], (sizes.get(lakes[i]) ?? 0) + 1)
  for (let i = 0; i < SIZE; i++) {
    if (lakes[i] < 0) continue
    if ((sizes.get(lakes[i]) ?? 0) >= 8) water[i] = WATER_LAKE
    else elevation[i] = Math.max(0.005, filled[i])
  }
  for (let i = 0; i < SIZE; i++) {
    if (!water[i] && elevation[i] < 0) elevation[i] = 0.005
  }

  return { water, down, order: order.slice(0, count) }
}

export function distanceFrom(sources: (i: number) => boolean, passable: (i: number) => boolean): Float32Array {
  const dist = new Float32Array(SIZE).fill(Infinity)
  const heap = new MinHeap()
  for (let i = 0; i < SIZE; i++) {
    if (sources(i)) {
      dist[i] = 0
      heap.push(i, 0)
    }
  }
  while (heap.size) {
    const c = heap.pop()
    const cx = c % WIDTH
    const cy = (c / WIDTH) | 0
    for (let d = 0; d < 8; d++) {
      const nx = cx + DIRS[d][0]
      const ny = cy + DIRS[d][1]
      if (!inside(nx, ny)) continue
      const n = idx(nx, ny)
      if (!passable(n)) continue
      const nd = dist[c] + DIR_COST[d]
      if (nd < dist[n]) {
        dist[n] = nd
        heap.push(n, nd)
      }
    }
  }
  return dist
}

export function accumulate(drainage: Drainage, moisture: Float32Array): Float32Array {
  const flow = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) flow[i] = drainage.water[i] === WATER_OCEAN ? 0 : 0.35 + moisture[i]
  const { order, down, water } = drainage
  for (let k = order.length - 1; k >= 0; k--) {
    const c = order[k]
    if (water[c] === WATER_OCEAN) continue
    const d = down[c]
    if (d >= 0) flow[d] += flow[c]
  }
  return flow
}

export function traceRivers(
  drainage: Drainage,
  flow: Float32Array,
  density: number,
  seed: string
): { rivers: River[]; riverCell: Uint8Array } {
  const threshold = 140 - 115 * density
  const { water, down } = drainage
  const isRiver = new Uint8Array(SIZE)
  for (let i = 0; i < SIZE; i++) if (!water[i] && flow[i] >= threshold) isRiver[i] = 1

  const upstream = new Uint8Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    if (isRiver[i] && down[i] >= 0 && isRiver[down[i]]) upstream[down[i]]++
  }

  const rng = new Rng(`${seed}:rivers`)
  const wobble = createNoise2D(() => rng.next())
  const rivers: River[] = []
  const riverCell = new Uint8Array(SIZE)
  const heads: number[] = []
  for (let i = 0; i < SIZE; i++) if (isRiver[i] && upstream[i] === 0) heads.push(i)
  heads.sort((a, b) => flow[a] - flow[b])

  const claimed = new Uint8Array(SIZE)
  const toPoint = (c: number): Point => {
    const x = c % WIDTH
    const y = (c / WIDTH) | 0
    return {
      x: x + 0.5 + wobble(x / 6, y / 6) * 0.35,
      y: y + 0.5 + wobble(x / 6 + 40, y / 6 + 40) * 0.35
    }
  }

  for (const head of heads) {
    const points: Point[] = []
    const widths: number[] = []
    let c = head
    while (c >= 0) {
      points.push(toPoint(c))
      widths.push(flow[c])
      if (water[c]) break
      if (claimed[c] && c !== head) break
      claimed[c] = 1
      riverCell[c] = 1
      c = down[c]
    }
    if (points.length >= 6) {
      rivers.push({
        id: `r${rivers.length}`,
        points,
        widths: widths.map((f) => Math.min(2.4, 0.35 + Math.sqrt(f / threshold) * 0.45))
      })
    }
  }
  return { rivers, riverCell }
}
