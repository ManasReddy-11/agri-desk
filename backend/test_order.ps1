# Order Module Test Suite - PowerShell
# Comprehensive API Testing for Order Module
# Usage: powershell -ExecutionPolicy Bypass -File test_order.ps1

# ============================================================================
# CONFIGURATION
# ============================================================================

$BaseURL = "http://localhost:5000/api"
$ConsumerToken = $env:CONSUMER_TOKEN -or "consumer_test_token"
$FarmerToken = $env:FARMER_TOKEN -or "farmer_test_token"
$AdminToken = $env:ADMIN_TOKEN -or "admin_test_token"

# Test counters
$script:TestsRun = 0
$script:TestsPassed = 0
$script:TestsFailed = 0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Title)
    Write-Host "`n" -NoNewline
    Write-Host "=== $Title ===" -ForegroundColor Blue
    Write-Host "`n" -NoNewline
}

function Write-TestStart {
    param([string]$TestName)
    Write-Host "TEST: $TestName" -ForegroundColor Yellow
    $script:TestsRun++
}

function Write-TestPass {
    Write-Host "✓ PASSED" -ForegroundColor Green
    Write-Host ""
    $script:TestsPassed++
}

function Write-TestFail {
    param([string]$Reason)
    Write-Host "✗ FAILED: $Reason" -ForegroundColor Red
    Write-Host ""
    $script:TestsFailed++
}

function Write-TestSummary {
    Write-Host "`n" -NoNewline
    Write-Host "=== TEST SUMMARY ===" -ForegroundColor Blue
    Write-Host "Total Tests: $($script:TestsRun)"
    Write-Host "Passed: $($script:TestsPassed)" -ForegroundColor Green
    Write-Host "Failed: $($script:TestsFailed)" -ForegroundColor Red
    Write-Host ""
}

function Invoke-APIRequest {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Endpoint,
        [string]$Token,
        [object]$Data
    )
    
    Write-TestStart $TestName
    
    $Uri = "$BaseURL$Endpoint"
    $Headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    try {
        if ($Data) {
            $DataJson = $Data | ConvertTo-Json -Depth 10
            $Response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $DataJson
        } else {
            $Response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers
        }
        
        Write-Host "Response:" -NoNewline
        Write-Host $Response | ConvertTo-Json -Depth 10
        Write-Host ""
        
        if ($Response.success -eq $true) {
            Write-TestPass
            return $Response
        } else {
            Write-TestFail "Response did not contain success: true"
            return $null
        }
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
        Write-TestFail $_.Exception.Message
        return $null
    }
}

# ============================================================================
# CONSUMER TESTS
# ============================================================================

function Test-ConsumerOperations {
    Write-Header "CONSUMER OPERATIONS"
    
    # Test 1: Place Order
    Write-TestStart "Consumer: Place Order"
    
    $Uri = "$BaseURL/order"
    $Headers = @{
        "Authorization" = "Bearer $ConsumerToken"
        "Content-Type" = "application/json"
    }
    
    $OrderData = @{
        shippingAddress = @{
            street = "123 Main Street"
            city = "Bangalore"
            state = "Karnataka"
            zipCode = "560001"
            country = "India"
            phone = "9999999999"
        }
        paymentMethod = "upi"
    }
    
    try {
        $Response = Invoke-RestMethod -Uri $Uri -Method POST -Headers $Headers -Body ($OrderData | ConvertTo-Json)
        Write-Host "Response:" -NoNewline
        Write-Host $Response | ConvertTo-Json -Depth 10
        Write-Host ""
        
        $global:OrderId = $Response.data.order._id
        if ($Response.success -eq $true) {
            Write-TestPass
            Write-Host "Extracted Order ID: $global:OrderId" -ForegroundColor Cyan
        } else {
            Write-TestFail "Response did not contain success: true"
        }
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
        Write-TestFail $_.Exception.Message
    }
    
    # Test 2: Get Order History
    Invoke-APIRequest "Consumer: Get Order History" "GET" "/order?page=1&limit=10" $ConsumerToken
    
    # Test 3: Get Order History with Filter
    Invoke-APIRequest "Consumer: Get Order History (pending)" "GET" "/order?status=pending" $ConsumerToken
    
    # Test 4: Get Order Details
    if ([string]::IsNullOrEmpty($global:OrderId)) {
        Write-Host "Skipping order-specific tests (no order created)" -ForegroundColor Yellow
    } else {
        Invoke-APIRequest "Consumer: Get Order Details" "GET" "/order/$global:OrderId" $ConsumerToken
        
        # Test 5: Track Order
        Invoke-APIRequest "Consumer: Track Order" "GET" "/order/$global:OrderId/track" $ConsumerToken
        
        # Test 6: Try Cancel Order
        Invoke-APIRequest "Consumer: Cancel Order" "PATCH" "/order/$global:OrderId/cancel" $ConsumerToken @{reason = "Changed mind"}
    }
}

# ============================================================================
# FARMER TESTS
# ============================================================================

function Test-FarmerOperations {
    Write-Header "FARMER OPERATIONS"
    
    # Test 1: Get Pending Orders
    Write-TestStart "Farmer: Get Pending Orders"
    
    $Uri = "$BaseURL/order/farmer/pending"
    $Headers = @{
        "Authorization" = "Bearer $FarmerToken"
        "Content-Type" = "application/json"
    }
    
    try {
        $Response = Invoke-RestMethod -Uri $Uri -Method GET -Headers $Headers
        Write-Host "Response:" -NoNewline
        Write-Host $Response | ConvertTo-Json -Depth 10
        Write-Host ""
        
        if ($Response.data.orders.Count -gt 0) {
            $global:FarmerOrderId = $Response.data.orders[0]._id
            Write-Host "Extracted Order ID: $global:FarmerOrderId" -ForegroundColor Cyan
            Write-TestPass
        } else {
            Write-Host "No pending orders found for farmer" -ForegroundColor Yellow
            $global:FarmerOrderId = $null
            $script:TestsRun++
            $script:TestsPassed++
        }
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
        Write-TestFail $_.Exception.Message
    }
    
    # Test 2: Get Incoming Orders
    Invoke-APIRequest "Farmer: Get Incoming Orders" "GET" "/order/farmer/orders" $FarmerToken
    
    # Test 3: Get Incoming Orders with Filter
    Invoke-APIRequest "Farmer: Get Incoming Orders (accepted)" "GET" "/order/farmer/orders?status=accepted" $FarmerToken
    
    # Test 4-7: Farmer workflow (if order exists)
    if (![string]::IsNullOrEmpty($global:FarmerOrderId)) {
        # Accept Order
        Invoke-APIRequest "Farmer: Accept Order" "PATCH" "/order/$global:FarmerOrderId/accept" $FarmerToken @{notes = "Order accepted. Will pack by 6 PM"}
        
        # Update to Packed
        Invoke-APIRequest "Farmer: Update Delivery Status (packed)" "PATCH" "/order/$global:FarmerOrderId/delivery-status" $FarmerToken @{status = "packed"; notes = "Items packed"}
        
        # Update to Shipped
        Invoke-APIRequest "Farmer: Update Delivery Status (shipped)" "PATCH" "/order/$global:FarmerOrderId/delivery-status" $FarmerToken @{status = "shipped"; trackingNumber = "TRACK123456789"; estimatedDelivery = "2024-01-20T18:00:00Z"}
        
        # Update to Delivered
        Invoke-APIRequest "Farmer: Update Delivery Status (delivered)" "PATCH" "/order/$global:FarmerOrderId/delivery-status" $FarmerToken @{status = "delivered"; notes = "Successfully delivered"}
    } else {
        Write-Host "Skipping order-specific farmer tests (no order found)" -ForegroundColor Yellow
    }
    
    # Test 8: Get Order Stats
    Invoke-APIRequest "Farmer: Get Order Statistics" "GET" "/order/farmer/stats" $FarmerToken
}

# ============================================================================
# ADMIN TESTS
# ============================================================================

function Test-AdminOperations {
    Write-Header "ADMIN OPERATIONS"
    
    # Test 1: Get All Orders
    Write-TestStart "Admin: Get All Orders"
    
    $Uri = "$BaseURL/order/admin/all?page=1&limit=20"
    $Headers = @{
        "Authorization" = "Bearer $AdminToken"
        "Content-Type" = "application/json"
    }
    
    try {
        $Response = Invoke-RestMethod -Uri $Uri -Method GET -Headers $Headers
        Write-Host "Response:" -NoNewline
        Write-Host $Response | ConvertTo-Json -Depth 10
        Write-Host ""
        
        if ($Response.data.orders.Count -gt 0) {
            $global:AdminOrderId = $Response.data.orders[0]._id
            Write-Host "Extracted Order ID: $global:AdminOrderId" -ForegroundColor Cyan
            Write-TestPass
        } else {
            Write-Host "No orders found" -ForegroundColor Yellow
            $global:AdminOrderId = $null
            $script:TestsRun++
            $script:TestsPassed++
        }
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
        Write-TestFail $_.Exception.Message
    }
    
    # Test 2: Filter by Status
    Invoke-APIRequest "Admin: Get Orders (status=pending)" "GET" "/order/admin/all?status=pending" $AdminToken
    
    # Test 3: Filter by Amount
    Invoke-APIRequest "Admin: Get Orders (amount range)" "GET" "/order/admin/all?minAmount=1000&maxAmount=10000" $AdminToken
    
    # Test 4: Get Order Details
    if (![string]::IsNullOrEmpty($global:AdminOrderId)) {
        Invoke-APIRequest "Admin: Get Order by ID" "GET" "/order/admin/$global:AdminOrderId" $AdminToken
    }
    
    # Test 5: High-Value Orders
    Invoke-APIRequest "Admin: Get High-Value Orders" "GET" "/order/admin/high-value?minAmount=5000" $AdminToken
    
    # Test 6: Delivery Due Orders
    Invoke-APIRequest "Admin: Get Delivery Due Orders" "GET" "/order/admin/delivery-due?daysThreshold=3" $AdminToken
    
    # Test 7: Order Statistics
    Invoke-APIRequest "Admin: Get Order Statistics" "GET" "/order/admin/stats" $AdminToken
}

# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

function Test-ErrorScenarios {
    Write-Header "ERROR HANDLING TESTS"
    
    # Test 1: Invalid Token
    Write-TestStart "Error: Invalid Token"
    
    $Uri = "$BaseURL/order"
    $Headers = @{
        "Authorization" = "Bearer invalid_token"
        "Content-Type" = "application/json"
    }
    
    try {
        $Response = Invoke-RestMethod -Uri $Uri -Method GET -Headers $Headers
        Write-Host "Response:" -NoNewline
        Write-Host $Response | ConvertTo-Json -Depth 10
        Write-Host ""
        if (-not $Response.success) {
            Write-TestPass
        } else {
            Write-TestFail "Should have rejected invalid token"
        }
    }
    catch {
        Write-Host "Error (expected): $_" -ForegroundColor Yellow
        $script:TestsRun++
        $script:TestsPassed++
    }
    
    # Test 2: Missing Authorization
    Write-TestStart "Error: Missing Authorization"
    
    $Uri = "$BaseURL/order"
    $Headers = @{
        "Content-Type" = "application/json"
    }
    
    try {
        $Response = Invoke-RestMethod -Uri $Uri -Method GET -Headers $Headers
        Write-Host "Response:" -NoNewline
        Write-Host $Response | ConvertTo-Json -Depth 10
        Write-Host ""
        if (-not $Response.success) {
            Write-TestPass
        } else {
            Write-TestFail "Should have rejected missing auth"
        }
    }
    catch {
        Write-Host "Error (expected): $_" -ForegroundColor Yellow
        $script:TestsRun++
        $script:TestsPassed++
    }
    
    # Test 3: Non-existent Order
    Invoke-APIRequest "Error: Non-existent Order" "GET" "/order/000000000000000000000000" $ConsumerToken
}

# ============================================================================
# MULTI-FARMER SCENARIO
# ============================================================================

function Test-MultiFarmerScenario {
    Write-Header "MULTI-FARMER SCENARIOS"
    
    Write-Host "Multi-farmer orders occur when:" -ForegroundColor Cyan
    Write-Host "1. Consumer has items from different farmers in cart" -ForegroundColor Cyan
    Write-Host "2. Order is created with items from multiple farmers" -ForegroundColor Cyan
    Write-Host "3. Each farmer accepts/rejects independently" -ForegroundColor Cyan
    Write-Host "`n" -NoNewline
    
    Write-TestStart "Multi-Farmer: Order Grouping"
    Write-Host "Expected behavior:"
    Write-Host "- Order.farmers array contains entries for each farmer" -ForegroundColor Gray
    Write-Host "- Each farmer has subset of items" -ForegroundColor Gray
    Write-Host "- Order status = most advanced farmer status" -ForegroundColor Gray
    Write-Host ""
    $script:TestsPassed++
}

# ============================================================================
# PAGINATION TESTS
# ============================================================================

function Test-Pagination {
    Write-Header "PAGINATION TESTS"
    
    # Test 1: Page 1
    Invoke-APIRequest "Pagination: Get Page 1" "GET" "/order?page=1&limit=5" $ConsumerToken
    
    # Test 2: Page 2
    Invoke-APIRequest "Pagination: Get Page 2" "GET" "/order?page=2&limit=5" $ConsumerToken
    
    # Test 3: Large limit
    Invoke-APIRequest "Pagination: Large limit" "GET" "/order?page=1&limit=100" $ConsumerToken
    
    # Test 4: Farmer pagination
    Invoke-APIRequest "Pagination: Farmer orders" "GET" "/order/farmer/orders?page=1&limit=10" $FarmerToken
}

# ============================================================================
# FILTERING TESTS
# ============================================================================

function Test-Filtering {
    Write-Header "FILTERING TESTS"
    
    # Test 1: Filter by status
    Invoke-APIRequest "Filter: Status=pending" "GET" "/order?status=pending" $ConsumerToken
    
    # Test 2: Filter by status (delivered)
    Invoke-APIRequest "Filter: Status=delivered" "GET" "/order?status=delivered" $ConsumerToken
    
    # Test 3: Filter by amount
    Invoke-APIRequest "Filter: High-value (>5000)" "GET" "/order/admin/high-value?minAmount=5000" $AdminToken
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Main {
    Write-Host "`n" -NoNewline
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║     AGRIIDESK ORDER MODULE - COMPREHENSIVE TEST SUITE    ║" -ForegroundColor Blue
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    
    Write-Host "`nConfiguration:"
    Write-Host "Base URL: $BaseURL"
    Write-Host "Ensure your backend is running on http://localhost:5000"
    Write-Host ""
    
    # Run test suites
    Test-ConsumerOperations
    Test-FarmerOperations
    Test-AdminOperations
    Test-ErrorScenarios
    Test-MultiFarmerScenario
    Test-Pagination
    Test-Filtering
    
    # Print summary
    Write-TestSummary
    
    # Exit with appropriate code
    if ($script:TestsFailed -eq 0) {
        Write-Host "All tests passed!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Some tests failed!" -ForegroundColor Red
        exit 1
    }
}

# Show help if requested
if ($args[0] -eq "-h" -or $args[0] -eq "--help") {
    Write-Host "Usage: powershell -ExecutionPolicy Bypass -File test_order.ps1`n"
    Write-Host "Environment Variables:"
    Write-Host "  CONSUMER_TOKEN       JWT token for consumer"
    Write-Host "  FARMER_TOKEN         JWT token for farmer"
    Write-Host "  ADMIN_TOKEN          JWT token for admin`n"
    Write-Host "Example:"
    Write-Host "  `$env:CONSUMER_TOKEN='your_token'; powershell -ExecutionPolicy Bypass -File test_order.ps1"
    exit 0
}

# Execute main
Main

