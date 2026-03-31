import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * date-fns v4 on some installs only ships `index.cjs` while `exports.import` points at missing `index.js`,
 * which breaks Vite/Rollup resolution. Point the package id at the CJS entry when that happens.
 */
function dateFnsBrokenInstallAlias(): Record<string, string> {
  const root = path.join(__dirname, 'node_modules', 'date-fns')
  const esm = path.join(root, 'index.js')
  const cjs = path.join(root, 'index.cjs')
  if (fs.existsSync(root) && !fs.existsSync(esm) && fs.existsSync(cjs)) {
    return { 'date-fns': cjs }
  }
  return {}
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...dateFnsBrokenInstallAlias(),
    },
  },
})
