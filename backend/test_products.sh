#!/bin/bash

# Product Module Test Script for Linux/Mac
# This script tests all Product API endpoints
# Usage: bash test_products.sh

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5000/api/products"
FARMER_TOKEN="YOUR_FARMER_TOKEN_HERE"
CONSUMER_TOKEN="YOUR_CONSUMER_TOKEN_HERE"

echo -e "${BLUE}=== AgriDesk Product Module Test Suite ===${NC}\n"

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local token=$4
  local description=$5

  echo -e "${BLUE}➜ Testing: $description${NC}"
  echo -e "  Method: $method"
  echo -e "  Endpoint: $endpoint"
  
  if [ -n "$data" ]; then
    echo -e "  Data: $data\n"
    if [ -n "$token" ]; then
      curl -X "$method" "$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "$data"
    else
      curl -X "$method" "$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data"
    fi
  else
    if [ -n "$token" ]; then
      curl -X "$method" "$endpoint" \
        -H "Authorization: Bearer $token"
    else
      curl -X "$method" "$endpoint"
    fi
  fi
  
  echo -e "\n${GREEN}✓ Test completed${NC}\n"
  echo "-------------------------------------------"
  echo ""
}

# CONSUMER TESTS
echo -e "\n${BLUE}═══ CONSUMER ENDPOINTS (PUBLIC) ═══${NC}\n"

test_endpoint "GET" "$BASE_URL?page=1&limit=5" "" "" \
  "Browse all products with pagination"

test_endpoint "GET" "$BASE_URL?category=vegetables&minPrice=10&maxPrice=100" "" "" \
  "Filter by category and price range"

test_endpoint "GET" "$BASE_URL?city=Ludhiana&state=Punjab" "" "" \
  "Filter by location"

test_endpoint "GET" "$BASE_URL/category/vegetables?page=1&limit=5" "" "" \
  "Get products by category"

test_endpoint "POST" "$BASE_URL/search" '{
  "query": "tomato",
  "page": 1,
  "limit": 5
}' "" "Search for products"

test_endpoint "GET" "$BASE_URL/filter/price?minPrice=20&maxPrice=80&page=1" "" "" \
  "Filter by price range"

test_endpoint "GET" "$BASE_URL/filter/location?city=Ludhiana&state=Punjab&page=1" "" "" \
  "Filter by location"

test_endpoint "GET" "$BASE_URL/bestsellers?limit=5" "" "" \
  "Get best selling products"

test_endpoint "GET" "$BASE_URL/organic/certified?page=1&limit=5" "" "" \
  "Get organic certified products"

# Single product - Replace with actual product ID
PRODUCT_ID="YOUR_PRODUCT_ID_HERE"
test_endpoint "GET" "$BASE_URL/$PRODUCT_ID" "" "" \
  "Get single product details"

# Farmer profile - Replace with actual farmer ID
FARMER_ID="YOUR_FARMER_ID_HERE"
test_endpoint "GET" "$BASE_URL/farmer/$FARMER_ID?page=1&limit=5" "" "" \
  "Get farmer profile and products"

# FARMER TESTS
echo -e "\n${BLUE}═══ FARMER ENDPOINTS (PROTECTED) ═══${NC}\n"

test_endpoint "POST" "$BASE_URL" '{
  "name": "Premium Tomatoes",
  "description": "Fresh organic tomatoes from Punjab farm",
  "category": "vegetables",
  "price": 50,
  "discountedPrice": 40,
  "quantity": 100,
  "unit": "kg",
  "minOrderQuantity": 2,
  "organicCertified": true,
  "origin": "Ludhiana, Punjab",
  "harvestDate": "2024-01-15T00:00:00Z",
  "expiryDate": "2024-01-25T00:00:00Z",
  "shippingAvailable": true,
  "shippingCost": 50,
  "location": {
    "city": "Ludhiana",
    "state": "Punjab",
    "country": "India",
    "zipCode": "141008"
  }
}' "$FARMER_TOKEN" \
  "Create new product (Farmer)"

test_endpoint "GET" "$BASE_URL/my/products?page=1&limit=5&status=active" "" "$FARMER_TOKEN" \
  "Get my products (Farmer)"

test_endpoint "PUT" "$BASE_URL/$PRODUCT_ID" '{
  "name": "Premium Tomatoes - Updated",
  "price": 55,
  "discountedPrice": 45,
  "organicCertified": true
}' "$FARMER_TOKEN" \
  "Update product details (Farmer)"

test_endpoint "PATCH" "$BASE_URL/$PRODUCT_ID/quantity" '{
  "quantity": 50,
  "action": "add"
}' "$FARMER_TOKEN" \
  "Restock product (Add quantity)"

test_endpoint "PATCH" "$BASE_URL/$PRODUCT_ID/quantity" '{
  "quantity": 200,
  "action": "set"
}' "$FARMER_TOKEN" \
  "Set product quantity to specific value"

test_endpoint "PATCH" "$BASE_URL/$PRODUCT_ID/status" '{
  "isActive": false
}' "$FARMER_TOKEN" \
  "Deactivate product"

test_endpoint "PATCH" "$BASE_URL/$PRODUCT_ID/status" '{
  "isActive": true
}' "$FARMER_TOKEN" \
  "Reactivate product"

test_endpoint "DELETE" "$BASE_URL/$PRODUCT_ID" "" "$FARMER_TOKEN" \
  "Delete product (Farmer)"

# ERROR TEST CASES
echo -e "\n${BLUE}═══ ERROR HANDLING TESTS ═══${NC}\n"

test_endpoint "GET" "$BASE_URL/invalid_product_id" "" "" \
  "Test 404 - Invalid product ID"

test_endpoint "POST" "$BASE_URL" '{
  "name": "Incomplete Product"
}' "$FARMER_TOKEN" \
  "Test 400 - Missing required fields"

# Replace with actual farmer token that's not owned by the requester
test_endpoint "PUT" "$BASE_URL/$PRODUCT_ID" '{
  "price": 100
}' "$CONSUMER_TOKEN" \
  "Test 403 - Unauthorized product update"

echo -e "\n${GREEN}═══ Test Suite Completed ===${NC}\n"
echo "Notes:"
echo "1. Replace YOUR_FARMER_TOKEN_HERE with actual farmer JWT token"
echo "2. Replace YOUR_CONSUMER_TOKEN_HERE with actual consumer JWT token"
echo "3. Replace YOUR_PRODUCT_ID_HERE with actual product ID from database"
echo "4. Replace YOUR_FARMER_ID_HERE with actual farmer ID from database"
echo "5. Ensure MongoDB is running and connected"
echo "6. Ensure Node.js backend server is running on port 5000"
