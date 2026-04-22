# Cart Module - Quick Start Guide

## 🛒 Getting Started

### Prerequisites
- Node.js backend running
- MongoDB connected
- Valid JWT consumer token

---

## Basic Operations

### 1. Get Your Cart

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart
```

### 2. Add Product to Cart

```bash
curl -X POST http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product_id_here",
    "quantity": 2
  }'
```

### 3. View Cart Summary

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart/summary
```

### 4. Update Item Quantity

```bash
curl -X PATCH http://localhost:5000/api/cart/item/quantity \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product_id_here",
    "quantity": 5
  }'
```

### 5. Remove Item from Cart

```bash
curl -X DELETE http://localhost:5000/api/cart/item \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "product_id_here"}'
```

### 6. Clear Cart

```bash
curl -X DELETE http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Shopping Workflow

### Step 1: Browse Products
```bash
curl http://localhost:5000/api/products?category=vegetables&limit=10
```

### Step 2: Add to Cart
```bash
curl -X POST http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "507f1f77bcf86cd799439011", "quantity": 2}'
```

### Step 3: Add More Items
```bash
curl -X POST http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "507f1f77bcf86cd799439012", "quantity": 3}'
```

### Step 4: View Cart
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart
```

### Step 5: Apply Discount Code
```bash
curl -X POST http://localhost:5000/api/cart/coupon \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME20",
    "discountPercentage": 20
  }'
```

### Step 6: Check Before Checkout
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart/validation
```

### Step 7: View Grouped by Farmer
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart/grouped
```

---

## Common Scenarios

### Update Multiple Items
```bash
# First item
curl -X PATCH http://localhost:5000/api/cart/item/quantity \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod_1", "quantity": 10}'

# Second item
curl -X PATCH http://localhost:5000/api/cart/item/quantity \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod_2", "quantity": 5}'
```

### Remove and Re-add Item
```bash
# Remove
curl -X DELETE http://localhost:5000/api/cart/item \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod_1"}'

# Re-add with different quantity
curl -X POST http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod_1", "quantity": 3}'
```

### Apply Fixed Discount
```bash
curl -X POST http://localhost:5000/api/cart/coupon \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE100",
    "discountAmount": 100
  }'
```

### Remove Applied Coupon
```bash
curl -X DELETE http://localhost:5000/api/cart/coupon \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Cart is Valid for Checkout
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart/validation
```

---

## Response Examples

### Get Cart Response
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "cart": {
      "items": [
        {
          "product": {
            "_id": "507f1f77bcf86cd799439011",
            "name": "Fresh Tomatoes"
          },
          "quantity": 2,
          "finalPrice": 35,
          "itemTotal": 70,
          "unit": "kg"
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
      "total": 197
    }
  }
}
```

### Cart Summary Response
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

### Cart Grouped by Farmer
```json
{
  "success": true,
  "message": "Cart grouped by farmer",
  "data": {
    "groupedByFarmer": [
      {
        "farmer": {
          "_id": "farmer_1",
          "name": "Farmer A"
        },
        "items": [
          {
            "product": { "name": "Tomatoes" },
            "quantity": 2
          }
        ],
        "subtotal": 140
      },
      {
        "farmer": {
          "_id": "farmer_2",
          "name": "Farmer B"
        },
        "items": [
          {
            "product": { "name": "Onions" },
            "quantity": 3
          }
        ],
        "subtotal": 90
      }
    ],
    "summary": {
      "totalItems": 5,
      "subtotal": 230,
      "total": 371.5
    }
  }
}
```

---

## Error Examples

### Product Out of Stock
```json
{
  "success": false,
  "message": "Product is out of stock",
  "statusCode": 400
}
```

### Insufficient Stock
```json
{
  "success": false,
  "message": "Only 5 units available",
  "statusCode": 400
}
```

### Below Minimum Order
```json
{
  "success": false,
  "message": "Minimum order quantity is 2",
  "statusCode": 400
}
```

### Item Not Found
```json
{
  "success": false,
  "message": "Item not found in cart",
  "statusCode": 404
}
```

### Unauthorized
```json
{
  "success": false,
  "message": "Please provide a valid authentication token",
  "statusCode": 401
}
```

---

## Tips & Best Practices

### Do's ✅
- Add items before applying discounts
- Validate cart before checkout
- Check stock availability before finalizing order
- Apply coupon after adding all items
- View grouped by farmer for multi-seller orders

### Don'ts ❌
- Don't refresh page before validating
- Don't apply invalid coupon codes
- Don't ignore stock warnings
- Don't modify quantity beyond available stock
- Don't apply multiple coupons (only one supported currently)

---

## Troubleshooting

### Cart is Empty
```
Solution: 
1. Add products to cart first
2. Check if session expired (re-login)
3. Verify items still in stock
```

### Can't Add to Cart
```
Solution:
1. Verify product ID is valid
2. Check product is not out of stock
3. Verify quantity is >= minimum order
4. Check your JWT token is current
```

### Coupon Not Applied
```
Solution:
1. Verify coupon code is correct
2. Check discount amount/percentage
3. Ensure cart is not empty
4. Remove old coupon if exists
```

### Cart Totals Wrong
```
Solution:
1. Check calculations: subtotal + tax + shipping - coupon
2. Tax is 5% of subtotal
3. Validate using /api/cart endpoint
4. Refresh page and re-check
```

### Out of Stock During Shopping
```
Solution:
1. Call GET /api/cart/validation
2. Returns which items are unavailable
3. Remove unavailable items or reduce quantity
4. Proceed with remaining items
```

---

## Cart Expiration

Carts automatically expire after **30 days** of inactivity.

```
- Session cart: Persists as long as logged in
- Abandoned cart: Auto-deleted after 30 days
- Saved for future: No permanent wish list (use cart only)
```

---

## Next Steps

1. **Browse Products:** See full [Product Module Guide](./PRODUCT_MODULE_GUIDE.md)
2. **Checkout:** Create orders from cart items
3. **Track Order:** Monitor order status
4. **Leave Review:** Rate products after purchase

---

## API Reference

For complete API details see: [CART_MODULE_GUIDE.md](./CART_MODULE_GUIDE.md)

For integration details see: [CART_INTEGRATION_GUIDE.md](./CART_INTEGRATION_GUIDE.md)

---

**Status:** Ready to Use ✅

