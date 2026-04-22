# Payment Integration Guide

## System Architecture

```
Consumer (Browse Products)
    ↓
Cart (Add Items)
    ↓
Order (Place Order)
    ├─→ payment.status = 'pending'
    ├─→ awaiting payment
    │
Payment (Initiate Payment)
    ├─→ payment.status = 'initiated'
    ├─→ Gateway Order Created
    │
Payment Gateway (Process Payment)
    ├─→ 85% Success → payment.status = 'success'
    │   ├─→ Order proceeds to fulfillment
    │   ├─→ Update order.payment.status = 'completed'
    │   ├─→ Can refund if needed
    │   
    └─→ 15% Failure → payment.status = 'failed'
        ├─→ Order stays pending
        ├─→ Consumer can retry
        └─→ Max 3 attempts
```

---

## Integration Points

### 1. Order ↔ Payment

**One-to-One Relationship:** Each order can have one successful payment

```javascript
// When order is placed
order.payment = {
  status: 'pending',
  amount: order.total,
  paymentMethod: null,
  transactionId: null
}

// When payment succeeds
order.payment = {
  status: 'completed',
  amount: order.total,
  paymentMethod: 'card',
  transactionId: 'pay_xyz123',
  paidAt: Date.now()
}
```

**Data Flow:**
```
1. Order created with payment.status = 'pending'
2. Consumer initiates payment 
   → Payment record created
   → Links to Order
3. Payment processed through gateway
   → Success/Failure result
4. If success:
   → Order.payment.status updated to 'completed'
   → Order can proceed to fulfillment
5. If failure:
   → Order.payment.status stays 'pending'
   → Consumer can retry payment
```

---

### 2. Cart → Order → Payment

**Complete Flow:**
```
Cart Items: [{product, quantity, finalPrice}]
       ↓
Order Created: {items, subtotal, total, payment.status='pending'}
       ↓
Payment Initiated: {amount=order.total, status='initiated'}
       ↓
Payment Processed: {status='success'/'failed'}
       ↓ (if success)
Order Updates: {payment.status='completed', payment.transactionId=...}
```

---

### 3. Payment Gateway

**Mock Razorpay Simulation:**
```
Payment Request
  ↓
MockPaymentGateway.createOrder()
  → Returns { id, amount, currency, status }
  ↓
MockPaymentGateway.processPayment()
  → 85% success, 15% failure
  → Returns { status, payment_id, signature }
  ↓
Verification
  → Verify signature
  → Update PG order status
  → Return result to system
```

---

## Real-World Workflows

### Workflow 1: Successful Payment

```
Timeline:
10:00 - Consumer places order
        Order.status = 'pending'
        Order.payment.status = 'pending'
        Amount: ₹500

10:02 - Consumer initiates payment
        POST /payment/initiate
        Payment created with status 'initiated'
        Gateway order created

10:03 - Consumer fills card details
        POST /payment/process
        Sent to mock gateway

10:04 - Payment successful
        Payment.status = 'success'
        Payment.transactionId = 'pay_xyz123'
        Order.payment.status = 'completed'
        Order.payment.paidAt = now

10:05 - Consumer receives confirmation
        Email: Payment confirmation
        Dashboard: Order says "Paid - Processing"
        Farmer: Order appears in pending list

10:06 onwards - Fulfillment
        Farmer accepts order
        Items packed, shipped, delivered
```

### Workflow 2: Failed Payment (Retried)

```
Timeline:
10:00 - Consumer initiates payment
        Payment.status = 'initiated'
        Amount: ₹500

10:02 - Payment processing
        Payment.status = 'processing'

10:03 - PAYMENT FAILED
        Error: "Card declined"
        Payment.status = 'failed'
        Payment.attemptCount = 1
        Payment.errorCode = 'PAYMENT_DECLINED'

10:05 - Consumer retries with different card
        POST /payment/{paymentId}/retry
        Payment.status = 'initiated' (reset)
        Payment.method = 'card' (updated)
        Payment.attemptCount = 1 (same)

10:07 - PAYMENT SUCCESSFUL
        Payment.status = 'success'
        Order proceeds to fulfillment
```

### Workflow 3: Refund Request

```
Timeline:
T+0  - Order delivered
       Payment.status = 'success'
       Order.status = 'delivered'

T+2  - Consumer requests refund
       Reason: "Item damaged"
       POST /payment/{paymentId}/refund
       Refund.status = 'initiated'
       Refund.amount = ₹500
       Refund.reason = 'Item damaged'

T+3  - Admin reviews refund
       (Business logic)

T+4  - Admin approves & processes
       POST /payment/admin/{paymentId}/refund/process
       MockGateway.processRefund()
       Refund.status = 'completed'
       Refund.gatewayRefundId = 'rfnd_xyz123'
       Payment.status = 'refunded'

T+5  - Consumer receives refund
       Bank processes within 3-5 business days
       Payment.settlement.settled = true
       Payment.reconciled = true
```

---

## Data Consistency

### Atomic Operations

```javascript
// Payment processing must be atomic
TransactionSession {
  1. Find payment
  2. Call gateway
  3. Update payment based on result
  4. Update related order
  5. Commit or rollback based on success
}
```

### Idempotency

```javascript
// Ensure same request twice = same result
if (payment.status === 'success') {
  // Already processed
  return existing_payment_data
}

if (payment.transactionId === incomingTxnId) {
  // Already verified by this txn
  return existing_data
}
```

---

## Settlement & Reconciliation

### Payment Settlement
```
Payment Success
  ↓ (after 3 days)
Eligible for Settlement
  ↓
Admin Marks Settled
  Settlement.settled = true
  Settlement.settlementId = 'settle_xyz'
  Settlement.netAmount = amount - fees
  ↓
Funds transferred to merchant account
```

### Reconciliation
```
Daily reconciliation with gateway:
1. Fetch transactions from gateway
2. Compare with local Payment records
3. Update status if mismatch
4. Verify amounts match
5. Mark as reconciled
Payment.reconciled = true
```

---

## Performance Optimization

### Caching
```javascript
// Cache payment stats for dashboard
Cache: payment_stats → 1 hour TTL

// Cache consumer recent payments
Cache: consumer_{id}_payments → 30 min TTL

// Cache daily revenue
Cache: daily_revenue_{date} → until end of day
```

### Indexing
```javascript
// Fast lookups
Index: consumer + _id
Index: orderId (one-to-one lookup)
Index: status (filter by status)
Index: transactionId (verify payment)

// Fast analytics
Index: createdAt (date range queries)
Index: refund.status (refund tracking)
```

---

## Security Considerations

### Card Data
```
✓ Never store full card number
✓ Only store last 4 digits
✓ Don't log card details
✓ Use HTTPS/TLS for transmission
✓ Follow PCI DSS compliance
```

### Payment Verification
```
✓ Verify signature from gateway
✓ Verify amount matches order
✓ Verify consumer owns order
✓ Verify payment not already processed
✓ Use HMAC SHA256 for signature
```

### Refund Authorization
```
✓ Only consumer can request refund
✓ Admin must approve refunds
✓ Maintain audit trail
✓ Log all refund attempts
✓ Verify refund amount ≤ payment amount
```

---

## Error Handling Strategy

**Transient Errors (Retryable):**
```
NETWORK_ERROR     → Retry immediately
TIMEOUT           → Retry after 5s
TEMPORARY_FAILURE → Retry after 30s
```

**Permanent Errors (Non-retryable):**
```
PAYMENT_DECLINED    → Show error, try different card
INVALID_CARD        → Manual update required
FRAUD_DETECTED      → Manual review required
EXPIRED_CARD        → Get new card
```

---

## Related Documentation

- **Order Module:** [ORDER_MODULE_GUIDE.md](./ORDER_MODULE_GUIDE.md)
- **Quick Start:** [PAYMENT_QUICK_START.md](./PAYMENT_QUICK_START.md)
- **Cart Module:** [CART_MODULE_GUIDE.md](./CART_MODULE_GUIDE.md)

---

**Status:** Production Ready ✅  
**Version:** 1.0
