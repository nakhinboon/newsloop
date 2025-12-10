export {
  getCurrentUser,
  getCurrentUserId,
  isAuthenticated,
  isAdmin,
  isEditor,
  getUserRole,
  requireAuth,
  isValidClerkUserId,
  extractRoleFromMetadata,
  isAdminRole,
  hasEditorOrHigherRole,
  transformClerkUserData,
  isValidClerkUser,
  type ClerkUser,
  type RawClerkUserData,
} from './clerk';

export {
  requireAdmin,
  requireEditor,
  verifyAdminRole,
  verifyEditorRole,
  checkIsAdmin,
  checkIsEditor,
  getUserRoleFromClerk,
  hasMinimumRole,
  type Role,
} from './roles';

export {
  isAdminRoute,
  isSignInRoute,
  getAuthRedirectUrl,
  determineRouteAccess,
  SIGN_IN_ROUTE,
  type RouteAccessResult,
} from './routes';
