# 🏗️ Plano de Refatoração - Estrutura Clean

## 📁 Nova Estrutura Proposta

```
sistemas-distribuidos/
├── services/
│   ├── auth-service/              # Serviço de Autenticação
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── database.js
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js
│   │   │   │   └── rbac.js
│   │   │   ├── routes/
│   │   │   │   └── users.js
│   │   │   ├── utils/
│   │   │   │   └── logger.js
│   │   │   └── server.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── reservations-service/      # Serviço de Reservas
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── database.js
│   │   │   │   ├── redis.js
│   │   │   │   └── rabbitmq.js
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js
│   │   │   │   └── rbac.js
│   │   │   ├── routes/
│   │   │   │   ├── reservations.js
│   │   │   │   ├── events.js
│   │   │   │   └── notifications.js
│   │   │   ├── services/
│   │   │   │   ├── lockService.js
│   │   │   │   └── messagingService.js
│   │   │   ├── utils/
│   │   │   │   └── logger.js
│   │   │   └── server.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── frontend/                  # Frontend (React)
│       ├── src/
│       ├── Dockerfile
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── mysql/
│   │   │   ├── primary/
│   │   │   └── secondary/
│   │   └── nginx/
│   ├── database/
│   │   └── init.sql
│   └── docker-compose.yml
│
├── deployment/
│   ├── aws/
│   │   ├── terraform/             # IaC com Terraform
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   ├── outputs.tf
│   │   │   ├── ecs.tf
│   │   │   ├── rds.tf
│   │   │   ├── elasticache.tf
│   │   │   ├── mq.tf
│   │   │   └── alb.tf
│   │   ├── cloudformation/        # Alternativa com CloudFormation
│   │   └── scripts/
│   │       ├── deploy.sh
│   │       └── rollback.sh
│   └── kubernetes/                # Opcional: K8s manifests
│       ├── auth-deployment.yaml
│       ├── reservations-deployment.yaml
│       └── ingress.yaml
│
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── AWS_DEPLOYMENT.md
│   └── TESTING.md
│
├── scripts/
│   ├── test-local.ps1
│   └── setup-env.sh
│
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 🎯 Benefícios da Nova Estrutura

1. **Separação Clara**: Services, Infrastructure, Deployment
2. **Escalabilidade**: Fácil adicionar novos serviços
3. **Manutenibilidade**: Código organizado por responsabilidade
4. **Deploy Profissional**: Terraform para IaC
5. **Clean Code**: Sem comentários desnecessários
6. **Padrões**: Estrutura consistente entre serviços

## 🔄 Migração

1. Criar nova estrutura de pastas
2. Mover e refatorar código
3. Limpar comentários
4. Atualizar imports
5. Testar localmente
6. Preparar para AWS
