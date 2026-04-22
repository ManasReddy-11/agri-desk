# Cart Module Test Suite (PowerShell)
# Tests all cart endpoints and operations
# Usage: .\test_cart.ps1

$BaseUrl = "http://localhost:5000/api"
$ConsumerToken = ""
$AdminToken = ""
$ProductId1 = ""
$ProductId2 = ""
$ProductId3 = ""
$FarmerId = ""

# Test counters
$TestsPassed = 0
$TestsFailed = 0

# Color output functions
function Write-Test {
    Write-Host "[TEST]" -ForegroundColor Cyan -NoNewline
    Write-Host " $args"
}

function Write-Success {
    Write-Host "[PASS]" -ForegroundColor Green -NoNewline
    Write-Host " $args"
    $script:TestsPassed++
}

function Write-Error-Test {
    Write-Host "[FAIL]" -ForegroundColor Red -NoNewline
    Write-Host " $args"
    $script:TestsFailed++
}

function Write-Info {
    Write-Host "[INFO]" -ForegroundColor Yellow -NoNewline
    Write-Host " $args"
}

function Write-Separator {
    Write-Host "==========================================================="
}

# ==================== HELPER FUNCTIONS ====================

function Test-JsonField {
    param(
        [string]$Json,
        [string]$Field
    )
    return $Json -match "\"$Field\""
}

function Extract-JsonValue {
    param(
        [string]$Json,
        [string]$Field
    )
    $json | Select-String -Pattern "\"$Field\":([^,}]*)" | ForEach-Object { $_.Matches.Groups[1].Value }
}

# ==================== SETUP FUNCTIONS ====================

function Setup-AuthTokens {
    Write-Separator
    Write-Info "Setting up authentication tokens..."
    
    # Register/Login Consumer
    $ConsumerLoginBody = @{
        email = "consumer@agritest.com"
        password = "TestPassword123!"
    } | ConvertTo-Json
    
    $ConsumerLoginResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $ConsumerLoginBody `
        -ErrorAction SilentlyContinue
    
    if ($ConsumerLoginResponse) {
        $script:ConsumerToken = ($ConsumerLoginResponse.Content | ConvertFrom-Json).token
    }
    
    if (-not $ConsumerToken) {
        # Register consumer first
        $RegisterBody = @{
            name = "Test Consumer"
            email = "consumer@agritest.com"
            password = "TestPassword123!"
            role = "consumer"
            phone = "9999999999"
        } | ConvertTo-Json
        
        Invoke-WebRequest -Uri "$BaseUrl/auth/register" `
            -Method Post `
            -ContentType "application/json" `
            -Body $RegisterBody `
            -ErrorAction SilentlyContinue | Out-Null
        
        # Login again
        $ConsumerLoginResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/login" `
            -Method Post `
            -ContentType "application/json" `
            -Body $ConsumerLoginBody `
            -ErrorAction SilentlyContinue
        
        $script:ConsumerToken = ($ConsumerLoginResponse.Content | ConvertFrom-Json).token
    }
    
    if ($ConsumerToken) {
        Write-Success "Consumer token obtained"
    } else {
        Write-Error-Test "Failed to obtain consumer token"
        return $false
    }
    
    return $true
}

function Setup-TestProducts {
    Write-Separator
    Write-Info "Setting up test products..."
    
    # Farmer login/register
    $FarmerLoginBody = @{
        email = "farmer@agritest.com"
        password = "FarmerPass123!"
    } | ConvertTo-Json
    
    $FarmerLoginResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $FarmerLoginBody `
        -ErrorAction SilentlyContinue
    
    $FarmerToken = ""
    
    if ($FarmerLoginResponse) {
        $FarmerToken = ($FarmerLoginResponse.Content | ConvertFrom-Json).token
        $script:FarmerId = ($FarmerLoginResponse.Content | ConvertFrom-Json)._id
    }
    
    if (-not $FarmerToken) {
        # Register farmer first
        $FarmerRegisterBody = @{
            name = "Test Farmer"
            email = "farmer@agritest.com"
            password = "FarmerPass123!"
            role = "farmer"
            phone = "8888888888"
        } | ConvertTo-Json
        
        Invoke-WebRequest -Uri "$BaseUrl/auth/register" `
            -Method Post `
            -ContentType "application/json" `
            -Body $FarmerRegisterBody `
            -ErrorAction SilentlyContinue | Out-Null
        
        $FarmerLoginResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/login" `
            -Method Post `
            -ContentType "application/json" `
            -Body $FarmerLoginBody `
            -ErrorAction SilentlyContinue
        
        $FarmerToken = ($FarmerLoginResponse.Content | ConvertFrom-Json).token
        $script:FarmerId = ($FarmerLoginResponse.Content | ConvertFrom-Json)._id
    }
    
    # Create Product 1
    $Product1Body = @{
        name = "Test Tomatoes"
        description = "Fresh tomatoes for testing"
        price = 50
        category = "vegetables"
        quantity = 100
        unit = "kg"
        isActive = $true
        minOrderQuantity = 1
    } | ConvertTo-Json
    
    $Product1Response = Invoke-WebRequest -Uri "$BaseUrl/products" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $FarmerToken" } `
        -Body $Product1Body `
        -ErrorAction SilentlyContinue
    
    if ($Product1Response) {
        $script:ProductId1 = ($Product1Response.Content | ConvertFrom-Json).data._id
        Write-Success "Test Product 1 created"
    }
    
    # Create Product 2
    $Product2Body = @{
        name = "Test Onions"
        description = "Fresh onions"
        price = 30
        discountedPrice = 25
        category = "vegetables"
        quantity = 50
        unit = "kg"
        isActive = $true
        minOrderQuantity = 1
    } | ConvertTo-Json
    
    $Product2Response = Invoke-WebRequest -Uri "$BaseUrl/products" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $FarmerToken" } `
        -Body $Product2Body `
        -ErrorAction SilentlyContinue
    
    if ($Product2Response) {
        $script:ProductId2 = ($Product2Response.Content | ConvertFrom-Json).data._id
        Write-Success "Test Product 2 created"
    }
    
    # Create Product 3 (inactive)
    $Product3Body = @{
        name = "Test Inactive"
        description = "Inactive product"
        price = 40
        category = "vegetables"
        quantity = 0
        unit = "kg"
        isActive = $false
        minOrderQuantity = 1
    } | ConvertTo-Json
    
    $Product3Response = Invoke-WebRequest -Uri "$BaseUrl/products" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $FarmerToken" } `
        -Body $Product3Body `
        -ErrorAction SilentlyContinue
    
    if ($Product3Response) {
        $script:ProductId3 = ($Product3Response.Content | ConvertFrom-Json).data._id
        Write-Success "Test Product 3 created (inactive)"
    }
}

# ==================== CART TESTS ====================

function Test-AddToCart {
    Write-Test "Test: Add product to cart"
    
    $Body = @{
        productId = $ProductId1
        quantity = 2
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "successfully|added") {
        Write-Success "Product added to cart"
    } else {
        Write-Error-Test "Failed to add product to cart"
    }
}

function Test-GetCart {
    Write-Test "Test: Get cart"
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match '"success":true') {
        Write-Success "Cart retrieved successfully"
    } else {
        Write-Error-Test "Failed to retrieve cart"
    }
}

function Test-GetCartSummary {
    Write-Test "Test: Get cart summary"
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/summary" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match '"itemCount"') {
        Write-Success "Cart summary retrieved"
    } else {
        Write-Error-Test "Failed to get cart summary"
    }
}

function Test-AddSecondProduct {
    Write-Test "Test: Add second product to cart"
    
    $Body = @{
        productId = $ProductId2
        quantity = 1
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "successfully|added") {
        Write-Success "Second product added"
    } else {
        Write-Error-Test "Failed to add second product"
    }
}

function Test-UpdateItemQuantity {
    Write-Test "Test: Update item quantity"
    
    $Body = @{
        productId = $ProductId1
        quantity = 5
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/item/quantity" `
        -Method Patch `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "updated") {
        Write-Success "Item quantity updated"
    } else {
        Write-Error-Test "Failed to update quantity"
    }
}

function Test-RemoveItemFromCart {
    Write-Test "Test: Remove item from cart"
    
    $Body = @{
        productId = $ProductId2
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/item" `
        -Method Delete `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "removed") {
        Write-Success "Item removed from cart"
    } else {
        Write-Error-Test "Failed to remove item"
    }
}

function Test-ApplyCoupon {
    Write-Test "Test: Apply coupon (percentage)"
    
    $Body = @{
        code = "DISCOUNT20"
        discountPercentage = 20
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/coupon" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "applied") {
        Write-Success "Coupon applied successfully"
    } else {
        Write-Error-Test "Failed to apply coupon"
    }
}

function Test-ApplyFixedCoupon {
    Write-Test "Test: Apply coupon (fixed amount)"
    
    $Body = @{
        code = "SAVE50"
        discountAmount = 50
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/coupon" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "applied|coupon") {
        Write-Success "Fixed coupon applied"
    } else {
        Write-Error-Test "Failed to apply fixed coupon"
    }
}

function Test-RemoveCoupon {
    Write-Test "Test: Remove coupon"
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/coupon" `
        -Method Delete `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "removed|success") {
        Write-Success "Coupon removed"
    } else {
        Write-Error-Test "Failed to remove coupon"
    }
}

function Test-UpdateShippingCost {
    Write-Test "Test: Update shipping cost"
    
    $Body = @{
        shippingCost = 150
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/shipping" `
        -Method Patch `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "updated|success") {
        Write-Success "Shipping cost updated"
    } else {
        Write-Error-Test "Failed to update shipping"
    }
}

function Test-ValidateCart {
    Write-Test "Test: Validate cart items"
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/validation" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "available|success") {
        Write-Success "Cart items validated"
    } else {
        Write-Error-Test "Failed to validate cart"
    }
}

function Test-GroupedByFarmer {
    Write-Test "Test: Get cart grouped by farmer"
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart/grouped" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "farmer|success") {
        Write-Success "Cart grouped by farmer"
    } else {
        Write-Error-Test "Failed to group by farmer"
    }
}

function Test-ClearCart {
    Write-Test "Test: Clear entire cart"
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart" `
        -Method Delete `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "cleared|success") {
        Write-Success "Cart cleared"
    } else {
        Write-Error-Test "Failed to clear cart"
    }
}

# ==================== ERROR HANDLING TESTS ====================

function Test-AddInvalidProduct {
    Write-Test "Test: Add invalid product ID"
    
    $Body = @{
        productId = "invalid_id"
        quantity = 1
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "404|not found") {
        Write-Success "Invalid product properly rejected"
    } else {
        Write-Error-Test "Invalid product not properly handled"
    }
}

function Test-AddZeroQuantity {
    Write-Test "Test: Add product with zero quantity"
    
    $Body = @{
        productId = $ProductId1
        quantity = 0
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "400|Invalid") {
        Write-Success "Zero quantity properly rejected"
    } else {
        Write-Error-Test "Zero quantity not properly handled"
    }
}

function Test-AddNegativeQuantity {
    Write-Test "Test: Add product with negative quantity"
    
    $Body = @{
        productId = $ProductId1
        quantity = -5
    } | ConvertTo-Json
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart" `
        -Method Post `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $ConsumerToken" } `
        -Body $Body `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "400|Invalid") {
        Write-Success "Negative quantity properly rejected"
    } else {
        Write-Error-Test "Negative quantity not properly handled"
    }
}

function Test-MissingToken {
    Write-Test "Test: Access cart without token"
    
    $Response = Invoke-WebRequest -Uri "$BaseUrl/cart" `
        -Headers @{ Authorization = "Bearer invalid_token" } `
        -ErrorAction SilentlyContinue
    
    if ($Response.Content -match "401|Unauthorized") {
        Write-Success "Unauthorized access properly blocked"
    } else {
        Write-Error-Test "Unauthorized access not properly blocked"
    }
}

# ==================== MAIN EXECUTION ====================

function Main {
    Clear-Host
    Write-Separator
    Write-Host "       AGRI DESK CART MODULE TEST SUITE (PowerShell)" -ForegroundColor Cyan
    Write-Separator
    
    # Check if server is running
    try {
        $HealthCheck = Invoke-WebRequest -Uri "$BaseUrl/health" -ErrorAction Stop
        Write-Success "Server is running"
    } catch {
        Write-Error-Test "Server not running at $BaseUrl"
        exit 1
    }
    
    # Setup
    if (-not (Setup-AuthTokens)) {
        exit 1
    }
    
    Setup-TestProducts
    
    # Cart Operations Tests
    Write-Separator
    Write-Info "CART OPERATIONS TESTS"
    Write-Separator
    
    Test-AddToCart
    Test-GetCart
    Test-GetCartSummary
    Test-AddSecondProduct
    Test-UpdateItemQuantity
    Test-GroupedByFarmer
    Test-ValidateCart
    Test-ApplyCoupon
    Test-RemoveCoupon
    Test-ApplyFixedCoupon
    Test-UpdateShippingCost
    Test-RemoveItemFromCart
    Test-ClearCart
    
    # Error Handling Tests
    Write-Separator
    Write-Info "ERROR HANDLING TESTS"
    Write-Separator
    
    Test-AddInvalidProduct
    Test-AddZeroQuantity
    Test-AddNegativeQuantity
    Test-MissingToken
    
    # Summary
    Write-Separator
    Write-Separator
    Write-Host "TEST SUMMARY" -ForegroundColor Cyan
    Write-Host "Tests Passed: " -NoNewline
    Write-Host $TestsPassed -ForegroundColor Green
    Write-Host "Tests Failed: " -NoNewline
    Write-Host $TestsFailed -ForegroundColor Red
    Write-Host "Total Tests: $($TestsPassed + $TestsFailed)"
    Write-Separator
    
    if ($TestsFailed -eq 0) {
        Write-Host "✓ All tests passed!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "✗ Some tests failed!" -ForegroundColor Red
        exit 1
    }
}

# Run tests
Main

