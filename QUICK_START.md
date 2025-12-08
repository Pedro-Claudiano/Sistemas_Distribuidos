# 🚀 Quick Start - 5 Minutos para Rodar o Sistema

## Opção 1: Teste Local Automatizado (Recomendado)

### Windows PowerShell
```powershell
# 1. Clone o repositório (se ainda não fez)
git clone https://github.com/Pedro-Claudiano/Sistemas_Distribuidos.git
cd Sistemas_Distribuidos

# 2. Execute o script de teste
.\test-local.ps1

# 3. Acesse no navegador
# https://localhost
```

**Pronto! O script faz tudo automaticamente.**

---

## Opção 2: Passo a Passo Manual

### 1️⃣ Pré-requisitos
- ✅ Docker Desktop instalado e rodando
- ✅ Node.js 18+ instalado

### 2️⃣ Clone e Configure
```bash
# Clone
git clone https://github.com/Pedro-Claudiano/Sistemas_Distribuidos.git
cd Sistemas_Distribuidos

# Verifique se .env existe (já vem configurado)
type .env
```

### 3️⃣ Suba os Serviços
```bash
# Instale dependências do script
npm install

# Suba com Docker
docker-compose up --build -d

# Aguarde 30 segundos...
timeout /t 30

# Crie as tabelas
node create-tables.js
```

### 4️⃣ Acesse o Sistema
Abra no navegador:
- **Frontend**: https://localhost
- **Demo**: https://localhost/demo

**Nota**: Aceite o certificado SSL self-signed no navegador

---

## 🧪 Testando o Sistema

### Teste 1: Criar Usuário e Login
1. Acesse https://localhost
2. Clique em "Registrar"
3. Preencha: Nome, Email, Senha
4. Faça login

### Teste 2: Criar Reserva
1. Após login, selecione uma sala
2. Escolha data e horário
3. Clique em "Reservar"
4. Veja sua reserva na lista

### Teste 3: Testar Lock Distribuído
1. Abra **duas abas** do navegador
2. Em ambas, tente reservar a **mesma sala** no **mesmo horário**
3. Uma deve ter sucesso, a outra deve falhar
4. ✅ **Lock funcionando!**

---

## 📱 URLs Importantes

| Serviço | URL | Descrição |
|---------|-----|-----------|
| Frontend | https://localhost | Interface principal |
| Demo | https://localhost/demo | Painel de demonstração |
| API Usuários | https://localhost/api/users | Endpoints de usuários |
| API Reservas | http://localhost:3001/reservas | Endpoints de reservas |
| Health Check | https://localhost/health | Status dos serviços |

---

## 🔧 Comandos Úteis

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f usuarios-service

# Parar tudo
docker-compose down

# Reiniciar um serviço
docker-compose restart reservas-service

# Ver status
docker-compose ps
```

---

## ❌ Problemas?

### Erro de Certificado SSL
- Chrome: Digite `thisisunsafe` na página de erro
- Firefox: Clique "Advanced" → "Accept Risk"

### Porta já em uso
```bash
# Ver o que está usando a porta
netstat -ano | findstr ":3000"

# Matar o processo
taskkill /PID <PID> /F
```

### Tabelas não existem
```bash
# Criar novamente
node create-tables.js
```

### Docker não inicia
```bash
# Limpar tudo e tentar de novo
docker-compose down -v
docker system prune -a
docker-compose up --build -d
```

**Mais soluções**: Veja [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## ☁️ Deploy na AWS

Quando estiver pronto para produção:

```powershell
# 1. Configure AWS CLI
aws configure

# 2. Execute o script de deploy
.\deploy-aws.ps1 -AwsAccountId "123456789012" -AwsRegion "us-east-1"

# 3. Siga o guia completo
# Veja: AWS_SETUP.md
```

---

## 📚 Documentação Completa

- **README.md**: Documentação geral
- **AWS_SETUP.md**: Deploy na AWS passo a passo
- **PLANO_AWS_DEPLOY.md**: Arquitetura e planejamento
- **TROUBLESHOOTING.md**: Solução de problemas
- **RESUMO_FINAL.md**: Resumo completo do projeto

---

## 🎯 Próximos Passos

1. ✅ Teste local funcionando
2. 📝 Leia a documentação
3. 🧪 Teste todas as funcionalidades
4. ☁️ Faça deploy na AWS
5. 🚀 Coloque em produção!

---

**Tempo total**: ~5 minutos ⏱️

**Dificuldade**: Fácil 😊

**Suporte**: Abra uma issue no GitHub se precisar de ajuda!
