export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface ScanRow { id: string; name: string; bytes: number }
export interface CleanResult { freed: number; failed: number }
export interface Stats { cpu: number; ramUsed: number; ramTotal: number }
export interface ProcRow { pid: number; name: string; cpu: number; memBytes: number }
export interface StartupItem { name: string; command: string; enabled: boolean }

export interface IpcMap {
  'sys:stats': { args: []; result: Stats }
  'rules:scan': { args: []; result: ScanRow[] }
  'rules:clean': { args: [ids: string[]]; result: CleanResult }
  'proc:list': { args: []; result: ProcRow[] }
  'proc:kill': { args: [pid: number]; result: void }
  'startup:list': { args: []; result: StartupItem[] }
  'startup:set': { args: [name: string, enabled: boolean]; result: void }
  'boost:run': { args: []; result: string[] }
}
export type Channel = keyof IpcMap

export interface Api {
  invoke<K extends Channel>(ch: K, ...args: IpcMap[K]['args']): Promise<IpcResult<IpcMap[K]['result']>>
}
