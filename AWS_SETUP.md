# 🚀 Guia Completo - Deploy AWS

## ✅ Status Atual: Imagens Docker Enviadas

Suas imagens estão no ECR:
- `215665149732.dkr.ecr.us-east-1.amazonaws.com/usuarios-service:prod`
- `215665149732.dkr.ecr.us-east-1.amazonaws.com/reservas-service:prod`
- `215665149732.dkr.ecr.us-east-1.amazonaws.com/frontend-nginx:prod`

## 📋 Próximos Passos

### 1. Criar Infraestrutura AWS

Execute este comando para criar toda a infraestrutura:

```powershell
.\create-aws-infrastructure.ps1 -AwsAccountId "215665149732" -AwsRegion "us-east-1"
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.aws` com suas configurações:

```env
# Banco de dados (será criado automaticamente)
DB_HOST=reservas-db.cluster-xxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=SuaSenhaSegura123!
DB_NAME=reservas_db
DB_PORT=3306

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro-aqui

# Redis (será criado automaticamente)
REDIS_HOST=reservas-redis.xxxxx.cache.amazonaws.com

# RabbitMQ (será criado automaticamente)
RABBITMQ_HOST=reservas-rabbitmq.xxxxx.mq.us-east-1.amazonaws.com
RABBITMQ_USER=admin
RABBITMQ_PASS=SuaSenhaRabbitMQ123!
```

### 3. Verificar Status dos Serviços

```powershell
# Verificar clusters ECS
aws ecs describe-clusters --clusters reservas-cluster --region us-east-1

# Verificar serviços
aws ecs describe-services --cluster reservas-cluster --services usuarios-service reservas-service --region us-east-1

# Verificar tasks rodando
aws ecs list-tasks --cluster reservas-cluster --region us-east-1
```

### 4. Acessar a Aplicação

Após o deploy completo, você terá:

- **Frontend**: `https://seu-alb-url.us-east-1.elb.amazonaws.com`
- **API Usuários**: `https://seu-alb-url.us-east-1.elb.amazonaws.com/api/usuarios`
- **API Reservas**: `https://seu-alb-url.us-east-1.elb.amazonaws.com/api/reservas`

## 🔧 Comandos Úteis

### Verificar Logs
```powershell
# Logs do serviço de usuários
aws logs tail /ecs/usuarios-service --follow --region us-east-1

# Logs do serviço de reservas
aws logs tail /ecs/reservas-service --follow --region us-east-1
```

### Atualizar Serviços
```powershell
# Forçar nova implantação
aws ecs update-service --cluster reservas-cluster --service usuarios-service --force-new-deployment --region us-east-1
```

### Verificar Saúde dos Serviços
```powershell
# Status do ALB
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:215665149732:targetgroup/usuarios-tg/xxxxx --region us-east-1
```

## 🛠️ Troubleshooting

### Serviço não inicia
1. Verifique os logs: `aws logs tail /ecs/usuarios-service --region us-east-1`
2. Verifique as variáveis de ambiente no Task Definition
3. Verifique se o banco de dados está acessível

### Erro de conexão com banco
1. Verifique o Security Group do RDS
2. Confirme se o endpoint do RDS está correto
3. Teste conectividade: `telnet seu-rds-endpoint 3306`

### Frontend não carrega
1. Verifique se o ALB está roteando corretamente
2. Confirme se os Target Groups estão saudáveis
3. Verifique os logs do Nginx

## 💰 Custos Estimados (Free Tier)

- **ECS Fargate**: Gratuito (750h/mês)
- **RDS MySQL**: Gratuito (750h/mês db.t3.micro)
- **ALB**: ~$16/mês
- **ECR**: Gratuito (500MB)
- **CloudWatch**: Gratuito (5GB logs)

**Total estimado**: ~$16/mês (apenas o ALB)

## 🧹 Limpeza (Para evitar custos)

Quando quiser remover tudo:

```powershell
.\cleanup-aws.ps1 -AwsAccountId "215665149732" -AwsRegion "us-east-1"
```

---

**Próximo passo**: Execute `.\create-aws-infrastructure.ps1` para criar a infraestrutura completa!