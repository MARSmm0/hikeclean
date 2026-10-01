// src/main/monitor.ts
import os from 'node:os'
import { EventEmitter } from 'node:events'

export interface MonitorSnapshot {
  timestamp: number
  cpu: number
  ram: number
  ramUsed: number
  ramTotal: number
  load1: number
  load5: number
  load15: number
}

export class PerformanceMonitor extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private history: MonitorSnapshot[] = []
  private readonly MAX = 300
  private lastCpu = { idle: 0, total: 0 }

  start(intervalMs = 1000): void {
    this.stop()
    this.timer = setInterval(() => this.tick(), intervalMs)
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }

  isRunning(): boolean {
    return this.timer !== null
  }

  getHistory(): MonitorSnapshot[] {
    return this.history
  }

  clearHistory(): void {
    this.history = []
  }

  private tick(): void {
    const snap: MonitorSnapshot = {
      timestamp: Date.now(),
      cpu: this.getCpu(),
      ram: this.getRamPct(),
      ramUsed: os.totalmem() - os.freemem(),
      ramTotal: os.totalmem(),
      load1: os.loadavg()[0] ?? 0,
      load5: os.loadavg()[1] ?? 0,
      load15: os.loadavg()[2] ?? 0,
    }
    this.history.push(snap)
    if (this.history.length > this.MAX) this.history.shift()
    this.emit('tick', snap)
  }

  private getCpu(): number {
    const cpus = os.cpus()
    let idle = 0, total = 0
    for (const c of cpus) {
      for (const k of Object.keys(c.times) as Array<keyof typeof c.times>) {
        total += c.times[k]
      }
      idle += c.times.idle
    }
    if (this.lastCpu.total === 0) {
      this.lastCpu = { idle, total }
      return 0
    }
    const idleDiff = idle - this.lastCpu.idle
    const totalDiff = total - this.lastCpu.total
    this.lastCpu = { idle, total }
    return totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0
  }

  private getRamPct(): number {
    return ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
  }
}