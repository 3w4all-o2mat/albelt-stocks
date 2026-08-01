# Membership Management — Build Specification

> **Table: `albelt_membership`** | **DB:** PostgreSQL | **Config:** `.env/.env.local` (root)

---

## 1. Overview

The entire application is gated behind a membership system. There is no public registration — all accounts are created by a user holding the `master` role. Access, capabilities, and UI differ by role.

### Roles

| Role | Description |
|---|---|
| `master` | Full control: manages all users, roles, and system config |
| `manager` | Elevated access to app features; cannot manage other users |
| `user` | Standard access to app features only |

---

## 2. Database

### Connection

Store the connection string in `.env` or `.env.local` at the project root:

connection string format:
```env  
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Read it via your ORM or driver (e.g. `process.env.DATABASE_URL` in Node, `os.environ["DATABASE_URL"]` in Python).

### Table: `albelt_membership`

```sql
CREATE TABLE albelt_membership (
    id               SERIAL PRIMARY KEY,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    password_hash    TEXT         NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    odoo_username    VARCHAR(100),
    role             VARCHAR(20)  NOT NULL DEFAULT 'user'
                         CHECK (role IN ('master', 'manager', 'user')),
    full_name        VARCHAR(150),
    date_creation    TIMESTAMP    NOT NULL DEFAULT NOW(),
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE
);
```

> **Note on `password_hash`:** never store plain-text passwords. Hash with `bcrypt` (cost ≥ 12) or `argon2id` before INSERT/UPDATE.

---

## 3. User Profile Fields

| Field | Editable by User | Editable by Master |
|---|---|---|
| `username` | ✗ | ✗ (immutable once created) |
| `full_name` | ✓ | ✓ |
| `email` | ✓ | ✓ |
| `password` | ✓ (requires current password) | ✓ (force reset) |
| `odoo_username` | ✗ | ✓ |
| `role` | ✗ | ✓ |
| `is_active` | ✗ | ✓ |
| `date_creation` | ✗ | ✗ (auto) |

---

## 4. Authentication Flow

```
1. User submits username + password on login form
2. Query albelt_membership WHERE username = ? AND is_active = TRUE
3. If no row → generic error ("Invalid credentials")
4. bcrypt.compare(submitted_password, row.password_hash)
5. If mismatch → same generic error (no enumeration)
6. On success → create session/JWT containing: { id, username, role }
7. Redirect to app (role-based landing page)
```

### Session / Token

- **Session:** store `{ id, username, role }` server-side (e.g. `express-session` + Postgres store, or Django sessions).
- **JWT (stateless):** sign with `HS256` or `RS256`; include `role` in payload; set a short expiry (`1h`) with refresh token support.
- Protect every route with a middleware that verifies the token/session and attaches `req.user`.

---

## 5. Authorization Middleware

```
requireAuth         → any logged-in user
requireRole(roles)  → logged-in user whose role is in the allowed list
```

Example guard table:

| Route | Guard |
|---|---|
| `/profile` | `requireAuth` |
| `/admin/users` | `requireRole(['master'])` |
| `/admin/users/:id/edit` | `requireRole(['master'])` |
| `/admin/users/:id/delete` | `requireRole(['master'])` |
| App feature routes | `requireRole(['master','manager','user'])` |

---

## 6. Screens & Features

### 6.1 Login Page (`/login`)

- Fields: `username`, `password`
- On success: redirect to `/dashboard` (or role-specific landing)
- On failure: display generic error, do not hint at which field is wrong
- No "register" link — user creation is admin-only

### 6.2 My Profile (`/profile`)

Accessible to all authenticated users.

**Read-only display:**
- Username
- Role (badge style: Master = gold, Manager = blue, User = grey)
- Odoo Username
- Member since (`date_creation`, formatted)

**Editable fields (inline form or modal):**
- Full Name
- Email
- Password (requires entering current password first)

**Validation:**
- Email: valid format, unique in DB
- Password: min 8 chars, at least one number and one special character
- Current password: must match before allowing password change

### 6.3 User Management (`/admin/users`) — Master only

**User list table columns:**

| # | Username | Full Name | Email | Odoo Username | Role | Status | Created | Actions |
|---|---|---|---|---|---|---|---|---|

**Actions per row:**
- Edit (pencil icon) → opens Edit User modal
- Delete (trash icon) → confirmation dialog before DELETE

**Table features:**
- Search/filter by username, email, role
- Sort by date_creation, username
- Pagination (20 per page default)

### 6.4 Create User Modal — Master only

Triggered from "Add User" button on `/admin/users`.

**Fields:**
- Username (required, unique)
- Full Name (optional)
- Email (required, unique)
- Odoo Username (optional)
- Role (select: master / manager / user — default: user)
- Password (required — master sets initial password)
- Confirm Password

**On submit:**
- Validate all fields
- Hash password
- INSERT into `albelt_membership`
- Show success toast, refresh user list

### 6.5 Edit User Modal — Master only

Pre-filled with existing user data.

**Editable:**
- Full Name
- Email
- Odoo Username
- Role
- Password (leave blank = no change; fill = force reset)
- is_active toggle

**On submit:**
- If password field non-empty: hash and update `password_hash`
- UPDATE `albelt_membership` WHERE id = ?
- Show success toast

### 6.6 Delete User — Master only

- Confirmation dialog: "Delete user **{username}**? This cannot be undone."
- On confirm: `DELETE FROM albelt_membership WHERE id = ?`
- A master cannot delete their own account (disable button / block server-side)

---

## 7. API Endpoints (REST)

All endpoints require authentication. Role guards as specified.

```
POST   /api/auth/login              → authenticate, return session/token
POST   /api/auth/logout             → invalidate session/token

GET    /api/profile                 → get own profile          [requireAuth]
PUT    /api/profile                 → update own profile       [requireAuth]
PUT    /api/profile/password        → change own password      [requireAuth]

GET    /api/admin/users             → list all users           [master]
POST   /api/admin/users             → create user              [master]
GET    /api/admin/users/:id         → get single user          [master]
PUT    /api/admin/users/:id         → update user              [master]
DELETE /api/admin/users/:id         → delete user              [master]
```

### Response conventions

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Human-readable message", "code": "ERROR_CODE" }
```

---

## 8. Security Checklist

- [ ] All passwords hashed with bcrypt (cost ≥ 12) or argon2id — never MD5/SHA1
- [ ] Login errors are generic (no username vs. password distinction)
- [ ] Rate-limit login endpoint (e.g. 10 attempts / 15 min per IP)
- [ ] CSRF protection on all state-changing routes (if using cookies/sessions)
- [ ] JWT secret stored in `.env`, never in source code
- [ ] SQL queries use parameterized statements — no string interpolation
- [ ] `is_active = FALSE` blocks login immediately (no token revocation delay)
- [ ] Master cannot delete or demote their own account
- [ ] Password change requires current password (self-service) or master role (admin)
- [ ] HTTPS enforced in production

---

## 9. Environment Variables

```env
# .env (never commit this file)
DATABASE_URL=postgresql://user:password@localhost:5432/yourdb
SESSION_SECRET=replace_with_long_random_string
JWT_SECRET=replace_with_long_random_string
JWT_EXPIRY=1h
BCRYPT_ROUNDS=12
```

---

## 10. Seed: First Master Account

On first deployment, seed the master account via a migration script — never via the UI:

```sql
-- Run once, then remove or guard with a flag
INSERT INTO albelt_membership (username, password_hash, email, role, full_name)
VALUES (
    'master',
    '<bcrypt hash of your chosen password>',
    'master@yourdomain.com',
    'master',
    'System Master'
);
```

Generate the hash in advance:

```bash
# Node.js
node -e "const b=require('bcrypt'); b.hash('YourPass!1',12).then(console.log)"

# Python
python -c "import bcrypt; print(bcrypt.hashpw(b'YourPass!1', bcrypt.gensalt(12)).decode())"
```

---

## 11. Frontend UX Notes

- Role badge colors: `master` = amber/gold, `manager` = blue, `user` = slate
- Hide the "Admin" nav link entirely for `manager` and `user` roles
- Show "Edit" / "Delete" buttons only when `req.user.role === 'master'`
- After a master edits their own profile (not via admin panel), re-issue the session/token with fresh data
- Empty states: show "No users found" with an "Add User" CTA when the list is empty

---

## 12. Suggested File Structure

```
/
├── .env                          ← DB + secrets (gitignored)
├── MEMBERSHIP.md                 ← this file
│
├── db/
│   ├── migrations/
│   │   └── 001_create_albelt_membership.sql
│   └── seeds/
│       └── 001_master_user.sql
│
├── src/
│   ├── middleware/
│   │   ├── requireAuth.js
│   │   └── requireRole.js
│   │
│   ├── routes/
│   │   ├── auth.js               ← login / logout
│   │   ├── profile.js            ← self-service profile
│   │   └── admin/
│   │       └── users.js          ← master user management
│   │
│   ├── services/
│   │   └── membership.js         ← DB queries for albelt_membership
│   │
│   └── views/ (or pages/)
│       ├── login.jsx
│       ├── profile.jsx
│       └── admin/
│           └── users.jsx
```

---

*Last updated: June 2026*
