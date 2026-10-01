// src/renderer/pages/Services.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ServiceInfo } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

type SortKey = 'displayName' | 'status' | 'startType'

export function Services() {
  const toast = useToast()
  const [list, setList] = useState<ServiceInfo[]>([])
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('displayName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const r = await window.api.invoke('services:list')
      if (r.ok) setList(r.data)
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const arr = q
      ? list.filter((s) => s.displayName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      : list.slice()
    arr.sort((a, b) => {
      const cmp = a[sortKey].localeCompare(b[sortKey])
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [list, query, sortKey, sortDir])

  const toggleSort = (k: SortKey): void => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const changeType = async (name: string, startType: ServiceInfo['startType']): Promise<void> => {
    const t = startType === 'Disabled' ? 'Automatic' : 'Disabled'
    try {
      await window.api.invoke('services:set', name, t as 'Automatic' | 'Manual' | 'Disabled')
      toast.success(`${name}: ${t}`)
      void load()
    } catch (e) {
      toast.error(`Помилка: ${String(e)}`)
    }
  }

  const headerStyle: React.CSSProperties = {
    cursor: 'pointer', userSelect: 'none', padding: '10px 12px',
    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)', textAlign: 'left',
  }
  const arrow = (k: SortKey): string => (sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
        <input
          type="text"
          placeholder="Пошук служби…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-primary)',
            color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
          }}
        />
      </div>
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={headerStyle} onClick={() => toggleSort('displayName')}>Служба{arrow('displayName')}</th>
              <th style={{ ...headerStyle, width: 100 }} onClick={() => toggleSort('status')}>Стан{arrow('status')}</th>
              <th style={{ ...headerStyle, width: 110 }} onClick={() => toggleSort('startType')}>Запуск{arrow('startType')}</th>
              <th style={{ ...headerStyle, width: 100, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.name} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}>
                  {s.displayName}
                  <div className="dim" style={{ fontSize: 11 }}>{s.name}</div>
                </td>
                <td style={{ padding: '8px 12px' }} className="dim">{s.status}</td>
                <td style={{ padding: '8px 12px' }} className="dim">{s.startType}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <Button variant="ghost" size="sm" onClick={() => void changeType(s.name, s.startType)}>
                    {s.startType === 'Disabled' ? 'Увімкнути' : 'Вимкнути'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {busy && <div style={{ padding: 16 }} className="dim">Завантаження…</div>}
        {!busy && filtered.length === 0 && <div style={{ padding: 16 }} className="dim">Нічого не знайдено</div>}
      </div>
    </Card>
  )
}