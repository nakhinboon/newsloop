# Implementation Plan

- [x] 1. Update database schema for hierarchical categories





  - [x] 1.1 Add parentId, depth fields and self-relation to Category model in Prisma schema


    - Add `parentId String?` field with self-relation
    - Add `parent Category?` and `children Category[]` relations with `@relation("CategoryHierarchy")`
    - Add `depth Int @default(0)` field
    - Add `@@unique([parentId, name])` constraint for duplicate name validation
    - Add `@@index([parentId])` for query performance
    - _Requirements: 1.2, 1.3, 1.5, 6.3_

  - [x] 1.2 Generate Prisma client and verify schema changes

    - Run `npx prisma generate`
    - Verify generated types include new fields
    - _Requirements: 1.2_

- [x] 2. Implement category path utilities









  - [x] 2.1 Create path serialization and parsing functions in `lib/categories/path.ts`


    - Implement `serializePath(path: CategoryPath): string` using "/" delimiter
    - Implement `parsePath(pathString: string): CategoryPath` to reconstruct from string
    - Implement `formatPathForDisplay(path: CategoryPath): string` using " > " delimiter
    - _Requirements: 7.1, 7.2, 5.3_
  - [x] 2.2 Write property test for path round-trip








    - **Property 13: Path Serialization Round-Trip**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 3. Implement category tree operations









  - [x] 3.1 Create tree building functions in `lib/categories/tree.ts`


    - Implement `buildCategoryTree(categories: CategoryNode[]): CategoryNode[]` to construct tree from flat list
    - Implement `flattenTree(tree: CategoryNode[]): CategoryNode[]` to flatten tree to list
    - Implement `getAncestors(categoryId: string, categories: CategoryNode[]): CategoryNode[]`
    - Implement `getDescendants(categoryId: string, categories: CategoryNode[]): CategoryNode[]`
    - _Requirements: 1.4, 4.1, 4.4_
  - [x] 3.2 Write property test for tree structure correctness








    - **Property 3: Tree Structure Correctness**
    - **Validates: Requirements 1.4, 4.4**

  - [x] 3.3 Write property test for ancestor path completeness






    - **Property 8: Ancestor Path Completeness**
    - **Validates: Requirements 4.1, 5.3**

- [x] 4. Implement category validation functions








  - [x] 4.1 Create validation functions in `lib/categories/validation.ts`


    - Implement `validateDepth(parentId: string | null, categories: CategoryNode[]): boolean`
    - Implement `validateNoCycle(categoryId: string, newParentId: string, categories: CategoryNode[]): boolean`
    - Implement `calculateDepth(parentId: string | null, categories: CategoryNode[]): number`
    - _Requirements: 2.3, 6.1, 6.2, 6.3_
  - [x] 4.2 Write property test for depth enforcement








    - **Property 11: Depth Enforcement**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 4.3 Write property test for cycle prevention







    - **Property 5: Cycle Prevention**
    - **Validates: Requirements 2.3**
  - [x] 4.4 Write property test for depth equals ancestor count







    - **Property 12: Depth Equals Ancestor Count**
    - **Validates: Requirements 6.3**

- [x] 5. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update category service with hierarchy support





  - [x] 6.1 Update `createCategory` in `lib/admin/categories.ts`


    - Accept optional `parentId` parameter
    - Calculate and set `depth` based on parent
    - Validate depth doesn't exceed maximum (2)
    - Validate name uniqueness within parent scope
    - _Requirements: 1.2, 1.3, 1.5, 6.1_
  - [x] 6.2 Write property test for category creation






    - **Property 1: Category Creation Respects Parent Selection**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 6.3 Write property test for duplicate name validation






    - **Property 2: Duplicate Name Validation Within Parent**
    - **Validates: Requirements 1.5**

- [x] 7. Implement category move operation






  - [x] 7.1 Add `moveCategory` function to category service

    - Implement parent change with cycle detection
    - Update depths of moved category and all descendants
    - Preserve all children and post associations
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 7.2 Write property test for move preserves descendants






    - **Property 4: Move Preserves Descendants and Posts**
    - **Validates: Requirements 2.2, 2.4**

- [x] 8. Implement category deletion with reassignment






  - [x] 8.1 Update `deleteCategory` in category service

    - Check for posts and require reassignment target if posts exist
    - Reassign children to deleted category's parent
    - Update depths of reassigned children
    - _Requirements: 3.2, 3.3_
  - [x] 8.2 Write property test for deletion reassigns children






    - **Property 6: Deletion Reassigns Children to Grandparent**
    - **Validates: Requirements 3.2**
  - [x] 8.3 Write property test for deletion blocked with posts






    - **Property 7: Deletion Blocked When Posts Exist**
    - **Validates: Requirements 3.3**

- [x] 9. Implement category query functions






  - [x] 9.1 Add hierarchy query functions to category service

    - Implement `getCategoryTree(): Promise<CategoryNode[]>`
    - Implement `getCategoryWithAncestors(id: string): Promise<CategoryNode[]>`
    - Implement `getCategoryWithDescendants(id: string): Promise<CategoryNode>`
    - Implement `getChildrenWithPostCounts(parentId: string): Promise<CategoryNode[]>`
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 9.2 Write property test for children with post counts






    - **Property 9: Children Include Accurate Post Counts**
    - **Validates: Requirements 4.2**

- [x] 10. Implement descendant post aggregation






  - [x] 10.1 Add post query with descendants to category service

    - Implement `getPostsInCategory(categoryId: string, includeDescendants: boolean): Promise<Post[]>`
    - Collect all descendant category IDs when `includeDescendants` is true
    - Query posts where categoryId is in the collected IDs
    - _Requirements: 4.3_
  - [x] 10.2 Write property test for descendant post aggregation






    - **Property 10: Descendant Post Aggregation**
    - **Validates: Requirements 4.3**

- [x] 11. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Update admin UI components

  - [x] 12.1 Update CategoryForm component for hierarchy

    - Add parent category dropdown with hierarchical display
    - Show categories with indentation based on depth
    - Display full path in dropdown options
    - Disable invalid parent options (self, descendants, max depth)
    - _Requirements: 1.1, 1.4, 5.1, 5.3_

  - [x] 12.2 Update category list page with tree view
    - Display categories in expandable tree structure
    - Show post counts for each category
    - Add move/edit/delete actions with appropriate confirmations
    - _Requirements: 3.1, 4.4_

- [x] 13. Update public category pages






  - [x] 13.1 Add breadcrumb navigation to category page

    - Fetch category ancestors
    - Render breadcrumb with links to each ancestor
    - _Requirements: 4.1_

  - [x] 13.2 Update category page to show subcategories

    - Display list of child categories with post counts
    - Add toggle for including posts from subcategories
    - _Requirements: 4.2, 4.3_

- [x] 14. Update post form category selection






  - [x] 14.1 Update PostForm category dropdown

    - Display categories hierarchically with full paths
    - Allow selection of any category at any depth
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 15. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
