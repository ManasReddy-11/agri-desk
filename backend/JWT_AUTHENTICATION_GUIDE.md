/**
 * JWT AUTHENTICATION SYSTEM - COMPLETE GUIDE
 * AgriDesk Backend
 */

═════════════════════════════════════════════════════════════════════
🔐 AUTHENTICATION ARCHITECTURE OVERVIEW
═════════════════════════════════════════════════════════════════════

System Components:
1. User Model with bcrypt password hashing
2. JWT Authentication (Access + Refresh tokens)
3. Role-Based Access Control (RBAC)
4. Auth Middleware with role verification
5. Auth Service with business logic
6. Auth Controller with request handlers
7. Auth Routes with validation

═════════════════════════════════════════════════════════════════════
👥 SUPPORTED ROLES
═════════════════════════════════════════════════════════════════════

1. CONSUMER
   - Browse products
   - Place orders
   - View order history
   - Update profile
   - Cannot create products

2. FARMER
   - Create/manage products
   - View orders for their products
   - Update profile
   - Cannot manage other farmers' products
   - Cannot access admin features

3. ADMIN
   - Full access to all resources
   - Manage users
   - Manage products
   - View all orders
   - Access analytics

═════════════════════════════════════════════════════════════════════
📝 FILES CREATED/UPDATED
═════════════════════════════════════════════════════════════════════

✓ models/User.js
  - User schema with all fields
  - Password hashing middleware
  - Email/role validation
  - comparePassword method
  - getPublicProfile method

✓ controllers/authController.js
  - register: User registration
  - login: User login with JWT
  - logout: Clear tokens
  - refreshToken: Generate new access token
  - getCurrentUser: Get authenticated user

✓ routes/authRoutes.js
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/logout
  - POST /api/auth/refresh-token
  - GET /api/auth/me (protected)

✓ middleware/auth.js
  - verifyToken: Validate JWT
  - authorize: Role-based access
  - requirePermission: Permission-based access
  - isAdmin, isFarmer, isConsumer: Role shortcuts
  - optionalAuth: Optional token verification

✓ services/authService.js
  - register: Create new user
  - login: Authenticate user
  - refreshAccessToken: Generate new access token

✓ utils/jwtUtils.js (NEW)
  - generateAccessToken
  - generateRefreshToken
  - verifyAccessToken
  - verifyRefreshToken
  - isTokenExpired
  - generateTokenPair

✓ utils/passwordUtils.js (NEW)
  - hashPassword: Hash with bcrypt
  - comparePassword: Verify password
  - validatePasswordStrength: Check password strength

✓ utils/rbac.js (NEW)
  - Role hierarchy and permissions
  - hasRole, hasAnyRole, hasPermission
  - getRoleLevel, isRoleHigherThan

═════════════════════════════════════════════════════════════════════
🚀 AUTHENTICATION FLOW
═════════════════════════════════════════════════════════════════════

1. REGISTRATION FLOW
   ┌─── User submits registration ───┐
   │ email, password, name, role      │
   └──────────────────────────────────┘
                ↓
   ┌─── Validation ───────────────┐
   │ Email format, password strength│
   └───────────────────────────────┘
                ↓
   ┌─── Check if email exists ───┐
   │ Unique email required         │
   └──────────────────────────────┘
                ↓
   ┌─── Hash password with bcrypt ───┐
   │ SALT_ROUNDS = 10                 │
   └──────────────────────────────────┘
                ↓
   ┌─── Create user in MongoDB ───┐
   │ Automatic pre-save hook       │
   └──────────────────────────────┘
                ↓
   ┌─── Return success ───┐
   │ User profile (no pwd) │
   └──────────────────────┘

2. LOGIN FLOW
   ┌─── User submits login ───┐
   │ email, password          │
   └──────────────────────────┘
                ↓
   ┌─── Find user by email ───┐
   │ Include password field    │
   └───────────────────────────┘
                ↓
   ┌─── Compare passwords ───┐
   │ bcrypt.compare()         │
   └──────────────────────────┘
                ↓
        Password Valid?
        /            \
      YES             NO
       │               │
       │          Return 401
       │         (Invalid Creds)
       │
   ┌─── Is account active? ───┐
   │ Check isActive flag       │
   └───────────────────────────┘
       /            \
     YES              NO
      │                │
      │          Return 403
      │         (Inactive)
      │
   ┌─── Update lastLogin ───┐
   │ Current timestamp       │
   └────────────────────────┘
                ↓
   ┌─── Generate JWT Tokens ───────┐
   │ Access (7 days)               │
   │ Refresh (30 days)             │
   └───────────────────────────────┘
                ↓
   ┌─── Set Refresh Token Cookie ───┐
   │ httpOnly, Secure, SameSite      │
   └────────────────────────────────┘
                ↓
   ┌─── Return Response ───┐
   │ User profile          │
   │ Access token          │
   │ Refresh token (cookie)│
   └──────────────────────┘

3. PROTECTED ROUTE FLOW
   ┌─── Request with Bearer Token ───┐
   │ Authorization: Bearer <token>    │
   └─────────────────────────────────┘
                ↓
   ┌─── Extract header ───────┐
   │ Remove "Bearer " prefix   │
   └────────────────────────────┘
                ↓
   ┌─── Verify JWT ────────────────────┐
   │ Signature, expiry, issuer, audience│
   └──────────────────────────────────┘
       /                    \
     VALID                 INVALID
      │                      │
      │              Return 401
      │            (Invalid/Expired)
      │
   ┌─── Attach user to request ───┐
   │ req.user = decoded payload    │
   └──────────────────────────────┘
                ↓
   ┌─── Continue to next middleware ───┐
   │ (Role checking, permissions, etc) │
   └────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════
🔑 JWT PAYLOAD STRUCTURE
═════════════════════════════════════════════════════════════════════

ACCESS TOKEN Payload:
{
  "id": "ObjectId",
  "email": "user@example.com",
  "role": "farmer",
  "name": "John Doe",
  "iat": 1234567890,
  "exp": 1234654290,
  "iss": "agri-desk",
  "aud": "agri-desk-api"
}

REFRESH TOKEN Payload:
{
  "id": "ObjectId",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1296000090,
  "iss": "agri-desk"
}

═════════════════════════════════════════════════════════════════════
🔐 PASSWORD SECURITY
═════════════════════════════════════════════════════════════════════

Hashing Algorithm: bcryptjs
Salt Rounds: 10

Password Requirements:
✓ Minimum 8 characters
✓ At least one uppercase letter (A-Z)
✓ At least one lowercase letter (a-z)
✓ At least one number (0-9)
✓ Special character (optional but recommended)

Example: MyPass@123

Password Flow:
1. User enters password
2. Validate strength
3. Generate salt with bcryptjs
4. Hash password with salt
5. Store hash in database
6. Never store plain password

Comparison:
1. User enters password at login
2. Retrieve hashed password from DB
3. Use bcrypt.compare()
4. Returns true/false (cannot reverse hash)

═════════════════════════════════════════════════════════════════════
🎯 USAGE EXAMPLES
═════════════════════════════════════════════════════════════════════

1. REGISTER CONSUMER
────────────────────────────────────────────────────────────────────
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Consumer",
  "email": "consumer@example.com",
  "password": "SecurePass@123",
  "role": "consumer",
  "phone": "9876543210"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Consumer",
    "email": "consumer@example.com",
    "role": "consumer",
    "phone": "9876543210",
    "isActive": true,
    "createdAt": "2024-04-13T10:30:45.123Z"
  }
}

2. REGISTER FARMER
────────────────────────────────────────────────────────────────────
POST /api/auth/register
Content-Type: application/json

{
  "name": "Farmer Ramesh",
  "email": "farmer@example.com",
  "password": "FarmPass@123",
  "role": "farmer",
  "phone": "9876543211"
}

Response (201): User created with farmer role

3. LOGIN USER
────────────────────────────────────────────────────────────────────
POST /api/auth/login
Content-Type: application/json

{
  "email": "consumer@example.com",
  "password": "SecurePass@123"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Consumer",
      "email": "consumer@example.com",
      "role": "consumer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict

4. ACCESS PROTECTED ROUTE
────────────────────────────────────────────────────────────────────
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response (200):
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "consumer@example.com",
    "role": "consumer",
    "name": "John Consumer"
  }
}

5. REFRESH TOKEN
────────────────────────────────────────────────────────────────────
POST /api/auth/refresh-token
Cookie: refreshToken=...

Response (200):
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (new)"
  }
}

6. CREATE PRODUCT (FARMER ONLY)
────────────────────────────────────────────────────────────────────
POST /api/products
Authorization: Bearer <farmer-token>
Content-Type: application/json

{
  "name": "Fresh Tomatoes",
  "description": "Organic farm-fresh tomatoes",
  "category": "vegetables",
  "price": 50,
  "quantity": 100,
  "unit": "kg"
}

Response (201): Product created
Status (403): If not farmer

═════════════════════════════════════════════════════════════════════
🛡️ MIDDLEWARE USAGE
═════════════════════════════════════════════════════════════════════

BASIC ROUTE PROTECTION - Any Authenticated User
────────────────────────────────────────────────
router.get('/my-profile', verifyToken, controller.handler);
→ Only authenticated users can access

ROLE-BASED PROTECTION - Specific Roles
────────────────────────────────────────────────
router.post('/products', 
  verifyToken, 
  authorize('farmer', 'admin'),
  controller.handler
);
→ Only farmers and admins can access

PERMISSION-BASED PROTECTION - Specific Permission
────────────────────────────────────────────────
router.get('/admin-dashboard',
  verifyToken,
  requirePermission('admin:access'),
  controller.handler
);
→ Only users with 'admin:access' permission

SHORTCUT MIDDLEWARE - Specific Role
────────────────────────────────────────────────
router.post('/products', 
  verifyToken,
  isFarmer,
  controller.handler
);
→ Only farmers can access

OPTIONAL AUTHENTICATION - Token if Available
────────────────────────────────────────────────
router.get('/products', 
  optionalAuth,
  controller.handler
);
→ Attaches user if token valid, doesn't fail otherwise

═════════════════════════════════════════════════════════════════════
🔍 ROLE HIERARCHY & PERMISSIONS
═════════════════════════════════════════════════════════════════════

Role Levels:
Admin:    Level 3 (Highest)
Farmer:   Level 2
Consumer: Level 1 (Lowest)

Permission Examples:
- user:read           → [admin, farmer, consumer]
- user:update:own     → [admin, farmer, consumer]
- user:update:any     → [admin]
- product:create      → [admin, farmer]
- product:read        → [admin, farmer, consumer]
- order:read:any      → [admin, farmer]
- admin:access        → [admin]

═════════════════════════════════════════════════════════════════════
⚠️ ERROR RESPONSES
═════════════════════════════════════════════════════════════════════

401 - Unauthorized
{
  "success": false,
  "message": "No token provided" | "Invalid token" | "Token expired"
}

403 - Forbidden
{
  "success": false,
  "message": "Not authorized. Required roles: farmer, admin"
}

400 - Bad Request (Validation Error)
{
  "success": false,
  "message": "Validation Error: email is invalid, password is weak"
}

409 - Conflict (Email exists)
{
  "success": false,
  "message": "User with this email already exists",
  "field": "email"
}

═════════════════════════════════════════════════════════════════════
🧪 TESTING WITH POSTMAN
═════════════════════════════════════════════════════════════════════

1. Register User
   POST http://localhost:5000/api/auth/register
   Body (JSON):
   {
     "name": "Test User",
     "email": "test@test.com",
     "password": "Test@1234",
     "role": "consumer"
   }

2. Login
   POST http://localhost:5000/api/auth/login
   Body (JSON):
   {
     "email": "test@test.com",
     "password": "Test@1234"
   }
   
   Save the accessToken from response

3. Use Token
   GET http://localhost:5000/api/auth/me
   Headers:
   Authorization: Bearer <paste-token-here>

═════════════════════════════════════════════════════════════════════
✅ CHECKLIST
═════════════════════════════════════════════════════════════════════

✓ User model created with password hashing
✓ JWT utilities created (generate, verify, decode)
✓ Password utilities created (hash, compare, validate)
✓ RBAC system created (roles, permissions, hierarchy)
✓ Auth middleware enhanced (verify, authorize, permission, shortcuts)
✓ Auth service updated (register, login, token refresh)
✓ Auth controller created (all endpoints)
✓ Auth routes created (all routes with validation)
✓ Error handling implemented
✓ Role validation implemented
✓ Database connection setup
✓ Environment variables configured

═════════════════════════════════════════════════════════════════════
🚀 NEXT STEPS
═════════════════════════════════════════════════════════════════════

1. Update .env with JWT secrets:
   JWT_SECRET=generate_32_char_random_string
   JWT_REFRESH_SECRET=generate_32_char_random_string

2. Test authentication:
   npm run dev
   Use Postman or curl to test endpoints

3. Create product routes with farmer auth:
   router.post('/products', verifyToken, isFarmer, ...)

4. Create order routes with consumer auth:
   router.post('/orders', verifyToken, isConsumer, ...)

5. Create admin dashboard routes:
   router.get('/admin/dashboard', verifyToken, isAdmin, ...)

6. Implement refresh token rotation

7. Add email verification

8. Add two-factor authentication (optional)

═════════════════════════════════════════════════════════════════════
