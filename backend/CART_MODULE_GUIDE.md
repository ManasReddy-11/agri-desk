# Cart Module - Complete Guide

## Overview

The Cart Module manages shopping carts for consumers. Each consumer has one cart that persists across sessions and automatically calculates totals, taxes, and discounts.

### Features
- Add/remove/update products
- Real-time price and total calculation
- Coupon/discount management
- Shipping cost tracking
- Item availability validation
- Grouped checkout view by farmer

---

## Database Schema

### Cart Model

```javascript
{
  _id: ObjectId,
  
  // Consumer Reference
  consumer: ObjectId (ref: User, unique),
  
  // Items Array
  items: [
    {
      product: ObjectId (ref: Product),
      farmer: ObjectId (ref: User),
      quantity: Number,
      price: Number (at time of adding),
      discount: Number,
      finalPrice: Number (discounted or regular),
      unit: String (kg, g, l, etc.),
      productName: String,
      productImage: String,
      itemTotal: Number (finalPrice * quantity),
      addedAt: Date,
      isAvailable: Boolean,
      availabilityReason: String
    }
  ],
  
  // Totals
  subtotal: Number,
  totalDiscount: Number,
  shippingCost: Number,
  taxes: Number,
  total: Number,
  
  // Coupon
  coupon: {
    code: String,
    discountAmount: Number,
    discountPercentage: Number
  },
  
  // Status
  isEmpty: Boolean,
  notes: String,
  expiresAt: Date (30 days TTL),
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{consumer: 1}` - Find cart by consumer
- `{'items.product': 1}` - Find item by product
- `{'items.farmer': 1}` - Group by farmer
- `{createdAt: -1}` - Sort by date
- `{expiresAt: 1}` - TTL index for auto-deletion

---

## API Endpoints

### BASE URL: `/api/cart`

**Authentication:** All endpoints require JWT token and consumer role

---

## VIEW CART

### Get Cart  
**Endpoint:** `GET /`

**Description:** Get complete cart with all items and details

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "cart": {
      "_id": "cart_id",
      "consumer": {
        "_id": "consumer_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "items": [
        {
          "_id": "item_id",
          "product": {
            "_id": "product_id",
            "name": "Fresh Tomatoes",
            "description": "Organic tomatoes",
            "category": "vegetables",
            "price": 45,
            "discountedPrice": 35,
            "ratings": 4.5
          },
          "farmer": {
            "_id": "farmer_id",
            "name": "Rajesh Kumar",
            "email": "rajesh@farm.com"
          },
          "quantity": 2,
          "price": 45,
          "discount": 10,
          "finalPrice": 35,
          "unit": "kg",
          "productName": "Fresh Tomatoes",
          "itemTotal": 70,
          "addedAt": "2024-01-15T10:30:00Z",
          "isAvailable": true
        }
      ],
      "subtotal": 140,
      "totalDiscount": 20,
      "taxes": 7,
      "shippingCost": 50,
      "coupon": {},
      "total": 197,
      "isEmpty": false
    },
    "summary": {
      "itemCount": 2,
      "uniqueItemCount": 1,
      "subtotal": 140,
      "totalDiscount": 20,
      "taxes": 7,
      "shippingCost": 50,
      "total": 197,
      "isEmpty": false
    }
  }
}
```

---

### Get Cart Summary

**Endpoint:** `GET /summary`

**Description:** Get only cart totals without product details

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart/summary
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart summary retrieved",
  "data": {
    "itemCount": 5,
    "uniqueItemCount": 3,
    "subtotal": 500,
    "totalDiscount": 50,
    "taxes": 25,
    "shippingCost": 100,
    "coupon": null,
    "total": 625,
    "isEmpty": false
  }
}
```

---

## ADD TO CART

### Add Item to Cart

**Endpoint:** `POST /`

**Description:** Add a product to cart or increase quantity if already present

**Request Body:**
```json
{
  "productId": "product_id",
  "quantity": 2
}
```

**Example Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "507f1f77bcf86cd799439011", "quantity": 2}' \
  http://localhost:5000/api/cart
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Fresh Tomatoes added to cart",
  "data": {
    "cart": {...},
    "addedItem": {
      "product": "product_id",
      "quantity": 2,
      "finalPrice": 35,
      "itemTotal": 70
    },
    "summary": {
      "itemCount": 2,
      "uniqueItemCount": 1,
      "total": 197
    }
  }
}
```

**Error Cases:**
```
400 - Missing productId or quantity
400 - Quantity <= 0
404 - Product not found
400 - Product out of stock
400 - Quantity exceeds available stock
400 - Below minimum order quantity
```

---

## UPDATE CART

### Update Item Quantity

**Endpoint:** `PATCH /item/quantity`

**Description:** Change quantity of an item in cart

**Request Body:**
```json
{
  "productId": "product_id",
  "quantity": 5
}
```

**Example Request:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "507f1f77bcf86cd799439011", "quantity": 5}' \
  http://localhost:5000/api/cart/item/quantity
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart item quantity updated",
  "data": {
    "cart": {...},
    "updatedItem": {
      "product": "product_id",
      "quantity": 5,
      "finalPrice": 35,
      "itemTotal": 175
    },
    "summary": {
      "itemCount": 5,
      "subtotal": 315,
      "total": 392
    }
  }
}
```

---

## REMOVE FROM CART

### Remove Item from Cart

**Endpoint:** `DELETE /item`

**Description:** Remove a product from cart

**Request Body:**
```json
{
  "productId": "product_id"
}
```

**Example Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "507f1f77bcf86cd799439011"}' \
  http://localhost:5000/api/cart/item
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Fresh Tomatoes removed from cart",
  "data": {
    "cart": {...},
    "summary": {
      "itemCount": 1,
      "uniqueItemCount": 1,
      "subtotal": 100,
      "total": 150,
      "isEmpty": false
    }
  }
}
```

---

### Clear Entire Cart

**Endpoint:** `DELETE /`

**Description:** Remove all items from cart

**Example Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart cleared successfully",
  "data": {
    "cart": {
      "items": [],
      "isEmpty": true,
      "subtotal": 0,
      "total": 0
    },
    "summary": {
      "itemCount": 0,
      "uniqueItemCount": 0,
      "subtotal": 0,
      "total": 0,
      "isEmpty": true
    }
  }
}
```

---

## CHECKOUT RELATED

### Get Cart Grouped by Farmer

**Endpoint:** `GET /grouped`

**Description:** Get cart items organized by farmer for multi-seller checkout

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart/grouped
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart grouped by farmer",
  "data": {
    "consumer": {
      "_id": "consumer_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "groupedByFarmer": [
      {
        "farmer": "farmer_id_1",
        "items": [...],
        "subtotal": 140
      },
      {
        "farmer": "farmer_id_2",
        "items": [...],
        "subtotal": 90
      }
    ],
    "summary": {
      "totalItems": 4,
      "subtotal": 230,
      "taxes": 11.5,
      "shippingCost": 100,
      "total": 341.5
    }
  }
}
```

---

### Validate Cart Items

**Endpoint:** `GET /validation`

**Description:** Check if all items in cart are still available

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart/validation
```

**Response (200 OK - All Available):**
```json
{
  "success": true,
  "message": "All cart items are available",
  "data": {
    "valid": true,
    "isValid": true,
    "availableItems": [...],
    "summary": {
      "itemCount": 3,
      "availableItemCount": 3
    }
  }
}
```

**Response (200 OK - Some Unavailable):**
```json
{
  "success": true,
  "message": "2 item(s) in cart are no longer available",
  "data": {
    "valid": true,
    "isValid": false,
    "unavailableItems": [
      {
        "product": "product_id",
        "productName": "Expired Product",
        "isAvailable": false,
        "availabilityReason": "Product no longer available"
      }
    ],
    "availableItems": [...],
    "summary": {
      "itemCount": 3,
      "availableItemCount": 1
    }
  }
}
```

---

## SHIPPING & COUPONS

### Update Shipping Cost

**Endpoint:** `PATCH /shipping`

**Description:** Update shipping cost for cart

**Request Body:**
```json
{
  "shippingCost": 150
}
```

**Example Request:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shippingCost": 150}' \
  http://localhost:5000/api/cart/shipping
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Shipping cost updated",
  "data": {
    "shippingCost": 150,
    "taxes": 25,
    "total": 675
  }
}
```

---

### Apply Coupon Code

**Endpoint:** `POST /coupon`

**Description:** Apply discount coupon to cart

**Request Body:**
```json
{
  "code": "SAVE20",
  "discountPercentage": 20
}
```

**Alternative (Fixed Amount):**
```json
{
  "code": "SAVE100",
  "discountAmount": 100
}
```

**Example Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "SAVE20", "discountPercentage": 20}' \
  http://localhost:5000/api/cart/coupon
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Coupon SAVE20 applied successfully",
  "data": {
    "coupon": {
      "code": "SAVE20",
      "discountPercentage": 20,
      "discountAmount": 0
    },
    "subtotal": 500,
    "discountAmount": 100,
    "taxes": 25,
    "total": 425
  }
}
```

---

### Remove Coupon Code

**Endpoint:** `DELETE /coupon`

**Description:** Remove applied coupon from cart

**Example Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart/coupon
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Coupon SAVE20 removed",
  "data": {
    "subtotal": 500,
    "taxes": 25,
    "total": 525
  }
}
```

---

## ADMIN ENDPOINTS

### Get Consumer's Cart (Admin Only)

**Endpoint:** `GET /:consumerId`

**Authentication:** Admin role required

**Description:** View any consumer's cart

**Example Request:**
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/cart/consumer_id
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {...}
}
```

---

## Cart Model Methods

### Instance Methods

```javascript
// Add item to cart
await cart.addItem(productId, farmerId, quantity, price, discountedPrice, unit, productName, productImage)

// Remove item from cart
await cart.removeItem(productId)

// Update item quantity
await cart.updateItemQuantity(productId, newQuantity)

// Clear entire cart
await cart.clearCart()

// Calculate all totals
cart.calculateTotals()

// Apply coupon
await cart.applyCoupon(couponCode, discountAmount, discountPercentage)

// Remove coupon
await cart.removeCoupon()

// Update shipping cost
await cart.updateShippingCost(shippingCost)

// Validate items availability
await cart.validateItems(productDataMap)

// Get unavailable items
cart.getUnavailableItems()
```

### Virtual Properties

```javascript
cart.itemCount              // Total quantity of all items
cart.uniqueItemCount        // Number of different products
cart.groupedByFarmer        // Items organized by farmer with subtotals
```

### Static Methods

```javascript
// Get or create cart for consumer
await Cart.getOrCreateCart(consumerId)

// Get cart with populated details
await Cart.getCartWithDetails(consumerId)

// Find abandoned carts
await Cart.findAbandonedCarts(daysOld)
```

---

## Calculation Logic

### Subtotal
```
subtotal = SUM(item.finalPrice * item.quantity)
```

### Total Discount
```
totalDiscount = SUM(item.discount * item.quantity)
```

### Taxes
```
taxes = subtotal * 0.05  // 5% GST default
```

### Grand Total
```
total = subtotal + taxes + shippingCost - couponDiscount
total = MAX(0, total)  // Never negative
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Please provide productId and quantity",
  "statusCode": 400
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Please provide a valid authentication token",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You are not authorized to access this resource",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Product not found",
  "statusCode": 404
}
```

### 410 Gone
```json
{
  "success": false,
  "message": "This product is no longer available",
  "statusCode": 410
}
```

---

## Cart Workflow Example

### 1. Consumer Views Products
```bash
GET /api/products?category=vegetables
```

### 2. Consumer Adds to Cart
```bash
POST /api/cart
{
  "productId": "product_1",
  "quantity": 2
}
```

### 3. Consumer Updates Quantity
```bash
PATCH /api/cart/item/quantity
{
  "productId": "product_1",
  "quantity": 5
}
```

### 4. Consumer Adds More Products
```bash
POST /api/cart
{
  "productId": "product_2",
  "quantity": 3
}
```

### 5. Consumer Views Cart
```bash
GET /api/cart
```

### 6. Consumer Applies Coupon
```bash
POST /api/cart/coupon
{
  "code": "WELCOME20",
  "discountPercentage": 20
}
```

### 7. Consumer Validates Cart Before Checkout
```bash
GET /api/cart/validation
```

### 8. Consumer Views Cart Grouped by Farmer
```bash
GET /api/cart/grouped
```

### 9. Consumer Proceeds to Checkout
(Creates order from cart items)

---

## Integration Points

### With Product Module
- Validates product availability when adding
- Snapshots price at time of adding
- Checks minimum order quantity
- Validates stock quantity

### With User Module
- Linked to consumer via unique relationship
- Gets farmer details for grouped view

### With Order Module (Future)
- Cart items become order items
- Cart is cleared after successful order

### With Notification Module (Future)
- Alert for abandoned carts
- Notification when price changes
- Low stock alerts

---

## Performance Notes

- Cart totals are calculated in memory before saving
- TTL index auto-deletes empty carts after 30 days
- Pagination not needed (cart per consumer)
- Grouped by farmer view pre-computed in virtual

---

## Best Practices

1. **Always validate before checkout** - Call validation endpoint
2. **Check grouped by farmer** - For multi-order scenarios
3. **Apply coupon last** - Before final confirmation
4. **Validate item availability** - Track out-of-stock situations
5. **Handle cart expiry** - Inform user about 30-day expiration

---

## Related Documentation

- [Product Module Guide](./PRODUCT_MODULE_GUIDE.md)
- [Cart Integration Guide](./CART_INTEGRATION_GUIDE.md)

