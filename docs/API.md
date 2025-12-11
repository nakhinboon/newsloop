# NewsLoop API Documentation

## Postman Collection

A complete Postman collection is available for testing the API:

- **Location:** `docs/postman/newsloop-api.json`
- **Generate/Update:** `bun run scripts/generate-postman.ts`

Import the collection into Postman and set the `baseUrl` and `authToken` environment variables.

---

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

ทุก Admin API ต้องมี Authentication ผ่าน Clerk Session Cookie หรือ Bearer Token

```bash
# Header
Authorization: Bearer <clerk_session_token>
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "pagination": { ... }  // สำหรับ list endpoints
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": [{ "field": "fieldName", "message": "Validation error" }]
}
```

---

## Posts API

### List Posts
```http
GET /api/admin/posts
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | หน้าที่ต้องการ |
| limit | number | 20 | จำนวนต่อหน้า (max: 50) |
| status | string | - | DRAFT, SCHEDULED, PUBLISHED |
| locale | string | - | en, es, fr, th |
| categoryId | string | - | Filter by category |
| search | string | - | ค้นหาจาก title/content |

**Response:**
```json
{
  "data": [
    {
      "id": "post-123",
      "title": "Post Title",
      "slug": "post-title",
      "locale": "th",
      "status": "PUBLISHED",
      "excerpt": "...",
      "content": "<p>...</p>",
      "featured": false,
      "publishedAt": "2025-12-11T10:00:00Z",
      "author": { "id": "...", "firstName": "...", "lastName": "..." },
      "category": { "id": "...", "name": "...", "slug": "..." },
      "tags": [{ "tag": { "id": "...", "name": "...", "slug": "..." } }],
      "postMedia": [{ "media": { "url": "...", "thumbnailUrl": "..." }, "isCover": true }]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Get Single Post
```http
GET /api/admin/posts/:id
```

**Response:**
```json
{
  "post": {
    "id": "post-123",
    "title": "Post Title",
    "slug": "post-title",
    "locale": "th",
    "status": "PUBLISHED",
    "content": "<p>Full content...</p>",
    "excerpt": "Short excerpt",
    "featured": false,
    "readingTime": 5,
    "publishedAt": "2025-12-11T10:00:00Z",
    "scheduledAt": null,
    "author": { ... },
    "category": { ... },
    "tags": [ ... ],
    "postMedia": [ ... ]
  }
}
```

---

### Create Post
```http
POST /api/admin/posts
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "ชื่อข่าว",
  "content": "<p>เนื้อหาข่าว HTML</p>",
  "excerpt": "คำอธิบายสั้นๆ (optional)",
  "slug": "news-slug",
  "locale": "th",
  "status": "DRAFT",
  "categoryId": "category-123",
  "tagIds": ["tag-1", "tag-2"],
  "featured": false,
  "scheduledAt": "2025-12-15T10:00:00Z",
  "readingTime": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | ✅ | ชื่อข่าว (max 500 chars) |
| content | string | ✅ | เนื้อหา HTML |
| slug | string | ✅ | URL slug (lowercase, hyphens only) |
| locale | string | ✅ | en, es, fr, th |
| status | string | ❌ | DRAFT (default), SCHEDULED, PUBLISHED |
| excerpt | string | ❌ | คำอธิบายสั้น (max 1000 chars) |
| categoryId | string | ❌ | ID ของหมวดหมู่ |
| tagIds | string[] | ❌ | Array ของ tag IDs |
| featured | boolean | ❌ | ข่าวเด่น (default: false) |
| scheduledAt | string | ❌ | ISO datetime สำหรับตั้งเวลาเผยแพร่ |
| readingTime | number | ❌ | เวลาอ่าน (นาที) |

**Response:** `201 Created`
```json
{
  "post": { ... }
}
```

---

### Update Post
```http
PATCH /api/admin/posts/:id
Content-Type: application/json
```

**Request Body:** (ส่งเฉพาะ field ที่ต้องการแก้ไข)
```json
{
  "title": "ชื่อใหม่",
  "status": "PUBLISHED"
}
```

**Response:**
```json
{
  "post": { ... }
}
```

---

### Delete Post
```http
DELETE /api/admin/posts/:id
```

**Response:**
```json
{
  "success": true
}
```

---

## Post Media API

### Get Post Media
```http
GET /api/admin/posts/:id/media
```

**Response:**
```json
[
  {
    "id": "post-media-1",
    "postId": "post-123",
    "mediaId": "media-456",
    "isCover": true,
    "order": 0,
    "media": {
      "id": "media-456",
      "url": "https://ik.imagekit.io/...",
      "thumbnailUrl": "https://ik.imagekit.io/.../tr:w-300",
      "filename": "image.jpg",
      "mimeType": "image/jpeg"
    }
  }
]
```

---

### Add Media to Post
```http
POST /api/admin/posts/:id/media
Content-Type: application/json
```

**Request Body:**
```json
{
  "mediaId": "media-456",
  "isCover": true
}
```

**Response:** `201 Created`
```json
{
  "id": "post-media-1",
  "postId": "post-123",
  "mediaId": "media-456",
  "isCover": true,
  "order": 0
}
```

---

### Update All Post Media
```http
PUT /api/admin/posts/:id/media
Content-Type: application/json
```

**Request Body:**
```json
{
  "media": [
    { "mediaId": "media-456", "isCover": true, "order": 0 },
    { "mediaId": "media-789", "isCover": false, "order": 1 }
  ]
}
```

---

### Remove Media from Post
```http
DELETE /api/admin/posts/:id/media?mediaId=media-456
```

**Response:**
```json
{
  "success": true
}
```

---

## Media API

### List Media
```http
GET /api/admin/media
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | หน้าที่ต้องการ |
| pageSize | number | 20 | จำนวนต่อหน้า (max: 50) |
| search | string | - | ค้นหาจากชื่อไฟล์ |
| folderId | string | - | Filter by folder (null = root) |

---

### Upload Media
```http
POST /api/admin/media/upload
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | ✅ | ไฟล์รูปภาพ (jpg, png, gif, webp) |
| folderId | string | ❌ | ID ของ folder |

**Response:** `200 OK`
```json
{
  "id": "media-456",
  "url": "https://ik.imagekit.io/xxx/image.jpg",
  "thumbnailUrl": "https://ik.imagekit.io/xxx/image.jpg/tr:w-300",
  "filename": "image.jpg",
  "mimeType": "image/jpeg",
  "size": 102400,
  "fileId": "imagekit-file-id"
}
```

---

### Delete Media
```http
DELETE /api/admin/media/:id
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| force | boolean | false | ลบแม้มี post ใช้อยู่ |

---

## Complete Flow: สร้างข่าวพร้อมรูป

### Step 1: อัพโหลดรูปภาพ
```bash
curl -X POST https://your-domain.com/api/admin/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg"
```

Response:
```json
{ "id": "media-456", "url": "https://..." }
```

### Step 2: สร้าง Post
```bash
curl -X POST https://your-domain.com/api/admin/posts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ข่าวใหม่",
    "content": "<p>เนื้อหาข่าว</p>",
    "slug": "new-post",
    "locale": "th",
    "status": "DRAFT"
  }'
```

Response:
```json
{ "post": { "id": "post-123", ... } }
```

### Step 3: เพิ่มรูปให้ Post (ตั้งเป็น Cover)
```bash
curl -X POST https://your-domain.com/api/admin/posts/post-123/media \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaId": "media-456",
    "isCover": true
  }'
```

### Step 4: เผยแพร่ Post
```bash
curl -X PATCH https://your-domain.com/api/admin/posts/post-123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "PUBLISHED" }'
```

---

## Error Codes

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - ต้อง login |
| 403 | Forbidden - ไม่มีสิทธิ์ |
| 404 | Not Found - ไม่พบข้อมูล |
| 405 | Method Not Allowed |
| 409 | Conflict - ข้อมูลซ้ำ (เช่น slug ซ้ำ) |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Server Error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Admin API | 100 requests / minute |
| Upload API | 20 requests / minute |
| Auth API | 10 requests / minute |
