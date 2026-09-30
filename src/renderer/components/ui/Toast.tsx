// src/renderer/components/ui/Toast.tsx
import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'info' | 'success' | 'error' | 'warning'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  show: (type: ToastType, message: string, durationMs?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const COLORS: Record<ToastType, string> = {
  info: 'var(--accent)',
  success: 'var(--ok)',
  error: 'var(--bad)',
  warning: '#ff9f0a',
}

const ICONS: Record<ToastType, string> = {
  info: 'i',
  success: '✓',
  error: '✕',
  warning: '!',
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((type: ToastType, message: string, durationMs = 3500) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, durationMs)
  }, [])

  const success = useCallback((m: string) => show('success', m), [show])
  const error = useCallback((m: string) => show('error', m), [show])
  const info = useCallback((m: string) => show('info', m), [show])

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'var(--bg-secondary)',
              border: `1px solid ${COLORS[t.type]}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: 260,
              maxWidth: 400,
              animation: 'toastIn 0.35s cubic-bezier(0.34,1.3,0.64,1)',
            }}
          >
            <span
              style={{
                color: COLORS[t.type],
                fontSize: 16,
                fontWeight: 700,
                width: 20,
                textAlign: 'center',
              }}
            >
              {ICONS[t.type]}
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}