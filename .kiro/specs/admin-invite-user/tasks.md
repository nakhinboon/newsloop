# Implementation Plan

- [x] 1. Disable self-registration and clean up sign-up routes



  - [x] 1.1 Remove sign-up page and redirect to sign-in

    - Delete `app/(admin)/admin/sign-up` directory
    - Update middleware to redirect `/admin/sign-up` to `/admin/sign-in`
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Update sign-in page to remove sign-up link


    - Remove `signUpUrl` prop from SignIn component
    - _Requirements: 1.1_

- [x] 2. Implement User Sync Service with Clerk Webhooks


  - [x] 2.1 Create user sync service


    - Create `lib/admin/user-sync.ts` with syncUserFromClerk, updateUserFromClerk, handleUserDeletion functions
    - Implement data mapping from Clerk user to database User model
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 2.2 Write property test for user sync data mapping
    - **Property 3: User sync creates complete record**
    - **Validates: Requirements 5.1, 5.2**
  - [ ]* 2.3 Write property test for user sync update consistency
    - **Property 4: User sync update consistency**
    - **Validates: Requirements 5.3**
  - [x] 2.4 Update Clerk webhook handler


    - Update `app/api/webhooks/clerk/route.ts` to handle user.created, user.updated, user.deleted events
    - Add webhook signature verification with svix
    - Call user sync service functions based on event type
    - _Requirements: 5.1, 5.3, 5.4, 5.5_
  - [ ]* 2.5 Write property test for webhook payload validation
    - **Property 5: Webhook payload validation**
    - **Validates: Requirements 5.6**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Invitation Service



  - [x] 4.1 Create invitation service

    - Create `lib/admin/invitations.ts` with createInvitation, listPendingInvitations, revokeInvitation functions
    - Implement email validation
    - Integrate with Clerk invitations API
    - _Requirements: 2.1, 2.2, 2.3, 3.2_
  - [ ]* 4.2 Write property test for email validation
    - **Property 1: Invalid email rejection**
    - **Validates: Requirements 2.2**
  - [x] 4.3 Create invitation API routes


    - Create `app/api/admin/invitations/route.ts` for POST (create) and GET (list)
    - Create `app/api/admin/invitations/[id]/route.ts` for DELETE (revoke)
    - Add admin role authorization check
    - _Requirements: 2.1, 2.5, 3.1, 3.2_
  - [ ]* 4.4 Write property test for non-admin invitation rejection
    - **Property 2: Non-admin invitation rejection**
    - **Validates: Requirements 2.5**

- [-] 5. Implement User Management Service

  - [x] 5.1 Create user management service


    - Create `lib/admin/users.ts` with listUsers, updateUserRole, deleteUser, canDeleteUser, isLastAdmin functions
    - Implement last admin protection logic
    - Implement self-deletion prevention
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_
  - [ ]* 5.2 Write property test for last admin protection
    - **Property 6: Last admin protection**
    - **Validates: Requirements 6.3**
  - [ ]* 5.3 Write property test for self-deletion prevention
    - **Property 7: Self-deletion prevention**
    - **Validates: Requirements 7.4**
  - [x] 5.4 Create user management API routes


    - Create `app/api/admin/users/route.ts` for GET (list)
    - Create `app/api/admin/users/[id]/route.ts` for PATCH (update role) and DELETE
    - Add admin role authorization check
    - _Requirements: 6.1, 6.2, 7.1_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Admin UI Components



  - [x] 7.1 Create InviteUserDialog component


    - Create `components/admin/InviteUserDialog.tsx` with email input and role select
    - Add form validation and error handling
    - Integrate with invitation API
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Create UserManagementTable component

    - Create `components/admin/UserManagementTable.tsx` with user list and actions
    - Add role dropdown for each user
    - Add delete button with confirmation dialog
    - Show pending invitations section
    - _Requirements: 3.1, 6.1, 6.4_

  - [x] 7.3 Create Users management page

    - Create `app/(admin)/admin/users/page.tsx`
    - Integrate InviteUserDialog and UserManagementTable
    - Add to admin sidebar navigation
    - _Requirements: 3.1, 6.1_

- [ ] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
