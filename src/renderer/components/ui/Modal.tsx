// src/renderer/components/ui/Modal.tsx
import React, { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 520,
          margin: '0 16px',
          background: 'var(--bg-secondary)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          animation: 'modalIn 0.35s cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}
      >
        {title && (
          <h3 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--text-primary)' }}>
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  )
}