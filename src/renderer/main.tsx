// src/renderer/main.tsx
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './theme/ThemeProvider'
import { ToastProvider } from './components/ui/Toast'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <ThemeProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </ThemeProvider>
)