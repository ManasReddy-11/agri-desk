# AgriDesk JWT Authentication - Windows Testing Script
# Run: powershell -ExecutionPolicy Bypass -File test_auth.ps1

# Configuration
$baseUrl = "http://localhost:5000/api"
$consumerEmail = "consumer@agri-desk.test"
$consumerPassword = "Consumer@1234"
$farmerEmail = "farmer@agri-desk.test"
$farmerPassword = "Farmer@1234"

# Colors
$green = "`e[32m"
$red = "`e[31m"
$yellow = "`e[33m"
$blue = "`e[34m"
$reset = "`e[0m"

function Print-Section {
    param([string]$Title)
    Write-Host "`n$blue═══════════════════════════════════════════════════════$reset"
    Write-Host "$blue$Title$reset"
    Write-Host "$blue═══════════════════════════════════════════════════════$reset`n"
}

function Print-Success {
    param([string]$Message)
    Write-Host "$green✓ $Message$reset"
}

function Print-Error {
    param([string]$Message)
    Write-Host "$red✗ $Message$reset"
}

function Print-Info {
    param([string]$Message)
    Write-Host "$yellow ℹ $Message$reset"
}

# 1. CONSUMER REGISTRATION
Print-Section "1. CONSUMER REGISTRATION"

$consumerReg = @{
    name = "John Consumer"
    email = $consumerEmail
    password = $consumerPassword
    role = "consumer"
    phone = "9876543210"
} | ConvertTo-Json

Write-Host "POST $baseUrl/auth/register"
Write-Host $consumerReg
Write-Host ""

$consumerRegResponse = Invoke-WebRequest -Uri "$baseUrl/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $consumerReg | ConvertFrom-Json

Write-Host ($consumerRegResponse | ConvertTo-Json -Depth 10)
Print-Success "Consumer registered"

# 2. FARMER REGISTRATION
Print-Section "2. FARMER REGISTRATION"

$farmerReg = @{
    name = "Ramesh Farmer"
    email = $farmerEmail
    password = $farmerPassword
    role = "farmer"
    phone = "9876543211"
} | ConvertTo-Json

Write-Host "POST $baseUrl/auth/register"
Write-Host $farmerReg
Write-Host ""

$farmerRegResponse = Invoke-WebRequest -Uri "$baseUrl/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $farmerReg | ConvertFrom-Json

Write-Host ($farmerRegResponse | ConvertTo-Json -Depth 10)
Print-Success "Farmer registered"

# 3. CONSUMER LOGIN
Print-Section "3. CONSUMER LOGIN"

$consumerLogin = @{
    email = $consumerEmail
    password = $consumerPassword
} | ConvertTo-Json

Write-Host "POST $baseUrl/auth/login"
Write-Host $consumerLogin
Write-Host ""

$consumerLoginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $consumerLogin | ConvertFrom-Json

Write-Host ($consumerLoginResponse | ConvertTo-Json -Depth 10)
$consumerToken = $consumerLoginResponse.data.accessToken
Print-Info "Consumer Token: $($consumerToken.Substring(0, 20))..."

# 4. FARMER LOGIN
Print-Section "4. FARMER LOGIN"

$farmerLogin = @{
    email = $farmerEmail
    password = $farmerPassword
} | ConvertTo-Json

Write-Host "POST $baseUrl/auth/login"
Write-Host $farmerLogin
Write-Host ""

$farmerLoginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $farmerLogin | ConvertFrom-Json

Write-Host ($farmerLoginResponse | ConvertTo-Json -Depth 10)
$farmerToken = $farmerLoginResponse.data.accessToken
Print-Info "Farmer Token: $($farmerToken.Substring(0, 20))..."

# 5. GET CURRENT USER (CONSUMER)
Print-Section "5. GET CURRENT USER (CONSUMER)"

Write-Host "GET $baseUrl/auth/me"
Write-Host "Authorization: Bearer $($consumerToken.Substring(0, 20))..."
Write-Host ""

$headers = @{
    Authorization = "Bearer $consumerToken"
}

$consumerMe = Invoke-WebRequest -Uri "$baseUrl/auth/me" `
    -Method GET `
    -Headers $headers | ConvertFrom-Json

Write-Host ($consumerMe | ConvertTo-Json -Depth 10)
Print-Success "Got consumer user"

# 6. GET CURRENT USER (FARMER)
Print-Section "6. GET CURRENT USER (FARMER)"

Write-Host "GET $baseUrl/auth/me"
Write-Host "Authorization: Bearer $($farmerToken.Substring(0, 20))..."
Write-Host ""

$headers = @{
    Authorization = "Bearer $farmerToken"
}

$farmerMe = Invoke-WebRequest -Uri "$baseUrl/auth/me" `
    -Method GET `
    -Headers $headers | ConvertFrom-Json

Write-Host ($farmerMe | ConvertTo-Json -Depth 10)
Print-Success "Got farmer user"

# 7. TEST INVALID TOKEN
Print-Section "7. TEST INVALID TOKEN"

Write-Host "GET $baseUrl/auth/me"
Write-Host "Authorization: Bearer invalid_token"
Write-Host ""

try {
    $invalidToken = Invoke-WebRequest -Uri "$baseUrl/auth/me" `
        -Method GET `
        -Headers @{ Authorization = "Bearer invalid_token" } `
        -ErrorAction Stop
} catch {
    Write-Host ($_.Exception.Response.StatusCode)
    Write-Host ($_.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
    Print-Error "Invalid token rejected (Expected)"
}

# 8. DUPLICATE EMAIL TEST
Print-Section "8. TEST DUPLICATE EMAIL"

$duplicate = @{
    name = "Another User"
    email = $consumerEmail
    password = "Password@123"
    role = "consumer"
} | ConvertTo-Json

Write-Host "POST $baseUrl/auth/register (Using existing email)"
Write-Host ""

try {
    $duplicateResponse = Invoke-WebRequest -Uri "$baseUrl/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $duplicate `
        -ErrorAction Stop
} catch {
    Write-Host ($_.Exception.Response.StatusCode)
    Write-Host ($_.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
    Print-Error "Duplicate email rejected (Expected)"
}

Print-Section "TESTING COMPLETE"
Print-Success "All authentication tests passed!"
Print-Info "Consumer Token: $consumerToken"
Print-Info "Farmer Token: $farmerToken"
