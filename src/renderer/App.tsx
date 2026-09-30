// src/renderer/App.tsx
import { useState } from 'react'
import { Sidebar, type TabItem } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Clean } from './pages/Clean'
import { Processes } from './pages/Processes'
import { Startup } from './pages/Startup'
import { Boost } from './pages/Boost'
import { Security } from './pages/Security'
import { Disk } from './pages/Disk'
import { Backups } from './pages/Backups'
import { Settings } from './pages/Settings'

type Tab =
  | 'clean' | 'proc' | 'startup' | 'boost' | 'security'
  | 'disk' | 'backups' | 'settings' | 'home'

const TABS: TabItem<Tab>[] = [
  { id: 'clean',    label: 'Очищення',         icon: '✦', group: 'main' },
  { id: 'proc',     label: 'Процеси',          icon: '☰', group: 'main' },
  { id: 'startup',  label: 'Автозавантаження', icon: '↻', group: 'main' },
  { id: 'boost',    label: 'Прискорення',      icon: '↗', group: 'main' },
  { id: 'security', label: 'Безпека',          icon: '◆', group: 'main' },
  { id: 'disk',     label: 'Диск',             icon: '▣', group: 'main' },
  { id: 'backups',  label: 'Бекапи',           icon: '⎘', group: 'main' },
  { id: 'settings', label: 'Налаштування',     icon: '⚙', group: 'bottom' },
  { id: 'home',     label: 'Огляд',            icon: '◐', group: 'bottom' },
]

const TITLES: Record<Tab, string> = {
  clean: 'Очищення', proc: 'Процеси', startup: 'Автозавантаження',
  boost: 'Прискорення', security: 'Безпека', disk: 'Аналіз диска',
  backups: 'Бекапи', settings: 'Налаштування', home: 'Огляд',
}

export function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="app">
      <Sidebar tabs={TABS} active={tab} onChange={setTab} />
      <main>
        <h2>{TITLES[tab]}</h2>
        {tab === 'home'     && <Dashboard onNavigate={(t) => setTab(t as Tab)} />}
        {tab === 'clean'    && <Clean />}
        {tab === 'proc'     && <Processes />}
        {tab === 'startup'  && <Startup />}
        {tab === 'boost'    && <Boost />}
        {tab === 'security' && <Security />}
        {tab === 'disk'     && <Disk />}
        {tab === 'backups'  && <Backups />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  )
}