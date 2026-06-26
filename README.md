## ✅ Features Implemented

### 1. User Login

- Login with email and password
- Password verification using `bcrypt.compare()`
- Return authenticated user information
- Generate JWT tokens after successful login

---

### 2. JWT Authentication

Implemented:

- Access Token
- Refresh Token

Access Token contains:

- User ID
- Email
- Role

---

### 3. Refresh Token Storage

- Generated Refresh Token during login
- Hashed Refresh Token using `bcrypt`
- Stored hashed Refresh Token in the database
- Never stored the raw Refresh Token

---

### 4. Refresh Token API

Implemented refresh token flow:

1. Receive Refresh Token
2. Verify JWT signature
3. Find user from database
4. Compare Refresh Token with hashed value in DB
5. Generate new Access Token
6. (Next step) Refresh Token Rotation

---

### 5. JWT Strategy

Implemented Passport JWT Strategy.

Responsibilities:

- Read token from Authorization header
- Verify JWT
- Validate payload
- Attach authenticated user to `request.user`

---

### 6. JWT Auth Guard

Implemented `JwtAuthGuard`.

Responsibilities:

- Protect private routes
- Allow only authenticated users
- Use Passport JWT Strategy automatically

Example:

```ts
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile() {
  return 'Protected Route';
}
```

---

### 7. Protected Routes

Successfully protected authenticated endpoints using:

- Passport
- JWT Strategy
- JWT Auth Guard

---

### 7.1 Role base access controle

### 8. Authentication Flow

## 📚 Topics Learned

- NestJS Authentication
- JWT Authentication
- Access Token
- Refresh Token
- Password Hashing
- Refresh Token Hashing
- Passport JWT
- JwtStrategy
- JwtAuthGuard
- Protected Routes
- Role base access controle
- Authorization Header
- Refresh Token Validation

---

## 🛠 Tech Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Passport.js
- Passport JWT
- bcrypt
- JSON Web Token (JWT)

---
