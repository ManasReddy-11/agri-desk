################################################################################
# Payment Module API Test Script (PowerShell)
# Purpose: Test all payment endpoints with real API calls
# Requirements: PowerShell 5.0+, Invoke-RestMethod
# Usage: .\test-payment-api.ps1 [-TestType all|consumer|admin] [-TestName test_name]
################################################################################

param(
    [ValidateSet("all", "consumer", "admin", "initiate", "process", "status", 
                 "history", "verify", "refund", "stats", "revenue")]
    [string]$TestType = "all",
    
    [ValidateSet("detailed", "summary")]
    [string]$OutputFormat = "summary"
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$BaseURL = "http://localhost:5000/api"
$ConsumerToken = "SAMPLE_CONSUMER_TOKEN_12345"  # Replace with real token
$AdminToken = "SAMPLE_ADMIN_TOKEN_12345"        # Replace with real token

# Test counters
$script:PassCount = 0
$script:FailCount = 0

# Headers for requests
$ConsumerHeaders = @{
    "Authorization" = "Bearer $ConsumerToken"
    "Content-Type"  = "application/json"
}

$AdminHeaders = @{
    "Authorization" = "Bearer $AdminToken"
    "Content-Type"  = "application/json"
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
    $script:PassCount++
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    $script:FailCount++
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Title)
    Write-Host "`n$Title" -ForegroundColor Yellow
    Write-Host ("=" * 50) -ForegroundColor Yellow
}

function Invoke-API {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers,
        [object]$Body
    )
    
    $URI = "$BaseURL$Endpoint"
    $params = @{
        Method  = $Method
        Uri     = $URI
        Headers = $Headers
    }
    
    if ($Body) {
        $params["Body"] = $Body | ConvertTo-Json -Depth 10
    }
    
    try {
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        Write-Host "API Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# ============================================================================
# TEST DATA SETUP
# ============================================================================

$script:TestOrderId = "order_test_$(Get-Random)"
$script:TestPaymentId = ""
$script:TestConsumerId = "consumer_123"

function Initialize-TestData {
    Write-Section "Setting up test data"
    Write-Info "Test Order ID: $($script:TestOrderId)"
    Write-Info "Test Consumer ID: $($script:TestConsumerId)"
}

# ============================================================================
# CONSUMER TESTS
# ============================================================================

function Test-ConsumerInitiatePayment {
    Write-Section "TEST: Consumer - Initiate Payment"
    
    $body = @{
        orderId         = $script:TestOrderId
        paymentMethod   = "card"
        paymentGateway  = "mock"
        metadata        = @{
            ipAddress = "192.168.1.1"
            userAgent = "PowerShell Test"
        }
    }
    
    $response = Invoke-API -Method "POST" -Endpoint "/payment/initiate" `
                          -Headers $ConsumerHeaders -Body $body
    
    if ($response) {
        if ($response.success) {
            $script:TestPaymentId = $response.data.payment.paymentId
            Write-Success "Payment initiated: $($script:TestPaymentId)"
            if ($OutputFormat -eq "detailed") {
                $response | ConvertTo-Json | Write-Host
            }
        } else {
            Write-Error "Payment initiation failed"
            $response | ConvertTo-Json | Write-Host
        }
    }
}

function Test-ConsumerProcessPayment {
    Write-Section "TEST: Consumer - Process Payment"
    
    if (-not $script:TestPaymentId) {
        Write-Error "No payment ID available. Run initiate payment first."
        return
    }
    
    $body = @{
        paymentId   = $script:TestPaymentId
        orderId     = $script:TestOrderId
        method      = "card"
        cardDetails = @{
            number = "4111111111111111"
            expiry = "12/25"
            cvv    = "123"
        }
    }
    
    $response = Invoke-API -Method "POST" -Endpoint "/payment/process" `
                          -Headers $ConsumerHeaders -Body $body
    
    if ($response) {
        Write-Success "Payment processed"
        if ($OutputFormat -eq "detailed") {
            $response | ConvertTo-Json | Write-Host
        }
    }
}

function Test-ConsumerGetPaymentStatus {
    Write-Section "TEST: Consumer - Get Payment Status"
    
    if (-not $script:TestPaymentId) {
        Write-Error "No payment ID available."
        return
    }
    
    $response = Invoke-API -Method "GET" -Endpoint "/payment/$($script:TestPaymentId)" `
                          -Headers $ConsumerHeaders
    
    if ($response) {
        $status = $response.data.payment.status
        Write-Success "Payment status: $status"
        if ($OutputFormat -eq "detailed") {
            $response.data.payment | Select-Object paymentId, status, amount, createdAt | 
                ConvertTo-Json | Write-Host
        }
    }
}

function Test-ConsumerPaymentHistory {
    Write-Section "TEST: Consumer - Payment History"
    
    $response = Invoke-API -Method "GET" `
                          -Endpoint "/payment?page=1&limit=5&status=success" `
                          -Headers $ConsumerHeaders
    
    if ($response) {
        $count = $response.data.payments.Count
        Write-Success "Retrieved $count payments"
        if ($OutputFormat -eq "detailed") {
            $response.data.payments | Select-Object paymentId, status, amount | 
                ConvertTo-Json | Write-Host
        }
    }
}

function Test-ConsumerVerifyPayment {
    Write-Section "TEST: Consumer - Verify Payment"
    
    if (-not $script:TestPaymentId) {
        Write-Error "No payment ID available."
        return
    }
    
    $body = @{
        paymentId     = $script:TestPaymentId
        transactionId = "pay_$(Get-Date -AsUTC -Format 'yyyyMMddHHmmss')_txn123"
        orderId       = $script:TestOrderId
    }
    
    $response = Invoke-API -Method "POST" -Endpoint "/payment/verify" `
                          -Headers $ConsumerHeaders -Body $body
    
    if ($response) {
        Write-Success "Payment verified"
        if ($OutputFormat -eq "detailed") {
            $response.data | ConvertTo-Json | Write-Host
        }
    }
}

function Test-ConsumerInitiateRefund {
    Write-Section "TEST: Consumer - Initiate Refund"
    
    if (-not $script:TestPaymentId) {
        Write-Error "No payment ID available."
        return
    }
    
    $body = @{
        amount = 250
        reason = "Partial refund - test"
    }
    
    $response = Invoke-API -Method "POST" `
                          -Endpoint "/payment/$($script:TestPaymentId)/refund" `
                          -Headers $ConsumerHeaders -Body $body
    
    if ($response) {
        Write-Success "Refund requested"
        if ($OutputFormat -eq "detailed") {
            $response.data | ConvertTo-Json | Write-Host
        }
    }
}

function Test-ConsumerRefundStatus {
    Write-Section "TEST: Consumer - Get Refund Status"
    
    if (-not $script:TestPaymentId) {
        Write-Error "No payment ID available."
        return
    }
    
    $response = Invoke-API -Method "GET" `
                          -Endpoint "/payment/$($script:TestPaymentId)/refund/status" `
                          -Headers $ConsumerHeaders
    
    if ($response) {
        Write-Success "Retrieved refund status"
        if ($OutputFormat -eq "detailed") {
            $response.data.refund | ConvertTo-Json | Write-Host
        }
    }
}

# ============================================================================
# ADMIN TESTS
# ============================================================================

function Test-AdminViewAllPayments {
    Write-Section "TEST: Admin - View All Payments"
    
    $response = Invoke-API -Method "GET" `
                          -Endpoint "/payment/admin/all?page=1&limit=10&status=success" `
                          -Headers $AdminHeaders
    
    if ($response) {
        $count = $response.data.payments.Count
        Write-Success "Retrieved $count payments"
        if ($OutputFormat -eq "detailed") {
            @{ total = $response.data.total; payments = $count } | 
                ConvertTo-Json | Write-Host
        }
    }
}

function Test-AdminPaymentStatistics {
    Write-Section "TEST: Admin - Payment Statistics"
    
    $response = Invoke-API -Method "GET" -Endpoint "/payment/admin/stats" `
                          -Headers $AdminHeaders
    
    if ($response) {
        Write-Success "Retrieved statistics"
        if ($OutputFormat -eq "detailed") {
            $response.data.stats | ConvertTo-Json | Write-Host
        }
    }
}

function Test-AdminRevenueAnalytics {
    Write-Section "TEST: Admin - Revenue Analytics"
    
    $response = Invoke-API -Method "GET" -Endpoint "/payment/admin/revenue?days=7" `
                          -Headers $AdminHeaders
    
    if ($response) {
        Write-Success "Retrieved revenue data"
        if ($OutputFormat -eq "detailed") {
            $response.data.revenue | ConvertTo-Json | Write-Host
        }
    }
}

function Test-AdminPendingPayments {
    Write-Section "TEST: Admin - Pending Payments"
    
    $response = Invoke-API -Method "GET" -Endpoint "/payment/admin/pending" `
                          -Headers $AdminHeaders
    
    if ($response) {
        $count = $response.data.pendingPayments.Count
        Write-Success "Retrieved $count pending payments"
        if ($OutputFormat -eq "detailed") {
            Write-Host "Count: $count"
        }
    }
}

function Test-AdminFailedPayments {
    Write-Section "TEST: Admin - Failed Payments (Last 24H)"
    
    $response = Invoke-API -Method "GET" -Endpoint "/payment/admin/failed?hours=24" `
                          -Headers $AdminHeaders
    
    if ($response) {
        $count = $response.data.failedPayments.Count
        Write-Success "Retrieved $count failed payments"
        if ($OutputFormat -eq "detailed") {
            Write-Host "Count: $count"
        }
    }
}

function Test-AdminPendingRefunds {
    Write-Section "TEST: Admin - Pending Refunds"
    
    $response = Invoke-API -Method "GET" -Endpoint "/payment/admin/refunds/pending" `
                          -Headers $AdminHeaders
    
    if ($response) {
        $count = $response.data.pendingRefunds.Count
        Write-Success "Retrieved $count pending refunds"
        if ($OutputFormat -eq "detailed") {
            Write-Host "Count: $count"
        }
    }
}

# ============================================================================
# TEST SUITES
# ============================================================================

function Run-AllConsumerTests {
    Write-Section "Running All Consumer Tests"
    Test-ConsumerInitiatePayment
    Test-ConsumerProcessPayment
    Test-ConsumerGetPaymentStatus
    Test-ConsumerPaymentHistory
    Test-ConsumerVerifyPayment
    Test-ConsumerInitiateRefund
    Test-ConsumerRefundStatus
}

function Run-AllAdminTests {
    Write-Section "Running All Admin Tests"
    Test-AdminViewAllPayments
    Test-AdminPaymentStatistics
    Test-AdminRevenueAnalytics
    Test-AdminPendingPayments
    Test-AdminFailedPayments
    Test-AdminPendingRefunds
}

function Run-AllTests {
    Initialize-TestData
    Run-AllConsumerTests
    Run-AllAdminTests
}

# ============================================================================
# SUMMARY
# ============================================================================

function Print-Summary {
    Write-Host "`n" -ForegroundColor Yellow
    Write-Host "Test Summary" -ForegroundColor Yellow
    Write-Host ("=" * 50) -ForegroundColor Yellow
    Write-Host "Passed: " -ForegroundColor White -NoNewline
    Write-Host "$($script:PassCount)" -ForegroundColor Green
    Write-Host "Failed: " -ForegroundColor White -NoNewline
    Write-Host "$($script:FailCount)" -ForegroundColor Red
    
    $total = $script:PassCount + $script:FailCount
    Write-Host "Total:  $total"
    
    if ($script:FailCount -eq 0) {
        Write-Host "`nAll tests passed! ✓" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`nSome tests failed." -ForegroundColor Red
        exit 1
    }
}

# ============================================================================
# MAIN
# ============================================================================

switch ($TestType) {
    "all" {
        Run-AllTests
    }
    "consumer" {
        Initialize-TestData
        Run-AllConsumerTests
    }
    "admin" {
        Initialize-TestData
        Run-AllAdminTests
    }
    "initiate" {
        Initialize-TestData
        Test-ConsumerInitiatePayment
    }
    "process" {
        Initialize-TestData
        Test-ConsumerInitiatePayment
        Test-ConsumerProcessPayment
    }
    "status" {
        Initialize-TestData
        Test-ConsumerInitiatePayment
        Test-ConsumerGetPaymentStatus
    }
    "history" {
        Initialize-TestData
        Test-ConsumerPaymentHistory
    }
    "verify" {
        Initialize-TestData
        Test-ConsumerInitiatePayment
        Test-ConsumerVerifyPayment
    }
    "refund" {
        Initialize-TestData
        Test-ConsumerInitiatePayment
        Test-ConsumerInitiateRefund
    }
    "stats" {
        Initialize-TestData
        Test-AdminPaymentStatistics
    }
    "revenue" {
        Initialize-TestData
        Test-AdminRevenueAnalytics
    }
}

Print-Summary
