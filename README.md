# Sistema de Reservas - Documentação da API

## Serviço de Usuários
### `GET /users/{userId}`
Valida e retorna os dados de um usuário.

- **URL Params:** `userId=[string]` (obrigatório)
- **Success Response (200):** ```json
  { "userId": "123", "name": "João da Silva" }