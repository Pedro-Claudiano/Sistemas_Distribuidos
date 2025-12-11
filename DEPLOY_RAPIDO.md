# 🚀 Deploy Rápido AWS - Sistema de Reservas

## ⚡ Deploy em 3 Comandos

### 1. Configurar AWS CLI
```bash
aws configure
# Insira: Access Key, Secret Key, Region (us-east-1), Output (json)
```

### 2. Executar Deploy Automático
```bash
chmod +x deploy-aws.sh
./deploy-aws.sh
```

### 3. Aguardar Provisionamento (5-10 minutos)
```bash
# Verificar status
aws ecs describe-services --cluster sistema-reservas-cluster --services usuarios-service reservas-service
```

## 📋 O que será criado:

✅ **ECR Repositories** - Armazenamento das imagens Docker  
✅ **ECS Fargate Cluster** - Execução dos containers  
✅ **RDS MySQL** - Banco de dados principal  
✅ **ElastiCache Redis** - Cache distribuído  
✅ **Amazon MQ** - Sistema de mensageria  
✅ **CloudWatch Logs** - Monitoramento  

## 💰 Custo Estimado: ~$115/mês

## 🔧 Configuração Manual (se necessário):

### Variáveis de Ambiente:
```bash
export AWS_REGION=us-east-1
export DB_PASSWORD=SistemaReservas2024!
export JWT_SECRET=jwt-secret-super-seguro-2024
```

### Endpoints após deploy:
- **RDS**: `sistema-reservas-db.xxxxx.us-east-1.rds.amazonaws.com`
- **Redis**: `sistema-reservas-redis.xxxxx.cache.amazonaws.com`
- **ECS**: Tasks rodando em Fargate

## 🎯 Próximos Passos:

1. **Configurar Load Balancer** (ALB)
2. **Deploy Frontend** (S3 + CloudFront)  
3. **Configurar DNS** (Route 53)
4. **Configurar Auto Scaling**
5. **Configurar CI/CD**

## 🔍 Verificar Deploy:

```bash
# Status dos services
aws ecs list-tasks --cluster sistema-reservas-cluster

# Logs dos containers
aws logs tail /ecs/usuarios-service --follow
aws logs tail /ecs/reservas-service --follow

# Status RDS
aws rds describe-db-instances --db-instance-identifier sistema-reservas-db
```

## 🚨 Troubleshooting:

### Service não inicia:
```bash
aws ecs describe-services --cluster sistema-reservas-cluster --services usuarios-service
```

### Erro de conexão DB:
- Verificar Security Groups
- Confirmar endpoint RDS
- Validar credenciais

### Logs de erro:
```bash
aws logs filter-log-events --log-group-name /ecs/usuarios-service --filter-pattern ERROR
```

---

**Sistema distribuído na AWS em minutos!** 🎉