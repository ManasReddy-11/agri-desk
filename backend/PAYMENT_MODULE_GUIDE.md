# Payment Module - API Reference Guide

## Overview

The Payment Module handles complete payment lifecycle management for AgriDesk, including:
- Payment initiation and processing
- Mock payment gateway simulation (Razorpay/Stripe style)
- Payment verification and reconciliation
- Refund management
- Payment analytics and reporting

## Key Features

✅ **Mock Gateway Simulation** - Razorpay/Stripe style payment processing  
✅ **Multiple Payment Methods** - Card, UPI, Netbanking, Wallet, COD  
✅ **Payment Status Tracking** - 7 status states with timeline  
✅ **Refund Management** - Full refund lifecycle support  
✅ **Error Handling** - Detailed error codes and retry logic  
✅ **Payment Analytics** - Revenue tracking and statistics  
✅ **Reconciliation** - Settlement and reconciliation support  

---

## Database Schema

```
Payment {
  _id: ObjectId
  
  // Identification
  paymentId: String (unique) - PAY_TIMESTAMP_RANDOM
  transactionId: String - Gateway transaction ID
  gatewayPaymentId: String - Razorpay/Stripe payment ID
  gatewayOrderId: String - Gateway order ID
  receiptNumber: String - Invoice receipt number
  
  // References
  orderId: ObjectId (ref: Order) * required
  consumer: ObjectId (ref: User) * required
  
  // Amount & Currency
  amount: Number - Payment amount (2 decimal places)
  currency: String - 'INR'|'USD'|'EUR'|'GBP' (default: INR)
  
  // Payment Details
  paymentMethod: String* - 'card'|'upi'|'netbanking'|'wallet'|'cod'
  paymentGateway: String - 'razorpay'|'stripe'|'paypal'|'mock'
  
  // Status Tracking
  status: String - 'pending'|'initiated'|'processing'|'success'|
                    'failed'|'cancelled'|'refunded'
  initiatedAt: Date - When payment initiated
  processedAt: Date - When processed by gateway
  successAt: Date - When payment succeeded
  failedAt: Date - When payment failed
  
  // Payment Details (Masked)
  paymentDetails: {
    method: String
    cardBrand: String - 'visa'|'mastercard'|'amex'
    cardLast4: String - Last 4 digits
    cardExpiry: String - MM/YY format
    upiId: String - Masked UPI ID
    bankCode: String - Bank code for netbanking
    walletProvider: String
  }
  
  // Error Handling
  errorCode: String - Payment error code
  errorMessage: String - Human-readable error
  attemptCount: Number - Number of payment attempts
  
  // Refund Information
  refund: {
    status: String - 'none'|'initiated'|'processing'|'completed'|'failed'
    refundId: String - Unique refund ID
    amount: Number - Refund amount
    reason: String - Reason for refund
    initiatedAt: Date
    completedAt: Date
    gatewayRefundId: String
  }
  
  // Settlement
  settlement: {
    settled: Boolean
    settledAt: Date
    settlementId: String
    fees: Number - Gateway fees
    netAmount: Number - Amount after fees
  }
  
  // Metadata
  metadata: {
    ipAddress: String
    userAgent: String
    deviceId: String
    notes: String
  }
  
  reconciled: Boolean - Payment reconciled
  reconciledAt: Date
  
  timestamps: created/updated
}
```

### Indexes
- `consumer + _id` - Consumer's payments
- `orderId` - Find payment by order
- `status + _id` - Payments by status
- `createdAt` - Recent payments
- `transactionId` - Transaction lookup
- `refund.status` - Refund tracking
- `reconciled + settlement.settled` - Reconciliation

---

## Payment Status Flow

```
                    ┌─ Success → Settled
                    │    ├─ Refund Initiated
Pending ─ Initiated ┤    └─ Refunded
                    │
                    ├─ Failed → Can Retry
                    │
                    └─ Cancelled
```

### Status Definitions

| Status | Description | Can Retry | Can Refund |
|--------|-------------|-----------|-----------|
| `pending` | Initial state | Yes | No |
| `initiated` | Payment initiated with gateway | Yes | No |
| `processing` | Gateway processing | Yes | No |
| `success` | Payment successful | No | Yes |
| `failed` | Payment failed | Yes | No |
| `cancelled` | Payment cancelled by user | Yes | No |
| `refunded` | Refund completed | No | No |

---

## API Endpoints

### Consumer Endpoints

#### 1. Initiate Payment

```http
POST /api/payment/initiate
Authorization: Bearer CONSUMER_TOKEN
Content-Type: application/json

{
  "orderId": "507f1f77bcf86cd799439011",
  "paymentMethod": "card",
  "paymentGateway": "mock",
  "metadata": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "deviceId": "device_123"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "payment": {
      "paymentId": "PAY_1642300800000_ABC123XYZ",
      "amount": 500,
      "currency": "INR",
      "status": "initiated",
      "statusLabel": "Payment Initiated",
      "method": "card"
    },
    "gatewayOrder": {
      "id": "order_1642300800_xyz789",
      "amount": 50000,
      "currency": "INR",
      "status": "created"
    }
  }
}
```

**Errors:**
- `400` - Missing orderId or paymentMethod
- `400` - Only pending orders can be paid
- `400` - Payment already completed for order
- `403` - Not authorized to pay for order
- `404` - Order not found

---

#### 2. Process Payment

```http
POST /api/payment/process
Authorization: Bearer CONSUMER_TOKEN
Content-Type: application/json

{
  "paymentId": "PAY_1642300800000_ABC123XYZ",
  "orderId": "507f1f77bcf86cd799439011",
  "method": "card",
  "cardDetails": {
    "number": "4111111111111111",
    "expiry": "12/25",
    "cvv": "123"
  }
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "payment": {
      "paymentId": "PAY_1642300800000_ABC123XYZ",
      "amount": 500,
      "status": "success",
      "statusLabel": "Payment Successful"
    },
    "transactionId": "pay_1642300850_txn123",
    "receiptUrl": "/receipt/PAY_1642300800000_ABC123XYZ"
  }
}
```

**Response (400 - Failed):**
```json
{
  "success": false,
  "message": "Payment failed",
  "data": {
    "payment": {
      "paymentId": "PAY_1642300800000_ABC123XYZ",
      "amount": 500,
      "status": "failed"
    },
    "error": {
      "code": "PAYMENT_DECLINED",
      "message": "Your card was declined",
      "retryable": true
    }
  }
}
```

---

#### 3. Verify Payment

```http
POST /api/payment/verify
Authorization: Bearer CONSUMER_TOKEN
Content-Type: application/json

{
  "paymentId": "PAY_1642300800000_ABC123XYZ",
  "transactionId": "pay_1642300850_txn123",
  "orderId": "507f1f77bcf86cd799439011"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "payment": {
      "paymentId": "PAY_1642300800000_ABC123XYZ",
      "amount": 500,
      "status": "success"
    }
  }
}
```

---

#### 4. Get Payment Details

```http
GET /api/payment/PAY_1642300800000_ABC123XYZ
Authorization: Bearer CONSUMER_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment details retrieved",
  "data": {
    "payment": {
      "_id": "payment_id",
      "paymentId": "PAY_1642300800000_ABC123XYZ",
      "orderId": { "id": "order_id", "orderNumber": "ORD-001" },
      "amount": 500,
      "status": "success",
      "method": "card",
      "transactionId": "pay_1642300850_txn123",
      "successAt": "2022-01-16T10:15:00Z",
      "paymentDetails": {
        "cardBrand": "Visa",
        "cardLast4": "1111"
      }
    },
    "summary": {
      "paymentId": "PAY_1642300800000_ABC123XYZ",
      "amount": 500,
      "status": "success",
      "method": "card"
    }
  }
}
```

---

#### 5. Get Payment History

```http
GET /api/payment?page=1&limit=10&status=success&method=card
Authorization: Bearer CONSUMER_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment history retrieved",
  "data": {
    "payments": [
      {
        "paymentId": "PAY_1642300800000_ABC123XYZ",
        "amount": 500,
        "status": "success",
        "method": "card",
        "successAt": "2022-01-16T10:15:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

#### 6. Retry Failed Payment

```http
POST /api/payment/PAY_1642300800000_ABC123XYZ/retry
Authorization: Bearer CONSUMER_TOKEN
Content-Type: application/json

{
  "method": "upi"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment retry initiated",
  "data": {
    "payment": {
      "paymentId": "PAY_1642300800000_ABC123XYZ",
      "status": "initiated"
    },
    "attemptNumber": 2
  }
}
```

---

### Refund Endpoints

#### 7. Initiate Refund

```http
POST /api/payment/PAY_1642300800000_ABC123XYZ/refund
Authorization: Bearer CONSUMER_TOKEN
Content-Type: application/json

{
  "amount": 500,
  "reason": "Order cancelled by customer"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Refund initiated successfully",
  "data": {
    "payment": {
      "paymentId": "PAY_1642300800000_ABC123XYZ",
      "status": "success"
    },
    "refund": {
      "id": "REF_1642300900_XYZ789",
      "amount": 500,
      "status": "initiated",
      "reason": "Order cancelled by customer"
    }
  }
}
```

---

#### 8. Get Refund Status

```http
GET /api/payment/PAY_1642300800000_ABC123XYZ/refund/status
Authorization: Bearer CONSUMER_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Refund status retrieved",
  "data": {
    "refund": {
      "status": "initiated",
      "refundId": "REF_1642300900_XYZ789",
      "amount": 500,
      "reason": "Order cancelled",
      "initiatedAt": "2022-01-16T10:20:00Z"
    },
    "paymentStatus": "success"
  }
}
```

---

### Admin Endpoints

#### 9. Get All Payments (Admin)

```http
GET /api/payment/admin/all?page=1&limit=20&status=success&startDate=2022-01-01
Authorization: Bearer ADMIN_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "All payments retrieved",
  "data": {
    "payments": [
      {
        "_id": "payment_id",
        "paymentId": "PAY_1642300800000_ABC123XYZ",
        "orderId": { "orderNumber": "ORD-001" },
        "consumer": { "name": "John Doe", "email": "john@example.com" },
        "amount": 500,
        "status": "success",
        "method": "card"
      }
    ],
    "pagination": {
      "current": 1,
      "limit": 20,
      "total": 156,
      "pages": 8
    }
  }
}
```

---

#### 10. Get Payment Statistics

```http
GET /api/payment/admin/stats
Authorization: Bearer ADMIN_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment statistics retrieved",
  "data": {
    "byStatus": [
      { "_id": "success", "count": 850, "total": 425000 },
      { "_id": "failed", "count": 45, "total": 22500 },
      { "_id": "pending", "count": 12, "total": 6000 }
    ],
    "byMethod": [
      { "_id": "card", "count": 600, "total": 300000 },
      { "_id": "upi", "count": 250, "total": 125000 },
      { "_id": "netbanking", "count": 45, "total": 22500 }
    ],
    "totalRevenue": [
      { "count": 850, "total": 425000 }
    ],
    "refundStats": [
      { "_id": "completed", "count": 15, "total": 7500 },
      { "_id": "initiated", "count": 3, "total": 1500 }
    ]
  }
}
```

---

#### 11. Get Revenue Analytics

```http
GET /api/payment/admin/revenue?days=30
Authorization: Bearer ADMIN_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Revenue analytics retrieved",
  "data": {
    "summary": {
      "totalRevenue": 425000,
      "avgDaily": 14166.67,
      "totalTransactions": 850,
      "period": "30 days"
    },
    "dailyBreakdown": [
      {
        "_id": "2022-01-01",
        "total": 15000,
        "count": 30,
        "avg": 500
      }
    ]
  }
}
```

---

#### 12. Get Pending Payments

```http
GET /api/payment/admin/pending
Authorization: Bearer ADMIN_TOKEN
```

---

#### 13. Get Failed Payments

```http
GET /api/payment/admin/failed?hours=24
Authorization: Bearer ADMIN_TOKEN
```

---

#### 14. Get Pending Refunds

```http
GET /api/payment/admin/refunds/pending
Authorization: Bearer ADMIN_TOKEN
```

---

#### 15. Process Refund (Admin)

```http
POST /api/payment/admin/PAY_1642300800000_ABC123XYZ/refund/process
Authorization: Bearer ADMIN_TOKEN
```

---

## Error Codes

### Payment Processing Errors

| Code | Description | Retryable |
|------|-------------|-----------|
| `PAYMENT_DECLINED` | Card declined by bank | Yes |
| `INSUFFICIENT_FUNDS` | Insufficient balance | Yes |
| `NETWORK_ERROR` | Network timeout | Yes |
| `INVALID_CARD` | Invalid card details | No |
| `FRAUD_DETECTED` | Transaction blocked | No |
| `EXPIRED_CARD` | Card expired | No |
| `CVV_FAILED` | Invalid CVV | No |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Payment successful |
| `201` | Payment created |
| `400` | Bad request / Payment failed |
| `401` | Unauthorized |
| `403` | Forbidden / Not authorized to this payment |
| `404` | Payment not found |
| `409` | Payment already processed |

---

## Payment Workflow Example

### Complete Payment Lifecycle

```
1. Consumer places order
   {status: pending, paymentStatus: pending}

2. Consumer initiates payment
   POST /api/payment/initiate
   → Payment created with status: pending

3. Consumer fills payment details
   POST /api/payment/process
   → Gateway processes payment
   → 85% success, 15% failure (mock)

4. Payment successful
   {paymentId, transactionId, status: success}
   → Order paymentStatus updated to completed
   → Order can proceed to fulfillment

5. Consumer views receipt
   GET /api/payment/{paymentId}
   → Full payment details including receipt

6. (If needed) Consumer initiates refund
   POST /api/payment/{paymentId/refund
   → Refund status: initiated

7. Admin processes refund
   POST /api/payment/admin/{paymentId}/refund/process
   → Refund status: completed
   → Consumer receives refund
```

---

## Mock Payment Gateway Behavior

### Razorpay Simulation

```javascript
// Create Order
{
  "id": "order_1642300800_xyz",
  "entity": "order",
  "amount": 50000,          // in paise
  "currency": "INR",
  "status": "created"
}

// Process Payment (85% success, 15% failure)
Success Response:
{
  "status": "success",
  "razorpay_payment_id": "pay_xyz123",
  "razorpay_order_id": "order_xyz123",
  "razorpay_signature": "hex_signature_string"
}

Failed Response:
{
  "status": "failed",
  "error": {
    "code": "PAYMENT_DECLINED",
    "description": "Your card was declined"
  }
}
```

---

## Related Documentation

- **Order Module:** [ORDER_MODULE_GUIDE.md](./ORDER_MODULE_GUIDE.md)
- **Cart Module:** [CART_MODULE_GUIDE.md](./CART_MODULE_GUIDE.md)
- **Quick Start:** [PAYMENT_QUICK_START.md](./PAYMENT_QUICK_START.md)

---

**Status:** Production Ready ✅  
**Last Updated:** January 2024  
**Version:** 1.0

