// src/renderer/pages/Disk.tsx
import { useEffect, useMemo, useState } from 'react'
import type { DiskEntry, DiskScanResult, DriveInfo } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

const fmt = (b: number): string => {
  if (b > 1073741824) return `${(b / 1073741824).toFixed(2)} ГБ`
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} МБ`
  if (b > 1024) return `${(b / 1024).toFixed(1)} КБ`
  return `${b} Б`
}

interface FlatRow { entry: DiskEntry; depth: number }

function flatten(node: DiskEntry, expanded: Set<string>, query: string): FlatRow[] {
  const out: FlatRow[] = []
  const q = query.trim().toLowerCase()
  const walk = (n: DiskEntry, depth: number): void => {
    out.push({ entry: n, depth })
    if (!n.isDir || !n.children) return
    const shouldExpand = expanded.has(n.path) || (q && n.children.some((c) => c.name.toLowerCase().includes(q)))
    if (!shouldExpand) return
    for (const c of n.children) walk(c, depth + 1)
  }
  walk(node, 0)
  return q ? out.filter((r) => r.entry.name.toLowerCase().includes(q)) : out
}

export function Disk() {
  const toast = useToast()
  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [selected, setSelected] = useState('')
  const [result, setResult] = useState<DiskScanResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

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
    setBusy(true); setResult(null); setExpanded(new Set())
    try {
      const r = await window.api.invoke('disk:analyze', selected)
      if (r.ok) {
        setResult(r.data)
        const e = new Set<string>()
        e.add(r.data.root.path)
        setExpanded(e)
        toast.success(`Проаналізовано ${r.data.totalFiles.toLocaleString('uk-UA')} файлів`)
      } else toast.error(r.error)
    } finally { setBusy(false) }
  }

  const rows = useMemo(
    () => (result ? flatten(result.root, expanded, query) : []),
    [result, expanded, query]
  )

  const toggleExpand = (path: string): void => {
    const n = new Set(expanded)
    if (n.has(path)) n.delete(path); else n.add(path)
    setExpanded(n)
  }

  const expandAll = (): void => {
    if (!result) return
    const all = new Set<string>()
    const walk = (n: DiskEntry): void => {
      if (n.isDir) all.add(n.path)
      n.children?.forEach(walk)
    }
    walk(result.root)
    setExpanded(all)
  }

  const collapseAll = (): void => {
    if (!result) return
    setExpanded(new Set([result.root.path]))
  }

  const drive = drives.find((d) => d.path === selected)
  const totalSize = result?.totalBytes ?? 0

  const headerStyle: React.CSSProperties = {
    padding: '8px 10px', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)',
    textAlign: 'left', userSelect: 'none', background: 'var(--bg-secondary)',
    position: 'sticky', top: 0, zIndex: 1,
  }

  return (
    <>
      {/* Top panel: drive selector + stats */}
      <Card>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13.5,
            }}
          >
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

        {drive && (
          <div style={{ display: 'flex', gap: 24, fontSize: 12.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <div><span className="dim">Обсяг: </span><b>{fmt(drive.totalSize)}</b></div>
            <div><span className="dim">Зайнято: </span><b>{fmt(drive.totalSize - drive.freeSpace)}</b></div>
            <div><span className="dim">Вільно: </span><b>{fmt(drive.freeSpace)}</b></div>
            {result && (
              <>
                <div><span className="dim">Файлів: </span><b>{result.totalFiles.toLocaleString('uk-UA')}</b></div>
                <div><span className="dim">Проскановано: </span><b>{fmt(result.totalBytes)}</b></div>
              </>
            )}
            {result && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <Button variant="ghost" size="sm" onClick={expandAll}>Розгорнути все</Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>Згорнути</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Tree table */}
      {result && (
        <Card style={{ padding: 0 }}>
          {/* Search */}
          <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Пошук файлу чи папки…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%', padding: '7px 12px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13,
              }}
            />
          </div>

          {/* Table */}
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, tableLayout: 'fixed' }}>
              <colgroup>
                <col />
                <col style={{ width: 180 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 90 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={headerStyle}>Ім'я</th>
                  <th style={{ ...headerStyle }}>Частка</th>
                  <th style={{ ...headerStyle, textAlign: 'right' }}>Розмір</th>
                  <th style={{ ...headerStyle, textAlign: 'right' }}>Файлів</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const pct = totalSize > 0 ? (row.entry.size / totalSize) * 100 : 0
                  const isExpanded = expanded.has(row.entry.path)
                  const hasKids = row.entry.isDir && (row.entry.children?.length ?? 0) > 0
                  const sys = row.entry.isSystem
                  const isDir = row.entry.isDir

                  return (
                    <tr
                      key={row.entry.path + i}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: sys ? 'rgba(142, 142, 147, 0.05)' : 'transparent',
                      }}
                    >
                      <td
                        style={{
                          padding: '4px 10px',
                          paddingLeft: 10 + row.depth * 16,
                          cursor: hasKids ? 'pointer' : 'default',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => hasKids && toggleExpand(row.entry.path)}
                        title={row.entry.path}
                      >
                        {/* Expand arrow */}
                        <span
                          style={{
                            display: 'inline-block', width: 14,
                            color: 'var(--text-secondary)', fontSize: 10,
                          }}
                        >
                          {hasKids ? (isExpanded ? '▼' : '▶') : ''}
                        </span>

                        {/* Icon */}
                        {isDir ? (
                          <span style={{ marginRight: 6, fontSize: 13 }}>📁</span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block', width: 8, height: 8,
                              borderRadius: 2, marginRight: 6,
                              background: row.entry.color ?? 'var(--accent)',
                              verticalAlign: 'middle',
                            }}
                          />
                        )}

                        {/* System gear */}
                        {sys && (
                          <span
                            style={{ marginRight: 4, fontSize: 11, opacity: 0.6 }}
                            title="Системний файл або папка"
                          >
                            ⚙
                          </span>
                        )}

                        <span style={{ fontWeight: isDir ? 500 : 400 }}>{row.entry.name}</span>
                      </td>

                      {/* % bar column */}
                      <td style={{ padding: '4px 10px' }}>
                        <div
                          style={{
                            position: 'relative',
                            height: 18,
                            borderRadius: 3,
                            overflow: 'hidden',
                            background: 'var(--bg-primary)',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: 0, top: 0, bottom: 0,
                              width: `${pct}%`,
                              background: isDir ? '#4a8cff' : '#30d158',
                              opacity: sys ? 0.75 : 1,
                            }}
                          />
                          <div
                            style={{
                              position: 'relative',
                              textAlign: 'center',
                              fontSize: 11,
                              lineHeight: '18px',
                              color: 'var(--text-primary)',
                              fontWeight: 500,
                            }}
                          >
                            {pct.toFixed(2)}%
                          </div>
                        </div>
                      </td>

                      {/* Size column */}
                      <td
                        style={{
                          padding: '4px 10px',
                          textAlign: 'right',
                          fontSize: 12,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                        className="dim"
                      >
                        {fmt(row.entry.size)}
                      </td>

                      {/* Files column */}
                      <td
                        style={{
                          padding: '4px 10px',
                          textAlign: 'right',
                          fontSize: 12,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                        className="dim"
                      >
                        {isDir ? row.entry.fileCount.toLocaleString('uk-UA') : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }} className="dim">
              {query ? 'Нічого не знайдено за запитом' : 'Немає даних'}
            </div>
          )}
        </Card>
      )}
    </>
  )
}