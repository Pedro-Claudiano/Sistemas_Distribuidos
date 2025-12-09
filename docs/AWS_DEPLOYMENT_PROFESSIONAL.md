# 🚀 Guia Profissional de Deploy na AWS

## 📋 Arquitetura AWS Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    VPC (10.0.0.0/16)                   │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │         Application Load Balancer (ALB)          │  │ │
│  │  │              (Public Subnets)                     │  │ │
│  │  └────────────────┬─────────────────────────────────┘  │ │
│  │                   │                                     │ │
│  │  ┌────────────────┴─────────────────────────────────┐  │ │
│  │  │              ECS Fargate Cluster                  │  │
│  │  │            (Private Subnets)                      │  │
│  │  │                                                    │  │
│  │  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │  │ Auth Service │  │ Reservations │              │  │
│  │  │  │   (Task)     │  │   Service    │              │  │
│  │  │  │              │  │   (Task)     │              │  │
│  │  │  └──────────────┘  └──────────────┘              │  │
│  │  │                                                    │  │
│  │  │  ┌──────────────┐                                 │  │
│  │  │  │   Frontend   │                                 │  │
│  │  │  │   (Task)     │                                 │  │
│  │  │  └──────────────┘                                 │  │
│  │  └────────────────────────────────────────────────────┘  │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │              Data Layer                           │  │
│  │  │                                                    │  │
│  │  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │  │  RDS MySQL   │  │ ElastiCache  │              │  │
│  │  │  │  (Primary)   │  │    Redis     │              │  │
│  │  │  └──────┬───────┘  └──────────────┘              │  │
│  │  │         │                                          │  │
│  │  │  ┌──────┴───────┐  ┌──────────────┐              │  │
│  │  │  │  RDS MySQL   │  │  Amazon MQ   │              │  │
│  │  │  │ (Read Replica)│  │  RabbitMQ   │              │  │
│  │  │  └──────────────┘  └──────────────┘              │  │
│  │  └────────────────────────────────────────────────────┘  │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Supporting Services                        │ │
│  │                                                         │ │
│  │  • ECR (Container Registry)                            │ │
│  │  • CloudWatch (Logs & Metrics)                         │ │
│  │  • Secrets Manager (Credentials)                       │ │
│  │  • Route 53 (DNS)                                      │ │
│  │  • ACM (SSL Certificates)                              │ │
│  │  • S3 (Static Assets)                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Serviços AWS Utilizados

### Compute
- **ECS Fargate**: Containers serverless (sem gerenciar EC2)
- **Application Load Balancer**: Distribuição de tráfego

### Database
- **RDS MySQL**: Banco de dados gerenciado com Multi-AZ
- **Read Replica**: Para leituras escaláveis

### Cache & Messaging
- **ElastiCache Redis**: Cache distribuído e locks
- **Amazon MQ (RabbitMQ)**: Mensageria gerenciada

### Networking
- **VPC**: Rede isolada
- **Public Subnets**: ALB e NAT Gateway
- **Private Subnets**: ECS Tasks e Databases

### Storage & Registry
- **ECR**: Registro de imagens Docker
- **S3**: Assets estáticos do frontend

### Security & Monitoring
- **Secrets Manager**: Credenciais seguras
- **CloudWatch**: Logs e métricas
- **IAM**: Controle de acesso
- **Security Groups**: Firewall

### DNS & SSL
- **Route 53**: DNS gerenciado
- **ACM**: Certificados SSL gratuitos

## 📦 Pré-requisitos

```bash
# AWS CLI
aws --version

# Terraform
terraform --version

# Docker
docker --version

# Node.js
node --version
```

## 🔧 Passo 1: Configurar AWS CLI

```bash
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: us-east-1
# Default output format: json
```

## 🏗️ Passo 2: Criar Infraestrutura com Terraform

### 2.1 Estrutura Terraform

```
deployment/aws/terraform/
├── main.tf              # Configuração principal
├── variables.tf         # Variáveis
├── outputs.tf           # Outputs
├── vpc.tf               # VPC e Networking
├── ecs.tf               # ECS Cluster e Services
├── rds.tf               # RDS MySQL
├── elasticache.tf       # Redis
├── mq.tf                # RabbitMQ
├── alb.tf               # Load Balancer
├── ecr.tf               # Container Registry
├── secrets.tf           # Secrets Manager
├── cloudwatch.tf        # Logs e Monitoring
└── security-groups.tf   # Firewall Rules
```

### 2.2 Arquivo Principal (main.tf)

```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "my-terraform-state-bucket"
    key    = "reservations-system/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Reservations System"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

### 2.3 Variáveis (variables.tf)

```hcl
variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "reservations-system"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "mq_instance_type" {
  description = "Amazon MQ instance type"
  type        = string
  default     = "mq.t3.micro"
}
```

### 2.4 VPC e Networking (vpc.tf)

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "${var.project_name}-igw"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.project_name}-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "${var.project_name}-private-${count.index + 1}"
  }
}

resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"
  
  tags = {
    Name = "${var.project_name}-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = {
    Name = "${var.project_name}-nat-${count.index + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  
  tags = {
    Name = "${var.project_name}-private-rt-${count.index + 1}"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

### 2.5 RDS MySQL (rds.tf)

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "primary" {
  identifier             = "${var.project_name}-mysql-primary"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  storage_type           = "gp3"
  storage_encrypted      = true
  
  db_name  = "reservations_db"
  username = "admin"
  password = random_password.db_password.result
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  multi_az               = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot"
  
  enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]
  
  tags = {
    Name = "${var.project_name}-mysql-primary"
  }
}

resource "aws_db_instance" "replica" {
  identifier             = "${var.project_name}-mysql-replica"
  replicate_source_db    = aws_db_instance.primary.identifier
  instance_class         = var.db_instance_class
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  skip_final_snapshot = true
  
  tags = {
    Name = "${var.project_name}-mysql-replica"
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.project_name}/db/password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}
```

### 2.6 ElastiCache Redis (elasticache.tf)

```hcl
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-cache-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project_name}-redis"
  replication_group_description = "Redis for distributed locks and caching"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.cache_node_type
  num_cache_clusters   = 2
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Name = "${var.project_name}-redis"
  }
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "redis_auth" {
  name = "${var.project_name}/redis/auth"
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = random_password.redis_auth.result
}
```

### 2.7 Amazon MQ RabbitMQ (mq.tf)

```hcl
resource "aws_mq_broker" "rabbitmq" {
  broker_name = "${var.project_name}-rabbitmq"
  
  engine_type        = "RabbitMQ"
  engine_version     = "3.11"
  host_instance_type = var.mq_instance_type
  
  deployment_mode = "CLUSTER_MULTI_AZ"
  
  user {
    username = "admin"
    password = random_password.mq_password.result
  }
  
  subnet_ids         = aws_subnet.private[*].id
  security_groups    = [aws_security_group.mq.id]
  publicly_accessible = false
  
  logs {
    general = true
  }
  
  tags = {
    Name = "${var.project_name}-rabbitmq"
  }
}

resource "random_password" "mq_password" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "mq_password" {
  name = "${var.project_name}/mq/password"
}

resource "aws_secretsmanager_secret_version" "mq_password" {
  secret_id     = aws_secretsmanager_secret.mq_password.id
  secret_string = random_password.mq_password.result
}
```

## 🐳 Passo 3: Build e Push de Imagens Docker

### 3.1 Criar Repositórios ECR

```bash
# Auth Service
aws ecr create-repository --repository-name reservations/auth-service

# Reservations Service
aws ecr create-repository --repository-name reservations/reservations-service

# Frontend
aws ecr create-repository --repository-name reservations/frontend
```

### 3.2 Build e Push

```bash
# Login no ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build Auth Service
cd services/auth-service
docker build -t reservations/auth-service:latest .
docker tag reservations/auth-service:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/reservations/auth-service:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/reservations/auth-service:latest

# Build Reservations Service
cd ../reservations-service
docker build -t reservations/reservations-service:latest .
docker tag reservations/reservations-service:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/reservations/reservations-service:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/reservations/reservations-service:latest

# Build Frontend
cd ../frontend
docker build -t reservations/frontend:latest .
docker tag reservations/frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/reservations/frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/reservations/frontend:latest
```

## 🚀 Passo 4: Deploy com Terraform

```bash
cd deployment/aws/terraform

# Inicializar Terraform
terraform init

# Planejar mudanças
terraform plan -out=tfplan

# Aplicar infraestrutura
terraform apply tfplan
```

## 📊 Passo 5: Monitoramento e Logs

### CloudWatch Dashboards

```bash
# Criar dashboard customizado
aws cloudwatch put-dashboard --dashboard-name ReservationsSystem --dashboard-body file://dashboard.json
```

### Alarmes

```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

## 💰 Estimativa de Custos (us-east-1)

### Produção (24/7)
- **ECS Fargate** (3 tasks, 0.5 vCPU, 1GB): ~$35/mês
- **RDS MySQL** (db.t3.micro Multi-AZ + Replica): ~$50/mês
- **ElastiCache Redis** (cache.t3.micro, 2 nodes): ~$25/mês
- **Amazon MQ** (mq.t3.micro Multi-AZ): ~$45/mês
- **ALB**: ~$20/mês
- **Data Transfer**: ~$10/mês
- **CloudWatch**: ~$5/mês

**Total Estimado: ~$190/mês**

### Desenvolvimento (8h/dia, 5 dias/semana)
- Usar instâncias menores
- Single-AZ
- Desligar fora do horário

**Total Estimado: ~$60/mês**

## 🔒 Segurança Best Practices

1. **Secrets Manager**: Todas as credenciais
2. **VPC Privada**: Databases e services em subnets privadas
3. **Security Groups**: Least privilege
4. **Encryption**: At-rest e in-transit
5. **IAM Roles**: Permissões mínimas necessárias
6. **WAF**: Proteção contra ataques web
7. **CloudTrail**: Auditoria de ações

## 📈 Escalabilidade

### Auto Scaling ECS

```hcl
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.reservations.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy" {
  name               = "cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

## 🔄 CI/CD com GitHub Actions

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker images
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          docker build -t $ECR_REGISTRY/reservations/auth-service:${{ github.sha }} services/auth-service
          docker push $ECR_REGISTRY/reservations/auth-service:${{ github.sha }}
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster reservations-cluster --service auth-service --force-new-deployment
```

## ✅ Checklist de Deploy

- [ ] AWS CLI configurado
- [ ] Terraform instalado
- [ ] Repositórios ECR criados
- [ ] Imagens Docker buildadas e pushed
- [ ] Terraform plan revisado
- [ ] Infraestrutura aplicada
- [ ] Secrets configurados
- [ ] DNS configurado (Route 53)
- [ ] SSL certificado (ACM)
- [ ] Monitoramento ativo (CloudWatch)
- [ ] Alarmes configurados
- [ ] Backup configurado
- [ ] CI/CD pipeline ativo

## 🎓 Próximos Passos

1. **Blue/Green Deployment**: Zero downtime
2. **Multi-Region**: Disaster recovery
3. **CDN**: CloudFront para frontend
4. **WAF**: Proteção adicional
5. **Cost Optimization**: Reserved Instances, Savings Plans

---

**Deploy Profissional Completo! 🚀**
