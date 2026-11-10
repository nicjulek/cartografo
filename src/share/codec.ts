import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { SIZE } from '../gen/grid'
import type { Shape, Sketch, WorldParams } from '../gen/types'

export interface Pin {
  id: string
  x: number
  y: number
  title: string
  text: string
}

export interface Snapshot {
  params: WorldParams
  sketch: Sketch | null
  title: string | null
  names: Record<string, string>
  notes: Record<string, string>
  pins: Pin[]
}

interface Encoded {
  v: 1
  p: [string, Shape, number, number, number, number, number, number, number]
  s?: number[]
  t?: string
  n?: Record<string, string>
  l?: Record<string, string>
  a?: [number, number, string, string][]
}

const round = (n: number) => Math.round(n * 100) / 100

export function encodeSketch(sketch: Sketch): number[] {
  const runs: number[] = []
  let value = sketch[0]
  let count = 0
  for (let i = 0; i < sketch.length; i++) {
    if (sketch[i] === value) count++
    else {
      runs.push(value, count)
      value = sketch[i]
      count = 1
    }
  }
  runs.push(value, count)
  return runs
}

export function decodeSketch(runs: number[]): Sketch | null {
  const sketch = new Int8Array(SIZE)
  let k = 0
  for (let r = 0; r + 1 < runs.length; r += 2) {
    const value = Math.max(-1, Math.min(1, runs[r] | 0))
    const count = runs[r + 1] | 0
    if (count < 0 || k + count > SIZE) return null
    sketch.fill(value, k, k + count)
    k += count
  }
  return k === SIZE ? sketch : null
}

function hasStrokes(sketch: Sketch | null): sketch is Sketch {
  return !!sketch && sketch.some((v) => v !== 0)
}

export function encodeSnapshot(s: Snapshot): string {
  const p = s.params
  const data: Encoded = {
    v: 1,
    p: [p.seed, p.shape, round(p.seaLevel), round(p.mountains), round(p.moisture), round(p.temperature), round(p.rivers), p.cities, p.kingdoms]
  }
  if (hasStrokes(s.sketch)) data.s = encodeSketch(s.sketch)
  if (s.title) data.t = s.title
  if (Object.keys(s.names).length) data.n = s.names
  if (Object.keys(s.notes).length) data.l = s.notes
  if (s.pins.length) data.a = s.pins.map((pin) => [round(pin.x), round(pin.y), pin.title, pin.text])
  return compressToEncodedURIComponent(JSON.stringify(data))
}

const SHAPES: Shape[] = ['ilha', 'arquipelago', 'continente']
const clamp01 = (n: unknown) => Math.max(0, Math.min(1, Number(n) || 0))
const clampInt = (n: unknown, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number(n) || min)))

function cleanRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) if (typeof v === 'string') out[k.slice(0, 20)] = v.slice(0, 4000)
  return out
}

export function decodeSnapshot(text: string): Snapshot | null {
  try {
    const json = decompressFromEncodedURIComponent(text)
    if (!json) return null
    const data = JSON.parse(json) as Encoded
    if (data.v !== 1 || !Array.isArray(data.p)) return null
    const [seed, shape, seaLevel, mountains, moisture, temperature, rivers, cities, kingdoms] = data.p
    return {
      params: {
        seed: String(seed).slice(0, 60) || 'mundo',
        shape: SHAPES.includes(shape) ? shape : 'ilha',
        seaLevel: clamp01(seaLevel),
        mountains: clamp01(mountains),
        moisture: clamp01(moisture),
        temperature: clamp01(temperature),
        rivers: clamp01(rivers),
        cities: clampInt(cities, 3, 40),
        kingdoms: clampInt(kingdoms, 1, 8)
      },
      sketch: Array.isArray(data.s) ? decodeSketch(data.s) : null,
      title: typeof data.t === 'string' ? data.t.slice(0, 60) : null,
      names: cleanRecord(data.n),
      notes: cleanRecord(data.l),
      pins: Array.isArray(data.a)
        ? data.a.slice(0, 200).map(([x, y, title, body], i) => ({
            id: `p${i}`,
            x: Number(x) || 0,
            y: Number(y) || 0,
            title: String(title ?? '').slice(0, 80),
            text: String(body ?? '').slice(0, 4000)
          }))
        : []
    }
  } catch {
    return null
  }
}
