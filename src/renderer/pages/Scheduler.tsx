// src/renderer/pages/Scheduler.tsx
import { useEffect, useState } from 'react'
import type { ScheduledTask } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { useToast } from '../components/ui/Toast'

export function Scheduler() {
  const toast = useToast()
  const [tasks, setTasks] = useState<ScheduledTask[]>([])

  const load = async (): Promise<void> => {
    const r = await window.api.invoke('schedule:list')
    if (r.ok) setTasks(r.data)
  }

  useEffect(() => { void load() }, [])

  const add = async (): Promise<void> => {
    const t: ScheduledTask = {
      id: Date.now().toString(),
      name: 'Щоденне очищення',
      cronExpression: '0 3 * * *',
      action: 'clean',
      enabled: true,
    }
    await window.api.invoke('schedule:add', t)
    toast.success('Завдання додано (3:00 щодня)')
    void load()
  }

  const remove = async (id: string): Promise<void> => {
    await window.api.invoke('schedule:remove', id)
    toast.info('Завдання видалено')
    void load()
  }

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => void add()}>+ Додати щоденне очищення (3:00)</Button>
      </div>
      {tasks.length === 0 && <p className="dim">Завдань немає</p>}
      {tasks.map((t) => (
        <div className="row" key={t.id}>
          <span className="grow">
            {t.name}
            <div className="dim">{t.cronExpression} · {t.action}</div>
          </span>
          <Toggle checked={t.enabled} onChange={() => {}} />
          <Button variant="ghost" size="sm" onClick={() => void remove(t.id)}>Видалити</Button>
        </div>
      ))}
    </Card>
  )
}