// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import type { Channel, IpcMap, IpcResult } from '../shared/types'
import * as opt from './optimizer'
import { SettingsManager } from './settings/SettingsManager'

const startupStore = (): string => join(app.getPath('userData'), 'startup-disabled.json')
const settings = new SettingsManager()

function handle<K extends Channel>(
  ch: K,
  fn: (...args: IpcMap[K]['args']) => Promise<IpcMap[K]['result']> | IpcMap[K]['result']
): void {
  ipcMain.handle(ch, async (_e, ...args: unknown[]): Promise<IpcResult<IpcMap[K]['result']>> => {
    try { return { ok: true, data: await fn(...(args as IpcMap[K]['args'])) } }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) } }
  })
}

function registerIpc(): void {
  handle('sys:stats', () => opt.getStats())
  handle('rules:scan', () => opt.scanRules())
  handle('rules:clean', (ids) => opt.cleanRules(ids))
  handle('proc:list', () => opt.listProcesses())
  handle('proc:kill', (pid) => opt.killProcess(pid))
  handle('startup:list', () => opt.listStartup(startupStore()))
  handle('startup:set', (name, enabled) => opt.setStartup(startupStore(), name, enabled))
  handle('boost:run', () => opt.boost())

  // Settings
  handle('settings:getAll', () => settings.getAll())
  handle('settings:set', (key, value) => {
    settings.set(key as never, value as never)
  })
  handle('settings:reset', () => {
    settings.reset()
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100, height: 720, minWidth: 900, minHeight: 600, show: false,
    backgroundColor: '#12141a', autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  })
  win.on('ready-to-show', () => win.show())
  const url = process.env['ELECTRON_RENDERER_URL']
  if (url) void win.loadURL(url)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })