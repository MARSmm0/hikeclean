// src/renderer/App.tsx
import { useState } from 'react'
import { Sidebar, type NavGroup, type NavItem } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Clean } from './pages/Clean'
import { Processes } from './pages/Processes'
import { Startup } from './pages/Startup'
import { Boost } from './pages/Boost'
import { Security } from './pages/Security'
import { Disk } from './pages/Disk'
import { Backups } from './pages/Backups'
import { Settings } from './pages/Settings'
import { Network } from './pages/Network'
import { Privacy } from './pages/Privacy'
import { Services } from './pages/Services'

type Tab =
  | 'clean' | 'network' | 'startup' | 'schedule'
  | 'security' | 'privacy'
  | 'proc' | 'services' | 'boost'
  | 'disk'
  | 'backups'
  | 'settings' | 'home'

const GROUPS: NavGroup<Tab>[] = [
  {
    id: 'clean', label: 'Очищення', icon: '✦',
    items: [
      { id: 'clean',    label: 'Очищення системи', icon: '✦' },
      { id: 'network',  label: 'Очищення мережі',  icon: '◈' },
      { id: 'startup',  label: 'Автозавантаження', icon: '↻' },
      { id: 'schedule', label: 'Розклади',         icon: '◷' },
    ],
  },
  {
    id: 'protection', label: 'Захист', icon: '◆',
    items: [
      { id: 'security', label: 'Сканер malware',   icon: '◆' },
      { id: 'privacy',  label: 'Приватність',      icon: '◉' },
    ],
  },
  {
    id: 'perf', label: 'Продуктивність', icon: '↗',
    items: [
      { id: 'proc',     label: 'Процеси',          icon: '☰' },
      { id: 'services', label: 'Служби Windows',   icon: '⚙' },
      { id: 'boost',    label: 'Прискорення',      icon: '↗' },
    ],
  },
  {
    id: 'storage', label: 'Сховище', icon: '▣',
    items: [
      { id: 'disk',       label: 'Аналіз диска',    icon: '▣' },
    ],
  },
  {
    id: 'activity', label: 'Активність', icon: '◷',
    items: [
      { id: 'backups',  label: 'Бекапи',            icon: '⎘' },
    ],
  },
]

const BOTTOM: NavItem<Tab>[] = [
  { id: 'settings', label: 'Налаштування', icon: '⚙' },
  { id: 'home',     label: 'Огляд',        icon: '◐' },
]

const TITLES: Record<Tab, string> = {
  home: 'Огляд', clean: 'Очищення системи', network: 'Очищення мережі',
  startup: 'Автозавантаження', schedule: 'Розклади',
  security: 'Сканер malware', privacy: 'Приватність',
  proc: 'Процеси', services: 'Служби Windows', boost: 'Прискорення',
  disk: 'Аналіз диска',
  backups: 'Бекапи',
  settings: 'Налаштування',
}

export function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="app">
      <Sidebar groups={GROUPS} bottom={BOTTOM} active={tab} onChange={setTab} />
      <main>
        <h2>{TITLES[tab]}</h2>
        {tab === 'home'       && <Dashboard onNavigate={(t) => setTab(t as Tab)} />}
        {tab === 'clean'      && <Clean />}
        {tab === 'network'    && <Network />}
        {tab === 'startup'    && <Startup />}
        {tab === 'schedule'   && <Security />}
        {tab === 'security'   && <Security />}
        {tab === 'privacy'    && <Privacy />}
        {tab === 'proc'       && <Processes />}
        {tab === 'services'   && <Services />}
        {tab === 'boost'      && <Boost />}
        {tab === 'disk'       && <Disk />}
        {tab === 'backups'    && <Backups />}
        {tab === 'settings'   && <Settings />}
      </main>
    </div>
  )
}