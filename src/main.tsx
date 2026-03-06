import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import { getViteApiUrl, VITE_API_URL_REQUIRED_MESSAGE } from '@/lib/env-check'
import { hydrateAuth, getToken } from '@/services/auth.service'
import './index.css'
import App from './App.tsx'

const apiUrl = getViteApiUrl()

if (!apiUrl) {
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
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Configuration required
        </h1>
        <p style={{ fontSize: 14, color: '#525252', lineHeight: 1.5 }}>
          {VITE_API_URL_REQUIRED_MESSAGE}
        </p>
        <p style={{ fontSize: 13, color: '#737373', marginTop: 16 }}>
          Create a <code style={{ background: '#e5e5e5', padding: '2px 6px', borderRadius: 4 }}>.env</code> file in the project root with <code style={{ background: '#e5e5e5', padding: '2px 6px', borderRadius: 4 }}>VITE_API_URL=https://your-api-url</code>.
        </p>
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
