# Monash College API — Frontend Developer Guide

This guide explains how to integrate your frontend (React, Vue, Angular, or any SPA) with the Monash College Management System backend API so you can build a complete fullstack application.

---

## Table of contents

1. [Base URL & environment](#1-base-url--environment)
2. [CORS and credentials](#2-cors-and-credentials)
3. [Response format](#3-response-format)
4. [Authentication](#4-authentication)
5. [Error handling](#5-error-handling)
6. [Endpoints reference](#6-endpoints-reference)
7. [File uploads](#7-file-uploads)
8. [Pagination](#8-pagination)
9. [Role-based access](#9-role-based-access)
10. [Best practices](#10-best-practices)
11. [Quick reference](#11-quick-reference)

---

## 1. Base URL and environment

- **Base URL:** All API routes are under `/api`.  
  - Local: `http://localhost:<PORT>/api` (e.g. `http://localhost:4000/api`)  
  - Production: `https://your-domain.com/api`
- **Health check:** `GET /api/health` — returns `{ status, database, timestamp }`. Use this to verify the API is up.
- **Welcome:** `GET /api` — returns `{ message, version, timestamp }`.

Use an environment variable in your frontend (e.g. `VITE_API_URL` or `REACT_APP_API_URL`) and prefix every request with it.

---

## 2. CORS and credentials

- The API allows origins: `http://localhost:3000` and `http://localhost:5173` (typical Vite/React dev servers).
- **Credentials:** The API uses **cookies** for the refresh token. You **must** send credentials on every request:
  - `fetch`: use `credentials: 'include'`
  - Axios: use `withCredentials: true`
- For production, the backend must add your frontend origin to the CORS config.

---

## 3. Response format

Every JSON response (except health and welcome) follows one of these shapes.

### Success (2xx)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Login successful",
  "data": { ... }
}
```

- **Paginated list:** Same as above, plus `meta` and `links`:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Students retrieved successfully",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "links": {
    "self": "/api/students?page=1&limit=10",
    "next": "/api/students?page=2&limit=10",
    "prev": null,
    "first": "/api/students?page=1&limit=10",
    "last": "/api/students?page=5&limit=10"
  }
}
```

### Error (4xx / 5xx)

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR_400",
  "timestamp": "2026-03-08T12:00:00.000Z",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

- **Validation errors:** Use the `errors` array to show field-level messages in your forms.
- **No body (204):** Some `DELETE` endpoints return `204 No Content` with no JSON. Treat as success.

**Rule:** Always check `response.success` (or `statusCode < 400`) to decide whether to use `data` or show `message` and `errors`.

---

## 4. Authentication

The API uses **JWT access tokens** (Bearer) + **refresh token in an httpOnly cookie**.

### 4.1 Register

```http
POST /api/auth/register
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Ahmad Ali",
  "email": "ahmad@example.com",
  "password": "SecurePass1!",
  "confirmPassword": "SecurePass1!",
  "studentNumber": "MC12345"
}
```

- `studentNumber` is **optional**. If provided, user is created as STUDENT and linked to a course (prefix from student number).
- **Password rules:** Min 8 chars, at least one uppercase, one lowercase, one digit, one special character.

**Response (201):** `{ statusCode, success, message, data: { email, name } }`  
After registration, the user must **verify email** (link sent by the API). Until then, login will return 403 with message to verify email.

### 4.2 Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Body:**

```json
{
  "email": "ahmad@example.com",
  "password": "SecurePass1!"
}
```

**Response (200):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "uuid",
      "email": "ahmad@example.com",
      "name": "Ahmad Ali",
      "type": "STUDENT",
      "status": "ACTIVE",
      "isEmailVerified": true,
      "profile": { ... },
      "student": { ... },
      "lecturer": null,
      "headLecturer": null
    }
  }
}
```

- The **refresh token** is set in an **httpOnly cookie** by the server. You do not read or send it manually; the browser sends it automatically when `credentials: 'include'` (or `withCredentials: true`) is set.

**What to do on the frontend:**

1. Store `data.accessToken` in memory or a non-httpOnly storage (e.g. state, or a short-lived cookie you control).
2. Store `data.user` (or minimal user info) for UI (name, type, etc.).
3. Send the access token on every authenticated request (see below).

### 4.3 Sending the access token

For every protected request, add the header:

```http
Authorization: Bearer <accessToken>
```

Example with fetch:

```js
fetch(`${API_URL}/api/me/student`, {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
})
```

Example with Axios:

```js
axios.get(`${API_URL}/api/me/student`, {
  withCredentials: true,
  headers: { 'Authorization': `Bearer ${accessToken}` },
})
```

### 4.4 Refresh token (get new access token)

When the access token expires (or you get `401`), call:

```http
POST /api/auth/refresh
(no body; cookie is sent automatically)
```

**Response (200):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

- Update your stored `accessToken` with `data.accessToken`.
- If you get 401 on refresh, redirect the user to login.

### 4.5 Logout

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

- Clears the refresh cookie and blacklists the current access token. Clear your stored token and user on the frontend.

### 4.6 Verify email

User clicks the link in the verification email. Link format:

```
GET /api/auth/verify-email?token=<token>
```

**Response (200):** Same shape as login (`accessToken` + `user`). Optionally set the access token and user in your app and redirect to dashboard.

### 4.7 Resend verification email

```http
POST /api/auth/resend-verification
Content-Type: application/json

{ "email": "user@example.com" }
```

### 4.8 Forgot password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "user@example.com" }
```

API sends a reset link by email. No token in response.

### 4.9 Reset password

User opens the link from email (e.g. your frontend reset page with `?token=...`). Then:

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "<from query param>",
  "password": "NewSecure1!",
  "confirmPassword": "NewSecure1!"
}
```

### 4.10 Get current user (profile)

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

Returns full user with profile, student/lecturer/headLecturer. Use for “profile” or “me” screen.

### 4.11 Update profile (name, profile, password)

```http
PATCH /api/auth/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "name": "New Name" }
```

```http
PATCH /api/auth/me/profile
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "phoneNumber": "+60123456789",
  "gender": "Male",
  "race": "Malay",
  "dateOfBirth": "2000-01-15",
  "streetOne": "123 Jalan ABC",
  "streetTwo": "Apt 4",
  "postcode": "50000",
  "city": "Kuala Lumpur",
  "state": "KualaLumpur"
}
```

- **Phone number rules:** The backend accepts common Malaysian formats (e.g. `018-9192276`, `+60 18 919 2276`) and **normalizes** them to `+60XXXXXXXXX` (E.164-style). Store and search using this normalized value.

```http
PATCH /api/auth/me/password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "OldPass1!",
  "newPassword": "NewPass1!",
  "confirmPassword": "NewPass1!"
}
```

---

## 5. Error handling

- **statusCode:** HTTP status (400, 401, 403, 404, 409, 423, 429, 500).
- **errorCode:** Machine-readable code (e.g. `VALIDATION_ERROR_400`, `UNAUTHORIZED_401`, `EMAIL_NOT_VERIFIED_403`).
- **errors:** Array of `{ field, message }` for validation; use for form errors.

**Common error codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR_400` | 400 | Invalid body/params/query; check `errors` |
| `UNAUTHORIZED_401` | 401 | No/invalid token or blacklisted — try refresh or re-login |
| `INVALID_CREDENTIALS_401` | 401 | Wrong email/password |
| `EMAIL_NOT_VERIFIED_403` | 403 | User must verify email first |
| `ACCOUNT_INACTIVE_403` | 403 | Account disabled |
| `FORBIDDEN_403` | 403 | Valid user but not allowed for this action (role) |
| `RESOURCE_NOT_FOUND_404` | 404 | Route or resource not found |
| `RATE_LIMIT_429` | 429 | Too many requests; retry later |
| `ACCOUNT_LOCKED_423` | 423 | Too many failed logins; wait before retry |

**Recommended flow:**

1. On any request: if `statusCode === 401`, try refresh once; if refresh fails, redirect to login.
2. On 403: show “You don’t have permission” (and optionally hide/disable the action).
3. On 400 with `errors`: map `errors` to form fields.
4. On 429: show “Too many requests, try again later.”

---

## 6. Endpoints reference

Base path for all: **`/api`**. All protected routes need `Authorization: Bearer <accessToken>` and `credentials: 'include'` (or `withCredentials: true`).

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Welcome |
| GET | `/health` | Health + DB status |
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token (uses cookie) |
| GET | `/auth/verify-email?token=` | Verify email |
| POST | `/auth/resend-verification` | Resend verification email |
| POST | `/auth/forgot-password` | Forgot password |
| POST | `/auth/reset-password` | Reset password |

### Auth required (any role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/enums` | Get enums (genders, races, states, fileCategories, userTypes, userStatuses) |
| GET | `/auth/me` | Current user profile |
| PATCH | `/auth/me` | Update name |
| PATCH | `/auth/me/profile` | Update profile |
| PATCH | `/auth/me/password` | Change password |
| POST | `/auth/logout` | Logout |

### Role-specific: STUDENT

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me/student` | My student record |
| PATCH | `/me/student` | Update my student (e.g. mykadNumber) |
| GET | `/me/course` | My course |
| GET | `/me/documents` | My documents |
| POST | `/me/documents` | Upload my document (multipart + `category`) |

### Role-specific: LECTURER

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me/lecturer` | My lecturer record |
| PATCH | `/me/lecturer` | Update my lecturer (e.g. mykadNumber) |
| GET | `/me/students` | Students in my course (paginated) |
| GET | `/me/documents` | My documents |
| POST | `/me/documents` | Upload my document |
| GET | `/students` | List students (paginated, filters) |
| GET | `/students/:studentId` | Get student by ID |
| GET | `/courses` | List courses |
| GET | `/courses/:courseId` | Get course by ID |
| GET | `/students/:studentId/documents` | List student documents |
| POST | `/lecturers/:lecturerId/documents` | Upload document for lecturer |
| GET | `/lecturers/:lecturerId/documents` | List lecturer documents |

### Role-specific: HEAD_LECTURER

All Lecturer routes plus:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard stats (counts, studentsByCourse, recentRegistrations) |
| POST | `/students` | Create student |
| PATCH | `/students/:studentId` | Update student |
| DELETE | `/students/:studentId` | Delete student (soft) |
| POST | `/courses` | Create course |
| PATCH | `/courses/:courseId` | Update course |
| DELETE | `/courses/:courseId` | Delete course |
| GET | `/lecturers` | List lecturers |
| GET | `/lecturers/:lecturerId` | Get lecturer |
| POST | `/lecturers` | Create lecturer |
| PATCH | `/lecturers/:lecturerId` | Update lecturer |
| DELETE | `/lecturers/:lecturerId` | Delete lecturer (soft) |
| GET | `/head-lecturers` | List head lecturers |
| GET | `/head-lecturers/:headLecturerId` | Get head lecturer |
| POST | `/head-lecturers` | Create head lecturer |
| PATCH | `/head-lecturers/:headLecturerId` | Update head lecturer |
| DELETE | `/head-lecturers/:headLecturerId` | Delete head lecturer (soft) |
| POST | `/students/:studentId/documents` | Upload student document |
| POST | `/head-lecturers/:headLecturerId/documents` | Upload head lecturer document |
| GET | `/head-lecturers/:headLecturerId/documents` | List head lecturer documents |
| DELETE | `/documents/:documentId` | Delete document (soft) |

---

## 7. File uploads

- Use **`multipart/form-data`**.
- **Field name for the file:** `file`.
- **Category:** Send in the **body** as form field `category`. Allowed: `PROFILE_PICTURE`, `IC`, `TRANSCRIPT`, `DOCUMENT`, `OTHER`.

Example (FormData):

```js
const formData = new FormData()
formData.append('category', 'DOCUMENT') // IMPORTANT: append category BEFORE file
formData.append('file', fileInput.files[0])

fetch(`${API_URL}/api/me/documents`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData,
})
```

- **Allowed types:** Images (JPEG, PNG, WebP) and PDF. Max size **10 MB** for all categories.
- **Storage paths (backend detail):** `PROFILE_PICTURE` files go under `uploads/profiles/YYYY/MM/DD`, other categories under `uploads/documents/YYYY/MM/DD`.
- **Uploaded file URL:** The API returns the created document with `fileUrl`; you can use it to display or link the file. Static files are served under `/uploads/...` (same origin as API).

---

## 8. Pagination

List endpoints accept query params:

- **`page`** — default `1`
- **`limit`** — default `10`, max `100`
- **`search`** — optional search string (where supported)
- **`sortBy`** — optional (e.g. `createdAt`, `studentNumber`, `name` for students)
- **`order`** — `asc` or `desc`, default `desc`

Example:

```
GET /api/students?page=2&limit=20&search=ali&sortBy=name&order=asc
```

Response includes `meta` and `links` (see [Response format](#3-response-format)). Use `meta.hasNext` / `meta.hasPrev` and `links.next` / `links.prev` for “Next/Previous” buttons or infinite scroll. The `links.*` URLs preserve any filters you passed (e.g. `search`, `gender`, `courseCode`).

---

## 9. Role-based access

- **User types:** `STUDENT`, `LECTURER`, `HEAD_LECTURER`.
- After login, use `user.type` to show/hide menus and features:
  - **STUDENT:** My course, my documents, my profile.
  - **LECTURER:** Above + course students, courses list, lecturer documents.
  - **HEAD_LECTURER:** Above + stats, full CRUD for students/courses/lecturers/head lecturers, document delete.
- If the user calls an endpoint they’re not allowed to use, the API returns **403** with `FORBIDDEN_403` (or similar). Handle 403 in the UI (message or redirect).

---

## 10. Best practices

1. **Single API base URL**  
   Store base URL in env (e.g. `VITE_API_URL`). Use it for all requests.

2. **Always send credentials**  
   Use `credentials: 'include'` (fetch) or `withCredentials: true` (Axios) so the refresh cookie is sent.

3. **Centralize auth header**  
   Use an HTTP client wrapper or interceptor that adds `Authorization: Bearer <accessToken>` from your store/state.

4. **Handle 401 with refresh**  
   On 401, call `POST /api/auth/refresh` once; on success, retry the original request with the new token. On refresh failure, clear token and redirect to login.

5. **Use the standard response shape**  
   Check `response.success` or `statusCode`, then read `data` or `message` + `errors`. Don’t rely only on HTTP status if you parse a custom body.

6. **Map validation errors to fields**  
   For 400 with `errors` array, set field errors in your forms: `errors.find(e => e.field === 'email')?.message`.

7. **Persist only what’s needed**  
   Store `accessToken` (and optionally user) in memory or a short-lived storage. Rely on refresh for long sessions. Don’t store the refresh token yourself (it’s in an httpOnly cookie).

8. **Use enums from the API**  
   Call `GET /api/enums` (after login) to get lists for dropdowns (genders, races, states, file categories, etc.) and keep them in sync with the backend.

---

## 11. Quick reference

| Purpose | Method | Path | Auth |
|--------|--------|------|------|
| Health | GET | `/api/health` | No |
| Register | POST | `/api/auth/register` | No |
| Login | POST | `/api/auth/login` | No |
| Refresh | POST | `/api/auth/refresh` | Cookie |
| Logout | POST | `/api/auth/logout` | Bearer |
| Me | GET | `/api/auth/me` | Bearer |
| Enums | GET | `/api/enums` | Bearer |
| Stats (dashboard) | GET | `/api/stats` | Bearer (LECTURER/HEAD_LECTURER) |
| My student | GET | `/api/me/student` | Bearer (STUDENT) |
| My lecturer | GET | `/api/me/lecturer` | Bearer (LECTURER) |
| My documents | GET | `/api/me/documents` | Bearer |
| Upload my document | POST | `/api/me/documents` | Bearer (multipart `file` + `category`) |
| List students | GET | `/api/students?page=&limit=` | Bearer (LECTURER/HEAD_LECTURER) |
| List courses | GET | `/api/courses?page=&limit=` | Bearer (LECTURER/HEAD_LECTURER) |

---

Using this guide you can implement login, registration, profile, role-based screens, lists with pagination, and file uploads against the Monash College API and complete your fullstack system. For full request/response shapes and validation rules, refer to the backend code or `CODEBASE.md` in this repo.
