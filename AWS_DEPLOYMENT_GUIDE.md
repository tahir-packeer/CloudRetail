# AWS Deployment Guide - CloudRetail E-commerce Platform
**ECDWA2 Assignment - February 2026**
**Student**: Tahir Nasoordeen Packeer (CB009900)

## Prerequisites Checklist
- ✅ AWS Account with $100-200 credit
- ✅ Credit card registered
- ✅ Docker Desktop installed
- ✅ Git repository ready
- ✅ All microservices functional locally

## Phase 1: AWS Account Setup (30 minutes)

### Step 1.1: Create IAM User for Deployment
1. Go to AWS Console → IAM → Users → Create User
2. Username: `cloudretail-deploy`
3. Attach policies:
   - `AmazonEKSClusterPolicy`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonEventBridgeFullAccess`
   - `CloudWatchFullAccess`
   - `IAMFullAccess` (for EKS role creation)
4. Create access key → **Save credentials safely**

### Step 1.2: Install AWS CLI
```powershell
# Download and install AWS CLI v2
winget install -e --id Amazon.AWSCLI

# Configure AWS CLI
aws configure
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: ap-southeast-1  # Singapore (closest to Sri Lanka)
# Default output format: json

# Verify
aws sts get-caller-identity
```

### Step 1.3: Install kubectl and eksctl
```powershell
# Install kubectl
choco install kubernetes-cli

# Install eksctl
choco install eksctl

# Verify installations
kubectl version --client
eksctl version
```

## Phase 2: Container Registry (Amazon ECR) - 15 minutes

### Step 2.1: Create ECR Repositories
```powershell
# Set variables
$REGION = "ap-southeast-1"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)

# Create repositories for all services
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

foreach ($service in $services) {
    aws ecr create-repository `
        --repository-name $service `
        --region $REGION `
        --image-scanning-configuration scanOnPush=true
}

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
```

### Step 2.2: Build and Push Images
```powershell
# Navigate to project root
cd C:\Users\tahir\Downloads\CloudRetail\cloudretail-app

# Build and push each service
$services = @{
    "auth-service" = "cloudretail-auth"
    "catalog-service" = "cloudretail-catalog"
    "cart-service" = "cloudretail-cart"
    "order-service" = "cloudretail-order"
    "payment-service" = "cloudretail-payment"
    "analytics-service" = "cloudretail-analytics"
    "api-gateway" = "cloudretail-gateway"
}

foreach ($dir in $services.Keys) {
    $repoName = $services[$dir]
    $imageUri = "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$repoName`:latest"
    
    Write-Host "Building $dir..."
    docker build -t $repoName "./services/$dir"
    docker tag "$repoName`:latest" $imageUri
    docker push $imageUri
    Write-Host "Pushed $imageUri" -ForegroundColor Green
}

# Build frontend
docker build -t cloudretail-frontend ./frontend
docker tag cloudretail-frontend:latest "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/cloudretail-frontend:latest"
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/cloudretail-frontend:latest"
```

## Phase 3: Database Setup (Amazon Aurora MySQL) - 20 minutes

### Step 3.1: Create Aurora Cluster
```powershell
# Create DB subnet group
aws rds create-db-subnet-group `
    --db-subnet-group-name cloudretail-db-subnet `
    --db-subnet-group-description "CloudRetail DB Subnet Group" `
    --subnet-ids subnet-xxx subnet-yyy `  # Get from VPC console
    --region $REGION

# Create Aurora MySQL cluster (Serverless v2 for cost optimization)
aws rds create-db-cluster `
    --db-cluster-identifier cloudretail-cluster `
    --engine aurora-mysql `
    --engine-version 8.0.mysql_aurora.3.05.2 `
    --master-username admin `
    --master-user-password "YourSecurePassword123!" `
    --database-name cloudretail `
    --db-subnet-group-name cloudretail-db-subnet `
    --vpc-security-group-ids sg-xxxxx `  # Get from VPC console
    --backup-retention-period 7 `
    --preferred-backup-window "03:00-04:00" `
    --region $REGION `
    --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=2

# Create DB instance
aws rds create-db-instance `
    --db-instance-identifier cloudretail-instance-1 `
    --db-instance-class db.serverless `
    --engine aurora-mysql `
    --db-cluster-identifier cloudretail-cluster `
    --region $REGION

# Wait for cluster to be available (~10-15 minutes)
aws rds wait db-cluster-available --db-cluster-identifier cloudretail-cluster --region $REGION
```

### Step 3.2: Get Database Endpoint
```powershell
$DB_ENDPOINT = (aws rds describe-db-clusters `
    --db-cluster-identifier cloudretail-cluster `
    --query "DBClusters[0].Endpoint" `
    --output text `
    --region $REGION)

Write-Host "Database Endpoint: $DB_ENDPOINT" -ForegroundColor Yellow
# Save this endpoint - you'll need it for Kubernetes secrets
```

### Step 3.3: Initialize Databases
```powershell
# Connect via MySQL client (install if needed: choco install mysql)
mysql -h $DB_ENDPOINT -u admin -p

# Run initialization SQL
CREATE DATABASE IF NOT EXISTS auth_db;
CREATE DATABASE IF NOT EXISTS catalog_db;
CREATE DATABASE IF NOT EXISTS cart_db;
CREATE DATABASE IF NOT EXISTS order_db;
CREATE DATABASE IF NOT EXISTS payment_db;
CREATE DATABASE IF NOT EXISTS analytics_db;

# Import schema (run each service's schema file)
USE auth_db;
SOURCE C:/Users/tahir/Downloads/CloudRetail/cloudretail-app/services/auth-service/schema.sql;

# Repeat for other databases...
```

## Phase 4: Kubernetes Cluster (Amazon EKS) - 30 minutes

### Step 4.1: Create EKS Cluster
```powershell
# Create EKS cluster with Fargate profile (serverless)
eksctl create cluster `
    --name cloudretail-cluster `
    --region $REGION `
    --fargate `
    --vpc-nat-mode HighlyAvailable `
    --zones "${REGION}a,${REGION}b,${REGION}c"

# This will take 15-20 minutes. It creates:
# - VPC with subnets
# - IAM roles
# - EKS control plane
# - Fargate profiles

# Verify cluster
kubectl get nodes
kubectl get namespaces
```

### Step 4.2: Create Kubernetes Secrets
```powershell
# Create secret for database credentials
kubectl create secret generic db-credentials `
    --from-literal=DB_HOST=$DB_ENDPOINT `
    --from-literal=DB_USER=admin `
    --from-literal=DB_PASSWORD="YourSecurePassword123!" `
    --namespace=default

# Create secret for JWT
kubectl create secret generic jwt-secret `
    --from-literal=JWT_SECRET="your-super-secret-jwt-key-change-in-production" `
    --namespace=default

# Create secret for Stripe (if using real keys)
kubectl create secret generic stripe-secret `
    --from-literal=STRIPE_SECRET_KEY="your-stripe-secret-key" `
    --from-literal=STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key" `
    --namespace=default
```

### Step 4.3: Create Kubernetes Deployments
Create file: `k8s-deployments.yaml`

```yaml
# Auth Service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/cloudretail-auth:latest
        ports:
        - containerPort: 3001
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_HOST
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_PASSWORD
        - name: DB_NAME
          value: "auth_db"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: JWT_SECRET
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  type: ClusterIP
  ports:
  - port: 3001
    targetPort: 3001
  selector:
    app: auth-service
---
# Repeat similar structure for other services:
# - catalog-service (port 3002)
# - cart-service (port 3003)
# - order-service (port 3004)
# - payment-service (port 3005)
# - analytics-service (port 3006)
# - api-gateway (port 3000, type: LoadBalancer)
# - frontend (port 80, type: LoadBalancer)
```

### Step 4.4: Deploy to Kubernetes
```powershell
# Replace placeholders in k8s-deployments.yaml
(Get-Content k8s-deployments.yaml) `
    -replace 'ACCOUNT_ID', $ACCOUNT_ID `
    -replace 'REGION', $REGION | `
    Set-Content k8s-deployments-final.yaml

# Apply deployments
kubectl apply -f k8s-deployments-final.yaml

# Check deployments
kubectl get deployments
kubectl get pods
kubectl get services

# Get Load Balancer URLs
kubectl get service api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
kubectl get service frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## Phase 5: S3 for Image Storage - 10 minutes

### Step 5.1: Create S3 Bucket
```powershell
$BUCKET_NAME = "cloudretail-product-images-$(Get-Random)"

# Create bucket
aws s3 mb "s3://$BUCKET_NAME" --region $REGION

# Configure CORS
$corsConfig = @"
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3000
        }
    ]
}
"@

$corsConfig | Out-File -FilePath cors.json -Encoding utf8
aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors.json

# Set public read policy (only for product images)
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy '{
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
    }]
}'
```

### Step 5.2: Update Catalog Service Environment
```powershell
# Add S3 bucket name to Kubernetes secret
kubectl create secret generic s3-config `
    --from-literal=S3_BUCKET_NAME=$BUCKET_NAME `
    --from-literal=S3_REGION=$REGION `
    --from-literal=STORAGE_TYPE=s3 `
    --namespace=default

# Restart catalog service
kubectl rollout restart deployment/catalog-service
```

## Phase 6: EventBridge for Event-Driven Architecture - 15 minutes

### Step 6.1: Create Event Bus
```powershell
# Create custom event bus
aws events create-event-bus `
    --name cloudretail-events `
    --region $REGION

# Create CloudWatch Log Group for event archiving
aws logs create-log-group `
    --log-group-name /aws/events/cloudretail `
    --region $REGION

# Create EventBridge rule to log all events
aws events put-rule `
    --name cloudretail-log-all `
    --event-bus-name cloudretail-events `
    --event-pattern '{"source":["cloudretail"]}' `
    --state ENABLED `
    --region $REGION

# Add CloudWatch Logs as target
aws events put-targets `
    --rule cloudretail-log-all `
    --event-bus-name cloudretail-events `
    --targets "Id=1,Arn=arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/events/cloudretail"
```

### Step 6.2: Create Lambda for Event Processing (Optional)
```powershell
# Create Lambda function for analytics event processing
# (This would process events and update real-time metrics)
# For time constraints, keep in-app event system
```

## Phase 7: Monitoring & Observability - 20 minutes

### Step 7.1: Enable Container Insights
```powershell
# Install CloudWatch agent
eksctl create iamserviceaccount `
    --name cloudwatch-agent `
    --namespace amazon-cloudwatch `
    --cluster cloudretail-cluster `
    --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy `
    --approve `
    --override-existing-serviceaccounts `
    --region $REGION

# Deploy CloudWatch agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluent-bit-quickstart.yaml
```

### Step 7.2: Create CloudWatch Dashboard
```powershell
# Create dashboard JSON (dashboard.json)
$dashboardBody = @"
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    ["AWS/EKS", "cluster_failed_node_count", {"stat": "Sum"}],
                    [".", "cluster_node_count", {"stat": "Average"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "EKS Cluster Health"
            }
        }
    ]
}
"@

aws cloudwatch put-dashboard `
    --dashboard-name CloudRetail-Metrics `
    --dashboard-body $dashboardBody `
    --region $REGION
```

## Phase 8: Testing & Validation - 30 minutes

### Step 8.1: Load Testing with k6
```powershell
# Install k6
choco install k6

# Create load test script (loadtest.js)
$loadTestScript = @"
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
    ],
};

export default function() {
    // Test API Gateway health
    let res = http.get('http://[API-GATEWAY-URL]/health');
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(1);
}
"@

$loadTestScript | Out-File -FilePath loadtest.js -Encoding utf8

# Run load test
k6 run loadtest.js --out json=loadtest-results.json
```

### Step 8.2: Verify All Services
```powershell
# Get API Gateway URL
$API_URL = kubectl get service api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Test each service
$endpoints = @(
    "/health",
    "/api/auth/health",
    "/api/products",
    "/api/cart",
    "/api/orders",
    "/api/payments/health",
    "/api/analytics/dashboard"
)

foreach ($endpoint in $endpoints) {
    $url = "http://$API_URL$endpoint"
    Write-Host "Testing: $url" -ForegroundColor Cyan
    curl $url
}
```

## Phase 9: Cost Optimization

### Estimated Monthly Costs:
- **EKS Cluster**: $73/month (control plane)
- **Fargate**: ~$50/month (2 vCPU, 4GB RAM per service × 8 services)
- **Aurora Serverless v2**: ~$40/month (0.5-2 ACU)
- **S3**: ~$5/month (100GB storage, 10k requests)
- **EventBridge**: ~$1/month (1M events)
- **CloudWatch**: ~$10/month (logs, metrics)
- **Data Transfer**: ~$20/month
**Total**: ~$200/month (within budget)

### Cost-Saving Tips:
1. Use Fargate Spot for non-critical workloads
2. Enable Aurora auto-pause after 5 minutes
3. Set S3 lifecycle policies (delete old images after 90 days)
4. Use CloudWatch Logs Insights instead of separate analytics tools
5. Delete resources after assignment submission!

## Phase 10: Documentation & Submission

### Architecture Diagram Checklist:
- ✅ VPC with subnets (public/private)
- ✅ EKS cluster with Fargate nodes
- ✅ Aurora MySQL cluster (multi-AZ)
- ✅ S3 bucket
- ✅ EventBridge event bus
- ✅ CloudWatch monitoring
- ✅ API Gateway Load Balancer
- ✅ All 8 microservices

### Final Report Sections:
1. **Architecture Design** (20%):
   - Cloud architecture diagram
   - Service interaction diagram
   - Database schema
   - Security architecture (JWT, IAM roles)

2. **Implementation** (40%):
   - Microservices implementation
   - Docker containerization
   - Kubernetes orchestration
   - Event-driven patterns
   - Circuit breakers
   - API documentation

3. **Testing** (20%):
   - Load testing results (k6)
   - Service health checks
   - Integration test results
   - Screenshots of working application

4. **Presentation** (20%):
   - 15-minute PowerPoint
   - Demo video (5 minutes)
   - Viva voce preparation

### Cleanup After Submission:
```powershell
# Delete EKS cluster (IMPORTANT: Saves $200/month!)
eksctl delete cluster --name cloudretail-cluster --region $REGION

# Delete Aurora cluster
aws rds delete-db-instance --db-instance-identifier cloudretail-instance-1 --skip-final-snapshot --region $REGION
aws rds delete-db-cluster --db-cluster-identifier cloudretail-cluster --skip-final-snapshot --region $REGION

# Delete S3 bucket
aws s3 rb "s3://$BUCKET_NAME" --force --region $REGION

# Delete ECR repositories
foreach ($service in $services) {
    aws ecr delete-repository --repository-name $service --force --region $REGION
}

# Delete EventBridge event bus
aws events delete-event-bus --name cloudretail-events --region $REGION
```

## Troubleshooting

### Issue: Pods not starting
```powershell
kubectl describe pod [pod-name]
kubectl logs [pod-name]
```

### Issue: Can't connect to database
```powershell
# Check security group allows EKS node IPs
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Test database connectivity from pod
kubectl run -it --rm debug --image=mysql:8.0 --restart=Never -- mysql -h $DB_ENDPOINT -u admin -p
```

### Issue: Load balancer not accessible
```powershell
# Check service type is LoadBalancer
kubectl get service api-gateway -o yaml

# Check AWS Load Balancer Controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

## Success Criteria Checklist:
- ✅ All 8 services running in EKS
- ✅ Aurora database connected
- ✅ S3 image storage working
- ✅ EventBridge receiving events
- ✅ Load testing passed (>95% success rate)
- ✅ API Gateway publicly accessible
- ✅ Frontend deployed and accessible
- ✅ CloudWatch metrics collected
- ✅ Architecture documented
- ✅ Code pushed to GitHub
- ✅ Final report complete
- ✅ Presentation ready

**Good luck with your ECDWA2 assignment!** 🚀
