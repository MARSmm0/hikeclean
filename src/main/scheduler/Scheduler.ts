// src/main/scheduler/Scheduler.ts
import { EventEmitter } from 'node:events'

export interface ScheduledTask {
  id: string
  name: string
  cronExpression: string
  action: 'scan' | 'clean' | 'boost'
  enabled: boolean
}

export class Scheduler extends EventEmitter {
  private timers = new Map<string, NodeJS.Timeout>()
  private tasks: ScheduledTask[] = []

  load(tasks: ScheduledTask[]): void {
    this.stopAll()
    this.tasks = tasks
    for (const t of tasks) if (t.enabled) this.schedule(t)
  }

  addTask(t: ScheduledTask): void {
    this.tasks.push(t)
    if (t.enabled) this.schedule(t)
  }

  removeTask(id: string): void {
    const t = this.timers.get(id)
    if (t) clearInterval(t)
    this.timers.delete(id)
    this.tasks = this.tasks.filter((x) => x.id !== id)
  }

  getTasks(): ScheduledTask[] {
    return this.tasks
  }

  stopAll(): void {
    for (const t of this.timers.values()) clearInterval(t)
    this.timers.clear()
  }

  private schedule(t: ScheduledTask): void {
    const ms = this.cronToMs(t.cronExpression)
    if (!ms) return
    const timer = setInterval(() => this.emit('task', t), ms)
    this.timers.set(t.id, timer)
  }

  // Простий парсер: "0 3 * * *" → наступна 3:00
  private cronToMs(expr: string): number | null {
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) return null

    const min = parts[0] as string
    const hour = parts[1] as string
    const dom = parts[2] as string
    const month = parts[3] as string
    const dow = parts[4] as string

    if (dom === '*' && month === '*' && dow === '*') {
      const m = parseInt(min, 10)
      const h = parseInt(hour, 10)
      if (isNaN(m) || isNaN(h)) return null

      const now = new Date()
      const next = new Date(now)
      next.setHours(h, m, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return Math.max(60_000, next.getTime() - now.getTime())
    }

    return 24 * 60 * 60 * 1000
  }
}