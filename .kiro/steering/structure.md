---
inclusion: always
---

# Project Structure

## Directory Layout

| Directory | Purpose |
|-----------|---------|
| `app/(admin)/dashboard/` | Admin routes (route group, URL excludes `(admin)`) |
| `app/api/admin/` | Protected admin API endpoints |
| `app/api/webhooks/` | External service webhooks (Clerk) |
| `app/[locale]/` | Public localized routes (`en`, `es`, `fr`, `th`) |
| `components/admin/` | Admin-only React components |
| `components/ui/` | shadcn/ui primitives (do not modify directly) |
| `components/*.tsx` | Public-facing components |
| `lib/admin/` | Admin business logic (CRUD operations) |
| `lib/auth/` | Clerk helpers and role guards |
| `lib/cache/` | Redis caching utilities |
| `lib/config/` | Environment and feature configuration |
| `lib/db/` | Prisma client singleton |
| `lib/generated/prisma/` | Auto-generated Prisma client (do not edit) |
| `lib/i18n/` | Internationalization utilities |
| `lib/media/` | ImageKit integration |
| `messages/` | Translation JSON files per locale |

## File Naming Conventions

- **Pages**: `page.tsx` in route directories
- **Layouts**: `layout.tsx` for shared UI wrappers
- **API Routes**: `route.ts` exporting HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`)
- **Client Components**: Add `'use client'` directive at top; suffix with `Client.tsx` for page-level client components
- **Tests**: Co-locate as `*.test.ts` alongside source files

## Code Organization Rules

1. **Server Components by default** - Only add `'use client'` when hooks or browser APIs are needed
2. **Business logic in `lib/`** - Keep route handlers thin; delegate to `lib/admin/*.ts`
3. **Barrel exports** - Use `index.ts` for clean imports: `import { x } from '@/lib/admin'`
4. **Prisma access** - Always import from `@/lib/db/prisma`, never instantiate directly
5. **Cache invalidation** - Call `lib/cache/posts.ts` functions after mutations
6. **Role guards** - Use `requireAdmin()` or `requireEditor()` from `lib/auth/roles.ts` in protected routes

## Route Patterns

| Pattern | Example | Use Case |
|---------|---------|----------|
| `(group)` | `(admin)` | Group routes without URL segment |
| `[param]` | `[slug]`, `[id]` | Dynamic route segment |
| `[[...param]]` | `[[...sign-in]]` | Optional catch-all (Clerk) |
| `[locale]` | `/en/blog/...` | Localized public routes |

## Adding New Features

- **New admin page**: Create in `app/(admin)/dashboard/{feature}/page.tsx`
- **New API endpoint**: Create `route.ts` in `app/api/admin/{feature}/`
- **New component**: Admin → `components/admin/`, Public → `components/`
- **New business logic**: Add to existing `lib/admin/*.ts` or create new module with barrel export
