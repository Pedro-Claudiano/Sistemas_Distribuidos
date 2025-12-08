# 🔐 Credenciais do Sistema

## Acesso à Aplicação
**URL:** https://localhost

---

## 👤 Usuários Cadastrados

### 1. Administrador Padrão
- **Email:** `admin`
- **Senha:** `admin`
- **Role:** Admin
- **Acesso:** AdminDashboard (`/admin`)
- **Permissões:** Gerenciar salas

### 2. Administrador Secundário
- **Email:** `admin@sistema.com`
- **Senha:** `admin123`
- **Role:** Admin
- **Acesso:** AdminDashboard (`/admin`)
- **Permissões:** Gerenciar salas

### 3. Cliente Teste
- **Email:** `cliente@sistema.com`
- **Senha:** `cliente123`
- **Role:** Client
- **Acesso:** RoomSelection (`/dashboard`)
- **Permissões:** Fazer reservas

### 4. Cliente Existente
- **Email:** `pedro@ranzinza.com`
- **Senha:** (senha cadastrada anteriormente)
- **Role:** Client
- **Acesso:** RoomSelection (`/dashboard`)
- **Permissões:** Fazer reservas

---

## 🏢 Salas Cadastradas

1. **Sala 101** - Prédio ADM
2. **Sala 102** - Prédio ADM
3. **Laboratório 1** - Prédio de Eletrônica
4. **Auditório** - Prédio Principal

---

## 🔄 Fluxo de Login

1. Acesse https://localhost
2. Faça login com uma das credenciais acima
3. O sistema redireciona automaticamente:
   - **Admin** → `/admin` (AdminDashboard)
   - **Client** → `/dashboard` (RoomSelection)

---

## 🛠️ Troubleshooting

### "Erro ao carregar salas" ou "Erro ao salvar sala"?
**SOLUÇÃO:** Faça logout e login novamente para gerar um novo token JWT válido.

1. Clique em Logout (ou limpe o localStorage: F12 → Application → Local Storage → Clear)
2. Faça login novamente com `admin@sistema.com` / `admin123`
3. Você será redirecionado para `/admin` e verá as 4 salas cadastradas
4. Agora você pode criar, editar e deletar salas normalmente

### Login não redireciona corretamente?
1. **Abra uma aba anônima/privada** (Ctrl+Shift+N no Chrome/Edge)
2. Acesse https://localhost
3. Aceite o certificado auto-assinado
4. Faça login com as credenciais acima
5. Você será redirecionado automaticamente:
   - Admin → `/admin` (AdminDashboard)
   - Cliente → `/dashboard` (RoomSelection)

### Não consegue acessar?
1. Verifique se o Docker está rodando: `docker ps`
2. Verifique os logs: `docker logs frontend-nginx`
3. Se necessário, reinicie os serviços:
   ```
   docker-compose restart
   ```

---

## 📝 Notas

- O token JWT expira em 1 hora
- Após expirar, faça login novamente
- O sistema usa HTTPS com certificado auto-assinado (aceite o aviso do navegador)
