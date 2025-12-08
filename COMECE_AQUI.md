# 🚀 COMECE AQUI - Deploy na AWS em 3 Passos

## Escolha seu caminho:

### 🟢 Opção 1: AWS Lightsail (RECOMENDADO para começar)
- ✅ Mais simples
- ✅ Mais barato (~$55/mês)
- ✅ Deploy em 30 minutos
- ⏱️ **Tempo: 30-60 minutos**

### 🔵 Opção 2: AWS ECS (Para produção)
- ⚠️ Mais complexo
- ⚠️ Mais caro (~$160/mês)
- ✅ Mais escalável
- ⏱️ **Tempo: 2-3 horas**

---

## 🟢 OPÇÃO 1: Deploy com Lightsail (Simples)

### Passo 1: Instalar AWS CLI

**Windows:**
```powershell
# Baixe e instale de:
https://aws.amazon.com/cli/

# OU use winget:
winget install Amazon.AWSCLI
```

**Verificar instalação:**
```powershell
aws --version
```

### Passo 2: Configurar Credenciais

**2.1 - Obter credenciais AWS:**
1. Acesse: https://console.aws.amazon.com/iam/
2. Clique em "Users" → Seu usuário (ou crie um novo)
3. Aba "Security credentials"
4. Clique em "Create access key"
5. Escolha "Command Line Interface (CLI)"
6. Copie:
   - Access Key ID
   - Secret Access Key

**2.2 - Configurar no terminal:**
```powershell
aws configure
```

Digite quando solicitado:
- **AWS Access Key ID**: [cole sua key]
- **AWS Secret Access Key**: [cole sua secret]
- **Default region**: `us-east-1`
- **Default output format**: `json`

**2.3 - Testar:**
```powershell
aws sts get-caller-identity
```

Se aparecer seu Account ID, está funcionando! ✅

### Passo 3: Executar Deploy Automatizado

```powershell
# Execute o script
.\deploy-lightsail.ps1
```

**O script vai:**
1. ✅ Criar Container Service
2. ✅ Criar Banco de Dados MySQL
3. ✅ Fazer build das imagens Docker
4. ✅ Enviar imagens para AWS
5. ✅ Fazer deploy da aplicação

**Aguarde 15-20 minutos** ⏱️

### Passo 4: Obter URL da Aplicação

```powershell
aws lightsail get-container-services --service-name reservas-app
```

Procure por `"url"` na saída. Exemplo:
```
"url": "https://reservas-app.xxxxx.us-east-1.cs.amazonlightsail.com"
```

### Passo 5: Criar Tabelas no Banco

**5.1 - Obter endpoint do banco:**
```powershell
aws lightsail get-relational-database --relational-database-name reservas-db
```

Copie o valor de `"address"` (endpoint do banco)

**5.2 - Conectar ao banco:**

Você tem 3 opções:

**Opção A: MySQL Workbench (Recomendado)**
1. Baixe: https://dev.mysql.com/downloads/workbench/
2. Crie nova conexão:
   - Hostname: [endpoint copiado]
   - Port: 3306
   - Username: admin
   - Password: SuaSenhaSegura123!
3. Abra o arquivo `init.sql`
4. Execute o script

**Opção B: MySQL CLI**
```powershell
mysql -h SEU_ENDPOINT_AQUI -u admin -p
# Digite a senha: SuaSenhaSegura123!

# Depois execute:
USE reservas_db;
# Cole o conteúdo do arquivo init.sql
```

**Opção C: Script Node.js**
```powershell
# Edite o arquivo create-tables-aws.js com o endpoint
# Depois execute:
node create-tables-aws.js
```

### Passo 6: Testar a Aplicação

```powershell
# Substitua SUA_URL pela URL obtida no Passo 4
$url = "https://reservas-app.xxxxx.us-east-1.cs.amazonlightsail.com"

# Teste health check
curl "$url/health"

# Criar usuário admin
curl -X POST "$url/api/users" `
  -H "Content-Type: application/json" `
  -d '{"name":"Admin","email":"admin@test.com","password":"123","role":"admin"}'

# Fazer login
curl -X POST "$url/api/users/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@test.com","password":"123"}'
```

**Copie o token da resposta!**

```powershell
# Criar reserva (substitua SEU_TOKEN)
curl -X POST "$url/api/reservas" `
  -H "Authorization: Bearer SEU_TOKEN_AQUI" `
  -H "Content-Type: application/json" `
  -d '{"room_id":"sala_101","start_time":"2025-12-15T10:00:00","end_time":"2025-12-15T11:00:00"}'
```

### ✅ Pronto! Aplicação rodando na AWS!

---

## 🔵 OPÇÃO 2: Deploy com ECS (Avançado)

### Passo 1: Configurar AWS CLI
(Mesmo da Opção 1)

### Passo 2: Executar Script de Deploy

```powershell
# Obter Account ID
$accountId = (aws sts get-caller-identity --query Account --output text)

# Executar deploy
.\deploy-aws.ps1 -AwsAccountId $accountId -AwsRegion "us-east-1"
```

### Passo 3: Criar Infraestrutura

Siga o guia completo: **AWS_SETUP.md**

Você precisará criar:
1. VPC e Subnets
2. Security Groups
3. RDS Aurora
4. ElastiCache Redis
5. ECS Cluster
6. Application Load Balancer

**Tempo estimado: 2-3 horas**

---

## 📊 Comparação

| Recurso | Lightsail | ECS |
|---------|-----------|-----|
| Complexidade | ⭐ Fácil | ⭐⭐⭐ Difícil |
| Tempo de Setup | 30-60 min | 2-3 horas |
| Custo/mês | ~$55 | ~$160 |
| Escalabilidade | Limitada | Alta |
| Redis | ❌ Não incluído | ✅ ElastiCache |
| Load Balancer | ✅ Incluído | ✅ ALB |
| Auto Scaling | ⚠️ Manual | ✅ Automático |

---

## 🆘 Problemas?

### Erro: "AWS CLI not found"
```powershell
# Instale:
winget install Amazon.AWSCLI

# Ou baixe de:
https://aws.amazon.com/cli/
```

### Erro: "Credentials not configured"
```powershell
aws configure
# Digite suas credenciais
```

### Erro: "Docker not found"
```powershell
# Instale Docker Desktop:
https://www.docker.com/products/docker-desktop/
```

### Erro: "Cannot connect to database"
- Aguarde 10-15 minutos após criar o banco
- Verifique se o endpoint está correto
- Teste conexão com MySQL Workbench

### Ver logs da aplicação:
```powershell
# Lightsail
aws lightsail get-container-log --service-name reservas-app --container-name usuarios-service

# ECS
aws logs tail /ecs/usuarios-service --follow
```

---

## 📚 Documentação Completa

- **DEPLOY_AWS_RAPIDO.md** - Guia detalhado passo a passo
- **AWS_SETUP.md** - Setup completo do ECS
- **TROUBLESHOOTING.md** - Solução de problemas
- **README.md** - Documentação geral

---

## 💰 Custos

### Lightsail:
- Container Service: $40/mês
- Database: $15/mês
- **Total: ~$55/mês**

### ECS:
- Fargate: $60/mês
- RDS: $50/mês
- ElastiCache: $15/mês
- ALB: $20/mês
- **Total: ~$145/mês**

**Dica**: Comece com Lightsail para testar!

---

## ✅ Checklist

- [ ] AWS CLI instalado
- [ ] Credenciais configuradas
- [ ] Docker instalado (para build)
- [ ] Script de deploy executado
- [ ] Banco de dados criado
- [ ] Tabelas criadas
- [ ] Aplicação testada
- [ ] URL pública funcionando

---

## 🎯 Próximos Passos

Após o deploy:
1. Configure um domínio personalizado
2. Configure SSL/TLS
3. Configure backups automáticos
4. Configure monitoramento
5. Configure alertas

---

**Tempo total estimado:**
- Lightsail: 30-60 minutos ⏱️
- ECS: 2-3 horas ⏱️

**Recomendação**: Comece com Lightsail! 🟢
