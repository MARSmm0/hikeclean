// src/main/network.ts
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface NetworkActionResult {
  ok: boolean
  message: string
}

export async function flushDns(): Promise<NetworkActionResult> {
  try {
    if (process.platform === 'win32') {
      await execAsync('ipconfig /flushdns')
    } else if (process.platform === 'darwin') {
      await execAsync('sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder')
    } else {
      await execAsync('sudo systemd-resolve --flush-caches || sudo resolvectl flush-caches')
    }
    return { ok: true, message: 'DNS-кеш очищено' }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
}

export async function resetNetwork(): Promise<NetworkActionResult> {
  if (process.platform !== 'win32') return { ok: false, message: 'Тільки для Windows' }
  try {
    await execAsync('netsh winsock reset')
    await execAsync('netsh int ip reset')
    return { ok: true, message: 'Мережу скинуто. Потрібен перезапуск системи.' }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
}

export async function releaseRenew(): Promise<NetworkActionResult> {
  if (process.platform !== 'win32') return { ok: false, message: 'Тільки для Windows' }
  try {
    await execAsync('ipconfig /release')
    await execAsync('ipconfig /renew')
    return { ok: true, message: 'IP-адресу оновлено' }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
}