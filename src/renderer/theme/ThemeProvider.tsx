// src/renderer/theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Settings, Theme } from '@shared/types'

interface ThemeContextValue {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  settings: Settings | null
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')
  const [settings, setSettings] = useState<Settings | null>(null)

  // Завантаження налаштувань при старті
  useEffect(() => {
    window.api.invoke('settings:getAll').then((res) => {
      if (res.ok) {
        setSettings(res.data)
        setThemeState(res.data.theme)
      }
    })
  }, [])

  // Застосування теми
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mq.matches)
      const r: 'light' | 'dark' = isDark ? 'dark' : 'light'
      setResolved(r)
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.style.colorScheme = r
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    setSettings((prev) => (prev ? { ...prev, theme: newTheme } : prev))
    void window.api.invoke('settings:set', 'theme', newTheme)
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
    void window.api.invoke('settings:set', key, value)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, settings, updateSetting }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}