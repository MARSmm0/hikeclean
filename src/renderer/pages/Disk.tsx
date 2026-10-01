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

type ViewTab = 'tree' | 'map'

interface TmRect { x: number; y: number; w: number; h: number; node: DiskEntry }

function layoutTreemap(items: DiskEntry[], x: number, y: number, w: number, h: number): TmRect[] {
  const rects: TmRect[] = []
  if (items.length === 0 || w <= 0 || h <= 0) return rects
  const total = items.reduce((s, i) => s + i.size, 0)
  if (total === 0) return rects

  let cx = x, cy = y, cw = w, ch = h
  for (const item of items) {
    const ratio = item.size / total
    if (cw >= ch) {
      const ww = cw * ratio
      rects.push({ x: cx, y: cy, w: ww, h: ch, node: item })
      cx += ww
      cw -= ww
    } else {
      const hh = ch * ratio
      rects.push({ x: cx, y: cy, w: cw, h: hh, node: item })
      cy += hh
      ch -= hh
    }
  }
  return rects
}

interface TreemapProps {
  node: DiskEntry
  width: number
  height: number
  onNavigate: (path: string) => void
}

function Treemap({ node, width, height, onNavigate }: TreemapProps) {
  const children = (node.children ?? []).filter((c) => c.size > 0)
  const rects = useMemo(
    () => layoutTreemap(children, 0, 0, width, height),
    [children, width, height]
  )

  if (children.length === 0) {
    return (
      <div style={{
        width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: node.color ?? 'var(--bg-secondary)', color: '#fff',
        borderRadius: 4, fontSize: 12, padding: 8, textAlign: 'center',
        border: node.isSystem ? '2px dashed rgba(255,255,255,0.7)' : 'none',
      }}>
        {node.isSystem && <span style={{ marginRight: 4 }}>⚙</span>}
        {node.name}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      {rects.map((r, i) => {
        const pct = (r.node.size / node.size) * 100
        const showText = r.w > 60 && r.h > 24
        const isFolder = r.node.isDir
        const sys = r.node.isSystem
        return (
          <div
            key={r.node.path + i}
            onClick={() => isFolder && onNavigate(r.node.path)}
            title={`${r.node.name}\n${fmt(r.node.size)} (${pct.toFixed(1)}%)${sys ? '\n⚙ Системний' : ''}`}
            style={{
              position: 'absolute',
              left: r.x, top: r.y, width: r.w, height: r.h,
              background: r.node.color ?? 'rgba(94, 92, 230, 0.7)',
              border: sys ? '2px solid rgba(255,255,255,0.85)' : '1px solid var(--bg-primary)',
              borderRadius: 3,
              cursor: isFolder ? 'pointer' : 'default',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 4,
              transition: 'filter 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)' }}
          >
            {showText && (
              <>
                <div style={{
                  color: '#fff', fontSize: 11, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {sys && <span style={{ fontSize: 12 }}>⚙</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.node.name}</span>
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.85)', fontSize: 10,
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                }}>
                  {fmt(r.node.size)} · {pct.toFixed(1)}%
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
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
  const [view, setView] = useState<ViewTab>('map')
  const [currentPath, setCurrentPath] = useState<string>('')

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
        setCurrentPath(r.data.root.path)
        toast.success(`Проаналізовано ${r.data.totalFiles.toLocaleString('uk-UA')} файлів`)
      } else toast.error(r.error)
    } finally { setBusy(false) }
  }

  const currentNode = useMemo(() => {
    if (!result || !currentPath) return null
    const find = (n: DiskEntry): DiskEntry | null => {
      if (n.path === currentPath) return n
      if (!n.children) return null
      for (const c of n.children) {
        const r = find(c)
        if (r) return r
      }
      return null
    }
    return find(result.root)
  }, [result, currentPath])

  const breadcrumbs = useMemo(() => {
    if (!result) return []
    const parts: DiskEntry[] = []
    const find = (n: DiskEntry, trail: DiskEntry[]): boolean => {
      if (n.path === currentPath) {
        parts.push(...trail, n)
        return true
      }
      if (!n.children) return false
      for (const c of n.children) {
        if (find(c, [...trail, n])) return true
      }
      return false
    }
    find(result.root, [])
    return parts
  }, [result, currentPath])

  const rows = useMemo(
    () => (result ? flatten(result.root, expanded, query) : []),
    [result, expanded, query]
  )

  const toggleExpand = (path: string): void => {
    const n = new Set(expanded)
    if (n.has(path)) n.delete(path); else n.add(path)
    setExpanded(n)
  }

  const drive = drives.find((d) => d.path === selected)
  const totalSize = result?.totalBytes ?? 0

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)',
    textAlign: 'left', userSelect: 'none',
  }

  return (
    <>
      <Card>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: drive ? 12 : 0 }}>
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
          <div style={{ display: 'flex', gap: 20, fontSize: 12.5, flexWrap: 'wrap' }}>
            <div><span className="dim">Обсяг: </span><b>{fmt(drive.totalSize)}</b></div>
            <div><span className="dim">Зайнято: </span><b>{fmt(drive.totalSize - drive.freeSpace)}</b></div>
            <div><span className="dim">Вільно: </span><b>{fmt(drive.freeSpace)}</b></div>
            {result && (
              <>
                <div><span className="dim">Файлів: </span><b>{result.totalFiles.toLocaleString('uk-UA')}</b></div>
                <div><span className="dim">Проскановано: </span><b>{fmt(result.totalBytes)}</b></div>
              </>
            )}
          </div>
        )}
      </Card>

      {result && (
        <>
          <Card style={{ padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {breadcrumbs.map((b, i) => (
                <span key={b.path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setCurrentPath(b.path)}
                    style={{
                      background: 'transparent', border: 0, padding: '2px 6px',
                      borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 12.5, color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--accent)',
                      fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {b.isSystem && <span style={{ fontSize: 11 }}>⚙</span>}
                    {b.name || b.path}
                  </button>
                  {i < breadcrumbs.length - 1 && <span className="dim" style={{ fontSize: 11 }}>›</span>}
                </span>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 2, background: 'var(--bg-primary)', padding: 2, borderRadius: 8 }}>
                {(['map', 'tree'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setView(t)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 0,
                      background: view === t ? 'var(--accent)' : 'transparent',
                      color: view === t ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 500, fontSize: 12.5, fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {t === 'map' ? '🗺 Карта' : '☰ Дерево'}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
            <Card style={{ padding: view === 'map' ? 12 : 0 }}>
              {view === 'map' && currentNode && (
                <>
                  {currentNode.children && currentNode.children.length > 0 ? (
                    <Treemap
                      node={currentNode}
                      width={760}
                      height={460}
                      onNavigate={setCurrentPath}
                    />
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center' }} className="dim">
                      Немає вмісту для відображення
                    </div>
                  )}
                  <div className="dim" style={{ fontSize: 11.5, marginTop: 8, textAlign: 'center' }}>
                    Клік на прямокутник — увійти в папку. ⚙ — системний файл або папка.
                  </div>
                </>
              )}

              {view === 'tree' && (
                <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
                  <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Пошук…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      style={{
                        width: '100%', padding: '7px 12px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'var(--bg-primary)',
                        color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13,
                      }}
                    />
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={headerStyle}>Ім'я</th>
                        <th style={{ ...headerStyle, width: 100, textAlign: 'right' }}>Розмір</th>
                        <th style={{ ...headerStyle, width: 60, textAlign: 'right' }}>%</th>
                        <th style={{ ...headerStyle, width: 80, textAlign: 'right' }}>Файлів</th>
                        <th style={{ ...headerStyle, width: 150 }}>Частка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const pct = totalSize > 0 ? (row.entry.size / totalSize) * 100 : 0
                        const isExpanded = expanded.has(row.entry.path)
                        const hasKids = row.entry.isDir && (row.entry.children?.length ?? 0) > 0
                        const sys = row.entry.isSystem
                        return (
                          <tr
                            key={row.entry.path + i}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              background: sys ? 'rgba(142, 142, 147, 0.06)' : 'transparent',
                            }}
                          >
                            <td
                              style={{ padding: '5px 12px', paddingLeft: 12 + row.depth * 16, cursor: hasKids ? 'pointer' : 'default' }}
                              onClick={() => hasKids && toggleExpand(row.entry.path)}
                            >
                              {hasKids ? (
                                <span style={{ display: 'inline-block', width: 14, color: 'var(--text-secondary)' }}>
                                  {isExpanded ? '▾' : '▸'}
                                </span>
                              ) : (
                                <span style={{ display: 'inline-block', width: 14 }} />
                              )}
                              {!row.entry.isDir && (
                                <span
                                  style={{
                                    display: 'inline-block', width: 8, height: 8,
                                    borderRadius: 2, marginRight: 6,
                                    background: row.entry.color ?? 'var(--accent)',
                                  }}
                                />
                              )}
                              {sys && (
                                <span
                                  style={{
                                    display: 'inline-block', marginRight: 4, fontSize: 12,
                                    opacity: 0.75,
                                  }}
                                  title="Системний файл або папка"
                                >
                                  ⚙
                                </span>
                              )}
                              {row.entry.name}
                            </td>
                            <td style={{ padding: '5px 12px', textAlign: 'right' }} className="dim">{fmt(row.entry.size)}</td>
                            <td style={{ padding: '5px 12px', textAlign: 'right' }} className="dim">{pct.toFixed(1)}%</td>
                            <td style={{ padding: '5px 12px', textAlign: 'right' }} className="dim">{row.entry.fileCount.toLocaleString('uk-UA')}</td>
                            <td style={{ padding: '5px 12px' }}>
                              <div className="bar" style={{ height: 6 }}>
                                <i
                                  style={{
                                    width: `${pct}%`,
                                    background: row.entry.isDir ? 'var(--accent)' : (row.entry.color ?? 'var(--ok)'),
                                    opacity: sys ? 0.7 : 1,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>За типом файлів</div>
                {result.byExt.slice(0, 10).map((e) => {
                  const pct = totalSize > 0 ? (e.bytes / totalSize) * 100 : 0
                  return (
                    <div key={e.ext} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color }} />
                          {e.ext}
                        </span>
                        <span className="dim">{fmt(e.bytes)}</span>
                      </div>
                      <div className="bar" style={{ height: 4 }}>
                        <i style={{ width: `${pct}%`, background: e.color }} />
                      </div>
                    </div>
                  )
                })}
              </Card>

              <Card>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Топ-10 файлів</div>
                {result.topFiles.slice(0, 10).map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, flexShrink: 0 }} />
                    {f.isSystem && <span style={{ fontSize: 11, opacity: 0.75 }}>⚙</span>}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                    <span className="dim">{fmt(f.size)}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  )
}