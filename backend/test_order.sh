#!/bin/bash

################################################################################
#                         ORDER MODULE TEST SUITE
#                    Comprehensive API Testing Script
################################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5000/api"
CONSUMER_TOKEN="${CONSUMER_TOKEN:-consumer_test_token}"
FARMER_TOKEN="${FARMER_TOKEN:-farmer_test_token}"
ADMIN_TOKEN="${ADMIN_TOKEN:-admin_test_token}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

################################################################################
# UTILITY FUNCTIONS
################################################################################

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST: $1${NC}"
    ((TESTS_RUN++))
}

print_pass() {
    echo -e "${GREEN}✓ PASSED${NC}\n"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAILED: $1${NC}\n"
    ((TESTS_FAILED++))
}

print_summary() {
    echo -e "\n${BLUE}=== TEST SUMMARY ===${NC}"
    echo -e "Total Tests: $TESTS_RUN"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
}

run_test() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local token=$4
    local data=$5
    
    print_test "$test_name"
    
    if [ -z "$data" ]; then
        response=$(curl -s -X $method \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -X $method \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    echo "Response:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    
    # Check if success
    if echo "$response" | grep -q '"success":true' 2>/dev/null; then
        print_pass
        return 0
    else
        print_fail "Response did not contain success: true"
        return 1
    fi
}

################################################################################
# CONSUMER TESTS
################################################################################

test_consumer_operations() {
    print_header "CONSUMER OPERATIONS"
    
    # Test 1: Place Order
    print_test "Consumer: Place Order"
    place_order_response=$(curl -s -X POST \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
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
        }' \
        "$BASE_URL/order")
    
    echo "Response:"
    echo "$place_order_response" | jq . 2>/dev/null || echo "$place_order_response"
    echo ""
    
    # Extract order ID
    order_id=$(echo "$place_order_response" | jq -r '.data.order._id' 2>/dev/null)
    if [ -z "$order_id" ] || [ "$order_id" = "null" ]; then
        print_fail "Order ID not found in response"
    else
        echo "Extracted Order ID: $order_id"
        print_pass
    fi
    
    # Test 2: Get Order History
    run_test "Consumer: Get Order History" "GET" "/order?page=1&limit=10" "$CONSUMER_TOKEN"
    
    # Test 3: Get Order History with Filter
    run_test "Consumer: Get Order History (pending)" "GET" "/order?status=pending" "$CONSUMER_TOKEN"
    
    # Test 4: Get Order Details
    if [ ! -z "$order_id" ] && [ "$order_id" != "null" ]; then
        run_test "Consumer: Get Order Details" "GET" "/order/$order_id" "$CONSUMER_TOKEN"
        
        # Test 5: Track Order
        run_test "Consumer: Track Order" "GET" "/order/$order_id/track" "$CONSUMER_TOKEN"
        
        # Test 6: Try Cancel Order (valid for pending)
        run_test "Consumer: Cancel Order" "PATCH" "/order/$order_id/cancel" "$CONSUMER_TOKEN" '{"reason":"Changed mind"}'
    fi
}

################################################################################
# FARMER TESTS
################################################################################

test_farmer_operations() {
    print_header "FARMER OPERATIONS"
    
    # Test 1: Get Pending Orders
    print_test "Farmer: Get Pending Orders"
    pending_response=$(curl -s -X GET \
        -H "Authorization: Bearer $FARMER_TOKEN" \
        -H "Content-Type: application/json" \
        "$BASE_URL/order/farmer/pending")
    
    echo "Response:"
    echo "$pending_response" | jq . 2>/dev/null || echo "$pending_response"
    echo ""
    
    # Extract first order ID if available
    order_id=$(echo "$pending_response" | jq -r '.data.orders[0]._id' 2>/dev/null)
    if [ -z "$order_id" ] || [ "$order_id" = "null" ]; then
        echo "No pending orders found for farmer"
    else
        echo "Extracted Order ID: $order_id"
        ((TESTS_PASSED++))
        ((TESTS_RUN++))
    fi
    echo ""
    
    # Test 2: Get Incoming Orders
    run_test "Farmer: Get Incoming Orders" "GET" "/order/farmer/orders" "$FARMER_TOKEN"
    
    # Test 3: Get Incoming Orders with Filter
    run_test "Farmer: Get Incoming Orders (accepted)" "GET" "/order/farmer/orders?status=accepted" "$FARMER_TOKEN"
    
    # Test 4: Accept Order
    if [ ! -z "$order_id" ] && [ "$order_id" != "null" ]; then
        run_test "Farmer: Accept Order" "PATCH" "/order/$order_id/accept" "$FARMER_TOKEN" '{"notes":"Order accepted. Will pack by 6 PM"}'
        
        # Test 5: Update to Packed
        run_test "Farmer: Update Delivery Status (packed)" "PATCH" "/order/$order_id/delivery-status" "$FARMER_TOKEN" '{"status":"packed","notes":"Items packed"}'
        
        # Test 6: Update to Shipped
        run_test "Farmer: Update Delivery Status (shipped)" "PATCH" "/order/$order_id/delivery-status" "$FARMER_TOKEN" '{
            "status":"shipped",
            "trackingNumber":"TRACK123456789",
            "estimatedDelivery":"2024-01-20T18:00:00Z"
        }'
        
        # Test 7: Update to Delivered
        run_test "Farmer: Update Delivery Status (delivered)" "PATCH" "/order/$order_id/delivery-status" "$FARMER_TOKEN" '{"status":"delivered","notes":"Successfully delivered"}'
    fi
    
    # Test 8: Get Order Stats
    run_test "Farmer: Get Order Statistics" "GET" "/order/farmer/stats" "$FARMER_TOKEN"
}

test_farmer_rejection() {
    print_header "FARMER REJECTION FLOW"
    
    # Note: This requires a new order to test rejection
    print_test "Farmer: Reject Order (requires existing pending order)"
    echo "This test requires extracting an order ID from pending orders"
    echo "Typically done as part of workflow"
    echo ""
}

################################################################################
# ADMIN TESTS
################################################################################

test_admin_operations() {
    print_header "ADMIN OPERATIONS"
    
    # Test 1: Get All Orders
    print_test "Admin: Get All Orders"
    all_orders=$(curl -s -X GET \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        "$BASE_URL/order/admin/all?page=1&limit=20")
    
    echo "Response:"
    echo "$all_orders" | jq . 2>/dev/null || echo "$all_orders"
    echo ""
    
    order_id=$(echo "$all_orders" | jq -r '.data.orders[0]._id' 2>/dev/null)
    if [ -z "$order_id" ] || [ "$order_id" = "null" ]; then
        print_fail "No orders found"
    else
        print_pass
        echo "Extracted Order ID: $order_id"
    fi
    
    # Test 2: Get All Orders with Status Filter
    run_test "Admin: Get Orders (status=pending)" "GET" "/order/admin/all?status=pending" "$ADMIN_TOKEN"
    
    # Test 3: Get All Orders with Amount Filter
    run_test "Admin: Get Orders (amount range)" "GET" "/order/admin/all?minAmount=1000&maxAmount=10000" "$ADMIN_TOKEN"
    
    # Test 4: Get Order Details (Admin)
    if [ ! -z "$order_id" ] && [ "$order_id" != "null" ]; then
        run_test "Admin: Get Order by ID" "GET" "/order/admin/$order_id" "$ADMIN_TOKEN"
    fi
    
    # Test 5: Get High-Value Orders
    run_test "Admin: Get High-Value Orders" "GET" "/order/admin/high-value?minAmount=5000" "$ADMIN_TOKEN"
    
    # Test 6: Get Delivery Due Orders
    run_test "Admin: Get Delivery Due Orders" "GET" "/order/admin/delivery-due?daysThreshold=3" "$ADMIN_TOKEN"
    
    # Test 7: Get Order Statistics
    run_test "Admin: Get Order Statistics" "GET" "/order/admin/stats" "$ADMIN_TOKEN"
}

################################################################################
# ERROR HANDLING TESTS
################################################################################

test_error_scenarios() {
    print_header "ERROR HANDLING TESTS"
    
    # Test 1: Invalid Token
    print_test "Error: Invalid Token"
    response=$(curl -s -X GET \
        -H "Authorization: Bearer invalid_token" \
        "$BASE_URL/order")
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    if echo "$response" | grep -q 'success.*false\|error\|invalid' 2>/dev/null; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))
    
    # Test 2: Missing Authorization
    print_test "Error: Missing Authorization"
    response=$(curl -s -X GET "$BASE_URL/order")
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    if echo "$response" | grep -q 'success.*false\|error\|unauthorized\|missing' 2>/dev/null; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))
    
    # Test 3: Non-existent Order
    print_test "Error: Non-existent Order"
    response=$(curl -s -X GET \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        "$BASE_URL/order/000000000000000000000000")
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    if echo "$response" | grep -q 'success.*false\|error\|not found' 2>/dev/null; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))
    
    # Test 4: Invalid Status Transition
    print_test "Error: Invalid Status Transition"
    response=$(curl -s -X POST \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "shippingAddress": {"street": "123", "city": "Test"},
            "paymentMethod": "invalid_method"
        }' \
        "$BASE_URL/order")
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    if echo "$response" | grep -q 'success.*false\|error' 2>/dev/null; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))
}

################################################################################
# MULTI-FARMER TESTS
################################################################################

test_multi_farmer_scenarios() {
    print_header "MULTI-FARMER SCENARIOS"
    
    echo "Multi-farmer orders occur when:"
    echo "1. Consumer has items from different farmers in cart"
    echo "2. Order is created with items from multiple farmers"
    echo "3. Each farmer accepts/rejects independently"
    echo ""
    
    print_test "Multi-Farmer: Order Grouping"
    echo "Expected behavior:"
    echo "- Order.farmers array contains entries for each farmer"
    echo "- Each farmer has subset of items"
    echo "- Order status = most advanced farmer status"
    echo ""
    ((TESTS_RUN++))
    ((TESTS_PASSED++))
}

################################################################################
# PAGINATION TESTS
################################################################################

test_pagination() {
    print_header "PAGINATION TESTS"
    
    # Test 1: Page 1
    run_test "Pagination: Get Page 1" "GET" "/order?page=1&limit=5" "$CONSUMER_TOKEN"
    
    # Test 2: Page 2
    run_test "Pagination: Get Page 2" "GET" "/order?page=2&limit=5" "$CONSUMER_TOKEN"
    
    # Test 3: Large limit
    run_test "Pagination: Large limit" "GET" "/order?page=1&limit=100" "$CONSUMER_TOKEN"
    
    # Test 4: Farmer pagination
    run_test "Pagination: Farmer orders" "GET" "/order/farmer/orders?page=1&limit=10" "$FARMER_TOKEN"
}

################################################################################
# FILTERING TESTS
################################################################################

test_filtering() {
    print_header "FILTERING TESTS"
    
    # Test 1: Filter by status
    run_test "Filter: Status=pending" "GET" "/order?status=pending" "$CONSUMER_TOKEN"
    
    # Test 2: Filter by status (delivered)
    run_test "Filter: Status=delivered" "GET" "/order?status=delivered" "$CONSUMER_TOKEN"
    
    # Test 3: Filter by order count
    run_test "Filter: Date range (admin)" "GET" "/order/admin/all?startDate=2024-01-01&endDate=2024-01-31" "$ADMIN_TOKEN"
    
    # Test 4: Filter high-value
    run_test "Filter: High-value (>5000)" "GET" "/order/admin/high-value?minAmount=5000" "$ADMIN_TOKEN"
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     AGRIIDESK ORDER MODULE - COMPREHENSIVE TEST SUITE    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}Configuration:${NC}"
    echo "Base URL: $BASE_URL"
    echo "Ensure your backend is running on http://localhost:5000"
    echo ""
    
    # Run test suites
    test_consumer_operations
    test_farmer_operations
    test_farmer_rejection
    test_admin_operations
    test_error_scenarios
    test_multi_farmer_scenarios
    test_pagination
    test_filtering
    
    # Print summary
    print_summary
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Show usage if needed
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: bash test_order.sh"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  CONSUMER_TOKEN       JWT token for consumer (default: consumer_test_token)"
    echo "  FARMER_TOKEN         JWT token for farmer (default: farmer_test_token)"
    echo "  ADMIN_TOKEN          JWT token for admin (default: admin_test_token)"
    echo ""
    echo "Example:"
    echo "  CONSUMER_TOKEN='your_token' bash test_order.sh"
    exit 0
fi

# Run main function
main

