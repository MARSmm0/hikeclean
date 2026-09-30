import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir, rm, lstat, readFile, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'
import si from 'systeminformation'
import type { CleanResult, ProcRow, ScanRow, StartupItem, Stats } from '../shared/types'

const run = promisify(execFile)
const isWin = process.platform === 'win32'

interface Rule { id: string; name: string; paths: string[] }

const expand = (p: string): string =>
  p.replace(/%([^%]+)%/g, (_, v: string) => process.env[v] ?? '')

const RULES: Rule[] = isWin
  ? [
      { id: 'temp', name: 'Тимчасові файли користувача', paths: ['%TEMP%'] },
      { id: 'wintemp', name: 'Тимчасові файли Windows', paths: ['%SystemRoot%\\Temp'] },
      { id: 'prefetch', name: 'Prefetch', paths: ['%SystemRoot%\\Prefetch'] },
      { id: 'inet', name: 'Кеш інтернету (INetCache)', paths: ['%LOCALAPPDATA%\\Microsoft\\Windows\\INetCache'] },
      { id: 'dumps', name: 'Дампи збоїв', paths: ['%LOCALAPPDATA%\\CrashDumps'] },
      { id: 'dx', name: 'Кеш шейдерів (DirectX)', paths: ['%LOCALAPPDATA%\\D3DSCache'] },
      { id: 'nv', name: 'Кеш шейдерів NVIDIA', paths: ['%LOCALAPPDATA%\\NVIDIA\\DXCache'] },
      { id: 'chrome', name: 'Кеш Chrome', paths: ['%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cache\\Cache_Data'] },
      { id: 'edge', name: 'Кеш Edge', paths: ['%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data'] },
      { id: 'brave', name: 'Кеш Brave', paths: ['%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache\\Cache_Data'] },
      { id: 'discord', name: 'Кеш Discord', paths: ['%APPDATA%\\discord\\Cache\\Cache_Data', '%APPDATA%\\discord\\Code Cache'] },
      { id: 'vscode', name: 'Кеш VS Code', paths: ['%APPDATA%\\Code\\Cache', '%APPDATA%\\Code\\CachedData'] },
      { id: 'spotify', name: 'Кеш Spotify', paths: ['%LOCALAPPDATA%\\Spotify\\Storage'] },
      { id: 'steam', name: 'Кеш Steam (веб)', paths: ['%LOCALAPPDATA%\\Steam\\htmlcache'] }
    ]
  : [
      { id: 'tmp', name: 'Тимчасові файли', paths: ['/tmp'] },
      { id: 'cache', name: 'Кеш користувача', paths: [join(process.env.HOME ?? '', '.cache')] }
    ]

async function sizeOf(path: string): Promise<number> {
  let total = 0
  let entries
  try { entries = await readdir(path, { withFileTypes: true }) } catch { return 0 }
  await Promise.all(entries.map(async (e) => {
    const full = join(path, e.name)
    if (e.isSymbolicLink()) return
    if (e.isDirectory()) total += await sizeOf(full)
    else { try { total += (await lstat(full)).size } catch { /* зайнятий файл */ } }
  }))
  return total
}

const safe = (p: string): boolean => p.length > 8 && parse(p).root !== p

export async function scanRules(): Promise<ScanRow[]> {
  const rows = await Promise.all(RULES.map(async (r) => {
    const sizes = await Promise.all(r.paths.map((p) => sizeOf(expand(p))))
    return { id: r.id, name: r.name, bytes: sizes.reduce((a, b) => a + b, 0) }
  }))
  return rows.sort((a, b) => b.bytes - a.bytes)
}

export async function cleanRules(ids: string[]): Promise<CleanResult> {
  let freed = 0, failed = 0
  for (const rule of RULES.filter((r) => ids.includes(r.id))) {
    for (const raw of rule.paths) {
      const dir = expand(raw)
      if (!safe(dir)) continue
      let entries
      try { entries = await readdir(dir) } catch { continue }
      for (const name of entries) {
        const full = join(dir, name)
        const size = await sizeOf(full) || await lstat(full).then((s) => s.size).catch(() => 0)
        try { await rm(full, { recursive: true, force: true }); freed += size } catch { failed++ }
      }
    }
  }
  return { freed, failed }
}

export async function getStats(): Promise<Stats> {
  const [load, mem] = await Promise.all([si.currentLoad(), si.mem()])
  return { cpu: load.currentLoad, ramUsed: mem.active, ramTotal: mem.total }
}

export async function listProcesses(): Promise<ProcRow[]> {
  const p = await si.processes()
  return p.list
    .map((x) => ({ pid: x.pid, name: x.name, cpu: x.cpu, memBytes: x.memRss * 1024 }))
    .sort((a, b) => b.memBytes - a.memBytes)
    .slice(0, 40)
}

export function killProcess(pid: number): void {
  if (pid === process.pid || pid <= 4) throw new Error('Цей процес не можна завершити')
  process.kill(pid)
}

// ── Автозавантаження (лише Windows, розділ HKCU\...\Run) ──
const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'

export async function listStartup(store: string): Promise<StartupItem[]> {
  if (!isWin) return []
  const { stdout } = await run('reg', ['query', RUN_KEY]).catch(() => ({ stdout: '' }))
  const active: StartupItem[] = []
  for (const line of stdout.split(/\r?\n/)) {
    const m = /^\s+(.+?)\s+REG_(?:EXPAND_)?SZ\s+(.*)$/.exec(line)
    if (m?.[1] && m[2] !== undefined) active.push({ name: m[1], command: m[2], enabled: true })
  }
  const disabled = await readDisabled(store)
  return [...active, ...Object.entries(disabled).map(([name, command]) => ({ name, command, enabled: false }))]
}

async function readDisabled(store: string): Promise<Record<string, string>> {
  try { return JSON.parse(await readFile(store, 'utf8')) as Record<string, string> } catch { return {} }
}

export async function setStartup(store: string, name: string, enabled: boolean): Promise<void> {
  if (!isWin) return
  const items = await listStartup(store)
  const item = items.find((i) => i.name === name)
  if (!item) throw new Error('Запис не знайдено')
  const disabled = await readDisabled(store)
  if (!enabled) {
    disabled[name] = item.command
    await writeFile(store, JSON.stringify(disabled, null, 2))
    await run('reg', ['delete', RUN_KEY, '/v', name, '/f'])
  } else {
    await run('reg', ['add', RUN_KEY, '/v', name, '/t', 'REG_SZ', '/d', item.command, '/f'])
    delete disabled[name]
    await writeFile(store, JSON.stringify(disabled, null, 2))
  }
}

// ── Прискорення: план живлення + DNS + очищення тимчасових ──
export async function boost(): Promise<string[]> {
  const log: string[] = []
  if (isWin) {
    try {
      await run('powercfg', ['/setactive', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'])
      log.push('Увімкнено план живлення «Висока продуктивність»')
    } catch { log.push('Не вдалося змінити план живлення') }
    try { await run('ipconfig', ['/flushdns']); log.push('DNS-кеш очищено') } catch { log.push('DNS-кеш не очищено') }
  }
  const res = await cleanRules(['temp', 'dx', 'dumps', 'tmp'])
  log.push(`Тимчасові файли: звільнено ${(res.freed / 1048576).toFixed(1)} МБ`)
  return log
}
