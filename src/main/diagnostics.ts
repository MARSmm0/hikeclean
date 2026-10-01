// src/main/diagnostics.ts
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'

const execAsync = promisify(exec)

export type DiagStatus = 'ok' | 'warning' | 'error' | 'info'

export interface DiagCheck {
  id: string
  name: string
  status: DiagStatus
  message: string
  details?: string
}

export interface DiagResult {
  score: number           // 0-100
  checks: DiagCheck[]
  platform: string
  hostname: string
  cpus: number
  totalRam: number
  uptime: number
}

async function checkDiskSpace(): Promise<DiagCheck> {
  try {
    const { stdout } = await execAsync(
      process.platform === 'win32'
        ? 'powershell -NoProfile -Command "(Get-PSDrive C).Free, (Get-PSDrive C).Used | ConvertTo-Json"'
        : 'df -B1 / | tail -1'
    )
    let free = 0, used = 0
    if (process.platform === 'win32') {
      const data = JSON.parse(stdout)
      free = data[0]; used = data[1]
    } else {
      const parts = stdout.trim().split(/\s+/)
      used = parseInt(parts[2] ?? '0', 10)
      free = parseInt(parts[3] ?? '0', 10)
    }
    const total = free + used
    const pct = total > 0 ? (free / total) * 100 : 0
    const freeGB = (free / 1073741824).toFixed(1)
    if (pct < 10) return { id: 'disk', name: 'Місце на диску', status: 'error', message: `Тільки ${freeGB} ГБ вільно`, details: `${pct.toFixed(0)}% вільного простору` }
    if (pct < 20) return { id: 'disk', name: 'Місце на диску', status: 'warning', message: `${freeGB} ГБ вільно`, details: `Рекомендується > 20% вільно` }
    return { id: 'disk', name: 'Місце на диску', status: 'ok', message: `${freeGB} ГБ вільно`, details: `${pct.toFixed(0)}% вільного простору` }
  } catch {
    return { id: 'disk', name: 'Місце на диску', status: 'info', message: 'Не вдалось перевірити' }
  }
}

async function checkDefender(): Promise<DiagCheck> {
  if (process.platform !== 'win32') return { id: 'defender', name: 'Антивірус', status: 'info', message: 'Тільки Windows' }
  try {
    const { stdout } = await execAsync('powershell -NoProfile -Command "(Get-MpComputerStatus).RealTimeProtectionEnabled"')
    const enabled = stdout.trim().toLowerCase() === 'true'
    return enabled
      ? { id: 'defender', name: 'Захисник Windows', status: 'ok', message: 'Реальний час увімкнено' }
      : { id: 'defender', name: 'Захисник Windows', status: 'error', message: 'Реальний час вимкнено' }
  } catch {
    return { id: 'defender', name: 'Захисник Windows', status: 'warning', message: 'Не вдалось перевірити' }
  }
}

async function checkFirewall(): Promise<DiagCheck> {
  if (process.platform !== 'win32') return { id: 'firewall', name: 'Брандмауер', status: 'info', message: 'Тільки Windows' }
  try {
    const { stdout } = await execAsync('netsh advfirewall show allprofiles state')
    const enabled = stdout.toLowerCase().includes('on')
    return enabled
      ? { id: 'firewall', name: 'Брандмауер', status: 'ok', message: 'Увімкнено' }
      : { id: 'firewall', name: 'Брандмауер', status: 'error', message: 'Вимкнено' }
  } catch {
    return { id: 'firewall', name: 'Брандмауер', status: 'warning', message: 'Не вдалось перевірити' }
  }
}

function checkRam(): DiagCheck {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  const pct = (used / total) * 100
  const usedGB = (used / 1073741824).toFixed(1)
  const totalGB = (total / 1073741824).toFixed(1)
  if (pct > 90) return { id: 'ram', name: 'Пам\'ять', status: 'error', message: `${usedGB} / ${totalGB} ГБ (${pct.toFixed(0)}%)`, details: 'Критично високе використання' }
  if (pct > 75) return { id: 'ram', name: 'Пам\'ять', status: 'warning', message: `${usedGB} / ${totalGB} ГБ (${pct.toFixed(0)}%)`, details: 'Високе використання' }
  return { id: 'ram', name: 'Пам\'ять', status: 'ok', message: `${usedGB} / ${totalGB} ГБ (${pct.toFixed(0)}%)` }
}

async function checkPowerPlan(): Promise<DiagCheck> {
  if (process.platform !== 'win32') return { id: 'power', name: 'План живлення', status: 'info', message: 'Тільки Windows' }
  try {
    const { stdout } = await execAsync('powercfg /getactivescheme')
    const isHigh = stdout.toLowerCase().includes('high performance') || stdout.includes('Висока продуктивність')
    return isHigh
      ? { id: 'power', name: 'План живлення', status: 'ok', message: 'Висока продуктивність' }
      : { id: 'power', name: 'План живлення', status: 'info', message: 'Збалансований', details: 'Для ігор можна увімкнути «Висока продуктивність»' }
  } catch {
    return { id: 'power', name: 'План живлення', status: 'warning', message: 'Не вдалось перевірити' }
  }
}

async function checkTempSize(): Promise<DiagCheck> {
  const tmp = os.tmpdir()
  try {
    const { stdout } = await execAsync(
      process.platform === 'win32'
        ? `powershell -NoProfile -Command "(Get-ChildItem '${tmp}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum"`
        : `du -sb "${tmp}"`
    )
    let size = 0
    if (process.platform === 'win32') size = parseInt(stdout.trim(), 10) || 0
    else size = parseInt(stdout.trim().split(/\s+/)[0] ?? '0', 10)
    const sizeMB = size / 1048576
    if (sizeMB > 2000) return { id: 'temp', name: 'Тимчасові файли', status: 'warning', message: `${(size / 1073741824).toFixed(1)} ГБ`, details: 'Рекомендується очистити' }
    return { id: 'temp', name: 'Тимчасові файли', status: 'ok', message: `${sizeMB.toFixed(0)} МБ` }
  } catch {
    return { id: 'temp', name: 'Тимчасові файли', status: 'info', message: 'Не вдалось виміряти' }
  }
}

export async function runDiagnostics(): Promise<DiagResult> {
  const checks = await Promise.all([
    checkDiskSpace(),
    checkRam(),
    checkDefender(),
    checkFirewall(),
    checkPowerPlan(),
    checkTempSize(),
  ])

  let score = 100
  for (const c of checks) {
    if (c.status === 'error') score -= 20
    else if (c.status === 'warning') score -= 8
  }
  score = Math.max(0, score)

  return {
    score,
    checks,
    platform: process.platform,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalRam: os.totalmem(),
    uptime: os.uptime(),
  }
}