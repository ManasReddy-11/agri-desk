# Product Module - Complete Guide

## Overview

The Product Module is the core of the AgriDesk marketplace. It provides comprehensive product management for farmers (sellers) and browsing/filtering capabilities for consumers (buyers).

### Features
- **Farmer Features**: Create, Edit, Delete, Update Quantity
- **Consumer Features**: Browse, Search, Filter by Price, Filter by Location
- **Advanced Filtering**: By category, price range, location, ratings, certifications
- **Search**: Full-text search on product name and description
- **Stock Management**: Real-time inventory tracking

---

## Database Schema

### Product Model

```javascript
{
  // Basic Information
  name: String (required, 3-100 chars) - Product name
  description: String (required, 10-2000 chars) - Detailed description
  category: String (enum: vegetables, fruits, grains, dairy, meat, honey, spices, other)
  
  // Pricing
  price: Number (required, min: 0)
  discountedPrice: Number (optional)
  
  // Inventory
  quantity: Number (required, min: 0)
  unit: String (enum: kg, g, l, ml, piece, dozen, box, crate)
  minOrderQuantity: Number (default: 1)
  inStock: Boolean (default: true)
  
  // Media
  images: Array of {url, publicId, uploadedAt}
  thumbnail: String
  
  // Farmer Reference
  farmer: ObjectId (ref: User) - Farmer who listed the product
  
  // Ratings & Reviews
  ratings: Number (0-5, default: 0)
  reviewCount: Number (default: 0)
  reviews: Array of Review ObjectIds
  
  // Metadata
  tags: [String]
  organicCertified: Boolean (default: false)
  origin: String (birth/harvest origin)
  
  // Location Information (for filtering)
  location: {
    city: String
    state: String
    country: String (default: India)
    zipCode: String
  }
  
  // Shipping
  shippingAvailable: Boolean (default: true)
  shippingCost: Number (default: 0)
  freeShippingAbove: Number (default: 0)
  
  // Status
  isActive: Boolean (default: true)
  
  // Dates
  harvestDate: Date
  expiryDate: Date
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### Indexes

- `farmer`: Quick lookup of farmer's products
- `category`: Filter by product category
- `name` + `description` (text): Full-text search
- `createdAt`: Sort by creation date
- `location.city` / `location.state`: Location-based filtering
- `price`: Price range filtering
- `isActive` + `inStock`: Show only available products

---

## API Endpoints

### BASE URL: `/api/products`

---

## CONSUMER ENDPOINTS (Public)

### 1. Browse All Products with Filters

**Endpoint:** `GET /`

**Description:** Get all active, in-stock products with optional filters and pagination

**Query Parameters:**
```
page          (number, default: 1)
limit         (number, default: 12)
category      (string, enum: vegetables|fruits|grains|dairy|meat|honey|spices|other)
search        (string) - Search in name/description
minPrice      (number) - Minimum price filter
maxPrice      (number) - Maximum price filter
city          (string) - City filter
state         (string) - State filter
```

**Example Request:**
```bash
GET /api/products?page=1&limit=12&category=vegetables&minPrice=10&maxPrice=100&city=Ludhiana
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Fresh Tomatoes",
      "description": "Organic tomatoes from Punjab",
      "category": "vegetables",
      "price": 45,
      "discountedPrice": 35,
      "discountPercentage": 22,
      "quantity": 500,
      "unit": "kg",
      "inStock": true,
      "farmer": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Rajesh Kumar",
        "email": "rajesh@agri.com",
        "phone": "+91-9876543210",
        "location": {...}
      },
      "ratings": 4.5,
      "reviewCount": 45,
      "organicCertified": true,
      "origin": "Punjab",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 52,
    "itemsPerPage": 12
  }
}
```

---

### 2. Get Single Product Details

**Endpoint:** `GET /:id`

**Description:** Get detailed information about a single product including farmer details and reviews

**Parameters:**
- `id` (string, required) - Product MongoDB ObjectId

**Example Request:**
```bash
GET /api/products/507f1f77bcf86cd799439011
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Fresh Tomatoes",
    "description": "Organic vine-ripe tomatoes",
    "category": "vegetables",
    "price": 45,
    "discountedPrice": 35,
    "discountPercentage": 22,
    "quantity": 500,
    "unit": "kg",
    "minOrderQuantity": 2,
    "images": [
      {
        "url": "https://...",
        "publicId": "agri_desk_product_123",
        "uploadedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "thumbnail": "https://...",
    "farmer": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Rajesh Kumar",
      "email": "rajesh@agri.com",
      "phone": "+91-9876543210",
      "address": {...},
      "location": {...},
      "ratings": 4.8
    },
    "ratings": 4.5,
    "reviewCount": 45,
    "tags": ["organic", "fresh", "local"],
    "organicCertified": true,
    "origin": "Punjab",
    "location": {
      "city": "Ludhiana",
      "state": "Punjab",
      "country": "India",
      "zipCode": "141008"
    },
    "shippingAvailable": true,
    "shippingCost": 50,
    "inStock": true,
    "isActive": true,
    "harvestDate": "2024-01-14T00:00:00Z",
    "reviews": [
      {
        "_id": "review_id_1",
        "rating": 5,
        "comment": "Excellent quality tomatoes!"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 3. Search Products

**Endpoint:** `POST /search`

**Description:** Full-text search on product name and description

**Request Body:**
```json
{
  "query": "tomato",
  "page": 1,
  "limit": 12
}
```

**Example Request:**
```bash
curl -X POST /api/products/search \
  -H "Content-Type: application/json" \
  -d '{"query": "organic tomato", "page": 1, "limit": 12}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Found 23 products matching your search",
  "data": [...], // Products matching search query
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 23
  }
}
```

---

### 4. Filter Products by Price Range

**Endpoint:** `GET /filter/price`

**Description:** Get products within a specific price range

**Query Parameters:**
```
minPrice    (number, required) - Minimum price
maxPrice    (number, required) - Maximum price
category    (string, optional) - Filter further by category
page        (number, default: 1)
limit       (number, default: 12)
```

**Example Request:**
```bash
GET /api/products/filter/price?minPrice=30&maxPrice=100&category=vegetables&page=1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Products filtered by price",
  "data": [...],
  "pagination": {...}
}
```

---

### 5. Filter Products by Location

**Endpoint:** `GET /filter/location`

**Description:** Get products available in a specific city/state

**Query Parameters:**
```
city        (string, required) - City name
state       (string, required) - State name
page        (number, default: 1)
limit       (number, default: 12)
```

**Example Request:**
```bash
GET /api/products/filter/location?city=Ludhiana&state=Punjab&page=1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Products in Ludhiana, Punjab",
  "data": [...],
  "pagination": {...}
}
```

---

### 6. Get Products by Category

**Endpoint:** `GET /category/:category`

**Description:** Get all products in a specific category

**Parameters:**
- `category` (string, enum: vegetables|fruits|grains|dairy|meat|honey|spices|other)

**Query Parameters:**
```
page        (number, default: 1)
limit       (number, default: 12)
```

**Example Request:**
```bash
GET /api/products/category/vegetables?page=1&limit=12
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Retrieved vegetables products",
  "data": [...],
  "pagination": {...}
}
```

---

### 7. Get Best Selling Products

**Endpoint:** `GET /bestsellers`

**Description:** Get products sorted by review count and ratings

**Query Parameters:**
```
limit      (number, default: 10)
```

**Example Request:**
```bash
GET /api/products/bestsellers?limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Best selling products",
  "data": [...]
}
```

---

### 8. Get Organic Certified Products

**Endpoint:** `GET /organic/certified`

**Description:** Get only organic certified products

**Query Parameters:**
```
page       (number, default: 1)
limit      (number, default: 12)
```

**Example Request:**
```bash
GET /api/products/organic/certified?page=1&limit=12
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Organic certified products",
  "data": [...],
  "pagination": {...}
}
```

---

### 9. Get Farmer Profile and Products

**Endpoint:** `GET /farmer/:farmerId`

**Description:** Get a specific farmer's profile and their active products

**Parameters:**
- `farmerId` (string, ObjectId) - Farmer's MongoDB ID

**Query Parameters:**
```
page       (number, default: 1)
limit      (number, default: 10)
```

**Example Request:**
```bash
GET /api/products/farmer/507f1f77bcf86cd799439012?page=1&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Farmer profile retrieved successfully",
  "data": {
    "farmer": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Rajesh Kumar",
      "email": "rajesh@agri.com",
      "phone": "+91-9876543210",
      "address": {...},
      "ratings": 4.8,
      "joinedOn": "2023-01-10T00:00:00Z"
    },
    "products": [...],
    "stats": {
      "totalListings": 45,
      "activeListings": 40,
      "averageRating": 4.8
    },
    "pagination": {...}
  }
}
```

---

## FARMER ENDPOINTS (Protected - Requires Authentication & Farmer Role)

---

### 1. Create New Product

**Endpoint:** `POST /`

**Authentication:** Required (Bearer Token) + Farmer role

**Description:** Create a new product listing

**Request Body:**
```json
{
  "name": "Fresh Tomatoes",
  "description": "Organic vine-ripe tomatoes from our farm",
  "category": "vegetables",
  "price": 45,
  "discountedPrice": 35,
  "quantity": 500,
  "unit": "kg",
  "minOrderQuantity": 2,
  "tags": ["organic", "fresh"],
  "organicCertified": true,
  "origin": "Punjab",
  "harvestDate": "2024-01-14T00:00:00Z",
  "expiryDate": "2024-01-25T00:00:00Z",
  "shippingAvailable": true,
  "shippingCost": 50,
  "location": {
    "city": "Ludhiana",
    "state": "Punjab",
    "zipCode": "141008"
  }
}
```

**Example Request:**
```bash
curl -X POST /api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Fresh Tomatoes",
    "description": "Organic vine-ripe tomatoes from our farm",
    "category": "vegetables",
    "price": 45,
    "discountedPrice": 35,
    "quantity": 500,
    "unit": "kg",
    "farmer": {
      "_id": "YOUR_FARMER_ID",
      "name": "Your Name",
      "email": "your@email.com",
      "phone": "+91-XXXXXXXXXX"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Get Your Products

**Endpoint:** `GET /my/products`

**Authentication:** Required (Bearer Token) + Farmer role

**Description:** Get all products listed by the logged-in farmer

**Query Parameters:**
```
page       (number, default: 1)
limit      (number, default: 10)
category   (string, optional)
status     (string, optional: active|inactive|all, default: all)
```

**Example Request:**
```bash
curl -X GET /api/products/my/products?page=1&limit=10&status=active \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Your products retrieved successfully",
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 15
  }
}
```

---

### 3. Update Product Details

**Endpoint:** `PUT /:id`

**Authentication:** Required (Bearer Token) + Farmer role + Ownership verification

**Description:** Update product details (all except quantity)

**Parameters:**
- `id` (string, ObjectId) - Product ID

**Request Body (all fields optional):**
```json
{
  "name": "Premium Fresh Tomatoes",
  "description": "Updated description",
  "price": 50,
  "discountedPrice": 40,
  "category": "vegetables",
  "organicCertified": true,
  "origin": "Punjab",
  "harvestDate": "2024-01-14T00:00:00Z",
  "expiryDate": "2024-01-25T00:00:00Z",
  "shippingAvailable": true,
  "shippingCost": 50,
  "location": {
    "city": "Ludhiana",
    "state": "Punjab",
    "zipCode": "141008"
  },
  "isActive": true
}
```

**Example Request:**
```bash
curl -X PUT /api/products/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"price": 50, "discountedPrice": 40}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Premium Fresh Tomatoes",
    "price": 50,
    ...
  }
}
```

---

### 4. Update Product Quantity (Restock)

**Endpoint:** `PATCH /:id/quantity`

**Authentication:** Required (Bearer Token) + Farmer role + Ownership verification

**Description:** Update product quantity (for restocking or adjustment)

**Parameters:**
- `id` (string, ObjectId) - Product ID

**Request Body:**
```json
{
  "quantity": 100,
  "action": "add"  // or "set"
}
```

**Action Types:**
- `"add"`: Add to existing quantity (restock)
- `"set"`: Set quantity to specific value (replace)

**Example Requests:**

```bash
# Add 100 units (restock)
curl -X PATCH /api/products/507f1f77bcf86cd799439011/quantity \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"quantity": 100, "action": "add"}'

# Set quantity to 500 (replace)
curl -X PATCH /api/products/507f1f77bcf86cd799439011/quantity \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"quantity": 500, "action": "set"}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product quantity restocked successfully",
  "data": {
    "productId": "507f1f77bcf86cd799439011",
    "name": "Fresh Tomatoes",
    "quantity": 600,
    "inStock": true
  }
}
```

---

### 5. Toggle Product Active Status

**Endpoint:** `PATCH /:id/status`

**Authentication:** Required (Bearer Token) + Farmer role + Ownership verification

**Description:** Activate or deactivate (pause) a product listing

**Parameters:**
- `id` (string, ObjectId) - Product ID

**Request Body:**
```json
{
  "isActive": false  // true to activate, false to deactivate
}
```

**Example Request:**
```bash
curl -X PATCH /api/products/507f1f77bcf86cd799439011/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product deactivated successfully",
  "data": {
    "productId": "507f1f77bcf86cd799439011",
    "name": "Fresh Tomatoes",
    "isActive": false
  }
}
```

---

### 6. Delete Product

**Endpoint:** `DELETE /:id`

**Authentication:** Required (Bearer Token) + Farmer role + Ownership verification

**Description:** Delete/remove a product listing (soft delete - marks as inactive)

**Parameters:**
- `id` (string, ObjectId) - Product ID

**Example Request:**
```bash
curl -X DELETE /api/products/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": {
    "productId": "507f1f77bcf86cd799439011",
    "message": "Product has been removed from listings"
  }
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Please provide all required fields",
  "statusCode": 400
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Please provide a valid authentication token",
  "statusCode": 401
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "You are not authorized to access this resource",
  "statusCode": 403
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Product not found",
  "statusCode": 404
}
```

---

## Product Model Methods

### Instance Methods

```javascript
// Check if product is available for purchase
product.isAvailable()  // Returns: Boolean

// Get final price (discounted or regular)
product.getFinalPrice()  // Returns: Number

// Check if product is expired
product.isExpired()  // Returns: Boolean

// Deduct quantity after purchase
await product.updateStock(purchasedQuantity)  // Saves and returns updated product

// Add quantity (restock)
await product.addStock(addQuantity)  // Saves and returns updated product

// Update rating (when reviews are added)
await product.updateRating(newRating)  // Saves and returns updated product
```

### Virtual Properties

```javascript
// Discount percentage
product.discountPercentage  // Returns: Number (0-100)

// Effective price (discounted or regular)
product.effectivePrice  // Returns: Number
```

### Static Methods

```javascript
// Get best sellers
await Product.getBestSellers(limit)

// Get products by category
await Product.getByCategory(category, filters)

// Search products
await Product.searchProducts(searchQuery, filters)

// Filter by price
await Product.filterByPrice(minPrice, maxPrice, filters)

// Filter by location
await Product.filterByLocation(city, state, filters)
```

---

## Validation Rules

### Required Fields for Creating Product

- `name`: 3-100 characters
- `description`: 10-2000 characters
- `category`: One of enum values
- `price`: Number ≥ 0
- `quantity`: Number ≥ 0
- `unit`: One of enum values

### Optional but Important Fields

- `discountedPrice`: Should be less than `price`
- `minOrderQuantity`: Default is 1
- `location`: Should match farmer's actual location
- `harvestDate` / `expiryDate`: ISO date strings
- `images`: Array of image objects with URL and publicId

---

## Rate Limiting & Performance

Recommended rate limits for API:
- **Read operations**: 100 requests/minute per user
- **Write operations**: 30 requests/minute per user
- **Search operations**: 50 requests/minute per user

Indexes are configured for optimal performance on:
- Farmer-based queries
- Category filtering
- Full-text search
- Geographic queries
- Price range queries

---

## Example Workflows

### Consumer Workflow: Find and View Products

```bash
# 1. Browse vegetables with price filter
GET /api/products?category=vegetables&minPrice=20&maxPrice=100

# 2. Search for specific product
POST /api/products/search
{"query": "organic tomato"}

# 3. View product details
GET /api/products/507f1f77bcf86cd799439011

# 4. View farmer's other products
GET /api/products/farmer/507f1f77bcf86cd799439012
```

### Farmer Workflow: Manage Products

```bash
# 1. Create a new product
POST /api/products
{
  "name": "Fresh Tomatoes",
  "description": "...",
  "category": "vegetables",
  "price": 45,
  "quantity": 500,
  "unit": "kg"
}

# 2. View your products
GET /api/products/my/products?status=active

# 3. Update product price and details
PUT /api/products/PRODUCT_ID
{"price": 50, "discountedPrice": 40}

# 4. Restock product
PATCH /api/products/PRODUCT_ID/quantity
{"quantity": 100, "action": "add"}

# 5. Deactivate product
PATCH /api/products/PRODUCT_ID/status
{"isActive": false}

# 6. Delete product
DELETE /api/products/PRODUCT_ID
```

---

## Testing the Product Module

### Using cURL

```bash
# Test browsing products
curl http://localhost:5000/api/products?page=1&limit=10

# Test search
curl -X POST http://localhost:5000/api/products/search \
  -H "Content-Type: application/json" \
  -d '{"query": "tomato"}'

# Test creating product (with valid token)
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## Next Steps

1. **Image Upload**: Integrate Cloudinary/AWS for product images
2. **Reviews & Ratings**: Create Review model and endpoints
3. **Cart System**: Implement shopping cart functionality
4. **Orders**: Create Order model and management
5. **Notifications**: Add email/notification system for order updates
6. **Payment Gateway**: Integrate Stripe/Razorpay for payments

