// src/renderer/components/Sidebar.tsx
import { useState } from 'react'

export interface NavItem<T extends string> {
  id: T
  label: string
  icon?: string
}

export interface NavGroup<T extends string> {
  id: string
  label: string
  icon: string
  items: NavItem<T>[]
}

interface SidebarProps<T extends string> {
  groups: NavGroup<T>[]
  bottom: NavItem<T>[]
  active: T
  onChange: (id: T) => void
}

export function Sidebar<T extends string>({ groups, bottom, active, onChange }: SidebarProps<T>) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(groups.map((g) => g.id)))

  const toggleGroup = (id: string): void => {
    const n = new Set(openGroups)
    if (n.has(id)) n.delete(id); else n.add(id)
    setOpenGroups(n)
  }

  const isGroupActive = (g: NavGroup<T>): boolean => g.items.some((i) => i.id === active)

  return (
    <aside
      style={{
        width: 248, flexShrink: 0, padding: '16px 10px',
        borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)',
        display: 'flex', flexDirection: 'column', gap: 2,
        overflowY: 'auto',
      }}
    >
      {/* Логотип */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 20px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: 'var(--accent)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em',
        }}>H</div>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Hike
        </span>
      </div>

      {/* Групи */}
      {groups.map((g) => {
        const isOpen = openGroups.has(g.id)
        const hasActive = isGroupActive(g)
        return (
          <div key={g.id} style={{ marginBottom: 4 }}>
            <button
              onClick={() => toggleGroup(g.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '8px 12px', borderRadius: 8, border: 0,
                background: hasActive && !isOpen ? 'rgba(0, 113, 227, 0.06)' : 'transparent',
                color: hasActive ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: 500, fontSize: 13.5, letterSpacing: '-0.005em',
                fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
              onMouseLeave={(e) => {
                if (!(hasActive && !isOpen)) e.currentTarget.style.background = 'transparent'
                else e.currentTarget.style.background = 'rgba(0, 113, 227, 0.06)'
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: 'center', opacity: 0.85 }}>{g.icon}</span>
              <span style={{ flex: 1 }}>{g.label}</span>
              <span style={{ fontSize: 10, opacity: 0.5, transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>

            {isOpen && (
              <div style={{ marginLeft: 16, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {g.items.map((it) => {
                  const isActive = it.id === active
                  return (
                    <button
                      key={it.id}
                      onClick={() => onChange(it.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 12px', borderRadius: 7, border: 0,
                        background: isActive ? 'rgba(0, 113, 227, 0.10)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 13, letterSpacing: '-0.005em',
                        fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }
                      }}
                    >
                      {it.icon && (
                        <span style={{ fontSize: 13, width: 16, textAlign: 'center', opacity: isActive ? 1 : 0.7 }}>
                          {it.icon}
                        </span>
                      )}
                      {it.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ flex: 1, minHeight: 12 }} />

      {/* Низ */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
        {bottom.map((it) => {
          const isActive = it.id === active
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '8px 12px', borderRadius: 8, border: 0,
                background: isActive ? 'rgba(0, 113, 227, 0.10)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400, fontSize: 13.5,
                letterSpacing: '-0.005em', fontFamily: 'inherit',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              {it.icon && (
                <span style={{ fontSize: 15, width: 18, textAlign: 'center', opacity: isActive ? 1 : 0.75 }}>
                  {it.icon}
                </span>
              )}
              {it.label}
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 12px', letterSpacing: '0.01em', opacity: 0.7 }}>
        v0.1.0
      </div>
    </aside>
  )
}