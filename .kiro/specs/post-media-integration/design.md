# Design Document: Post Media Integration

## Overview

ฟีเจอร์นี้เพิ่มความสามารถในการจัดการ Media โดยตรงภายในหน้า Post Form โดยมีองค์ประกอบหลัก:
- Inline Media Uploader สำหรับอัปโหลดรูปภาพในหน้า Post
- Cover Image Selector สำหรับเลือกรูปปก
- Media Gallery สำหรับแสดงและจัดการ Media ที่แนบกับ Post
- Media Picker Dialog สำหรับเลือก Media จากคลังเดิม
- Media Folder System สำหรับจัดกลุ่ม Media

## Architecture

```mermaid
graph TB
    subgraph "Frontend Components"
        PF[PostForm]
        IU[InlineMediaUploader]
        CIS[CoverImageSelector]
        PMG[PostMediaGallery]
        MPD[MediaPickerDialog]
        FP[FolderPicker]
    end
    
    subgraph "API Routes"
        UPL[/api/admin/media/upload]
        MED[/api/admin/media]
        FLD[/api/admin/media/folders]
        PM[/api/admin/posts/media]
    end
    
    subgraph "Services"
        MS[MediaService]
        FS[FolderService]
        PMS[PostMediaService]
    end
    
    subgraph "Database"
        DB[(PostgreSQL)]
    end
    
    PF --> IU
    PF --> CIS
    PF --> PMG
    PF --> MPD
    IU --> FP
    MPD --> FP
    
    IU --> UPL
    PMG --> MED
    MPD --> MED
    FP --> FLD
    PF --> PM
    
    UPL --> MS
    MED --> MS
    FLD --> FS
    PM --> PMS
    
    MS --> DB
    FS --> DB
    PMS --> DB
```

## Components and Interfaces

### 1. InlineMediaUploader Component

```typescript
interface InlineMediaUploaderProps {
  onUploadComplete: (media: UploadedMedia[]) => void;
  onUploadError: (error: string) => void;
  defaultFolderId?: string;
  maxFiles?: number;
}

interface UploadedMedia {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}
```

คอมโพเนนต์นี้จะ:
- แสดง Drag & Drop zone สำหรับอัปโหลด
- รองรับการเลือก Folder ก่อนอัปโหลด
- แสดง Progress indicator ระหว่างอัปโหลด
- Validate file type และ size ก่อนอัปโหลด

### 2. CoverImageSelector Component

```typescript
interface CoverImageSelectorProps {
  coverImageId: string | null;
  availableMedia: UploadedMedia[];
  onSelect: (mediaId: string | null) => void;
}
```

คอมโพเนนต์นี้จะ:
- แสดง Preview ของ Cover Image ที่เลือก
- ปุ่มเลือก/เปลี่ยน Cover Image
- ปุ่มลบ Cover Image

### 3. PostMediaGallery Component

```typescript
interface PostMediaGalleryProps {
  media: UploadedMedia[];
  coverImageId: string | null;
  onRemove: (mediaId: string) => void;
  onSetCover: (mediaId: string) => void;
  onReorder?: (mediaIds: string[]) => void;
}
```

คอมโพเนนต์นี้จะ:
- แสดง Grid ของ Media ที่แนบกับ Post
- ปุ่มลบ Media ออกจาก Post
- ปุ่มตั้งเป็น Cover Image
- Highlight รูปที่เป็น Cover

### 4. MediaPickerDialog Component

```typescript
interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: UploadedMedia[]) => void;
  multiple?: boolean;
  selectedIds?: string[];
}
```

คอมโพเนนต์นี้จะ:
- แสดง Dialog พร้อม Grid ของ Media ทั้งหมด
- Search box สำหรับค้นหาตามชื่อไฟล์
- Filter ตาม Folder
- Pagination สำหรับ Media จำนวนมาก
- รองรับเลือกหลายรูป

### 5. FolderPicker Component

```typescript
interface FolderPickerProps {
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  allowCreate?: boolean;
}

interface MediaFolder {
  id: string;
  name: string;
  mediaCount: number;
  createdAt: Date;
}
```

## Data Models

### Database Schema Changes

```prisma
// เพิ่ม MediaFolder model
model MediaFolder {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  media     Media[]
}

// แก้ไข Media model - เพิ่ม folder relation
model Media {
  // ... existing fields ...
  folderId  String?
  folder    MediaFolder? @relation(fields: [folderId], references: [id])
  
  postMedia PostMedia[]
  
  @@index([folderId])
}

// เพิ่ม PostMedia model สำหรับ many-to-many relation
model PostMedia {
  id        String   @id @default(cuid())
  postId    String
  mediaId   String
  isCover   Boolean  @default(false)
  order     Int      @default(0)
  createdAt DateTime @default(now())
  
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  media     Media    @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  
  @@unique([postId, mediaId])
  @@index([postId])
  @@index([mediaId])
}

// แก้ไข Post model - เพิ่ม relation
model Post {
  // ... existing fields ...
  postMedia PostMedia[]
}
```

### TypeScript Types

```typescript
// Post with media associations
interface PostWithMedia {
  id: string;
  // ... other post fields ...
  postMedia: {
    id: string;
    mediaId: string;
    isCover: boolean;
    order: number;
    media: {
      id: string;
      url: string;
      thumbnailUrl: string | null;
      filename: string;
      mimeType: string;
      width: number | null;
      height: number | null;
    };
  }[];
}

// Media association data for saving
interface PostMediaInput {
  mediaId: string;
  isCover: boolean;
  order: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Upload adds to gallery
*For any* valid image file uploaded through the Inline_Uploader, the Media_Gallery SHALL contain that image after upload completion.
**Validates: Requirements 1.2, 1.3, 3.1**

### Property 2: Invalid file rejection
*For any* file with invalid type or size exceeding limits, the upload process SHALL reject the file and return an appropriate error message.
**Validates: Requirements 1.4**

### Property 3: Cover image selection from gallery
*For any* image in the Media_Gallery, that image SHALL be selectable as the Cover_Image.
**Validates: Requirements 2.1, 2.4**

### Property 4: Cover image persistence round-trip
*For any* Post with a Cover_Image, saving and then loading the Post SHALL return the same Cover_Image reference.
**Validates: Requirements 2.5**

### Property 5: Gallery removal consistency
*For any* Media_Gallery with N items, removing one item SHALL result in a gallery with N-1 items, and the removed item SHALL not be present.
**Validates: Requirements 3.2**

### Property 6: Post media associations round-trip
*For any* Post with Media_Gallery associations, saving and then loading the Post SHALL return equivalent media associations (same media items, same order, same cover status).
**Validates: Requirements 3.3, 3.4, 6.1, 6.2, 6.3**

### Property 7: Media search filtering
*For any* search query in the Media_Picker, all returned results SHALL have filenames containing the search query (case-insensitive).
**Validates: Requirements 4.2**

### Property 8: Pagination consistency
*For any* page request in the Media_Picker, the returned items SHALL not exceed the page size, and total count SHALL be accurate.
**Validates: Requirements 4.4**

### Property 9: Folder name uniqueness
*For any* attempt to create a Media_Folder, if a folder with the same name exists, the creation SHALL fail with an error.
**Validates: Requirements 5.1, 5.5**

### Property 10: Folder organization
*For any* Media item with a folder assignment, that item SHALL appear under its assigned folder when viewing the Media_Picker.
**Validates: Requirements 5.3**

### Property 11: Folder reassignment
*For any* Media item moved to a different folder, the media's folder reference SHALL update to the new folder.
**Validates: Requirements 5.4**

## Error Handling

### Upload Errors
- Invalid file type: แสดงข้อความ "Unsupported file type. Please upload PNG, JPG, GIF, or WebP images."
- File too large: แสดงข้อความ "File size exceeds 10MB limit."
- Upload failed: แสดงข้อความ "Upload failed. Please try again."
- Network error: แสดงข้อความ "Network error. Please check your connection."

### Folder Errors
- Duplicate name: แสดงข้อความ "A folder with this name already exists."
- Delete folder with media: แสดงข้อความ "Cannot delete folder containing media. Move or delete media first."

### Media Association Errors
- Media not found: แสดงข้อความ "Selected media no longer exists."
- Save failed: แสดงข้อความ "Failed to save media associations. Please try again."

## Testing Strategy

### Unit Testing
- ใช้ Vitest สำหรับ unit tests
- Test validation functions (file type, size)
- Test folder name validation
- Test media association serialization/deserialization

### Property-Based Testing
- ใช้ **fast-check** library สำหรับ property-based testing
- Configure minimum 100 iterations per property test
- Tag each property test with format: `**Feature: post-media-integration, Property {number}: {property_text}**`

### Test Coverage
- Folder service: creation, uniqueness, listing
- Media service: upload, folder assignment, search, pagination
- Post media service: association CRUD, cover image handling
- Round-trip tests for serialization/deserialization
