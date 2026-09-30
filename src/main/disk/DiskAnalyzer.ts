// src/main/disk/DiskAnalyzer.ts
import fs from 'node:fs/promises'
import path from 'node:path'

export interface DiskEntry {
  name: string
  path: string
  size: number
  isDir: boolean
  children?: DiskEntry[]
}

export class DiskAnalyzer {
  async analyze(root: string, maxDepth = 3): Promise<DiskEntry> {
    return this.walk(root, 0, maxDepth)
  }

  private async walk(dir: string, depth: number, maxDepth: number): Promise<DiskEntry> {
    const stat = await fs.stat(dir).catch(() => null)
    if (!stat) {
      return { name: path.basename(dir) || dir, path: dir, size: 0, isDir: true, children: [] }
    }

    if (!stat.isDirectory()) {
      return { name: path.basename(dir), path: dir, size: stat.size, isDir: false }
    }

    if (depth >= maxDepth) {
      return { name: path.basename(dir) || dir, path: dir, size: 0, isDir: true, children: [] }
    }

    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    const children: DiskEntry[] = []
    let total = 0

    for (const e of entries) {
      if (e.name.startsWith('.') && depth > 0) continue
      const full = path.join(dir, e.name)
      const child = await this.walk(full, depth + 1, maxDepth)
      total += child.size
      children.push(child)
    }

    children.sort((a, b) => b.size - a.size)
    return { name: path.basename(dir) || dir, path: dir, size: total, isDir: true, children }
  }
}