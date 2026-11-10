import { generateWorld } from './world'
import type { Sketch, WorldParams } from './types'

interface Request {
  id: number
  params: WorldParams
  sketch: Sketch | null
}

self.onmessage = (event: MessageEvent<Request>) => {
  const { id, params, sketch } = event.data
  try {
    const world = generateWorld(params, sketch)
    const transfer = [world.elevation.buffer, world.biome.buffer, world.kingdomOf.buffer, world.oceanDistance.buffer]
    ;(self as unknown as Worker).postMessage({ id, world }, transfer)
  } catch (error) {
    ;(self as unknown as Worker).postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}
