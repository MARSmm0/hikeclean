import { useCallback, useEffect, useState } from 'react'
import type { IpcResult, ProcRow, ScanRow, StartupItem, Stats } from '@shared/types'

type Tab = 'home' | 'clean' | 'proc' | 'startup' | 'boost'
const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Огляд' }, { id: 'clean', label: 'Очищення' },
  { id: 'proc', label: 'Процеси' }, { id: 'startup', label: 'Автозавантаження' },
  { id: 'boost', label: 'Прискорення' }
]

const fmt = (b: number): string =>
  b > 1073741824 ? `${(b / 1073741824).toFixed(2)} ГБ` : `${(b / 1048576).toFixed(1)} МБ`

function unwrap<T>(r: IpcResult<T>): T {
  if (!r.ok) throw new Error(r.error)
  return r.data
}

function Bar({ value }: { value: number }): JSX.Element {
  return <div className="bar"><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}

function Home(): JSX.Element {
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
      <div className="card"><div className="dim">Процесор</div><h2>{s.cpu.toFixed(0)}%</h2><Bar value={s.cpu} /></div>
      <div className="card"><div className="dim">Пам’ять</div><h2>{fmt(s.ramUsed)} / {fmt(s.ramTotal)}</h2><Bar value={ram} /></div>
    </div>
  )
}

function Clean(): JSX.Element {
  const [rows, setRows] = useState<ScanRow[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const scan = useCallback(async () => {
    setBusy(true); setMsg('')
    try {
      const data = unwrap(await window.api.invoke('rules:scan'))
      setRows(data); setSel(new Set(data.filter((r) => r.bytes > 0).map((r) => r.id)))
    } catch (e) { setMsg(String(e)) } finally { setBusy(false) }
  }, [])
  useEffect(() => { void scan() }, [scan])
  const total = rows.filter((r) => sel.has(r.id)).reduce((a, r) => a + r.bytes, 0)
  const clean = async (): Promise<void> => {
    if (!window.confirm(`Видалити вибране (${fmt(total)})? Це незворотно.`)) return
    setBusy(true)
    try {
      const r = unwrap(await window.api.invoke('rules:clean', [...sel]))
      setMsg(`Звільнено ${fmt(r.freed)}. Пропущено (зайняті файли): ${r.failed}`)
      await scan()
    } catch (e) { setMsg(String(e)) } finally { setBusy(false) }
  }
  return (
    <div className="card">
      {rows.map((r) => (
        <label className="row" key={r.id}>
          <input type="checkbox" checked={sel.has(r.id)} onChange={() => {
            const n = new Set(sel); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); setSel(n)
          }} />
          <span className="grow">{r.name}</span><span className="dim">{fmt(r.bytes)}</span>
        </label>
      ))}
      <div className="row">
        <button className="btn" disabled={busy || sel.size === 0} onClick={() => void clean()}>Очистити ({fmt(total)})</button>
        <button className="btn ghost" disabled={busy} onClick={() => void scan()}>Сканувати знову</button>
        <span className="dim">{busy ? 'Зачекайте…' : msg}</span>
      </div>
    </div>
  )
}

function Procs(): JSX.Element {
  const [list, setList] = useState<ProcRow[]>([])
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const r = await window.api.invoke('proc:list'); if (r.ok) setList(r.data)
  }, [])
  useEffect(() => { void load(); const t = setInterval(() => void load(), 4000); return () => clearInterval(t) }, [load])
  const kill = async (p: ProcRow): Promise<void> => {
    if (!window.confirm(`Завершити «${p.name}»? Незбережені дані можуть бути втрачені.`)) return
    const r = await window.api.invoke('proc:kill', p.pid)
    setErr(r.ok ? '' : r.error); void load()
  }
  return (
    <div className="card">
      {err && <p className="err">{err}</p>}
      {list.map((p) => (
        <div className="row" key={p.pid}>
          <span className="grow">{p.name} <span className="dim">#{p.pid}</span></span>
          <span className="dim">{p.cpu.toFixed(1)}%</span><span className="dim">{fmt(p.memBytes)}</span>
          <button className="btn danger" onClick={() => void kill(p)}>Завершити</button>
        </div>
      ))}
    </div>
  )
}

function Startup(): JSX.Element {
  const [items, setItems] = useState<StartupItem[]>([])
  const load = useCallback(async () => {
    const r = await window.api.invoke('startup:list'); if (r.ok) setItems(r.data)
  }, [])
  useEffect(() => { void load() }, [load])
  const toggle = async (i: StartupItem): Promise<void> => {
    await window.api.invoke('startup:set', i.name, !i.enabled); void load()
  }
  if (items.length === 0) return <p className="dim">Записів немає (або система не Windows).</p>
  return (
    <div className="card">
      {items.map((i) => (
        <div className="row" key={i.name}>
          <span className="grow">{i.name}<div className="dim">{i.command}</div></span>
          <button className={i.enabled ? 'btn ghost' : 'btn'} onClick={() => void toggle(i)}>
            {i.enabled ? 'Вимкнути' : 'Увімкнути'}
          </button>
        </div>
      ))}
    </div>
  )
}

function Boost(): JSX.Element {
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const go = async (): Promise<void> => {
    setBusy(true)
    const r = await window.api.invoke('boost:run')
    setLog(r.ok ? r.data : [r.error]); setBusy(false)
  }
  return (
    <div className="card">
      <p className="dim">План живлення «Висока продуктивність», очищення DNS-кешу та тимчасових файлів.</p>
      <button className="btn" disabled={busy} onClick={() => void go()}>{busy ? 'Виконується…' : 'Прискорити'}</button>
      {log.map((l, i) => <p key={i}>{l}</p>)}
    </div>
  )
}

export function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('home')
  return (
    <div className="app">
      <nav>
        <h1>Hike</h1>
        {TABS.map((t) => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </nav>
      <main>
        <h2>{TABS.find((t) => t.id === tab)?.label}</h2>
        {tab === 'home' && <Home />}
        {tab === 'clean' && <Clean />}
        {tab === 'proc' && <Procs />}
        {tab === 'startup' && <Startup />}
        {tab === 'boost' && <Boost />}
      </main>
    </div>
  )
}
