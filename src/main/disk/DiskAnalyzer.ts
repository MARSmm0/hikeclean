// src/main/disk/DiskAnalyzer.ts
import fs from 'node:fs/promises'
import path from 'node:path'

export interface DiskEntry {
  name: string
  path: string
  size: number
  isDir: boolean
  fileCount: number
  ext?: string
  color?: string
  isSystem?: boolean
  children?: DiskEntry[]
}

export interface DiskScanResult {
  root: DiskEntry
  totalFiles: number
  totalBytes: number
  byExt: Array<{ ext: string; bytes: number; count: number; color: string }>
  topFiles: Array<{ path: string; name: string; size: number; ext: string; color: string; isSystem: boolean }>
}

export function extColor(ext: string): string {
  const e = ext.toLowerCase()
  if (['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'].includes(e)) return '#ff453a'
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'].includes(e)) return '#ff9f0a'
  if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(e)) return '#bf5af2'
  if (['.zip', '.rar', '.7z', '.tar', '.gz', '.iso'].includes(e)) return '#30d158'
  if (['.exe', '.msi', '.dll', '.sys', '.drv', '.so', '.dylib'].includes(e)) return '#0a84ff'
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md'].includes(e)) return '#64d2ff'
  if (['.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.json', '.xml', '.py', '.java', '.cpp', '.c', '.h'].includes(e)) return '#ffd60a'
  if (['.log', '.tmp', '.cache'].includes(e)) return '#8e8e93'
  return '#5e5ce6'
}

const SYSTEM_PATH_MARKERS = [
  '\\windows\\',
  '/windows/',
  '\\program files\\',
  '/program files/',
  '\\program files (x86)\\',
  '\\programdata\\',
  '/programdata/',
  '/etc/',
  '/usr/',
  '/var/',
  '/system/',
  '/library/',
]

const SYSTEM_EXTENSIONS = new Set(['.sys', '.drv', '.dll', '.ocx', '.cpl', '.msi', '.msu'])
const SYSTEM_NAMES = new Set([
  'pagefile.sys', 'hiberfil.sys', 'swapfile.sys', 'bootmgr',
  'bootnxt', 'bcd', 'ntldr', 'ntdetect.com', 'boot.ini',
  'desktop.ini', 'thumbs.db', 'autorun.inf',
])

function isSystemItem(name: string, fullPath: string, isDir: boolean): boolean {
  const lower = fullPath.toLowerCase()
  for (const marker of SYSTEM_PATH_MARKERS) {
    if (lower.includes(marker)) return true
  }
  if (name.startsWith('.')) return true
  if (name.startsWith('$')) return true
  const ext = path.extname(name).toLowerCase()
  if (SYSTEM_EXTENSIONS.has(ext)) return true
  if (SYSTEM_NAMES.has(name.toLowerCase())) return true
  if (isDir && ['windows', 'system32', 'syswow64', 'winsxs', 'drivers', 'config'].includes(name.toLowerCase())) return true
  return false
}

export class DiskAnalyzer {
  async analyze(root: string, maxDepth = 6): Promise<DiskScanResult> {
    const extMap = new Map<string, { bytes: number; count: number }>()
    const topFiles: DiskScanResult['topFiles'] = []
    let totalFiles = 0
    let totalBytes = 0

    const walk = async (dir: string, depth: number): Promise<DiskEntry> => {
      const stat = await fs.stat(dir).catch(() => null)
      if (!stat) {
        return {
          name: path.basename(dir) || dir,
          path: dir,
          size: 0,
          isDir: true,
          fileCount: 0,
          isSystem: isSystemItem(path.basename(dir) || dir, dir, true),
          children: [],
        }
      }

      if (!stat.isDirectory()) {
        const ext = path.extname(dir).toLowerCase() || ''
        const sys = isSystemItem(path.basename(dir), dir, false)
        return {
          name: path.basename(dir),
          path: dir,
          size: stat.size,
          isDir: false,
          fileCount: 1,
          ext,
          color: extColor(ext),
          isSystem: sys,
        }
      }

      if (depth >= maxDepth) {
        return {
          name: path.basename(dir) || dir,
          path: dir,
          size: 0,
          isDir: true,
          fileCount: 0,
          isSystem: isSystemItem(path.basename(dir) || dir, dir, true),
          children: [],
        }
      }

      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
      const children: DiskEntry[] = []
      let size = 0
      let files = 0

      for (const e of entries) {
        const full = path.join(dir, e.name)

        if (e.isFile()) {
          const s = await fs.stat(full).catch(() => null)
          if (!s) continue
          const ext = path.extname(e.name).toLowerCase() || '(без розширення)'
          const color = extColor(ext)
          const sys = isSystemItem(e.name, full, false)

          size += s.size
          files += 1
          totalFiles += 1
          totalBytes += s.size

          const rec = extMap.get(ext) ?? { bytes: 0, count: 0 }
          rec.bytes += s.size
          rec.count += 1
          extMap.set(ext, rec)

          topFiles.push({ path: full, name: e.name, size: s.size, ext, color, isSystem: sys })

          children.push({
            name: e.name,
            path: full,
            size: s.size,
            isDir: false,
            fileCount: 1,
            ext,
            color,
            isSystem: sys,
          })
        } else if (e.isDirectory()) {
          const child = await walk(full, depth + 1)
          size += child.size
          files += child.fileCount
          children.push(child)
        }
      }

      children.sort((a, b) => b.size - a.size)

      return {
        name: path.basename(dir) || dir,
        path: dir,
        size,
        isDir: true,
        fileCount: files,
        isSystem: isSystemItem(path.basename(dir) || dir, dir, true),
        children,
      }
    }

    const rootEntry = await walk(root, 0)
    topFiles.sort((a, b) => b.size - a.size)

    const byExt = Array.from(extMap.entries())
      .map(([ext, v]) => ({ ext, bytes: v.bytes, count: v.count, color: extColor(ext) }))
      .sort((a, b) => b.bytes - a.bytes)

    return {
      root: rootEntry,
      totalFiles,
      totalBytes,
      byExt,
      topFiles: topFiles.slice(0, 100),
    }
  }
}