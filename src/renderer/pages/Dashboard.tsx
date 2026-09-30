// src/renderer/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import type { ExtendedStats, ProcRow } from '@shared/types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const fmt = (b: number): string => {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} ГБ`
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} МБ`
  return `${(b / 1024).toFixed(0)} КБ`
}

const fmtUptime = (s: number): string => {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}д ${h}г` : h > 0 ? `${h}г ${m}хв` : `${m}хв`
}

function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  )
}

interface Props { onNavigate: (tab: string) => void }

export function Dashboard({ onNavigate }: Props) {
  const [s, setS] = useState<ExtendedStats | null>(null)
  const [procs, setProcs] = useState<ProcRow[]>([])

  useEffect(() => {
    let alive = true
    const tick = async (): Promise<void> => {
      const r = await window.api.invoke('sys:extended')
      if (alive && r.ok) setS(r.data)
    }
    void tick()
    const t = setInterval(() => void tick(), 2000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  useEffect(() => {
    const load = async (): Promise<void> => {
      const r = await window.api.invoke('proc:list')
      if (r.ok) setProcs(r.data.sort((a, b) => b.memBytes - a.memBytes).slice(0, 5))
    }
    void load()
    const t = setInterval(() => void load(), 5000)
    return () => clearInterval(t)
  }, [])

  const ram = s ? (s.ramUsed / s.ramTotal) * 100 : 0

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', marginBottom: 16 }}>
        <Card>
          <div className="dim">Процесор</div>
          <h2>{s ? `${s.cpu.toFixed(0)}%` : '…'}</h2>
          <Bar value={s?.cpu ?? 0} />
        </Card>
        <Card>
          <div className="dim">Пам'ять</div>
          <h2>{s ? `${(s.ramUsed / 1073741824).toFixed(1)} ГБ` : '…'}</h2>
          <Bar value={ram} color="var(--accent)" />
        </Card>
        <Card>
          <div className="dim">Диск</div>
          <h2>{s ? `${s.diskPercent.toFixed(0)}%` : '…'}</h2>
          <Bar value={s?.diskPercent ?? 0} color="#ff9f0a" />
        </Card>
        <Card>
          <div className="dim">Аптайм</div>
          <h2>{s ? fmtUptime(s.uptime) : '…'}</h2>
          <div className="dim" style={{ marginTop: 8 }}>{s?.hostname ?? ''}</div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Топ процесів</div>
          {procs.map((p) => (
            <div className="row" key={p.pid} style={{ padding: '6px 0' }}>
              <span className="grow">{p.name}</span>
              <span className="dim">{fmt(p.memBytes)}</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Швидкий доступ</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <Button variant="primary" onClick={() => onNavigate('clean')}>✦ Очистити систему</Button>
            <Button variant="secondary" onClick={() => onNavigate('boost')}>↗ Прискорити</Button>
            <Button variant="secondary" onClick={() => onNavigate('security')}>◆ Сканувати загрози</Button>
            <Button variant="secondary" onClick={() => onNavigate('disk')}>▣ Аналіз диска</Button>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Мережа</div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="dim">Отримано</div>
            <h2>{s ? fmt(s.netRx) : '…'}</h2>
          </div>
          <div>
            <div className="dim">Відправлено</div>
            <h2>{s ? fmt(s.netTx) : '…'}</h2>
          </div>
        </div>
      </Card>
    </>
  )
}