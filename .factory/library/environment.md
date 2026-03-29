# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---
## Key Dependencies
- React 19 + ReactDOM 19
- TypeScript 5.x
- Tailwind CSS v4 (via @tailwindcss/vite plugin, NO tailwind.config.js)
- shadcn/ui (source components in src/components/ui/)
- Zustand (state management for promotion page)
- React Hook Form + Zod (form validation)
- lucide-react (icons, replaces custom SVG functions)
- cmdk (required by shadcn Command component, used for searchable template selector)
- jszip (already installed, for ZIP packaging)
- @tauri-apps/api (Tauri desktop integration)

## Build Toolchain
- Vite 7.x with @vitejs/plugin-react and @tailwindcss/vite
- Path aliases: @/ → src/
- TypeScript strict mode
- **Version compatibility:** @vitejs/plugin-react@6 requires vite@8; use @vitejs/plugin-react@5 for vite@7. @tailwindcss/vite@4.2+ is needed for vite@7 compatibility (4.1.x only supports vite ^5 || ^6)

## Platform Notes
- App runs as both web app (port 8080) and Tauri desktop app
- Tauri config in src-tauri/tauri.conf.json points to frontendDist: "../dist"
- Multi-page build being replaced by SPA with React Router
- No environment variables needed (all data is local: localStorage + IndexedDB)
