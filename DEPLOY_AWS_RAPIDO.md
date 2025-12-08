# 🚀 Deploy Rápido na AWS - Guia Prático

## Opção Recomendada: AWS Lightsail (Mais Simples e Barato)

### Por que Lightsail?
- ✅ Mais simples de configurar
- ✅ Mais barato (~$55/mês vs ~$160/mês)
- ✅ Interface amigável
- ✅ Tudo integrado (containers, banco, rede)

---

## 📋 Pré-requisitos

1. **Conta AWS** ativa
2. **AWS CLI** instalado
3. **Cartão de crédito** cadastrado na AWS

---

## 🎯 Opção 1: Deploy com AWS Lightsail (RECOMENDADO)

### Passo 1: Instalar AWS CLI

```powershell
# Baixe e instale de: https://aws.amazon.com/cli/
# Ou use:
winget install Amazon.AWSCLI
```

### Passo 2: Configurar AWS CLI

```powershell
aws configure
# AWS Access Key ID: [cole sua key]
# AWS Secret Access Key: [cole sua secret]
# Default region: us-east-1
# Default output format: json
```

**Como obter as credenciais:**
1. Acesse: https://console.aws.amazon.com/iam/
2. Clique em "Users" → Seu usuário
3. "Security credentials" → "Create access key"
4. Escolha "CLI" e copie as chaves

### Passo 3: Criar Container Service no Lightsail

```powershell
# Criar o serviço de containers
aws lightsail create-container-service `
    --service-name reservas-app `
    --power small `
    --scale 2 `
    --region us-east-1
```

**Aguarde 5-10 minutos** para o serviço ficar ativo.

### Passo 4: Verificar Status

```powershell
aws lightsail get-container-services --service-name reservas-app
```

Aguarde até ver `"state": "ACTIVE"`

### Passo 5: Build e Push das Imagens

```powershell
# Fazer login no Lightsail
aws lightsail push-container-image `
    --service-name reservas-app `
    --label usuarios-service `
    --image usuarios-service:latest

# Build da imagem de usuários
cd backend/servico-usuarios
docker build -t usuarios-service:latest .

# Push para Lightsail
aws lightsail push-container-image `
    --service-name reservas-app `
    --label usuarios-service `
    --image usuarios-service:latest

# Voltar para raiz
cd ../..

# Build da imagem de reservas
cd backend/servico-reservas
docker build -t reservas-service:latest .

# Push para Lightsail
aws lightsail push-container-image `
    --service-name reservas-app `
    --label reservas-service `
    --image reservas-service:latest

cd ../..
```

### Passo 6: Criar Banco de Dados no Lightsail

```powershell
# Criar banco MySQL
aws lightsail create-relational-database `
    --relational-database-name reservas-db `
    --relational-database-blueprint-id mysql_8_0 `
    --relational-database-bundle-id micro_2_0 `
    --master-database-name reservas_db `
    --master-username admin `
    --master-user-password "SuaSenhaSegura123!" `
    --region us-east-1
```

**Aguarde 10-15 minutos** para o banco ficar disponível.

### Passo 7: Obter Endpoint do Banco

```powershell
aws lightsail get-relational-database --relational-database-name reservas-db
```

Copie o valor de `"endpoint"` (algo como: `ls-xxx.us-east-1.rds.amazonaws.com`)

### Passo 8: Criar Deployment

Crie um arquivo `lightsail-deployment.json`:

```json
{
  "containers": {
    "usuarios-service": {
      "image": ":usuarios-service.latest",
      "ports": {
        "3000": "HTTP"
      },
      "environment": {
        "NODE_PORT": "3000",
        "DB_HOST": "SEU_ENDPOINT_RDS_AQUI",
        "DB_USER": "admin",
        "DB_PASSWORD": "SuaSenhaSegura123!",
        "DB_NAME": "reservas_db",
        "DB_PORT": "3306",
        "JWT_SECRET": "seu-jwt-secret-super-seguro-12345"
      }
    },
    "reservas-service": {
      "image": ":reservas-service.latest",
      "ports": {
        "3001": "HTTP"
      },
      "environment": {
        "NODE_PORT": "3001",
        "DB_HOST": "SEU_ENDPOINT_RDS_AQUI",
        "DB_USER": "admin",
        "DB_PASSWORD": "SuaSenhaSegura123!",
        "DB_NAME": "reservas_db",
        "DB_PORT": "3306",
        "JWT_SECRET": "seu-jwt-secret-super-seguro-12345",
        "REDIS_HOST": "localhost"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "usuarios-service",
    "containerPort": 3000,
    "healthCheck": {
      "path": "/health"
    }
  }
}
```

**IMPORTANTE**: Substitua `SEU_ENDPOINT_RDS_AQUI` pelo endpoint do banco!

### Passo 9: Deploy

```powershell
aws lightsail create-container-service-deployment `
    --service-name reservas-app `
    --cli-input-json file://lightsail-deployment.json
```

### Passo 10: Obter URL da Aplicação

```powershell
aws lightsail get-container-services --service-name reservas-app
```

Procure por `"url"` - essa é a URL pública da sua aplicação!

---

## 🎯 Opção 2: Deploy com ECS (Mais Completo)

Se preferir usar ECS (mais complexo mas mais poderoso):

### Passo 1: Executar Script Automatizado

```powershell
# Obtenha seu Account ID
$accountId = (aws sts get-caller-identity --query Account --output text)

# Execute o deploy
.\deploy-aws.ps1 -AwsAccountId $accountId -AwsRegion "us-east-1"
```

### Passo 2: Criar Infraestrutura

Siga o guia completo em **AWS_SETUP.md** para:
1. Criar VPC e Subnets
2. Criar Security Groups
3. Provisionar RDS Aurora
4. Provisionar ElastiCache Redis
5. Criar ECS Cluster
6. Configurar ALB

---

## 🗄️ Criar Tabelas no Banco

Após o deploy, você precisa criar as tabelas:

### Opção A: Via MySQL Client

```powershell
# Instale MySQL Client se não tiver
# Download: https://dev.mysql.com/downloads/mysql/

# Conecte ao banco
mysql -h SEU_ENDPOINT_RDS -u admin -p

# Digite a senha quando solicitado
# Depois execute:
USE reservas_db;

# Cole o conteúdo do arquivo init.sql
```

### Opção B: Via Script

Crie um arquivo `create-tables-aws.js`:

```javascript
const mysql = require('mysql2/promise');

async function createTables() {
  const connection = await mysql.createConnection({
    host: 'SEU_ENDPOINT_RDS_AQUI',
    user: 'admin',
    password: 'SuaSenhaSegura123!',
    database: 'reservas_db'
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS Usuarios (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Reservas (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        room_id VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_room_time (room_id, start_time),
        FOREIGN KEY (user_id) REFERENCES Usuarios(id)
    );
  `;

  await connection.query(sql);
  console.log('Tabelas criadas com sucesso!');
  await connection.end();
}

createTables().catch(console.error);
```

Execute:
```powershell
node create-tables-aws.js
```

---

## 🧪 Testar a Aplicação

### 1. Obter a URL

```powershell
# Lightsail
aws lightsail get-container-services --service-name reservas-app

# ECS (ALB)
aws elbv2 describe-load-balancers --names reservas-alb
```

### 2. Testar Health Check

```powershell
curl https://SUA_URL/health
```

### 3. Criar Usuário

```powershell
curl -X POST https://SUA_URL/api/users `
  -H "Content-Type: application/json" `
  -d '{"name":"Admin","email":"admin@test.com","password":"123","role":"admin"}'
```

### 4. Fazer Login

```powershell
curl -X POST https://SUA_URL/api/users/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@test.com","password":"123"}'
```

Copie o `token` da resposta.

### 5. Criar Reserva

```powershell
curl -X POST https://SUA_URL/api/reservas `
  -H "Authorization: Bearer SEU_TOKEN_AQUI" `
  -H "Content-Type: application/json" `
  -d '{"room_id":"sala_101","start_time":"2025-12-15T10:00:00","end_time":"2025-12-15T11:00:00"}'
```

---

## 📊 Monitoramento

### Ver Logs (Lightsail)

```powershell
aws lightsail get-container-log `
    --service-name reservas-app `
    --container-name usuarios-service
```

### Ver Logs (ECS)

```powershell
aws logs tail /ecs/usuarios-service --follow
```

### Ver Métricas

Acesse o Console AWS:
- Lightsail: https://lightsail.aws.amazon.com/
- CloudWatch: https://console.aws.amazon.com/cloudwatch/

---

## 💰 Custos Estimados

### Lightsail:
- Container Service (small, 2 nodes): **$40/mês**
- Database (micro): **$15/mês**
- **Total: ~$55/mês**

### ECS:
- ECS Fargate: **~$60/mês**
- RDS Aurora: **~$50/mês**
- ElastiCache: **~$15/mês**
- ALB: **~$20/mês**
- **Total: ~$145/mês**

---

## 🔧 Troubleshooting

### Erro: "Cannot connect to database"

1. Verifique se o banco está ativo:
```powershell
aws lightsail get-relational-database --relational-database-name reservas-db
```

2. Verifique o endpoint no deployment

3. Teste conexão:
```powershell
mysql -h SEU_ENDPOINT -u admin -p
```

### Erro: "Container failed to start"

1. Veja os logs:
```powershell
aws lightsail get-container-log --service-name reservas-app --container-name usuarios-service
```

2. Verifique variáveis de ambiente

3. Verifique se as imagens foram enviadas:
```powershell
aws lightsail get-container-images --service-name reservas-app
```

### Erro: "Health check failed"

1. Verifique se o endpoint `/health` está respondendo
2. Verifique se a porta está correta (3000)
3. Veja os logs do container

---

## 🎯 Checklist de Deploy

- [ ] AWS CLI instalado e configurado
- [ ] Credenciais AWS configuradas
- [ ] Container Service criado
- [ ] Banco de dados criado
- [ ] Imagens Docker buildadas
- [ ] Imagens enviadas para AWS
- [ ] Deployment criado
- [ ] Tabelas criadas no banco
- [ ] Health check funcionando
- [ ] Usuário de teste criado
- [ ] Reserva de teste criada
- [ ] URL pública acessível

---

## 📞 Suporte

Se tiver problemas:
1. Veja **TROUBLESHOOTING.md**
2. Veja **AWS_SETUP.md** para detalhes
3. Consulte logs no CloudWatch
4. Abra issue no GitHub

---

**Tempo estimado**: 30-60 minutos para Lightsail, 2-3 horas para ECS

**Recomendação**: Comece com Lightsail para testar, depois migre para ECS se precisar de mais recursos.
