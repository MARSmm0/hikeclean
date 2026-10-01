// src/renderer/pages/Privacy.tsx
import { useCallback, useEffect, useState } from 'react'
import type { PrivacyCategory } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

const fmt = (b: number): string => {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} ГБ`
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} МБ`
  if (b > 1024) return `${(b / 1024).toFixed(1)} КБ`
  return `${b} Б`
}

export function Privacy() {
  const toast = useToast()
  const [rows, setRows] = useState<PrivacyCategory[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const scan = useCallback(async () => {
    setBusy(true)
    try {
      const r = await window.api.invoke('privacy:scan')
      if (r.ok) { setRows(r.data); setSel(new Set(r.data.map((x) => x.id))) }
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void scan() }, [scan])

  const total = rows.filter((r) => sel.has(r.id)).reduce((a, r) => a + r.bytes, 0)

  const clean = async (): Promise<void> => {
    if (!window.confirm(`Видалити вибране (${fmt(total)})? Це закриє браузери.`)) return
    setBusy(true)
    try {
      const r = await window.api.invoke('privacy:clean', [...sel])
      if (r.ok) { toast.success(`Звільнено ${fmt(r.data.freed)}`); await scan() }
    } finally { setBusy(false) }
  }

  return (
    <Card style={{ padding: 0 }}>
      {rows.map((r) => (
        <label
          key={r.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={sel.has(r.id)}
            onChange={() => {
              const n = new Set(sel)
              if (n.has(r.id)) n.delete(r.id); else n.add(r.id)
              setSel(n)
            }}
          />
          <span style={{ flex: 1 }}>{r.name}</span>
          <span className="dim">{fmt(r.bytes)}</span>
        </label>
      ))}
      {rows.length === 0 && <div style={{ padding: 16 }} className="dim">Нічого не знайдено</div>}
      <div style={{ padding: 16, display: 'flex', gap: 8 }}>
        <Button variant="primary" loading={busy} disabled={busy || sel.size === 0} onClick={() => void clean()}>
          Очистити ({fmt(total)})
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void scan()}>Сканувати знову</Button>
      </div>
    </Card>
  )
}