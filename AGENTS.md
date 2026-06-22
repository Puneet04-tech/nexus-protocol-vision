# AGENTS.md

## Project

Nexus Protocol Vision — a React 18 + TypeScript + Vite SPA visualizing a decentralized AI infrastructure concept. No backend; the "core/" modules are TypeScript class implementations, not a running service.

## Commands

```bash
npm run dev          # Vite dev server at http://localhost:3000
npm run build        # Production build
npm run preview      # Preview production build
npx tsc --noEmit     # Type checking only (no ESLint configured)
```

No test runner, linter, or formatter is configured. There are no test files.

## Commit Conventions

**Conventional Commits** enforced by Husky + commitlint:

```
<type>(<scope>): <subject>
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.
Use `npm run commit` for interactive commit (Commitizen) or `git commit` directly (commitlint validates).

## Architecture

- **Entrypoint**: `index.html` → `index.tsx` → `App.tsx`
- **Routing**: React Router v7 — `App.tsx` defines all routes; each page is in `pages/`
- **State**: Context providers only (6 contexts in `contexts/`); no Redux/Zustand
- **Styling**: Tailwind CSS loaded via CDN (`index.html`) — **no tailwind.config**, no PostCSS config. Utility classes only.
- **Icons**: Custom SVG components in `components/icons/`
- **Path alias**: `@/` maps to project root (tsconfig + vite config)
- **Google Gemini API**: Key loaded from `.env.local` as `GEMINI_API_KEY`, injected via `vite.config.ts` define as `process.env.GEMINI_API_KEY`

## Available Skills

Skills in `.agents/skills/` — invoke with `/skill-name`:

| Skill | What it does in this repo |
|---|---|
| `seo-audit` | Audits meta tags, page speed, and indexing issues for the SPA's pages |
| `tailwind-design-system` | Builds consistent component patterns using the CDN-loaded Tailwind utility classes |
| `typescript-advanced-types` | Adds generics, mapped types, and utility types to the TypeScript codebase |
| `vercel-composition-patterns` | Refactors React components to avoid boolean prop sprawl using compound component patterns |
| `vercel-react-best-practices` | Reviews and fixes React performance issues — memoization, re-renders, bundle size |
| `wcag-audit-patterns` | Audits and fixes WCAG 2.2 accessibility violations across the UI components |

## Key Quirks

- **Tailwind via CDN** — no build-time processing, no config file. New utility classes just work. No JIT customization available.
- **framer-motion.d.ts** — A custom ambient module declaration exists at root to fix type errors from the local `.d.ts` shadowing the package. If you see framer-motion type errors, check this file first.
- **No eslint/prettier config** — code style is enforced only by commitlint on commit messages, not on code formatting.
- **Dual context providers** — Both `index.tsx` and `App.tsx` wrap with the same context providers. The `index.tsx` providers are redundant (App.tsx re-wraps); when adding a new context, add it in `App.tsx` only.
- **ESM modules** — `"type": "module"` in package.json. `vite.config.ts` uses `import` syntax. Commitlint config is `.commitlintrc.cjs` (CJS) specifically for this reason.
- **`core/` is not imported by the UI** — It contains standalone TypeScript implementations (7 modules). The pages contain their own inline demo logic. If you need to wire core modules to the UI, you'll need to add imports.
