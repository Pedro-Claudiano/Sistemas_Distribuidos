# Guia de Troubleshooting - Sistema de Reservas

## Problemas Comuns e Soluções

### 1. Docker não inicia os containers

**Sintoma**: `docker-compose up` falha ou containers param imediatamente

**Soluções**:
```bash
# Limpar containers e volumes antigos
docker-compose down -v

# Limpar cache do Docker
docker system prune -a

# Verificar se as portas estão em uso
netstat -ano | findstr "3000 3001 3307 3308 6379 80 443"

# Matar processos que estão usando as portas
taskkill /PID <PID> /F

# Tentar novamente
docker-compose up --build -d
```

### 2. Erro "Cannot connect to MySQL"

**Sintoma**: Serviços não conseguem conectar ao banco

**Soluções**:
```bash
# Verificar se o MySQL está rodando
docker-compose ps

# Ver logs do MySQL
docker-compose logs mysql-primary

# Aguardar mais tempo (MySQL pode demorar 30-60s para iniciar)
Start-Sleep -Seconds 30

# Verificar se o healthcheck passou
docker inspect mysql-primary | findstr "Health"

# Tentar conectar manualmente
docker exec -it mysql-primary mysql -u admin -padmin_password_123 -e "SHOW DATABASES;"
```

### 3. Erro "Table doesn't exist"

**Sintoma**: API retorna erro 500 ao tentar criar usuário/reserva

**Soluções**:
```bash
# Verificar se as tabelas foram criadas
docker exec -it mysql-primary mysql -u admin -padmin_password_123 meu_projeto_db -e "SHOW TABLES;"

# Se não existirem, criar manualmente
node create-tables.js

# OU executar o SQL diretamente
docker exec -i mysql-primary mysql -u admin -padmin_password_123 meu_projeto_db < init.sql
```

### 4. Erro "Redis connection refused"

**Sintoma**: Serviço de reservas não consegue conectar ao Redis

**Soluções**:
```bash
# Verificar se Redis está rodando
docker-compose ps redis_lock

# Ver logs do Redis
docker-compose logs redis_lock

# Testar conexão
docker exec -it redis_lock redis-cli ping
# Deve retornar: PONG

# Reiniciar Redis
docker-compose restart redis_lock
```

### 5. Frontend não carrega (ERR_SSL_PROTOCOL_ERROR)

**Sintoma**: Navegador mostra erro de certificado SSL

**Soluções**:
1. **Aceitar o certificado self-signed**:
   - Chrome: Digite `thisisunsafe` na página de erro
   - Firefox: Clique em "Advanced" → "Accept the Risk"

2. **Verificar se os certificados existem**:
```bash
dir nginx-certs
# Deve mostrar: nginx-selfsigned.crt e nginx-selfsigned.key
```

3. **Acessar via HTTP** (temporário):
```
http://localhost
```

### 6. Erro "JWT_SECRET is not defined"

**Sintoma**: Login retorna erro 500

**Soluções**:
```bash
# Verificar se .env existe
type .env

# Verificar se JWT_SECRET está definido
findstr "JWT_SECRET" .env

# Se não estiver, adicionar
echo JWT_SECRET=meu-segredo-super-secreto-12345 >> .env

# Reiniciar serviços
docker-compose restart usuarios-service reservas-service
```

### 7. Lock não funciona (reservas duplicadas)

**Sintoma**: Consegue criar duas reservas para mesma sala/horário

**Soluções**:
```bash
# Verificar se Redis está funcionando
docker exec -it redis_lock redis-cli ping

# Ver logs do serviço de reservas
docker-compose logs -f reservas-service

# Verificar se a variável REDIS_HOST está correta
docker exec reservas-service env | findstr REDIS

# Testar lock manualmente no Redis
docker exec -it redis_lock redis-cli
> SET lock:test:123 "value" EX 10 NX
> GET lock:test:123
> DEL lock:test:123
```

### 8. Erro "Port already in use"

**Sintoma**: Docker não consegue iniciar porque porta está ocupada

**Soluções**:
```powershell
# Encontrar processo usando a porta (exemplo: 3000)
netstat -ano | findstr ":3000"

# Matar o processo
taskkill /PID <PID> /F

# OU mudar a porta no docker-compose.yml
# Edite a seção 'ports' do serviço
```

### 9. Frontend não consegue chamar API (CORS)

**Sintoma**: Console do navegador mostra erro CORS

**Soluções**:
1. Verificar se CORS está habilitado nos serviços backend
2. Verificar configuração do Nginx (`config/nginx/nginx.conf`)
3. Usar proxy do Vite (desenvolvimento):
```javascript
// frontend/vite.config.js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
}
```

### 10. Erro ao fazer deploy na AWS

**Sintoma**: Script de deploy falha

**Soluções**:
```bash
# Verificar credenciais AWS
aws sts get-caller-identity

# Verificar região
aws configure get region

# Verificar se ECR existe
aws ecr describe-repositories --region us-east-1

# Fazer login no ECR novamente
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Verificar logs do CloudWatch
aws logs tail /ecs/usuarios-service --follow
```

## Comandos de Diagnóstico

### Ver todos os logs
```bash
docker-compose logs -f
```

### Ver logs de um serviço específico
```bash
docker-compose logs -f usuarios-service
docker-compose logs -f reservas-service
docker-compose logs -f mysql-primary
docker-compose logs -f redis_lock
docker-compose logs -f frontend
```

### Ver status dos containers
```bash
docker-compose ps
```

### Ver uso de recursos
```bash
docker stats
```

### Entrar em um container
```bash
docker exec -it usuarios-service sh
docker exec -it mysql-primary bash
docker exec -it redis_lock sh
```

### Verificar rede Docker
```bash
docker network ls
docker network inspect sistemas_distribuidos_default
```

### Verificar volumes
```bash
docker volume ls
docker volume inspect sistemas_distribuidos_mysql_data
```

## Resetar Tudo (Última Opção)

Se nada funcionar, reset completo:

```bash
# Parar e remover tudo
docker-compose down -v

# Remover imagens
docker rmi $(docker images -q)

# Limpar sistema Docker
docker system prune -a --volumes

# Reconstruir do zero
docker-compose up --build -d

# Aguardar e criar tabelas
Start-Sleep -Seconds 30
node create-tables.js
```

## Logs de Erro Comuns

### "ER_ACCESS_DENIED_ERROR"
- **Causa**: Credenciais do banco incorretas
- **Solução**: Verificar DB_USER e DB_PASSWORD no .env

### "ECONNREFUSED"
- **Causa**: Serviço não está rodando ou porta incorreta
- **Solução**: Verificar se container está up e porta está correta

### "ER_DUP_ENTRY"
- **Causa**: Tentando inserir registro duplicado (email já existe)
- **Solução**: Normal, use outro email ou delete o registro existente

### "ETIMEDOUT"
- **Causa**: Timeout na conexão (serviço demorou muito para responder)
- **Solução**: Aumentar timeout ou verificar se serviço está sobrecarregado

### "ENOTFOUND"
- **Causa**: Hostname não encontrado (DNS)
- **Solução**: Verificar se nome do serviço está correto no docker-compose

## Contato para Suporte

Se o problema persistir:
1. Abra uma issue no GitHub com:
   - Descrição do problema
   - Logs relevantes
   - Passos para reproduzir
   - Sistema operacional e versão do Docker

2. Inclua a saída de:
```bash
docker-compose ps
docker-compose logs
docker version
node --version
```

---

**Dica**: Sempre verifique os logs primeiro! 90% dos problemas podem ser diagnosticados pelos logs.
