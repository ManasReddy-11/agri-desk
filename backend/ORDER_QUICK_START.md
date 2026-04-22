# Order Module - Quick Start Guide

## Getting Started

### Prerequisites
- Node.js backend running
- MongoDB connected
- Valid JWT consumer/farmer tokens
- Cart with items (for placing order)

---

## Consumer - Basic Operations

### 1. Place an Order

```bash
curl -X POST http://localhost:5000/api/order \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "Bangalore",
      "state": "Karnataka",
      "zipCode": "560001",
      "country": "India",
      "phone": "9999999999"
    },
    "paymentMethod": "upi"
  }'
```

### 2. View Order History

```bash
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  "http://localhost:5000/api/order?page=1&limit=10"
```

### 3. View Specific Order

```bash
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/order/507f1f77bcf86cd799439011
```

### 4. Track Order Status

```bash
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/order/507f1f77bcf86cd799439011/track
```

### 5. Cancel Order

```bash
curl -X PATCH http://localhost:5000/api/order/507f1f77bcf86cd799439011/cancel \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Changed mind"}'
```

---

## Farmer - Basic Operations

### 1. View Pending Orders

```bash
curl -H "Authorization: Bearer FARMER_TOKEN" \
  http://localhost:5000/api/order/farmer/pending
```

### 2. View All Incoming Orders

```bash
curl -H "Authorization: Bearer FARMER_TOKEN" \
  "http://localhost:5000/api/order/farmer/orders?status=pending"
```

### 3. Accept Order

```bash
curl -X PATCH http://localhost:5000/api/order/507f1f77bcf86cd799439011/accept \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Order accepted. Will pack by 6 PM"}'
```

### 4. Reject Order

```bash
curl -X PATCH http://localhost:5000/api/order/507f1f77bcf86cd799439011/reject \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Out of stock - unexpected demand"}'
```

### 5. Mark Items as Packed

```bash
curl -X PATCH http://localhost:5000/api/order/507f1f77bcf86cd799439011/delivery-status \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "packed", "notes": "Items packed and ready"}'
```

### 6. Mark Items as Shipped

```bash
curl -X PATCH http://localhost:5000/api/order/507f1f77bcf86cd799439011/delivery-status \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped",
    "trackingNumber": "TRACK123456789",
    "estimatedDelivery": "2024-01-18T18:00:00Z"
  }'
```

### 7. Mark Items as Delivered

```bash
curl -X PATCH http://localhost:5000/api/order/507f1f77bcf86cd799439011/delivery-status \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "delivered", "notes": "Items successfully delivered"}'
```

### 8. View Order Statistics

```bash
curl -H "Authorization: Bearer FARMER_TOKEN" \
  http://localhost:5000/api/order/farmer/stats
```

---

## Admin - Basic Operations

### 1. View All Orders

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/order/admin/all?page=1&limit=20"
```

### 2. Filter Orders by Status

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/order/admin/all?status=delivered"
```

### 3. Filter Orders by Amount

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/order/admin/all?minAmount=1000&maxAmount=10000"
```

### 4. View Order Details

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/order/admin/507f1f77bcf86cd799439011
```

### 5. View High-Value Orders

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/order/admin/high-value?minAmount=5000"
```

### 6. View Orders Due for Delivery

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/order/admin/delivery-due?daysThreshold=3"
```

### 7. View Order Statistics

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/order/admin/stats
```

---

## Complete Workflow Example

### Consumer Perspective

```bash
# 1. View cart
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/cart

# 2. Place order from cart
curl -X POST http://localhost:5000/api/order \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Bangalore",
      "state": "Karnataka",
      "zipCode": "560001",
      "country": "India",
      "phone": "9999999999"
    },
    "paymentMethod": "upi"
  }'

# Response will contain order._id

# 3. View order details
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/order/{order-id}

# 4. Track order
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/order/{order-id}/track

# 5. View order history
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/order?status=delivered
```

### Farmer Perspective

```bash
# 1. Check pending orders
curl -H "Authorization: Bearer FARMER_TOKEN" \
  http://localhost:5000/api/order/farmer/pending

# 2. Accept order
curl -X PATCH http://localhost:5000/api/order/{order-id}/accept \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Accepting order"}'

# 3. Mark as packed
curl -X PATCH http://localhost:5000/api/order/{order-id}/delivery-status \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "packed"}'

# 4. Mark as shipped with tracking
curl -X PATCH http://localhost:5000/api/order/{order-id}/delivery-status \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped",
    "trackingNumber": "TRACK123",
    "estimatedDelivery": "2024-01-18T18:00:00Z"
  }'

# 5. Mark as delivered
curl -X PATCH http://localhost:5000/api/order/{order-id}/delivery-status \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "delivered"}'

# 6. View stats
curl -H "Authorization: Bearer FARMER_TOKEN" \
  http://localhost:5000/api/order/farmer/stats
```

---

## Response Examples

### Place Order Response

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439011",
      "consumer": "consumer_id",
      "status": "pending",
      "items": [
        {
          "product": "product_id",
          "productName": "Fresh Tomatoes",
          "quantity": 2,
          "finalPrice": 35,
          "itemTotal": 70,
          "farmer": "farmer_id"
        }
      ],
      "subtotal": 140,
      "taxes": 7,
      "shippingCost": 50,
      "total": 197,
      "orderDate": "2024-01-15T10:30:00Z"
    },
    "summary": {
      "status": "pending",
      "itemCount": 2,
      "total": 197,
      "farmerCount": 1
    }
  }
}
```

### Get Order Details Response

```json
{
  "success": true,
  "message": "Order details retrieved",
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439011",
      "consumer": {
        "_id": "consumer_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "items": [...],
      "status": "shipped",
      "shippingAddress": {...},
      "trackingNumber": "TRACK123",
      "estimatedDelivery": "2024-01-18T18:00:00Z"
    },
    "groupedByFarmer": [
      {
        "farmerId": "farmer_id",
        "items": [...],
        "status": "shipped",
        "subtotal": 197
      }
    ]
  }
}
```

### Farmer Orders Response

```json
{
  "success": true,
  "message": "Incoming orders retrieved",
  "data": {
    "orders": [
      {
        "_id": "order_id",
        "consumer": {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "9999999999"
        },
        "items": [
          {
            "productName": "Fresh Tomatoes",
            "quantity": 2,
            "finalPrice": 35,
            "itemTotal": 70
          }
        ],
        "status": "pending",
        "total": 197
      }
    ],
    "pagination": {
      "current": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

## Common Scenarios

### Scenario 1: Order from Multiple Farmers

```bash
# Consumer has items from 2 farmers in cart
# Places order

# Order response shows 2 farmers:
{
  "farmers": [
    { "farmerId": "farmer_1", "items": [0, 1], "status": "pending" },
    { "farmerId": "farmer_2", "items": [2], "status": "pending" }
  ]
}

# Each farmer accepts independently
curl -X PATCH http://localhost:5000/api/order/{id}/accept \
  -H "Authorization: Bearer FARMER_1_TOKEN" ...

curl -X PATCH http://localhost:5000/api/order/{id}/accept \
  -H "Authorization: Bearer FARMER_2_TOKEN" ...

# Once both accept, order status becomes "accepted"
```

### Scenario 2: Farmer Rejects Order

```bash
# Order arrives for Farmer A
# Farmer checks stock - Out of stock!

curl -X PATCH http://localhost:5000/api/order/{id}/reject \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Out of stock - unexpected demand"}'

# Result:
# - Order status = "rejected"
# - Consumer notified
# - Refund eligible = true
# - Consumer can edit cart and reorder
```

### Scenario 3: Track Multi-Farmer Shipment

```bash
# Consumer has order from 2 farmers
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/order/{id}/track

# Response shows both farmers' shipping info:
{
  "status": "shipped",
  "groupedByFarmer": [
    {
      "farmerId": "farmer_1",
      "status": "shipped",
      "items": [...]
    },
    {
      "farmerId": "farmer_2", 
      "status": "packed",  // Different status!
      "items": [...]
    }
  ]
}
```

---

## Error Handling

### All errors follow consistent format:

```json
{
  "success": false,
  "message": "Error description here",
  "statusCode": 400
}
```

### Common errors:

```bash
# Cart empty
400 - "Cart is empty. Add items before placing order"

# Items unavailable
400 - "Following items are not available: Product Name (Only 2 available)"

# Not authorized
403 - "You are not authorized to view this order"

# Cannot cancel
400 - "Only pending or accepted orders can be cancelled"

# Not found
404 - "Order not found"
```

---

## Tips & Best Practices

### Do's ✅
- Check order history regularly
- Add tracking number when shipping
- Update status for each delivery milestone
- Provide rejection reason for transparency
- Request review after delivery
- View analytics to identify trends

### Don'ts ❌
- Don't place order with empty cart
- Don't try to modify delivered orders
- Don't skip status updates (consumers appreciate tracking)
- Don't ship without tracking number
- Don't process payments before order acceptance
- Don't cancel order without reason

---

## Troubleshooting

### Order Not Placed
```
Check:
1. Is cart empty? Add items first
2. Are all items in stock?
3. Do items meet minimum order qty?
4. Is shipping address complete?
```

### Order Not Appearing for Farmer
```
Check:
1. Is farmer ID correctly set in products?
2. Is order in farmer's items?
3. Is farmer's token valid?
4. Check farmer's orders list
```

### Status Update Failed
```
Check:
1. Is current status valid for transition?
   - pending → can go to accepted/rejected
   - accepted → can go to packed
   - packed → can go to shipped
   - shipped → can go to delivered
2. Is farmer part of this order?
3. Are all required fields present?
```

---

## Next Steps

1. **Complete Order:** See full [ORDER_MODULE_GUIDE.md](./ORDER_MODULE_GUIDE.md)
2. **Integration Details:** See [ORDER_INTEGRATION_GUIDE.md](./ORDER_INTEGRATION_GUIDE.md)
3. **Cart Module:** See [CART_QUICK_START.md](./CART_QUICK_START.md)

---

**Status:** Ready to Use ✅

