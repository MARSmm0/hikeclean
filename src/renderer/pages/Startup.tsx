// src/renderer/pages/Startup.tsx
import { useCallback, useEffect, useState } from 'react'
import type { StartupItem } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

export function Startup() {
  const toast = useToast()
  const [items, setItems] = useState<StartupItem[]>([])
  const [query, setQuery] = useState('')

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

  const filtered = items.filter((i) => !query || i.name.toLowerCase().includes(query.toLowerCase()))

  if (items.length === 0) return <Card><p className="dim">Записів немає (або система не Windows).</p></Card>

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
        <input
          type="text"
          placeholder="Пошук…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-primary)',
            color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
          }}
        />
      </div>
      {filtered.map((i) => (
        <div className="row" key={i.name} style={{ padding: '12px 16px' }}>
          <span className="grow">
            {i.name}
            <div className="dim" style={{ fontSize: 11.5 }}>{i.command}</div>
          </span>
          <Button variant={i.enabled ? 'ghost' : 'primary'} size="sm" onClick={() => void toggle(i)}>
            {i.enabled ? 'Вимкнути' : 'Увімкнути'}
          </Button>
        </div>
      ))}
    </Card>
  )
}