/**
 * Postman Collection Generator for NewsLoop API
 * Generates a Postman Collection v2.1 format JSON file
 * 
 * Requirements: 11.1, 11.6 - Generate complete API documentation in Postman format
 */

import * as fs from 'fs';
import * as path from 'path';

// Postman Collection v2.1 Types
interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    description: string;
    schema: string;
  };
  item: PostmanFolder[];
  variable: PostmanVariable[];
}

interface PostmanFolder {
  name: string;
  description?: string;
  item: PostmanRequest[];
}

interface PostmanRequest {
  name: string;
  request: {
    method: string;
    header: PostmanHeader[];
    url: PostmanUrl;
    body?: PostmanBody;
    description?: string;
  };
  response: PostmanResponse[];
}

interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
  description?: string;
}

interface PostmanUrl {
  raw: string;
  host: string[];
  path: string[];
  query?: PostmanQuery[];
}

interface PostmanQuery {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode: 'raw' | 'formdata' | 'urlencoded';
  raw?: string;
  formdata?: PostmanFormData[];
  options?: {
    raw?: {
      language: string;
    };
  };
}

interface PostmanFormData {
  key: string;
  type: 'text' | 'file';
  value?: string;
  src?: string;
  description?: string;
}

interface PostmanResponse {
  name: string;
  originalRequest: PostmanRequest['request'];
  status: string;
  code: number;
  header: PostmanHeader[];
  body: string;
  _postman_previewlanguage?: string;
}

interface PostmanVariable {
  key: string;
  value: string;
  type: string;
  description?: string;
}

// Helper to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper to create URL object
function createUrl(endpoint: string, queryParams?: PostmanQuery[]): PostmanUrl {
  return {
    raw: `{{baseUrl}}${endpoint}${queryParams ? '?' + queryParams.map(q => `${q.key}=${q.value}`).join('&') : ''}`,
    host: ['{{baseUrl}}'],
    path: endpoint.split('/').filter(Boolean),
    query: queryParams,
  };
}

// Helper to create auth header
function createAuthHeader(): PostmanHeader {
  return {
    key: 'Authorization',
    value: 'Bearer {{authToken}}',
    type: 'text',
    description: 'Clerk authentication token',
  };
}

// Helper to create JSON content type header
function createJsonHeader(): PostmanHeader {
  return {
    key: 'Content-Type',
    value: 'application/json',
    type: 'text',
  };
}


// Helper to create success response
function createSuccessResponse(
  name: string,
  request: PostmanRequest['request'],
  body: object
): PostmanResponse {
  return {
    name,
    originalRequest: request,
    status: 'OK',
    code: 200,
    header: [{ key: 'Content-Type', value: 'application/json', type: 'text' }],
    body: JSON.stringify(body, null, 2),
    _postman_previewlanguage: 'json',
  };
}

// Helper to create error response
function createErrorResponse(
  name: string,
  request: PostmanRequest['request'],
  code: number,
  status: string,
  error: string
): PostmanResponse {
  return {
    name,
    originalRequest: request,
    status,
    code,
    header: [{ key: 'Content-Type', value: 'application/json', type: 'text' }],
    body: JSON.stringify({ error }, null, 2),
    _postman_previewlanguage: 'json',
  };
}

/**
 * Generate Public API endpoints folder
 * Requirements: 11.1, 11.2, 11.3
 */
function generatePublicApiFolder(): PostmanFolder {
  const items: PostmanRequest[] = [];

  // GET /api/posts
  const getPostsRequest: PostmanRequest['request'] = {
    method: 'GET',
    header: [],
    url: createUrl('/api/posts', [
      { key: 'locale', value: 'en', description: 'Filter by locale (en, es, fr, th)' },
      { key: 'limit', value: '20', description: 'Number of posts (default: 20, max: 50)' },
      { key: 'offset', value: '0', description: 'Pagination offset' },
      { key: 'featured', value: 'false', description: 'Filter featured posts only', disabled: true },
      { key: 'category', value: '', description: 'Filter by category slug', disabled: true },
    ]),
    description: 'Get published posts with pagination and filtering options.',
  };

  items.push({
    name: 'Get Posts',
    request: getPostsRequest,
    response: [
      createSuccessResponse('Success', getPostsRequest, {
        posts: [
          {
            id: 'clx123abc',
            slug: 'example-post',
            locale: 'en',
            title: 'Example Post Title',
            excerpt: 'This is an example post excerpt...',
            publishedAt: '2025-12-01T10:00:00.000Z',
            readingTime: 5,
            featured: false,
            author: { name: 'John Doe', avatar: 'https://example.com/avatar.jpg' },
            category: { name: 'Technology', slug: 'technology' },
            tags: [{ name: 'News', slug: 'news' }],
            image: 'https://ik.imagekit.io/example/image.jpg',
            thumbnailUrl: 'https://ik.imagekit.io/example/image_thumb.jpg',
          },
        ],
        total: 100,
        limit: 20,
        offset: 0,
        hasMore: true,
      }),
      createErrorResponse('Validation Error', getPostsRequest, 400, 'Bad Request', 'Validation failed'),
    ],
  });

  // GET /api/posts/featured
  const getFeaturedRequest: PostmanRequest['request'] = {
    method: 'GET',
    header: [],
    url: createUrl('/api/posts/featured'),
    description: 'Get posts organized for BBC-style homepage sections including hero, top stories, must read, and more.',
  };

  items.push({
    name: 'Get Featured Posts (Homepage)',
    request: getFeaturedRequest,
    response: [
      createSuccessResponse('Success', getFeaturedRequest, {
        hero: {
          main: { id: 'clx123', slug: 'main-story', title: 'Main Story', excerpt: '...' },
          side: [{ id: 'clx124', slug: 'side-story', title: 'Side Story', excerpt: '...' }],
        },
        topStories: [{ id: 'clx125', slug: 'top-story', title: 'Top Story', excerpt: '...' }],
        moreNews: [{ id: 'clx126', slug: 'more-news', title: 'More News', excerpt: '...' }],
        mustRead: [{ id: 'clx127', slug: 'must-read', title: 'Must Read', excerpt: '...' }],
        feature: { main: null, side: null },
        video: null,
        bottomGrid: [],
        meta: { totalFeatured: 5, totalLatest: 30, totalPopular: 10, totalBreaking: 3, totalLongRead: 2, totalVideo: 1 },
      }),
      createErrorResponse('Server Error', getFeaturedRequest, 500, 'Internal Server Error', 'Failed to fetch posts'),
    ],
  });

  // GET /api/categories
  const getCategoriesRequest: PostmanRequest['request'] = {
    method: 'GET',
    header: [],
    url: createUrl('/api/categories', [
      { key: 'withPosts', value: 'false', description: 'Include posts in each category' },
      { key: 'limit', value: '50', description: 'Max posts per category (when withPosts=true)' },
      { key: 'rootOnly', value: 'false', description: 'Only return root categories (no parent)' },
    ]),
    description: 'Get all categories with post counts and optional posts.',
  };

  items.push({
    name: 'Get Categories',
    request: getCategoriesRequest,
    response: [
      createSuccessResponse('Success', getCategoriesRequest, [
        {
          id: 'cat123',
          name: 'Technology',
          slug: 'technology',
          description: 'Tech news and updates',
          postCount: 25,
        },
        {
          id: 'cat124',
          name: 'Business',
          slug: 'business',
          description: 'Business and finance news',
          postCount: 18,
        },
      ]),
      createErrorResponse('Validation Error', getCategoriesRequest, 400, 'Bad Request', 'Validation failed'),
    ],
  });

  return {
    name: 'Public API',
    description: 'Public endpoints for fetching published content. No authentication required.',
    item: items,
  };
}


/**
 * Generate Admin Users API endpoints folder
 * Requirements: 11.1, 11.2, 11.3
 */
function generateAdminUsersFolder(): PostmanFolder {
  const items: PostmanRequest[] = [];

  // GET /api/admin/users
  const getUsersRequest: PostmanRequest['request'] = {
    method: 'GET',
    header: [createAuthHeader()],
    url: createUrl('/api/admin/users'),
    description: 'List all users with stats. Requires admin role.',
  };

  items.push({
    name: 'List Users',
    request: getUsersRequest,
    response: [
      createSuccessResponse('Success', getUsersRequest, {
        users: [
          {
            id: 'user_123',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            imageUrl: 'https://example.com/avatar.jpg',
            createdAt: '2025-01-01T00:00:00.000Z',
            postCount: 15,
          },
        ],
      }),
      createErrorResponse('Unauthorized', getUsersRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', getUsersRequest, 403, 'Forbidden', 'Insufficient permissions'),
    ],
  });

  return {
    name: 'Admin - Users',
    description: 'User management endpoints. Requires admin role.',
    item: items,
  };
}

/**
 * Generate Admin Invitations API endpoints folder
 * Requirements: 11.1, 11.2, 11.3
 */
function generateAdminInvitationsFolder(): PostmanFolder {
  const items: PostmanRequest[] = [];

  // GET /api/admin/invitations
  const getInvitationsRequest: PostmanRequest['request'] = {
    method: 'GET',
    header: [createAuthHeader()],
    url: createUrl('/api/admin/invitations'),
    description: 'List all pending invitations. Requires admin role.',
  };

  items.push({
    name: 'List Invitations',
    request: getInvitationsRequest,
    response: [
      createSuccessResponse('Success', getInvitationsRequest, {
        invitations: [
          {
            id: 'inv_123',
            email: 'newuser@example.com',
            role: 'editor',
            status: 'pending',
            createdAt: '2025-12-01T00:00:00.000Z',
            expiresAt: '2025-12-08T00:00:00.000Z',
          },
        ],
      }),
      createErrorResponse('Unauthorized', getInvitationsRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', getInvitationsRequest, 403, 'Forbidden', 'Insufficient permissions'),
    ],
  });

  // POST /api/admin/invitations
  const createInvitationRequest: PostmanRequest['request'] = {
    method: 'POST',
    header: [createAuthHeader(), createJsonHeader()],
    url: createUrl('/api/admin/invitations'),
    body: {
      mode: 'raw',
      raw: JSON.stringify({ email: 'newuser@example.com', role: 'editor' }, null, 2),
      options: { raw: { language: 'json' } },
    },
    description: 'Create a new user invitation. Requires admin role.',
  };

  items.push({
    name: 'Create Invitation',
    request: createInvitationRequest,
    response: [
      {
        name: 'Created',
        originalRequest: createInvitationRequest,
        status: 'Created',
        code: 201,
        header: [{ key: 'Content-Type', value: 'application/json', type: 'text' }],
        body: JSON.stringify({
          invitation: {
            id: 'inv_456',
            email: 'newuser@example.com',
            role: 'editor',
            status: 'pending',
            createdAt: '2025-12-11T00:00:00.000Z',
            expiresAt: '2025-12-18T00:00:00.000Z',
          },
        }, null, 2),
        _postman_previewlanguage: 'json',
      },
      createErrorResponse('Validation Error', createInvitationRequest, 400, 'Bad Request', 'Invalid email format'),
      createErrorResponse('Conflict', createInvitationRequest, 409, 'Conflict', 'User already exists'),
      createErrorResponse('Unauthorized', createInvitationRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', createInvitationRequest, 403, 'Forbidden', 'Insufficient permissions'),
    ],
  });

  // DELETE /api/admin/invitations/:id
  const deleteInvitationRequest: PostmanRequest['request'] = {
    method: 'DELETE',
    header: [createAuthHeader()],
    url: createUrl('/api/admin/invitations/{{invitationId}}'),
    description: 'Revoke a pending invitation. Requires admin role.',
  };

  items.push({
    name: 'Delete Invitation',
    request: deleteInvitationRequest,
    response: [
      createSuccessResponse('Success', deleteInvitationRequest, { success: true }),
      createErrorResponse('Unauthorized', deleteInvitationRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', deleteInvitationRequest, 403, 'Forbidden', 'Insufficient permissions'),
    ],
  });

  return {
    name: 'Admin - Invitations',
    description: 'User invitation management endpoints. Requires admin role.',
    item: items,
  };
}


/**
 * Generate Admin Media API endpoints folder
 * Requirements: 11.1, 11.2, 11.3
 */
function generateAdminMediaFolder(): PostmanFolder {
  const items: PostmanRequest[] = [];

  // GET /api/admin/media
  const getMediaRequest: PostmanRequest['request'] = {
    method: 'GET',
    header: [createAuthHeader()],
    url: createUrl('/api/admin/media', [
      { key: 'page', value: '1', description: 'Page number' },
      { key: 'pageSize', value: '20', description: 'Items per page (max: 50)' },
      { key: 'search', value: '', description: 'Search by filename', disabled: true },
      { key: 'folderId', value: '', description: 'Filter by folder ID', disabled: true },
    ]),
    description: 'List media files with pagination and filtering. Requires editor role.',
  };

  items.push({
    name: 'List Media',
    request: getMediaRequest,
    response: [
      createSuccessResponse('Success', getMediaRequest, {
        media: [
          {
            id: 'media_123',
            filename: 'hero-image.jpg',
            url: 'https://ik.imagekit.io/newsloop/blog/hero-image.jpg',
            thumbnailUrl: 'https://ik.imagekit.io/newsloop/blog/hero-image_thumb.jpg',
            mimeType: 'image/jpeg',
            size: 245678,
            width: 1920,
            height: 1080,
            folderId: null,
            createdAt: '2025-12-01T00:00:00.000Z',
          },
        ],
        total: 50,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      }),
      createErrorResponse('Unauthorized', getMediaRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', getMediaRequest, 403, 'Forbidden', 'Insufficient permissions'),
    ],
  });

  // POST /api/admin/media/upload
  const uploadMediaRequest: PostmanRequest['request'] = {
    method: 'POST',
    header: [createAuthHeader()],
    url: createUrl('/api/admin/media/upload'),
    body: {
      mode: 'formdata',
      formdata: [
        { key: 'file', type: 'file', description: 'Image file to upload (jpg, png, gif, webp)' },
        { key: 'folderId', type: 'text', value: '', description: 'Optional folder ID' },
      ],
    },
    description: 'Upload a media file. Requires editor role. Rate limited.',
  };

  items.push({
    name: 'Upload Media',
    request: uploadMediaRequest,
    response: [
      createSuccessResponse('Success', uploadMediaRequest, {
        id: 'media_456',
        filename: 'uploaded-image.jpg',
        url: 'https://ik.imagekit.io/newsloop/blog/uploaded-image.jpg',
        thumbnailUrl: 'https://ik.imagekit.io/newsloop/blog/uploaded-image_thumb.jpg',
        mimeType: 'image/jpeg',
        size: 123456,
        width: 1200,
        height: 800,
        fileId: 'ik_file_123',
        createdAt: '2025-12-11T00:00:00.000Z',
      }),
      createErrorResponse('Bad Request', uploadMediaRequest, 400, 'Bad Request', 'No file provided'),
      createErrorResponse('Unauthorized', uploadMediaRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', uploadMediaRequest, 403, 'Forbidden', 'Insufficient permissions'),
      createErrorResponse('Rate Limited', uploadMediaRequest, 429, 'Too Many Requests', 'Too many requests'),
    ],
  });

  // GET /api/admin/media/:id
  const getMediaByIdRequest: PostmanRequest['request'] = {
    method: 'GET',
    header: [createAuthHeader()],
    url: createUrl('/api/admin/media/{{mediaId}}'),
    description: 'Get a single media item by ID. Requires editor role.',
  };

  items.push({
    name: 'Get Media by ID',
    request: getMediaByIdRequest,
    response: [
      createSuccessResponse('Success', getMediaByIdRequest, {
        id: 'media_123',
        filename: 'hero-image.jpg',
        url: 'https://ik.imagekit.io/newsloop/blog/hero-image.jpg',
        thumbnailUrl: 'https://ik.imagekit.io/newsloop/blog/hero-image_thumb.jpg',
        mimeType: 'image/jpeg',
        size: 245678,
        width: 1920,
        height: 1080,
        folderId: null,
        fileId: 'ik_file_123',
        createdAt: '2025-12-01T00:00:00.000Z',
      }),
      createErrorResponse('Not Found', getMediaByIdRequest, 404, 'Not Found', 'Media not found'),
      createErrorResponse('Unauthorized', getMediaByIdRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', getMediaByIdRequest, 403, 'Forbidden', 'Insufficient permissions'),
    ],
  });

  // DELETE /api/admin/media/:id
  const deleteMediaRequest: PostmanRequest['request'] = {
    method: 'DELETE',
    header: [createAuthHeader()],
    url: createUrl('/api/admin/media/{{mediaId}}', [
      { key: 'force', value: 'false', description: 'Force delete even if media is in use' },
    ]),
    description: 'Delete a media item. Requires editor role.',
  };

  items.push({
    name: 'Delete Media',
    request: deleteMediaRequest,
    response: [
      createSuccessResponse('Success', deleteMediaRequest, { success: true }),
      createErrorResponse('Unauthorized', deleteMediaRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', deleteMediaRequest, 403, 'Forbidden', 'Insufficient permissions'),
    ],
  });

  return {
    name: 'Admin - Media',
    description: 'Media management endpoints. Requires editor role.',
    item: items,
  };
}

/**
 * Generate Admin Tags API endpoints folder
 * Requirements: 11.1, 11.2, 11.3
 */
function generateAdminTagsFolder(): PostmanFolder {
  const items: PostmanRequest[] = [];

  // GET /api/admin/tags
  const getTagsRequest: PostmanRequest['request'] = {
    method: 'GET',
    header: [createAuthHeader()],
    url: createUrl('/api/admin/tags'),
    description: 'List all tags. Requires editor role.',
  };

  items.push({
    name: 'List Tags',
    request: getTagsRequest,
    response: [
      createSuccessResponse('Success', getTagsRequest, [
        {
          id: 'tag_123',
          name: 'Breaking News',
          slug: 'breaking-news',
          _count: { posts: 15 },
        },
        {
          id: 'tag_124',
          name: 'Technology',
          slug: 'technology',
          _count: { posts: 42 },
        },
      ]),
      createErrorResponse('Unauthorized', getTagsRequest, 401, 'Unauthorized', 'Authentication required'),
      createErrorResponse('Forbidden', getTagsRequest, 403, 'Forbidden', 'Insufficient permissions'),
    ],
  });

  return {
    name: 'Admin - Tags',
    description: 'Tag management endpoints. Requires editor role.',
    item: items,
  };
}


/**
 * Generate the complete Postman Collection
 * Requirements: 11.1, 11.4, 11.6
 */
function generatePostmanCollection(): PostmanCollection {
  return {
    info: {
      _postman_id: generateUUID(),
      name: 'NewsLoop API',
      description: `# NewsLoop API Documentation

NewsLoop is a multilingual blog/CMS with public-facing content and an admin dashboard.

## Authentication

Admin endpoints require a Clerk authentication token. Set the \`authToken\` environment variable with your Bearer token.

### Getting an Auth Token

1. Sign in to the NewsLoop dashboard
2. Open browser developer tools
3. Find the Clerk session token in cookies or network requests
4. Copy the token and set it as the \`authToken\` variable

## Rate Limiting

Admin endpoints are rate limited:
- Standard admin endpoints: 100 requests per minute
- Upload endpoints: 10 requests per minute

## Roles

- **Admin**: Full access including user management
- **Editor**: Posts, media, categories, tags (no user management)

## Error Responses

All endpoints return consistent error responses:

\`\`\`json
{
  "error": "Error message description"
}
\`\`\`

Common HTTP status codes:
- 400: Validation error
- 401: Authentication required
- 403: Insufficient permissions
- 404: Resource not found
- 405: Method not allowed
- 429: Rate limit exceeded
- 500: Server error`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      generatePublicApiFolder(),
      generateAdminUsersFolder(),
      generateAdminInvitationsFolder(),
      generateAdminMediaFolder(),
      generateAdminTagsFolder(),
    ],
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'string',
        description: 'Base URL for the API. Change to production URL when needed.',
      },
      {
        key: 'authToken',
        value: '',
        type: 'string',
        description: 'Clerk authentication token (Bearer token)',
      },
      {
        key: 'invitationId',
        value: '',
        type: 'string',
        description: 'Invitation ID for delete operations',
      },
      {
        key: 'mediaId',
        value: '',
        type: 'string',
        description: 'Media ID for get/delete operations',
      },
    ],
  };
}

/**
 * Export collection to file
 * Requirements: 11.6
 */
function exportToFile(collection: PostmanCollection, outputPath: string): void {
  const dir = path.dirname(outputPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');
  console.log(`✅ Postman collection exported to: ${outputPath}`);
}

/**
 * Main function
 */
function main(): void {
  console.log('🚀 Generating NewsLoop API Postman Collection...\n');
  
  const collection = generatePostmanCollection();
  const outputPath = path.join(process.cwd(), 'docs', 'postman', 'newsloop-api.json');
  
  exportToFile(collection, outputPath);
  
  console.log('\n📊 Collection Summary:');
  console.log(`   - Total folders: ${collection.item.length}`);
  console.log(`   - Total requests: ${collection.item.reduce((acc, folder) => acc + folder.item.length, 0)}`);
  console.log(`   - Environment variables: ${collection.variable.length}`);
  console.log('\n✨ Done! Import the collection into Postman to get started.');
}

// Run the generator
main();
