import { useEffect, useRef, useState } from 'react'
import { encodeSnapshot } from '../share/codec'
import { snapshotOf, useAtlas } from '../store/atlas'
import { toast } from '../store/toast'
import { downloadPng, downloadSvg, thumbnail } from '../lib/exportMap'
import { saveEntry } from '../lib/storage'
import { shareUrl } from '../lib/useUrlSync'
import { Icon } from './Icon'
import styles from './TopBar.module.css'

interface Props {
  svg: SVGSVGElement | null
  onOpenAtlas: () => void
}

export function TopBar({ svg, onOpenAtlas }: Props) {
  const world = useAtlas((s) => s.world)
  const title = useAtlas((s) => s.title)
  const generating = useAtlas((s) => s.generating)
  const setTitle = useAtlas((s) => s.setTitle)
  const newWorld = useAtlas((s) => s.newWorld)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const fallback = world ? `Terras de ${world.name}` : 'Cartógrafo'
  const shown = title ?? fallback

  useEffect(() => {
    if (!menu) return
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [menu])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl())
      toast('Link copiado. Quem abrir verá este mesmo mundo.')
    } catch {
      toast('Não deu para copiar. Copie o endereço da barra do navegador.')
    }
  }

  const save = async () => {
    if (!svg) return
    const state = useAtlas.getState()
    const id = state.entryId ?? `m${Date.now().toString(36)}`
    let thumb = ''
    try {
      thumb = await thumbnail(svg)
    } catch {
      thumb = ''
    }
    const ok = saveEntry({
      id,
      title: shown,
      seed: state.params.seed,
      savedAt: Date.now(),
      code: encodeSnapshot(snapshotOf(state)),
      thumb
    })
    if (ok) {
      state.setEntryId(id)
      toast(`${shown} foi guardado no atlas.`)
    } else {
      toast('O atlas está cheio. Apague um mundo antigo para guardar este.')
    }
  }

  const exportAs = async (kind: 'svg' | 'png') => {
    setMenu(false)
    if (!svg) return
    try {
      if (kind === 'svg') downloadSvg(svg, shown)
      else await downloadPng(svg, shown)
    } catch {
      toast('Não foi possível exportar o mapa. Tente o formato SVG.')
    }
  }

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M16 4l2.6 12L16 28l-2.6-12z" fill="currentColor" />
          <path d="M4 16l12-2.2L28 16l-12 2.2z" fill="currentColor" opacity="0.45" />
        </svg>
        <span>Cartógrafo</span>
      </div>

      <div className={styles.title}>
        <label htmlFor="world-title" className="visually-hidden">
          Nome do mundo
        </label>
        <input
          id="world-title"
          value={shown}
          size={Math.max(8, shown.length)}
          spellCheck={false}
          onChange={(e) => setTitle(e.target.value === fallback ? '' : e.target.value)}
        />
        <span className={styles.status} aria-live="polite">
          {generating ? 'Traçando o mapa…' : ''}
        </span>
      </div>

      <nav className={styles.actions} aria-label="Ações do mundo">
        <button type="button" onClick={newWorld}>
          <Icon name="plus" size={17} />
          <span>Novo mundo</span>
        </button>
        <button type="button" onClick={onOpenAtlas}>
          <Icon name="book" size={17} />
          <span>Atlas</span>
        </button>
        <button type="button" onClick={save} disabled={!world}>
          <Icon name="save" size={17} />
          <span>Guardar</span>
        </button>
        <button type="button" onClick={share} disabled={!world}>
          <Icon name="link" size={17} />
          <span>Compartilhar</span>
        </button>
        <div className={styles.menuWrap} ref={menuRef}>
          <button type="button" className={styles.primary} onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" disabled={!world}>
            <Icon name="download" size={17} />
            <span>Exportar</span>
          </button>
          {menu && (
            <div className={styles.menu} role="menu">
              <button type="button" role="menuitem" onClick={() => exportAs('png')}>
                Imagem PNG
                <small>Para postar ou imprimir</small>
              </button>
              <button type="button" role="menuitem" onClick={() => exportAs('svg')}>
                Vetor SVG
                <small>Para editar no Figma, Inkscape ou Illustrator</small>
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
