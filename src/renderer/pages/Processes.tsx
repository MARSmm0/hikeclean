// src/renderer/pages/Processes.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProcRow } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

const fmt = (b: number): string => {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} ГБ`
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} МБ`
  return `${(b / 1024).toFixed(0)} КБ`
}

type SortKey = 'name' | 'cpu' | 'memBytes' | 'pid'
type SortDir = 'asc' | 'desc'

export function Processes() {
  const toast = useToast()
  const [list, setList] = useState<ProcRow[]>([])
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('memBytes')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const load = useCallback(async () => {
    const r = await window.api.invoke('proc:list')
    if (r.ok) setList(r.data)
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 3000)
    return () => clearInterval(t)
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const arr = q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list.slice()
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = (a[sortKey] as number) - (b[sortKey] as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [list, query, sortKey, sortDir])

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc') }
  }

  const kill = async (p: ProcRow): Promise<void> => {
    if (!window.confirm(`Завершити «${p.name}» (PID ${p.pid})?`)) return
    const r = await window.api.invoke('proc:kill', p.pid)
    if (r.ok) toast.success(`Завершено: ${p.name}`)
    else toast.error(`Не вдалось: ${r.error}`)
    void load()
  }

  const arrow = (k: SortKey): string => (sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

  const headerStyle: React.CSSProperties = {
    cursor: 'pointer', userSelect: 'none', padding: '10px 12px',
    fontWeight: 600, fontSize: 12.5, color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)', textAlign: 'left',
  }

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <input
          type="text"
          placeholder="Пошук процесу…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-primary)',
            color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
          }}
        />
        <span className="dim">{filtered.length} процесів</span>
      </div>

      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={headerStyle} onClick={() => toggleSort('name')}>Ім'я{arrow('name')}</th>
              <th style={{ ...headerStyle, width: 80, textAlign: 'right' }} onClick={() => toggleSort('pid')}>PID{arrow('pid')}</th>
              <th style={{ ...headerStyle, width: 80, textAlign: 'right' }} onClick={() => toggleSort('cpu')}>CPU{arrow('cpu')}</th>
              <th style={{ ...headerStyle, width: 110, textAlign: 'right' }} onClick={() => toggleSort('memBytes')}>Пам'ять{arrow('memBytes')}</th>
              <th style={{ ...headerStyle, width: 110, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.pid} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}>{p.name}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }} className="dim">{p.pid}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }} className="dim">{p.cpu.toFixed(1)}%</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }} className="dim">{fmt(p.memBytes)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <Button variant="danger" size="sm" onClick={() => void kill(p)}>Завершити</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}