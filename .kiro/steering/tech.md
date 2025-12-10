---
inclusion: always
---

# Tech Stack

## Core Technologies
- **Next.js 16** (App Router, React 19) - Server Components by default
- **TypeScript** strict mode - All code must be type-safe
- **Bun** - Package manager and runtime (use `bun` not `npm`/`yarn`)

## Database
- **PostgreSQL** via Neon serverless
- **Prisma 7** with `@prisma/adapter-neon`
- Import client from `@/lib/db/prisma` only (never instantiate directly)
- Generated types at `lib/generated/prisma` (do not edit)

## Auth & Security
- **Clerk** - Auth provider
- Roles stored in `publicMetadata.role` (`admin` | `editor`)
- Use `requireAdmin()` / `requireEditor()` from `lib/auth/roles.ts`

## Caching
- **Upstash Redis** - Cache layer
- Invalidate via `lib/cache/posts.ts` after mutations

## Media
- **ImageKit** - Image storage and CDN
- Store `fileId` for deletion capability

## UI Stack
- **Tailwind CSS 4** with CSS variables
- **shadcn/ui** (new-york style) in `components/ui/` - do not modify directly
- **Radix UI** primitives, **Lucide React** icons
- **sonner** for toasts

## Key Patterns
- `next-intl` for i18n (locales: `en`, `es`, `fr`, `th`)
- `react-hook-form` + `zod` for forms - define schemas alongside components
- `date-fns` for date manipulation
- `recharts` for analytics visualizations

## Commands
```bash
bun dev                  # Dev server
bun build                # Production build
bun test                 # Run tests (vitest --run)
bun lint                 # ESLint
bunx prisma generate     # Regenerate Prisma client
bunx prisma db push      # Push schema changes
```

## Environment
Validated in `lib/config/env.ts`:
- `DATABASE_URL` - Neon connection string
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`
