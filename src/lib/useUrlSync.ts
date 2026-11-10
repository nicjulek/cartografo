import { useEffect } from 'react'
import { decodeSnapshot, encodeSnapshot } from '../share/codec'
import { snapshotOf, useAtlas } from '../store/atlas'

export function shareUrl(): string {
  const code = encodeSnapshot(snapshotOf(useAtlas.getState()))
  return `${location.origin}${location.pathname}#w=${code}`
}

export function useUrlSync(): void {
  useEffect(() => {
    const fromHash = () => {
      const snap = decodeSnapshot(location.hash.replace(/^#w=/, ''))
      if (snap) useAtlas.getState().load(snap)
      return !!snap
    }
    if (!fromHash()) useAtlas.getState().newWorld()

    let timer: ReturnType<typeof setTimeout> | undefined
    let last = ''
    const unsubscribe = useAtlas.subscribe((state, prev) => {
      if (
        state.params === prev.params &&
        state.sketch === prev.sketch &&
        state.title === prev.title &&
        state.names === prev.names &&
        state.notes === prev.notes &&
        state.pins === prev.pins
      )
        return
      clearTimeout(timer)
      timer = setTimeout(() => {
        const code = encodeSnapshot(snapshotOf(useAtlas.getState()))
        if (code === last) return
        last = code
        history.replaceState(null, '', `#w=${code}`)
      }, 350)
    })

    const onHash = () => {
      const code = location.hash.replace(/^#w=/, '')
      if (code && code !== last) {
        last = code
        fromHash()
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => {
      unsubscribe()
      clearTimeout(timer)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])
}
