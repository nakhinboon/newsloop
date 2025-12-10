# Implementation Plan

- [x] 1. Set up news configuration and types





  - [x] 1.1 Create news configuration file


    - Create `lib/config/news.ts` with NewsConfig interface
    - Read NEWS_API_KEY, NEWS_API_URL from environment variables
    - Define supported categories and locales
    - Add validation for required environment variables
    - _Requirements: 4.1, 4.3_


  - [x] 1.2 Create news types





    - Create `lib/news/types.ts` with NewsArticle, NewsSource, NewsCategory interfaces


    - Define NewsQueryOptions, NewsResponse types
    - _Requirements: 1.2_
  - [x] 1.3 Create barrel export





    - Create `lib/news/index.ts` exporting all types and services
    - _Requirements: 1.2_

- [x] 2. Implement external API client





  - [x] 2.1 Create NewsAPI client


    - Create `lib/news/client.ts` with NewsAPIClient class
    - Implement fetchTopHeadlines method for category-based news
    - Implement fetchEverything method for search
    - Handle API errors and rate limits
    - Transform raw API response to NewsArticle format
    - _Requirements: 4.1, 4.2, 4.3, 8.1_
  - [ ]* 2.2 Write property test for API response transformation
    - **Property 2: News item contains required fields**
    - **Validates: Requirements 1.2**

- [x] 3. Implement news caching layer





  - [x] 3.1 Create news cache service


    - Create `lib/news/cache.ts` with NewsCache class
    - Implement get/set methods using Upstash Redis
    - Implement cache key generation based on query options
    - Support configurable TTL
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 3.2 Write property test for cache behavior
    - **Property 8: Cache stores fetched data**
    - **Property 9: Cache hit prevents API call**
    - **Validates: Requirements 5.1, 5.2**

- [x] 4. Implement news service









  - [x] 4.1 Create news service

    - Create `lib/news/service.ts` with NewsService class
    - Implement getNews method with caching
    - Implement getNewsByCategory method
    - Implement searchNews method
    - Handle locale parameter for API requests
    - Implement fallback to English for unsupported locales
    - _Requirements: 1.1, 2.1, 3.1, 7.1, 7.3_
  - [x]* 4.2 Write property test for news ordering


    - **Property 1: News ordering by date**
    - **Validates: Requirements 1.1**
  - [x]* 4.3 Write property test for category filtering


    - **Property 4: Category filtering**
    - **Validates: Requirements 2.1**
  - [x]* 4.4 Write property test for search


    - **Property 5: Search returns matching articles**
    - **Property 6: Empty search returns all news**
    - **Validates: Requirements 3.1, 3.2**
  - [x]* 4.5 Write property test for locale handling


    - **Property 11: Locale parameter in API request**
    - **Property 12: Unsupported locale fallback**
    - **Validates: Requirements 7.1, 7.3**

- [x] 5. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create news UI components





  - [x] 6.1 Create NewsCard component


    - Create `components/NewsCard.tsx`
    - Display title, source, date, thumbnail, excerpt
    - Link opens original URL in new tab
    - Use lazy loading for images
    - _Requirements: 1.2, 1.3, 6.2_

  - [x] 6.2 Create NewsList component

    - Create `components/NewsList.tsx`
    - Display paginated list of NewsCard components
    - Show loading skeleton while fetching
    - Handle empty state
    - _Requirements: 1.1, 1.4, 6.3_
  - [ ]* 6.3 Write property test for pagination
    - **Property 3: Pagination calculation**
    - **Validates: Requirements 1.4**
  - [x] 6.4 Create NewsFilter component


    - Create `components/NewsFilter.tsx`
    - Display category filter buttons
    - Show active filter indicator
    - Provide clear filter option
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 6.5 Create NewsSearch component

    - Create `components/NewsSearch.tsx`
    - Search input with debounce
    - Handle empty/whitespace queries
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Create news pages






  - [x] 7.1 Create news listing page

    - Create `app/[locale]/news/page.tsx`
    - Server component that fetches news using locale from params
    - Display NewsList, NewsFilter, NewsSearch
    - Use existing locale layout
    - _Requirements: 1.1, 7.2_

  - [-] 7.2 Create news category page

    - Create `app/[locale]/news/category/[category]/page.tsx`
    - Filter news by category from URL params
    - Show active category indicator
    - _Requirements: 2.1_

- [x] 8. Add translations






  - [x] 8.1 Add news translations to message files

    - Update `messages/en.json` with news UI strings
    - Update `messages/th.json` with Thai translations
    - Update `messages/es.json` with Spanish translations
    - Update `messages/fr.json` with French translations
    - _Requirements: 7.2_

- [x] 9. Add navigation link






  - [x] 9.1 Update Header component

    - Add News link to main navigation
    - Use locale-aware link
    - _Requirements: 1.1_

- [x] 10. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

