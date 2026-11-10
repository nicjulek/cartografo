export function hashString(text: string): number {
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export class Rng {
  private state: number

  constructor(seed: number | string) {
    this.state = typeof seed === 'string' ? hashString(seed) : seed >>> 0
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  fork(label: string): Rng {
    return new Rng(hashString(`${this.state}:${label}`))
  }
}

const WORDS = [
  'ambar', 'bruma', 'cedro', 'duna', 'eco', 'farol', 'garoa', 'hera', 'ilha', 'jade',
  'lume', 'mare', 'neve', 'orvalho', 'pinha', 'quartzo', 'rocha', 'salvia', 'tinta', 'urze',
  'vento', 'zinco', 'coral', 'musgo', 'brasa', 'sereno', 'aurora', 'calma', 'onda', 'trilha'
]

export function randomSeed(): string {
  const a = WORDS[Math.floor(Math.random() * WORDS.length)]
  const b = WORDS[Math.floor(Math.random() * WORDS.length)]
  return `${a}-${b}-${Math.floor(Math.random() * 900 + 100)}`
}
