/**
 * JWT AUTHENTICATION SYSTEM - INTEGRATION OVERVIEW
 * AgriDesk Backend - Complete Implementation
 */

═════════════════════════════════════════════════════════════════════
📊 SYSTEM ARCHITECTURE DIAGRAM
═════════════════════════════════════════════════════════════════════

CLIENT REQUEST
    ↓
REQUEST VALIDATION (express-validator)
    ↓
ROUTE HANDLER
    ├── PUBLIC: /auth/register, /auth/login
    └── PROTECTED: /auth/me, /api/products (with role check)
    ↓
AUTH MIDDLEWARE
    ├── verifyToken: Check JWT validity
    ├── authorize: Check user role
    └── requirePermission: Check user permission
    ↓
CONTROLLER
    └── Calls service layer
    ↓
SERVICE LAYER (authService.js)
    ├── Hash password (passwordUtils)
    ├── Compare password (passwordUtils)
    ├── Generate JWT (jwtUtils)
    └── Database operations (Models)
    ↓
DATABASE (MongoDB)
    ├── User collection
    ├── Store hashed password
    ├── Store user role
    └── Track last login
    ↓
RESPONSE
    ├── Access Token (7 days)
    └── Refresh Token (30 days in cookie)

═════════════════════════════════════════════════════════════════════
🔑 TOKEN FLOW DIAGRAM
═════════════════════════════════════════════════════════════════════

USER REGISTRATION
┌────────────────────┐
│ 1. User data       │
│ 2. Validate input  │
│ 3. Hash password   │
│ 4. Save to DB      │
└────────────────────┘
         ↓
    ✓ Success
         ↓
  Return: User profile (no password)

USER LOGIN
┌────────────────────┐
│ 1. Email/password  │
│ 2. Find user       │
│ 3. Compare pass    │
│ 4. Generate JWT    │
│ 5. Set cookies     │
└────────────────────┘
         ↓
    ✓ Success
         ↓
  Return: 
    - User profile
    - Access Token (header)
    - Refresh Token (cookie)

PROTECTED REQUEST
┌────────────────────┐
│ 1. Get token from  │
│    Authorization   │
│    header          │
│ 2. Verify JWT      │
│ 3. Extract user    │
│ 4. Check role      │
│ 5. Proceed or      │
│    deny            │
└────────────────────┘
         ↓
  ✓ Valid → Continue
  ✗ Invalid → Return 401/403

TOKEN REFRESH
┌────────────────────┐
│ 1. Get refresh     │
│    token from      │
│    cookie          │
│ 2. Verify token    │
│ 3. Find user       │
│ 4. Generate new    │
│    access token    │
└────────────────────┘
         ↓
    ✓ Success
         ↓
  Return: New access token

═════════════════════════════════════════════════════════════════════
🎯 ROLE-BASED ACCESS CONTROL MATRIX
═════════════════════════════════════════════════════════════════════

                    CONSUMER    FARMER      ADMIN
─────────────────────────────────────────────────────────────────────
Register              ✓           ✓          -
Login                 ✓           ✓          -
View Products         ✓           ✓          ✓
Create Products       ✗           ✓          ✓
Update Own Products   ✗           ✓          ✓
Delete Own Products   ✗           ✓          ✓
Create Order          ✓           ✗          ✓
View Own Orders       ✓           ✓          ✓
View All Orders       ✗           ✗          ✓
Update Order Status   ✗           ✓          ✓
View User Profile     ✓           ✓          ✓
Update Own Profile    ✓           ✓          ✓
Update Any Profile    ✗           ✗          ✓
Delete User           ✗           ✗          ✓
View Analytics        ✗           ✓          ✓
Admin Dashboard       ✗           ✗          ✓

═════════════════════════════════════════════════════════════════════
📁 COMPLETE FILE STRUCTURE
═════════════════════════════════════════════════════════════════════

backend/
├── config/
│   ├── db.js                        ✓ MongoDB connection
│   └── corsConfig.js                ✓ CORS settings
│
├── models/
│   ├── User.js                      ✓ User schema + methods
│   ├── Product.js                   ✓ Product schema
│   └── Order.js                     ✓ Order schema
│
├── controllers/
│   ├── authController.js            ✓ Auth endpoints
│   ├── productController.js         ✓ Product endpoints
│   └── userController.js            ✓ User endpoints
│
├── services/
│   └── authService.js               ✓ Auth business logic
│
├── routes/
│   ├── authRoutes.js                ✓ Auth routes
│   ├── productRoutes.js             ✓ Product routes
│   └── userRoutes.js                ✓ User routes
│
├── middleware/
│   ├── auth.js                      ✓ JWT + RBAC
│   ├── errorHandler.js              ✓ Error handling
│   ├── validation.js                ✓ Validation
│   └── requestLogger.js             ✓ Logging
│
├── utils/
│   ├── asyncHandler.js              ✓ Async wrapper
│   ├── validators.js                ✓ Express-validator rules
│   ├── logger.js                    ✓ Logging utility
│   ├── jwtUtils.js                  ✓ JWT utilities (NEW)
│   ├── passwordUtils.js             ✓ Password utilities (NEW)
│   └── rbac.js                      ✓ RBAC system (NEW)
│
├── uploads/                         ✓ File storage
│
├── .env                             ✓ Environment variables
├── .env.example                     ✓ Template
├── .gitignore                       ✓ Git ignore
├── .eslintrc.js                     ✓ ESLint config
├── jest.config.js                   ✓ Jest config
│
├── server.js                        ✓ Main server file
├── package.json                     ✓ Dependencies
│
└── Documentation Files:
    ├── README.md                     ✓ API documentation
    ├── JWT_AUTHENTICATION_GUIDE.md   ✓ Auth guide
    ├── JWT_AUTH_CHECKLIST.md        ✓ Implementation checklist
    ├── ARCHITECTURE.md               ✓ System design
    ├── DEVELOPMENT_GUIDE.md          ✓ Code patterns
    ├── MONGODB_SETUP.md              ✓ DB setup
    ├── routes/EXAMPLE_ROUTES.js      ✓ Example routes
    ├── test_auth.sh                  ✓ Bash tests
    └── test_auth.ps1                 ✓ PowerShell tests

═════════════════════════════════════════════════════════════════════
🔐 COMPLETE AUTHENTICATION FLOW EXAMPLE
═════════════════════════════════════════════════════════════════════

SCENARIO: Farmer registers and logs in

1. REGISTRATION REQUEST
   POST /api/auth/register
   {
     "name": "Ramesh Kumar",
     "email": "ramesh@farm.com",
     "password": "FarmPass@123",
     "role": "farmer",
     "phone": "9876543210"
   }
   
   VALIDATION:
   ✓ Email format valid
   ✓ Password length ≥ 8
   ✓ Password has uppercase, lowercase, number
   ✓ Email not already registered
   
   PROCESSING:
   1. Create salt (SALT_ROUNDS=10)
   2. Hash password with salt
   3. Save user to MongoDB
   4. Pre-save hook encrypts password (automatic)
   
   RESPONSE (201):
   {
     "success": true,
     "message": "User registered successfully",
     "data": {
       "_id": "507f1f77bcf86cd799439011",
       "name": "Ramesh Kumar",
       "email": "ramesh@farm.com",
       "role": "farmer",
       "phone": "9876543210",
       "isActive": true,
       "createdAt": "2024-04-13T10:30:45.123Z"
     }
   }

2. LOGIN REQUEST
   POST /api/auth/login
   {
     "email": "ramesh@farm.com",
     "password": "FarmPass@123"
   }
   
   VALIDATION:
   ✓ Email format valid
   ✓ Password not empty
   
   PROCESSING:
   1. Query database by email
   2. Select password field (+password)
   3. Use bcryptjs.compare() - compare is O(1) secure
   4. If valid: Update lastLogin timestamp
   5. Generate access token (7 days)
   6. Generate refresh token (30 days)
   
   JWT ACCESS TOKEN CONTAINS:
   {
     "id": "507f1f77bcf86cd799439011",
     "email": "ramesh@farm.com",
     "role": "farmer",
     "name": "Ramesh Kumar",
     "iat": 1712395845,
     "exp": 1713000645,
     "iss": "agri-desk",
     "aud": "agri-desk-api"
   }
   
   RESPONSE (200):
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "user": {
         "_id": "507f1f77bcf86cd799439011",
         "name": "Ramesh Kumar",
         "email": "ramesh@farm.com",
         "role": "farmer"
       },
       "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
   }
   
   SET COOKIE:
   refreshToken=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000

3. CREATE PRODUCT REQUEST (Protected)
   POST /api/products
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Content-Type: application/json
   {
     "name": "Fresh Tomatoes",
     "description": "Organic farm-fresh tomatoes",
     "category": "vegetables",
     "price": 50,
     "quantity": 100,
     "unit": "kg"
   }
   
   MIDDLEWARE CHAIN:
   1. verifyToken middleware
      ↓
      Extract token from Authorization header
      Verify JWT signature
      Verify token not expired
      Verify issuer = "agri-desk"
      Verify audience = "agri-desk-api"
      Attach user to req.user
      ↓
   2. isFarmer middleware (shortcut for authorize('farmer'))
      ↓
      Check req.user.role === 'farmer'
      If not farmer: throw new AppError("Farmer access required", 403)
      If farmer: continue
      ↓
   3. Controller handler
      ↓
      req.user contains: {id, email, role, name}
      farmer = req.user.id
      Create product with farmer reference
      ↓
   RESPONSE (201):
   Product created successfully with farmer reference

═════════════════════════════════════════════════════════════════════
🛡️ SECURITY FEATURES IMPLEMENTED
═════════════════════════════════════════════════════════════════════

Password Security:
✓ bcryptjs hashing with salt (SALT_ROUNDS=10)
✓ Never store plain passwords
✓ Password field excluded from default queries (select: false)
✓ Passwords never returned in API responses
✓ Password validation (8+ chars, upper, lower, number)

JWT Security:
✓ Signatures verified on every request
✓ Expiration checked (7 days for access, 30 for refresh)
✓ Issuer validation (agri-desk)
✓ Audience validation (agri-desk-api)
✓ Refresh tokens in httpOnly cookies (XSS protection)
✓ Refresh tokens never exposed in responses

Access Control:
✓ Role-based authorization (consumer, farmer, admin)
✓ Permission-based authorization (configurable)
✓ Role hierarchy (admin > farmer > consumer)
✓ Multiple role support on routes
✓ Resource ownership checks available

Data Validation:
✓ Email format validation
✓ Password strength validation
✓ Input sanitization (trim, lowercase)
✓ Mongoose schema validation
✓ Express-validator rules

Error Handling:
✓ No sensitive information in error messages
✓ Consistent error response format
✓ Proper HTTP status codes
✓ Detailed logs for debugging (dev only)

═════════════════════════════════════════════════════════════════════
✅ READY FOR DEPLOYMENT
═════════════════════════════════════════════════════════════════════

CHECKLIST BEFORE GOING TO PRODUCTION:

Environment:
✓ Set NODE_ENV=production
✓ Set JWT_SECRET (random 32+ chars)
✓ Set JWT_REFRESH_SECRET (random 32+ chars)
✓ Configure MONGO_URI for production MongoDB
✓ Set CLIENT_URL to production frontend URL

Security:
✓ Enable CORS only for production domain
✓ Enable Helmet security headers
✓ Use HTTPS (not HTTP)
✓ Set secure cookies (secure=true)
✓ Enable rate limiting
✓ Setup IP whitelist on MongoDB Atlas

Monitoring:
✓ Setup error logging
✓ Setup request logging
✓ Setup authentication logs
✓ Monitor failed login attempts
✓ Alert on unusual activity

Testing:
✓ Test registration flow
✓ Test login flow
✓ Test token refresh
✓ Test role-based access
✓ Test permission checks
✓ Test error handling
✓ Test with invalid tokens
✓ Load test authentication endpoints

═════════════════════════════════════════════════════════════════════
🚀 QUICK DEPLOYMENT STEPS
═════════════════════════════════════════════════════════════════════

1. Generate JWT Secrets
   $ node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   (Run twice: once for JWT_SECRET, once for JWT_REFRESH_SECRET)

2. Update Production .env
   MONGO_URI=<production_mongodb_uri>
   JWT_SECRET=<generated_secret>
   JWT_REFRESH_SECRET=<generated_secret>
   NODE_ENV=production
   CLIENT_URL=<production_frontend_url>

3. Install Dependencies
   $ npm install --production

4. Test Locally with Production Config
   $ NODE_ENV=production npm start

5. Deploy to Hosting
   $ git push to deployment branch
   (or manually upload files)

6. Verify Deployment
   $ curl https://api.example.com/api/health
   $ curl -X POST https://api.example.com/api/auth/register

═════════════════════════════════════════════════════════════════════
📞 NEED HELP?
═════════════════════════════════════════════════════════════════════

Documentation Files:
- JWT_AUTHENTICATION_GUIDE.md - Full authentication guide
- JWT_AUTH_CHECKLIST.md - Implementation status
- DEVELOPMENT_GUIDE.md - Code patterns and examples
- routes/EXAMPLE_ROUTES.js - Example route implementations

Test Scripts:
- test_auth.sh - Linux/Mac testing (bash)
- test_auth.ps1 - Windows testing (PowerShell)

API Testing:
- Use Postman to import and test endpoints
- Use curl for command-line testing
- Check API responses format in docs

═════════════════════════════════════════════════════════════════════
