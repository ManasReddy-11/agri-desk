#!/bin/bash

################################################################################
# Payment Module API Test Script
# Purpose: Test all payment endpoints with real API calls
# Requirements: curl, jq, base64, md5sum
# Usage: ./test-payment-api.sh [test_name]
################################################################################

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

BASE_URL="http://localhost:5000/api"
CONSUMER_TOKEN="SAMPLE_CONSUMER_TOKEN_12345"  # Replace with real token
ADMIN_TOKEN="SAMPLE_ADMIN_TOKEN_12345"        # Replace with real token

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASS=0
FAIL=0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Print colored output
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASS++))
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAIL++))
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_section() {
    echo -e "\n${YELLOW}$1${NC}"
    echo "────────────────────────────────────────"
}

# Make API request and capture response
api_request() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint"
    fi
}

# Validate JSON response
validate_json() {
    if echo "$1" | jq empty 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Extract field from JSON
get_field() {
    echo "$1" | jq -r "$2"
}

# ============================================================================
# SETUP TEST DATA
# ============================================================================

setup_test_data() {
    log_section "Setting up test data..."
    
    # Create test order first (you need to have order API running)
    TEST_ORDER_ID="order_test_$(date +%s)"
    TEST_PAYMENT_ID=""
    TEST_CONSUMER_ID="consumer_123"
    
    log_info "Test Order ID: $TEST_ORDER_ID"
    log_info "Test Consumer ID: $TEST_CONSUMER_ID"
}

# ============================================================================
# CONSUMER TESTS
# ============================================================================

test_consumer_initiate_payment() {
    log_section "TEST: Consumer - Initiate Payment"
    
    local request_data=$(cat <<EOF
{
    "orderId": "$TEST_ORDER_ID",
    "paymentMethod": "card",
    "paymentGateway": "mock",
    "metadata": {
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0 Test"
    }
}
EOF
)
    
    local response=$(api_request POST "/payment/initiate" "$CONSUMER_TOKEN" "$request_data")
    
    if validate_json "$response"; then
        local success=$(get_field "$response" '.success')
        if [ "$success" = "true" ]; then
            TEST_PAYMENT_ID=$(get_field "$response" '.data.payment.paymentId')
            log_success "Payment initiated: $TEST_PAYMENT_ID"
            echo "$response" | jq '.'
        else
            log_error "Payment initiation failed"
            echo "$response" | jq '.'
        fi
    else
        log_error "Invalid JSON response"
        echo "$response"
    fi
}

test_consumer_process_payment() {
    log_section "TEST: Consumer - Process Payment"
    
    if [ -z "$TEST_PAYMENT_ID" ]; then
        log_error "No payment ID available. Run initiate payment first."
        return
    fi
    
    local request_data=$(cat <<EOF
{
    "paymentId": "$TEST_PAYMENT_ID",
    "orderId": "$TEST_ORDER_ID",
    "method": "card",
    "cardDetails": {
        "number": "4111111111111111",
        "expiry": "12/25",
        "cvv": "123"
    }
}
EOF
)
    
    local response=$(api_request POST "/payment/process" "$CONSUMER_TOKEN" "$request_data")
    
    if validate_json "$response"; then
        log_success "Payment processed"
        echo "$response" | jq '.'
    else
        log_error "Payment processing failed"
        echo "$response"
    fi
}

test_consumer_get_payment_status() {
    log_section "TEST: Consumer - Get Payment Status"
    
    if [ -z "$TEST_PAYMENT_ID" ]; then
        log_error "No payment ID available."
        return
    fi
    
    local response=$(api_request GET "/payment/$TEST_PAYMENT_ID" "$CONSUMER_TOKEN")
    
    if validate_json "$response"; then
        local status=$(get_field "$response" '.data.payment.status')
        log_success "Payment status: $status"
        echo "$response" | jq '.data.payment | {paymentId, status, amount, createdAt}'
    else
        log_error "Failed to get payment status"
        echo "$response"
    fi
}

test_consumer_payment_history() {
    log_section "TEST: Consumer - Payment History"
    
    local response=$(api_request GET "/payment?page=1&limit=5&status=success" "$CONSUMER_TOKEN")
    
    if validate_json "$response"; then
        local count=$(get_field "$response" '.data.payments | length')
        log_success "Retrieved $count payments"
        echo "$response" | jq '.data.payments[] | {paymentId, status, amount}'
    else
        log_error "Failed to retrieve payment history"
        echo "$response"
    fi
}

test_consumer_verify_payment() {
    log_section "TEST: Consumer - Verify Payment"
    
    if [ -z "$TEST_PAYMENT_ID" ]; then
        log_error "No payment ID available."
        return
    fi
    
    local request_data=$(cat <<EOF
{
    "paymentId": "$TEST_PAYMENT_ID",
    "transactionId": "pay_$(date +%s)_txn123",
    "orderId": "$TEST_ORDER_ID"
}
EOF
)
    
    local response=$(api_request POST "/payment/verify" "$CONSUMER_TOKEN" "$request_data")
    
    if validate_json "$response"; then
        log_success "Payment verified"
        echo "$response" | jq '.data | {verified, status}'
    else
        log_error "Verification failed"
        echo "$response"
    fi
}

test_consumer_retry_payment() {
    log_section "TEST: Consumer - Retry Failed Payment"
    
    # This would need a failed payment ID
    local failed_payment_id="PAY_failed_test_$(date +%s)"
    
    local request_data='{"method": "upi"}'
    
    local response=$(api_request POST "/payment/$failed_payment_id/retry" "$CONSUMER_TOKEN" "$request_data")
    
    if validate_json "$response"; then
        log_success "Retry initiated"
        echo "$response" | jq '.'
    else
        log_error "Retry failed"
        echo "$response"
    fi
}

test_consumer_initiate_refund() {
    log_section "TEST: Consumer - Initiate Refund"
    
    if [ -z "$TEST_PAYMENT_ID" ]; then
        log_error "No payment ID available."
        return
    fi
    
    local request_data=$(cat <<EOF
{
    "amount": 250,
    "reason": "Partial refund - test"
}
EOF
)
    
    local response=$(api_request POST "/payment/$TEST_PAYMENT_ID/refund" "$CONSUMER_TOKEN" "$request_data")
    
    if validate_json "$response"; then
        log_success "Refund requested"
        echo "$response" | jq '.data'
    else
        log_error "Refund request failed"
        echo "$response"
    fi
}

test_consumer_refund_status() {
    log_section "TEST: Consumer - Get Refund Status"
    
    if [ -z "$TEST_PAYMENT_ID" ]; then
        log_error "No payment ID available."
        return
    fi
    
    local response=$(api_request GET "/payment/$TEST_PAYMENT_ID/refund/status" "$CONSUMER_TOKEN")
    
    if validate_json "$response"; then
        log_success "Retrieved refund status"
        echo "$response" | jq '.data.refund | {status, amount, reason, createdAt}'
    else
        log_error "Failed to get refund status"
        echo "$response"
    fi
}

# ============================================================================
# ADMIN TESTS
# ============================================================================

test_admin_view_all_payments() {
    log_section "TEST: Admin - View All Payments"
    
    local response=$(api_request GET "/payment/admin/all?page=1&limit=10&status=success" "$ADMIN_TOKEN")
    
    if validate_json "$response"; then
        local count=$(get_field "$response" '.data.payments | length')
        log_success "Retrieved $count payments"
        echo "$response" | jq '.data | {total, payments: (.payments | length)}'
    else
        log_error "Failed to retrieve payments"
        echo "$response"
    fi
}

test_admin_payment_statistics() {
    log_section "TEST: Admin - Payment Statistics"
    
    local response=$(api_request GET "/payment/admin/stats" "$ADMIN_TOKEN")
    
    if validate_json "$response"; then
        log_success "Retrieved statistics"
        echo "$response" | jq '.data.stats | {totalPayments, successCount, failureCount, totalAmount}'
    else
        log_error "Failed to retrieve statistics"
        echo "$response"
    fi
}

test_admin_revenue_analytics() {
    log_section "TEST: Admin - Revenue Analytics"
    
    local response=$(api_request GET "/payment/admin/revenue?days=7" "$ADMIN_TOKEN")
    
    if validate_json "$response"; then
        log_success "Retrieved revenue data"
        echo "$response" | jq '.data.revenue'
    else
        log_error "Failed to retrieve revenue"
        echo "$response"
    fi
}

test_admin_pending_payments() {
    log_section "TEST: Admin - Pending Payments"
    
    local response=$(api_request GET "/payment/admin/pending" "$ADMIN_TOKEN")
    
    if validate_json "$response"; then
        local count=$(get_field "$response" '.data.pendingPayments | length')
        log_success "Retrieved $count pending payments"
        echo "$response" | jq '.data.pendingPayments | length'
    else
        log_error "Failed to retrieve pending payments"
        echo "$response"
    fi
}

test_admin_failed_payments() {
    log_section "TEST: Admin - Failed Payments (Last 24H)"
    
    local response=$(api_request GET "/payment/admin/failed?hours=24" "$ADMIN_TOKEN")
    
    if validate_json "$response"; then
        local count=$(get_field "$response" '.data.failedPayments | length')
        log_success "Retrieved $count failed payments"
        echo "$response" | jq '.data.failedPayments | length'
    else
        log_error "Failed to retrieve failed payments"
        echo "$response"
    fi
}

test_admin_pending_refunds() {
    log_section "TEST: Admin - Pending Refunds"
    
    local response=$(api_request GET "/payment/admin/refunds/pending" "$ADMIN_TOKEN")
    
    if validate_json "$response"; then
        local count=$(get_field "$response" '.data.pendingRefunds | length')
        log_success "Retrieved $count pending refunds"
        echo "$response" | jq '.data.pendingRefunds | length'
    else
        log_error "Failed to retrieve pending refunds"
        echo "$response"
    fi
}

test_admin_process_refund() {
    log_section "TEST: Admin - Process Refund"
    
    if [ -z "$TEST_PAYMENT_ID" ]; then
        log_error "No payment ID available."
        return
    fi
    
    local response=$(api_request POST "/payment/admin/$TEST_PAYMENT_ID/refund/process" "$ADMIN_TOKEN")
    
    if validate_json "$response"; then
        log_success "Refund processed"
        echo "$response" | jq '.data'
    else
        log_error "Refund processing failed"
        echo "$response"
    fi
}

# ============================================================================
# TEST SUITES
# ============================================================================

run_all_consumer_tests() {
    log_section "Running All Consumer Tests"
    test_consumer_initiate_payment
    test_consumer_process_payment
    test_consumer_get_payment_status
    test_consumer_payment_history
    test_consumer_verify_payment
    test_consumer_initiate_refund
    test_consumer_refund_status
}

run_all_admin_tests() {
    log_section "Running All Admin Tests"
    test_admin_view_all_payments
    test_admin_payment_statistics
    test_admin_revenue_analytics
    test_admin_pending_payments
    test_admin_failed_payments
    test_admin_pending_refunds
}

run_all_tests() {
    setup_test_data
    run_all_consumer_tests
    run_all_admin_tests
}

# ============================================================================
# MAIN
# ============================================================================

print_usage() {
    echo "Usage: ./test-payment-api.sh [option]"
    echo ""
    echo "Options:"
    echo "  all              Run all tests"
    echo "  consumer         Run consumer tests only"
    echo "  admin            Run admin tests only"
    echo "  initiate         Test payment initiation"
    echo "  process          Test payment processing"
    echo "  status           Test payment status"
    echo "  history          Test payment history"
    echo "  verify           Test payment verification"
    echo "  refund           Test refund request"
    echo "  stats            Test admin statistics"
    echo "  revenue          Test revenue analytics"
    echo "  help             Show this help message"
    echo ""
}

print_summary() {
    echo -e "\n${YELLOW}Test Summary${NC}"
    echo "────────────────────────────────────────"
    echo -e "Passed: ${GREEN}$PASS${NC}"
    echo -e "Failed: ${RED}$FAIL${NC}"
    local total=$((PASS + FAIL))
    echo "Total:  $total"
    
    if [ $FAIL -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed! ✓${NC}"
        exit 0
    else
        echo -e "\n${RED}Some tests failed.${NC}"
        exit 1
    fi
}

# Parse command line arguments
case "${1:-all}" in
    all)
        run_all_tests
        ;;
    consumer)
        setup_test_data
        run_all_consumer_tests
        ;;
    admin)
        setup_test_data
        run_all_admin_tests
        ;;
    initiate)
        setup_test_data
        test_consumer_initiate_payment
        ;;
    process)
        setup_test_data
        test_consumer_initiate_payment
        test_consumer_process_payment
        ;;
    status)
        setup_test_data
        test_consumer_initiate_payment
        test_consumer_get_payment_status
        ;;
    history)
        setup_test_data
        test_consumer_payment_history
        ;;
    verify)
        setup_test_data
        test_consumer_initiate_payment
        test_consumer_verify_payment
        ;;
    refund)
        setup_test_data
        test_consumer_initiate_payment
        test_consumer_initiate_refund
        ;;
    stats)
        setup_test_data
        test_admin_payment_statistics
        ;;
    revenue)
        setup_test_data
        test_admin_revenue_analytics
        ;;
    help|--help|-h)
        print_usage
        exit 0
        ;;
    *)
        echo "Unknown option: $1"
        print_usage
        exit 1
        ;;
esac

print_summary
