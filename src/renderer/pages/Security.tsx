// src/renderer/pages/Security.tsx
import { useEffect, useState } from 'react'
import type { ScanResult, ScheduledTask } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { useToast } from '../components/ui/Toast'

export function Security() {
  const toast = useToast()
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<ScanResult[]>([])
  const [tasks, setTasks] = useState<ScheduledTask[]>([])

  const loadTasks = async (): Promise<void> => {
    const r = await window.api.invoke('schedule:list')
    if (r.ok) setTasks(r.data)
  }

  useEffect(() => { void loadTasks() }, [])

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

  const addTask = async (): Promise<void> => {
    const t: ScheduledTask = {
      id: Date.now().toString(),
      name: 'Щоденне сканування',
      cronExpression: '0 3 * * *',
      action: 'scan',
      enabled: true,
    }
    await window.api.invoke('schedule:add', t)
    toast.success('Завдання додано (3:00 щодня)')
    void loadTasks()
  }

  const removeTask = async (id: string): Promise<void> => {
    await window.api.invoke('schedule:remove', id)
    toast.info('Завдання видалено')
    void loadTasks()
  }

  const threats = results.filter((r) => r.status !== 'clean')

  return (
    <>
      <Card>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Сканер malware</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
              Файлів: {results.length} · Загроз: {results.filter((r) => r.status === 'malicious').length} · Підозрілих: {results.filter((r) => r.status === 'suspicious').length}
            </div>
            {threats.length === 0 && <p className="dim">Загроз не знайдено ✓</p>}
            {threats.map((r, i) => (
              <div className="row" key={i}>
                <span className="grow" style={{ fontSize: 12.5 }}>{r.file}</span>
                <span style={{ color: r.status === 'malicious' ? 'var(--bad)' : '#ff9f0a', fontSize: 12 }}>
                  {r.details || r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>Планувальник сканувань</div>
          <Button variant="secondary" size="sm" onClick={() => void addTask()}>+ Додати</Button>
        </div>
        {tasks.length === 0 && <p className="dim">Завдань немає</p>}
        {tasks.map((t) => (
          <div className="row" key={t.id}>
            <span className="grow">
              {t.name}
              <div className="dim">{t.cronExpression} · {t.action}</div>
            </span>
            <Toggle checked={t.enabled} onChange={() => {}} />
            <Button variant="ghost" size="sm" onClick={() => void removeTask(t.id)}>Видалити</Button>
          </div>
        ))}
      </Card>
    </>
  )
}