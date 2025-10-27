const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// ----- INÍCIO: Conexão MySQL -----
// Importa o driver MySQL com suporte a Promises
const mysql = require('mysql2/promise');

// Cria o pool de conexões usando as variáveis de ambiente
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // Limite de conexões simultâneas
  queueLimit: 0
});

// Testa a conexão inicial (opcional, mas bom para depuração)
pool.getConnection()
  .then(connection => {
    console.log(`[Usuários] Conectado ao MySQL no host: ${process.env.DB_HOST} com sucesso!`);
    connection.release();
  })
  .catch(err => {
    console.error(`[Usuários] ERRO ao conectar ao MySQL: ${err.message}`);
    // Se não conseguir conectar, talvez seja melhor encerrar o serviço
    // process.exit(1); 
  });
// ----- FIM: Conexão MySQL -----


const app = express();
const port = process.env.NODE_PORT || 3000;
const saltRounds = 10;

app.use(cors());
app.use(express.json());


// --- ROTA: Criar/Registrar um novo usuário ---
app.post('/users', async (req, res) => {
  const { name, email, password } = req.body;
  console.log(`[Usuários] Recebida requisição para criar usuário com email: ${email}`);

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  let connection; // Define a conexão fora do try para poder usar no finally
  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = uuidv4(); // Usa UUID como ID primário

    connection = await pool.getConnection(); // Obtém uma conexão do pool
    
    // Executa a query SQL para inserir o novo usuário
    const [result] = await connection.query(
      'INSERT INTO Usuarios (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [userId, name, email, passwordHash]
    );

    console.log(`[Usuários] Usuário ${email} criado com sucesso com ID: ${userId}`);
    // Retorna os dados do usuário criado (sem o hash da senha)
    res.status(201).json({ id: userId, name, email });

  } catch (err) {
    // Verifica se o erro é de entrada duplicada (email já existe)
    if (err.code === 'ER_DUP_ENTRY') {
       console.error(`[Usuários] Erro: Email ${email} já existe.`);
       res.status(409).json({ error: 'Este email já está registado.' }); // 409 Conflict
    } else {
       console.error("Erro ao criar usuário:", err);
       res.status(500).json({ error: 'Não foi possível criar o usuário.' });
    }
  } finally {
    // Garante que a conexão seja libertada de volta para o pool, mesmo se ocorrer um erro
    if (connection) connection.release(); 
  }
});


// --- ROTA: Buscar um usuário pelo ID ---
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  console.log(`[Usuários] Buscando usuário ${userId}`);

  let connection;
  try {
    connection = await pool.getConnection();
    // Executa a query para buscar o usuário pelo ID, excluindo o hash da senha
    const [rows] = await connection.query(
      'SELECT id, name, email FROM Usuarios WHERE id = ?', 
      [userId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows[0]); // Retorna o primeiro (e único) resultado
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTA: Login do usuário ---
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[Usuários] Tentativa de login para o email: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    // Busca o usuário pelo email, incluindo o hash da senha para comparação
    const [rows] = await connection.query(
      'SELECT id, name, password_hash FROM Usuarios WHERE email = ?', 
      [email]
    );

    if (rows.length > 0) {
      const user = rows[0];
      // Compara a senha enviada com o hash salvo no banco usando bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (isPasswordValid) {
        console.log(`[Usuários] Login bem-sucedido para ${email}`);
        // No futuro, aqui você geraria e retornaria um Token JWT
        res.status(200).json({
          message: 'Login bem-sucedido!',
          userId: user.id,
          name: user.name
        });
      } else {
        console.log(`[Usuários] Falha no login (senha inválida) para ${email}`);
        res.status(401).json({ error: 'Email ou senha inválidos.' });
      }
    } else {
      console.log(`[Usuários] Falha no login (usuário não encontrado) para ${email}`);
      // Retorna a mesma mensagem genérica para não dar pistas a atacantes
      res.status(401).json({ error: 'Email ou senha inválidos.' }); 
    }
  } catch (err) {
    console.error("Erro durante o login:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTA: Buscar todos os usuários ---
app.get('/users', async (req, res) => {
  console.log(`[Usuários] Buscando todos os usuários.`);
  
  let connection;
  try {
    connection = await pool.getConnection();
    // Seleciona apenas os campos seguros (sem o hash da senha)
    const [rows] = await connection.query('SELECT id, name, email FROM Usuarios');
    res.status(200).json(rows);
  } catch (err) {
    console.error("Erro ao buscar todos os usuários:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
     if (connection) connection.release();
  }
});


app.listen(port, () => {
  console.log(`Serviço de Usuários rodando na porta ${port}`);
});
