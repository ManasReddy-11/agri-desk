/**
 * DEVELOPMENT GUIDE & BEST PRACTICES
 * AgriDesk Backend
 */

═════════════════════════════════════════════════════════════════════
📖 QUICK REFERENCE GUIDE
═════════════════════════════════════════════════════════════════════

## 🌟 COMMON TASKS

### Create a New Route
1. Add endpoint in routes/newRoutes.js
2. Create controller in controllers/newController.js
3. Import controller in routes
4. Add route handler
5. Import routes in server.js

Example:
```javascript
// routes/productRoutes.js
router.post('/search', productController.searchProducts);

// controllers/productController.js
export const searchProducts = async (req, res, next) => {
  try {
    const { query } = req.body;
    // Logic here
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
```

### Create a New Model
1. Create schema in models/NewModel.js
2. Add pre-hooks if needed
3. Add instance methods
4. Export model
5. Import & use in controllers/services

Example:
```javascript
// models/Review.js
const reviewSchema = new mongoose.Schema({
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  product: mongoose.Schema.Types.ObjectId,
});

export default mongoose.model('Review', reviewSchema);
```

### Add Authentication to Route
```javascript
// Protected route - requires login
router.post('/action', verifyToken, productController.action);

// Protected route - requires specific role
router.post('/admin-action', 
  verifyToken, 
  authorize('admin'),
  adminController.action
);
```

### Create Service Method
```javascript
// services/productService.js
export const getProductsByCategory = async (category) => {
  try {
    const products = await Product.find({ category, isActive: true });
    return products;
  } catch (error) {
    throw new AppError('Failed to fetch products', 500);
  }
};

// Use in controller
export const getByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const products = await productService.getProductsByCategory(category);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};
```

### Add Input Validation
```javascript
// utils/validators.js
export const customValidators = {
  createReview: [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').isLength({ min: 10 }),
    body('product').matches(/^[0-9a-fA-F]{24}$/),
  ],
};

// routes/reviewRoutes.js
router.post('/review', 
  customValidators.createReview,
  handleValidationErrors,
  reviewController.create
);
```

═════════════════════════════════════════════════════════════════════

## 🔑 KEY PATTERNS

### Error Handling Pattern
```javascript
try {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  res.json({ success: true, data: user });
} catch (error) {
  next(error); // Passes to global error handler
}
```

### Async Controller Pattern
```javascript
export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
```

### Service Layer Pattern
```javascript
class ProductService {
  async createProduct(data) {
    try {
      const product = await Product.create(data);
      return product;
    } catch (error) {
      throw new AppError('Failed to create product', 500);
    }
  }

  async getProduct(id) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return product;
  }
}
```

### Middleware Pattern
```javascript
export const customMiddleware = (req, res, next) => {
  // Logic here
  if (condition) {
    throw new AppError('Error message', statusCode);
  }
  next(); // Continue to next middleware/route
};

// Use in route
router.get('/protected', customMiddleware, controller.handler);
```

═════════════════════════════════════════════════════════════════════

## ⚡ PERFORMANCE TIPS

1. Use MongoDB Indexes
```javascript
userSchema.index({ email: 1 });
productSchema.index({ farmer: 1, category: 1 });
productSchema.index({ name: 'text' });
```

2. Implement Pagination
```javascript
const skip = (page - 1) * limit;
const products = await Product.find()
  .skip(skip)
  .limit(limit);
```

3. Select Only Required Fields
```javascript
const user = await User.findById(id).select('-password -resetToken');
const products = await Product.find().select('name price category');
```

4. Use Lean Query for Read-only
```javascript
const products = await Product.find().lean(); // Faster for reading
```

5. Populate Efficiently
```javascript
const orders = await Order.find()
  .populate('user', 'name email') // Only specific fields
  .limit(10);
```

═════════════════════════════════════════════════════════════════════

## 🧪 TESTING EXAMPLES

### Test Authentication
```javascript
describe('Auth Endpoints', () => {
  it('should register user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@test.com',
        password: 'Test@1234',
        name: 'Test User',
        role: 'consumer',
      });
    expect(res.status).toBe(201);
  });
});
```

### Test Protected Route
```javascript
it('should get user profile when authenticated', async () => {
  const res = await request(app)
    .get('/api/users/profile')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
});
```

═════════════════════════════════════════════════════════════════════

## 🐛 DEBUGGING TIPS

1. Check MongoDB Connection
```bash
npm run dev
# Look for "✓ MongoDB Connected: ..." message
```

2. Enable Debug Logging
```bash
DEBUG=* npm run dev
```

3. Check Environment Variables
```javascript
console.log(process.env.MONGODB_URI);
console.log(process.env.JWT_SECRET);
```

4. Inspect Request
```javascript
export const debugMiddleware = (req, res, next) => {
  console.log('Method:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
};
```

5. Postman Debugging
- Set Authorization header
- Send raw JSON body
- Check response status
- Save requests in collection

═════════════════════════════════════════════════════════════════════

## 📋 CODE STYLE GUIDELINES

✓ Use ES6 modules (import/export)
✓ Use async/await for promises
✓ PascalCase for classes and schemas
✓ camelCase for variables and functions
✓ kebab-case for file names (except schemas)
✓ Arrow functions for callbacks
✓ Object destructuring in parameters
✓ Template literals for strings
✓ Destructure responses from Mongoose
✓ Add comments for complex logic

GOOD:
```javascript
import express from 'express';
const userSchema = new Schema({ name: String });
export const getUser = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  return user?.getPublicProfile();
};
```

BAD:
```javascript
const express = require('express');
var UserSchema = new Schema({ name: String });
exports.getUser = function(req, res) {
  var userId = req.params.userId;
  User.findById(userId, function(err, user) {
    return user;
  });
};
```

═════════════════════════════════════════════════════════════════════

## 🚀 DEPLOYMENT CHECKLIST

Before deployment:

✓ Test all endpoints locally
✓ Set up MongoDB Atlas cluster
✓ Configure environment variables
✓ Enable CORS for production domain
✓ Set NODE_ENV=production
✓ Update CLIENT_URL in .env
✓ Run npm test
✓ Check console for errors
✓ Review security headers
✓ Enable rate limiting
✓ Set up logging
✓ Configure database backups
✓ Test error handling
✓ Verify JWT secrets are strong
✓ Check file upload limits

═════════════════════════════════════════════════════════════════════

## 📦 NPM SCRIPTS

npm start          → Start production server
npm run dev        → Start development with nodemon
npm test           → Run tests with Jest
npm run lint       → Check code style with ESLint
npm run seed       → Seed database with sample data

═════════════════════════════════════════════════════════════════════

## 🔗 USEFUL LINKS

- Express Documentation: https://expressjs.com
- Mongoose Documentation: http://mongoosejs.com
- JWT: https://jwt.io
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- REST API Best Practices: https://restfulapi.net

═════════════════════════════════════════════════════════════════════
