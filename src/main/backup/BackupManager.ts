import fs from 'node:fs/promises'
import path from 'node:path'

export interface BackupMeta {
  id: string
  label: string
  createdAt: number
  files: string[]
}

export class BackupManager {
  private dir: string

  constructor(baseDir: string) {
    this.dir = path.join(baseDir, 'hike-backups')
  }

  async createBackup(files: string[], label: string): Promise<string> {
    await fs.mkdir(this.dir, { recursive: true })
    const id = `${Date.now()}-${label}`
    const backupPath = path.join(this.dir, id)
    await fs.mkdir(backupPath, { recursive: true })

    const saved: string[] = []
    for (const file of files) {
      try {
        const dest = path.join(backupPath, path.basename(file) + '-' + Date.now())
        await fs.copyFile(file, dest)
        saved.push(file)
      } catch { /* skip */ }
    }

    const meta: BackupMeta = { id, label, createdAt: Date.now(), files: saved }
    await fs.writeFile(path.join(backupPath, 'meta.json'), JSON.stringify(meta, null, 2))
    return id
  }

  async listBackups(): Promise<BackupMeta[]> {
    try {
      await fs.mkdir(this.dir, { recursive: true })
      const dirs = await fs.readdir(this.dir)
      const out: BackupMeta[] = []
      for (const d of dirs) {
        try {
          const meta = JSON.parse(await fs.readFile(path.join(this.dir, d, 'meta.json'), 'utf-8')) as BackupMeta
          out.push(meta)
        } catch { /* skip */ }
      }
      return out.sort((a, b) => b.createdAt - a.createdAt)
    } catch { return [] }
  }

  async deleteBackup(id: string): Promise<void> {
    await fs.rm(path.join(this.dir, id), { recursive: true, force: true })
  }

  async restoreBackup(id: string): Promise<void> {
    const backupPath = path.join(this.dir, id)
    const meta = JSON.parse(await fs.readFile(path.join(backupPath, 'meta.json'), 'utf-8')) as BackupMeta
    for (const original of meta.files) {
      const base = path.basename(original)
      const backupDir = await fs.readdir(backupPath)
      const match = backupDir.find((f) => f.startsWith(base + '-'))
      if (match) {
        try { await fs.copyFile(path.join(backupPath, match), original) } catch { /* skip */ }
      }
    }
  }
}