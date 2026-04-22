# Payment Module - Quick Start Guide

## Getting Started

### Prerequisites
- Node.js backend running
- MongoDB connected
- Valid JWT consumer/admin tokens
- Order placed and ready for payment

---

## Consumer - Payment Operations

### 1. Initiate Payment

```bash
curl -X POST http://localhost:5000/api/payment/initiate \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_id_here",
    "paymentMethod": "card",
    "paymentGateway": "mock",
    "metadata": {
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  }'
```

### 2. Process Payment

```bash
curl -X POST http://localhost:5000/api/payment/process \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "PAY_1642300800000_ABC123",
    "orderId": "order_id_here",
    "method": "card",
    "cardDetails": {
      "number": "4111111111111111",
      "expiry": "12/25",
      "cvv": "123"
    }
  }'
```

### 3. Get Payment Status

```bash
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/payment/PAY_1642300800000_ABC123
```

### 4. Get Payment History

```bash
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  "http://localhost:5000/api/payment?page=1&limit=10&status=success"
```

### 5. Verify Payment

```bash
curl -X POST http://localhost:5000/api/payment/verify \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "PAY_1642300800000_ABC123",
    "transactionId": "pay_1642300850_txn123",
    "orderId": "order_id_here"
  }'
```

### 6. Retry Failed Payment

```bash
curl -X POST http://localhost:5000/api/payment/PAY_1642300800000_ABC123/retry \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "upi"}'
```

### 7. Initiate Refund

```bash
curl -X POST http://localhost:5000/api/payment/PAY_1642300800000_ABC123/refund \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Order cancelled - changed mind"
  }'
```

### 8. Get Refund Status

```bash
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/payment/PAY_1642300800000_ABC123/refund/status
```

---

## Admin - Payment Management

### 1. View All Payments

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/payment/admin/all?page=1&limit=20&status=success"
```

### 2. Get Payment Statistics

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/payment/admin/stats
```

### 3. Get Revenue Analytics (Last 30 days)

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/payment/admin/revenue?days=30"
```

### 4. Get Pending Payments

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/payment/admin/pending
```

### 5. Get Failed Payments (Last 24 hours)

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5000/api/payment/admin/failed?hours=24"
```

### 6. Get Pending Refunds

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/payment/admin/refunds/pending
```

### 7. Process Refund

```bash
curl -X POST http://localhost:5000/api/payment/admin/PAY_1642300800000_ABC123/refund/process \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 8. Get Payment Details

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/payment/admin/PAY_1642300800000_ABC123
```

### 9. Reconcile Payment

```bash
curl -X POST http://localhost:5000/api/payment/admin/PAY_1642300800000_ABC123/reconcile \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Complete Workflow Example

### Consumer Makes Payment

```bash
# 1. Place order first
# (See ORDER_QUICK_START.md for order placement)

# 2. Initiate payment
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/payment/initiate \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}')

PAYMENT_ID=$(echo $PAYMENT_RESPONSE | jq -r '.data.payment.paymentId')

# 3. Process payment
curl -X POST http://localhost:5000/api/payment/process \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"paymentId\": \"$PAYMENT_ID\", ...}"

# 4. View receipt
curl -H "Authorization: Bearer CONSUMER_TOKEN" \
  http://localhost:5000/api/payment/$PAYMENT_ID
```

---

## Payment Methods

### Card Payment
```json
{
  "method": "card",
  "cardDetails": {
    "number": "4111111111111111",
    "expiry": "12/25",
    "cvv": "123"
  }
}
```

### UPI Payment
```json
{
  "method": "upi",
  "upiId": "user@bankname"
}
```

### Netbanking
```json
{
  "method": "netbanking",
  "bankCode": "ICIC0000001"
}
```

---

## Error Handling

### Payment Declined
```json
{
  "success": false,
  "message": "Payment failed",
  "data": {
    "error": {
      "code": "PAYMENT_DECLINED",
      "message": "Your card was declined",
      "retryable": true
    }
  }
}
```

### Insufficient Funds
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient funds in account",
    "retryable": true
  }
}
```

### Network Timeout
```json
{
  "error": {
    "code": "NETWORK_ERROR",
    "message": "Network timeout. Please try again",
    "retryable": true
  }
}
```

---

## Tips & Best Practices

### Do's ✅
- Always initiate payment before processing
- Verify payment after gateway response
- Store transaction ID for reconciliation
- Allow retry for transient failures
- Process refunds within 7 days
- Check payment status before order fulfillment

### Don'ts ❌
- Don't process payment without order
- Don't skip verification step
- Don't display full card details
- Don't process same payment twice
- Don't refund after settlement
- Don't ignore network errors

---

## Test Card Numbers (Mock Gateway)

```
Visa:        4111 1111 1111 1111
Mastercard:  5555 5555 5555 4444
Amex:        3782 822463 10005
Discover:    6011 1111 1111 1117
```

**For testing:**
- Any future expiry date (e.g., 12/25)
- Any 3-digit CVV (e.g., 123)
- Mock gateway: 85% success rate

---

## Payment Status Reference

```
pending
  ↓
initiated (order created with gateway)
  ↓
processing (payment processing)
  ├─→ success ✓ (payment completed)
  │     ├─→ Can refund
  │     └─→ Can reconcile
  │
  └─→ failed (payment declined)
        └─→ Can retry (max 3 attempts)

cancelled (user cancelled)
  └─→ Can retry

refunded (refund completed)
  └─→ Final state
```

---

## Next Steps

1. **Review Integration:** See [PAYMENT_INTEGRATION_GUIDE.md](./PAYMENT_INTEGRATION_GUIDE.md)
2. **Full API:** See [PAYMENT_MODULE_GUIDE.md](./PAYMENT_MODULE_GUIDE.md)
3. **Order Module:** See [ORDER_MODULE_GUIDE.md](./ORDER_MODULE_GUIDE.md)

---

**Status:** Ready to Use ✅
