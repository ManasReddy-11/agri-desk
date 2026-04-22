# Admin Dashboard - Quick Reference

## Quick Start

### 1. Setup
```javascript
// Add to main app
app.use('/api/admin', require('./routes/admin.routes'));
```

### 2. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"admin@example.com","password":"password"}'
```

---

## All Endpoints (16 total)

### Users (5)
```bash
GET    /api/admin/users                          # List users
GET    /api/admin/users/:userId                  # User details
DELETE /api/admin/users/:userId                  # Delete user
POST   /api/admin/users/:userId/ban              # Ban user
POST   /api/admin/users/:userId/reset-password   # Reset password
```

### Products (5)
```bash
GET    /api/admin/products                       # List products
POST   /api/admin/products/:productId/approve    # Approve
POST   /api/admin/products/:productId/reject     # Reject
DELETE /api/admin/products/:productId            # Remove
POST   /api/admin/products/:productId/suspend    # Suspend
```

### Orders (3)
```bash
GET    /api/admin/orders                         # List orders
GET    /api/admin/orders/suspicious              # Flagged orders
POST   /api/admin/orders/:orderId/resolve        # Resolve dispute
```

### Analytics (3)
```bash
GET    /api/admin/analytics                      # Platform stats
GET    /api/admin/dashboard                      # Dashboard overview
GET    /api/admin/health                         # System health
```

---

## Common Tasks

### List All Users
```bash
TOKEN="<your_token>"

# All users
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/users

# Filter farmers
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/users?role=farmer&limit=50"

# Search user
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/users?search=john"
```

### Manage Suspicious Users
```bash
# Get users flagged for review
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/users?banned=true"

# Ban user
curl -X POST "http://localhost:5000/api/admin/users/USER_ID/ban" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ban":true,"reason":"Fraud detected"}'

# Delete user
curl -X DELETE "http://localhost:5000/api/admin/users/USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Account violation","permanent":false}'
```

### Approve/Reject Products
```bash
# Get pending products
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/products?status=pending"

# Approve
curl -X POST "http://localhost:5000/api/admin/products/PRODUCT_ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Meets standards"}'

# Reject
curl -X POST "http://localhost:5000/api/admin/products/PRODUCT_ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Blurry images"}'

# Suspend temporarily
curl -X POST "http://localhost:5000/api/admin/products/PRODUCT_ID/suspend" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Out of stock","duration":7}'
```

### Monitor Orders
```bash
# Get all orders
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/orders?status=completed&limit=50"

# Get suspicious orders
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/orders/suspicious"

# Resolve dispute
curl -X POST "http://localhost:5000/api/admin/orders/ORDER_ID/resolve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution":"Refund issued","refundAmount":500}'
```

### View Analytics
```bash
# Dashboard overview
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/dashboard

# Monthly analytics
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/analytics?period=month"

# System health
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/health
```

---

## Query Parameters

### Pagination
```
page: 1-1000 (default: 1)
limit: 1-100 (default: 20)
```

### Users Filter
```
role: consumer | farmer | admin
status: active | inactive | suspended
verified: true | false
banned: true | false
search: email/name search
```

### Products Filter
```
status: pending | active | rejected | suspended | removed
category: vegetables | fruits | grains | dairy
search: name/description search
```

### Orders Filter
```
status: pending | confirmed | shipped | delivered | completed | cancelled
fromDate: ISO date
toDate: ISO date
```

### Analytics
```
period: week | month | year (default: month)
```

---

## Response Format

### Success
```json
{
    "success": true,
    "message": "Operation successful",
    "data": { ... }
}
```

### Error
```json
{
    "success": false,
    "message": "Error description",
    "code": "ERROR_CODE",
    "errors": {
        "fieldName": "Field error"
    }
}
```

---

## Error Codes

| Code | HTTP | Cause | Solution |
|------|------|-------|----------|
| NO_TOKEN | 401 | Missing auth header | Add Authorization header |
| INVALID_TOKEN | 401 | Invalid/expired token | Login again |
| FORBIDDEN_ADMIN | 403 | Not admin | Use admin account |
| VALIDATION_ERROR | 400 | Invalid data | Check field values |
| NOT_FOUND | 404 | Resource not found | Verify ID |
| CONFLICT | 409 | Already in state | Check current status |

---

## Dashboard Data

### Today's Overview
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/dashboard
```

Returns:
- Total orders today
- Revenue today
- New users today
- Flagged reviews count
- Suspicious orders count
- Pending product approvals

### Monthly Analytics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/analytics?period=month"
```

Returns:
- Total/new/active users
- Total orders & revenue
- Orders by status
- Products by status
- Review statistics
- Payment statistics

---

## Common Scenarios

### Scenario 1: New Farmer Signup Review

1. Get new farmers
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/users?role=farmer&search=NEW"
```

2. View farmer details
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/users/FARMER_ID
```

3. Check farmer's products
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/products?farmerId=FARMER_ID"
```

### Scenario 2: Product Approval Workflow

1. Get pending products
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/products?status=pending&limit=100"
```

2. Review each product (view farmer, check images)

3. Approve or reject
```bash
# Approve
curl -X POST "http://localhost:5000/api/admin/products/PROD_ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Quality verified"}'

# Reject  
curl -X POST "http://localhost:5000/api/admin/products/PROD_ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Unclear images"}'
```

### Scenario 3: Fraud Investigation

1. Get flagged reviews
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/orders/suspicious"
```

2. Investigate order
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/orders/ORDER_ID
```

3. Check user history
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/users/USER_ID
```

4. Take action
```bash
# Ban user
curl -X POST "http://localhost:5000/api/admin/users/USER_ID/ban" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ban":true,"reason":"Fraud: Multiple chargebacks"}'

# Resolve dispute
curl -X POST "http://localhost:5000/api/admin/orders/ORDER_ID/resolve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution":"Refund issued","refundAmount":0}'
```

---

## Pagination Example

### Get page 2 of products
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/admin/products?page=2&limit=20"
```

Response includes:
```json
{
    "pagination": {
        "page": 2,
        "limit": 20,
        "total": 2500,
        "pages": 125
    }
}
```

---

## Timestamps

All dates in ISO format (UTC):
```
"2024-04-13T16:30:00Z"
```

Filters accept ISO dates:
```bash
?fromDate=2024-04-01&toDate=2024-04-13
```

---

## Performance Notes

- Indices on: userId, farmerId, status, createdAt
- Aggregation used for analytics
- Pagination enforced (max 100 items)
- Lean queries for list endpoints
- Filtered projections to reduce data

---

## Audit Trail

All admin actions are logged:
- User deletions
- Product approvals/rejections
- Order disputes
- Password resets
- User bans

View logs in admin_actions collection

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Endpoints | 16 |
| User Management | 5 endpoints |
| Product Management | 5 endpoints |
| Order Monitoring | 3 endpoints |
| Analytics | 3 endpoints |
| Code Lines | 650+ |
| Functions | 16 |

---

## Next Steps

1. Create admin account
2. Test login
3. Review dashboard
4. Approve pending products
5. Monitor orders
6. Check analytics daily

