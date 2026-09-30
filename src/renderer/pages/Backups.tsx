// src/renderer/pages/Backups.tsx
import { useEffect, useState } from 'react'
import type { BackupMeta } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

export function Backups() {
  const toast = useToast()
  const [items, setItems] = useState<BackupMeta[]>([])

  const load = async (): Promise<void> => {
    const r = await window.api.invoke('backup:list')
    if (r.ok) setItems(r.data)
  }

  useEffect(() => { void load() }, [])

  const restore = async (id: string): Promise<void> => {
    if (!window.confirm('Відновити файли з цього бекапу?')) return
    const r = await window.api.invoke('backup:restore', id)
    if (r.ok) toast.success('Відновлено')
    else toast.error(r.error)
  }

  const del = async (id: string): Promise<void> => {
    if (!window.confirm('Видалити бекап?')) return
    await window.api.invoke('backup:delete', id)
    toast.info('Видалено')
    void load()
  }

  const fmtDate = (ts: number): string => new Date(ts).toLocaleString('uk-UA')

  return (
    <Card>
      {items.length === 0 && <p className="dim">Бекапів немає. Вони створюються автоматично перед очищенням.</p>}
      {items.map((b) => (
        <div className="row" key={b.id}>
          <span className="grow">
            {b.label}
            <div className="dim">{fmtDate(b.createdAt)} · файлів: {b.files.length}</div>
          </span>
          <Button variant="primary" size="sm" onClick={() => void restore(b.id)}>Відновити</Button>
          <Button variant="ghost" size="sm" onClick={() => void del(b.id)}>Видалити</Button>
        </div>
      ))}
    </Card>
  )
}