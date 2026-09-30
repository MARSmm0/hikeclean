// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import type { Channel, IpcMap, IpcResult } from '../shared/types'
import * as opt from './optimizer'
import { SettingsManager } from './settings/SettingsManager'
import { MalwareScanner } from './scanner/MalwareScanner'
import { Scheduler } from './scheduler/Scheduler'
import { BackupManager } from './backup/BackupManager'
import { DiskAnalyzer } from './disk/DiskAnalyzer'
import { getExtendedStats, listDrives } from './systemInfo'

const startupStore = (): string => join(app.getPath('userData'), 'startup-disabled.json')

const settings = new SettingsManager()
const scanner = new MalwareScanner()
const scheduler = new Scheduler()
const backup = new BackupManager(app.getPath('userData'))
const disk = new DiskAnalyzer()

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
  handle('sys:extended', () => getExtendedStats())
  handle('rules:scan', () => opt.scanRules())
  handle('rules:clean', (ids) => opt.cleanRules(ids))
  handle('proc:list', () => opt.listProcesses())
  handle('proc:kill', (pid) => opt.killProcess(pid))
  handle('startup:list', () => opt.listStartup(startupStore()))
  handle('startup:set', (name, enabled) => opt.setStartup(startupStore(), name, enabled))
  handle('boost:run', () => opt.boost())

  handle('settings:getAll', () => settings.getAll())
  handle('settings:set', (key, value) => { settings.set(key as never, value as never) })
  handle('settings:reset', () => { settings.reset() })

  handle('scan:file', (p) => scanner.scanFile(p))
  handle('scan:directory', (dir) => scanner.scanDirectory(dir, (progress) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('scan:progress', progress)
  }))
  handle('scan:setApiKey', (key) => {
    scanner.setApiKey(key)
    settings.set('virusTotalApiKey' as never, key as never)
  })

  handle('schedule:list', () => scheduler.getTasks())
  handle('schedule:add', (t) => { scheduler.addTask(t) })
  handle('schedule:remove', (id) => { scheduler.removeTask(id) })

  handle('backup:list', () => backup.listBackups())
  handle('backup:create', (files, label) => backup.createBackup(files, label))
  handle('backup:restore', (id) => backup.restoreBackup(id))
  handle('backup:delete', (id) => backup.deleteBackup(id))

  handle('disk:analyze', (root) => disk.analyze(root))
  handle('disk:listDrives', () => listDrives())
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100, height: 720, minWidth: 900, minHeight: 600, show: false,
    backgroundColor: '#1c1c1e', autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  })
  win.on('ready-to-show', () => win.show())
  const url = process.env['ELECTRON_RENDERER_URL']
  if (url) void win.loadURL(url)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  const savedKey = settings.get('virusTotalApiKey')
  if (savedKey) scanner.setApiKey(savedKey)
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })