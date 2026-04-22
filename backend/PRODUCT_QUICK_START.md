# Product Module - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js backend running on port 5000
- MongoDB Atlas connection configured
- Valid JWT tokens for authentication

---

## Consumer Quick Start

### 1. Browse Products

Get all available products with pagination:
```bash
curl http://localhost:5000/api/products?page=1&limit=12
```

### 2. Search for Products

Search for specific products:
```bash
curl -X POST http://localhost:5000/api/products/search \
  -H "Content-Type: application/json" \
  -d '{"query": "tomato", "page": 1, "limit": 12}'
```

### 3. Filter by Price

Find products within a price range:
```bash
curl http://localhost:5000/api/products/filter/price?minPrice=20&maxPrice=100
```

### 4. Filter by Location

Find products available in your area:
```bash
curl http://localhost:5000/api/products/filter/location?city=Ludhiana&state=Punjab
```

### 5. Browse by Category

See all products in a category:
```bash
curl http://localhost:5000/api/products/category/vegetables?page=1&limit=12
```

### 6. View Product Details

Get complete details of a product:
```bash
curl http://localhost:5000/api/products/{PRODUCT_ID}
```

---

## Farmer Quick Start

### Authentication Required
All farmer endpoints require a JWT bearer token:
```bash
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 1. Create a Product

List a new product:
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresh Tomatoes",
    "description": "Organic tomatoes from our farm",
    "category": "vegetables",
    "price": 45,
    "quantity": 100,
    "unit": "kg",
    "organicCertified": true,
    "origin": "Punjab",
    "location": {
      "city": "Ludhiana",
      "state": "Punjab"
    }
  }'
```

### 2. View Your Products

See all products you've listed:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/products/my/products?page=1&limit=10
```

### 3. Update Product

Update product details (price, description, etc):
```bash
curl -X PUT http://localhost:5000/api/products/{PRODUCT_ID} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 50,
    "discountedPrice": 40,
    "description": "Updated description"
  }'
```

### 4. Restock Product

Add more quantity:
```bash
curl -X PATCH http://localhost:5000/api/products/{PRODUCT_ID}/quantity \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 50,
    "action": "add"
  }'
```

### 5. Pause Product

Deactivate a product without deleting it:
```bash
curl -X PATCH http://localhost:5000/api/products/{PRODUCT_ID}/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### 6. Delete Product

Remove a product from listings:
```bash
curl -X DELETE http://localhost:5000/api/products/{PRODUCT_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Common Use Cases

### Consumer: Find Organic Vegetables Under 50 Rupees

```bash
# Option 1: Use general browse with filters
curl "http://localhost:5000/api/products?category=vegetables&maxPrice=50"

# Option 2: Check organic products first
curl "http://localhost:5000/api/products/organic/certified?limit=20"

# Option 3: Search for specific vegetable
curl -X POST http://localhost:5000/api/products/search \
  -H "Content-Type: application/json" \
  -d '{"query": "organic spinach"}'
```

### Consumer: Find Products Available in My City

```bash
curl "http://localhost:5000/api/products/filter/location?city=Jaipur&state=Rajasthan&page=1"
```

### Consumer: View Farmer's Other Products

After viewing a product, visit the farmer's profile:
```bash
# First get a product to find farmer ID
PRODUCT=$(curl http://localhost:5000/api/products?limit=1)
FARMER_ID=$(echo $PRODUCT | jq '.data[0].farmer._id')

# Then view farmer's products
curl http://localhost:5000/api/products/farmer/$FARMER_ID
```

### Farmer: List New Product with Discount

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Mangoes",
    "description": "Fresh Alphonso mangoes, special harvest",
    "category": "fruits",
    "price": 150,
    "discountedPrice": 120,
    "quantity": 200,
    "unit": "kg",
    "organicCertified": true,
    "location": {
      "city": "Nagpur",
      "state": "Maharashtra",
      "zipCode": "440001"
    }
  }'
```

### Farmer: Quick Restock After Sale

After selling 50 kg, restock 100 kg:
```bash
curl -X PATCH http://localhost:5000/api/products/{PRODUCT_ID}/quantity \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 100,
    "action": "add"
  }'
```

### Farmer: Update Expiry Date

```bash
curl -X PUT http://localhost:5000/api/products/{PRODUCT_ID} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expiryDate": "2024-01-25T00:00:00Z"
  }'
```

---

## Important Query Parameters

### Pagination
```
page=1        # Page number (default: 1)
limit=12      # Items per page (default: 12)
```

### Filters
```
category=vegetables              # Product category
minPrice=20&maxPrice=100        # Price range
city=Ludhiana&state=Punjab      # Location
```

### Sorting
Most endpoints sort by:
- `createdAt` (newest first) - for browsing
- `price` (ascending) - for price filters
- `score` (relevance) - for search
- `reviewCount` & `ratings` - for bestsellers

---

## Response Structure

### Successful Response (200/201)
```json
{
  "success": true,
  "message": "Description of what happened",
  "data": { /* Actual data */ },
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 52,
    "itemsPerPage": 12
  }
}
```

### Error Response (400/401/403/404)
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

---

## Troubleshooting

### 401 Unauthorized
- Token is missing or invalid
- Token has expired
- Solution: Get a fresh JWT token from login endpoint

### 403 Forbidden
- You don't have permission (e.g., consumer trying to create product)
- You're trying to edit someone else's product
- Solution: Use correct role account or verify product ownership

### 404 Not Found
- Product doesn't exist
- ID is invalid
- Solution: Check product ID and refresh product list

### 400 Bad Request
- Missing required fields
- Invalid field values
- Malformed query parameters
- Solution: Check documentation for required fields

### Empty Results
- Products don't match filter criteria
- All products in category are out of stock
- Solution: Try broader filters or different category

---

## Rate Limits (Recommended)
- Read operations: 100 req/min per user
- Write operations: 30 req/min per user
- Search: 50 req/min per user

---

## Best Practices

### For Consumers
1. Use search or filters to find products
2. Check farmer profile for multiple products
3. Read product description for details
4. Note expiry dates for perishables
5. Check shipping availability

### For Farmers
1. Add complete product information
2. Include accurate expiry dates
3. Update quantity immediately after sales
4. Set competitive prices with discounts
5. Deactivate products when out of stock
6. Keep descriptions detailed and accurate
7. Use appropriate categories
8. Mark organic products correctly

---

## Next Steps

1. **For Consumers**: Browse products → Add to cart → Proceed to checkout
2. **For Farmers**: Create products → Manage inventory → Monitor sales

**See PRODUCT_MODULE_GUIDE.md for complete API reference**

