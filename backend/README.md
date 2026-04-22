# AgriDesk Backend API

Production-ready REST API for the AgriDesk Farmer-to-Consumer Marketplace. Built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication**: JWT-based auth with role-based access control (Farmer, Consumer, Admin)
- **Product Management**: Full CRUD operations for agricultural products
- **Order Management**: Complete order lifecycle management
- **File Uploads**: Support for product images and user avatars
- **Error Handling**: Centralized, production-ready error handling
- **Logging**: Comprehensive request and error logging
- **Security**: Helmet for HTTP headers, CORS configuration, rate limiting
- **Validation**: Express-validator with custom validators
- **Scalable Architecture**: MVC pattern with services layer

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB Atlas account or local MongoDB
- Git

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your configuration:
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `JWT_SECRET`: JWT signing secret
   - `JWT_REFRESH_SECRET`: Refresh token secret
   - `CLIENT_URL`: Frontend URL

4. **Verify MongoDB connection**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
backend/
├── config/           # Configuration files
│   ├── database.js   # MongoDB connection
│   └── corsConfig.js # CORS settings
├── controllers/      # Route handlers
│   ├── authController.js
│   ├── productController.js
│   └── userController.js
├── middleware/       # Custom middleware
│   ├── errorHandler.js     # Global error handling
│   ├── auth.js             # JWT verification
│   ├── validation.js       # Express-validator wrapper
│   └── requestLogger.js    # Request logging
├── models/          # Mongoose schemas
│   ├── User.js
│   ├── Product.js
│   └── Order.js
├── routes/          # API routes
│   ├── authRoutes.js
│   ├── productRoutes.js
│   └── userRoutes.js
├── services/        # Business logic
│   └── authService.js
├── utils/          # Helper utilities
│   ├── asyncHandler.js
│   ├── logger.js
│   └── validators.js
├── uploads/        # File storage
├── .env.example    # Environment template
├── package.json    # Dependencies
└── server.js       # Express app entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user (Protected)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Farmer only)
- `PUT /api/products/:id` - Update product (Farmer only)
- `DELETE /api/products/:id` - Delete product (Farmer only)
- `GET /api/products/farmer/products` - Get farmer's products (Farmer only)

### Users
- `GET /api/users/profile/:id` - Get user profile
- `PUT /api/users/profile` - Update profile (Protected)
- `GET /api/users/farmer/:id` - Get farmer details and products

### Health
- `GET /api/health` - Server health check

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
Server runs on `http://localhost:5000` with auto-reload

### Production Mode
```bash
npm start
```

### Run Tests
```bash
npm test
```

## 🔐 Authentication

The API uses JWT tokens for authentication:

1. **Access Token**: Short-lived (7 days default)
   - Sent in `Authorization: Bearer <token>` header
   
2. **Refresh Token**: Long-lived (30 days default)
   - Stored in httpOnly cookies
   - Used to get new access tokens

## 🛡️ Security Features

- **CORS**: Configured to accept requests from frontend only
- **Helmet**: Sets secure HTTP headers
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Input Validation**: Express-validator on all inputs
- **Rate Limiting**: Built-in rate limiting configuration
- **Environment Variables**: Sensitive data in .env file

## 📝 Creating a Product Example

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Fresh Tomatoes",
    "description": "Organic farm-fresh tomatoes",
    "category": "vegetables",
    "price": 50,
    "quantity": 100,
    "unit": "kg"
  }'
```

## 🔧 Database Models

### User Model
- name, email (unique), password (hashed)
- role: farmer | consumer | admin
- address: street, city, state, country, zipCode
- phone, avatar, isVerified, isActive

### Product Model
- name, description, category, price, quantity
- farmer (reference to User), ratings, reviewCount
- images array, tags, harvest date, expiry date
- organicCertified, origin, shippingAvailable

### Order Model
- consumer, items (product + quantity + price)
- shippingAddress, paymentMethod, paymentStatus
- orderStatus, total, subtotal, tax, discount

## 🔗 Environment Variables

See `.env.example` for all available variables:
- Database configuration
- JWT secrets
- Email service (optional)
- AWS S3 (optional)
- Payment gateway keys (optional)
- Logging configuration

## 📦 Dependencies

### Core
- **express**: Web framework
- **mongoose**: MongoDB ODM
- **dotenv**: Environment configuration
- **cors**: CORS middleware

### Security
- **helmet**: HTTP headers security
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT handling
- **express-validator**: Input validation

### Utilities
- **multer**: File uploads
- **morgan**: HTTP request logging
- **express-rate-limit**: Rate limiting
- **joi**: Schema validation

## 🧪 Testing

The project includes test setup with Jest:
```bash
npm test
```

## 📚 API Documentation

For detailed API documentation, consider using:
- Postman (import collection)
- Swagger/OpenAPI (add docs endpoint)
- API Blueprint

## 🐛 Error Handling

All errors return consistent JSON format:
```json
{
  "success": false,
  "message": "Error description",
  "field": "fieldName (if validation error)"
}
```

## 📈 Scalability Considerations

- Database indexes on frequently queried fields
- Connection pooling with MongoDB Atlas
- Pagination for list endpoints
- Rate limiting to prevent abuse
- Logging for monitoring and debugging
- Async/await for non-blocking operations

## 🚢 Deployment

### Environment Setup
1. Set up MongoDB Atlas cluster
2. Configure environment variables in hosting platform
3. Enable CORS for your production domain
4. Set `NODE_ENV=production`

### Hosting Options
- Heroku, Railway, Render (PaaS)
- AWS, Google Cloud, Azure (IaaS)
- DigitalOcean, Linode (VPS)

## 📞 Support

For issues and questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Contact team via email

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch
3. Follow code style
4. Submit pull request

---

**Last Updated**: April 2024
**Version**: 1.0.0
