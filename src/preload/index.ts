// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { Api, Channel } from '@shared/types'

const allowed: Channel[] = [
  'sys:stats', 'rules:scan', 'rules:clean',
  'proc:list', 'proc:kill',
  'startup:list', 'startup:set',
  'boost:run',
  'settings:getAll', 'settings:set', 'settings:reset',
]

const api: Api = {
  invoke: (ch, ...args) => {
    if (!allowed.includes(ch)) return Promise.resolve({ ok: false, error: 'Channel not allowed' })
    return ipcRenderer.invoke(ch, ...args)
  }
}
contextBridge.exposeInMainWorld('api', api)