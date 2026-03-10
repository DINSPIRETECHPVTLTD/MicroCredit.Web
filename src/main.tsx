import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'

import { getViteApiUrl, getViteApiUrlDebug, VITE_API_URL_REQUIRED_MESSAGE } from '@/lib/env-check'
import { hydrateAuth, getToken } from '@/services/auth.service'

import './index.css'
import './styles/theme.css'

import App from './App.tsx'

const apiUrl = getViteApiUrl()

if (!apiUrl) {
  const debugValue = getViteApiUrlDebug()

  createRoot(document.getElementById('root')!).render(
    <div className="config-error-container">
      <div className="config-error-content">
        <h1 className="config-error-title">
          Configuration required
        </h1>

        <p className="config-error-text">
          {VITE_API_URL_REQUIRED_MESSAGE}
        </p>

        <p className="config-error-mono">
          Value received: {debugValue}
        </p>

        <ul className="config-error-list">
          <li>
            Vite loads <strong>.env</strong> only — not <code>.env.example</code>.  
            Copy <code>.env.example</code> to <code>.env</code> in the project root if you have not.
          </li>

          <li>
            Restart the dev server after creating or editing <code>.env</code>  
            (stop and run <code>npm run dev</code> again).
          </li>

          <li>
            Use a line like <code>VITE_API_URL=https://your-api-url</code>  
            with no spaces around <code>=</code>.
          </li>
        </ul>
      </div>
    </div>,
  )
} else {
  hydrateAuth()

  axios.interceptors.request.use((config) => {
    const token = getToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </StrictMode>,
  )
}