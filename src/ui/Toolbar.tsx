import { useEffect } from 'react'
import clsx from 'clsx'
import { useAtlas, type Tool } from '../store/atlas'
import { IconButton } from './controls'
import { Icon, type IconName } from './Icon'
import styles from './Toolbar.module.css'

const TOOLS: { key: Tool; label: string; icon: IconName; shortcut: string }[] = [
  { key: 'move', label: 'Mover e escolher', icon: 'move', shortcut: 'v' },
  { key: 'land', label: 'Esboçar terra', icon: 'land', shortcut: 't' },
  { key: 'sea', label: 'Esboçar mar', icon: 'sea', shortcut: 'm' },
  { key: 'pin', label: 'Marcar um lugar', icon: 'pin', shortcut: 'p' }
]

const HINT: Record<Tool, string> = {
  move: '',
  land: 'Pinte onde quer terra. O mundo se refaz quando você solta.',
  sea: 'Pinte onde quer mar. Dá para abrir baías, estreitos e lagos.',
  pin: 'Toque no mapa para marcar um lugar e escrever a lenda dele.'
}

export function Toolbar() {
  const tool = useAtlas((s) => s.tool)
  const setTool = useAtlas((s) => s.setTool)
  const brush = useAtlas((s) => s.brush)
  const setBrush = useAtlas((s) => s.setBrush)
  const canUndo = useAtlas((s) => s.undo.length > 0)
  const hasSketch = useAtlas((s) => !!s.sketch)
  const undoStroke = useAtlas((s) => s.undoStroke)
  const clearSketch = useAtlas((s) => s.clearSketch)
  const painting = tool === 'land' || tool === 'sea'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        useAtlas.getState().undoStroke()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = TOOLS.find((x) => x.shortcut === e.key.toLowerCase())
      if (t) setTool(t.key)
      if (e.key === 'Escape') {
        setTool('move')
        useAtlas.getState().select(null)
      }
      if (e.key === '[') setBrush(Math.max(2, useAtlas.getState().brush - 1))
      if (e.key === ']') setBrush(Math.min(14, useAtlas.getState().brush + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setTool, setBrush])

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="toolbar" aria-label="Ferramentas">
        {TOOLS.map((t) => (
          <IconButton key={t.key} label={`${t.label} (${t.shortcut.toUpperCase()})`} active={tool === t.key} onClick={() => setTool(t.key)}>
            <Icon name={t.icon} />
          </IconButton>
        ))}
        <span className={styles.sep} aria-hidden="true" />
        <IconButton label="Desfazer esboço (Ctrl+Z)" onClick={undoStroke} disabled={!canUndo}>
          <Icon name="undo" />
        </IconButton>
        <IconButton label="Apagar todo o esboço" onClick={clearSketch} disabled={!hasSketch}>
          <Icon name="erase" />
        </IconButton>
      </div>
      <div className={clsx(styles.hint, painting && styles.withBrush)} aria-live="polite" hidden={tool === 'move'}>
        <p>{HINT[tool]}</p>
        {painting && (
          <label className={styles.brush}>
            <span>Pincel</span>
            <input type="range" min={2} max={14} step={1} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
          </label>
        )}
      </div>
    </div>
  )
}
