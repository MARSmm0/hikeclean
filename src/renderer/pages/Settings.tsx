// src/renderer/pages/Settings.tsx
import { useState } from 'react'
import { useTheme } from '../theme/ThemeProvider'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

export function Settings() {
  const toast = useToast()
  const { theme, setTheme, settings, updateSetting } = useTheme()
  const [apiKey, setApiKey] = useState(settings?.virusTotalApiKey ?? '')

  const saveKey = async (): Promise<void> => {
    await window.api.invoke('scan:setApiKey', apiKey)
    if (updateSetting) updateSetting('virusTotalApiKey', apiKey)
    toast.success('API-ключ збережено')
  }

  return (
    <>
      <Card>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Вигляд</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <Button
              key={t}
              variant={theme === t ? 'primary' : 'secondary'}
              onClick={() => setTheme(t)}
            >
              {t === 'light' ? '☀ Світла' : t === 'dark' ? '☾ Темна' : '◐ Системна'}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>VirusTotal API</div>
        <div className="dim" style={{ marginBottom: 12, fontSize: 12.5 }}>
          Опційно. Підвищує точність сканування malware через перевірку хешів на VirusTotal.
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
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Про програму</div>
        <div className="dim" style={{ fontSize: 13 }}>
          Hike v0.1.0 · Open-source оптимізатор системи
        </div>
      </Card>
    </>
  )
}