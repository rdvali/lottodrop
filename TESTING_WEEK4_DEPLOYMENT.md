# Week 4 Cookie Authentication - Deployment Testing Guide

## 🎉 Deployment Status: SUCCESSFUL ✅

All Docker containers have been rebuilt and deployed with Week 4 security enhancements:

```
✅ Backend:  Up and healthy (with HttpOnly cookie authentication)
✅ Frontend: Up and healthy (with CSRF protection)
✅ Database: Running
✅ Redis:    Running
✅ Admin:    Running
```

---

## 🌐 Access URLs

- **Main App**: http://localhost
- **Backend API**: http://localhost:3001
- **Admin Panel**: http://localhost:81
- **Health Check**: http://localhost:3001/health

---

## 🔒 What Changed (Week 4 Security Enhancements)

### Before (Vulnerable):
```
❌ JWT tokens in localStorage (XSS vulnerable)
❌ Tokens accessible to JavaScript
❌ No CSRF protection
❌ WebSocket auth via handshake token
```

### After (Secure):
```
✅ JWT tokens in HttpOnly cookies (XSS protected)
✅ Tokens NOT accessible to JavaScript
✅ CSRF protection on all state-changing requests
✅ WebSocket auth via cookies
✅ SameSite=Strict for CSRF protection
```

---

## 🧪 Testing Instructions

### Step 1: Open the Application

Open your browser and navigate to:
```
http://localhost
```

### Step 2: Open Browser DevTools

Press `F12` or right-click → Inspect to open DevTools

### Step 3: Test Authentication

#### A. Register a New User

1. Click **"Sign Up"** or **"Register"**
2. Fill in the registration form:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: testuser@example.com
   - **Password**: TestPassword123!
3. Click **"Register"**

#### B. Verify HttpOnly Cookies (SECURITY TEST)

After registration/login, **immediately**:

1. In DevTools, go to **Application** tab → **Cookies** → `http://localhost`
2. Look for these cookies:

   ```
   ✅ accessToken  - HttpOnly: YES ✓, Secure: NO (localhost), SameSite: Strict
   ✅ refreshToken - HttpOnly: YES ✓, Secure: NO (localhost), SameSite: Strict
   ```

3. **CRITICAL**: Verify the **HttpOnly** checkbox is CHECKED ✓

   **If HttpOnly is checked**: ✅ **SECURE** - Tokens cannot be accessed by JavaScript
   **If HttpOnly is unchecked**: ❌ **VULNERABLE** - XSS attack possible

#### C. Test XSS Protection (SECURITY TEST)

While still logged in:

1. In DevTools, go to **Console** tab
2. Try to access the token:

   ```javascript
   // Try to read cookies via JavaScript
   document.cookie
   ```

3. **Expected Result**: You should NOT see `accessToken` or `refreshToken` in the output

   ```
   ✅ SECURE: "csrfToken=xyz..." (only non-HttpOnly cookies visible)
   ❌ VULNERABLE: "accessToken=...; refreshToken=..." (if you see these, there's a problem)
   ```

4. Try to access localStorage:

   ```javascript
   // Try to read token from localStorage
   localStorage.getItem('token')
   ```

5. **Expected Result**: `null`

   ```
   ✅ SECURE: null (no token in localStorage)
   ❌ VULNERABLE: "eyJhbGciOiJIUzI1N..." (if you see a JWT, there's a problem)
   ```

### Step 4: Test CSRF Protection

#### A. Monitor Network Requests

1. In DevTools, go to **Network** tab
2. Clear existing requests (trash icon)
3. Perform a state-changing action (e.g., join a game room, update profile)
4. Find a POST/PUT/PATCH/DELETE request in the Network tab
5. Click on it → **Headers** tab
6. Scroll to **Request Headers**
7. Look for:

   ```
   ✅ X-CSRF-Token: <some-token-value>
   ✅ Cookie: accessToken=...; refreshToken=...
   ```

**Expected Result**: All state-changing requests should have BOTH:
- `X-CSRF-Token` header
- `Cookie` header with authentication cookies

### Step 5: Test Session Persistence

1. While logged in, refresh the page (`Ctrl+R` or `F5`)
2. **Expected Result**: You should remain logged in (balance visible)
3. **How it works**: Browser automatically sends HttpOnly cookies with every request

### Step 6: Test Logout

1. Click **"Logout"** button
2. In DevTools → **Application** → **Cookies**
3. **Expected Result**: `accessToken` and `refreshToken` cookies should be removed or have empty values

### Step 7: Test WebSocket Authentication

1. Log in to the application
2. Navigate to a game room (e.g., http://localhost/rooms)
3. Join a room
4. In DevTools → **Network** → **WS** (WebSocket) tab
5. Click on the WebSocket connection
6. **Expected Result**: Connection should establish successfully using cookies (not visible in headers, but authenticated on backend)

---

## 🔍 Advanced Testing (Optional)

### Test Concurrent Sessions

1. **Browser 1**: Chrome - Log in as User A
2. **Browser 2**: Firefox (or Chrome Incognito) - Log in as User B
3. **Verify**: Both sessions should work independently
4. **Check**: Different `accessToken` values in each browser's cookies

### Test Expired Cookie

1. Log in
2. In DevTools → **Application** → **Cookies**
3. Find `accessToken` cookie
4. **Edit** the cookie and set `Expires` to a past date
5. Refresh the page
6. **Expected Result**: Should be logged out (redirected to login)

### Test Cookie Manipulation

1. Log in
2. In DevTools → **Application** → **Cookies**
3. Find `accessToken` cookie
4. **Edit** the Value to random text: `invalid-token-123`
5. Try to navigate to a protected page
6. **Expected Result**: Should be logged out or see authentication error

---

## 📊 Expected Behavior Checklist

Use this checklist to verify Week 4 security is working:

### Authentication Flow
- [ ] Registration works and sets HttpOnly cookies
- [ ] Login works and sets HttpOnly cookies
- [ ] Cookies have `HttpOnly=true` flag
- [ ] Cookies have `SameSite=Strict` attribute
- [ ] Logout clears all authentication cookies

### XSS Protection
- [ ] `document.cookie` does NOT show accessToken/refreshToken
- [ ] `localStorage.getItem('token')` returns `null`
- [ ] No token visible in window object

### CSRF Protection
- [ ] POST requests include `X-CSRF-Token` header
- [ ] PUT requests include `X-CSRF-Token` header
- [ ] PATCH requests include `X-CSRF-Token` header
- [ ] DELETE requests include `X-CSRF-Token` header
- [ ] GET requests do NOT include CSRF token (not needed)

### Session Management
- [ ] Session persists after page refresh
- [ ] Session cleared after logout
- [ ] Expired cookies handled gracefully
- [ ] Invalid cookies handled gracefully

### WebSocket
- [ ] WebSocket connects successfully after login
- [ ] WebSocket uses cookies (not manual token passing)
- [ ] WebSocket receives authenticated events

---

## 🐛 Troubleshooting

### Issue: Cookies Not Being Set

**Symptoms**: No `accessToken` or `refreshToken` in Application → Cookies

**Solutions**:
1. Check backend logs: `docker logs lottodrop-backend --tail 50`
2. Verify login request succeeded (200 OK response)
3. Clear all cookies and try again
4. Check CORS settings in network request headers

### Issue: HttpOnly Flag Not Set

**Symptoms**: Cookies visible via `document.cookie`

**Solutions**:
1. Verify you're testing on `http://localhost` (not `127.0.0.1`)
2. Check backend cookie manager settings
3. Restart backend: `docker-compose restart backend`

### Issue: CSRF Token Missing

**Symptoms**: State-changing requests return 403 Forbidden

**Solutions**:
1. Check console for CSRF manager errors
2. Verify you're logged in
3. Clear browser cache and cookies
4. Check Network tab for `/auth/csrf-token` request

### Issue: Not Staying Logged In After Refresh

**Symptoms**: Logged out after page reload

**Solutions**:
1. Check if cookies have expiry dates (Application → Cookies)
2. Verify cookies are not being blocked by browser
3. Check browser console for authentication errors
4. Verify backend `/auth/profile` endpoint works

---

## 📸 Screenshots Guide

### 1. HttpOnly Cookie Verification

In Chrome DevTools:
```
Application Tab
  → Storage
    → Cookies
      → http://localhost

Look for:
Name: accessToken
Value: eyJhbGciOiJI...
Domain: localhost
Path: /
Expires: (future date)
HttpOnly: ✓ (checked)  ← THIS IS CRITICAL
Secure: (unchecked - OK for localhost)
SameSite: Strict
```

### 2. CSRF Token in Request Headers

In Chrome DevTools:
```
Network Tab
  → Select a POST/PUT/PATCH/DELETE request
    → Headers subtab
      → Request Headers

Look for:
X-CSRF-Token: a1b2c3d4e5f6...
Cookie: accessToken=...; refreshToken=...
```

### 3. Console Test Results

In Chrome DevTools Console:
```javascript
> document.cookie
< "csrfToken=xyz123..." // accessToken should NOT be here ✓

> localStorage.getItem('token')
< null // Should be null ✓

> localStorage
< Storage {length: 1} // Only 'user' data, no token ✓
```

---

## 🎯 Success Criteria

**Week 4 security is working correctly if:**

1. ✅ HttpOnly cookies are set on login
2. ✅ Tokens are NOT accessible via JavaScript
3. ✅ CSRF tokens are sent with state-changing requests
4. ✅ WebSocket authentication works with cookies
5. ✅ Session persists across page reloads
6. ✅ Logout clears all cookies
7. ✅ Multiple sessions work independently

---

## 📞 Support

If you encounter issues:

1. **Check Docker Logs**:
   ```bash
   docker logs lottodrop-backend --tail 100
   docker logs lottodrop-frontend --tail 100
   ```

2. **Restart Containers**:
   ```bash
   docker-compose restart backend frontend
   ```

3. **Rebuild If Needed**:
   ```bash
   docker-compose build backend frontend
   docker-compose up -d backend frontend
   ```

4. **Check Container Health**:
   ```bash
   docker ps
   ```

---

## 🎉 Next Steps

After verifying Week 4 security:

1. **Run E2E Tests**:
   ```bash
   cd frontend
   npm run test:e2e -- auth-cookie-security
   ```

2. **Production Deployment**:
   - Enable `Secure` flag for HTTPS
   - Set `NODE_ENV=production`
   - Review CORS settings for production domain

3. **Security Audit**:
   - Run OWASP ZAP scan
   - Test with Burp Suite
   - Verify all Week 4 security enhancements

---

**Deployment Date**: October 28, 2025
**Version**: Week 4 - Cookie Authentication with CSRF Protection
**Status**: ✅ DEPLOYED AND READY FOR TESTING

Enjoy testing the enhanced security! 🔒🎉
