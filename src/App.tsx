import { useState } from 'react'
import { useUrlSync } from './lib/useUrlSync'
import { MapView } from './map/MapView'
import { useAtlas } from './store/atlas'
import { AtlasDialog } from './ui/AtlasDialog'
import { Panel } from './ui/Panel'
import { Toaster } from './ui/Toaster'
import { Toolbar } from './ui/Toolbar'
import { TopBar } from './ui/TopBar'
import styles from './App.module.css'

export function App() {
  useUrlSync()
  const [svg, setSvg] = useState<SVGSVGElement | null>(null)
  const [atlasOpen, setAtlasOpen] = useState(false)
  const error = useAtlas((s) => s.error)

  return (
    <div className={styles.app}>
      <TopBar svg={svg} onOpenAtlas={() => setAtlasOpen(true)} />
      <main className={styles.stage}>
        <h1 className="visually-hidden">Cartógrafo, gerador de mapas de mundos fictícios</h1>
        <MapView onReady={setSvg} />
        <Toolbar />
        {error && (
          <p className={styles.error} role="alert">
            {error}. Mude algum parâmetro para tentar de novo.
          </p>
        )}
      </main>
      <Panel />
      <AtlasDialog open={atlasOpen} onClose={() => setAtlasOpen(false)} />
      <Toaster />
    </div>
  )
}
