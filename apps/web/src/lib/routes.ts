/**
 * Centralized client-facing route constants.
 *
 * Keeping them here prevents string drift across the marketing landing page,
 * auth CTAs, and the auth context. The underlying route files themselves are
 * the source of truth (`src/app/login/page.tsx`, etc.).
 */
export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  changePassword: "/change-password",
} as const;
