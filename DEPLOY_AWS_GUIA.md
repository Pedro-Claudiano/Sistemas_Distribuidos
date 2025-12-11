# 🚀 Guia de Deploy AWS Free Tier

## Resumo
Este guia vai subir sua aplicação de reserva de salas de forma **completamente distribuída** na AWS usando apenas recursos do **Free Tier**.

## 🏗️ O que será criado

### Infraestrutura AWS:
- **5 containers ECS Fargate**:
  - Frontend (React + Nginx)
  - API Usuários (Node.js)
  - API Reservas (Node.js) 
  - Redis (cache)
  - RabbitMQ (mensageria)
- **RDS MySQL** (banco de dados)
- **ECR** (repositórios de imagens)
- **CloudWatch** (logs)

### Arquitetura Distribuída:
```
Internet → Frontend (ECS) → APIs (ECS) → RDS MySQL
                    ↓
            Redis (ECS) + RabbitMQ (ECS)
```

## 📋 Passo a Passo

### 1. Preparação (5 min)
```bash
# Dar permissões aos scripts
chmod +x *.sh

# Verificar se tudo está pronto
./prepare-aws-deploy.sh
```

### 2. Deploy Completo (10-15 min)
```bash
# Executar deploy automático
./deploy-aws.sh
```

**O script fará automaticamente:**
- ✅ Criar repositórios ECR
- ✅ Build e push de 5 imagens Docker
- ✅ Criar RDS MySQL Free Tier
- ✅ Criar ECS Cluster
- ✅ Criar 5 Task Definitions
- ✅ Subir 5 serviços ECS
- ✅ Configurar logs CloudWatch

### 3. Verificar Status (2 min)
```bash
# Ver status de todos os serviços
./check-aws-status.sh
```

### 4. Acessar Aplicação
O script mostrará os IPs públicos. Acesse:
- **Frontend**: `https://[IP_FRONTEND]`
- **API Usuários**: `http://[IP_USUARIOS]:3000`
- **RabbitMQ**: `http://[IP_RABBITMQ]:15672`

## 💰 Custos (Free Tier)

### ✅ Recursos Gratuitos:
- **ECS Fargate**: 750h/mês (5 containers × 150h = OK)
- **RDS MySQL**: 750h/mês (db.t3.micro)
- **ECR**: 500MB/mês
- **CloudWatch**: 5GB logs/mês

### 📊 Uso Real:
- **Custo mensal**: $0 (dentro do Free Tier)
- **Tempo online**: 24/7 por ~5 meses
- **Performance**: Produção real

## 🔧 Comandos Úteis

### Monitoramento:
```bash
# Status geral
./check-aws-status.sh

# Logs em tempo real
aws logs tail /ecs/usuarios-service --follow

# Reiniciar serviço
aws ecs update-service --cluster sistema-reservas-cluster --service usuarios-service --force-new-deployment
```

### Limpeza:
```bash
# Deletar TUDO (evitar custos)
./cleanup-aws.sh
```

## 🚨 Importante

### ✅ Vantagens:
- **100% distribuído** (5 containers independentes)
- **Escalável** (pode aumentar containers)
- **Monitorado** (CloudWatch logs)
- **Gratuito** (Free Tier por 12 meses)
- **Produção** (arquitetura real)

### ⚠️ Limitações Free Tier:
- **750 horas/mês** ECS (5 containers × 150h)
- **20GB** storage RDS
- **1GB** data transfer/mês
- **Sem Load Balancer** (não é Free Tier)

### 💡 Dicas:
- **Monitore uso**: AWS Console → Billing
- **Pare quando não usar**: `./cleanup-aws.sh`
- **Logs limitados**: 5GB/mês CloudWatch

## 🎯 Resultado Final

Após o deploy você terá:
- ✅ Sistema 100% na nuvem AWS
- ✅ Arquitetura de microserviços
- ✅ Banco de dados gerenciado
- ✅ Cache distribuído
- ✅ Sistema de mensageria
- ✅ Logs centralizados
- ✅ Custo $0 (Free Tier)

**Sua aplicação estará rodando de forma profissional e distribuída!**