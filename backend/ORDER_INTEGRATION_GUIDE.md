# Order Integration Guide

## System Architecture

The Order Module serves as the central fulfillment hub, connecting consumers, farmers, inventory, and payments.

```
Consumer (Browse)
    ↓
Cart (Add Items)
    ↓
Order (Place Order from Cart)
    ├─→ Inventory (Deduct Stock)
    ├─→ Farmer (Process Order)
    │   ├─→ Accept/Reject
    │   ├─→ Pack Items
    │   ├─→ Ship
    │   └─→ Deliver
    ├─→ Payment (Process Payment)
    ├─→ Notification (Send Updates)
    └─→ Analytics (Track Metrics)
```

---

## Integration Points

### 1. Consumer ↔ Order

**Relationship:** One consumer can have multiple orders

```javascript
// Consumer creates order
await Order.createFromCart(cartData, consumerId, shippingAddress)

// Consumer gets their orders
await Order.getConsumerOrders(consumerId, filters)
```

**Operations:**
- Place order from cart
- View order history
- Track order status
- Cancel pending/accepted orders

**Data Flow:**
```
1. Consumer logged in (JWT token available)
2. Consumer adds items to cart
3. Consumer clicks "Place Order"
   - Validate cart items still available
   - Create Order from cart items
   - Deduct inventory
   - Clear cart
4. Order created with status "pending"
5. Farmers notified
6. Consumer sees order in history
```

---

### 2. Cart → Order

**Relationship:** Order created FROM cart items

```javascript
// Step 1: Get consumer's cart
const cart = await Cart.findOne({ consumer: consumerId })

// Step 2: Create order from cart
const order = await Order.createFromCart(
  cart.toObject(),
  consumerId,
  shippingAddress
)

// Step 3: Clear cart
await Cart.findByIdAndUpdate(
  cart._id,
  { items: [], isEmpty: true },
  { new: true }
)
```

**Data Mapping:**
```
Cart Item Fields → Order Item Fields
├─ product → product (preserved)
├─ farmer → farmer (preserved)
├─ quantity → quantity (preserved)
├─ finalPrice → price, finalPrice (price snapshot)
├─ itemTotal → itemTotal (preserved)
├─ productName → productName (preserved)
├─ productImage → productImage (preserved)
└─ unit → unit (preserved)
```

**Multi-Farmer Grouping:**
```javascript
// Cart may have items from multiple farmers
Cart.items = [
  { farmer: farmerId_1, product: prodId_1 },
  { farmer: farmerId_2, product: prodId_2 },
  { farmer: farmerId_1, product: prodId_3 }
]

// Order groups them:
Order.farmers = [
  { farmerId: farmerId_1, items: [0, 2] },  // Items at indices 0, 2
  { farmerId: farmerId_2, items: [1] }      // Item at index 1
]
```

---

### 3. Product ↔ Order

**Operations on Product:**
1. **Before Order:** Validate availability
2. **On Order Creation:** Deduct quantity
3. **On Cancellation:** Restore quantity (implementation dependent)

```javascript
// When creating order:
for (const item of order.items) {
  // Check before order
  if (!product.inStock || product.quantity < item.quantity) {
    throw new Error('Out of stock')
  }
  
  // Deduct inventory
  await Product.findByIdAndUpdate(
    item.product,
    { $inc: { quantity: -item.quantity } },
    { new: true }
  )
}
```

**Price Snapshot Strategy:**
```javascript
// Product has:
Product.price = 45          // Current market price
Product.discountedPrice = 35 // Current discount

// Order captures at time of placing:
Order.items[0].price = 45       // Market price at order time
Order.items[0].discount = 10     // Discount at order time
Order.items[0].finalPrice = 35   // Calculated finalPrice

// If product price changes later:
// Order price remains unchanged (fairness preserved)
```

---

### 4. Farmer ↔ Order

**Relationship:** Farmer receives orders, processes them

```javascript
// Farmer views incoming orders
await Order.getFarmerOrders(farmerId, filters)

// Farmer accepts order
await order.acceptOrder(farmerId, notes)

// Farmer rejects order
await order.rejectOrder(farmerId, reason)

// Farmer updates status
await order.updateDeliveryStatus(farmerId, status, notes)
```

**Multi-Farmer Order Flow:**
```
Order with Farmers A, B, C:

Pending State:
├─ Farmer A: Items [0, 1] → status "pending"
├─ Farmer B: Items [2] → status "pending"
└─ Farmer C: Items [3, 4] → status "pending"

When Farmer A accepts:
├─ Farmer A: status "accepted"
├─ Farmer B: status "pending"  ← Still pending
└─ Farmer C: status "pending"
Order.status = "pending"  ← Remains pending until ALL accept

When Farmer B, C also accept:
├─ Farmer A: status "accepted"
├─ Farmer B: status "accepted"
└─ Farmer C: status "accepted"
Order.status = "accepted"  ← Order-level status updates
```

**Farmer Operations Timeline:**
```
1. Farmer receives notification
2. Views pending order: GET /farmer/pending
3. Checks items: GET /farmer/orders
4. Accepts order: PATCH /:orderId/accept
5. Prepares items: PATCH /:orderId/delivery-status?status=packed
6. Ships items: PATCH /:orderId/delivery-status?status=shipped
7. System notifies consumer
8. Consumer tracks: GET /:orderId/track
9. Consumer receives items
10. Farmer marks delivered: PATCH /:orderId/delivery-status?status=delivered
```

---

### 5. Inventory → Order

**Inventory Deduction:**
```javascript
// On order creation:
// For each item in order
await Product.findByIdAndUpdate(
  item.product,
  { $inc: { quantity: -item.quantity } },
  { new: true }
)

// Results:
// Product.quantity = previous - ordered_quantity
// If Product.quantity <= 0 → Product.inStock = false
```

**Stock Protection:**
```javascript
// Before allowing order:
if (product.quantity < item.quantity) {
  throw new Error('Insufficient stock')
}

// Prevents overselling even with concurrent requests
// (Assuming database provides atomicity)
```

**Inventory Restoration (on cancellation):**
```javascript
// If implementing order cancellation with inventory restoration:
if (order.status === 'cancelled') {
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { quantity: +item.quantity } },
      { new: true }
    )
  }
}
```

---

### 6. Payment ↔ Order

**Current State:**
- Order records paymentMethod and paymentStatus
- Actual payment processing not yet implemented

**Integration Points (Future):**
```javascript
// After order creation:
order.paymentStatus = 'pending'

// Process payment:
// 1. Call payment gateway API
// 2. Update order.paymentStatus
if (paymentSuccessful) {
  order.paymentStatus = 'completed'
  order.transactionId = transactionId
  order.paidAt = new Date()
  // Email confirmation
} else {
  order.paymentStatus = 'failed'
  // Email failure notice
}
```

---

### 7. Notification ↔ Order

**Event-Based Notifications (Future):**
```javascript
// On order events:
// 1. Order placed
//    → Notify farmers of new order
//    → Confirm to consumer

// 2. Order accepted
//    → Notify consumer order accepted
//    → Commission calculation

// 3. Order shipped
//    → Notify consumer with tracking

// 4. Order delivered
//    → Request review from consumer
//    → Payment to farmer

// 5. Order rejected/cancelled
//    → Notify all parties
//    → Initiate refund
```

---

### 8. Analytics ↔ Order

**Metrics Available:**
```javascript
// Total orders
const totalOrders = await Order.countDocuments()

// Revenue by status
const revenueByStatus = await Order.aggregate([
  { $group: { _id: '$status', revenue: { $sum: '$total' } } }
])

// Farmer performance
const farmerStats = await Order.aggregate([
  { $match: { 'farmers.farmerId': farmerId } },
  { $group: {
    _id: '$farmers.status',
    count: { $sum: 1 }
  }}
])
```

---

## Real-World Workflows

### Workflow 1: Happy Path (Order → Delivery)

```
Day 1:
┌──────────────────────────────────────────┐
│ 10:00 AM - Consumer places order         │
│ - Clicks "Place Order" from cart         │
│ - Enters shipping address                │
│ - Confirms payment (UPI/Card)            │
│ - Order created with status "pending"    │
│ - Farmers notified                       │
│ - Cart cleared                           │
│ - Inventory deducted                     │
└──────────────────────────────────────────┘

Day 1:
┌──────────────────────────────────────────┐
│ 11:00 AM - Farmer A receives order       │
│ - Views in "pending" list                │
│ - Checks available items                 │
│ - Clicks "Accept"                        │
│ - Order status updates                   │
│ - Consumer notified                      │
└──────────────────────────────────────────┘

Day 1:
┌──────────────────────────────────────────┐
│ 3:00 PM - Farmer A packs items           │
│ - PATCH Delivery Status = "packed"       │
│ - Gets tracking updates in system        │
└──────────────────────────────────────────┘

Day 2:
┌──────────────────────────────────────────┐
│ 7:00 AM - Farmer A ships items           │
│ - PATCH Delivery Status = "shipped"      │
│ - Adds tracking number                   │
│ - Sets estimated delivery                │
│ - Consumer sees tracking info            │
└──────────────────────────────────────────┘

Day 3:
┌──────────────────────────────────────────┐
│ 6:00 PM - Items delivered                │
│ - PATCH Delivery Status = "delivered"    │
│ - Order status = "delivered"             │
│ - Consumer can leave review              │
│ - Farmer receives payment                │
└──────────────────────────────────────────┘
```

### Workflow 2: Multi-Farmer Order

```
Order created with:
- Items from Farmer A (Tomatoes)
- Items from Farmer B (Onions)

Timeline:
10:00 AM → Consumer places order
11:00 AM → Farmer A accepts, items 0-2 = "accepted"
11:30 AM → Farmer B REJECTS (out of stock)
          → Order status = "rejected"
          → Refund initiated
          → Consumer notified to edit order

OR if both accept:
10:00 AM → Order placed
11:00 AM → Farmer A accepts
12:00 PM → Farmer B accepts
          → Order status = "accepted"
          → Both prepare items separately
12:30 PM → Farmer A packs items
1:00 PM  → Farmer B packs items
2:00 PM  → Farmer A ships
3:00 PM  → Farmer B ships
          → Consumer sees two shipments
Day 3    → Farmer A delivers
Day 4    → Farmer B delivers
```

### Workflow 3: Order Cancellation

```
Consumer changes mind:

Order states where cancellation is allowed:
✓ pending      → Cancel anytime
✓ accepted     → Can cancel (before packing)
✗ packed       → Cannot cancel
✗ shipped      → Cannot cancel
✗ delivered    → Cannot cancel

Flow:
PATCH /order/:orderId/cancel
{
  "reason": "Found better price"
}

Result:
- Order.status = "cancelled"
- Order.isCancellable = false (no re-cancel)
- Order.refundEligible = true
- Inventory restored (if implemented)
- Refund initiated (if implemented)
- Farmers notified
- Consumer notified
```

---

## Data Consistency

### Atomic Operations

**Order Creation:**
```javascript
1. Validate cart items availability
2. Create order (atomic)
   - Add order to OrderCollection
   - Set status to "pending"
   - Create farmer entries
3. Update cart
   - Clear items
   - Mark as empty
4. Update inventory (for each item)
   - Deduct quantity
   - Check if needs to mark inStock = false
```

**Status Updates:**
```javascript
// Farmer updates delivery status
1. Find order
2. Validate farmer is part of order
3. Update farmer status (atomic)
4. Update order-level status based on farmers
5. Update timestamps
6. Send notifications
```

---

## Performance Considerations

### Indexes
```javascript
// Frequently queried filters
{ consumer: 1, orderDate: -1 }         // Consumer's recent orders
{ 'farmers.farmerId': 1 }              // Farmer's orders
{ status: 1 }                          // Orders by status
{ paymentStatus: 1 }                   // Payment tracking
```

### Aggregation Pipeline
```javascript
// High-value orders
db.orders.aggregate([
  { $match: { total: { $gte: 5000 } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
])

// Revenue analysis
db.orders.aggregate([
  { $group: {
    _id: '$status',
    totalRevenue: { $sum: '$total' },
    avgOrder: { $avg: '$total' },
    count: { $sum: 1 }
  }}
])
```

### Caching Opportunities
```javascript
// Cache consumer order counts
// Cache farmer pending order counts
// Cache order statistics (daily)
```

---

## Security Considerations

### Authorization

```javascript
// Consumer can only:
- View their own orders
- Update only pending/accepted orders
- Cancel only pending/accepted orders

// Farmer can only:
- View orders containing their items
- Update only their farmer_status
- Cannot view other farmers' items in order

// Admin can:
- View all orders
- Modify any order
- View statistics
```

### Data Privacy

```javascript
// Filter data by role:
Consumer.view = {
  order_id, status, total, items, timeline, tracking
}

Farmer.view = {
  order_id, consumer (name only), items (only theirs),
  farmer_status, dates, notes
}

Admin.view = {
  order_id, consumer (full), items (all), farmers (all),
  payment, analytics, notes
}
```

---

## Error Handling Strategy

### Validation Errors
```
400 - Missing required fields
400 - Invalid shipping address
400 - Cart is empty
400 - Items no longer available
400 - Invalid status transition
```

### Authorization Errors
```
401 - Invalid authentication token
403 - Not authorized to view order
403 - Not part of this order (farmer)
```

### Resource Errors
```
404 - Order not found
404 - Product not found
```

### Business Logic Errors
```
400 - Cannot cancel delivered order
400 - Order already rejected
400 - Insufficient stock
```

---

## Testing Strategy

### Unit Tests
```javascript
// Order creation from cart
// Status transitions
// Multi-farmer grouping
// Calculation methods
```

### Integration Tests
```javascript
// Farmer accept/reject
// Delivery status updates
// Inventory deduction
// Order cancellation
```

### E2E Tests
```javascript
// Complete order → delivery workflow
// Multi-farmer scenario
// Cancellation workflow
// Payment integration
```

---

## Related Documentation

- **Order Module Guide:** [ORDER_MODULE_GUIDE.md](./ORDER_MODULE_GUIDE.md)
- **Cart Module Guide:** [CART_MODULE_GUIDE.md](./CART_MODULE_GUIDE.md)
- **Product Module Guide:** [PRODUCT_MODULE_GUIDE.md](./PRODUCT_MODULE_GUIDE.md)

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Status:** Ready for Integration

