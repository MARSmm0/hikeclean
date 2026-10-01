// src/main/gamemode.ts
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'

const execAsync = promisify(exec)

export interface GameModeState {
  active: boolean
  startedAt: number | null
  detectedGame: string | null
  disabledServices: string[]
  killedProcesses: string[]
  autoDetect: boolean
  autoRestoreOnExit: boolean
  customProcesses: string[]
}

const DEFAULT_GAME_PROCESSES = [
  'csgo.exe', 'cs2.exe', 'valorant.exe', 'dota2.exe', 'fortnite.exe',
  'gta5.exe', 'r5apex.exe', 'rainbowsix.exe', 'pubg.exe', 'rust.exe',
  'minecraft.exe', 'javaw.exe', 'genshinimpact.exe', 'leagueclient.exe',
]

const GAME_MODE_SERVICES = [
  'SysMain',            // Superfetch
  'WSearch',            // Windows Search
  'TabletInputService', // Touch keyboard
  'DiagTrack',          // Diagnostics Tracking
  'dmwappushservice',   // WAP Push
]

const GAME_MODE_PROCESSES = [
  'OneDrive.exe',
  'MicrosoftEdgeUpdate.exe',
  'GoogleUpdate.exe',
]

export class GameModeManager extends EventEmitter {
  private state: GameModeState = {
    active: false,
    startedAt: null,
    detectedGame: null,
    disabledServices: [],
    killedProcesses: [],
    autoDetect: true,
    autoRestoreOnExit: true,
    customProcesses: [],
  }

  private detector: NodeJS.Timeout | null = null
  private configPath: string

  constructor(userDataDir: string) {
    super()
    this.configPath = path.join(userDataDir, 'gamemode.json')
  }

  async init(): Promise<void> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8')
      const saved = JSON.parse(raw) as Partial<GameModeState>
      this.state = { ...this.state, ...saved, active: false, startedAt: null, detectedGame: null }
    } catch { /* first run */ }
  }

  getState(): GameModeState {
    return { ...this.state }
  }

  async updateSettings(patch: Partial<Pick<GameModeState, 'autoDetect' | 'autoRestoreOnExit' | 'customProcesses'>>): Promise<void> {
    Object.assign(this.state, patch)
    await this.save()
    if (patch.autoDetect !== undefined) {
      if (patch.autoDetect) this.startDetection()
      else this.stopDetection()
    }
  }

  async activate(gameName?: string): Promise<string[]> {
    if (this.state.active) return ['Ігровий режим вже активний']
    const log: string[] = []

    // 1. Disable services
    if (process.platform === 'win32') {
      for (const svc of GAME_MODE_SERVICES) {
        try {
          await execAsync(`powershell -NoProfile -Command "Stop-Service -Name '${svc}' -Force -ErrorAction SilentlyContinue; Set-Service -Name '${svc}' -StartupType Manual -ErrorAction SilentlyContinue"`)
          this.state.disabledServices.push(svc)
          log.push(`✓ Служба вимкнена: ${svc}`)
        } catch { /* skip */ }
      }
    } else {
      log.push('ℹ Служби доступні тільки на Windows')
    }

    // 2. Kill background processes
    for (const proc of GAME_MODE_PROCESSES) {
      try {
        if (process.platform === 'win32') {
          await execAsync(`taskkill /F /IM "${proc}" /T`)
          this.state.killedProcesses.push(proc)
          log.push(`✓ Процес завершено: ${proc}`)
        }
      } catch { /* process not running */ }
    }

    this.state.active = true
    this.state.startedAt = Date.now()
    this.state.detectedGame = gameName ?? null

    this.emit('state', this.getState())
    await this.save()
    log.push('🎮 Ігровий режим активовано')
    return log
  }

  async deactivate(): Promise<string[]> {
    if (!this.state.active) return ['Ігровий режим не активний']
    const log: string[] = []

    // Restore services
    if (process.platform === 'win32') {
      for (const svc of this.state.disabledServices) {
        try {
          await execAsync(`powershell -NoProfile -Command "Set-Service -Name '${svc}' -StartupType Automatic -ErrorAction SilentlyContinue; Start-Service -Name '${svc}' -ErrorAction SilentlyContinue"`)
          log.push(`✓ Служба відновлена: ${svc}`)
        } catch { /* skip */ }
      }
    }

    this.state.active = false
    this.state.startedAt = null
    this.state.detectedGame = null
    this.state.disabledServices = []
    this.state.killedProcesses = []

    this.emit('state', this.getState())
    await this.save()
    log.push('🛑 Ігровий режим вимкнено')
    return log
  }

  startDetection(): void {
    if (this.detector) clearInterval(this.detector)
    this.detector = setInterval(() => void this.detect(), 5000)
  }

  stopDetection(): void {
    if (this.detector) {
      clearInterval(this.detector)
      this.detector = null
    }
  }

  private async detect(): Promise<void> {
    if (!this.state.autoDetect || this.state.active) return
    if (process.platform !== 'win32') return

    try {
      const all = [...DEFAULT_GAME_PROCESSES, ...this.state.customProcesses]
      const { stdout } = await execAsync('tasklist /FO CSV /NH')
      const running = all.find((g) => stdout.toLowerCase().includes(g.toLowerCase()))
      if (running) {
        const log = await this.activate(running)
        this.emit('auto-activated', { game: running, log })
      }
    } catch { /* skip */ }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.state, null, 2))
    } catch { /* skip */ }
  }
}

export function getDefaultGameProcesses(): string[] {
  return [...DEFAULT_GAME_PROCESSES]
}