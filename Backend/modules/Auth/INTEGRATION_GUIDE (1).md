# NYSI 2FA Email Authentication - Integration Guide

## 📋 Overview

This implementation adds enterprise-grade 2FA email authentication to your NYSI backend API. It includes:

✅ User registration and management
✅ 2FA email verification with 6-digit codes
✅ JWT token-based authentication
✅ Rate limiting for security
✅ PostgreSQL database integration
✅ Professional email templates
✅ Swagger API documentation
✅ Role-based access control (RBAC)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install bcrypt jsonwebtoken nodemailer express-rate-limit
```

### 2. Run Database Migration

Execute the SQL migration file in your PostgreSQL database:

```bash
psql -h your-rds-endpoint -U your_user -d your_database -f database/auth_migration.sql
```

Or connect to your database and run the SQL commands manually.

### 3. Configure Environment Variables

Copy `.env.auth.example` to your `.env` file and update:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=24h

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
SUPPORT_EMAIL=support@nysi.com
```

**Important**: Get Gmail App Password:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Create app password for "Mail"
5. Use that password in `EMAIL_PASSWORD`

### 4. Update Your Server

Replace your `server.js` with `server.updated.js` or add the authentication routes:

```javascript
import authRoutes from "./modules/Auth/routes.js";
import { verifyEmailConfig } from "./modules/Auth/emailService.js";

// Add this BEFORE other routes
app.use("/api/auth", authRoutes);

// Verify email on startup
server.listen(PORT, async () => {
    await verifyEmailConfig();
    // ... rest of startup code
});
```

### 5. Start Server

```bash
npm run dev
```

---

## 📁 File Structure

```
NYSI-Backend/
├── modules/
│   └── Auth/
│       ├── authController.js       # Authentication logic
│       ├── authMiddleware.js       # JWT verification middleware
│       ├── emailService.js         # Email sending service
│       └── routes.js               # Auth endpoints
├── database/
│   └── auth_migration.sql          # Database schema
├── server.js                        # Updated server file
├── package.json                     # Updated dependencies
└── .env                             # Environment variables
```

---

## 🔌 API Endpoints

### Authentication Flow

#### 1️⃣ Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "john.doe@nysi.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "john.doe@nysi.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  }
}
```

#### 2️⃣ Login (Step 1 - Get Code)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@nysi.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Verification code sent to your email",
  "email": "jo***@nysi.com",
  "expiresIn": "10 minutes"
}
```

**Email will contain:**
```
Your Verification Code: 123456
Expires in 10 minutes
```

#### 3️⃣ Verify Code (Step 2 - Get Token)
```http
POST /api/auth/verify-code
Content-Type: application/json

{
  "email": "john.doe@nysi.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "john.doe@nysi.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  }
}
```

#### 4️⃣ Resend Code (Optional)
```http
POST /api/auth/resend-code
Content-Type: application/json

{
  "email": "john.doe@nysi.com"
}
```

#### 5️⃣ Get Current User (Protected)
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔒 Protecting Your Routes

### Method 1: Protect Individual Routes

```javascript
import { authenticateToken } from "./modules/Auth/authMiddleware.js";

// Protect a single route
app.get("/api/SSS/supplements", authenticateToken, async (req, res) => {
    // req.user is now available with { userId, email, role }
    const userId = req.user.userId;
    // ... your logic
});
```

### Method 2: Protect All Routes in a Module

```javascript
// In modules/SSS/routes.js
import { authenticateToken, requireAdmin } from "../Auth/authMiddleware.js";

const router = express.Router();

// All routes in this file require authentication
router.use(authenticateToken);

// Public route (before authentication)
// router.get("/public", handler);

// Protected routes
router.get("/supplements", getAllSupplements);
router.post("/supplements", createSupplement);

// Admin-only route
router.delete("/supplements/:id", requireAdmin, deleteSupplement);

export default router;
```

### Method 3: Role-Based Access

```javascript
import { authenticateToken, requireRole } from "../Auth/authMiddleware.js";

// Only admin or manager can access
router.post(
    "/supplements/approve",
    authenticateToken,
    requireRole(["admin", "manager"]),
    approveSupplements
);

// Only admins
router.delete("/users/:id", authenticateToken, requireRole(["admin"]), deleteUser);
```

---

## 🛡️ Security Features

### Rate Limiting

- **Login**: 5 attempts per 15 minutes per IP
- **Verification**: 3 attempts per minute per IP
- **Resend Code**: 2 requests per 5 minutes per IP
- **Registration**: 3 registrations per hour per IP

### Code Security

- **6-digit random codes** (100,000 - 999,999)
- **10-minute expiration**
- **3 verification attempts max**
- **Auto-cleanup** of expired codes

### Password Security

- **Bcrypt hashing** with salt rounds = 10
- **Minimum 8 characters** required
- Passwords never stored in plain text

### JWT Security

- **24-hour expiration** (configurable)
- **Signed tokens** with secret key
- Contains: userId, email, role

---

## 🎨 Frontend Integration Examples

### React/Next.js Example

```typescript
// lib/auth.ts
export const login = async (email: string, password: string) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) throw new Error('Login failed');
  return res.json();
};

export const verifyCode = async (email: string, code: string) => {
  const res = await fetch(`${API_URL}/api/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  
  if (!res.ok) throw new Error('Verification failed');
  const data = await res.json();
  
  // Store token
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
};

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Use in API calls
export const getSupplements = async () => {
  const res = await fetch(`${API_URL}/api/SSS/supplements`, {
    headers: getAuthHeader(),
  });
  return res.json();
};
```

### Login Component

```tsx
'use client';
import { useState } from 'react';
import { login, verifyCode } from '@/lib/auth';

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      setStep(2);
    } catch (error) {
      alert('Login failed');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await verifyCode(email, code);
      window.location.href = '/dashboard';
    } catch (error) {
      alert('Invalid code');
    }
  };

  if (step === 1) {
    return (
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Continue</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify}>
      <p>Check your email for the verification code</p>
      <input
        type="text"
        placeholder="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={6}
        required
      />
      <button type="submit">Verify</button>
    </form>
  );
}
```

---

## 📊 Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  last_login TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Verification Codes Table
```sql
verification_codes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  code VARCHAR(6),
  expires_at TIMESTAMP,
  attempts INTEGER,
  created_at TIMESTAMP
)
```

---

## 🧪 Testing

### Using Swagger UI

1. Go to `http://localhost:8000/docs`
2. Find "Authentication" section
3. Try `/api/auth/register` to create a user
4. Try `/api/auth/login` to get a code
5. Check your email for the code
6. Use `/api/auth/verify-code` to get token
7. Click "Authorize" button, enter: `Bearer YOUR_TOKEN`
8. Now you can test protected endpoints

### Using cURL

```bash
# 1. Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@nysi.com",
    "password": "Test123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# 2. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@nysi.com",
    "password": "Test123!"
  }'

# 3. Verify (use code from email)
curl -X POST http://localhost:8000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@nysi.com",
    "code": "123456"
  }'

# 4. Access protected route
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 Troubleshooting

### Email Not Sending

**Problem**: Verification emails not arriving

**Solutions**:
1. Check Gmail App Password is correct
2. Verify 2-Step Verification is enabled
3. Check spam folder
4. Try different email service (SendGrid, AWS SES)
5. Check server logs for email errors

### JWT Token Errors

**Problem**: "Invalid token" or "Token expired"

**Solutions**:
1. Check `JWT_SECRET` is set in .env
2. Ensure token is sent as `Bearer TOKEN`
3. Token expires after 24h - user must login again
4. Check system time is correct

### Database Connection Issues

**Problem**: Can't connect to PostgreSQL

**Solutions**:
1. Run the migration SQL file
2. Check RDS security group allows your IP
3. Verify `PGHOST`, `PGUSER`, `PGPASSWORD` in .env
4. Test connection: `psql -h HOST -U USER -d DATABASE`

### Rate Limiting Issues

**Problem**: Getting rate limit errors during testing

**Solutions**:
1. Temporarily increase limits in routes.js
2. Use different IPs for testing
3. Wait for rate limit window to expire
4. Disable rate limiting for development (not recommended)

---

## 📈 Next Steps

### Production Checklist

- [ ] Generate strong JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Set up professional email service (SendGrid, AWS SES)
- [ ] Enable HTTPS/SSL
- [ ] Set up proper CORS for production domain
- [ ] Add request logging (Morgan, Winston)
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Add refresh tokens for long sessions
- [ ] Implement password reset flow
- [ ] Add email verification on registration
- [ ] Set up automated database backups
- [ ] Add session management
- [ ] Implement account lockout after failed attempts

### Optional Enhancements

1. **Refresh Tokens**: Long-lived sessions
2. **Email Verification**: Verify email on registration
3. **Password Reset**: Forgot password flow
4. **OAuth Integration**: Google/Microsoft login
5. **Session Management**: Track active sessions
6. **Audit Logging**: Track all auth events
7. **2FA via SMS**: Alternative to email
8. **Remember Device**: Trust certain devices
9. **IP Whitelisting**: Restrict by IP
10. **Biometric Auth**: Fingerprint/Face ID

---

## 📞 Support

For questions or issues:
- Check Swagger docs: `http://localhost:8000/docs`
- Review server logs
- Contact: dev@nysi.com

---

## 📄 License

MIT License - NYSI Development Team
