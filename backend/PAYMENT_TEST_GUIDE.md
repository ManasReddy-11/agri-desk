# Payment Module Test Documentation

## Overview

This document provides comprehensive testing instructions for the Payment module API endpoints. Two test scripts are provided:
- **Bash script** (Linux/Mac): `test-payment-api.sh`
- **PowerShell script** (Windows): `test-payment-api.ps1`

---

## Prerequisites

### For Bash Script (Linux/Mac)
```bash
# Required tools
curl     # HTTP requests
jq       # JSON processing
base64   # Encoding
```

Install on macOS:
```bash
brew install curl jq
```

Install on Ubuntu/Debian:
```bash
sudo apt-get install curl jq
```

### For PowerShell Script (Windows)
```powershell
# PowerShell 5.0 or later (built-in)
# No additional tools required
```

### Backend Requirements
- Node.js server running on `http://localhost:5000`
- Payment module API endpoints active
- Test database with sample data
- Tokens configured

---

## Configuration

### Step 1: Get Authentication Tokens

**For Consumer Tests:**
```bash
# Login as consumer
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"consumer@example.com","password":"password123"}'

# Copy the token from response
# Update in test script: CONSUMER_TOKEN="your_token_here"
```

**For Admin Tests:**
```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Copy the token from response
# Update in test script: ADMIN_TOKEN="your_token_here"
```

### Step 2: Update Test Scripts

**Bash Script:**
```bash
# Edit test-payment-api.sh
nano test-payment-api.sh

# Replace these lines:
CONSUMER_TOKEN="SAMPLE_CONSUMER_TOKEN_12345"  # Your token here
ADMIN_TOKEN="SAMPLE_ADMIN_TOKEN_12345"        # Your token here
```

**PowerShell Script:**
```powershell
# Edit test-payment-api.ps1
$ConsumerToken = "SAMPLE_CONSUMER_TOKEN_12345"  # Your token here
$AdminToken = "SAMPLE_ADMIN_TOKEN_12345"        # Your token here
```

### Step 3: Verify Backend is Running

```bash
# Test basic connectivity
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00Z"}
```

---

## Running Tests

### Bash Script Usage

```bash
# Make script executable
chmod +x test-payment-api.sh

# Run all tests
./test-payment-api.sh all

# Run consumer tests only
./test-payment-api.sh consumer

# Run admin tests only
./test-payment-api.sh admin

# Run specific test
./test-payment-api.sh initiate      # Initiate payment only
./test-payment-api.sh process       # Process payment
./test-payment-api.sh status        # Get payment status
./test-payment-api.sh history       # Payment history
./test-payment-api.sh verify        # Verify payment
./test-payment-api.sh refund        # Refund request
./test-payment-api.sh stats         # Admin statistics
./test-payment-api.sh revenue       # Revenue analytics

# Show help
./test-payment-api.sh help
```

### PowerShell Script Usage

```powershell
# Run all tests
.\test-payment-api.ps1 -TestType all

# Run consumer tests
.\test-payment-api.ps1 -TestType consumer

# Run admin tests
.\test-payment-api.ps1 -TestType admin

# Run specific test
.\test-payment-api.ps1 -TestType initiate
.\test-payment-api.ps1 -TestType process
.\test-payment-api.ps1 -TestType status
.\test-payment-api.ps1 -TestType history
.\test-payment-api.ps1 -TestType verify
.\test-payment-api.ps1 -TestType refund
.\test-payment-api.ps1 -TestType stats
.\test-payment-api.ps1 -TestType revenue

# Run with detailed output
.\test-payment-api.ps1 -TestType all -OutputFormat detailed

# Run with summary output (default)
.\test-payment-api.ps1 -TestType all -OutputFormat summary
```

---

## Test Coverage

### Consumer Tests

| Test | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| Initiate Payment | `/payment/initiate` | POST | Create payment record |
| Process Payment | `/payment/process` | POST | Process through gateway |
| Get Status | `/payment/{id}` | GET | Check payment status |
| History | `/payment` | GET | View past payments |
| Verify | `/payment/verify` | POST | Verify payment success |
| Retry | `/payment/{id}/retry` | POST | Retry failed payment |
| Request Refund | `/payment/{id}/refund` | POST | Request refund |
| Refund Status | `/payment/{id}/refund/status` | GET | Check refund status |

### Admin Tests

| Test | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| View All | `/payment/admin/all` | GET | List all payments |
| Statistics | `/payment/admin/stats` | GET | Payment statistics |
| Revenue | `/payment/admin/revenue` | GET | Revenue analytics |
| Pending | `/payment/admin/pending` | GET | Pending payments |
| Failed | `/payment/admin/failed` | GET | Failed payments |
| Pending Refunds | `/payment/admin/refunds/pending` | GET | Refunds awaiting approval |
| Process Refund | `/payment/admin/{id}/refund/process` | POST | Approve & process refund |

---

## Expected Output

### Success Case
```
✓ Payment initiated: PAY_1704110400_ABC123
✓ Payment processed
✓ Payment status: success
✓ Retrieved 5 payments
✓ Payment verified
✓ Refund requested
✓ Retrieved refund status

Test Summary
================================================
Passed: 7
Failed: 0
Total:  7

All tests passed! ✓
```

### Failure Case
```
✗ Payment initiation failed
✗ Payment processing failed
✗ No payment ID available

Test Summary
================================================
Passed: 0
Failed: 3
Total:  3

Some tests failed.
```

---

## Troubleshooting

### Issue: "Connection refused"
**Cause:** Backend server not running  
**Solution:**
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Start backend if needed
cd backend
npm start
```

### Issue: "Unauthorized" error
**Cause:** Invalid or expired token  
**Solution:**
```bash
# Get new tokens
# See Configuration section above
```

### Issue: "Invalid JSON response"
**Cause:** Server returned non-JSON response  
**Solution:**
```bash
# Check server logs for errors
# Verify API endpoints exist
# Check database connection
```

### Issue: Payment not found
**Cause:** Using wrong payment ID or ID from different session  
**Solution:**
```bash
# Use the payment ID from current test run
# Don't reuse IDs from previous runs
```

### Issue: "jq: command not found" (Bash)
**Cause:** jq not installed  
**Solution:**
```bash
# Install jq
# macOS: brew install jq
# Ubuntu: sudo apt-get install jq
```

---

## Manual Testing with curl

### Quick Manual Test Flow

```bash
# 1. Set variables
TOKEN="your_consumer_token_here"
ORDER_ID="order_test_$(date +%s)"
BASE_URL="http://localhost:5000/api"

# 2. Initiate payment
INIT=$(curl -s -X POST $BASE_URL/payment/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$ORDER_ID\",\"paymentMethod\":\"card\",\"paymentGateway\":\"mock\"}")

PAY_ID=$(echo $INIT | jq -r '.data.payment.paymentId')
echo "Payment ID: $PAY_ID"

# 3. Process payment
curl -s -X POST $BASE_URL/payment/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"paymentId\":\"$PAY_ID\",\"orderId\":\"$ORDER_ID\",\"method\":\"card\",\"cardDetails\":{\"number\":\"4111111111111111\",\"expiry\":\"12/25\",\"cvv\":\"123\"}}" | jq '.'

# 4. Check status
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/payment/$PAY_ID | jq '.data.payment'

# 5. Get history
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/payment?page=1&limit=5" | jq '.data'
```

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: Payment API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Start backend
        run: |
          cd backend
          npm ci
          npm start &
          sleep 5
      
      - name: Run tests
        run: |
          chmod +x backend/test-payment-api.sh
          backend/test-payment-api.sh all
```

### Local Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
echo "Running payment tests..."
./backend/test-payment-api.sh all || exit 1
```

---

## Performance Benchmarking

### Bash Script Benchmark
```bash
# Run single test 10 times and measure
time for i in {1..10}; do
  ./test-payment-api.sh initiate > /dev/null
done

# Expected: ~5-10 seconds for 10 runs
# Average: 500-1000ms per test
```

### PowerShell Script Benchmark
```powershell
# Run single test 10 times and measure
Measure-Command {
    for ($i = 0; $i -lt 10; $i++) {
        & .\test-payment-api.ps1 -TestType initiate | Out-Null
    }
}

# Expected: ~5-10 seconds for 10 runs
# Average: 500-1000ms per test
```

---

## Test Data Reference

### Valid Test Card Numbers
```
Visa:        4111 1111 1111 1111
Mastercard:  5555 5555 5555 4444
American Express: 3782 822463 10005
Discover:    6011 1111 1111 1117
```

**For all test cards:**
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3-4 digits (e.g., 123)
- Gateway: Mock with 85% success rate

### Sample Order Data
```json
{
  "orderId": "order_test_1704110400",
  "consumerId": "consumer_123",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 2,
      "price": 250
    }
  ],
  "total": 500,
  "paymentStatus": "pending"
}
```

---

## Next Steps

1. **Configure Tokens** - Update test scripts with real tokens
2. **Run Initial Tests** - Execute `./test-payment-api.sh all`
3. **Verify Results** - Check all tests pass
4. **Setup CI/CD** - Automate testing in pipeline
5. **Monitor Dashboard** - Track payment metrics

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review backend logs
3. Verify configuration
4. Run with `-v` for verbose output

---

**Test Scripts Location:**
- Bash: `/backend/test-payment-api.sh`
- PowerShell: `/backend/test-payment-api.ps1`

**Documentation:** See [PAYMENT_MODULE_GUIDE.md](./PAYMENT_MODULE_GUIDE.md)

---

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for Testing ✅
