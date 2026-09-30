# 🚀 HikeClean

> **High-performance open-source system cleaner & performance optimizer.**  
> Built with Electron, React, and TypeScript. No ads, no telemetry — just fast, secure, and free forever.

![Electron](https://img.shields.io/badge/Electron-30-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- 🧹 **Deep Cleaning** — System cache, temp files, browser data, and app leftovers.
- 🛡️ **Malware Scanner** — VirusTotal API integration + heuristic analysis.
- 📊 **Real-time Monitoring** — CPU, RAM, Disk, and Network charts at 60 FPS.
- ⏰ **Smart Scheduler** — Cron-based automated cleaning tasks.
- 💾 **Backup System** — Create and restore backups before cleaning.
- 🛠️ **Custom Rules** — Create your own cleaning rules via UI without code.
- 🌍 **Multi-language** — Ukrainian, English, German, French, Spanish.
- 🔒 **Privacy-first** — No ads, no telemetry, no forced accounts.

## ⚡ Performance Optimizations

HikeClean is built with speed in mind:

- **Canvas Rendering** — Chart.js renders 100k+ data points smoothly.
- **IPC Batching** — `requestAnimationFrame` batches updates to prevent CPU drain.
- **Code Splitting** — Vite + React.lazy for instant startup.
- **Ring Buffers** — Memory-safe history tracking (never exceeds limits).
- **LRU Cache** — Avoids re-hashing scanned files.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Core | Electron 30, TypeScript 5.4 |
| UI | React 18, Tailwind CSS, framer-motion |
| Charts | Chart.js 4 (Canvas) |
| State | Zustand |
| Build | electron-vite, electron-builder |
| Testing | Vitest |

## 📦 Installation

### Download Pre-built Binaries
Check the [Releases](https://github.com/MARSmm0/hikeclean/releases) page for Windows (.exe), macOS (.dmg), and Linux (.AppImage/.deb) builds.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/MARSmm0/hikeclean.git
cd hikeclean

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
