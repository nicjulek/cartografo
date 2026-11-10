export const WIDTH = 192
export const HEIGHT = 128
export const SIZE = WIDTH * HEIGHT

export const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1]
] as const

export const DIR_COST = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2]

export function idx(x: number, y: number): number {
  return y * WIDTH + x
}

export function inside(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT
}

export function blur(field: Float32Array, passes = 1): Float32Array {
  let src = field
  for (let p = 0; p < passes; p++) {
    const out = new Float32Array(SIZE)
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        let sum = 0
        let n = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (!inside(nx, ny)) continue
            const w = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1
            sum += src[idx(nx, ny)] * w
            n += w
          }
        }
        out[idx(x, y)] = sum / n
      }
    }
    src = out
  }
  return src
}

export class MinHeap {
  private keys: number[] = []
  private values: number[] = []

  get size(): number {
    return this.keys.length
  }

  push(value: number, key: number): void {
    const keys = this.keys
    const values = this.values
    let i = keys.length
    keys.push(key)
    values.push(value)
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (keys[parent] <= key) break
      keys[i] = keys[parent]
      values[i] = values[parent]
      i = parent
    }
    keys[i] = key
    values[i] = value
  }

  pop(): number {
    const keys = this.keys
    const values = this.values
    const top = values[0]
    const lastKey = keys.pop()!
    const lastValue = values.pop()!
    const n = keys.length
    if (n > 0) {
      let i = 0
      while (true) {
        let child = 2 * i + 1
        if (child >= n) break
        if (child + 1 < n && keys[child + 1] < keys[child]) child++
        if (keys[child] >= lastKey) break
        keys[i] = keys[child]
        values[i] = values[child]
        i = child
      }
      keys[i] = lastKey
      values[i] = lastValue
    }
    return top
  }
}
