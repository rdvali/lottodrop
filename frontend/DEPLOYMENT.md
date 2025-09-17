# 🚀 Deployment Guide

This guide covers deployment strategies for the LottoDrop frontend across different environments.

## 🏗️ Build Process

### Development Build
```bash
npm run dev
# Starts Vite development server with HMR
# Accessible at http://localhost:5173
```

### Production Build
```bash
npm run build
# Creates optimized build in /dist directory
# Includes code splitting, minification, and optimization
```

### Build Verification
```bash
npm run preview
# Preview production build locally
npm run lighthouse
# Run performance audit
```

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.x or higher
- Docker Compose 2.x or higher

### Single Container Deployment

#### Build Image
```bash
# Build production image
docker build -t lottodrop-frontend:latest .

# Build with environment variables
docker build \
  --build-arg VITE_API_URL=https://api.lottodrop.com \
  --build-arg VITE_WS_URL=wss://api.lottodrop.com \
  --build-arg VITE_SENTRY_DSN=your-sentry-dsn \
  --build-arg VITE_APP_VERSION=1.2.0 \
  -t lottodrop-frontend:1.2.0 .
```

#### Run Container
```bash
# Run with default configuration
docker run -d \
  --name lottodrop-frontend \
  -p 8080:8080 \
  lottodrop-frontend:latest

# Run with custom environment
docker run -d \
  --name lottodrop-frontend \
  -p 8080:8080 \
  --env-file .env.production \
  lottodrop-frontend:latest
```

### Docker Compose Deployment

#### Environment Configuration
Create `.env.production`:
```env
# API Configuration
VITE_API_URL=https://api.lottodrop.com
VITE_WS_URL=wss://api.lottodrop.com

# Sentry Configuration
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# Application Configuration
VITE_APP_VERSION=1.2.0
FRONTEND_PORT=8080

# Security
NODE_ENV=production
```

#### Start Services
```bash
# Start in production mode
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f frontend

# Scale service
docker-compose up -d --scale frontend=3

# Stop services
docker-compose down
```

#### Health Checks
```bash
# Check container health
docker-compose ps

# Test health endpoint
curl http://localhost:8080/health
```

## ☁️ Cloud Deployment

### AWS Deployment

#### ECS Fargate
```json
{
  "family": "lottodrop-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "your-registry/lottodrop-frontend:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "VITE_API_URL",
          "value": "https://api.lottodrop.com"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Application Load Balancer
```yaml
# ALB Target Group
TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    HealthCheckPath: /health
    HealthCheckProtocol: HTTP
    HealthCheckIntervalSeconds: 30
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3
    TargetType: ip
    Protocol: HTTP
    Port: 8080
```

### Google Cloud Platform

#### Cloud Run Deployment
```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: lottodrop-frontend
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containers:
      - image: gcr.io/your-project/lottodrop-frontend:latest
        ports:
        - containerPort: 8080
        env:
        - name: VITE_API_URL
          value: "https://api.lottodrop.com"
        resources:
          limits:
            memory: "512Mi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
```

```bash
# Deploy to Cloud Run
gcloud run deploy lottodrop-frontend \
  --image gcr.io/your-project/lottodrop-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

### Azure Container Instances

#### ARM Template
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.ContainerInstance/containerGroups",
      "apiVersion": "2019-12-01",
      "name": "lottodrop-frontend",
      "location": "[resourceGroup().location]",
      "properties": {
        "containers": [
          {
            "name": "frontend",
            "properties": {
              "image": "your-registry/lottodrop-frontend:latest",
              "ports": [
                {
                  "port": 8080,
                  "protocol": "TCP"
                }
              ],
              "environmentVariables": [
                {
                  "name": "VITE_API_URL",
                  "value": "https://api.lottodrop.com"
                }
              ],
              "resources": {
                "requests": {
                  "cpu": 0.5,
                  "memoryInGb": 1.0
                }
              }
            }
          }
        ],
        "ipAddress": {
          "type": "Public",
          "ports": [
            {
              "port": 8080,
              "protocol": "TCP"
            }
          ]
        },
        "osType": "Linux"
      }
    }
  ]
}
```

## 🌐 CDN Configuration

### CloudFlare Setup
```javascript
// cloudflare-workers.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Cache static assets
  if (url.pathname.match(/\.(js|css|png|jpg|ico|woff2?)$/)) {
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);
    
    if (!response) {
      response = await fetch(request);
      if (response.status === 200) {
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...response.headers,
            'Cache-Control': 'public, max-age=31536000'
          }
        });
        event.waitUntil(cache.put(cacheKey, response.clone()));
      }
    }
    return response;
  }
  
  // Serve from origin
  return fetch(request);
}
```

### AWS CloudFront
```yaml
Distribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:
      - DomainName: your-alb.us-east-1.elb.amazonaws.com
        Id: origin
        CustomOriginConfig:
          HTTPPort: 80
          OriginProtocolPolicy: http-only
      DefaultCacheBehavior:
        TargetOriginId: origin
        ViewerProtocolPolicy: redirect-to-https
        Compress: true
        CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # Managed-CachingOptimized
      CacheBehaviors:
      - PathPattern: "*.js"
        TargetOriginId: origin
        ViewerProtocolPolicy: https-only
        CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6 # Managed-CachingOptimizedForUncompressedObjects
      - PathPattern: "*.css"
        TargetOriginId: origin
        ViewerProtocolPolicy: https-only
        CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
      PriceClass: PriceClass_100
      Enabled: true
```

## 🔧 Environment Management

### Environment Variables

#### Development (.env.development)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_SENTRY_DSN=
VITE_APP_VERSION=dev
NODE_ENV=development
```

#### Staging (.env.staging)
```env
VITE_API_URL=https://api-staging.lottodrop.com
VITE_WS_URL=wss://api-staging.lottodrop.com
VITE_SENTRY_DSN=https://staging-dsn@sentry.io/project
VITE_APP_VERSION=staging-${GIT_SHA}
NODE_ENV=production
```

#### Production (.env.production)
```env
VITE_API_URL=https://api.lottodrop.com
VITE_WS_URL=wss://api.lottodrop.com
VITE_SENTRY_DSN=https://production-dsn@sentry.io/project
VITE_APP_VERSION=${GIT_SHA}
NODE_ENV=production
```

### Secrets Management

#### AWS Secrets Manager
```bash
# Store secrets
aws secretsmanager create-secret \
  --name "lottodrop/frontend/production" \
  --description "Frontend production secrets" \
  --secret-string '{
    "VITE_SENTRY_DSN": "https://your-dsn@sentry.io/project",
    "API_TOKEN": "your-api-token"
  }'

# Retrieve in deployment script
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "lottodrop/frontend/production" \
  --query SecretString --output text)
```

#### HashiCorp Vault
```bash
# Store secrets
vault kv put secret/lottodrop/frontend \
  sentry_dsn="https://your-dsn@sentry.io/project" \
  api_token="your-api-token"

# Retrieve in deployment
vault kv get -json secret/lottodrop/frontend
```

## 📊 Monitoring Setup

### Health Check Endpoints
The application exposes several health check endpoints:

```bash
# Basic health check
curl http://localhost:8080/health
# Response: "healthy"

# Detailed health information (if implemented)
curl http://localhost:8080/api/health
# Response: JSON with service status
```

### Logging Configuration

#### Structured Logging
```nginx
# nginx.conf logging format
log_format json escape=json '{
  "timestamp": "$time_iso8601",
  "remote_addr": "$remote_addr",
  "remote_user": "$remote_user",
  "request": "$request",
  "status": "$status",
  "body_bytes_sent": "$body_bytes_sent",
  "http_referer": "$http_referer",
  "http_user_agent": "$http_user_agent",
  "request_time": "$request_time",
  "upstream_response_time": "$upstream_response_time"
}';

access_log /var/log/nginx/access.log json;
```

#### Log Aggregation
```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  frontend:
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: lottodrop.frontend
```

### Metrics Collection

#### Prometheus Metrics
```nginx
# nginx-prometheus.conf
server {
  location /metrics {
    access_log off;
    allow 10.0.0.0/8;
    deny all;
    
    # Nginx metrics endpoint
    stub_status on;
  }
}
```

## 🚀 CI/CD Integration

### GitHub Actions Secrets
Required repository secrets:
```bash
# Docker Registry
DOCKER_USERNAME
DOCKER_PASSWORD

# Cloud Provider Credentials
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
GOOGLE_APPLICATION_CREDENTIALS
AZURE_CREDENTIALS

# Application Secrets
VITE_SENTRY_DSN
VITE_API_URL_PROD
VITE_WS_URL_PROD

# Notification
SLACK_WEBHOOK_URL
```

### Deployment Strategies

#### Blue-Green Deployment
```bash
#!/bin/bash
# deploy-blue-green.sh

# Deploy to blue environment
docker-compose -f docker-compose.blue.yml up -d

# Health check
sleep 30
curl -f http://blue.lottodrop.com/health

# Switch traffic
# Update load balancer to point to blue
aws elbv2 modify-target-group --target-group-arn $TG_ARN --targets Id=blue-instance

# Clean up green environment
docker-compose -f docker-compose.green.yml down
```

#### Rolling Deployment
```bash
#!/bin/bash
# deploy-rolling.sh

# Update instances one by one
for instance in $(aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId' --output text); do
  # Remove from load balancer
  aws elbv2 deregister-targets --target-group-arn $TG_ARN --targets Id=$instance
  
  # Wait for draining
  sleep 60
  
  # Update instance
  ssh $instance "cd /opt/lottodrop && docker-compose pull && docker-compose up -d"
  
  # Health check
  curl -f http://$instance:8080/health
  
  # Add back to load balancer
  aws elbv2 register-targets --target-group-arn $TG_ARN --targets Id=$instance
  
  sleep 30
done
```

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Check Node.js version
node --version  # Should be 18.x or higher
```

#### Container Issues
```bash
# Check container logs
docker logs lottodrop-frontend

# Inspect container
docker inspect lottodrop-frontend

# Debug container
docker exec -it lottodrop-frontend sh
```

#### Network Issues
```bash
# Test connectivity
curl -v http://localhost:8080/health

# Check port binding
netstat -tlnp | grep :8080

# Test DNS resolution
nslookup api.lottodrop.com
```

### Performance Monitoring

#### Application Metrics
```bash
# Check bundle size
npm run build:analyze

# Lighthouse audit
npm run lighthouse

# Load testing
# artillery quick --count 10 --num 100 http://localhost:8080
```

#### Infrastructure Metrics
```bash
# Container resource usage
docker stats lottodrop-frontend

# System resource usage
htop
iostat -x 1
```

### Security Checklist

#### Pre-deployment Security Checks
- [ ] All secrets are properly configured
- [ ] CSP headers are correctly set
- [ ] HTTPS is enforced
- [ ] Security headers are present
- [ ] Dependencies are up to date
- [ ] No sensitive data in logs
- [ ] Rate limiting is configured
- [ ] Input validation is implemented

#### Post-deployment Security Verification
```bash
# Check security headers
curl -I https://lottodrop.com

# Test CSP
# Check browser developer console for CSP violations

# Verify HTTPS
curl -I https://lottodrop.com | grep -i strict-transport-security

# Test rate limiting
# Send multiple rapid requests and verify 429 responses
```

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/best-practices/)
- [Nginx Security Guide](https://nginx.org/en/docs/http/ngx_http_secure_link_module.html)
- [AWS ECS Deployment Guide](https://docs.aws.amazon.com/ecs/)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Azure Container Instances](https://docs.microsoft.com/en-us/azure/container-instances/)

For additional support, contact the DevOps team or refer to the project documentation.