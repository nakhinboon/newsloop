# Implementation Plan

- [x] 1. Set up project foundation and dependencies
  - [x] 1.1 Install required dependencies
    - Install utilities: `reading-time`, `sanitize-html`
    - Install testing: `vitest`, `@testing-library/react`, `fast-check`
    - Install i18n: `next-intl`
    - _Requirements: 2.1, 5.1_

  - [x] 1.2 Configure Next.js for i18n
    - Configure i18n routing with locale prefixes
    - Set up middleware for locale detection
    - _Requirements: 9.1, 11.1_

  - [x] 1.3 Create TypeScript type definitions
    - Define `Post`, `PostPreview`, `Author` interfaces in `lib/types.ts`
    - Define `Locale`, `LocalizedPost`, `LocalePreference` interfaces
    - Define `SearchResult`, `Category`, `Tag` interfaces
    - _Requirements: 5.1, 10.1_

- [x] 2. Implement i18n infrastructure
  - [x] 2.1 Create locale configuration and detection
    - Create `lib/i18n/config.ts` with supported locales and defaults
    - Implement `lib/i18n/detection.ts` for browser header parsing
    - Create locale detection middleware in `middleware.ts`
    - _Requirements: 9.1, 9.2_

  - [x] 2.2 Write property test for locale detection






    - **Property 14: Locale detection priority**
    - **Validates: Requirements 9.1**

  - [x] 2.3 Implement locale preference persistence
    - Create cookie-based locale storage
    - Implement preference override logic
    - _Requirements: 9.3_

  - [x] 2.4 Write property test for locale persistence






    - **Property 15: Locale preference persistence**
    - **Validates: Requirements 9.3**

  - [x] 2.5 Create UI translation system
    - Create `messages/en.json`, `messages/es.json`, `messages/fr.json`, `messages/th.json`
    - Implement translation helper function `t(key, locale)`
    - _Requirements: 9.2_

- [x] 3. Implement data layer (Post Service from Database)
  - [x] 3.1 Create post fetching functions
    - Implement `getAllPosts()` with date sorting in `lib/posts.ts`
    - Implement `getPostBySlug()` for single post retrieval
    - Implement `getPostBySlugAndLocale()` for localized posts
    - Calculate reading time based on word count
    - _Requirements: 1.1, 2.2, 9.4_

  - [x] 3.2 Write property test for post ordering






    - **Property 1: Post ordering by date**
    - **Validates: Requirements 1.1**

  - [x] 3.3 Implement slug generation
    - Create `generateSlug()` function from post titles
    - Handle special characters, unicode, whitespace
    - _Requirements: 6.4_

  - [x] 3.4 Write property test for slug generation






    - **Property 12: Slug generation**
    - **Validates: Requirements 6.4**

  - [x] 3.5 Implement locale fallback logic
    - Create `getFallbackPost()` for missing locale versions
    - Return fallback flag with post data
    - _Requirements: 9.4, 9.5_

  - [x] 3.6 Write property test for locale fallback






    - **Property 17: Locale fallback consistency**
    - **Validates: Requirements 9.4, 9.5**

  - [x] 3.7 Implement filtering functions
    - Create `getPostsByCategory()` function
    - Create `getPostsByTag()` function
    - Create `getAllCategories()` and `getAllTags()` functions
    - _Requirements: 3.1, 3.2_

  - [x] 3.8 Write property tests for filtering






    - **Property 6: Category filtering**
    - **Property 7: Tag filtering**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 3.9 Implement related posts function
    - Create `getRelatedPosts()` based on shared tags/category
    - _Requirements: 2.5_

  - [x] 3.10 Write property test for related posts






    - **Property 5: Related posts share taxonomy**
    - **Validates: Requirements 2.5**

- [x] 4. Implement search functionality
  - [x] 4.1 Create search engine
    - Implement `search()` function in `lib/search.ts`
    - Search across title, content, and tags
    - Handle empty/whitespace queries
    - _Requirements: 4.1, 4.3_

  - [x] 4.2 Write property tests for search






    - **Property 8: Search returns matching posts**
    - **Property 10: Empty search returns all posts**
    - **Validates: Requirements 4.1, 4.3**

  - [x] 4.3 Implement search highlighting
    - Create `highlightMatches()` function
    - Wrap matching terms in highlight markup
    - _Requirements: 4.2_

  - [x] 4.4 Write property test for search highlighting






    - **Property 9: Search highlighting**
    - **Validates: Requirements 4.2**

- [x] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build UI components
  - [x] 6.1 Create PostCard component
    - Display title, excerpt, author, date, category, reading time
    - Link to full post using slug
    - _Requirements: 1.2, 1.3_

  - [x] 6.2 Write property test for post preview fields






    - **Property 2: Post preview contains required fields**
    - **Validates: Requirements 1.2**

  - [x] 6.3 Create PostList and Pagination components
    - Implement paginated post list display
    - Create pagination controls with page navigation
    - _Requirements: 1.4_


  - [x] 6.4 Write property test for pagination logic





    - **Property 3: Pagination logic**
    - **Validates: Requirements 1.4**

  - [x] 6.5 Create PostHeader and PostContent components
    - Display full post metadata in header
    - Render HTML content safely with sanitization
    - _Requirements: 2.1, 2.2_

  - [x] 6.6 Write property test for HTML content rendering






    - **Property 4: HTML content rendering**
    - **Validates: Requirements 2.1, 5.2**

  - [x] 6.7 Create filter and search UI components
    - Build CategoryList and TagList components
    - Build SearchBar component with query input
    - Display active filters with clear option
    - _Requirements: 3.3, 4.1_

  - [x] 6.8 Create RelatedPosts component
    - Display related posts at end of post page
    - _Requirements: 2.5_

  - [x] 6.9 Create LocaleSwitcher component
    - Display available languages
    - Handle locale switching with preference persistence
    - _Requirements: 9.3, 11.3_

  - [x] 6.10 Create LocaleFallbackNotice component
    - Display notice when showing fallback language content
    - _Requirements: 9.5_

  - [x] 6.11 Create ThemeToggle component
    - Implement dark mode toggle
    - Respect system preference
    - _Requirements: 7.4_

- [x] 7. Build page routes
  - [x] 7.1 Create root layout with providers
    - Set up theme provider in `app/layout.tsx`
    - Configure fonts and global styles
    - _Requirements: 7.4_

  - [x] 7.2 Create locale layout
    - Set up `app/[locale]/layout.tsx` with locale context
    - Include navigation with LocaleSwitcher
    - _Requirements: 9.2, 11.1_

  - [x] 7.3 Create homepage
    - Implement `app/[locale]/page.tsx` with paginated post list
    - _Requirements: 1.1, 1.4_

  - [x] 7.4 Create blog post page
    - Implement `app/[locale]/blog/[slug]/page.tsx`
    - Render full post with header, content, related posts
    - Handle locale fallback with notice
    - _Requirements: 2.1, 2.2, 2.5, 9.4, 9.5_

  - [x] 7.5 Create category and tag filter pages
    - Implement `app/[locale]/category/[category]/page.tsx`
    - Implement `app/[locale]/tag/[tag]/page.tsx`
    - _Requirements: 3.1, 3.2_

  - [x] 7.6 Create search page
    - Implement `app/[locale]/search/page.tsx`
    - Display search results with highlighting
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 8. Implement SEO features
  - [x] 8.1 Configure metadata API
    - Set up page-level metadata with title, description, Open Graph
    - Generate dynamic metadata for post pages
    - _Requirements: 6.1_

  - [x] 8.2 Implement JSON-LD structured data
    - Generate Article schema for post pages
    - _Requirements: 6.2_

  - [x] 8.3 Implement hreflang tags
    - Add alternate language links to post pages
    - _Requirements: 10.3_

  - [x] 8.4 Write property test for hreflang completeness






    - **Property 18: Hreflang tag completeness**
    - **Validates: Requirements 10.3**

  - [x] 8.5 Create sitemap generator
    - Implement `app/sitemap.ts` with all post URLs
    - Include alternate language URLs
    - _Requirements: 6.3, 10.4_

  - [x] 8.6 Write property test for sitemap completeness






    - **Property 13: Sitemap completeness**
    - **Validates: Requirements 6.3, 10.4**

  - [x] 8.7 Write property test for locale URL structure






    - **Property 16: Locale URL structure**
    - **Validates: Requirements 11.1**

- [x] 9. Checkpoint - Frontend complete





  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement environment configuration and validation





  - [x] 10.1 Create environment validation module


    - Create `lib/config/env.ts` with environment variable validation
    - Implement `validateAll()` function that checks all required env vars
    - Implement `getMissingVars()` to return list of missing variables
    - Throw descriptive errors for missing or invalid configuration
    - _Requirements: 19.5_

  - [x] 10.2 Write property test for environment validation






    - **Property 30: Environment variable validation**
    - **Validates: Requirements 19.5**



  - [x] 10.3 Create database configuration module
    - Create `lib/config/database.ts` to read DATABASE_URL and DIRECT_URL
    - Validate connection string format
    - Export configuration for Prisma client
    - _Requirements: 19.1_

  - [x] 10.4 Write property test for database configuration






    - **Property 31: Database configuration from environment**
    - **Validates: Requirements 19.1, 19.6**

  - [x] 10.5 Create auth configuration module
    - Create `lib/config/auth.ts` to read Clerk environment variables
    - Validate all required Clerk keys are present
    - Export configuration for Clerk initialization
    - _Requirements: 19.2_


  - [x] 10.6 Write property test for auth configuration












    - **Property 32: Auth configuration from environment**
    - **Validates: Requirements 19.2, 19.7**

  - [x] 10.7 Create cache configuration module

    - Create `lib/config/cache.ts` to read Upstash Redis environment variables
    - Validate Redis URL and token are present
    - Export configuration for Redis client
    - _Requirements: 19.3_

  - [x] 10.8 Write property test for cache configuration







    - **Property 33: Cache configuration from environment**
    - **Validates: Requirements 19.3, 19.8**



  - [x] 10.9 Create media configuration module
    - Create `lib/config/media.ts` to read ImageKit environment variables
    - Validate all ImageKit credentials are present
    - Export configuration for ImageKit client
    - _Requirements: 19.4_

  - [x] 10.10 Write property test for media configuration






    - **Property 34: Media configuration from environment**
    - **Validates: Requirements 19.4, 19.9**


- [x] 11. Set up database, caching, and authentication services





  - [x] 11.1 Install backend dependencies


    - Install Prisma ORM: `prisma`, `@prisma/client`
    - Install Clerk: `@clerk/nextjs`
    - Install Neon serverless driver: `@neondatabase/serverless`
    - Install Upstash Redis: `@upstash/redis`
    - Install ImageKit: `imagekitio-next` for image management
    - Install TinyMCE editor: `@tinymce/tinymce-react`
    - Install recharts for analytics charts
    - _Requirements: 12.1, 13.3, 17.2, 14.1_

  - [x] 11.2 Configure Neon database using environment config


    - Use `lib/config/database.ts` for connection strings
    - Configure Prisma to use Neon PostgreSQL with `@neondatabase/serverless` adapter
    - Define Prisma schema with Post, Category, Tag, Media, PageView models
    - Generate Prisma client and run migrations
    - _Requirements: 13.3, 16.2, 17.1, 19.1, 19.6_

  - [x] 11.3 Configure Upstash Redis caching using environment config


    - Use `lib/config/cache.ts` for Redis credentials
    - Create `lib/cache/redis.ts` with Upstash client
    - Implement `lib/cache/posts.ts` for post list caching
    - Implement `lib/cache/analytics.ts` for view count buffering
    - Set up cache invalidation on post updates
    - _Requirements: 8.1, 19.3, 19.8_

  - [x] 11.4 Write property test for cache consistency






    - **Property 28: Cache consistency**
    - **Validates: Requirements 8.1**

  - [x] 11.5 Write property test for cache data validity






    - **Property 29: Cache hit returns valid data**
    - **Validates: Requirements 8.1**

  - [x] 11.6 Configure Clerk authentication using environment config


    - Use `lib/config/auth.ts` for Clerk credentials
    - Install and configure `@clerk/nextjs`
    - Create `lib/auth/clerk.ts` with Clerk helpers
    - Set up ClerkProvider in root layout
    - Configure Clerk middleware for route protection
    - _Requirements: 12.1, 12.2, 19.2, 19.7_

  - [x] 11.7 Implement admin role verification


    - Create `lib/auth/roles.ts` for role checking
    - Configure Clerk publicMetadata for admin role
    - Implement `requireAdmin()` helper function
    - _Requirements: 12.6_

  - [x] 11.8 Write property test for Clerk authentication






    - **Property 19: Clerk authentication validity**
    - **Validates: Requirements 12.2, 12.6**

  - [x] 11.9 Write property test for admin role verification






    - **Property 20: Admin role verification**
    - **Validates: Requirements 12.6**

  - [x] 11.10 Write property test for protected routes






    - **Property 21: Protected route access**
    - **Validates: Requirements 12.1, 12.5**

- [x] 12. Implement admin post management





  - [x] 12.1 Create admin post service


    - Implement CRUD operations in `lib/admin/posts.ts`
    - Handle post status transitions (draft, scheduled, published)
    - Integrate with database via Prisma (using real Neon connection)
    - _Requirements: 13.3, 13.4, 13.5, 15.1, 19.6_

  - [x] 12.2 Write property test for post CRUD






    - **Property 22: Post CRUD consistency**
    - **Validates: Requirements 13.3, 13.5**

  - [x] 12.3 Write property test for post status transitions






    - **Property 23: Post status transitions**
    - **Validates: Requirements 15.1, 15.2, 15.3**


  - [x] 12.4 Implement scheduled post publishing
    - Create cron job or serverless function for scheduled publishing
    - Update post status when scheduledAt time is reached
    - _Requirements: 15.3_

- [x] 13. Implement category and tag management





  - [x] 13.1 Create category service

    - Implement CRUD operations in `lib/admin/categories.ts`
    - Validate unique category names
    - Handle deletion constraints
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 13.2 Write property test for category uniqueness






    - **Property 24: Category uniqueness**
    - **Validates: Requirements 16.2**

  - [x] 13.3 Write property test for category deletion






    - **Property 25: Category deletion constraint**
    - **Validates: Requirements 16.4**


  - [x] 13.4 Create tag service
    - Implement CRUD operations in `lib/admin/tags.ts`
    - Mirror category functionality for tags
    - _Requirements: 16.5_

- [x] 14. Implement media management (ImageKit)






  - [x] 14.1 Create ImageKit client and upload service using environment config

    - Use `lib/config/media.ts` for ImageKit credentials
    - Create `lib/media/imagekit.ts` with ImageKit client configuration
    - Create `lib/media/upload.ts` with upload utilities
    - Implement server-side upload with authentication in `lib/admin/media.ts`
    - Validate file type and size before upload
    - Store metadata (fileId, url, thumbnailUrl) in Neon PostgreSQL via Prisma
    - _Requirements: 17.2, 19.4, 19.9_

  - [x] 14.2 Write property test for media validation






    - **Property 26: Media upload validation**
    - **Validates: Requirements 17.2**


  - [x] 14.3 Create media library functions

    - Implement `getAllMedia()` with pagination from Prisma
    - Implement `getOptimizedUrl()` for ImageKit URL transformations
    - Implement `getThumbnailUrl()` using ImageKit resize parameters
    - Implement `getMediaUsage()` to find posts using an image
    - Implement `deleteMedia()` with ImageKit API deletion and usage check
    - _Requirements: 17.1, 17.3, 17.4_

  - [x] 14.4 Write property test for media deletion






    - **Property 27: Media deletion constraint**
    - **Validates: Requirements 17.4**

- [x] 15. Checkpoint - Backend services complete





  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Build admin UI components (shadcn/ui + Clerk + TinyMCE)


  - [x] 16.1 Create admin layout and sidebar
    - Build `components/admin/Sidebar.tsx` using shadcn Sheet + NavigationMenu
    - Create `app/(admin)/admin/layout.tsx` with Clerk auth check and sidebar
    - Use Clerk `<UserButton />` for user profile and sign out
    - Use shadcn DropdownMenu for additional user actions
    - _Requirements: 12.1, 13.1_

  - [x] 16.2 Create sign-in page with Clerk
    - Create `app/(admin)/admin/sign-in/[[...sign-in]]/page.tsx` with Clerk `<SignIn />` component
    - Style Clerk components to match shadcn/ui theme
    - Configure Clerk redirect URLs for admin flow (using env config)
    - _Requirements: 12.2, 12.3, 19.2_

  - [x] 16.3 Create posts management UI
    - Build posts table using shadcn Table + DataTable pattern
    - Use shadcn Badge for status indicators (draft/scheduled/published)
    - Build `components/admin/PostForm.tsx` using shadcn Form, Input, Select, Tabs
    - Implement `app/(admin)/admin/posts/page.tsx`, `new/page.tsx`, `[id]/page.tsx`
    - _Requirements: 13.1, 13.2, 13.4, 15.4_

  - [x] 16.4 Create rich text editor (TinyMCE)
    - Integrate TinyMCE editor using `@tinymce/tinymce-react`
    - Configure toolbar with formatting controls (headings, bold, italic, lists, links)
    - Enable code block plugin with language selection and syntax highlighting
    - Configure image upload handler to integrate with ImageKit
    - Implement preview mode using shadcn Tabs
    - Style TinyMCE to match shadcn/ui theme (dark mode support)
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 16.5 Write property test for HTML content sanitization






    - **Property 11: HTML content sanitization**
    - **Validates: Requirements 5.3**

  - [x] 16.6 Create scheduling UI
    - Build `components/admin/DateTimePicker.tsx` using shadcn Calendar + Popover
    - Integrate with post form for scheduled publishing
    - Use shadcn Select for time selection
    - _Requirements: 15.1, 15.3_

  - [x] 16.7 Create category and tag management UI
    - Build `app/(admin)/admin/categories/page.tsx` using shadcn Table, Dialog, Form
    - Build `app/(admin)/admin/tags/page.tsx` with same pattern
    - Use shadcn AlertDialog for delete confirmation
    - Display post counts using shadcn Badge
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 16.8 Create media library UI

    - Build `components/admin/MediaGrid.tsx` using shadcn Card grid layout
    - Build `components/admin/MediaUploader.tsx` with drag-drop using shadcn Card
    - Use shadcn Dialog for image preview and details
    - Use shadcn AlertDialog for delete confirmation with usage warning
    - Implement `app/(admin)/admin/media/page.tsx` with shadcn Skeleton for loading
    - Images served via ImageKit CDN (using env config)
    - _Requirements: 17.1, 17.2, 17.3, 19.9_

- [x] 17. Implement analytics (shadcn/ui + recharts + Redis)

  - [x] 17.1 Create analytics service with Redis buffering
    - Implement page view tracking in `lib/admin/analytics.ts`
    - Use Upstash Redis to buffer view counts (using env config)
    - Create dashboard statistics queries with Redis caching
    - Implement date range filtering
    - _Requirements: 18.1, 18.2, 18.3, 19.8_

  - [x] 17.2 Create analytics UI
    - Build `components/admin/AnalyticsChart.tsx` using recharts with shadcn Card wrapper
    - Build `components/admin/StatsCard.tsx` using shadcn Card for KPI display
    - Implement `app/(admin)/admin/analytics/page.tsx` with charts and stats
    - Create dashboard overview in `app/(admin)/admin/page.tsx` with summary cards
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 17.3 Integrate page view tracking

    - Add view tracking API route at `app/api/analytics/view/route.ts`
    - Create API route for view recording
    - _Requirements: 18.2_

- [x] 18. Final Checkpoint









  - Build passes, all admin services and UI implemented

- [x] 19. Final Checkpoint - All property tests passing










  - Ensure all property-based tests pass, ask the user if questions arise.
