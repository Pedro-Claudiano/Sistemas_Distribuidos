const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

// ----- INÍCIO: Conexão MySQL -----
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(connection => {
    console.log(`[Usuários] Conectado ao MySQL no host: ${process.env.DB_HOST} com sucesso!`);
    connection.release();
  })
  .catch(err => {
    console.error(`[Usuários] ERRO ao conectar ao MySQL: ${err.message}`);
  });
// ----- FIM: Conexão MySQL -----


const app = express();
// CRIAMOS UM ROUTER SEPARADO PARA A API
const apiRouter = express.Router();

const port = process.env.NODE_PORT || 3000;
const saltRounds = 10;

app.use(cors());
app.use(express.json());


// --- ROTA: Criar/Registrar um novo usuário ---
// MUDANÇA: de app.post para apiRouter.post
apiRouter.post('/users', async (req, res) => {
  const { name, email, password } = req.body;
  console.log(`[Usuários] Recebida requisição para criar usuário com email: ${email}`);
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }
  let connection;
  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = uuidv4();
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO Usuarios (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [userId, name, email, passwordHash]
    );
    console.log(`[Usuários] Usuário ${email} criado com sucesso com ID: ${userId}`);
    res.status(201).json({ id: userId, name, email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error(`[Usuários] Erro: Email ${email} já existe.`);
      res.status(409).json({ error: 'Este email já está registado.' });
    } else {
      console.error("Erro ao criar usuário:", err);
      res.status(500).json({ error: 'Não foi possível criar o usuário.' });
    }
  } finally {
    if (connection) connection.release();
  }
});


// --- ROTA: Buscar um usuário pelo ID ---
// MUDANÇA: de app.get para apiRouter.get
apiRouter.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  console.log(`[Usuários] Buscando usuário ${userId}`);
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, name, email FROM Usuarios WHERE id = ?',
      [userId]
    );
    if (rows.length > 0) {
      res.status(200).json(rows[0]);
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
// MUDANÇA: de app.post para apiRouter.post
apiRouter.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[Usuários] Tentativa de login para o email: ${email}`);
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, name, password_hash FROM Usuarios WHERE email = ?',
      [email]
    );
    if (rows.length > 0) {
      const user = rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (isPasswordValid) {
        console.log(`[Usuários] Login bem-sucedido para ${email}`);
        // GERAÇÃO DO TOKEN JWT
        const payload = { userId: user.id, name: user.name }; // Informações a incluir no token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          console.error("[Login] ERRO FATAL: JWT_SECRET não definido!");
          return res.status(500).json({ error: "Erro interno do servidor (JWT Config)" });
        }
        const token = jwt.sign(payload, secret, { expiresIn: '1h' }); // Token expira em 1 hora
        res.status(200).json({
          message: 'Login bem-sucedido!',
          userId: user.id,
          name: user.name,
          token: token // Retorna o token para o cliente
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
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTA: Buscar todos os usuários ---
// MUDANÇA: de app.get para apiRouter.get
apiRouter.get('/users', async (req, res) => {
  console.log(`[Usuários] Buscando todos os usuários.`);
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, email FROM Usuarios');
    res.status(200).json(rows);
  } catch (err) {
    console.error("Erro ao buscar todos os usuários:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
     if (connection) connection.release();
  }
});

// --- NOVO: Endpoint de Health Check (direto no 'app') ---
app.get('/health', async (req, res) => {
  console.log("[Health Check] Verificando saúde do serviço de usuários...");
  try {
    const connection = await pool.getConnection();
    await connection.ping(); 
    connection.release();
    console.log("[Health Check] Serviço de usuários OK.");
    res.status(200).send('OK');
  } catch (err) {
    console.error("[Health Check] Serviço de usuários NÃO está saudável:", err.message);
    res.status(503).send('Service Unavailable'); 
  }
});

// --- NOVO: Registra o router da API com o prefixo /api ---
app.use('/api', apiRouter);


// Inicia o servidor e guarda a referência para poder fechá-lo depois
const server = app.listen(port, () => {
  console.log(`Serviço de Usuários rodando na porta ${port}`);
});

// --- NOVO: Lógica de Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Recebido sinal ${signal}. Fechando conexões...`);
  
  // 1. Para de aceitar novas conexões HTTP
  server.close(async () => {
    console.log('[Shutdown] Servidor HTTP fechado.');

    // 2. Fecha o pool de conexões do MySQL
    try {
      await pool.end();
      console.log('[Shutdown] Pool do MySQL fechado com sucesso.');
    } catch (err) {
      console.error('[Shutdown] Erro ao fechar pool do MySQL:', err.message);
    } finally {
      // 3. Encerra o processo
      console.log('[Shutdown] Encerrando processo.');
      process.exit(0);
    }
  });

  // Força o encerramento após um timeout, caso algo bloqueie
  setTimeout(() => {
    console.error('[Shutdown] Timeout! Forçando encerramento.');
    process.exit(1);
  }, 10000); // Timeout de 10 segundos
};

// Ouve os sinais de encerramento
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Sinal padrão do Docker/ECS/Kubernetes
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Sinal de Ctrl+C no terminal