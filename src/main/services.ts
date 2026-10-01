// src/main/services.ts
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface ServiceInfo {
  name: string
  displayName: string
  status: string
  startType: string
}

export async function listServices(): Promise<ServiceInfo[]> {
  if (process.platform !== 'win32') return []
  try {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service | Select-Object Name, DisplayName, Status, StartType | ConvertTo-Csv -NoTypeInformation"')
    const lines = stdout.trim().split('\n').slice(1)
    const out: ServiceInfo[] = []
    for (const line of lines) {
      const cols = line.split('","').map((c) => c.replace(/^"|"$/g, ''))
      if (cols.length < 4) continue
      out.push({
        name: cols[0] ?? '',
        displayName: cols[1] ?? '',
        status: cols[2] ?? '',
        startType: cols[3] ?? '',
      })
    }
    return out
  } catch { return [] }
}

export async function setServiceStartType(name: string, startType: 'Automatic' | 'Manual' | 'Disabled'): Promise<void> {
  if (process.platform !== 'win32') return
  await execAsync(`powershell -NoProfile -Command "Set-Service -Name '${name}' -StartupType ${startType}"`)
}