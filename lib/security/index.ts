/**
 * Security utilities barrel export
 */

export {
  getSecurityHeaders,
  applySecurityHeaders,
  createSecureResponse,
  sanitizeErrorMessage,
  isErrorResponseSafe,
  containsInternalDetails,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createMethodNotAllowedResponse,
  AUTH_ERROR_MESSAGES,
  type SecurityHeadersConfig,
} from './headers';

export {
  checkRateLimit,
  getRateLimitHeaders,
  createRateLimiter,
  getClientIdentifier,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limit';

export {
  isInternalIP,
  isAllowedDomain,
  validateUrl,
  validateFileUpload,
  validateImageUrl,
  DEFAULT_ALLOWED_FILE_TYPES,
  type FileValidationResult,
  type UrlValidationResult,
} from './validation';

export {
  logSecurityEvent,
  formatStructuredLog,
  sanitizeForLogging,
  isSensitiveKey,
  isSensitiveValue,
  createAuthFailureEvent,
  createAuthzFailureEvent,
  createRateLimitEvent,
  createValidationErrorEvent,
  createSuspiciousActivityEvent,
  type SecurityEvent,
  type SecurityEventType,
  type SecuritySeverity,
  type SecurityLogEntry,
} from './logger';

export {
  MAX_LIMIT,
  DEFAULT_LIMIT,
  DEFAULT_PAGE_SIZE,
  paginationSchema,
  uuidSchema,
  nonEmptyStringSchema,
  roleSchema,
  updateUserRoleSchema,
  createInvitationSchema,
  mediaListQuerySchema,
  moveMediaToFolderSchema,
  folderSchema,
  postMediaItemSchema,
  updatePostMediaSchema,
  addMediaToPostSchema,
  postsListQuerySchema,
  categoriesListQuerySchema,
  validateBody,
  validateQuery,
  formatValidationError,
  enforcePaginationLimit,
  type PaginationParams,
  type UpdateUserRoleInput,
  type CreateInvitationInput,
  type MediaListQuery,
  type MoveMediaToFolderInput,
  type FolderInput,
  type UpdatePostMediaInput,
  type AddMediaToPostInput,
  type PostsListQuery,
  type CategoriesListQuery,
  type ValidationResult,
} from './api-schemas';
