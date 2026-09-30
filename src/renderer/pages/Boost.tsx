// src/renderer/pages/Boost.tsx
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

interface BoostAction {
  id: string
  icon: string
  title: string
  description: string
}

const ACTIONS: BoostAction[] = [
  { id: 'power',  icon: '⚡', title: 'План живлення',        description: 'Увімкнути «Висока продуктивність»' },
  { id: 'dns',    icon: '◈', title: 'Очистити DNS-кеш',      description: 'Скидання кешу DNS-резолвера' },
  { id: 'temp',   icon: '✦', title: 'Очистити temp',         description: 'Тимчасові файли Windows та користувача' },
  { id: 'visual', icon: '◐', title: 'Візуальні ефекти',      description: 'Мінімум анімацій для швидкодії' },
  { id: 'bg',     icon: '▤', title: 'Фонові служби',         description: 'Вимкнути зайві служби Windows' },
]

export function Boost() {
  const toast = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set(ACTIONS.map((a) => a.id)))
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const toggle = (id: string): void => {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id); else n.add(id)
    setSelected(n)
  }

  const go = async (): Promise<void> => {
    if (selected.size === 0) { toast.error('Оберіть хоча б одну дію'); return }
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
    <>
      <Card style={{ padding: 0 }}>
        {ACTIONS.map((a, i) => {
          const isSel = selected.has(a.id)
          return (
            <div
              key={a.id}
              onClick={() => toggle(a.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: i < ACTIONS.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                background: isSel ? 'rgba(0, 113, 227, 0.05)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <span
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: isSel ? 'var(--accent)' : 'var(--border)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, flexShrink: 0,
                }}
              >
                {isSel ? '✓' : ''}
              </span>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', opacity: isSel ? 1 : 0.5 }}>
                {a.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{a.title}</div>
                <div className="dim" style={{ fontSize: 12.5 }}>{a.description}</div>
              </div>
            </div>
          )
        })}
      </Card>

      <Button
        variant="primary"
        size="lg"
        disabled={busy || selected.size === 0}
        loading={busy}
        onClick={() => void go()}
        style={{ width: '100%' }}
      >
        {busy ? 'Виконується…' : `Прискорити (${selected.size} дій)`}
      </Button>

      {log.length > 0 && (
        <Card>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Результат</div>
          {log.map((l, i) => (
            <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>✓ {l}</p>
          ))}
        </Card>
      )}
    </>
  )
}