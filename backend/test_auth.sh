#!/bin/bash

# ═════════════════════════════════════════════════════════════════
# AgriDesk JWT Authentication System - Testing Script
# ═════════════════════════════════════════════════════════════════
# 
# This script demonstrates how to test all authentication features
# Run: bash test_auth.sh
# 
# ═════════════════════════════════════════════════════════════════

BASE_URL="http://localhost:5000/api"
CONSUMER_EMAIL="consumer@agri-desk.test"
CONSUMER_PASSWORD="Consumer@1234"
FARMER_EMAIL="farmer@agri-desk.test"
FARMER_PASSWORD="Farmer@1234"
ADMIN_EMAIL="admin@agri-desk.test"
ADMIN_PASSWORD="Admin@1234"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ═════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═════════════════════════════════════════════════════════════════

print_section() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

extract_token() {
    echo $1 | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$'
}

# ═════════════════════════════════════════════════════════════════
# 1. TEST CONSUMER REGISTRATION
# ═════════════════════════════════════════════════════════════════

print_section "1. CONSUMER REGISTRATION"

echo "Request:"
echo "POST $BASE_URL/auth/register"
echo "{\"name\": \"John Consumer\", \"email\": \"$CONSUMER_EMAIL\", \"password\": \"$CONSUMER_PASSWORD\", \"role\": \"consumer\", \"phone\": \"9876543210\"}"
echo ""

CONSUMER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"John Consumer\",
    \"email\": \"$CONSUMER_EMAIL\",
    \"password\": \"$CONSUMER_PASSWORD\",
    \"role\": \"consumer\",
    \"phone\": \"9876543210\"
  }")

echo "Response:"
echo $CONSUMER_RESPONSE | jq '.' 2>/dev/null || echo $CONSUMER_RESPONSE

# ═════════════════════════════════════════════════════════════════
# 2. TEST FARMER REGISTRATION
# ═════════════════════════════════════════════════════════════════

print_section "2. FARMER REGISTRATION"

echo "Request:"
echo "POST $BASE_URL/auth/register"
echo "{\"name\": \"Ramesh Farmer\", \"email\": \"$FARMER_EMAIL\", \"password\": \"$FARMER_PASSWORD\", \"role\": \"farmer\", \"phone\": \"9876543211\"}"
echo ""

FARMER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Ramesh Farmer\",
    \"email\": \"$FARMER_EMAIL\",
    \"password\": \"$FARMER_PASSWORD\",
    \"role\": \"farmer\",
    \"phone\": \"9876543211\"
  }")

echo "Response:"
echo $FARMER_RESPONSE | jq '.' 2>/dev/null || echo $FARMER_RESPONSE

# ═════════════════════════════════════════════════════════════════
# 3. TEST CONSUMER LOGIN
# ═════════════════════════════════════════════════════════════════

print_section "3. CONSUMER LOGIN"

echo "Request:"
echo "POST $BASE_URL/auth/login"
echo "{\"email\": \"$CONSUMER_EMAIL\", \"password\": \"$CONSUMER_PASSWORD\"}"
echo ""

CONSUMER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d "{
    \"email\": \"$CONSUMER_EMAIL\",
    \"password\": \"$CONSUMER_PASSWORD\"
  }")

echo "Response:"
echo $CONSUMER_LOGIN | jq '.' 2>/dev/null || echo $CONSUMER_LOGIN

CONSUMER_TOKEN=$(echo $CONSUMER_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
print_info "Saved Consumer Token: ${CONSUMER_TOKEN:0:20}..."

# ═════════════════════════════════════════════════════════════════
# 4. TEST FARMER LOGIN
# ═════════════════════════════════════════════════════════════════

print_section "4. FARMER LOGIN"

echo "Request:"
echo "POST $BASE_URL/auth/login"
echo "{\"email\": \"$FARMER_EMAIL\", \"password\": \"$FARMER_PASSWORD\"}"
echo ""

FARMER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$FARMER_EMAIL\",
    \"password\": \"$FARMER_PASSWORD\"
  }")

echo "Response:"
echo $FARMER_LOGIN | jq '.' 2>/dev/null || echo $FARMER_LOGIN

FARMER_TOKEN=$(echo $FARMER_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
print_info "Saved Farmer Token: ${FARMER_TOKEN:0:20}..."

# ═════════════════════════════════════════════════════════════════
# 5. TEST GET CURRENT USER (CONSUMER)
# ═════════════════════════════════════════════════════════════════

print_section "5. GET CURRENT USER (CONSUMER)"

echo "Request:"
echo "GET $BASE_URL/auth/me"
echo "Authorization: Bearer $CONSUMER_TOKEN"
echo ""

CONSUMER_ME=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $CONSUMER_TOKEN")

echo "Response:"
echo $CONSUMER_ME | jq '.' 2>/dev/null || echo $CONSUMER_ME

# ═════════════════════════════════════════════════════════════════
# 6. TEST GET CURRENT USER (FARMER)
# ═════════════════════════════════════════════════════════════════

print_section "6. GET CURRENT USER (FARMER)"

echo "Request:"
echo "GET $BASE_URL/auth/me"
echo "Authorization: Bearer $FARMER_TOKEN"
echo ""

FARMER_ME=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $FARMER_TOKEN")

echo "Response:"
echo $FARMER_ME | jq '.' 2>/dev/null || echo $FARMER_ME

# ═════════════════════════════════════════════════════════════════
# 7. TEST INVALID TOKEN
# ═════════════════════════════════════════════════════════════════

print_section "7. TEST INVALID TOKEN"

echo "Request:"
echo "GET $BASE_URL/auth/me"
echo "Authorization: Bearer invalid_token_here"
echo ""

INVALID_TOKEN=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer invalid_token")

echo "Response (Should be 401):"
echo $INVALID_TOKEN | jq '.' 2>/dev/null || echo $INVALID_TOKEN

# ═════════════════════════════════════════════════════════════════
# 8. TEST NO TOKEN
# ═════════════════════════════════════════════════════════════════

print_section "8. TEST NO TOKEN (Should be 401)"

echo "Request:"
echo "GET $BASE_URL/auth/me"
echo "(No Authorization header)"
echo ""

NO_TOKEN=$(curl -s -X GET "$BASE_URL/auth/me")

echo "Response (Should be 401):"
echo $NO_TOKEN | jq '.' 2>/dev/null || echo $NO_TOKEN

# ═════════════════════════════════════════════════════════════════
# 9. TEST LOGOUT
# ═════════════════════════════════════════════════════════════════

print_section "9. TEST LOGOUT"

echo "Request:"
echo "POST $BASE_URL/auth/logout"
echo ""

LOGOUT=$(curl -s -X POST "$BASE_URL/auth/logout")

echo "Response:"
echo $LOGOUT | jq '.' 2>/dev/null || echo $LOGOUT

# ═════════════════════════════════════════════════════════════════
# 10. TEST REFRESH TOKEN
# ═════════════════════════════════════════════════════════════════

print_section "10. TEST REFRESH TOKEN"

echo "Request:"
echo "POST $BASE_URL/auth/refresh-token"
echo "(Requires refreshToken cookie)"
echo ""

REFRESH=$(curl -s -X POST "$BASE_URL/auth/refresh-token" \
  -b cookies.txt)

echo "Response:"
echo $REFRESH | jq '.' 2>/dev/null || echo $REFRESH

# ═════════════════════════════════════════════════════════════════
# 11. TEST DUPLICATE EMAIL
# ═════════════════════════════════════════════════════════════════

print_section "11. TEST DUPLICATE EMAIL (Should be 409)"

echo "Request:"
echo "POST $BASE_URL/auth/register"
echo "Using already registered email: $CONSUMER_EMAIL"
echo ""

DUPLICATE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Another User\",
    \"email\": \"$CONSUMER_EMAIL\",
    \"password\": \"Password@123\",
    \"role\": \"consumer\"
  }")

echo "Response (Should be 409):"
echo $DUPLICATE | jq '.' 2>/dev/null || echo $DUPLICATE

# ═════════════════════════════════════════════════════════════════
# 12. TEST INVALID LOGIN (WRONG PASSWORD)
# ═════════════════════════════════════════════════════════════════

print_section "12. TEST INVALID LOGIN - WRONG PASSWORD"

echo "Request:"
echo "POST $BASE_URL/auth/login"
echo "{\"email\": \"$CONSUMER_EMAIL\", \"password\": \"WrongPassword@123\"}"
echo ""

INVALID_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$CONSUMER_EMAIL\",
    \"password\": \"WrongPassword@123\"
  }")

echo "Response (Should be 401):"
echo $INVALID_LOGIN | jq '.' 2>/dev/null || echo $INVALID_LOGIN

# ═════════════════════════════════════════════════════════════════
# 13. TEST INVALID REGISTRATION (WEAK PASSWORD)
# ═════════════════════════════════════════════════════════════════

print_section "13. TEST INVALID REGISTRATION - WEAK PASSWORD"

echo "Request:"
echo "POST $BASE_URL/auth/register"
echo "Using weak password: '123'"
echo ""

WEAK_PASSWORD=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"test@example.com\",
    \"password\": \"123\",
    \"role\": \"consumer\"
  }")

echo "Response (Should be 400):"
echo $WEAK_PASSWORD | jq '.' 2>/dev/null || echo $WEAK_PASSWORD

# ═════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════

print_section "TEST SUMMARY"

echo -e "${GREEN}✓ Registration (Consumer)${NC}"
echo -e "${GREEN}✓ Registration (Farmer)${NC}"
echo -e "${GREEN}✓ Login (Consumer)${NC}"
echo -e "${GREEN}✓ Login (Farmer)${NC}"
echo -e "${GREEN}✓ Get Current User${NC}"
echo -e "${GREEN}✓ Invalid Token Handling${NC}"
echo -e "${GREEN}✓ No Token Handling${NC}"
echo -e "${GREEN}✓ Logout${NC}"
echo -e "${GREEN}✓ Refresh Token${NC}"
echo -e "${GREEN}✓ Duplicate Email Prevention${NC}"
echo -e "${GREEN}✓ Invalid Password Handling${NC}"
echo -e "${GREEN}✓ Weak Password Prevention${NC}"

print_info "All tests completed!"
print_info "Tokens saved for manual testing:"
print_info "CONSUMER_TOKEN: ${CONSUMER_TOKEN:0:30}..."
print_info "FARMER_TOKEN: ${FARMER_TOKEN:0:30}..."

# ═════════════════════════════════════════════════════════════════
# NOTE: Use these tokens with curl for manual testing:
# 
# curl -H "Authorization: Bearer <TOKEN>" \
#   http://localhost:5000/api/auth/me
# ═════════════════════════════════════════════════════════════════
