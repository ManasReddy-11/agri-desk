# Product Module Test Script for Windows PowerShell
# Usage: powershell -ExecutionPolicy Bypass -File test_products.ps1

# Configuration
$BASE_URL = "http://localhost:5000/api/products"
$FARMER_TOKEN = "YOUR_FARMER_TOKEN_HERE"
$CONSUMER_TOKEN = "YOUR_CONSUMER_TOKEN_HERE"
$PRODUCT_ID = "YOUR_PRODUCT_ID_HERE"
$FARMER_ID = "YOUR_FARMER_ID_HERE"

# Test counter
$testCount = 0
$passCount = 0

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = "",
        [string]$Token = "",
        [string]$Description
    )
    
    $script:testCount++
    Write-Host "`n➜ Test $testCount : $Description" -ForegroundColor Blue
    Write-Host "  Method: $Method" -ForegroundColor Cyan
    Write-Host "  Endpoint: $Endpoint" -ForegroundColor Cyan
    
    try {
        $headers = @{
            'Content-Type' = 'application/json'
        }
        
        if ($Token) {
            $headers['Authorization'] = "Bearer $Token"
        }
        
        if ($Body) {
            $response = Invoke-WebRequest -Uri $Endpoint -Method $Method -Headers $headers -Body $Body
        } else {
            $response = Invoke-WebRequest -Uri $Endpoint -Method $Method -Headers $headers
        }
        
        Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: " -ForegroundColor Green
        $response.Content | ConvertFrom-Json | ConvertTo-Json | Out-Host
        $script:passCount++
    }
    catch {
        Write-Host "  Status: Error" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $_.Exception.Response | Out-Host
    }
}

Write-Host "=== AgriDesk Product Module Test Suite ===" -ForegroundColor Blue

# CONSUMER TESTS
Write-Host "`n═══ CONSUMER ENDPOINTS (PUBLIC) ═══" -ForegroundColor Blue

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL`?page=1&limit=5" -Description "Browse all products with pagination"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL`?category=vegetables&minPrice=10&maxPrice=100" -Description "Filter by category and price range"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL`?city=Ludhiana&state=Punjab" -Description "Filter by location"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/category/vegetables`?page=1&limit=5" -Description "Get products by category"

$searchBody = @{
    query = "tomato"
    page = 1
    limit = 5
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "$BASE_URL/search" -Body $searchBody -Description "Search for products"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/filter/price`?minPrice=20&maxPrice=80&page=1" -Description "Filter by price range"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/filter/location`?city=Ludhiana&state=Punjab&page=1" -Description "Filter by location"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/bestsellers`?limit=5" -Description "Get best selling products"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/organic/certified`?page=1&limit=5" -Description "Get organic certified products"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/$PRODUCT_ID" -Description "Get single product details"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/farmer/$FARMER_ID`?page=1&limit=5" -Description "Get farmer profile and products"

# FARMER TESTS
Write-Host "`n═══ FARMER ENDPOINTS (PROTECTED) ═══" -ForegroundColor Blue

$createProductBody = @{
    name = "Premium Tomatoes"
    description = "Fresh organic tomatoes from Punjab farm"
    category = "vegetables"
    price = 50
    discountedPrice = 40
    quantity = 100
    unit = "kg"
    minOrderQuantity = 2
    organicCertified = $true
    origin = "Ludhiana, Punjab"
    harvestDate = "2024-01-15T00:00:00Z"
    expiryDate = "2024-01-25T00:00:00Z"
    shippingAvailable = $true
    shippingCost = 50
    location = @{
        city = "Ludhiana"
        state = "Punjab"
        country = "India"
        zipCode = "141008"
    }
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "$BASE_URL" -Body $createProductBody -Token $FARMER_TOKEN -Description "Create new product (Farmer)"

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/my/products`?page=1&limit=5&status=active" -Token $FARMER_TOKEN -Description "Get my products (Farmer)"

$updateProductBody = @{
    name = "Premium Tomatoes - Updated"
    price = 55
    discountedPrice = 45
    organicCertified = $true
} | ConvertTo-Json

Test-Endpoint -Method "PUT" -Endpoint "$BASE_URL/$PRODUCT_ID" -Body $updateProductBody -Token $FARMER_TOKEN -Description "Update product details (Farmer)"

$restockBody = @{
    quantity = 50
    action = "add"
} | ConvertTo-Json

Test-Endpoint -Method "PATCH" -Endpoint "$BASE_URL/$PRODUCT_ID/quantity" -Body $restockBody -Token $FARMER_TOKEN -Description "Restock product (Add quantity)"

$setQuantityBody = @{
    quantity = 200
    action = "set"
} | ConvertTo-Json

Test-Endpoint -Method "PATCH" -Endpoint "$BASE_URL/$PRODUCT_ID/quantity" -Body $setQuantityBody -Token $FARMER_TOKEN -Description "Set product quantity to specific value"

$deactivateBody = @{
    isActive = $false
} | ConvertTo-Json

Test-Endpoint -Method "PATCH" -Endpoint "$BASE_URL/$PRODUCT_ID/status" -Body $deactivateBody -Token $FARMER_TOKEN -Description "Deactivate product"

$activateBody = @{
    isActive = $true
} | ConvertTo-Json

Test-Endpoint -Method "PATCH" -Endpoint "$BASE_URL/$PRODUCT_ID/status" -Body $activateBody -Token $FARMER_TOKEN -Description "Reactivate product"

Test-Endpoint -Method "DELETE" -Endpoint "$BASE_URL/$PRODUCT_ID" -Token $FARMER_TOKEN -Description "Delete product (Farmer)"

# ERROR TEST CASES
Write-Host "`n═══ ERROR HANDLING TESTS ═══" -ForegroundColor Blue

Test-Endpoint -Method "GET" -Endpoint "$BASE_URL/invalid_product_id" -Description "Test 404 - Invalid product ID"

$incompleteBody = @{
    name = "Incomplete Product"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "$BASE_URL" -Body $incompleteBody -Token $FARMER_TOKEN -Description "Test 400 - Missing required fields"

Test-Endpoint -Method "PUT" -Endpoint "$BASE_URL/$PRODUCT_ID" -Body $updateProductBody -Token $CONSUMER_TOKEN -Description "Test 403 - Unauthorized product update"

# Summary
Write-Host "`n═══════════════════════════════════════" -ForegroundColor Green
Write-Host "Test Summary:" -ForegroundColor Green
Write-Host "Total Tests: $testCount" -ForegroundColor Cyan
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $($testCount - $passCount)" -ForegroundColor $(if ($testCount - $passCount -eq 0) { "Green" } else { "Red" })
Write-Host "═══════════════════════════════════════" -ForegroundColor Green

Write-Host "`nNotes:" -ForegroundColor Yellow
Write-Host "1. Replace YOUR_FARMER_TOKEN_HERE with actual farmer JWT token" -ForegroundColor Cyan
Write-Host "2. Replace YOUR_CONSUMER_TOKEN_HERE with actual consumer JWT token" -ForegroundColor Cyan
Write-Host "3. Replace YOUR_PRODUCT_ID_HERE with actual product ID from database" -ForegroundColor Cyan
Write-Host "4. Replace YOUR_FARMER_ID_HERE with actual farmer ID from database" -ForegroundColor Cyan
Write-Host "5. Ensure MongoDB is running and connected" -ForegroundColor Cyan
Write-Host "6. Ensure Node.js backend server is running on port 5000" -ForegroundColor Cyan
