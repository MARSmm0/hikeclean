// src/renderer/components/Sidebar.tsx
export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: string
}

interface SidebarProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
}

export function Sidebar<T extends string>({ tabs, active, onChange }: SidebarProps<T>) {
  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        padding: 16,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 8px 16px',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          H
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
          Hike
        </span>
      </div>

      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              border: 0,
              background: isActive ? 'rgba(0, 113, 227, 0.12)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--line)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
            {tab.icon && <span style={{ fontSize: 16 }}>{tab.icon}</span>}
            {tab.label}
          </button>
        )
      })}

      <div style={{ flex: 1 }} />

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px' }}>
        v0.1.0
      </div>
    </aside>
  )
}