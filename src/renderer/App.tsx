// src/renderer/App.tsx
import { useCallback, useEffect, useState } from 'react'
import type { IpcResult, ProcRow, ScanRow, StartupItem, Stats } from '@shared/types'
import { Sidebar, type TabItem } from './components/Sidebar'
import { useToast } from './components/ui/Toast'
import { Button } from './components/ui/Button'
import { Card } from './components/ui/Card'
import { Security } from './pages/Security'
import { Scheduler } from './pages/Scheduler'
import { Backups } from './pages/Backups'
import { Disk } from './pages/Disk'
import { useTheme } from './theme/ThemeProvider'

type Tab =
  | 'home' | 'clean' | 'proc' | 'startup' | 'boost'
  | 'security' | 'scheduler' | 'backups' | 'disk'

const TABS: TabItem<Tab>[] = [
  { id: 'home',      label: 'Огляд',            icon: '◐' },
  { id: 'clean',     label: 'Очищення',         icon: '✦' },
  { id: 'proc',      label: 'Процеси',          icon: '☰' },
  { id: 'startup',   label: 'Автозавантаження', icon: '↻' },
  { id: 'boost',     label: 'Прискорення',      icon: '↗' },
  { id: 'security',  label: 'Безпека',          icon: '◆' },
  { id: 'scheduler', label: 'Планувальник',     icon: '◷' },
  { id: 'backups',   label: 'Бекапи',           icon: '⎘' },
  { id: 'disk',      label: 'Диск',             icon: '▣' },
]

const fmt = (b: number): string =>
  b > 1073741824 ? `${(b / 1073741824).toFixed(2)} ГБ` : `${(b / 1048576).toFixed(1)} МБ`

function unwrap<T>(r: IpcResult<T>): T {
  if (!r.ok) throw new Error(r.error)
  return r.data
}

function Bar({ value }: { value: number }) {
  return <div className="bar"><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}

// ==================== HOME ====================
function Home() {
  const [s, setS] = useState<Stats | null>(null)
  useEffect(() => {
    let alive = true
    const tick = async (): Promise<void> => {
      const r = await window.api.invoke('sys:stats')
      if (alive && r.ok) setS(r.data)
    }
    void tick()
    const t = setInterval(() => void tick(), 2000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  if (!s) return <p className="dim">Завантаження…</p>
  const ram = (s.ramUsed / s.ramTotal) * 100

  return (
    <div className="grid">
      <Card>
        <div className="dim">Процесор</div>
        <h2>{s.cpu.toFixed(0)}%</h2>
        <Bar value={s.cpu} />
      </Card>
      <Card>
        <div className="dim">Пам'ять</div>
        <h2>{fmt(s.ramUsed)} / {fmt(s.ramTotal)}</h2>
        <Bar value={ram} />
      </Card>
    </div>
  )
}

// ==================== CLEAN ====================
function Clean() {
  const toast = useToast()
  const [rows, setRows] = useState<ScanRow[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const scan = useCallback(async () => {
    setBusy(true)
    try {
      const data = unwrap(await window.api.invoke('rules:scan'))
      setRows(data)
      setSel(new Set(data.filter((r) => r.bytes > 0).map((r) => r.id)))
    } catch (e) {
      toast.error(`Помилка сканування: ${String(e)}`)
    } finally {
      setBusy(false)
    }
  }, [toast])

  useEffect(() => { void scan() }, [scan])

  const total = rows.filter((r) => sel.has(r.id)).reduce((a, r) => a + r.bytes, 0)

  const clean = async (): Promise<void> => {
    if (!window.confirm(`Видалити вибране (${fmt(total)})? Це незворотно.`)) return
    setBusy(true)
    try {
      const r = unwrap(await window.api.invoke('rules:clean', [...sel]))
      toast.success(`Звільнено ${fmt(r.freed)}${r.failed > 0 ? ` (пропущено ${r.failed})` : ''}`)
      await scan()
    } catch (e) {
      toast.error(`Помилка очищення: ${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      {rows.map((r) => (
        <label className="row" key={r.id}>
          <input
            type="checkbox"
            checked={sel.has(r.id)}
            onChange={() => {
              const n = new Set(sel)
              if (n.has(r.id)) n.delete(r.id); else n.add(r.id)
              setSel(n)
            }}
          />
          <span className="grow">{r.name}</span>
          <span className="dim">{fmt(r.bytes)}</span>
        </label>
      ))}
      <div className="row" style={{ gap: 8, paddingTop: 16 }}>
        <Button variant="primary" disabled={busy || sel.size === 0} loading={busy} onClick={() => void clean()}>
          Очистити ({fmt(total)})
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void scan()}>
          Сканувати знову
        </Button>
      </div>
    </Card>
  )
}

// ==================== PROCS ====================
function Procs() {
  const toast = useToast()
  const [list, setList] = useState<ProcRow[]>([])

  const load = useCallback(async () => {
    const r = await window.api.invoke('proc:list')
    if (r.ok) setList(r.data)
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 4000)
    return () => clearInterval(t)
  }, [load])

  const kill = async (p: ProcRow): Promise<void> => {
    if (!window.confirm(`Завершити «${p.name}»? Незбережені дані можуть бути втрачені.`)) return
    const r = await window.api.invoke('proc:kill', p.pid)
    if (r.ok) toast.success(`Завершено: ${p.name}`)
    else toast.error(`Не вдалось: ${r.error}`)
    void load()
  }

  return (
    <Card>
      {list.map((p) => (
        <div className="row" key={p.pid}>
          <span className="grow">{p.name} <span className="dim">#{p.pid}</span></span>
          <span className="dim">{p.cpu.toFixed(1)}%</span>
          <span className="dim">{fmt(p.memBytes)}</span>
          <Button variant="danger" size="sm" onClick={() => void kill(p)}>Завершити</Button>
        </div>
      ))}
    </Card>
  )
}

// ==================== STARTUP ====================
function Startup() {
  const toast = useToast()
  const [items, setItems] = useState<StartupItem[]>([])

  const load = useCallback(async () => {
    const r = await window.api.invoke('startup:list')
    if (r.ok) setItems(r.data)
  }, [])

  useEffect(() => { void load() }, [load])

  const toggle = async (i: StartupItem): Promise<void> => {
    const r = await window.api.invoke('startup:set', i.name, !i.enabled)
    if (r.ok) toast.success(i.enabled ? `Вимкнено: ${i.name}` : `Увімкнено: ${i.name}`)
    else toast.error(`Помилка: ${r.error}`)
    void load()
  }

  if (items.length === 0) return <p className="dim">Записів немає (або система не Windows).</p>

  return (
    <Card>
      {items.map((i) => (
        <div className="row" key={i.name}>
          <span className="grow">
            {i.name}
            <div className="dim">{i.command}</div>
          </span>
          <Button variant={i.enabled ? 'ghost' : 'primary'} size="sm" onClick={() => void toggle(i)}>
            {i.enabled ? 'Вимкнути' : 'Увімкнути'}
          </Button>
        </div>
      ))}
    </Card>
  )
}

// ==================== BOOST ====================
function Boost() {
  const toast = useToast()
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const go = async (): Promise<void> => {
    setBusy(true)
    const r = await window.api.invoke('boost:run')
    if (r.ok) {
      setLog(r.data)
      toast.success('Систему прискорено')
    } else {
      setLog([r.error])
      toast.error(`Помилка: ${r.error}`)
    }
    setBusy(false)
  }

  return (
    <Card>
      <p className="dim" style={{ marginBottom: 16 }}>
        План живлення «Висока продуктивність», очищення DNS-кешу та тимчасових файлів.
      </p>
      <Button variant="primary" disabled={busy} loading={busy} onClick={() => void go()}>
        {busy ? 'Виконується…' : 'Прискорити'}
      </Button>
      {log.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {log.map((l, i) => (
            <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{l}</p>
          ))}
        </div>
      )}
    </Card>
  )
}

// ==================== APP ====================
export function App() {
  const [tab, setTab] = useState<Tab>('home')
  const { settings } = useTheme()

  return (
    <div className="app">
      <Sidebar tabs={TABS} active={tab} onChange={setTab} />
      <main>
        <h2>{TABS.find((t) => t.id === tab)?.label}</h2>
        {tab === 'home'      && <Home />}
        {tab === 'clean'     && <Clean />}
        {tab === 'proc'      && <Procs />}
        {tab === 'startup'   && <Startup />}
        {tab === 'boost'     && <Boost />}
        {tab === 'security'  && <Security settings={settings} />}
        {tab === 'scheduler' && <Scheduler />}
        {tab === 'backups'   && <Backups />}
        {tab === 'disk'      && <Disk />}
      </main>
    </div>
  )
}