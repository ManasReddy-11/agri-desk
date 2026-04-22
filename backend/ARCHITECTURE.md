/**
 * AGRI DESK BACKEND - PROJECT STRUCTURE GUIDE
 * Production-Ready Scalable MVC Architecture
 */

backend/
│
├── 📋 Configuration Files
│   ├── package.json                 # Project dependencies and scripts
│   ├── .env.example                 # Environment variables template
│   ├── .env                         # (Create from .env.example)
│   ├── .gitignore                   # Git ignore rules
│   ├── .eslintrc.js                 # ESLint configuration
│   ├── jest.config.js               # Jest testing configuration
│   └── README.md                    # Project documentation
│
├── 🖥️  Server Entry Point
│   └── server.js                    # Express app initialization & startup
│
├── ⚙️  Config Directory
│   ├── database.js                  # MongoDB connection setup
│   └── corsConfig.js                # CORS policy configuration
│
├── 🔐 Middleware Directory (Cross-cutting concerns)
│   ├── auth.js                      # JWT verification & role authorization
│   ├── errorHandler.js              # Global error handling & custom AppError
│   ├── validation.js                # Express-validator error handler
│   └── requestLogger.js             # HTTP request logging
│
├── 📦 Models Directory (Database schemas)
│   ├── User.js                      # User schema (farmer/consumer/admin)
│   ├── Product.js                   # Product schema with farmer relationship
│   └── Order.js                     # Order schema with items & pricing
│
├── 🛣️  Routes Directory (API endpoints)
│   ├── authRoutes.js                # /api/auth/* endpoints
│   ├── productRoutes.js             # /api/products/* endpoints
│   └── userRoutes.js                # /api/users/* endpoints
│
├── 🎮 Controllers Directory (Request handlers)
│   ├── authController.js            # Auth logic (register, login, tokens)
│   ├── productController.js         # Product CRUD operations
│   └── userController.js            # User profile operations
│
├── 💼 Services Directory (Business logic)
│   └── authService.js               # JWT generation, password hashing, auth logic
│
├── 🛠️  Utils Directory (Helper functions)
│   ├── asyncHandler.js              # Async error wrapper for routes
│   ├── logger.js                    # File & console logging utility
│   └── validators.js                # Reusable validation rules
│
├── 📁 Uploads Directory (File storage)
│   └── .gitkeep                     # Keeps directory in git
│
└── 📜 Setup Scripts
    ├── setup.sh                     # Setup script for Linux/Mac
    └── setup.bat                    # Setup script for Windows

═════════════════════════════════════════════════════════════════════

## 🔄 REQUEST FLOW (MVC Architecture)

1. REQUEST COMES IN
   ↓
2. MIDDLEWARE PIPELINE
   - CORS check
   - Request logger
   - Body parser
   - Error wrapper
   ↓
3. ROUTE HANDLER
   - Express routes (authRoutes.js, productRoutes.js)
   - Validators applied (express-validator)
   ↓
4. CONTROLLER
   - Receives validated request data
   - Calls service layer
   - Formats response
   ↓
5. SERVICE LAYER
   - Contains business logic
   - Database operations
   - Error handling
   ↓
6. DATABASE (MongoDB + Mongoose)
   - Models define schema
   - Validations & methods
   - Returns data to service
   ↓
7. RESPONSE SENT
   - Controller formats JSON
   - Status code set
   - Sent to client

═════════════════════════════════════════════════════════════════════

## 🚀 QUICK START

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup environment:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secrets
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Access API:
   ```
   http://localhost:5000/api/health
   ```

═════════════════════════════════════════════════════════════════════

## 📝 KEY IMPLEMENTATION DETAILS

### Error Handling
- Centralized in middleware/errorHandler.js
- Custom AppError class
- Handles validation, JWT, MongoDB errors
- Consistent JSON response format

### Authentication
- JWT tokens (access + refresh)
- Role-based access control (farmer/consumer/admin)
- Password hashing with bcryptjs
- Refresh token in httpOnly cookies

### Validation
- express-validator for input validation
- Reusable validators in utils/validators.js
- Custom error messages
- Applied in routes or controllers

### Database
- MongoDB Atlas with Mongoose ODM
- Schema validation & type safety
- Instance methods (comparePassword, isAvailable)
- Indexes on frequently queried fields

### Logging
- Morgan for HTTP requests
- Custom logger in utils/logger.js
- File & console output
- Timestamp on all logs

### Security Features
- Helmet for HTTP headers
- CORS middleware with whitelist
- Rate limiting ready
- Password hashing
- JWT token validation
- Input validation

═════════════════════════════════════════════════════════════════════

## 📊 API ENDPOINTS STRUCTURE

Authentication:
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  POST   /api/auth/refresh-token
  POST   /api/auth/request-password-reset
  POST   /api/auth/reset-password
  POST   /api/auth/verify-email
  GET    /api/auth/me (Protected)

Products:
  GET    /api/products (Public)
  GET    /api/products/:id (Public)
  POST   /api/products (Protected - Farmer)
  PUT    /api/products/:id (Protected - Farmer)
  DELETE /api/products/:id (Protected - Farmer)
  GET    /api/products/farmer/products (Protected - Farmer)

Users:
  GET    /api/users/profile/:id (Public)
  PUT    /api/users/profile (Protected)
  GET    /api/users/farmer/:id (Public)

Health:
  GET    /api/health (Public)

═════════════════════════════════════════════════════════════════════

## 🔧 ENVIRONMENT VARIABLES

REQUIRED:
  - MONGODB_URI: MongoDB Atlas connection string
  - JWT_SECRET: JWT signing secret (min 32 chars)
  - JWT_REFRESH_SECRET: Refresh token secret

OPTIONAL:
  - NODE_ENV: production/development (default: development)
  - PORT: Server port (default: 5000)
  - CLIENT_URL: Frontend URL for CORS
  - EMAIL_SERVICE: For email notifications
  - AWS_S3_BUCKET_NAME: For file uploads

═════════════════════════════════════════════════════════════════════

## 🎯 SCALABILITY FEATURES

✓ Database indexing for query optimization
✓ Pagination for list endpoints
✓ Connection pooling with MongoDB Atlas
✓ Async/await for non-blocking operations
✓ Service layer separation for code reuse
✓ Middleware chaining for clean code
✓ Error handling prevents server crashes
✓ Logging for monitoring & debugging
✓ Input validation prevents malicious data
✓ Rate limiting configuration ready
✓ Environment-based configuration
✓ MVC pattern enables testing & maintenance

═════════════════════════════════════════════════════════════════════

## 📚 NEXT STEPS

1. Complete Product model with reviews
2. Add Order routes & controllers
3. Implement cart management
4. Add payment gateway integration
5. Implement email notifications
6. Add file upload with Multer
7. Create admin dashboard endpoints
8. Write comprehensive tests
9. Add API documentation (Swagger)
10. Setup CI/CD pipeline

═════════════════════════════════════════════════════════════════════
