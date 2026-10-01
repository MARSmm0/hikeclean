// src/renderer/pages/Monitor.tsx
import { useEffect, useState } from 'react'
import type { MonitorSnapshot } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const fmt = (b: number): string => {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} ГБ`
  if (b > 1048576) return `${(b / 1048576).toFixed(0)} МБ`
  return `${(b / 1024).toFixed(0)} КБ`
}

function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="bar" style={{ height: 8 }}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  )
}

function LiveChart({ history }: { history: MonitorSnapshot[] }) {
  const w = 760
  const h = 200
  if (history.length < 2) {
    return (
      <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="dim">
        Збір даних…
      </div>
    )
  }

  const cpuPts = history.map((s, i) => `${(i / (history.length - 1)) * w},${h - (s.cpu / 100) * h}`).join(' ')
  const ramPts = history.map((s, i) => `${(i / (history.length - 1)) * w},${h - (s.ram / 100) * h}`).join(' ')

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {[25, 50, 75].map((y) => (
        <line key={y} x1={0} x2={w} y1={(y / 100) * h} y2={(y / 100) * h} stroke="var(--border)" strokeDasharray="2 4" />
      ))}
      <polyline points={cpuPts} fill="none" stroke="#ff453a" strokeWidth={1.5} />
      <polyline points={ramPts} fill="none" stroke="#0a84ff" strokeWidth={1.5} />
    </svg>
  )
}

export function Monitor() {
  const [history, setHistory] = useState<MonitorSnapshot[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    void (async () => {
      const r = await window.api.invoke('monitor:history')
      if (r.ok) setHistory(r.data)
      const isRun = await window.api.invoke('monitor:isRunning')
      if (isRun.ok) setRunning(isRun.data)

      const el = (window as { electron?: { ipcRenderer?: { on: (ch: string, cb: (snap: MonitorSnapshot) => void) => () => void } } }).electron
      const unsub = el?.ipcRenderer?.on('monitor:tick', (snap: MonitorSnapshot) => {
        setHistory((prev) => {
          const next = [...prev, snap]
          return next.length > 300 ? next.slice(-300) : next
        })
      })
      return () => unsub?.()
    })()
  }, [])

  const toggle = async (): Promise<void> => {
    if (running) {
      await window.api.invoke('monitor:stop')
      setRunning(false)
    } else {
      await window.api.invoke('monitor:start', 1000)
      setRunning(true)
    }
  }

  const clear = async (): Promise<void> => {
    await window.api.invoke('monitor:clear')
    setHistory([])
  }

  const latest = history[history.length - 1]

  return (
    <>
      <Card>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Монітор продуктивності</div>
            <div className="dim" style={{ fontSize: 12.5 }}>
              {running ? 'Активний · оновлення кожну секунду' : 'Зупинено'}
            </div>
          </div>
          <Button variant={running ? 'danger' : 'primary'} onClick={() => void toggle()}>
            {running ? '⏸ Зупинити' : '▶ Запустити'}
          </Button>
          <Button variant="ghost" onClick={() => void clear()}>Очистити</Button>
        </div>
      </Card>

      {latest && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <Card>
            <div className="dim">CPU</div>
            <h2 style={{ fontSize: 22 }}>{latest.cpu.toFixed(1)}%</h2>
            <Bar value={latest.cpu} color="#ff453a" />
          </Card>
          <Card>
            <div className="dim">RAM</div>
            <h2 style={{ fontSize: 22 }}>{latest.ram.toFixed(1)}%</h2>
            <Bar value={latest.ram} color="#0a84ff" />
          </Card>
          <Card>
            <div className="dim">Використано RAM</div>
            <h2 style={{ fontSize: 22 }}>{fmt(latest.ramUsed)}</h2>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>з {fmt(latest.ramTotal)}</div>
          </Card>
          <Card>
            <div className="dim">Load avg (1/5/15)</div>
            <h2 style={{ fontSize: 18 }}>
              {latest.load1.toFixed(2)} / {latest.load5.toFixed(2)} / {latest.load15.toFixed(2)}
            </h2>
          </Card>
        </div>
      )}

      <Card>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Графік (5 хвилин)</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 2, background: '#ff453a', display: 'inline-block' }} /> CPU
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 2, background: '#0a84ff', display: 'inline-block' }} /> RAM
          </span>
        </div>
        <LiveChart history={history} />
      </Card>
    </>
  )
}