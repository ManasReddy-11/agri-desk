#!/bin/bash

# Cart Module Test Suite (Bash)
# Tests all cart endpoints and operations
# Usage: bash test_cart.sh

BASE_URL="http://localhost:5000/api"
CONSUMER_TOKEN=""
ADMIN_TOKEN=""
PRODUCT_ID_1=""
PRODUCT_ID_2=""
PRODUCT_ID_3=""
FARMER_ID=""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for tests
TESTS_PASSED=0
TESTS_FAILED=0

# ==================== HELPER FUNCTIONS ====================

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_separator() {
    echo "==========================================================="
}

# Check if required fields exist in JSON
check_field() {
    local json="$1"
    local field="$2"
    echo "$json" | grep -q "\"$field\"" && return 0 || return 1
}

# Extract value from JSON
extract_value() {
    local json="$1"
    local field="$2"
    echo "$json" | grep -o "\"$field\":[^,}]*" | cut -d':' -f2 | sed 's/^"\(.*\)"$/\1/'
}

# ==================== SETUP FUNCTIONS ====================

setup_auth_tokens() {
    log_separator
    log_info "Setting up authentication tokens..."
    
    # Assuming you have consumer and admin users created
    # Adjust credentials as needed
    
    # Register/Login Consumer
    CONSUMER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "consumer@agritest.com",
            "password": "TestPassword123!"
        }')
    
    CONSUMER_TOKEN=$(echo "$CONSUMER_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$CONSUMER_TOKEN" ]; then
        # Try to register first
        curl -s -X POST "$BASE_URL/auth/register" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "Test Consumer",
                "email": "consumer@agritest.com",
                "password": "TestPassword123!",
                "role": "consumer",
                "phone": "9999999999"
            }' > /dev/null
        
        # Login again
        CONSUMER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d '{
                "email": "consumer@agritest.com",
                "password": "TestPassword123!"
            }')
        
        CONSUMER_TOKEN=$(echo "$CONSUMER_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    fi
    
    if [ -n "$CONSUMER_TOKEN" ]; then
        log_success "Consumer token obtained"
    else
        log_error "Failed to obtain consumer token"
        return 1
    fi
    
    # Setup Admin Token (similar process)
    ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@agritest.com",
            "password": "AdminPassword123!"
        }')
    
    ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$ADMIN_TOKEN" ]; then
        log_success "Admin token obtained"
    else
        log_error "Failed to obtain admin token"
    fi
    
    return 0
}

setup_test_products() {
    log_separator
    log_info "Setting up test products..."
    
    # Create test products (as farmer)
    FARMER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "farmer@agritest.com",
            "password": "FarmerPass123!"
        }')
    
    FARMER_TOKEN=$(echo "$FARMER_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    FARMER_ID=$(echo "$FARMER_LOGIN" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -z "$FARMER_TOKEN" ]; then
        # Register farmer first
        curl -s -X POST "$BASE_URL/auth/register" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "Test Farmer",
                "email": "farmer@agritest.com",
                "password": "FarmerPass123!",
                "role": "farmer",
                "phone": "8888888888"
            }' > /dev/null
        
        FARMER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d '{
                "email": "farmer@agritest.com",
                "password": "FarmerPass123!"
            }')
        
        FARMER_TOKEN=$(echo "$FARMER_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        FARMER_ID=$(echo "$FARMER_LOGIN" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
    
    # Create Product 1
    PRODUCT_1=$(curl -s -X POST "$BASE_URL/products" \
        -H "Authorization: Bearer $FARMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Tomatoes",
            "description": "Fresh tomatoes for testing",
            "price": 50,
            "category": "vegetables",
            "quantity": 100,
            "unit": "kg",
            "isActive": true,
            "minOrderQuantity": 1
        }')
    
    PRODUCT_ID_1=$(echo "$PRODUCT_1" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -n "$PRODUCT_ID_1" ]; then
        log_success "Test Product 1 created: $PRODUCT_ID_1"
    else
        log_error "Failed to create test product 1"
    fi
    
    # Create Product 2
    PRODUCT_2=$(curl -s -X POST "$BASE_URL/products" \
        -H "Authorization: Bearer $FARMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Onions",
            "description": "Fresh onions",
            "price": 30,
            "discountedPrice": 25,
            "category": "vegetables",
            "quantity": 50,
            "unit": "kg",
            "isActive": true,
            "minOrderQuantity": 1
        }')
    
    PRODUCT_ID_2=$(echo "$PRODUCT_2" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -n "$PRODUCT_ID_2" ]; then
        log_success "Test Product 2 created: $PRODUCT_ID_2"
    else
        log_error "Failed to create test product 2"
    fi
    
    # Create Product 3 (out of stock)
    PRODUCT_3=$(curl -s -X POST "$BASE_URL/products" \
        -H "Authorization: Bearer $FARMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Inactive",
            "description": "Inactive product",
            "price": 40,
            "category": "vegetables",
            "quantity": 0,
            "unit": "kg",
            "isActive": false,
            "minOrderQuantity": 1
        }')
    
    PRODUCT_ID_3=$(echo "$PRODUCT_3" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -n "$PRODUCT_ID_3" ]; then
        log_success "Test Product 3 created (inactive): $PRODUCT_ID_3"
    else
        log_error "Failed to create test product 3"
    fi
}

# ==================== CART TESTS ====================

test_add_to_cart() {
    log_test "Test: Add product to cart"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/cart" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"productId\": \"$PRODUCT_ID_1\",
            \"quantity\": 2
        }")
    
    if echo "$RESPONSE" | grep -q "successfully\|added"; then
        log_success "Product added to cart"
    else
        log_error "Failed to add product to cart"
        echo "$RESPONSE"
    fi
}

test_get_cart() {
    log_test "Test: Get cart"
    
    RESPONSE=$(curl -s -H "Authorization: Bearer $CONSUMER_TOKEN" \
        "$BASE_URL/cart")
    
    if echo "$RESPONSE" | grep -q "\"success\":true"; then
        log_success "Cart retrieved successfully"
    else
        log_error "Failed to retrieve cart"
        echo "$RESPONSE"
    fi
}

test_get_cart_summary() {
    log_test "Test: Get cart summary"
    
    RESPONSE=$(curl -s -H "Authorization: Bearer $CONSUMER_TOKEN" \
        "$BASE_URL/cart/summary")
    
    if echo "$RESPONSE" | grep -q "\"itemCount\""; then
        log_success "Cart summary retrieved"
    else
        log_error "Failed to get cart summary"
        echo "$RESPONSE"
    fi
}

test_add_second_product() {
    log_test "Test: Add second product to cart"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/cart" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"productId\": \"$PRODUCT_ID_2\",
            \"quantity\": 1
        }")
    
    if echo "$RESPONSE" | grep -q "successfully\|added"; then
        log_success "Second product added"
    else
        log_error "Failed to add second product"
        echo "$RESPONSE"
    fi
}

test_update_item_quantity() {
    log_test "Test: Update item quantity"
    
    RESPONSE=$(curl -s -X PATCH "$BASE_URL/cart/item/quantity" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"productId\": \"$PRODUCT_ID_1\",
            \"quantity\": 5
        }")
    
    if echo "$RESPONSE" | grep -q "updated"; then
        log_success "Item quantity updated"
    else
        log_error "Failed to update quantity"
        echo "$RESPONSE"
    fi
}

test_remove_item_from_cart() {
    log_test "Test: Remove item from cart"
    
    RESPONSE=$(curl -s -X DELETE "$BASE_URL/cart/item" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"productId\": \"$PRODUCT_ID_2\"}")
    
    if echo "$RESPONSE" | grep -q "removed"; then
        log_success "Item removed from cart"
    else
        log_error "Failed to remove item"
        echo "$RESPONSE"
    fi
}

test_apply_coupon() {
    log_test "Test: Apply coupon (percentage)"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/cart/coupon" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "code": "DISCOUNT20",
            "discountPercentage": 20
        }')
    
    if echo "$RESPONSE" | grep -q "applied"; then
        log_success "Coupon applied successfully"
    else
        log_error "Failed to apply coupon"
        echo "$RESPONSE"
    fi
}

test_apply_fixed_coupon() {
    log_test "Test: Apply coupon (fixed amount)"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/cart/coupon" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "code": "SAVE50",
            "discountAmount": 50
        }')
    
    if echo "$RESPONSE" | grep -q "applied\|coupon"; then
        log_success "Fixed coupon applied"
    else
        log_error "Failed to apply fixed coupon"
        echo "$RESPONSE"
    fi
}

test_remove_coupon() {
    log_test "Test: Remove coupon"
    
    RESPONSE=$(curl -s -X DELETE "$BASE_URL/cart/coupon" \
        -H "Authorization: Bearer $CONSUMER_TOKEN")
    
    if echo "$RESPONSE" | grep -q "removed\|success"; then
        log_success "Coupon removed"
    else
        log_error "Failed to remove coupon"
        echo "$RESPONSE"
    fi
}

test_update_shipping_cost() {
    log_test "Test: Update shipping cost"
    
    RESPONSE=$(curl -s -X PATCH "$BASE_URL/cart/shipping" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"shippingCost": 150}')
    
    if echo "$RESPONSE" | grep -q "updated\|success"; then
        log_success "Shipping cost updated"
    else
        log_error "Failed to update shipping"
        echo "$RESPONSE"
    fi
}

test_validate_cart() {
    log_test "Test: Validate cart items"
    
    RESPONSE=$(curl -s -H "Authorization: Bearer $CONSUMER_TOKEN" \
        "$BASE_URL/cart/validation")
    
    if echo "$RESPONSE" | grep -q "available\|success"; then
        log_success "Cart items validated"
    else
        log_error "Failed to validate cart"
        echo "$RESPONSE"
    fi
}

test_grouped_by_farmer() {
    log_test "Test: Get cart grouped by farmer"
    
    RESPONSE=$(curl -s -H "Authorization: Bearer $CONSUMER_TOKEN" \
        "$BASE_URL/cart/grouped")
    
    if echo "$RESPONSE" | grep -q "farmer\|success"; then
        log_success "Cart grouped by farmer"
    else
        log_error "Failed to group by farmer"
        echo "$RESPONSE"
    fi
}

test_clear_cart() {
    log_test "Test: Clear entire cart"
    
    RESPONSE=$(curl -s -X DELETE "$BASE_URL/cart" \
        -H "Authorization: Bearer $CONSUMER_TOKEN")
    
    if echo "$RESPONSE" | grep -q "cleared\|success"; then
        log_success "Cart cleared"
    else
        log_error "Failed to clear cart"
        echo "$RESPONSE"
    fi
}

# ==================== ERROR HANDLING TESTS ====================

test_add_invalid_product() {
    log_test "Test: Add invalid product ID"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/cart" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "productId": "invalid_id",
            "quantity": 1
        }')
    
    if echo "$RESPONSE" | grep -q "404\|not found"; then
        log_success "Invalid product properly rejected"
    else
        log_error "Invalid product not properly handled"
    fi
}

test_add_zero_quantity() {
    log_test "Test: Add product with zero quantity"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/cart" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"productId\": \"$PRODUCT_ID_1\",
            \"quantity\": 0
        }")
    
    if echo "$RESPONSE" | grep -q "400\|Invalid"; then
        log_success "Zero quantity properly rejected"
    else
        log_error "Zero quantity not properly handled"
    fi
}

test_add_negative_quantity() {
    log_test "Test: Add product with negative quantity"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/cart" \
        -H "Authorization: Bearer $CONSUMER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"productId\": \"$PRODUCT_ID_1\",
            \"quantity\": -5
        }")
    
    if echo "$RESPONSE" | grep -q "400\|Invalid"; then
        log_success "Negative quantity properly rejected"
    else
        log_error "Negative quantity not properly handled"
    fi
}

test_missing_token() {
    log_test "Test: Access cart without token"
    
    RESPONSE=$(curl -s -H "Authorization: Bearer invalid_token" \
        "$BASE_URL/cart")
    
    if echo "$RESPONSE" | grep -q "401\|Unauthorized"; then
        log_success "Unauthorized access properly blocked"
    else
        log_error "Unauthorized access not properly blocked"
    fi
}

# ==================== MAIN TEST EXECUTION ====================

main() {
    clear
    log_separator
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}       AGRI DESK CART MODULE TEST SUITE (BASH)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    log_separator
    
    # Check if server is running
    if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        log_error "Server not running at $BASE_URL"
        exit 1
    fi
    
    log_success "Server is running"
    
    # Setup
    setup_auth_tokens || exit 1
    setup_test_products || exit 1
    
    # Cart Operations Tests
    log_separator
    log_info "CART OPERATIONS TESTS"
    log_separator
    
    test_add_to_cart
    test_get_cart
    test_get_cart_summary
    test_add_second_product
    test_update_item_quantity
    test_grouped_by_farmer
    test_validate_cart
    test_apply_coupon
    test_remove_coupon
    test_apply_fixed_coupon
    test_update_shipping_cost
    test_remove_item_from_cart
    test_clear_cart
    
    # Error Handling Tests
    log_separator
    log_info "ERROR HANDLING TESTS"
    log_separator
    
    test_add_invalid_product
    test_add_zero_quantity
    test_add_negative_quantity
    test_missing_token
    
    # Summary
    log_separator
    log_separator
    echo -e "${BLUE}TEST SUMMARY${NC}"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    log_separator
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed!${NC}"
        exit 1
    fi
}

# Run main function
main

