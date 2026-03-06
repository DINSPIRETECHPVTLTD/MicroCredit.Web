#!/usr/bin/env node
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

const pairs = [
  [".env", ".env.example"],
  [".env.development", ".env.development.example"],
  [".env.test", ".env.test.example"],
  [".env.production", ".env.production.example"],
]

for (const [envFile, exampleFile] of pairs) {
  const envPath = path.join(root, envFile)
  const examplePath = path.join(root, exampleFile)
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath)
    console.log(`Created ${envFile} from ${exampleFile}`)
  }
}
