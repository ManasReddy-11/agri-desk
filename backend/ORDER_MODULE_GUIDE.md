# Order Module - Complete Guide

## Overview

The Order Module manages the complete order lifecycle from placement to delivery. Supports multiple farmers per order, status tracking, and comprehensive order management.

### Features
- Place orders from cart
- View order history
- Track order status
- Farmer order acceptance/rejection
- Delivery status updates
- Multi-farmer order support
- Order statistics and analytics

---

## Database Schema

### Order Model

```javascript
{
  _id: ObjectId,
  
  // Consumer Reference
  consumer: ObjectId (ref: User),
  
  // Items Array
  items: [
    {
      product: ObjectId (ref: Product),
      productName: String,
      productImage: String,
      farmer: ObjectId (ref: User),
      farmerName: String,
      quantity: Number,
      price: Number (at time of order),
      discount: Number,
      finalPrice: Number,
      itemTotal: Number (finalPrice * quantity),
      unit: String (kg, g, l, etc.),
      status: String (pending|accepted|packed|shipped|delivered),
      acceptedAt: Date,
      packedAt: Date,
      shippedAt: Date,
      deliveredAt: Date,
      rejectionReason: String,
      rejectedAt: Date
    }
  ],
  
  // Totals
  subtotal: Number,
  totalDiscount: Number,
  taxes: Number (5% GST),
  shippingCost: Number,
  total: Number,
  
  // Coupon
  coupon: {
    code: String,
    discountAmount: Number,
    discountPercentage: Number
  },
  
  // Shipping Details
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  
  // Status & Timeline
  status: String (pending|accepted|packed|shipped|delivered|cancelled|rejected),
  orderDate: Date,
  acceptedDate: Date,
  packedDate: Date,
  shippedDate: Date,
  deliveredDate: Date,
  cancellationReason: String,
  cancelledDate: Date,
  
  // Payment
  paymentStatus: String (pending|completed|failed|refunded),
  paymentMethod: String,
  transactionId: String,
  paidAt: Date,
  
  // Notes
  consumerNotes: String,
  farmerNotes: String,
  adminNotes: String,
  
  // Tracking
  trackingNumber: String,
  estimatedDelivery: Date,
  
  // Multi-farmer Support
  farmers: [
    {
      farmerId: ObjectId,
      items: [Array of item indices],
      status: String (pending|accepted|rejected|packed|shipped|delivered),
      acceptedAt: Date,
      rejectedAt: Date,
      rejectionReason: String
    }
  ],
  
  // Metadata
  isExpedited: Boolean,
  isCancellable: Boolean,
  refundEligible: Boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{consumer: 1, orderDate: -1}` - Get consumer's orders
- `{'farmers.farmerId': 1}` - Get farmer's orders
- `{status: 1}` - Filter by status
- `{paymentStatus: 1}` - Track payment
- `{orderDate: -1}` - Sort by date
- `{'items.farmer': 1}` - Find items by farmer

### Order Status Flow

```
┌─────────┐
│ Pending │ ← Order placed, awaiting farmer acceptance
└────┬────┘
     │
     ├─ Accepted → All farmers accepted
     │   ↓
     ├─ Packed → Items packed for shipping
     │   ↓
     ├─ Shipped → Items in transit
     │   ↓
     └─ Delivered → Order completed
     
Alternative paths:
- Rejected → Farmer rejects (refund eligible)
- Cancelled → Consumer cancels (refund eligible)
```

---

## API Endpoints

### BASE URL: `/api/order`

---

## CONSUMER ENDPOINTS

### Place Order
**Endpoint:** `POST /`

**Authentication:** Consumer role required

**Description:** Create new order from cart items

**Request Body:**
```json
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "zipCode": "560001",
    "country": "India",
    "phone": "9999999999"
  },
  "paymentMethod": "upi"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/order \
  -H "Authorization: Bearer YOUR_TOKEN" \
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
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "_id": "order_id",
      "consumer": "consumer_id",
      "items": [...],
      "status": "pending",
      "total": 697,
      "orderDate": "2024-01-15T10:30:00Z"
    },
    "summary": {
      "_id": "order_id",
      "status": "pending",
      "itemCount": 5,
      "total": 697,
      "farmerCount": 2
    }
  }
}
```

**Error Cases:**
```
400 - Missing shipping address
400 - Cart is empty
400 - Items not available
```

---

### Get Order History
**Endpoint:** `GET /`

**Query Parameters:**
```
status=pending        // Filter by status
startDate=YYYY-MM-DD  // Filter by date range
endDate=YYYY-MM-DD
page=1                // Pagination
limit=10
```

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/order?status=delivered&page=1&limit=10"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order history retrieved",
  "data": {
    "orders": [
      {
        "_id": "order_1",
        "status": "delivered",
        "total": 697,
        "orderDate": "2024-01-15T10:30:00Z"
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

### Get Order Details
**Endpoint:** `GET /:orderId`

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/order/507f1f77bcf86cd799439011
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order details retrieved",
  "data": {
    "order": {
      "_id": "order_id",
      "consumer": {...},
      "items": [...],
      "status": "pending",
      "total": 697,
      "farmers": [...]
    },
    "groupedByFarmer": [
      {
        "farmerId": "farmer_1",
        "items": [...],
        "status": "pending",
        "subtotal": 400
      }
    ],
    "summary": {...}
  }
}
```

---

### Track Order
**Endpoint:** `GET /:orderId/track`

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/order/507f1f77bcf86cd799439011/track
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order tracking info",
  "data": {
    "_id": "order_id",
    "status": "shipped",
    "orderDate": "2024-01-15T10:30:00Z",
    "acceptedDate": "2024-01-15T11:00:00Z",
    "packedDate": "2024-01-15T12:00:00Z",
    "shippedDate": "2024-01-15T14:00:00Z",
    "deliveredDate": null,
    "estimatedDelivery": "2024-01-18T18:00:00Z",
    "trackingNumber": "TRACK123456",
    "groupedByFarmer": [...]
  }
}
```

---

### Cancel Order
**Endpoint:** `PATCH /:orderId/cancel`

**Request Body:**
```json
{
  "reason": "Cancelling due to better price elsewhere"
}
```

**Example Request:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Changed mind"}' \
  http://localhost:5000/api/order/507f1f77bcf86cd799439011/cancel
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "order": {
      "status": "cancelled",
      "cancellationReason": "Changed mind",
      "cancelledDate": "2024-01-15T15:00:00Z",
      "refundEligible": true
    }
  }
}
```

---

## FARMER ENDPOINTS

### Get Incoming Orders
**Endpoint:** `GET /farmer/orders`

**Query Parameters:**
```
status=pending        // pending|accepted|rejected
itemStatus=accepted   // Filter items by status
startDate=YYYY-MM-DD
endDate=YYYY-MM-DD
page=1
limit=10
```

**Example Request:**
```bash
curl -H "Authorization: Bearer FARMER_TOKEN" \
  "http://localhost:5000/api/order/farmer/orders?status=pending"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Incoming orders retrieved",
  "data": {
    "orders": [
      {
        "_id": "order_id",
        "consumer": {...},
        "items": [...farmers items only...],
        "status": "pending",
        "total": 400
      }
    ],
    "pagination": {...}
  }
}
```

---

### Get Pending Orders
**Endpoint:** `GET /farmer/pending`

**Example Request:**
```bash
curl -H "Authorization: Bearer FARMER_TOKEN" \
  http://localhost:5000/api/order/farmer/pending
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Pending orders retrieved",
  "data": {
    "orders": [...],
    "count": 3
  }
}
```

---

### Accept Order
**Endpoint:** `PATCH /:orderId/accept`

**Request Body:**
```json
{
  "notes": "Order accepted. Will pack by 6 PM"
}
```

**Example Request:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Accepting order"}' \
  http://localhost:5000/api/order/507f1f77bcf86cd799439011/accept
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": {
    "order": {
      "status": "accepted",
      "acceptedDate": "2024-01-15T11:00:00Z",
      "farmers": [
        {
          "farmerId": "...",
          "status": "accepted",
          "acceptedAt": "2024-01-15T11:00:00Z"
        }
      ]
    }
  }
}
```

---

### Reject Order
**Endpoint:** `PATCH /:orderId/reject`

**Request Body:**
```json
{
  "reason": "Out of stock unexpected demand"
}
```

**Example Request:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Out of stock"}' \
  http://localhost:5000/api/order/507f1f77bcf86cd799439011/reject
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order rejected successfully",
  "data": {
    "order": {
      "status": "rejected",
      "rejectionReason": "Out of stock",
      "rejectedDate": "2024-01-15T11:00:00Z",
      "refundEligible": true
    }
  }
}
```

---

### Update Delivery Status
**Endpoint:** `PATCH /:orderId/delivery-status`

**Request Body:**
```json
{
  "status": "packed|shipped|delivered",
  "trackingNumber": "TRACK123456",
  "estimatedDelivery": "2024-01-18T18:00:00Z",
  "notes": "Items packed and ready for shipment"
}
```

**Example Request:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped",
    "trackingNumber": "TRACK123456",
    "estimatedDelivery": "2024-01-18T18:00:00Z"
  }' \
  http://localhost:5000/api/order/507f1f77bcf86cd799439011/delivery-status
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated to shipped",
  "data": {
    "order": {
      "status": "shipped",
      "shippedDate": "2024-01-15T14:00:00Z",
      "trackingNumber": "TRACK123456",
      "estimatedDelivery": "2024-01-18T18:00:00Z"
    }
  }
}
```

---

### Get Farmer Order Statistics
**Endpoint:** `GET /farmer/stats`

**Example Request:**
```bash
curl -H "Authorization: Bearer FARMER_TOKEN" \
  http://localhost:5000/api/order/farmer/stats
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order statistics retrieved",
  "data": {
    "pending": 3,
    "byStatus": [
      {
        "_id": "accepted",
        "count": 5
      },
      {
        "_id": "delivered",
        "count": 12
      }
    ]
  }
}
```

---

## ADMIN ENDPOINTS

### Get All Orders
**Endpoint:** `GET /admin/all`

**Query Parameters:**
```
status=pending
startDate=YYYY-MM-DD
endDate=YYYY-MM-DD
minAmount=1000      // Filter by total amount
maxAmount=10000
page=1
limit=10
```

**Example Request:**
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/order/admin/all?status=delivered&minAmount=500"
```

---

### Get Order by ID (Admin)
**Endpoint:** `GET /admin/:orderId`

**Example Request:**
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/order/admin/507f1f77bcf86cd799439011
```

---

### Get High-Value Orders
**Endpoint:** `GET /admin/high-value`

**Query Parameters:**
```
minAmount=5000  // Default: 5000
```

**Response includes:** Top 10 orders above threshold

---

### Get Delivery Due Orders
**Endpoint:** `GET /admin/delivery-due`

**Query Parameters:**
```
daysThreshold=3  // Orders shipped 3+ days ago
```

**Response includes:** Orders shipped but not delivered

---

### Get Order Statistics
**Endpoint:** `GET /admin/stats`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order statistics retrieved",
  "data": {
    "totalOrders": 145,
    "totalRevenue": 125450,
    "byStatus": [
      {
        "_id": "delivered",
        "count": 120,
        "totalAmount": 120000,
        "avgAmount": 1000
      }
    ]
  }
}
```

---

## Order Model Methods

### Instance Methods

```javascript
// Accept order (farmer)
await order.acceptOrder(farmerId, notes)

// Reject order (farmer)
await order.rejectOrder(farmerId, reason)

// Update delivery status (farmer)
await order.updateDeliveryStatus(farmerId, newStatus, notes)

// Cancel order (consumer)
await order.cancelOrder(reason)

// Calculate totals
order.calculateTotals()

// Get items grouped by farmer
order.getGroupedByFarmer()

// Get order summary
order.getSummary()
```

### Static Methods

```javascript
// Create order from cart
await Order.createFromCart(cartData, consumerId, shippingAddress)

// Get consumer orders
await Order.getConsumerOrders(consumerId, filters)

// Get farmer orders
await Order.getFarmerOrders(farmerId, filters)

// Get pending orders
await Order.getPendingOrders(farmerId)

// Get orders by status
await Order.getOrdersByStatus(status)

// Get high-value orders
await Order.getHighValueOrders(minAmount)

// Get delivery due
await Order.getDeliveryDue(daysThreshold)
```

---

## Order Workflow Example

### Complete Order Lifecycle

```
1. Consumer places order
   POST /order with cart items and shipping address
   
2. Order created with status "pending"
   All farmers notified of pending orders
   
3. Farmer accepts/rejects
   PATCH /order/:orderId/accept or /reject
   
4. If all farmers accept → status becomes "accepted"
   
5. Farmer receives items and packs
   PATCH /order/:orderId/delivery-status
   with status="packed"
   
6. Farmer ships items
   PATCH /order/:orderId/delivery-status
   with status="shipped" + trackingNumber
   
7. Consumer tracks shipment
   GET /order/:orderId/track
   
8. Items delivered
   PATCH /order/:orderId/delivery-status
   with status="delivered"
   
9. Order complete
   Consumer can leave review
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Shipping address is required",
  "statusCode": 400
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You are not authorized to view this order",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Order not found",
  "statusCode": 404
}
```

---

## Key Features

### Multi-Farmer Orders
- One order can have items from multiple farmers
- Each farmer accepts/rejects independently
- Separate tracking for each farmer's items
- Grouped view of items by farmer

### Price Snapshots
- Prices locked at time of order
- Future price changes don't affect order
- Transparent pricing for all parties

### Status Tracking
- Real-time status updates
- Timeline of all transitions
- Timestamps for each status change
- Estimated delivery dates

### Authorization
- Consumers see only their orders
- Farmers see only their items
- Admins see all orders
- Role-based access control

### Inventory Management
- Stock deducted from product on order
- Quantity validation before checkout
- Prevents overselling

---

## Related Documentation

- [Cart Module Guide](./CART_MODULE_GUIDE.md)
- [Product Module Guide](./PRODUCT_MODULE_GUIDE.md)
- [Order Integration Guide](./ORDER_INTEGRATION_GUIDE.md)

---

**Status:** Production Ready ✅  
**Version:** 1.0  
**Last Updated:** January 2024

