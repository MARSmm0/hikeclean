// src/renderer/pages/GameMode.tsx
import { useEffect, useState } from 'react'
import type { GameModeState } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { useToast } from '../components/ui/Toast'

export function GameMode() {
  const toast = useToast()
  const [state, setState] = useState<GameModeState | null>(null)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [newProc, setNewProc] = useState('')

  const load = async (): Promise<void> => {
    const r = await window.api.invoke('gamemode:getState')
    if (r.ok) setState(r.data)
  }

  useEffect(() => { void load() }, [])

  const toggle = async (): Promise<void> => {
    if (!state) return
    setBusy(true)
    try {
      const r = state.active
        ? await window.api.invoke('gamemode:deactivate')
        : await window.api.invoke('gamemode:activate')
      if (r.ok) {
        setLog(r.data)
        if (state.active) toast.info('Ігровий режим вимкнено')
        else toast.success('Ігровий режим активовано')
        void load()
      } else {
        toast.error(r.error)
      }
    } finally { setBusy(false) }
  }

  const updateSettings = async (patch: Partial<GameModeState>): Promise<void> => {
    await window.api.invoke('gamemode:updateSettings', patch)
    void load()
  }

  const addProc = async (): Promise<void> => {
    if (!newProc.trim() || !state) return
    const list = [...state.customProcesses, newProc.trim()]
    await updateSettings({ customProcesses: list })
    setNewProc('')
  }

  const removeProc = async (p: string): Promise<void> => {
    if (!state) return
    const list = state.customProcesses.filter((x) => x !== p)
    await updateSettings({ customProcesses: list })
  }

  if (!state) return <Card><p className="dim">Завантаження…</p></Card>

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: state.active ? 'var(--ok)' : 'var(--bg-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>
            🎮
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: state.active ? 'var(--ok)' : 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em' }}>
              {state.active ? 'АКТИВНО' : 'ГОТОВО'}
            </div>
            <h2 style={{ margin: '2px 0 4px', fontSize: 22, letterSpacing: '-0.02em' }}>
              Ігровий режим
            </h2>
            <div className="dim" style={{ fontSize: 12.5 }}>
              {state.active
                ? `Гра: ${state.detectedGame ?? 'вручну'} · Служб вимкнено: ${state.disabledServices.length}`
                : 'Оптимізує систему для максимальної продуктивності в іграх'}
            </div>
          </div>
          <Button
            variant={state.active ? 'danger' : 'primary'}
            size="lg"
            loading={busy}
            disabled={busy}
            onClick={() => void toggle()}
          >
            {state.active ? '🛑 Вимкнути' : '⚡ Активувати'}
          </Button>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Автовизначення</div>
            <div className="dim" style={{ fontSize: 12.5 }}>Автоматично активувати при запуску гри</div>
          </div>
          <Toggle
            checked={state.autoDetect}
            onChange={(v) => void updateSettings({ autoDetect: v })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <div>
            <div style={{ fontWeight: 500 }}>Відновлювати при виході</div>
            <div className="dim" style={{ fontSize: 12.5 }}>Відновлювати параметри системи після гри</div>
          </div>
          <Toggle
            checked={state.autoRestoreOnExit}
            onChange={(v) => void updateSettings({ autoRestoreOnExit: v })}
          />
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Власні ігрові процеси</div>
        <div className="dim" style={{ fontSize: 12.5, marginBottom: 12 }}>
          Додайте .exe-файли ігор, які не входять до стандартного списку
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Наприклад, mygame.exe"
            value={newProc}
            onChange={(e) => setNewProc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addProc()}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
            }}
          />
          <Button onClick={() => void addProc()}>+ Додати</Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {state.customProcesses.length === 0 && <span className="dim" style={{ fontSize: 12.5 }}>Поки що порожньо</span>}
          {state.customProcesses.map((p) => (
            <span
              key={p}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                fontSize: 12.5,
              }}
            >
              {p}
              <button
                onClick={() => void removeProc(p)}
                style={{
                  background: 'transparent', border: 0, cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: 0, fontSize: 14, lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </Card>

      {log.length > 0 && (
        <Card>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Журнал</div>
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '3px 0' }}>
              {l}
            </div>
          ))}
        </Card>
      )}
    </>
  )
}