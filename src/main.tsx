import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import { getViteApiUrl, getViteApiUrlDebug, VITE_API_URL_REQUIRED_MESSAGE } from '@/lib/env-check'
import { hydrateAuth, getToken } from '@/services/auth.service'
import './index.css'
import App from './App.tsx'

const apiUrl = getViteApiUrl()

if (!apiUrl) {
  const debugValue = getViteApiUrlDebug()
  createRoot(document.getElementById('root')!).render(
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        background: '#fafafa',
        color: '#171717',
      }}
    >
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Configuration required
        </h1>
        <p style={{ fontSize: 14, color: '#525252', lineHeight: 1.5 }}>
          {VITE_API_URL_REQUIRED_MESSAGE}
        </p>
        <p style={{ fontSize: 12, color: '#737373', marginTop: 12, fontFamily: 'monospace' }}>
          Value received: {debugValue}
        </p>
        <ul style={{ fontSize: 13, color: '#525252', lineHeight: 1.7, marginTop: 16, textAlign: 'left', paddingLeft: 20 }}>
          <li>Vite loads <strong>.env</strong> only — not <code>.env.example</code>. Copy <code>.env.example</code> to <code>.env</code> in the project root if you have not.</li>
          <li>Restart the dev server after creating or editing <code>.env</code> (e.g. stop and run <code>npm run dev</code> again).</li>
          <li>Use a line like <code>VITE_API_URL=https://your-api-url</code> with no spaces around <code>=</code>.</li>
        </ul>
      </div>
    </div>,
  )
} else {
  hydrateAuth()

  axios.interceptors.request.use((config) => {
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  const queryClient = new QueryClient()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </StrictMode>,
  )
}
