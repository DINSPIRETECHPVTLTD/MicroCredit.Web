# Environment configuration (development, test, production)

Vite loads env files by **mode**. Required variable: `VITE_API_URL` (backend base URL, no trailing slash).

## Modes and when they are used

| Mode          | When it runs                    | Env files loaded (in order)        |
|---------------|----------------------------------|------------------------------------|
| **development** | `npm run dev`                   | `.env.development`, `.env`         |
| **production**  | `npm run build`                 | `.env.production`, `.env`         |
| **test**        | `npm run build:test` or `--mode test` | `.env.test`, `.env`         |

Later files override earlier ones. Variables must start with `VITE_` to be exposed to the app.

## Setup

1. **First-time / missing files**  
   Running `npm run dev` or `npm run build` copies `.env.*.example` to `.env.*` if the target file does not exist.

2. **Per environment**
   - **Development** – Edit `.env` or `.env.development`. Example: `VITE_API_URL=https://localhost:7119`
   - **Test** – Edit `.env.test` (or set in CI). Example: `VITE_API_URL=https://test-api.example.com`
   - **Production** – Edit `.env.production` or set `VITE_API_URL` in your CI/CD before `npm run build`

3. **Restart** the dev server after changing any `.env*` file.

## File roles

- **`.env`** – Fallback for all modes. Created from `.env.example` if missing.
- **`.env.development`** – Used by `npm run dev`. Created from `.env.development.example` if missing.
- **`.env.test`** – Used by `npm run build:test`. Created from `.env.test.example` if missing.
- **`.env.production`** – Used by `npm run build`. Created from `.env.production.example` if missing.
- **`.env.local`** – Local overrides (optional). Not committed; add to `.gitignore` if you use it.

## Commands

```bash
npm run dev          # Development server (uses .env.development / .env)
npm run build        # Production build (uses .env.production / .env)
npm run build:dev    # Build with development env (uses .env.development / .env)
npm run build:test   # Build with test env (uses .env.test / .env)
```
