// src/shared/types.ts
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface ScanRow { id: string; name: string; bytes: number }
export interface CleanResult { freed: number; failed: number }
export interface Stats { cpu: number; ramUsed: number; ramTotal: number }
export interface ProcRow { pid: number; name: string; cpu: number; memBytes: number }
export interface StartupItem { name: string; command: string; enabled: boolean }

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

export type ThreatLevel = 'clean' | 'suspicious' | 'malicious' | 'error'
export interface ScanResult { file: string; status: ThreatLevel; details?: string; hash?: string }
export interface ScanProgress { current: number; total: number; currentFile: string; threatsFound: number; finished: boolean }

export interface ScheduledTask {
  id: string; name: string; cronExpression: string
  action: 'scan' | 'clean' | 'boost'; enabled: boolean
}

export interface BackupMeta { id: string; label: string; createdAt: number; files: string[] }

export interface DiskEntry {
  name: string
  path: string
  size: number
  isDir: boolean
  fileCount: number
  ext?: string
  color?: string
  isSystem?: boolean
  children?: DiskEntry[]
}

export interface DiskScanResult {
  root: DiskEntry
  totalFiles: number
  totalBytes: number
  byExt: Array<{ ext: string; bytes: number; count: number; color: string }>
  topFiles: Array<{ path: string; name: string; size: number; ext: string; color: string; isSystem: boolean }>
}

export interface ExtendedStats {
  cpu: number; ramUsed: number; ramTotal: number
  diskUsed: number; diskTotal: number; diskPercent: number
  netRx: number; netTx: number
  uptime: number; hostname: string; platform: string
}

export interface DriveInfo {
  letter: string; path: string
  totalSize: number; freeSpace: number; usedPercent: number
}

export interface NetworkActionResult { ok: boolean; message: string }

export interface PrivacyCategory {
  id: string
  name: string
  paths: string[]
  bytes: number
}

export interface ServiceInfo {
  name: string
  displayName: string
  status: string
  startType: string
}

export interface IpcMap {
  'sys:stats': { args: []; result: Stats }
  'sys:extended': { args: []; result: ExtendedStats }
  'rules:scan': { args: []; result: ScanRow[] }
  'rules:clean': { args: [ids: string[]]; result: CleanResult }
  'proc:list': { args: []; result: ProcRow[] }
  'proc:kill': { args: [pid: number]; result: void }
  'startup:list': { args: []; result: StartupItem[] }
  'startup:set': { args: [name: string, enabled: boolean]; result: void }
  'boost:run': { args: []; result: string[] }
  'settings:getAll': { args: []; result: Settings }
  'settings:set': { args: [key: keyof Settings, value: Settings[keyof Settings]]; result: void }
  'settings:reset': { args: []; result: void }
  'scan:file': { args: [p: string]; result: ScanResult }
  'scan:directory': { args: [dir: string]; result: ScanResult[] }
  'scan:setApiKey': { args: [key: string]; result: void }
  'schedule:list': { args: []; result: ScheduledTask[] }
  'schedule:add': { args: [t: ScheduledTask]; result: void }
  'schedule:remove': { args: [id: string]; result: void }
  'backup:list': { args: []; result: BackupMeta[] }
  'backup:create': { args: [files: string[], label: string]; result: string }
  'backup:restore': { args: [id: string]; result: void }
  'backup:delete': { args: [id: string]; result: void }
  'disk:analyze': { args: [root: string]; result: DiskScanResult }
  'disk:listDrives': { args: []; result: DriveInfo[] }
  'net:flushDns': { args: []; result: NetworkActionResult }
  'net:reset': { args: []; result: NetworkActionResult }
  'net:renew': { args: []; result: NetworkActionResult }
  'privacy:scan': { args: []; result: PrivacyCategory[] }
  'privacy:clean': { args: [ids: string[]]; result: { freed: number; failed: number } }
  'services:list': { args: []; result: ServiceInfo[] }
  'services:set': { args: [name: string, startType: 'Automatic' | 'Manual' | 'Disabled']; result: void }
}
export type Channel = keyof IpcMap

export interface Api {
  invoke<K extends Channel>(ch: K, ...args: IpcMap[K]['args']): Promise<IpcResult<IpcMap[K]['result']>>
}