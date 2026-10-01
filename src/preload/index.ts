// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { Api, Channel } from '@shared/types'

const allowed: Channel[] = [
  'sys:stats', 'sys:extended', 'rules:scan', 'rules:clean',
  'proc:list', 'proc:kill',
  'startup:list', 'startup:set',
  'boost:run',
  'settings:getAll', 'settings:set', 'settings:reset',
  'scan:file', 'scan:directory', 'scan:setApiKey',
  'schedule:list', 'schedule:add', 'schedule:remove',
  'backup:list', 'backup:create', 'backup:restore', 'backup:delete',
  'disk:analyze', 'disk:listDrives',
  'net:flushDns', 'net:reset', 'net:renew',
  'privacy:scan', 'privacy:clean',
  'services:list', 'services:set',
  'gamemode:getState', 'gamemode:activate', 'gamemode:deactivate',
  'gamemode:updateSettings', 'gamemode:defaultProcesses',
  'diag:run',
  'monitor:start', 'monitor:stop', 'monitor:isRunning', 'monitor:history', 'monitor:clear',
]

const api: Api = {
  invoke: (ch, ...args) => {
    if (!allowed.includes(ch)) return Promise.resolve({ ok: false, error: 'Channel not allowed' })
    return ipcRenderer.invoke(ch, ...args)
  },
}

contextBridge.exposeInMainWorld('api', api)

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel: string, listener: (...args: unknown[]) => void) => {
      const handler = (_: unknown, ...args: unknown[]): void => listener(...args)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },
  },
})