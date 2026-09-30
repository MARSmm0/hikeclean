// src/main/settings/SettingsManager.ts
import Store from 'electron-store'

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  theme: Theme
  language: string
  virusTotalApiKey: string
  launchAtStartup: boolean
  minimizeToTray: boolean
  performanceMonitor: { enabled: boolean; intervalMs: number }
  cleaning: { autoBackup: boolean; confirmBeforeDelete: boolean }
}

const defaults: Settings = {
  theme: 'system',
  language: 'uk',
  virusTotalApiKey: '',
  launchAtStartup: false,
  minimizeToTray: true,
  performanceMonitor: { enabled: true, intervalMs: 1000 },
  cleaning: { autoBackup: true, confirmBeforeDelete: true },
}

export class SettingsManager {
  private store: Store<Settings>

  constructor() {
    this.store = new Store<Settings>({
      name: 'hike-settings',
      defaults,
      clearInvalidConfig: true,
    })
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.store.get(key)
  }

  getAll(): Settings {
    return this.store.store
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.store.set(key, value)
  }

  reset(): void {
    this.store.clear()
  }
}