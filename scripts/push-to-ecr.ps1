# CloudRetail ECR Push Script
# This script automates pushing Docker images to Amazon ECR

$ErrorActionPreference = "Stop"

# Configuration
$AWS_REGION = "ap-southeast-1"
$AWS_ACCOUNT_ID = Read-Host "Enter your AWS Account ID (12-digit number)"

Write-Host "`n=== CloudRetail ECR Push Script ===" -ForegroundColor Cyan
Write-Host "Region: $AWS_REGION" -ForegroundColor Yellow
Write-Host "Account: $AWS_ACCOUNT_ID`n" -ForegroundColor Yellow

# Services to push
$services = @(
    "cloudretail-auth",
    "cloudretail-catalog",
    "cloudretail-cart",
    "cloudretail-order",
    "cloudretail-payment",
    "cloudretail-analytics",
    "cloudretail-gateway",
    "cloudretail-frontend"
)

# Step 1: Create ECR repositories
Write-Host "Step 1: Creating ECR repositories..." -ForegroundColor Green
foreach ($service in $services) {
    Write-Host "  Creating repository: $service" -ForegroundColor Yellow
    try {
        aws ecr create-repository `
            --repository-name $service `
            --region $AWS_REGION `
            --image-scanning-configuration scanOnPush=true `
            --encryption-configuration encryptionType=AES256 2>$null
        Write-Host "    ✓ Created $service" -ForegroundColor Green
    } catch {
        if ($_ -match "RepositoryAlreadyExistsException") {
            Write-Host "    ✓ Repository $service already exists" -ForegroundColor Cyan
        } else {
            Write-Host "    ✗ Failed to create $service : $_" -ForegroundColor Red
            exit 1
        }
    }
}

# Step 2: Login to ECR
Write-Host "`nStep 2: Logging in to ECR..." -ForegroundColor Green
try {
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    Write-Host "  ✓ Logged in to ECR" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to login to ECR: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Tag and push images
Write-Host "`nStep 3: Tagging and pushing images..." -ForegroundColor Green
$ecrUris = @()

foreach ($service in $services) {
    $localImage = $service
    $ecrUri = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$service"
    $ecrTag = "$ecrUri`:latest"
    
    Write-Host "`n  Processing: $service" -ForegroundColor Yellow
    
    # Tag image
    Write-Host "    Tagging image..." -ForegroundColor Cyan
    try {
        docker tag $localImage $ecrTag
        Write-Host "      ✓ Tagged as $ecrTag" -ForegroundColor Green
    } catch {
        Write-Host "      ✗ Failed to tag $service : $_" -ForegroundColor Red
        Write-Host "      Make sure Docker image '$localImage' exists locally" -ForegroundColor Red
        continue
    }
    
    # Push image
    Write-Host "    Pushing to ECR..." -ForegroundColor Cyan
    try {
        docker push $ecrTag
        Write-Host "      ✓ Pushed $service" -ForegroundColor Green
        $ecrUris += "$service = $ecrTag"
    } catch {
        Write-Host "      ✗ Failed to push $service : $_" -ForegroundColor Red
        continue
    }
}

# Step 4: Display ECR URIs
Write-Host "`n=== ECR Image URIs ===" -ForegroundColor Cyan
Write-Host "Copy these URIs and update your k8s/*.yaml files:`n" -ForegroundColor Yellow
foreach ($uri in $ecrUris) {
    Write-Host "  $uri" -ForegroundColor White
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Update all k8s/*.yaml files:" -ForegroundColor Yellow
Write-Host "   Replace 'REPLACE_WITH_ECR_URI' with '$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com'" -ForegroundColor White
Write-Host "`n2. You can use this command to update all files at once:" -ForegroundColor Yellow
Write-Host "   Get-ChildItem k8s/*.yaml | ForEach-Object { (Get-Content `$_.FullName) -replace 'REPLACE_WITH_ECR_URI', '$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com' | Set-Content `$_.FullName }" -ForegroundColor Cyan
Write-Host "`n3. Commit the updated files to Git" -ForegroundColor Yellow
Write-Host "`n4. Proceed with Aurora database setup" -ForegroundColor Yellow

Write-Host "`n✓ ECR push complete!" -ForegroundColor Green
