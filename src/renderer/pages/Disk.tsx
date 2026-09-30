// src/renderer/pages/Disk.tsx
import { useState } from 'react'
import type { DiskEntry } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

const fmt = (b: number): string => {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} ГБ`
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} МБ`
  if (b > 1024) return `${(b / 1024).toFixed(1)} КБ`
  return `${b} Б`
}

function Node({ entry, depth = 0 }: { entry: DiskEntry; depth?: number }) {
  const [open, setOpen] = useState(depth < 1)
  if (!entry.isDir || !entry.children || entry.children.length === 0) {
    return (
      <div className="row" style={{ paddingLeft: 12 + depth * 16 }}>
        <span className="grow">{entry.name}</span>
        <span className="dim">{fmt(entry.size)}</span>
      </div>
    )
  }
  return (
    <>
      <div
        className="row"
        style={{ paddingLeft: 12 + depth * 16, cursor: 'pointer', fontWeight: depth === 0 ? 600 : 400 }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ width: 16, display: 'inline-block' }}>{open ? '▾' : '▸'}</span>
        <span className="grow">{entry.name}</span>
        <span className="dim">{fmt(entry.size)}</span>
      </div>
      {open && entry.children.map((c, i) => <Node key={i} entry={c} depth={depth + 1} />)}
    </>
  )
}

export function Disk() {
  const toast = useToast()
  const [root, setRoot] = useState('C:\\')
  const [tree, setTree] = useState<DiskEntry | null>(null)
  const [busy, setBusy] = useState(false)

  const analyze = async (): Promise<void> => {
    setBusy(true)
    try {
      const r = await window.api.invoke('disk:analyze', root)
      if (r.ok) { setTree(r.data); toast.success('Аналіз завершено') }
      else toast.error(r.error)
    } finally { setBusy(false) }
  }

  return (
    <>
      <Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
            }}
          />
          <Button onClick={() => void analyze()} loading={busy} disabled={busy}>
            Аналізувати
          </Button>
        </div>
      </Card>
      {tree && (
        <Card>
          <Node entry={tree} />
        </Card>
      )}
    </>
  )
}