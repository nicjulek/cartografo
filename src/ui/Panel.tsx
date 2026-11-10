import clsx from 'clsx'
import { useAtlas, type Panel as PanelKey } from '../store/atlas'
import { DetailTab } from './DetailTab'
import { LayersTab } from './LayersTab'
import { WorldTab } from './WorldTab'
import styles from './Panel.module.css'

const TABS: { key: PanelKey; label: string }[] = [
  { key: 'mundo', label: 'Mundo' },
  { key: 'camadas', label: 'Camadas' },
  { key: 'detalhe', label: 'Detalhes' }
]

export function Panel() {
  const panel = useAtlas((s) => s.panel)
  const setPanel = useAtlas((s) => s.setPanel)
  const open = useAtlas((s) => s.sheetOpen)
  const setOpen = useAtlas((s) => s.setSheetOpen)

  return (
    <aside className={clsx(styles.panel, open && styles.open)} aria-label="Painel do mapa">
      <button type="button" className={styles.handle} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span aria-hidden="true" />
        <span className="visually-hidden">{open ? 'Recolher painel' : 'Abrir painel'}</span>
      </button>
      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={panel === t.key}
            aria-controls={`pane-${t.key}`}
            className={clsx(styles.tab, panel === t.key && styles.tabOn)}
            onClick={() => {
              setPanel(t.key)
              setOpen(true)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.body} role="tabpanel" id={`pane-${panel}`} aria-labelledby={`tab-${panel}`}>
        {panel === 'mundo' && <WorldTab />}
        {panel === 'camadas' && <LayersTab />}
        {panel === 'detalhe' && <DetailTab />}
      </div>
    </aside>
  )
}
