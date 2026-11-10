import { createNoise2D, type NoiseFunction2D } from 'simplex-noise'
import { blur, HEIGHT, idx, SIZE, WIDTH } from './grid'
import { Rng } from './random'
import type { Sketch, WorldParams } from './types'

function fbm(noise: NoiseFunction2D, x: number, y: number, octaves: number): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, y * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.05
  }
  return sum / norm
}

function ridged(noise: NoiseFunction2D, x: number, y: number): number {
  let sum = 0
  let amp = 0.6
  let freq = 1
  for (let o = 0; o < 4; o++) {
    const n = 1 - Math.abs(noise(x * freq, y * freq))
    sum += n * n * amp
    amp *= 0.5
    freq *= 2.1
  }
  return sum
}

interface Blob {
  x: number
  y: number
  rx: number
  ry: number
  weight: number
}

function blobs(rng: Rng, params: WorldParams): Blob[] {
  const cx = WIDTH / 2
  const cy = HEIGHT / 2
  if (params.shape === 'continente') {
    return [
      { x: cx, y: cy, rx: WIDTH * 0.56, ry: HEIGHT * 0.52, weight: 1 },
      { x: cx + rng.range(-40, 40), y: cy + rng.range(-20, 20), rx: 50, ry: 36, weight: 0.4 }
    ]
  }
  if (params.shape === 'arquipelago') {
    const list: Blob[] = []
    const count = rng.int(6, 9)
    for (let i = 0; i < count; i++) {
      const r = rng.range(13, 25)
      list.push({
        x: rng.range(WIDTH * 0.14, WIDTH * 0.86),
        y: rng.range(HEIGHT * 0.16, HEIGHT * 0.84),
        rx: r * rng.range(0.9, 1.6),
        ry: r * rng.range(0.7, 1.1),
        weight: rng.range(0.75, 1)
      })
    }
    return list
  }
  return [
    { x: cx + rng.range(-8, 8), y: cy + rng.range(-5, 5), rx: WIDTH * 0.4, ry: HEIGHT * 0.42, weight: 1 },
    { x: cx + rng.range(-46, 46), y: cy + rng.range(-24, 24), rx: rng.range(26, 40), ry: rng.range(18, 28), weight: 0.6 }
  ]
}

function sketchField(sketch: Sketch | null): Float32Array | null {
  if (!sketch) return null
  let any = false
  const field = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    field[i] = sketch[i]
    if (sketch[i] !== 0) any = true
  }
  return any ? blur(field, 3) : null
}

export function buildElevation(params: WorldParams, sketch: Sketch | null): Float32Array {
  const rng = new Rng(`${params.seed}:terrain`)
  const noise = createNoise2D(() => rng.next())
  const warp = createNoise2D(() => rng.next())
  const ridge = createNoise2D(() => rng.next())
  const shapes = blobs(rng.fork('blobs'), params)
  const sketched = sketchField(sketch)

  const sea = 0.37 + (params.seaLevel - 0.5) * 0.3
  const raw = new Float32Array(SIZE)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const wx = x + warp(x / 40, y / 40) * 14
      const wy = y + warp(x / 40 + 31, y / 40 + 17) * 14
      let shape = 0
      for (const b of shapes) {
        const dx = (wx - b.x) / b.rx
        const dy = (wy - b.y) / b.ry
        shape = Math.max(shape, (1 - Math.sqrt(dx * dx + dy * dy)) * b.weight)
      }
      const detail = fbm(noise, x / 46, y / 46, 6)
      let h = shape * 0.8 + detail * 0.42 + 0.26
      const i = idx(x, y)
      const edge = Math.min(x, y, WIDTH - 1 - x, HEIGHT - 1 - y)
      if (edge < 10) h -= ((10 - edge) / 10) ** 2 * 0.6
      const landness = Math.min(1, Math.max(0, (h - 0.45) / 0.3))
      h += ridged(ridge, x / 38, y / 38) * params.mountains * 0.42 * landness
      if (sketched) {
        const k = Math.min(1, Math.abs(sketched[i]) * 1.6)
        if (sketched[i] > 0) h = h + (Math.max(h, sea + 0.08 + detail * 0.12 + 0.06) - h) * k
        else if (sketched[i] < 0) h = h + (Math.min(h, sea - 0.12) - h) * k
      }
      raw[i] = h
    }
  }

  const elevation = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    const v = raw[i] - sea
    elevation[i] = v >= 0 ? Math.min(1, Math.pow(v / 0.78, 1.15)) : Math.max(-1, v / 0.45)
  }
  return elevation
}
