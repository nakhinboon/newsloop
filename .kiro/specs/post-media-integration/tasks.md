# Implementation Plan

## 1. Database Schema Updates

- [x] 1.1 Add MediaFolder model to Prisma schema
  - Create MediaFolder model with id, name (unique), createdAt, updatedAt
  - Add relation to Media model
  - _Requirements: 5.1, 5.5_

- [x] 1.2 Add PostMedia model to Prisma schema
  - Create PostMedia model with postId, mediaId, isCover, order
  - Add unique constraint on [postId, mediaId]
  - Add relations to Post and Media models
  - _Requirements: 2.5, 3.3_

- [x] 1.3 Update Media model with folder relation
  - Add folderId field and folder relation
  - Add index on folderId
  - _Requirements: 5.2, 5.3_

- [x] 1.4 Run Prisma migration
  - Generate and apply migration
  - Regenerate Prisma client
  - _Requirements: 5.1, 2.5, 3.3_

## 2. Folder Service Implementation

- [x] 2.1 Create folder service with CRUD operations
  - Implement createFolder, getFolders, deleteFolder functions
  - Add unique name validation
  - _Requirements: 5.1, 5.5_

- [ ]* 2.2 Write property test for folder name uniqueness
  - **Property 9: Folder name uniqueness**
  - **Validates: Requirements 5.1, 5.5**

- [x] 2.3 Create folder API routes
  - POST /api/admin/media/folders - create folder
  - GET /api/admin/media/folders - list folders
  - DELETE /api/admin/media/folders/[id] - delete folder
  - _Requirements: 5.1_

## 3. Media Service Updates

- [x] 3.1 Update media upload to support folder assignment
  - Modify uploadImage to accept folderId parameter
  - Update upload API route
  - _Requirements: 5.2_

- [x] 3.2 Add media folder reassignment function
  - Implement moveMediaToFolder function
  - Create PATCH /api/admin/media/[id]/folder route
  - _Requirements: 5.4_

- [ ]* 3.3 Write property test for folder reassignment
  - **Property 11: Folder reassignment**
  - **Validates: Requirements 5.4**

- [x] 3.4 Update media search to filter by folder
  - Add folderId parameter to searchMedia and getAllMedia
  - Update API routes to support folder filter
  - _Requirements: 5.3_

- [ ]* 3.5 Write property tests for media search and pagination
  - **Property 7: Media search filtering**
  - **Property 8: Pagination consistency**
  - **Validates: Requirements 4.2, 4.4**

## 4. Checkpoint - Database and Services
- [ ] 4. Ensure all tests pass, ask the user if questions arise.

## 5. Post Media Service Implementation

- [x] 5.1 Create PostMedia service
  - Implement getPostMedia, setPostMedia, addMediaToPost, removeMediaFromPost
  - Handle cover image logic (only one cover per post)
  - _Requirements: 2.5, 3.3, 3.4_

- [ ]* 5.2 Write property test for post media round-trip
  - **Property 6: Post media associations round-trip**
  - **Validates: Requirements 3.3, 3.4, 6.1, 6.2, 6.3**

- [ ]* 5.3 Write property test for cover image persistence
  - **Property 4: Cover image persistence round-trip**
  - **Validates: Requirements 2.5**

- [x] 5.4 Create post media API routes
  - GET /api/admin/posts/[id]/media - get post media
  - PUT /api/admin/posts/[id]/media - update post media associations
  - _Requirements: 3.3, 3.4_

## 6. Frontend Components - Folder Picker

- [x] 6.1 Create FolderPicker component
  - Dropdown to select folder
  - Option to create new folder inline
  - _Requirements: 5.2, 5.3_

## 7. Frontend Components - Media Picker Dialog

- [x] 7.1 Create MediaPickerDialog component
  - Modal dialog with media grid
  - Search input for filtering by filename
  - Folder filter dropdown
  - Pagination controls
  - Multi-select support
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 7.2 Write property test for media picker selection
  - **Property 3: Cover image selection from gallery**
  - **Validates: Requirements 2.1, 2.4**

## 8. Frontend Components - Inline Uploader

- [x] 8.1 Create InlineMediaUploader component
  - Drag and drop zone
  - File input for click-to-upload
  - Folder selection before upload
  - Progress indicator during upload
  - File validation (type, size)
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ]* 8.2 Write property tests for upload validation
  - **Property 1: Upload adds to gallery**
  - **Property 2: Invalid file rejection**
  - **Validates: Requirements 1.2, 1.3, 1.4, 3.1**

## 9. Frontend Components - Post Media Gallery

- [x] 9.1 Create PostMediaGallery component
  - Grid display of attached media
  - Remove button for each item
  - Set as cover button
  - Visual indicator for current cover
  - _Requirements: 3.1, 3.2_

- [ ]* 9.2 Write property test for gallery removal
  - **Property 5: Gallery removal consistency**
  - **Validates: Requirements 3.2**

## 10. Frontend Components - Cover Image Selector

- [x] 10.1 Create CoverImageSelector component
  - Preview of selected cover image
  - Button to open MediaPickerDialog
  - Button to remove cover
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

## 11. Checkpoint - Components
- [ ] 11. Ensure all tests pass, ask the user if questions arise.

## 12. PostForm Integration

- [x] 12.1 Add Media tab to PostForm
  - New tab in existing Tabs component
  - Contains InlineMediaUploader, PostMediaGallery, CoverImageSelector
  - Button to open MediaPickerDialog
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 12.2 Update PostForm state management
  - Add state for attached media and cover image
  - Handle media add/remove/reorder
  - _Requirements: 2.4, 3.1, 3.2_

- [x] 12.3 Update PostForm submit to save media associations
  - Include media associations in form submission
  - Call post media API after post save
  - _Requirements: 2.5, 3.3_

- [x] 12.4 Update PostForm to load existing media on edit
  - Fetch post media when editing existing post
  - Populate gallery and cover image state
  - _Requirements: 3.4_

## 13. Media Library Page Updates

- [x] 13.1 Update MediaUploader to support folder selection
  - Add FolderPicker component to MediaUploader
  - Pass folderId to upload API
  - _Requirements: 5.2_

- [x] 13.2 Update MediaGrid to support folder filtering and search
  - Add search input for filtering by filename
  - Add FolderPicker for folder filtering
  - Update pagination links to preserve filters
  - _Requirements: 4.2, 5.3_

- [x] 13.3 Add move-to-folder functionality in MediaGrid
  - Add folder selection in media detail dialog
  - Call PATCH /api/admin/media/[id]/folder to move media
  - _Requirements: 5.4_

- [x] 13.4 Update Media page to pass filters to components
  - Handle search and folderId query params
  - Pass filters to mediaService
  - _Requirements: 4.2, 5.3_

## 14. Google Drive-style Folder Navigation

- [x] 14.1 Create FolderCard component
  - Display folder as a card with icon, name, and media count
  - Support click to navigate into folder
  - Support drag-over highlight for drop target
  - _Requirements: 5.6, 5.7_

- [x] 14.2 Update MediaGrid to display folders as cards
  - Show folder cards at the top of the grid
  - Integrate FolderCard component
  - Handle folder click navigation
  - _Requirements: 5.6, 5.7_

- [x] 14.3 Add drag-and-drop support for media items
  - Make media cards draggable
  - Handle drop on folder cards to move media
  - Show visual feedback during drag
  - _Requirements: 5.8_

- [x] 14.4 Add breadcrumb navigation for folder view
  - Show current folder path
  - Allow clicking to navigate back to root or parent
  - _Requirements: 5.9_

- [x] 14.5 Update Media page to handle folder navigation
  - Add currentFolderId state/param
  - Filter media by current folder
  - Show only folder contents when inside a folder
  - _Requirements: 5.10_

## 15. Final Checkpoint
- [ ] 15. Ensure all tests pass, ask the user if questions arise.
