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
import { flushDns, resetNetwork, releaseRenew } from './network'
import { scanPrivacy, cleanPrivacy } from './privacy'
import { listServices, setServiceStartType } from './services'
import { GameModeManager, getDefaultGameProcesses } from './gamemode'
import { runDiagnostics } from './diagnostics'
import { PerformanceMonitor } from './monitor'

const startupStore = (): string => join(app.getPath('userData'), 'startup-disabled.json')

const settings = new SettingsManager()
const scanner = new MalwareScanner()
const scheduler = new Scheduler()
const backup = new BackupManager(app.getPath('userData'))
const disk = new DiskAnalyzer()
const gameMode = new GameModeManager(app.getPath('userData'))
const monitor = new PerformanceMonitor()

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

  handle('net:flushDns', () => flushDns())
  handle('net:reset', () => resetNetwork())
  handle('net:renew', () => releaseRenew())

  handle('privacy:scan', () => scanPrivacy())
  handle('privacy:clean', (ids) => cleanPrivacy(ids))

  handle('services:list', () => listServices())
  handle('services:set', (name, startType) => setServiceStartType(name, startType))

  handle('gamemode:getState', () => gameMode.getState())
  handle('gamemode:activate', (game) => gameMode.activate(game))
  handle('gamemode:deactivate', () => gameMode.deactivate())
  handle('gamemode:updateSettings', (patch) => gameMode.updateSettings(patch))
  handle('gamemode:defaultProcesses', () => getDefaultGameProcesses())

  handle('diag:run', () => runDiagnostics())

  handle('monitor:start', (intervalMs) => { monitor.start(intervalMs ?? 1000) })
  handle('monitor:stop', () => { monitor.stop() })
  handle('monitor:isRunning', () => monitor.isRunning())
  handle('monitor:history', () => monitor.getHistory())
  handle('monitor:clear', () => { monitor.clearHistory() })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200, height: 780, minWidth: 950, minHeight: 620, show: false,
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

app.whenReady().then(async () => {
  await gameMode.init()
  registerIpc()
  createWindow()

  const savedKey = settings.get('virusTotalApiKey')
  if (savedKey) scanner.setApiKey(savedKey)

  monitor.on('tick', (snap) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('monitor:tick', snap)
  })
  gameMode.on('state', (s) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('gamemode:changed', s)
  })
  gameMode.on('auto-activated', (data) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('gamemode:auto', data)
  })

  const gmState = gameMode.getState()
  if (gmState.autoDetect) gameMode.startDetection()

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })