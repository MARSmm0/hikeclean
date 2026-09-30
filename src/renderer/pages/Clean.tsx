// src/renderer/pages/Clean.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { IpcResult, ScanRow } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

const fmt = (b: number): string => {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} ГБ`
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} МБ`
  if (b > 1024) return `${(b / 1024).toFixed(1)} КБ`
  return `${b} Б`
}

function unwrap<T>(r: IpcResult<T>): T {
  if (!r.ok) throw new Error(r.error)
  return r.data
}

type SortKey = 'name' | 'bytes'

export function Clean() {
  const toast = useToast()
  const [rows, setRows] = useState<ScanRow[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('bytes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const scan = useCallback(async () => {
    setBusy(true)
    try {
      const data = unwrap(await window.api.invoke('rules:scan'))
      setRows(data)
      setSel(new Set(data.filter((r) => r.bytes > 0).map((r) => r.id)))
    } catch (e) {
      toast.error(`Помилка сканування: ${String(e)}`)
    } finally { setBusy(false) }
  }, [toast])

  useEffect(() => { void scan() }, [scan])

  const sorted = useMemo(() => {
    const arr = rows.slice()
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = a.bytes - b.bytes
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [rows, sortKey, sortDir])

  const total = rows.filter((r) => sel.has(r.id)).reduce((a, r) => a + r.bytes, 0)

  const clean = async (): Promise<void> => {
    if (!window.confirm(`Видалити вибране (${fmt(total)})?`)) return
    setBusy(true)
    try {
      const r = unwrap(await window.api.invoke('rules:clean', [...sel]))
      toast.success(`Звільнено ${fmt(r.freed)}${r.failed > 0 ? ` (пропущено ${r.failed})` : ''}`)
      await scan()
    } catch (e) {
      toast.error(`Помилка очищення: ${String(e)}`)
    } finally { setBusy(false) }
  }

  const toggleSort = (k: SortKey): void => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir(k === 'name' ? 'asc' : 'desc') }
  }

  const arrow = (k: SortKey): string => (sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')
  const headerStyle: React.CSSProperties = {
    cursor: 'pointer', userSelect: 'none', padding: '8px 12px',
    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)', textAlign: 'left',
  }

  return (
    <Card style={{ padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: 40 }}></th>
            <th style={headerStyle} onClick={() => toggleSort('name')}>Категорія{arrow('name')}</th>
            <th style={{ ...headerStyle, width: 110, textAlign: 'right' }} onClick={() => toggleSort('bytes')}>Розмір{arrow('bytes')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 12px' }}>
                <input
                  type="checkbox"
                  checked={sel.has(r.id)}
                  onChange={() => {
                    const n = new Set(sel)
                    if (n.has(r.id)) n.delete(r.id); else n.add(r.id)
                    setSel(n)
                  }}
                />
              </td>
              <td style={{ padding: '8px 12px' }}>{r.name}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }} className="dim">{fmt(r.bytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--border)' }}>
        <Button variant="primary" disabled={busy || sel.size === 0} loading={busy} onClick={() => void clean()}>
          Очистити ({fmt(total)})
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void scan()}>Сканувати знову</Button>
        <span className="dim">Обрано: {sel.size} / {rows.length}</span>
      </div>
    </Card>
  )
}