import type { Sketch, World, WorldParams } from '../gen/types'

type Pending = { resolve: (w: World) => void; reject: (e: Error) => void }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('../gen/worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<{ id: number; world?: World; error?: string }>) => {
    const job = pending.get(event.data.id)
    if (!job) return
    pending.delete(event.data.id)
    if (event.data.world) job.resolve(event.data.world)
    else job.reject(new Error(event.data.error ?? 'Falha ao gerar o mundo'))
  }
  return worker
}

export function requestWorld(params: WorldParams, sketch: Sketch | null): Promise<World> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, params, sketch: sketch ? sketch.slice() : null })
  })
}
