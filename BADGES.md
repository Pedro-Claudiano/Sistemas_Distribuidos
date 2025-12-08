# Badges para o README

Adicione estes badges no topo do README.md para deixar mais profissional:

```markdown
# Sistema de Reservas de Salas - Distribuído

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)
![AWS](https://img.shields.io/badge/AWS-Ready-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)

![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)
![Redis](https://img.shields.io/badge/Redis-7-red.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![Express](https://img.shields.io/badge/Express-5-lightgrey.svg)

[![GitHub stars](https://img.shields.io/github/stars/Pedro-Claudiano/Sistemas_Distribuidos.svg?style=social&label=Star)](https://github.com/Pedro-Claudiano/Sistemas_Distribuidos)
[![GitHub forks](https://img.shields.io/github/forks/Pedro-Claudiano/Sistemas_Distribuidos.svg?style=social&label=Fork)](https://github.com/Pedro-Claudiano/Sistemas_Distribuidos/fork)
```

## Estrutura Visual Sugerida para README

```markdown
# 🏢 Sistema de Reservas de Salas - Distribuído

> Sistema completo de reservas com microserviços, autenticação JWT e lock distribuído

[Badges aqui]

## 📋 Índice

- [Funcionalidades](#funcionalidades)
- [Quick Start](#quick-start)
- [Arquitetura](#arquitetura)
- [Deploy AWS](#deploy-aws)
- [Documentação](#documentação)
- [Contribuindo](#contribuindo)

## ✨ Funcionalidades

- 🔐 **Autenticação JWT** - Login seguro com roles
- 🔒 **Lock Distribuído** - Previne reservas duplicadas
- 🗄️ **MySQL Replicado** - Alta disponibilidade
- ⚡ **Redis Cache** - Performance otimizada
- 🛡️ **Circuit Breaker** - Resiliência a falhas
- 📊 **Logging** - Monitoramento completo
- 🎨 **UI Moderna** - React + Material-UI
- 🔒 **HTTPS** - Segurança em produção
- 🐳 **Docker** - Deploy simplificado
- ☁️ **AWS Ready** - Pronto para produção

## 🚀 Quick Start

\`\`\`powershell
# Clone e teste em 5 minutos
git clone https://github.com/Pedro-Claudiano/Sistemas_Distribuidos.git
cd Sistemas_Distribuidos
.\test-local.ps1
\`\`\`

Acesse: https://localhost

[Guia completo →](QUICK_START.md)

## 🏗️ Arquitetura

\`\`\`
Frontend (React) → Nginx → Backend Services → MySQL/Redis
\`\`\`

[Diagrama detalhado →](PLANO_AWS_DEPLOY.md)

## ☁️ Deploy AWS

\`\`\`powershell
.\deploy-aws.ps1 -AwsAccountId "123456789012"
\`\`\`

[Guia completo →](AWS_SETUP.md)

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [QUICK_START.md](QUICK_START.md) | Comece em 5 minutos |
| [AWS_SETUP.md](AWS_SETUP.md) | Deploy na AWS |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Solução de problemas |
| [PLANO_AWS_DEPLOY.md](PLANO_AWS_DEPLOY.md) | Arquitetura e custos |
| [RESUMO_FINAL.md](RESUMO_FINAL.md) | Resumo completo |

## 🧪 Testes

\`\`\`bash
# Teste local
.\test-local.ps1

# Teste manual
docker-compose up -d
node create-tables.js
\`\`\`

## 🛠️ Stack Tecnológica

### Backend
- Node.js + Express
- MySQL 8.0 (Replicação)
- Redis 7 (Lock Distribuído)
- JWT (Autenticação)
- Winston (Logging)
- Opossum (Circuit Breaker)

### Frontend
- React 18
- Material-UI
- React Router
- Vite

### DevOps
- Docker + Docker Compose
- Nginx (Reverse Proxy + HTTPS)
- AWS (ECS, RDS, ElastiCache)

## 💰 Custos AWS

| Opção | Custo/Mês |
|-------|-----------|
| ECS Fargate | ~$160 |
| AWS Lightsail | ~$55 |
| Serverless (Lambda) | ~$35 |

[Detalhes →](PLANO_AWS_DEPLOY.md#custos-estimados)

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit (`git commit -m 'Adiciona funcionalidade'`)
4. Push (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes

## 👥 Autores

- **Pedro Claudiano** - [GitHub](https://github.com/Pedro-Claudiano)
- [Contribuidores](https://github.com/Pedro-Claudiano/Sistemas_Distribuidos/graphs/contributors)

## 📞 Suporte

- 🐛 [Issues](https://github.com/Pedro-Claudiano/Sistemas_Distribuidos/issues)
- 📖 [Documentação](https://github.com/Pedro-Claudiano/Sistemas_Distribuidos/tree/main)
- 💬 [Discussions](https://github.com/Pedro-Claudiano/Sistemas_Distribuidos/discussions)

---

⭐ Se este projeto te ajudou, deixe uma estrela!

Made with ❤️ by Pedro Claudiano
```

## Screenshots Sugeridos

Crie screenshots e adicione ao README:

1. **Tela de Login**
   - `docs/screenshots/login.png`

2. **Dashboard de Reservas**
   - `docs/screenshots/dashboard.png`

3. **Criação de Reserva**
   - `docs/screenshots/create-reservation.png`

4. **Teste de Lock (duas abas)**
   - `docs/screenshots/lock-test.png`

5. **Arquitetura AWS**
   - `docs/diagrams/aws-architecture.png`

## Adicionar ao README

```markdown
## 📸 Screenshots

### Interface Principal
![Dashboard](docs/screenshots/dashboard.png)

### Criação de Reserva
![Create](docs/screenshots/create-reservation.png)

### Teste de Lock Distribuído
![Lock Test](docs/screenshots/lock-test.png)
```
