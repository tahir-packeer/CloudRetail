# CloudRetail AWS Deployment Guide

This guide provides step-by-step instructions for deploying CloudRetail to AWS using EKS, Aurora, and ECR.

## Prerequisites Checklist

- [ ] AWS Account created and verified
- [ ] AWS CLI installed (`winget install Amazon.AWSCLI`)
- [ ] eksctl installed (`choco install eksctl`)
- [ ] kubectl installed (`choco install kubernetes-cli`)
- [ ] Docker Desktop running
- [ ] All Docker images built locally

## Estimated Costs

- **EKS Cluster**: $2.40/day ($0.10/hour)
- **Fargate vCPU**: $3-5/day (depends on pod count)
- **Aurora Serverless v2**: $4-6/day (0.5-2 ACU)
- **LoadBalancer**: $0.60/day ($0.025/hour)
- **ECR Storage**: $0.10/day (8 images)
- **Data Transfer**: $1-2/day (testing)
- **Total**: ~$12-15 for 3 days

## Phase 1: AWS Account Setup (30 minutes)

### 1.1 Create IAM User

```bash
# Login to AWS Console
# Navigate to IAM → Users → Add User

Username: cloudretail-deployer
Access type: Programmatic access

Attach policies:
- AmazonEKSClusterPolicy
- AmazonEKSWorkerNodePolicy
- AmazonEKSFargateExecutionRolePolicy
- AmazonEC2ContainerRegistryFullAccess
- AmazonRDSFullAccess
- AmazonS3FullAccess
- IAMFullAccess (for eksctl)
- AWSCloudFormationFullAccess (for eksctl)

# Download credentials CSV
```

### 1.2 Configure AWS CLI

```powershell
# Configure AWS credentials
aws configure

# Enter when prompted:
AWS Access Key ID: [YOUR_ACCESS_KEY]
AWS Secret Access Key: [YOUR_SECRET_KEY]
Default region name: ap-southeast-1
Default output format: json

# Verify configuration
aws sts get-caller-identity
```

## Phase 2: ECR Setup & Image Push (1 hour)

### 2.1 Build All Docker Images

```powershell
cd C:\Users\tahir\Downloads\CloudRetail\cloudretail-app

# Verify all images exist
docker images | Select-String "cloudretail"

# If any missing, rebuild:
docker-compose build
```

### 2.2 Push Images to ECR

```powershell
# Run the automated push script
.\scripts\push-to-ecr.ps1

# When prompted, enter your 12-digit AWS Account ID
# Script will:
# 1. Create 8 ECR repositories
# 2. Login to ECR
# 3. Tag all images
# 4. Push to ECR
# 5. Display ECR URIs
```

### 2.3 Update Kubernetes Manifests

```powershell
# Get your AWS Account ID
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$AWS_REGION = "ap-southeast-1"

# Update all k8s files with ECR URIs
Get-ChildItem k8s/*.yaml | ForEach-Object {
    (Get-Content $_.FullName) -replace 'REPLACE_WITH_ECR_URI', "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com" | Set-Content $_.FullName
}

# Verify replacements
Select-String -Path k8s/*.yaml -Pattern "REPLACE_WITH_ECR_URI"
# Should return no results

# Commit updated files
git add k8s/*.yaml
git commit -m "Update K8s manifests with ECR image URIs"
git push
```

## Phase 3: Aurora Database Setup (1 hour)

### 3.1 Create Aurora Cluster

**Option A: AWS Console (Recommended for beginners)**

1. Navigate to RDS → Create Database
2. Choose:
   - Engine: Aurora (MySQL Compatible)
   - Edition: Aurora Serverless v2
   - Template: Dev/Test
3. Settings:
   - DB cluster identifier: `cloudretail-cluster`
   - Master username: `admin`
   - Master password: `CloudRetail@2026`
4. Capacity settings:
   - Minimum ACU: 0.5
   - Maximum ACU: 2
5. Connectivity:
   - VPC: Default VPC
   - Public access: Yes (for testing)
   - Security group: Create new `cloudretail-db-sg`
6. Click Create Database (wait 10-15 minutes)

**Option B: AWS CLI**

```bash
aws rds create-db-cluster \
    --db-cluster-identifier cloudretail-cluster \
    --engine aurora-mysql \
    --engine-version 8.0.mysql_aurora.3.04.0 \
    --master-username admin \
    --master-user-password CloudRetail@2026 \
    --database-name cloudretail \
    --vpc-security-group-ids sg-xxxxxxxxx \
    --db-subnet-group-name default \
    --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=2 \
    --region ap-southeast-1

aws rds create-db-instance \
    --db-instance-identifier cloudretail-instance \
    --db-cluster-identifier cloudretail-cluster \
    --db-instance-class db.serverless \
    --engine aurora-mysql \
    --region ap-southeast-1
```

### 3.2 Configure Security Group

```bash
# Get your EKS VPC CIDR (after EKS creation)
$VPC_CIDR = "10.0.0.0/16"

# Get security group ID
$SG_ID = (aws rds describe-db-clusters --db-cluster-identifier cloudretail-cluster --query 'DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId' --output text)

# Allow access from EKS VPC
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 3306 \
    --cidr $VPC_CIDR
```

### 3.3 Initialize Database Schemas

```powershell
# Get Aurora endpoint
$DB_ENDPOINT = (aws rds describe-db-clusters --db-cluster-identifier cloudretail-cluster --query 'DBClusters[0].Endpoint' --output text)

Write-Host "Aurora Endpoint: $DB_ENDPOINT"

# Install MySQL client if needed
# choco install mysql

# Connect and initialize schemas
mysql -h $DB_ENDPOINT -u admin -pCloudRetail@2026 < infrastructure/mysql/auth_schema.sql
mysql -h $DB_ENDPOINT -u admin -pCloudRetail@2026 < infrastructure/mysql/catalog_schema.sql
mysql -h $DB_ENDPOINT -u admin -pCloudRetail@2026 < infrastructure/mysql/cart_schema.sql
mysql -h $DB_ENDPOINT -u admin -pCloudRetail@2026 < infrastructure/mysql/order_schema.sql
mysql -h $DB_ENDPOINT -u admin -pCloudRetail@2026 < infrastructure/mysql/payment_schema.sql
mysql -h $DB_ENDPOINT -u admin -pCloudRetail@2026 < infrastructure/mysql/analytics_schema.sql

# Verify databases created
mysql -h $DB_ENDPOINT -u admin -pCloudRetail@2026 -e "SHOW DATABASES;"
```

### 3.4 Update Kubernetes Secrets

```powershell
# Encode Aurora endpoint in Base64
$DB_ENDPOINT_BASE64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($DB_ENDPOINT))

Write-Host "Update k8s/secrets.yaml:"
Write-Host "Replace 'VVBEQVRFX1dJVEhfQVVST1JBX0VORFBPSU5U' with: $DB_ENDPOINT_BASE64"

# Or use PowerShell to update directly
(Get-Content k8s/secrets.yaml) -replace 'VVBEQVRFX1dJVEhfQVVST1JBX0VORFBPSU5U', $DB_ENDPOINT_BASE64 | Set-Content k8s/secrets.yaml

# Commit the change
git add k8s/secrets.yaml
git commit -m "Update Aurora endpoint in secrets"
git push
```

## Phase 4: EKS Cluster Setup (2 hours)

### 4.1 Create EKS Cluster

```bash
# Create cluster with Fargate (15-20 minutes)
eksctl create cluster \
    --name cloudretail-cluster \
    --region ap-southeast-1 \
    --fargate \
    --vpc-cidr 10.0.0.0/16

# Verify cluster created
aws eks describe-cluster --name cloudretail-cluster --region ap-southeast-1
```

### 4.2 Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig --region ap-southeast-1 --name cloudretail-cluster

# Verify connection
kubectl get nodes
kubectl get namespaces
```

### 4.3 Create Fargate Profile for default namespace

```bash
# Create Fargate profile for default namespace
eksctl create fargateprofile \
    --cluster cloudretail-cluster \
    --name cloudretail-profile \
    --namespace default \
    --region ap-southeast-1

# Verify profile
eksctl get fargateprofile --cluster cloudretail-cluster --region ap-southeast-1
```

## Phase 5: Deploy to Kubernetes (30 minutes)

### 5.1 Apply Kubernetes Manifests

```bash
# Apply in order
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/redis-deployment.yaml

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app=redis --timeout=300s

# Deploy all services
kubectl apply -f k8s/auth-deployment.yaml
kubectl apply -f k8s/catalog-deployment.yaml
kubectl apply -f k8s/cart-deployment.yaml
kubectl apply -f k8s/order-deployment.yaml
kubectl apply -f k8s/payment-deployment.yaml
kubectl apply -f k8s/analytics-deployment.yaml
kubectl apply -f k8s/gateway-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

### 5.2 Monitor Deployment

```bash
# Watch all pods
kubectl get pods --watch

# Check pod logs (if any issues)
kubectl logs -f deployment/auth-service
kubectl logs -f deployment/catalog-service
kubectl logs -f deployment/cart-service

# Describe pod for detailed info
kubectl describe pod <pod-name>
```

### 5.3 Get LoadBalancer URLs

```bash
# Get API Gateway URL (wait 3-5 minutes for LoadBalancer)
kubectl get svc api-gateway

# Get Frontend URL
kubectl get svc frontend-service

# Example output:
# NAME              TYPE           EXTERNAL-IP                                          PORT(S)
# api-gateway       LoadBalancer   a1b2c3d4e5.ap-southeast-1.elb.amazonaws.com          80:31234/TCP
# frontend-service  LoadBalancer   f6g7h8i9j0.ap-southeast-1.elb.amazonaws.com          80:31235/TCP
```

### 5.4 Update Frontend Configuration

```bash
# Get API Gateway URL
$API_GATEWAY_URL = (kubectl get svc api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Update ConfigMap
kubectl patch configmap cloudretail-config -p "{`"data`":{`"VITE_API_URL`":`"http://$API_GATEWAY_URL`"}}"

# Restart frontend to pick up new config
kubectl rollout restart deployment/frontend
```

## Phase 6: S3 Bucket Setup (15 minutes)

### 6.1 Create S3 Bucket

```bash
# Generate unique bucket name
$BUCKET_NAME = "cloudretail-product-images-$(Get-Random -Maximum 99999)"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region ap-southeast-1

# Configure CORS
@"
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
"@ | Out-File -Encoding utf8 cors.json

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors.json

# Update ConfigMap
kubectl patch configmap cloudretail-config -p "{`"data`":{`"S3_BUCKET_NAME`":`"$BUCKET_NAME`"}}"

# Restart catalog service
kubectl rollout restart deployment/catalog-service
```

## Phase 7: Testing & Verification (1 hour)

### 7.1 Access Application

```bash
# Get frontend URL
$FRONTEND_URL = (kubectl get svc frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

Write-Host "Frontend URL: http://$FRONTEND_URL"
Write-Host "Test accounts:"
Write-Host "  Admin:  admin@cloudretail.com / Password123!"
Write-Host "  Seller: seller@cloudretail.com / Password123!"
Write-Host "  Buyer:  buyer@cloudretail.com / Password123!"
```

### 7.2 Health Checks

```bash
# Check all pods are running
kubectl get pods

# Check services
kubectl get svc

# Test API Gateway health
curl http://$API_GATEWAY_URL/health

# Check logs for errors
kubectl logs -l app=api-gateway --tail=50
```

### 7.3 Functional Testing

1. **User Registration**: Create new account
2. **Login**: Test all 3 seed accounts
3. **Product Browsing**: View catalog
4. **Add to Cart**: Add products to cart
5. **Checkout**: Complete order with payment
6. **Order History**: View completed orders

## Phase 8: Monitoring Setup (30 minutes)

### 8.1 Enable Container Insights

```bash
# Install CloudWatch agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml

# Verify installation
kubectl get pods -n amazon-cloudwatch
```

### 8.2 Create CloudWatch Dashboard

1. Navigate to CloudWatch → Dashboards
2. Create Dashboard: `cloudretail-dashboard`
3. Add widgets:
   - EKS Cluster Metrics
   - Pod CPU/Memory Usage
   - LoadBalancer Request Count
   - Aurora Connections/CPU

## Optional: CloudFront CDN (30 minutes)

### 9.1 Create CloudFront Distribution

```bash
# Get ALB URL
$ALB_URL = (kubectl get svc frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Create distribution (AWS Console recommended)
# Navigate to CloudFront → Create Distribution
# Origin: $ALB_URL
# Viewer Protocol Policy: Redirect HTTP to HTTPS
# Cache Policy: CachingOptimized
```

## Cleanup (After Submission)

```bash
# Delete EKS cluster
eksctl delete cluster --name cloudretail-cluster --region ap-southeast-1

# Delete Aurora cluster
aws rds delete-db-cluster --db-cluster-identifier cloudretail-cluster --skip-final-snapshot

# Delete S3 bucket
aws s3 rb s3://$BUCKET_NAME --force

# Delete ECR repositories
$services = @("cloudretail-auth", "cloudretail-catalog", "cloudretail-cart", "cloudretail-order", "cloudretail-payment", "cloudretail-analytics", "cloudretail-gateway", "cloudretail-frontend")
foreach ($service in $services) {
    aws ecr delete-repository --repository-name $service --force
}
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name>

# Common issues:
# 1. ImagePullBackOff → ECR URIs incorrect
# 2. CrashLoopBackOff → Check logs for errors
# 3. Pending → Check Fargate profile namespace
```

### Database Connection Issues

```bash
# Test Aurora connectivity from a pod
kubectl run mysql-test --image=mysql:8.0 --rm -it --restart=Never -- mysql -h <aurora-endpoint> -u admin -pCloudRetail@2026

# Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id>
```

### LoadBalancer Not Getting External IP

```bash
# Check service
kubectl describe svc api-gateway

# Common issues:
# 1. Fargate profile missing → Create profile for default namespace
# 2. VPC subnets not tagged → Add kubernetes.io/cluster/<name>=owned tag
```

## Next Steps

- [ ] Complete load testing with k6
- [ ] Take screenshots of all components
- [ ] Create architecture diagrams
- [ ] Document deployment process in report
- [ ] Prepare presentation slides
- [ ] Submit by February 5, 2026 23:59
