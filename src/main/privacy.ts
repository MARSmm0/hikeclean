// src/main/privacy.ts
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export interface PrivacyCategory {
  id: string
  name: string
  paths: string[]
  bytes: number
}

const HOME = os.homedir()

function browserPaths(): Record<string, string[]> {
  const local = process.env.LOCALAPPDATA ?? path.join(HOME, 'AppData', 'Local')
  const roaming = process.env.APPDATA ?? path.join(HOME, 'AppData', 'Roaming')
  return {
    'Chrome – історія': [path.join(local, 'Google', 'Chrome', 'User Data', 'Default', 'History')],
    'Chrome – cookies': [path.join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Cookies')],
    'Edge – історія': [path.join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'History')],
    'Edge – cookies': [path.join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cookies')],
    'Firefox – профілі': [path.join(roaming, 'Mozilla', 'Firefox', 'Profiles')],
    'Brave – історія': [path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'History')],
    'Opera – кеш': [path.join(roaming, 'Opera Software', 'Opera Stable', 'Cache')],
  }
}

async function fileSize(p: string): Promise<number> {
  try {
    const stat = await fs.stat(p)
    if (stat.isFile()) return stat.size
    if (stat.isDirectory()) {
      const entries = await fs.readdir(p, { withFileTypes: true })
      let total = 0
      for (const e of entries) total += await fileSize(path.join(p, e.name))
      return total
    }
    return 0
  } catch { return 0 }
}

export async function scanPrivacy(): Promise<PrivacyCategory[]> {
  const map = browserPaths()
  const out: PrivacyCategory[] = []
  let i = 0
  for (const [name, paths] of Object.entries(map)) {
    let total = 0
    for (const p of paths) total += await fileSize(p)
    if (total > 0) out.push({ id: `priv-${i++}`, name, paths, bytes: total })
  }
  return out
}

export async function cleanPrivacy(ids: string[]): Promise<{ freed: number; failed: number }> {
  const all = await scanPrivacy()
  const targets = all.filter((c) => ids.includes(c.id))
  let freed = 0, failed = 0
  for (const cat of targets) {
    for (const p of cat.paths) {
      try {
        await fs.rm(p, { recursive: true, force: true })
        freed += cat.bytes / cat.paths.length
      } catch { failed++ }
    }
  }
  return { freed, failed }
}