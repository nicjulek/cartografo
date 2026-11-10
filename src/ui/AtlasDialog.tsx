import { useEffect, useRef, useState } from 'react'
import { decodeSnapshot } from '../share/codec'
import { useAtlas } from '../store/atlas'
import { toast } from '../store/toast'
import { listEntries, removeEntry, type AtlasEntry } from '../lib/storage'
import { Icon } from './Icon'
import styles from './AtlasDialog.module.css'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

export function AtlasDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [entries, setEntries] = useState<AtlasEntry[]>([])
  const current = useAtlas((s) => s.entryId)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setEntries(listEntries())
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  const openEntry = (e: AtlasEntry) => {
    const snap = decodeSnapshot(e.code)
    if (!snap) {
      toast('Este mundo está corrompido e não pode ser aberto.')
      return
    }
    useAtlas.getState().load(snap, e.id)
    onClose()
  }

  const remove = (e: AtlasEntry) => {
    removeEntry(e.id)
    setEntries(listEntries())
    if (current === e.id) useAtlas.getState().setEntryId(null)
    toast(`${e.title} saiu do atlas.`)
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="atlas-title"
    >
      <div className={styles.inner}>
        <header className={styles.head}>
          <div>
            <h2 id="atlas-title">Seu atlas</h2>
            <p>Mundos guardados neste navegador.</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar atlas">
            <Icon name="close" />
          </button>
        </header>

        {entries.length === 0 ? (
          <div className={styles.empty}>
            <p>Nenhum mundo guardado ainda.</p>
            <p>Quando gostar de um mapa, use Guardar na barra de cima para ele aparecer aqui.</p>
          </div>
        ) : (
          <ul className={styles.grid}>
            {entries.map((e) => (
              <li key={e.id} className={styles.card} data-current={e.id === current || undefined}>
                <button type="button" className={styles.open} onClick={() => openEntry(e)}>
                  {e.thumb ? <img src={e.thumb} alt="" /> : <span className={styles.noThumb} />}
                  <span className={styles.name}>{e.title}</span>
                  <span className={styles.meta}>
                    {e.seed} — {dateFormat.format(e.savedAt)}
                  </span>
                </button>
                <button type="button" className={styles.remove} onClick={() => remove(e)} aria-label={`Apagar ${e.title} do atlas`}>
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  )
}
