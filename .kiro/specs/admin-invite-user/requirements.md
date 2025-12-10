# Requirements Document

## Introduction

ระบบ Admin Invite User สำหรับจัดการการเข้าถึง admin dashboard โดยไม่อนุญาตให้ผู้ใช้สมัครเอง ต้องได้รับการเชิญจาก admin เท่านั้น และ sync ข้อมูล user จาก Clerk เข้า database เพื่อใช้ในการจัดการ posts, media และ analytics

## Glossary

- **Admin Dashboard**: ระบบจัดการ blog สำหรับ admin และ editor
- **Clerk**: Third-party authentication service ที่ใช้จัดการ user authentication
- **Invitation**: การเชิญ user ใหม่เข้าระบบผ่าน email
- **Role**: สิทธิ์การเข้าถึงระบบ (ADMIN หรือ EDITOR)
- **User Sync**: การ synchronize ข้อมูล user จาก Clerk เข้า database
- **Webhook**: HTTP callback ที่ Clerk ส่งมาเมื่อมี event เกิดขึ้น

## Requirements

### Requirement 1

**User Story:** As an admin, I want to disable self-registration, so that only invited users can access the admin dashboard.

#### Acceptance Criteria

1. WHEN a user visits the sign-up page THEN the System SHALL redirect the user to the sign-in page
2. WHEN the sign-up route is accessed directly THEN the System SHALL return a redirect response to sign-in
3. WHEN Clerk is configured THEN the System SHALL disable public sign-up in Clerk settings

### Requirement 2

**User Story:** As an admin, I want to invite new users via email, so that I can control who has access to the admin dashboard.

#### Acceptance Criteria

1. WHEN an admin submits an invitation with a valid email and role THEN the System SHALL create an invitation in Clerk
2. WHEN an admin submits an invitation with an invalid email format THEN the System SHALL reject the request and display a validation error
3. WHEN an admin submits an invitation with an email that already exists THEN the System SHALL reject the request and display an error message
4. WHEN an invitation is created successfully THEN the System SHALL send an invitation email to the specified address
5. WHEN a non-admin user attempts to create an invitation THEN the System SHALL reject the request with an unauthorized error

### Requirement 3

**User Story:** As an admin, I want to manage pending invitations, so that I can track and revoke invitations if needed.

#### Acceptance Criteria

1. WHEN an admin views the users page THEN the System SHALL display a list of pending invitations with email, role, and created date
2. WHEN an admin revokes a pending invitation THEN the System SHALL delete the invitation from Clerk
3. WHEN an invitation is revoked THEN the System SHALL remove the invitation from the pending list immediately

### Requirement 4

**User Story:** As an invited user, I want to accept an invitation and create my account, so that I can access the admin dashboard.

#### Acceptance Criteria

1. WHEN an invited user clicks the invitation link THEN the System SHALL display the Clerk sign-up form
2. WHEN an invited user completes the sign-up process THEN the System SHALL create the user account with the assigned role
3. WHEN an invited user completes sign-up THEN the System SHALL redirect the user to the admin dashboard

### Requirement 5

**User Story:** As a system administrator, I want user data to sync from Clerk to the database, so that user information is available for posts and media relations.

#### Acceptance Criteria

1. WHEN a new user is created in Clerk THEN the System SHALL create a corresponding User record in the database
2. WHEN a user is created THEN the System SHALL store the Clerk user ID, email, firstName, lastName, imageUrl, and role
3. WHEN a user updates their profile in Clerk THEN the System SHALL update the corresponding User record in the database
4. WHEN a user is deleted from Clerk THEN the System SHALL handle the deletion appropriately based on existing relations
5. WHEN syncing user data THEN the System SHALL use Clerk webhooks for real-time synchronization
6. WHEN serializing user data for webhook processing THEN the System SHALL validate the data structure before database operations

### Requirement 6

**User Story:** As an admin, I want to manage user roles, so that I can control access levels for each user.

#### Acceptance Criteria

1. WHEN an admin views the users page THEN the System SHALL display all users with their current roles
2. WHEN an admin changes a user's role THEN the System SHALL update the role in both Clerk metadata and the database
3. WHEN an admin attempts to change their own role from admin THEN the System SHALL prevent the action if they are the last admin
4. WHEN a role is updated THEN the System SHALL reflect the change immediately in the user list

### Requirement 7

**User Story:** As an admin, I want to remove users from the system, so that I can revoke access when needed.

#### Acceptance Criteria

1. WHEN an admin deletes a user THEN the System SHALL remove the user from Clerk
2. WHEN a user is deleted and has no posts or media THEN the System SHALL delete the User record from the database
3. WHEN a user is deleted and has posts or media THEN the System SHALL reassign the content to another user or mark as orphaned
4. WHEN an admin attempts to delete themselves THEN the System SHALL prevent the action
