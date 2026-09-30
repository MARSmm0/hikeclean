// src/renderer/components/Sidebar.tsx
export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: string
  group?: 'main' | 'bottom'
}

interface SidebarProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
}

export function Sidebar<T extends string>({ tabs, active, onChange }: SidebarProps<T>) {
  const main = tabs.filter((t) => (t.group ?? 'main') === 'main')
  const bottom = tabs.filter((t) => t.group === 'bottom')

  const renderBtn = (tab: TabItem<T>) => {
    const isActive = tab.id === active
    return (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 12px', borderRadius: 8, border: 0,
          background: isActive ? 'rgba(0, 113, 227, 0.10)' : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: isActive ? 600 : 400,
          fontSize: 13.5, letterSpacing: '-0.005em',
          fontFamily: 'inherit', cursor: 'pointer',
          textAlign: 'left', width: '100%',
          transition: 'background 0.18s ease-out, color 0.18s ease-out',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'
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
        {tab.icon && (
          <span style={{ fontSize: 15, width: 18, textAlign: 'center', display: 'inline-block', opacity: isActive ? 1 : 0.75 }}>
            {tab.icon}
          </span>
        )}
        {tab.label}
      </button>
    )
  }

  return (
    <aside
      style={{
        width: 232, flexShrink: 0, padding: '20px 12px',
        borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 24px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: 'var(--accent)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em',
        }}>H</div>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Hike
        </span>
      </div>

      {main.map(renderBtn)}

      <div style={{ flex: 1 }} />

      {bottom.length > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }} />
          {bottom.map(renderBtn)}
        </>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '8px 12px', letterSpacing: '0.01em', opacity: 0.7 }}>
        v0.1.0
      </div>
    </aside>
  )
}