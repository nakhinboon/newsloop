---
inclusion: always
---

# NewsLoop Product Guide

NewsLoop is a multilingual blog/CMS with public-facing content and an admin dashboard.

## Domain Model

- **Post**: Content with title, slug, body (HTML), excerpt, cover image, status, locale, scheduled date
- **Category**: Hierarchical taxonomy (supports parent-child relationships)
- **Tag**: Flat taxonomy for cross-cutting topics
- **Media**: Images stored in ImageKit, organized in folders, linked to posts
- **User**: Clerk-managed with role in `publicMetadata.role`

## Post Lifecycle

`draft` → `scheduled` (optional) → `published`

- Draft posts are only visible in admin
- Scheduled posts auto-publish via `/api/cron` endpoint
- Published posts appear on public site

## Localization

Supported locales: `en`, `es`, `fr`, `th`

- Posts have a `locale` field determining which locale route displays them
- Public routes use `[locale]` dynamic segment
- Translations stored in `messages/{locale}.json`

## Authorization Rules

| Role   | Permissions                                      |
|--------|--------------------------------------------------|
| Admin  | Full access including user management            |
| Editor | Posts, media, categories, tags (no user mgmt)    |

Use `requireAdmin()` or `requireEditor()` from `lib/auth/roles.ts` for route protection.

## URL Patterns

| Route                        | Purpose                    |
|------------------------------|----------------------------|
| `/dashboard/*`               | Admin routes               |
| `/[locale]/blog/[slug]`      | Public post page           |
| `/[locale]/category/[slug]`  | Category listing           |
| `/[locale]/tag/[slug]`       | Tag listing                |
| `/[locale]/search`           | Search results             |
| `/api/admin/*`               | Admin API endpoints        |

## Implementation Guidelines

- All admin operations go through `lib/admin/*.ts` modules
- Use Prisma client from `lib/db/prisma.ts` (singleton)
- Cache invalidation via `lib/cache/posts.ts` after mutations
- Media uploads return ImageKit URLs; store `fileId` for deletion
- Form validation uses Zod schemas; define alongside form components
