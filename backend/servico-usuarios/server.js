// index.js (ou o nome do seu arquivo principal)

const express = require('express');
const cors = require('cors');
const app = express();

// --- ADICIONADO: Importações necessárias para o DynamoDB e IDs ---
const docClient = require("./dynamoClient"); // Nosso conector do DynamoDB
const { GetCommand, ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');
// IMPORTANTE: Para segurança de senhas, instale o bcrypt: npm install bcrypt
const bcrypt = require('bcrypt');
const saltRounds = 10; // Fator de custo para o hash da senha

// --------------------------------------------------------------------

const port = process.env.NODE_PORT || 3000;

app.use(cors());
app.use(express.json());

// --- REMOVIDO: O array 'users' e o 'dbConfig' não são mais necessários ---
// const users = [ ... ];
// const dbConfig = { ... };
// console.log("Configurações de banco de dados carregadas para o host:", dbConfig.host);
// -------------------------------------------------------------------------


// --- NOVA ROTA: Para criar/registrar um novo usuário ---
app.post('/users', async (req, res) => {
    const { name, email, password } = req.body;
    console.log(`[Usuários] Recebida requisição para criar usuário com email: ${email}`);

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    // IMPORTANTE: Nunca salve senhas em texto puro! Geramos um "hash".
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = {
        id: uuidv4(), // A chave primária da nossa tabela é 'id'
        name,
        email,
        passwordHash // Salvamos o hash, não a senha original
    };

    const command = new PutCommand({
        TableName: "Usuarios",
        Item: newUser,
    });

    try {
        await docClient.send(command);
        console.log(`[Usuários] Usuário ${email} criado com sucesso.`);
        // Retornamos o usuário sem o hash da senha por segurança
        res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email });
    } catch (err) {
        console.error("Erro ao criar usuário:", err);
        res.status(500).json({ error: 'Não foi possível criar o usuário.' });
    }
});


// --- ROTA MODIFICADA: Buscar um usuário pelo ID ---
// A rota agora usa o nome 'id' para ser consistente com o banco de dados
app.get('/users/:id', async (req, res) => {
    const userId = req.params.id;
    console.log(`[Usuários] Buscando usuário ${userId}`);

    const command = new GetCommand({
        TableName: "Usuarios",
        Key: {
            id: userId, // A chave primária da tabela é 'id'
        },
    });

    try {
        const response = await docClient.send(command);
        if (response.Item) {
            // Removemos o hash da senha antes de enviar a resposta
            delete response.Item.passwordHash;
            res.status(200).json(response.Item);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// --- ROTA MODIFICADA: Login do usuário ---
app.post('/users/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`[Usuários] Tentativa de login para o email: ${email}`);

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    // Como 'email' não é a chave primária, precisamos "escanear" a tabela para encontrá-lo
    const command = new ScanCommand({
        TableName: "Usuarios",
        FilterExpression: "email = :email", // Filtramos pelo campo 'email'
        ExpressionAttributeValues: {
            ":email": email,
        },
    });

    try {
        const response = await docClient.send(command);

        if (response.Items && response.Items.length > 0) {
            const user = response.Items[0]; // O primeiro usuário encontrado com aquele email

            // Comparamos a senha enviada com o hash salvo no banco
            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

            if (isPasswordValid) {
                console.log(`[Usuários] Login bem-sucedido para ${email}`);
                res.status(200).json({
                    message: 'Login bem-sucedido!',
                    userId: user.id, // O nome do campo no BD é 'id'
                    name: user.name
                });
            } else {
                console.log(`[Usuários] Falha no login (senha inválida) para ${email}`);
                res.status(401).json({ error: 'Email ou senha inválidos.' });
            }
        } else {
            console.log(`[Usuários] Falha no login (usuário não encontrado) para ${email}`);
            res.status(401).json({ error: 'Email ou senha inválidos.' });
        }
    } catch (err) {
        console.error("Erro durante o login:", err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});


app.listen(port, () => {
    console.log(`Serviço de Usuários rodando na porta ${port}`);
});

// Adicione esta rota no seu arquivo principal do servico-usuarios
app.get('/users/', async (req, res) => {
    console.log(`[Usuários] Buscando todos os usuários.`);
    
    const command = new ScanCommand({
        TableName: "Usuarios",
    });

    try {
        const response = await docClient.send(command);
        // Remove o hash da senha de todos os usuários antes de enviar
        const safeUsers = response.Items.map(user => {
            delete user.passwordHash;
            return user;
        });
        res.status(200).json(safeUsers);
    } catch (err) {
        console.error("Erro ao buscar todos os usuários:", err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});