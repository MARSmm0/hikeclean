// src/renderer/pages/Disk.tsx
import { useEffect, useMemo, useState } from 'react'
import type { DiskEntry, DriveInfo } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

const fmt = (b: number): string => {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} ГБ`
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} МБ`
  if (b > 1024) return `${(b / 1024).toFixed(1)} КБ`
  return `${b} Б`
}

interface FlatRow {
  entry: DiskEntry
  depth: number
  parentPath: string
}

function flatten(root: DiskEntry, query: string, expanded: Set<string>): FlatRow[] {
  const out: FlatRow[] = []
  const q = query.trim().toLowerCase()

  const walk = (node: DiskEntry, depth: number): void => {
    const matches = !q || node.name.toLowerCase().includes(q)
    if (matches || depth === 0) {
      out.push({ entry: node, depth, parentPath: '' })
    }
    if (node.isDir && node.children && (expanded.has(node.path) || q)) {
      for (const c of node.children) walk(c, depth + 1)
    }
  }

  walk(root, 0)
  return out
}

export function Disk() {
  const toast = useToast()
  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [selected, setSelected] = useState<string>('')
  const [tree, setTree] = useState<DiskEntry | null>(null)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    void (async () => {
      const r = await window.api.invoke('disk:listDrives')
      if (r.ok && r.data.length > 0) {
        setDrives(r.data)
        setSelected(r.data[0]!.path)
      }
    })()
  }, [])

  const analyze = async (): Promise<void> => {
    if (!selected) { toast.error('Оберіть диск'); return }
    setBusy(true); setTree(null); setExpanded(new Set())
    try {
      const r = await window.api.invoke('disk:analyze', selected)
      if (r.ok) { setTree(r.data); toast.success('Аналіз завершено') }
      else toast.error(r.error)
    } finally { setBusy(false) }
  }

  const rows = useMemo(() => (tree ? flatten(tree, query, expanded) : []), [tree, query, expanded])
  const totalSize = tree?.size ?? 0

  const toggleExpand = (path: string): void => {
    const n = new Set(expanded)
    if (n.has(path)) n.delete(path); else n.add(path)
    setExpanded(n)
  }

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)',
    textAlign: 'left',
  }

  return (
    <>
      <Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
            }}
          >
            {drives.length === 0 && <option>Завантаження…</option>}
            {drives.map((d) => (
              <option key={d.path} value={d.path}>
                {d.letter} — {fmt(d.totalSize - d.freeSpace)} / {fmt(d.totalSize)} ({d.usedPercent.toFixed(0)}%)
              </option>
            ))}
          </select>
          <Button onClick={() => void analyze()} loading={busy} disabled={busy || !selected}>
            Сканувати
          </Button>
        </div>
      </Card>

      {tree && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Пошук файлу чи папки…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
              }}
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={headerStyle}>Ім'я</th>
                <th style={{ ...headerStyle, width: 120, textAlign: 'right' }}>Розмір</th>
                <th style={{ ...headerStyle, width: 200 }}>Частка</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const pct = totalSize > 0 ? (row.entry.size / totalSize) * 100 : 0
                const isExpanded = expanded.has(row.entry.path)
                return (
                  <tr
                    key={row.entry.path + i}
                    style={{ borderBottom: '1px solid var(--border)', cursor: row.entry.isDir ? 'pointer' : 'default' }}
                    onClick={() => row.entry.isDir && toggleExpand(row.entry.path)}
                  >
                    <td style={{ padding: '6px 12px', paddingLeft: 12 + row.depth * 18 }}>
                      {row.entry.isDir && (
                        <span style={{ display: 'inline-block', width: 14, color: 'var(--text-secondary)' }}>
                          {isExpanded ? '▾' : '▸'}
                        </span>
                      )}
                      {!row.entry.isDir && <span style={{ display: 'inline-block', width: 14 }} />}
                      {row.entry.name}
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'right' }} className="dim">{fmt(row.entry.size)}</td>
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="bar" style={{ flex: 1, height: 6 }}>
                          <i style={{ width: `${pct}%`, background: row.entry.isDir ? 'var(--accent)' : 'var(--ok)' }} />
                        </div>
                        <span className="dim" style={{ fontSize: 11, minWidth: 40, textAlign: 'right' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}