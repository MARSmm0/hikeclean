// src/renderer/pages/Network.tsx
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

interface Action {
  id: 'net:flushDns' | 'net:reset' | 'net:renew'
  icon: string
  title: string
  description: string
}

const ACTIONS: Action[] = [
  { id: 'net:flushDns', icon: '◈', title: 'Очистити DNS-кеш', description: 'Скидання кешу DNS-резолвера' },
  { id: 'net:renew',    icon: '↻', title: 'Оновити IP-адресу', description: 'Release + Renew DHCP-адреси' },
  { id: 'net:reset',    icon: '⚙', title: 'Скинути мережу',    description: 'Winsock + TCP/IP reset (потрібен перезапуск)' },
]

export function Network() {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (id: Action['id']): Promise<void> => {
    setBusy(id)
    try {
      const r = await window.api.invoke(id)
      if (r.ok && r.data.ok) toast.success(r.data.message)
      else toast.error(r.ok ? r.data.message : r.error)
    } finally { setBusy(null) }
  }

  return (
    <Card style={{ padding: 0 }}>
      {ACTIONS.map((a, i) => (
        <div
          key={a.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            borderBottom: i < ACTIONS.length - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{a.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{a.title}</div>
            <div className="dim" style={{ fontSize: 12.5 }}>{a.description}</div>
          </div>
          <Button
            variant="primary"
            size="sm"
            loading={busy === a.id}
            disabled={busy !== null}
            onClick={() => void run(a.id)}
          >
            Запустити
          </Button>
        </div>
      ))}
    </Card>
  )
}