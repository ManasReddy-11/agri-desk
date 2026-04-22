# Cart Integration Guide

## System Architecture

The Cart Module connects consumers to products and serves as the bridge to the order/checkout system.

```
User (Consumer)
    ↓
    └─→ Add Product
    ├─→ Cart
    │   ├─→ Items (Product + Farmer)
    │   ├─→ Pricing Calculations
    │   ├─→ Discounts & Coupons
    │   └─→ Grouped by Farmer
    │
    └─→ Proceed to Order/Checkout
```

---

## Integration Architecture

### Current Integrations

#### 1. **Consumer (User) ↔ Cart**
```javascript
// One-to-one relationship
User(consumer) ←→ Cart

// Fields
Cart.consumer = ObjectId(ref: User)  // Unique, one cart per consumer
```

**Operations:**
- User registers as consumer → Cart created automatically (or on first add)
- User logs in → Cart retrieved and repopulated
- User logs out → Cart persists (pre-checkout state)

**Data Flow:**
```
1. Consumer logs in → JWT token issued
2. Consumer browses products
3. Consumer adds to cart → Cart retrieved for user
4. Cart items linked to consumer ID
5. Cart persists across sessions
```

#### 2. **Product ↔ Cart**
```javascript
// Many-to-many relationship
Product ←→ Cart.items
```

**Integration Points:**
```javascript
// When adding to cart:
1. Find product by ID
2. Check if active (isActive = true)
3. Check if in stock (inStock = true)
4. Validate quantity available
5. Validate minimum order quantity
6. Snapshot price (not real-time)
7. Add to cart with farmer reference
```

**Price Snapshot:**
```javascript
// At time of adding to cart, capture:
- Regular price
- Discounted price  
- Farmer ID
- Product name & image

// If product price changes later:
- Cart item keeps original snapshot price
- Product listing shows new price
```

**Stock Validation:**
```javascript
// When cart operations occur:
1. Add to cart → Check available quantity
2. Update quantity → Re-validate stock
3. Before checkout → Validate all items
4. After order → Deduct from product
```

#### 3. **Farmer (User) ↔ Cart**
```javascript
// Indirect relationship through product
User(farmer) → Product ← Cart.items

// Fields
Cart.items.farmer = ObjectId(ref: User)
```

**Operations:**
- When product added to cart → Farmer captured
- Cart items grouped by farmer
- Multiple farmers per cart (multi-seller support)

**Use Case:**
```
Cart Items from:
├─ Farmer A → 3 products
├─ Farmer B → 2 products
└─ Farmer C → 1 product

Allows separate orders to each farmer
(different delivery times, shipping, payments)
```

---

## Data Flow Examples

### Adding Product to Cart

```
1. Consumer Request: POST /api/cart
   {
     "productId": "507f...",
     "quantity": 2
   }

2. Auth Middleware: verifyToken + isConsumer
   ├─ Extract consumer ID from JWT
   ├─ Verify token is valid
   └─ Verify user role is 'consumer'

3. Controller: addToCart()
   ├─ Validate input (productId, quantity)
   ├─ Get product from DB
   │  ├─ Check isActive = true
   │  ├─ Check inStock = true
   │  ├─ Validate quantity available
   │  └─ Validate minOrderQuantity
   ├─ Get or create consumer's cart
   │  └─ One unique cart per consumer
   ├─ Add item with:
   │  ├─ Product reference
   │  ├─ Farmer ID (from product)
   │  ├─ Quantity
   │  ├─ Price snapshot (product.price)
   │  ├─ Discount snapshot (product.discountedPrice)
   │  └─ Product name & image
   ├─ Calculate cart totals
   │  ├─ Item total: finalPrice × quantity
   │  ├─ Subtotal: sum of all items
   │  ├─ Taxes: subtotal × 0.05
   │  └─ Total: subtotal + taxes + shipping
   └─ Save cart to DB

4. Response: 200 OK
   {
     "cart": {...},
     "summary": {
       "itemCount": 2,
       "total": 197
     }
   }
```

### Getting Cart Grouped by Farmer

```
1. Consumer Request: GET /api/cart/grouped

2. Cart Model (Virtual Property):
   cart.groupedByFarmer {
     farmer_id_1: {
       farmer: {...},
       items: [item1, item2],
       subtotal: 140
     },
     farmer_id_2: {
       farmer: {...},
       items: [item3],
       subtotal: 90
     }
   }

3. Response: 
   Multiple orders can be created:
   ├─ Order 1 (Farmer A): items 1,2
   ├─ Order 2 (Farmer B): item 3
   └─ Total payment: 230

This allows:
- Separate shipping to each farmer
- Different delivery dates
- Multiple payment processing
- Better inventory management
```

### Validating Cart Before Checkout

```
1. Consumer Request: GET /api/cart/validation

2. Controller: validateCartItems()
   ├─ For each item in cart:
   │  ├─ Find current product
   │  ├─ Compare quantity in cart vs product.quantity
   │  └─ Mark available=true/false
   ├─ Check availability changes:
   │  ├─ "Out of stock"
   │  ├─ "Product removed"
   │  └─ "Insufficient stock"

3. Response:
   - If all available:
     ├─ "isValid": true
     └─ Can proceed to checkout
   
   - If some unavailable:
     ├─ "isValid": false
     ├─ List unavailable items
     └─ Suggest removal or wait
```

---

## Module Dependencies

### Outbound Dependencies

```
Cart Module
├─ Requires: User Model (Consumer reference)
├─ Requires: Product Model (Product reference)
├─ Requires: Auth Middleware (JWT verification)
├─ Requires: Error Handler (AppError handling)
└─ Uses: Mongoose (database operations)
```

### Inbound Dependencies (Future)

```
Order Module → Cart Module
├─ Gets items from cart
├─ Snapshots pricing
├─ Creates order from cart
└─ Clears cart after order

Payment Module → Cart Module
├─ Gets total from cart
├─ Applies payment
└─ Triggers order creation

Coupon Module → Cart Module
├─ Validates coupon code
├─ Calculates discount
└─ Updates cart total

Notification Module → Cart Module
├─ Tracks abandoned carts
├─ Sends price change alerts
└─ Notifies low stock
```

---

## Important Integration Points

### 1. Consumer Role Check

```javascript
// Cart is consumer-only
router.post('/api/cart', 
  verifyToken,      // Check JWT valid
  isConsumer,       // Check role is 'consumer'
  addToCart
);

// Farmers cannot use cart directly
// (Farmers create products, not orders from cart)
```

### 2. Price Snapshot Strategy

```javascript
// Problem: Product price changes after adding to cart
// Solution: Snapshot price at add time

cart.items[0] = {
  productId: "...",
  priceAtAdd: 50,        // Price when user added to cart
  currentProductPrice: 45 // Product price now lower
  // Cart shows priceAtAdd (fairness to consumer)
}

// When order created:
// Use cart's snapshot price, not current product price
```

### 3. Multi-Farmer Checkout

```javascript
// Some markets have single-seller checkout
// AgriDesk supports multi-seller checkout

Cart with 3 Farmers:
├─ Farmer A (via productGH_1, productGH_2)
├─ Farmer B (via product_B_1)  
└─ Farmer C (via productC_1, product_C_2)

Checkout Options:
Option 1: Single Order
├─ One order with all items
├─ One payment transaction
├─ One delivery (if possible)

Option 2: Multiple Orders (Grouped)
├─ Order 1: All items from Farmer A
├─ Order 2: All items from Farmer B
├─ Order 3: All items from Farmer C
├─ Three payments (or one payment split)
└─ Three separate deliveries

GET /api/cart/grouped helps decide
```

### 4. Coupon Integration

```javascript
// Coupons stored in cart
cart.coupon = {
  code: "WELCOME20",
  discountPercentage: 20
}

// Calculation flow:
subtotal = 1000
couponDiscount = 1000 × 20% = 200
taxes = (1000 - 200) × 5% = 40
shipping = 100
total = 800 + 40 + 100 = 940

// Future: Coupon service validates code
// Current: Manual coupon management
```

---

## Real-World Scenarios

### Scenario 1: Consumer Browses and Adds to Cart

```
Step 1: Consumer logs in
GET /api/auth/login → JWT token

Step 2: Consumer browses products
GET /api/products?category=vegetables → 12 products

Step 3: Consumer views product details
GET /api/products/507f... → Full product info

Step 4: Consumer adds to cart
POST /api/cart
{
  "productId": "507f...",
  "quantity": 2
}
→ Cart created, 1 item added, total calculated

Step 5: Consumer adds more
POST /api/cart
{
  "productId": "507f...",
  "quantity": 3
}
→ Cart updated, 2 items, total recalculated

Step 6: Consumer reviews cart
GET /api/cart
→ Full cart with all items and totals

Step 7: Consumer continues shopping
GET /api/products?minPrice=20&maxPrice=100
→ Find other products

Step 8: Consumer removes item
DELETE /api/cart/item
{
  "productId": "507f..."
}
→ Item removed, totals updated

Step 9: Consumer applies coupon
POST /api/cart/coupon
{
  "code": "WELCOME20",
  "discountPercentage": 20
}
→ Discount calculated, total reduced

Step 10: Consumer validates before checkout
GET /api/cart/validation
→ All items still available

Step 11: Consumer proceeds to checkout
(Creates orders from cart items)
```

### Scenario 2: Product Price Changes

```
Initial State:
- Product price: ₹50
- Cart item added with: priceAtAdd = 50

Later:
- Product price reduced to ₹40 (sale)
- Consumer doesn't reload page
- Cart still shows ₹50 (snapshot)

When Order Created:
- Order uses cart snapshot (₹50 per item)
- But product listing shows ₹40
- This is fair to consumer (gets better price recorded)

Alternative Handling:
- Product price increased to ₹60
- Consumer validates cart → Still shows ₹50
- Consumer creates order with old price ₹50
- Farmer gets order at ₹50 per item
```

### Scenario 3: Stock Changes During Shopping

```
Initial:
- Product stock: 100 units
- Consumer adds 10 to cart

While shopping:
- Other consumers buy 95 units
- Product stock now: 5 units

Consumer tries to checkout:
- Calls GET /api/cart/validation
- Validation checks: cart has 10, product has 5
- Item marked as unavailable
- Response: "Only 5 units available"

Consumer Options:
1. Remove from cart
2. Reduce quantity to 5
3. Proceed with partial order
```

---

## API Sequence Flows

### Add to Cart Flow

```
CLIENT                          API                         DATABASE
  │                              │                              │
  ├─ POST /cart (auth)           │                              │
  │ {productId, quantity}        │                              │
  │                              ├─ Verify token               │
  │                              ├─ Check consumer role        │
  │                              ├─ Find product               ├─ Query Product
  │                              │                              │
  │                              ├─ Validate availability      │
  │                              ├─ Get/Create cart            ├─ Query/Insert Cart
  │                              ├─ Add item                   │
  │                              ├─ Calculate totals           │
  │                              ├─ Save cart                  ├─ Update Cart
  │                              │                             │
  │ ◄─ 200 {cart, summary} ◄────┤                              │
  │                              │                              │
```

### Get Cart Grouped Flow

```
CLIENT                          API                         DATABASE
  │                              │                              │
  ├─ GET /cart/grouped (auth)   │                              │
  │                              ├─ Verify token               │
  │                              ├─ Find cart                  ├─ Query Cart
  │                              ├─ Get farmers data           ├─ Populate Farmers
  │                              ├─ Group items                │
  │                              ├─ Calculate group totals     │
  │                              │                             │
  │ ◄─ 200 {grouped} ◄───────────┤                              │
  │                              │                              │
```

---

## Error Handling Strategy

### Input Validation Errors
```
ProductId missing → 400 Bad Request
Quantity = 0 → 400 Bad Request
Product not found → 404 Not Found
```

### Business Logic Errors
```
Product not active → 410 Gone
Product out of stock → 400 Bad Request
Quantity exceeds stock → 400 Bad Request
Below minimum order qty → 400 Bad Request
```

### Authentication Errors
```
No token provided → 401 Unauthorized
Invalid token → 401 Unauthorized
Not consumer role → 403 Forbidden
```

---

## Performance Considerations

### Indexes
```javascript
// Ensure fast lookups
{ consumer: 1 }           // Find cart by consumer
{ 'items.product': 1 }    // Find item in cart
{ 'items.farmer': 1 }     // Group by farmer
{ expiresAt: 1 }          // TTL index
```

### Calculations
```javascript
// Done in memory before saving:
- Item totals (finalPrice × quantity)
- Subtotal (sum of items)
- Taxes (subtotal × 0.05)
- Grand total (subtotal + tax + shipping - coupon)

// This avoids recalculating on each read
```

### TTL (Time-To-Live)
```javascript
// Carts auto-deleted after 30 days
// Reduces database cleanup burden
// Old abandoned carts automatically removed
```

---

## Security Considerations

### Consumer Isolation
```javascript
// Each consumer can only access their cart
// Middleware checks req.user.id === cart.consumer

// No consumer can see another's cart
router.get('/', verifyToken, isConsumer, getCart)
// Only returns req.user's cart
```

### Price Protection
```javascript
// Can't modify prices in cart
// Prices are snapshots from product at add time
// Even if product price changes, cart keeps original

// Protects consumers from price increase tricks
// Protects farmers from price decrease manipulation
```

### Quantity Validation
```javascript
// Can't set negative quantity
// Can't exceed available stock
// Can't set below minimum order quantity

// Server-side validation prevents client manipulation
```

---

## Future Integration Points

### Order Module
```javascript
// When consumer clicks "Checkout":
1. System groups cart by farmer
2. For each farmer group, create Order
3. Each Order contains grouped items
4. Clear cart on successful order
```

### Payment Module
```javascript
// When processing payment:
1. Get cart total (includes all calculations)
2. Process single payment (if possible)
3. Or split payment among orders
4. Update order status
```

### Inventory Module
```javascript
// When order moves to "Confirmed":
1. Deduct from product quantities
2. Update product.inStock status
3. Send notification if low stock
```

### Notification Module
```javascript  
// Track cart events:
- Item added → No notification (in session)
- Item removed → No notification
- Abandoned cart (7 days) → Email notification
- Price drop → Product recommendation
- Back in stock → Product available alert
```

---

## Testing Strategy

### Unit Tests
```javascript
describe('Cart Model', () => {
  test('addItem increases quantity if exists', () => {})
  test('removeItem deletes cart item', () => {})
  test('calculateTotals computes correctly', () => {})
  test('applyCoupon reduces total', () => {})
})
```

### Integration Tests
```javascript
describe('Cart API', () => {
  test('Add to cart with valid product', () => {})
  test('Cannot add out of stock product', () => {})
  test('Get cart shows all items', () => {})
  test('Validation detects stock changes', () => {})
})
```

### E2E Tests
```
1. User adds multiple products
2. Updates quantities
3. Removes items
4. Applies coupon
5. Validates before checkout
```

---

## Related Documentation

- **Cart Module Guide:** [CART_MODULE_GUIDE.md](./CART_MODULE_GUIDE.md)
- **Product Module:** [PRODUCT_MODULE_GUIDE.md](./PRODUCT_MODULE_GUIDE.md)
- **Auth Middleware:** middleware/auth.js

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Status:** Ready for Integration  

