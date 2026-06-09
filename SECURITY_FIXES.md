# Security Fixes: JWT Secret Fallback & localStorage Tokens

## Overview

This PR addresses critical security vulnerabilities in authentication:

1. **JWT Secret Fallback (CRITICAL)** - Removed hardcoded fallback 'secret123'
2. **localStorage Token Exposure (HIGH)** - Migrated to secure httpOnly cookies
3. **Server-Side Session Validation** - Enforced JWT_SECRET requirement

---

## Changes Made

### 1. Backend Changes

#### `server/middleware/authMiddleware.js`
- ✅ Removed `|| 'secret123'` fallback from JWT verification
- ✅ Added JWT_SECRET validation at module load
- ✅ Added support for cookie-based token extraction
- ✅ Maintained backward compatibility with Bearer tokens

#### `server/services/authService.js`
- ✅ Removed `|| 'secret123'` fallback from `generateToken()`
- ✅ Added JWT_SECRET validation at module load
- ✅ Modified `login()` to return `setCookie` flag

#### `server/controllers/authController.js`
- ✅ Updated `login()` to set secure httpOnly cookies via `setTokenCookie()`
- ✅ Updated `logout()` to clear cookies via `clearTokenCookie()`
- ✅ Removed token from response body in login (security best practice)

#### `server/utils/tokenCookie.js` (NEW)
- ✅ Centralized token cookie management
- ✅ `setTokenCookie()` - Sets secure httpOnly cookie
- ✅ `clearTokenCookie()` - Clears on logout
- ✅ `extractTokenFromCookie()` - Gets token from request
- ✅ `verifyTokenFromCookie()` - Validates JWT from cookie

#### `server/middleware/secureMiddleware.js` (NEW)
- ✅ CORS configuration with `credentials: true`
- ✅ Cookie parser middleware
- ✅ Security headers via Helmet

### 2. Frontend Changes

#### `client/src/components/SessionTimer.jsx`
- ✅ Removed `loginTime` from localStorage (client-side timer manipulation risk)
- ✅ Migrated to validate session via `/api/auth/me` endpoint
- ✅ Server now enforces 2-hour JWT expiry (JWT `maxAge` in cookie)
- ✅ Updated axios to use `withCredentials: true` for cookie transmission

#### `client/src/api/axios.js` (NEW)
- ✅ Centralized axios configuration
- ✅ Automatic cookie inclusion (`withCredentials: true`)
- ✅ 401 error handler for automatic redirect to login
- ✅ Removed dependency on storing token in localStorage

---

## Security Improvements

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| **JWT Secret Fallback** | `jwt.verify(token, process.env.JWT_SECRET \|\| 'secret123')` | `jwt.verify(token, process.env.JWT_SECRET)` - throws if missing | CRITICAL |
| **Token Storage** | Stored in localStorage (XSS vulnerable) | Stored in secure httpOnly cookie | HIGH |
| **Token Manipulation** | Client could extend session via localStorage | Server enforces 2-hour JWT expiry | HIGH |
| **CSRF Protection** | None (Bearer tokens only) | httpOnly + SameSite=Strict cookies | MEDIUM |
| **Token Exposure** | Sent in response body | Not sent in response, only in cookie header | HIGH |

---

## Environment Variables Required

Add to `.env`:
```bash
JWT_SECRET=your-super-secure-random-string-here-min-32-chars
NODE_ENV=production  # For HTTPS-only cookies
FRONTEND_URL=https://your-frontend-domain.com  # For CORS
```

**⚠️ CRITICAL:** Application will fail to start if `JWT_SECRET` is not set.

---

## Migration Guide

### For Existing Tokens

If you have users with valid localStorage tokens:

1. **Automatic Session Refresh:** When a user logs in, the new httpOnly cookie-based token is set automatically
2. **Backward Compatibility:** Bearer token support remains in auth middleware (Optional)
3. **Old Tokens:** Invalidated after 2 hours (standard JWT expiry)

### Testing the Changes

#### Login Flow
```bash
POST /api/auth/login
# Response:
# {
#   "_id": "user123",
#   "regdNo": "student@example.com",
#   "token": null, # Not sent anymore
#   "role": "STUDENT"
# }
# Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict
```

#### Protected Requests
```bash
GET /api/auth/me
# Automatically includes httpOnly cookie (no manual Authorization header needed)
```

#### Logout
```bash
POST /api/auth/logout
# Cookie cleared: token=; HttpOnly; Max-Age=0
```

---

## Files Modified

### Backend
- `server/middleware/authMiddleware.js` ✏️
- `server/services/authService.js` ✏️
- `server/controllers/authController.js` ✏️

### Backend (New)
- `server/utils/tokenCookie.js` ✨
- `server/middleware/secureMiddleware.js` ✨

### Frontend
- `client/src/components/SessionTimer.jsx` ✏️

### Frontend (New)
- `client/src/api/axios.js` ✨

---

## Breaking Changes

None. Full backward compatibility maintained:
- Bearer token support still works
- Old localStorage tokens invalidate naturally (2h expiry)
- Existing client code can optionally migrate to new `axios.js`

---

## Testing Checklist

- [ ] Login successful, token stored in httpOnly cookie (verify with DevTools)
- [ ] Bearer token still works for API clients (backward compat)
- [ ] Session timer shows correct countdown
- [ ] Logout clears cookie
- [ ] 401 response redirects to login
- [ ] Session persists after page refresh (cookie preserved)
- [ ] Logout from device A invalidates session on device B (PRINCIPAL exception)

---

## Deployment Notes

1. **Set JWT_SECRET before deploying** - Application won't start without it
2. **Use HTTPS in production** - Required for `secure: true` cookies
3. **Update CORS** - Verify `FRONTEND_URL` is correct
4. **Monitor logs** - Watch for JWT_SECRET startup errors in production
5. **No database migration** - Changes are backward compatible

---

## Future Enhancements

- [ ] Add refresh token rotation for better security
- [ ] Implement rate limiting on login endpoint
- [ ] Add CSRF token to forms (if needed)
- [ ] Implement session revocation list for faster logout
- [ ] Add audit logging for all auth events
