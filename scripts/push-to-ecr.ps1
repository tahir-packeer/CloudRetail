# CloudRetail ECR Push Script
# This script automates pushing Docker images to Amazon ECR

$ErrorActionPreference = "Continue"

# Configuration
$AWS_REGION = "ap-southeast-1"
$AWS_ACCOUNT_ID = "977098992607"

Write-Host "`n=== CloudRetail ECR Push Script ===" -ForegroundColor Cyan
Write-Host "Region: $AWS_REGION" -ForegroundColor Yellow
Write-Host "Account: $AWS_ACCOUNT_ID`n" -ForegroundColor Yellow

# Services to push (7 services - auth replaced by Cognito)
$services = @(
    @{name = "cloudretail-catalog"; image = "cloudretail-app-catalog-service" },
    @{name = "cloudretail-cart"; image = "cloudretail-app-cart-service" },
    @{name = "cloudretail-order"; image = "cloudretail-app-order-service" },
    @{name = "cloudretail-payment"; image = "cloudretail-app-payment-service" },
    @{name = "cloudretail-analytics"; image = "cloudretail-app-analytics-service" },
    @{name = "cloudretail-gateway"; image = "cloudretail-app-api-gateway" },
    @{name = "cloudretail-frontend"; image = "cloudretail-app-frontend" }
)

# Step 1: Create ECR repositories
Write-Host "Step 1: Creating ECR repositories..." -ForegroundColor Green
foreach ($service in $services) {
    $serviceName = $service.name
    Write-Host "  Creating repository: $serviceName" -ForegroundColor Yellow
    
    $result = aws ecr create-repository `
        --repository-name $serviceName `
        --region $AWS_REGION `
        --image-scanning-configuration scanOnPush=true `
        --encryption-configuration encryptionType=AES256 `
        --no-cli-pager 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Created $serviceName" -ForegroundColor Green
    }
    elseif ($result -match "RepositoryAlreadyExistsException") {
        Write-Host "    Repository $serviceName already exists" -ForegroundColor Cyan
    }
    else {
        Write-Host "    Failed to create $serviceName" -ForegroundColor Red
        Write-Host "      $result" -ForegroundColor Red
    }
}

# Step 2: Login to ECR
Write-Host "`nStep 2: Logging in to ECR..." -ForegroundColor Green
$loginCmd = "aws ecr get-login-password --region $AWS_REGION --no-cli-pager | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
Invoke-Expression $loginCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Logged in to ECR" -ForegroundColor Green
}
else {
    Write-Host "  Failed to login to ECR" -ForegroundColor Red
    exit 1
}

# Step 3: Tag and push images
Write-Host "`nStep 3: Tagging and pushing images..." -ForegroundColor Green
$ecrUris = @()

foreach ($service in $services) {
    $serviceName = $service.name
    $localImage = "$($service.image):latest"
    $ecrUri = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$serviceName"
    $ecrTag = "$ecrUri`:latest"
    
    Write-Host "`n  Processing: $serviceName" -ForegroundColor Yellow
    
    # Tag image
    Write-Host "    Tagging image..." -ForegroundColor Cyan
    docker tag $localImage $ecrTag
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      Tagged as $ecrTag" -ForegroundColor Green
    }
    else {
        Write-Host "      Failed to tag $serviceName" -ForegroundColor Red
        Write-Host "      Make sure Docker image '$localImage' exists locally" -ForegroundColor Red
        continue
    }
    
    # Push image
    Write-Host "    Pushing to ECR (this may take a while)..." -ForegroundColor Cyan
    docker push $ecrTag
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      Pushed $serviceName" -ForegroundColor Green
        $ecrUris += "$serviceName = $ecrTag"
    }
    else {
        Write-Host "      Failed to push $serviceName" -ForegroundColor Red
        continue
    }
}

# Step 4: Display ECR URIs
Write-Host "`n=== ECR Image URIs ===" -ForegroundColor Cyan
Write-Host "Copy these URIs for your k8s/*.yaml files:`n" -ForegroundColor Yellow
foreach ($uri in $ecrUris) {
    Write-Host "  $uri" -ForegroundColor White
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Update all k8s/*.yaml files:" -ForegroundColor Yellow
Write-Host "   Replace image URIs with the ones above" -ForegroundColor White
Write-Host "`n2. Commit the updated files to Git" -ForegroundColor Yellow
Write-Host "`n3. Proceed with Aurora database setup" -ForegroundColor Yellow
Write-Host "`nECR push complete!" -ForegroundColor Green
