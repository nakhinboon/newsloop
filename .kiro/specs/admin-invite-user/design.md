# Design Document: Admin Invite User

## Overview

ระบบ Admin Invite User ออกแบบมาเพื่อจำกัดการเข้าถึง admin dashboard โดยใช้ invitation-only model ระบบจะ integrate กับ Clerk สำหรับ authentication และ invitation management พร้อม sync ข้อมูล user เข้า PostgreSQL database ผ่าน webhooks

## Architecture

```mermaid
flowchart TB
    subgraph Client
        UI[Admin UI]
        InviteForm[Invite Form]
        UserList[User Management]
    end
    
    subgraph "Next.js API"
        InviteAPI[/api/admin/invitations]
        UserAPI[/api/admin/users]
        WebhookAPI[/api/webhooks/clerk]
    end
    
    subgraph "External Services"
        Clerk[Clerk API]
        ClerkWebhook[Clerk Webhooks]
    end
    
    subgraph Database
        UserTable[(User Table)]
    end
    
    UI --> InviteForm
    UI --> UserList
    InviteForm --> InviteAPI
    UserList --> UserAPI
    InviteAPI --> Clerk
    UserAPI --> Clerk
    UserAPI --> UserTable
    ClerkWebhook --> WebhookAPI
    WebhookAPI --> UserTable
```

## Components and Interfaces

### 1. Invitation Service (`lib/admin/invitations.ts`)

```typescript
interface InvitationInput {
  email: string;
  role: 'ADMIN' | 'EDITOR';
}

interface Invitation {
  id: string;
  emailAddress: string;
  role: 'ADMIN' | 'EDITOR';
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: Date;
  expiresAt: Date;
}

// Functions
createInvitation(input: InvitationInput): Promise<Invitation>
listPendingInvitations(): Promise<Invitation[]>
revokeInvitation(invitationId: string): Promise<void>
```

### 2. User Sync Service (`lib/admin/user-sync.ts`)

```typescript
interface ClerkUserData {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  publicMetadata: { role?: 'ADMIN' | 'EDITOR' };
}

// Functions
syncUserFromClerk(clerkUser: ClerkUserData): Promise<User>
updateUserFromClerk(clerkUser: ClerkUserData): Promise<User>
handleUserDeletion(clerkUserId: string): Promise<void>
```

### 3. User Management Service (`lib/admin/users.ts`)

```typescript
interface UserWithStats {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: Role;
  createdAt: Date;
  postCount: number;
  mediaCount: number;
}

// Functions
listUsers(): Promise<UserWithStats[]>
updateUserRole(userId: string, role: Role): Promise<User>
deleteUser(userId: string, reassignTo?: string): Promise<void>
canDeleteUser(userId: string, currentUserId: string): Promise<boolean>
isLastAdmin(userId: string): Promise<boolean>
```

### 4. API Routes

#### POST `/api/admin/invitations`
- Create new invitation
- Requires admin role
- Body: `{ email: string, role: 'ADMIN' | 'EDITOR' }`

#### GET `/api/admin/invitations`
- List pending invitations
- Requires admin role

#### DELETE `/api/admin/invitations/[id]`
- Revoke invitation
- Requires admin role

#### GET `/api/admin/users`
- List all users with stats
- Requires admin role

#### PATCH `/api/admin/users/[id]`
- Update user role
- Requires admin role
- Body: `{ role: 'ADMIN' | 'EDITOR' }`

#### DELETE `/api/admin/users/[id]`
- Delete user
- Requires admin role
- Query: `?reassignTo=userId` (optional)

#### POST `/api/webhooks/clerk`
- Handle Clerk webhooks
- Events: `user.created`, `user.updated`, `user.deleted`

### 5. UI Components

#### InviteUserDialog (`components/admin/InviteUserDialog.tsx`)
- Form with email input and role select
- Validation feedback
- Success/error toast notifications

#### UserManagementTable (`components/admin/UserManagementTable.tsx`)
- Table showing all users
- Role dropdown for each user
- Delete button with confirmation
- Pending invitations section

## Data Models

### User (existing - no changes needed)

```prisma
model User {
  id        String   @id // Clerk user ID
  email     String   @unique
  firstName String?
  lastName  String?
  imageUrl  String?
  role      Role     @default(EDITOR)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  posts     Post[]
  media     Media[]
}

enum Role {
  ADMIN
  EDITOR
}
```

### Webhook Payload Types

```typescript
interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: ClerkUserData;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Invalid email rejection
*For any* string that does not match a valid email format, the invitation creation function SHALL reject the input with a validation error.
**Validates: Requirements 2.2**

### Property 2: Non-admin invitation rejection
*For any* user without the ADMIN role, attempting to create an invitation SHALL result in an unauthorized error.
**Validates: Requirements 2.5**

### Property 3: User sync creates complete record
*For any* valid Clerk user webhook payload, syncing to the database SHALL create a User record containing all required fields (id, email, firstName, lastName, imageUrl, role).
**Validates: Requirements 5.1, 5.2**

### Property 4: User sync update consistency
*For any* valid Clerk user update webhook payload, the corresponding database User record SHALL be updated to match the Clerk data.
**Validates: Requirements 5.3**

### Property 5: Webhook payload validation
*For any* webhook payload, the system SHALL validate the data structure and reject malformed payloads before attempting database operations.
**Validates: Requirements 5.6**

### Property 6: Last admin protection
*For any* admin user who is the only admin in the system, attempting to change their role to EDITOR SHALL be prevented.
**Validates: Requirements 6.3**

### Property 7: Self-deletion prevention
*For any* admin user, attempting to delete their own account SHALL be prevented.
**Validates: Requirements 7.4**

## Error Handling

### Invitation Errors
- **Invalid email**: Return 400 with validation message
- **Duplicate email**: Return 409 with conflict message
- **Clerk API error**: Return 500 with generic error, log details
- **Unauthorized**: Return 403 with permission denied message

### Webhook Errors
- **Invalid signature**: Return 400, do not process
- **Malformed payload**: Return 400, log for debugging
- **Database error**: Return 500, Clerk will retry

### User Management Errors
- **User not found**: Return 404
- **Last admin protection**: Return 400 with specific message
- **Self-deletion**: Return 400 with specific message
- **Content reassignment required**: Return 400 with list of affected content

## Testing Strategy

### Unit Testing
- Test email validation function with valid/invalid inputs
- Test role permission checks
- Test last admin detection logic
- Test user data mapping from Clerk to database format

### Property-Based Testing
Using **fast-check** library for property-based tests:

1. **Email validation property**: Generate random strings and verify invalid emails are rejected
2. **Authorization property**: Generate users with different roles and verify only admins can invite
3. **User sync property**: Generate valid Clerk user payloads and verify complete database records
4. **Webhook validation property**: Generate malformed payloads and verify rejection
5. **Last admin property**: Generate scenarios with single admin and verify protection
6. **Self-deletion property**: Generate admin users and verify self-deletion is blocked

### Integration Testing
- Test full invitation flow with Clerk API (mocked)
- Test webhook processing end-to-end
- Test role update syncing between Clerk and database
