const express = require('express');
const cors = require('cors');
const app = express();

// 1. LER A PORTA DAS VARIÁVEIS DE AMBIENTE
// Lê a variável NODE_PORT do arquivo .env; se não existir, usa a porta 3000 como padrão.
const port = process.env.NODE_PORT || 3000;

app.use(cors());
app.use(express.json());

// 2. BANCO DE DADOS EM MEMÓRIA ATUALIZADO
// Adicionamos email e uma senha (em texto plano, por enquanto) para simular o login.
const users = [
    { 
      userId: '123', 
      name: 'Xena princesa guerreira ', 
      email: 'xena@ninha.com', 
      password: 'senha123' 
    },
    { 
      userId: '456', 
      name: 'Maria Souza', 
      email: 'maria@souza.com', 
      password: 'senha456' 
    }
];

// Configurações do banco de dados lidas do .env
// O desenvolvedor do banco de dados usará isso no futuro.
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
};

console.log("Configurações de banco de dados carregadas para o host:", dbConfig.host);


// Endpoint existente para buscar usuário por ID (usado pelo serviço de reservas)
app.get('/users/:userId', (req, res) => {
    console.log(`[Usuários] Buscando usuário ${req.params.userId}`);
    const user = users.find(u => u.userId === req.params.userId);
    if (user) {
        res.status(200).json(user);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// 3. NOVO ENDPOINT DE LOGIN
app.post('/users/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`[Usuários] Tentativa de login para o email: ${email}`);

    // Validação básica
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    // Procura o usuário pelo email no nosso "banco de dados"
    const user = users.find(u => u.email === email);

    // Verifica se o usuário existe e se a senha está correta
    // IMPORTANTE: Em um projeto real, NUNCA compare senhas em texto plano.
    // Você deve comparar o hash da senha enviada com o hash salvo no banco.
    if (user && user.password === password) {
        // Sucesso no login
        console.log(`[Usuários] Login bem-sucedido para ${email}`);
        // No futuro, aqui você geraria e retornaria um Token JWT
        res.status(200).json({ 
            message: 'Login bem-sucedido!',
            userId: user.userId,
            name: user.name 
        });
    } else {
        // Falha no login
        console.log(`[Usuários] Falha no login para ${email}`);
        res.status(401).json({ error: 'Email ou senha inválidos.' });
    }
});


app.listen(port, () => {
    console.log(`Serviço de Usuários rodando na porta ${port}`);
});