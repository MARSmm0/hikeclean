// src/main/systemInfo.ts
import os from 'node:os'
import si from 'systeminformation'

export interface ExtendedStats {
  cpu: number
  ramUsed: number
  ramTotal: number
  diskUsed: number
  diskTotal: number
  diskPercent: number
  netRx: number
  netTx: number
  uptime: number
  hostname: string
  platform: string
}

export interface DriveInfo {
  letter: string
  path: string
  totalSize: number
  freeSpace: number
  usedPercent: number
}

export async function getExtendedStats(): Promise<ExtendedStats> {
  const [load, mem, fsSize, netStats] = await Promise.all([
    si.currentLoad().catch(() => ({ currentLoad: 0 })),
    si.mem().catch(() => ({ active: 0, total: 0 })),
    si.fsSize().catch(() => []),
    si.networkStats().catch(() => []),
  ])
  const main = fsSize[0]
  const net = netStats[0]
  return {
    cpu: load.currentLoad,
    ramUsed: mem.active,
    ramTotal: mem.total,
    diskUsed: main?.used ?? 0,
    diskTotal: main?.size ?? 0,
    diskPercent: main?.use ?? 0,
    netRx: net?.rx_bytes ?? 0,
    netTx: net?.tx_bytes ?? 0,
    uptime: os.uptime(),
    hostname: os.hostname(),
    platform: os.platform(),
  }
}

export async function listDrives(): Promise<DriveInfo[]> {
  const fsSize = await si.fsSize().catch(() => [])
  return fsSize.map((fs) => {
    const isWin = process.platform === 'win32'
    let p = fs.mount
    if (isWin && !p.endsWith('\\')) p = p + '\\'
    return {
      letter: isWin ? fs.mount.replace(/\\/g, '') : fs.mount,
      path: p,
      totalSize: fs.size,
      freeSpace: fs.available,
      usedPercent: fs.use,
    }
  })
}