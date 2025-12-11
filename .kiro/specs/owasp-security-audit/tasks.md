# Implementation Plan

## Phase 1: Security Infrastructure

- [x] 1. Create security utilities module





  - [x] 1.1 Create `lib/security/headers.ts` with security headers configuration


    - Implement `getSecurityHeaders()` function
    - Include CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
    - _Requirements: 5.1_
  - [x] 1.2 Write property test for security headers






    - **Property 6: Error Message Sanitization** - verify no internal details in errors
    - **Validates: Requirements 4.4**


  - [x] 1.3 Create `lib/security/rate-limit.ts` with Redis-based rate limiting





    - Implement `checkRateLimit()` function using Upstash Redis
    - Configure sliding window algorithm
    - _Requirements: 4.1_
  - [x] 1.4 Write unit tests for rate limiter






    - Test rate limit enforcement
    - Test rate limit reset behavior
    - _Requirements: 4.1_

- [x] 2. Create input validation utilities




  - [x] 2.1 Create `lib/security/validation.ts` with URL and file validators



    - Implement `isInternalIP()` for SSRF prevention
    - Implement `isAllowedDomain()` for URL allowlist
    - Implement `validateFileUpload()` for file type validation
    - _Requirements: 3.3, 10.1, 10.2, 10.3_
  - [x] 2.2 Write property test for internal IP blocking






    - **Property 11: Internal IP Blocking**
    - **Validates: Requirements 10.2**
  - [x] 2.3 Write property test for file type validation






    - **Property 4: File Type Validation**
    - **Validates: Requirements 3.3**

- [x] 3. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Security Logger

- [x] 4. Create security logging system





  - [x] 4.1 Create `lib/security/logger.ts` with structured logging


    - Implement `logSecurityEvent()` function
    - Implement `formatStructuredLog()` for JSON output
    - Ensure sensitive data exclusion
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 2.4_
  - [x] 4.2 Write property test for security event logging format






    - **Property 10: Security Event Logging Format**
    - **Validates: Requirements 9.1, 9.4**
  - [x] 4.3 Write property test for sensitive data exclusion






    - **Property 12: Sensitive Data Log Exclusion**
    - **Validates: Requirements 2.4**

- [x] 5. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: HTML Sanitization Enhancement

- [-] 6. Enhance HTML sanitizer



  - [x] 6.1 Review and enhance `lib/sanitize.ts`



    - Verify XSS pattern coverage
    - Add additional dangerous patterns if needed
    - _Requirements: 3.2_
  - [x] 6.2 Write property test for HTML sanitization






    - **Property 3: HTML Sanitization Completeness**
    - **Validates: Requirements 3.2**

- [x] 7. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: API Security Enhancements

- [x] 8. Enhance API route security






  - [x] 8.1 Update middleware to apply security headers

    - Modify `middleware.ts` to include security headers
    - _Requirements: 5.1, 5.2_
  - [x] 8.2 Add rate limiting to sensitive endpoints


    - Apply rate limiting to auth and admin endpoints
    - _Requirements: 4.1_
  - [x] 8.3 Ensure consistent error messages for auth failures


    - Review and standardize auth error responses
    - _Requirements: 7.2_
  - [x] 8.4 Write property test for authentication error consistency






    - **Property 8: Authentication Error Consistency**
    - **Validates: Requirements 7.2**

- [x] 9. Enhance input validation in API routes






  - [x] 9.1 Add Zod schema validation to API routes

    - Ensure all endpoints validate input with Zod
    - _Requirements: 8.1_
  - [x] 9.2 Write property test for input schema validation






    - **Property 9: Input Schema Validation**
    - **Validates: Requirements 8.1**
  - [x] 9.3 Verify pagination limits are enforced


    - Check MAX_LIMIT is applied in all list endpoints
    - _Requirements: 4.3_
  - [x] 9.4 Write property test for pagination limit enforcement






    - **Property 5: Pagination Limit Enforcement**
    - **Validates: Requirements 4.3**

- [x] 10. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Access Control Verification

- [x] 11. Verify access control implementation





  - [x] 11.1 Audit all admin endpoints for proper auth checks


    - Verify `verifyAdminRole()` or `verifyEditorRole()` is called
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 11.2 Write property test for unauthenticated access rejection






    - **Property 1: Unauthenticated Access Rejection**
    - **Validates: Requirements 1.1**
  - [x] 11.3 Write property test for role-based access enforcement






    - **Property 2: Role-Based Access Enforcement**
    - **Validates: Requirements 1.2**


  - [x] 11.4 Verify unsupported HTTP methods return 405





    - Add method validation to API routes
    - _Requirements: 5.4_
  - [x] 11.5 Write property test for unsupported method rejection






    - **Property 7: Unsupported Method Rejection**
    - **Validates: Requirements 5.4**

- [x] 12. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Postman Collection Generation

- [x] 13. Create Postman Collection generator






  - [x] 13.1 Create `scripts/generate-postman.ts`

    - Implement collection structure following v2.1 schema
    - _Requirements: 11.1, 11.6_
  - [x] 13.2 Add Public API endpoints to collection

    - GET /api/posts
    - GET /api/posts/featured
    - GET /api/categories
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 13.3 Add Admin API endpoints to collection
    - Users: GET, POST /api/admin/users
    - Invitations: GET, POST, DELETE /api/admin/invitations
    - Media: GET, POST, DELETE /api/admin/media
    - Tags: GET /api/admin/tags
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 13.4 Add environment variables and authentication

    - Add {{baseUrl}}, {{authToken}} variables
    - Document auth header requirements
    - _Requirements: 11.4_

  - [x] 13.5 Add example responses for each endpoint
    - Include success and error response examples
    - _Requirements: 11.5_
  - [x] 13.6 Export collection to `docs/postman/newsloop-api.json`

    - Generate and save collection file
    - _Requirements: 11.6_

- [x] 14. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Security Audit Report

- [x] 15. Create Security Audit Report generator






  - [x] 15.1 Create `scripts/security-audit.ts`

    - Implement audit scanning logic
    - Categorize findings by OWASP Top 10
    - _Requirements: 12.1, 12.3_

  - [x] 15.2 Run dependency audit

    - Execute `bun audit` and capture results
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 15.3 Generate audit report markdown

    - Create `docs/security/SECURITY-AUDIT-REPORT.md`
    - Include findings, severity, and remediation steps
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 16. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
