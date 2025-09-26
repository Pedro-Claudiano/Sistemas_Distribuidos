# Sistema de Reservas 

## Serviço de Usuários
### `GET /users/{userId}`

Yuri: fazer o frontbonitinho 

COMANDO PULL SEM AWS BD:
# 2. Cria um arquivo .env na raiz e coloca a linha:
# JWT_SECRET=meu-segredo-super-secreto-12345


# 3. Instala as dependências do script da raiz
npm install

# 4. Sobe a aplicação com Docker
docker-compose up --build -d

# 5. Cria as tabelas no banco de dados
node create-tables.js

# 6. Abre o VS Code e testa com o Thunder Client!


Xena: substituir os dados em memória nos serviços de backend por chamadas a um banco de dados real

As necessidades imediatas do banco de dados são:

Para o servico-usuarios:
Tabela de Usuários: Precisamos de uma tabela para armazenar os usuários. Os campos mínimos necessários são:

userId (ex: UUID, Chave Primária)

name (ex: VARCHAR)

email (ex: VARCHAR, UNIQUE)

password (ex: VARCHAR - deve armazenar um hash da senha, nunca a senha em texto plano)

Funcionalidades que o serviço precisará do banco de dados:

Buscar um usuário por ID: Implementar a lógica do endpoint GET /users/:userId para buscar um usuário na nova tabela. Isso é usado pelo servico-reservas.

Buscar um usuário por Email: Para a funcionalidade de login, o serviço precisará de um novo endpoint (ex: POST /users/login) que busca um usuário pelo seu email para verificar a senha.

Para o servico-reservas:
Tabela de Reservas: Precisamos de uma tabela para armazenar as reservas. Os campos mínimos são:

reservationId (ex: UUID, Chave Primária)

userId (Chave Estrangeira referenciando a tabela de usuários)

roomId ou roomName (ex: VARCHAR)

reservationTime (ex: DATETIME)

Funcionalidades que o serviço precisará do banco de dados:

Criar uma nova reserva: Implementar a lógica do endpoint POST /reservas para inserir um novo registro na tabela de reservas.

Prevenção de Concorrência: O banco de dados deve ter uma regra (ex: UNIQUE constraint combinando roomId e reservationTime) para garantir que não seja possível criar duas reservas para a mesma sala no mesmo horário, atendendo a um requisito chave do projeto.

O projeto já está totalmente configurado com Docker, Git, e um frontend funcional com troca de tema, pronto para que a camada de persistência de dados seja implementada.