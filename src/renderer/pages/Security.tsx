// src/renderer/pages/Security.tsx
import { useState } from 'react'
import type { ScanResult, Settings } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

interface Props { settings: Settings | null }

export function Security({ settings }: Props) {
  const toast = useToast()
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<ScanResult[]>([])
  const [apiKey, setApiKey] = useState(settings?.virusTotalApiKey ?? '')

  const scan = async (): Promise<void> => {
    if (!path) { toast.error('Вкажіть шлях до папки'); return }
    setBusy(true); setResults([])
    try {
      const r = await window.api.invoke('scan:directory', path)
      if (r.ok) {
        setResults(r.data)
        const threats = r.data.filter((x) => x.status === 'malicious' || x.status === 'suspicious').length
        toast.success(`Сканування завершено. Загроз: ${threats}`)
      } else toast.error(r.error)
    } finally { setBusy(false) }
  }

  const saveKey = async (): Promise<void> => {
    await window.api.invoke('scan:setApiKey', apiKey)
    toast.success('API-ключ збережено')
  }

  return (
    <>
      <Card>
        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          VirusTotal API-ключ (опційно) — підвищує точність сканування
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            placeholder="API-ключ"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
            }}
          />
          <Button onClick={() => void saveKey()}>Зберегти</Button>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="C:\Users\...\Downloads"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
            }}
          />
          <Button onClick={() => void scan()} loading={busy} disabled={busy}>
            Сканувати
          </Button>
        </div>

        {results.length > 0 && (
          <div>
            <div className="dim" style={{ marginBottom: 8 }}>
              Знайдено {results.length} файлів · Загроз: {results.filter((r) => r.status === 'malicious').length} · Підозрілих: {results.filter((r) => r.status === 'suspicious').length}
            </div>
            {results.filter((r) => r.status !== 'clean').map((r, i) => (
              <div className="row" key={i}>
                <span className="grow">{r.file}</span>
                <span style={{ color: r.status === 'malicious' ? 'var(--bad)' : '#ff9f0a', fontSize: 12 }}>
                  {r.details || r.status}
                </span>
              </div>
            ))}
            {results.filter((r) => r.status !== 'clean').length === 0 && (
              <p className="dim">Загроз не знайдено ✓</p>
            )}
          </div>
        )}
      </Card>
    </>
  )
}