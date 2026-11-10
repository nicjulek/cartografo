import { BIOME_INDEX } from './biomes'
import { DIRS, HEIGHT, idx, inside, SIZE, WIDTH } from './grid'
import { Rng } from './random'
import type { City, Glyph } from './types'

export function placeGlyphs(
  seed: string,
  biome: Uint8Array,
  elevation: Float32Array,
  riverCell: Uint8Array,
  cities: City[]
): Glyph[] {
  const glyphs: Glyph[] = []
  const blocked = new Uint8Array(SIZE)
  for (const c of cities) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = Math.floor(c.x) + dx
        const y = Math.floor(c.y) + dy
        if (inside(x, y)) blocked[idx(x, y)] = 1
      }
    }
  }
  const step = 2
  for (let gy = 0; gy < HEIGHT; gy += step) {
    for (let gx = 0; gx < WIDTH; gx += step) {
      const rng = new Rng(`${seed}:glyph:${gx}:${gy}`)
      const x = gx + rng.next() * step
      const y = gy + rng.next() * step
      const cx = Math.min(WIDTH - 1, Math.floor(x))
      const cy = Math.min(HEIGHT - 1, Math.floor(y))
      const i = idx(cx, cy)
      if (blocked[i] || riverCell[i]) continue
      const b = biome[i]
      const e = elevation[i]
      if (b === BIOME_INDEX.mountain || b === BIOME_INDEX.snow) {
        if (rng.chance(0.34)) glyphs.push({ kind: 'peak', x, y, s: 0.75 + (e - 0.55) * 1.6 + rng.next() * 0.25 })
      } else if (e > 0.38 && rng.chance(0.16)) {
        glyphs.push({ kind: 'hill', x, y, s: 0.8 + rng.next() * 0.3 })
      } else if (b === BIOME_INDEX.forest) {
        if (rng.chance(0.75)) glyphs.push({ kind: 'tree', x, y, s: 0.8 + rng.next() * 0.35 })
      } else if (b === BIOME_INDEX.rainforest) {
        if (rng.chance(0.8)) glyphs.push({ kind: rng.chance(0.35) ? 'palm' : 'tree', x, y, s: 0.9 + rng.next() * 0.35 })
      } else if (b === BIOME_INDEX.taiga) {
        if (rng.chance(0.75)) glyphs.push({ kind: 'pine', x, y, s: 0.8 + rng.next() * 0.35 })
      } else if (b === BIOME_INDEX.desert) {
        if (rng.chance(0.22)) glyphs.push({ kind: 'dune', x, y, s: 0.9 + rng.next() * 0.4 })
      } else if (b === BIOME_INDEX.marsh) {
        if (rng.chance(0.45)) glyphs.push({ kind: 'tuft', x, y, s: 0.8 + rng.next() * 0.3 })
      } else if (b === BIOME_INDEX.grassland && rng.chance(0.04)) {
        glyphs.push({ kind: 'tree', x, y, s: 0.7 })
      }
    }
  }
  return glyphs.sort((a, b) => a.y - b.y)
}

export interface Region {
  size: number
  x: number
  y: number
}

export function largestRegion(mask: (i: number) => boolean, minSize: number): Region | null {
  const seen = new Uint8Array(SIZE)
  let best: Region | null = null
  const stack: number[] = []
  for (let s = 0; s < SIZE; s++) {
    if (seen[s] || !mask(s)) continue
    seen[s] = 1
    stack.push(s)
    let size = 0
    let sx = 0
    let sy = 0
    const cells: number[] = []
    while (stack.length) {
      const c = stack.pop()!
      cells.push(c)
      const cx = c % WIDTH
      const cy = (c / WIDTH) | 0
      size++
      sx += cx
      sy += cy
      for (let d = 0; d < 8; d++) {
        const nx = cx + DIRS[d][0]
        const ny = cy + DIRS[d][1]
        if (!inside(nx, ny)) continue
        const n = idx(nx, ny)
        if (!seen[n] && mask(n)) {
          seen[n] = 1
          stack.push(n)
        }
      }
    }
    if (size >= minSize && (!best || size > best.size)) {
      const mx = sx / size
      const my = sy / size
      let anchor = cells[0]
      let bestD = Infinity
      for (const c of cells) {
        const d = ((c % WIDTH) - mx) ** 2 + (((c / WIDTH) | 0) - my) ** 2
        if (d < bestD) {
          bestD = d
          anchor = c
        }
      }
      best = { size, x: (anchor % WIDTH) + 0.5, y: ((anchor / WIDTH) | 0) + 0.5 }
    }
  }
  return best
}
