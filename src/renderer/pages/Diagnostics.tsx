// src/renderer/pages/Diagnostics.tsx
import { useState } from 'react'
import type { DiagCheck, DiagResult, DiagStatus } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

const ICONS: Record<DiagStatus, string> = {
  ok: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
}

const COLORS: Record<DiagStatus, string> = {
  ok: 'var(--ok)',
  warning: '#ff9f0a',
  error: 'var(--bad)',
  info: 'var(--accent)',
}

function scoreColor(s: number): string {
  if (s >= 85) return 'var(--ok)'
  if (s >= 60) return '#ff9f0a'
  return 'var(--bad)'
}

function CheckRow({ c }: { c: DiagCheck }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          width: 22, height: 22, borderRadius: 11,
          background: COLORS[c.status], color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 12, flexShrink: 0,
        }}
      >
        {ICONS[c.status]}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{c.name}</div>
        <div className="dim" style={{ fontSize: 12.5 }}>{c.message}</div>
        {c.details && <div className="dim" style={{ fontSize: 11.5, marginTop: 2, opacity: 0.75 }}>{c.details}</div>}
      </div>
    </div>
  )
}

export function Diagnostics() {
  const toast = useToast()
  const [result, setResult] = useState<DiagResult | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (): Promise<void> => {
    setBusy(true)
    try {
      const r = await window.api.invoke('diag:run')
      if (r.ok) {
        setResult(r.data)
        toast.success(`Оцінка системи: ${r.data.score}/100`)
      } else toast.error(r.error)
    } finally { setBusy(false) }
  }

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Діагностика системи</div>
            <div className="dim" style={{ fontSize: 12.5 }}>
              Перевірка стану системи: диск, пам'ять, захист, живлення, temp
            </div>
          </div>
          <Button onClick={() => void run()} loading={busy} disabled={busy}>
            Запустити перевірку
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: `conic-gradient(${scoreColor(result.score)} ${result.score * 3.6}deg, var(--border) 0)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 76, height: 76, borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: scoreColor(result.score) }}>
                    {result.score}
                  </div>
                  <div className="dim" style={{ fontSize: 10 }}>/ 100</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {result.score >= 85 ? 'Система в чудовому стані' :
                   result.score >= 60 ? 'Є що покращити' :
                   'Потрібна увага'}
                </div>
                <div className="dim" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                  <div>{result.hostname} · {result.platform}</div>
                  <div>CPU: {result.cpus} ядер · RAM: {(result.totalRam / 1073741824).toFixed(1)} ГБ</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Деталі перевірки</div>
            {result.checks.map((c) => <CheckRow key={c.id} c={c} />)}
          </Card>
        </>
      )}
    </>
  )
}