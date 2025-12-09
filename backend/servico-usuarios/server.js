const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const logger = require('./logger'); // Importa o nosso sistema de logs
const CircuitBreaker = require('opossum'); // Importa o Circuit Breaker

// ----- INÍCIO: Conexão MySQL -----
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 
});

const connectToMySQL = async () => {
  let retries = 5;
  while (retries) {
    try {
      const connection = await pool.getConnection();
      logger.info(`Conectado ao MySQL no host: ${process.env.DB_HOST} com sucesso!`);
      connection.release();
      break; 
    } catch (err) {
      logger.error(`ERRO ao conectar ao MySQL: ${err.message}. Tentativas restantes: ${retries}`);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  if (!retries) logger.error("Falha fatal ao conectar ao MySQL.");
};

connectToMySQL();
// ----- FIM: Conexão MySQL -----


const app = express();
const port = process.env.NODE_PORT || 3000;
const saltRounds = 10;
const apiRouter = express.Router();

app.use(cors());
app.use(express.json());

// Middleware para logar todas as requisições
app.use((req, res, next) => {
  logger.info(`Requisição recebida: ${req.method} ${req.url}`);
  next();
});

// ----- Middleware de Autenticação JWT -----
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: 'Token não fornecido.' });

  const secret = process.env.JWT_SECRET;
  if (!secret) {
      logger.error("JWT_SECRET não configurado!");
      return res.status(500).json({ error: 'Erro de configuração JWT' });
  }

  jwt.verify(token, secret, (err, userPayload) => {
    if (err) {
        logger.warn(`Token inválido: ${err.message}`);
        return res.status(403).json({ error: 'Token inválido.' });
    }
    req.user = userPayload; 
    next();
  });
}

// ----- Middleware de Autorização por Role (RBAC) -----
function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn(`Acesso negado (RBAC). User: ${req.user?.userId}, Role: ${req.user?.role}, Required: ${allowedRoles}`);
      return res.status(403).json({ error: 'Acesso negado: Você não tem permissão para realizar esta ação.' });
    }
    next();
  };
}

// ----- CONFIGURAÇÃO DO CIRCUIT BREAKER -----
// Função "arriscada" que busca os usuários no banco
async function fetchUsersFromDB() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT id, name, email, role FROM Usuarios');
    return rows;
  } finally {
    connection.release();
  }
}

// Configurações do disjuntor
const breakerOptions = {
  timeout: 3000,               // Falha se demorar mais de 3s
  errorThresholdPercentage: 50, // Abre se 50% das tentativas falharem
  resetTimeout: 10000          // Tenta recuperar após 10s
};

const breaker = new CircuitBreaker(fetchUsersFromDB, breakerOptions);

breaker.on('open', () => logger.warn('🔴 DISJUNTOR ABERTO! O banco de dados parece estar indisponível.'));
breaker.on('close', () => logger.info('🟢 Disjuntor Fechado. O sistema recuperou.'));
breaker.on('halfOpen', () => logger.info('🟡 Disjuntor Meio-Aberto. Testando recuperação...'));


// --- ROTAS (apiRouter) ---

// Registrar Usuário
apiRouter.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }
  
  let connection;
  try {
    const userRole = role || 'client'; 
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = uuidv4();
    
    connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO Usuarios (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, passwordHash, userRole]
    );
    
    logger.info(`Novo usuário registrado: ${email} (${userRole})`);
    res.status(201).json({ id: userId, name, email, role: userRole });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
       logger.warn(`Tentativa de registro duplicado: ${email}`);
       res.status(409).json({ error: 'Email já registado.' });
    } else {
       logger.error(`Erro ao criar user: ${err.message}`);
       res.status(500).json({ error: 'Erro interno.' });
    }
  } finally {
    if (connection) connection.release();
  }
});

// Login
apiRouter.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) return res.status(400).json({ error: 'Dados incompletos.' });
  
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, name, password_hash, role FROM Usuarios WHERE email = ?',
      [email]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (isPasswordValid) {
        logger.info(`Login bem-sucedido: ${email}`);
        
        const payload = { userId: user.id, name: user.name, role: user.role }; 
        const secret = process.env.JWT_SECRET;
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });
        
        res.status(200).json({ message: 'Login OK', userId: user.id, name: user.name, role: user.role, token: token });
      } else {
        logger.warn(`Login falhou (senha incorreta): ${email}`);
        res.status(401).json({ error: 'Credenciais inválidas.' });
      }
    } else {
      logger.warn(`Login falhou (usuário não encontrado): ${email}`);
      res.status(401).json({ error: 'Credenciais inválidas.' });
    }
  } catch (err) {
    logger.error(`Erro no login: ${err.message}`);
    res.status(500).json({ error: 'Erro interno.' });
  } finally {
    if (connection) connection.release();
  }
});

// Listar Usuários (COM CIRCUIT BREAKER + RBAC)
apiRouter.get('/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  logger.info(`Admin ${req.user.userId} listando usuários (via Circuit Breaker).`);
  
  // Usa o breaker.fire() em vez de chamar o banco diretamente
  breaker.fire()
    .then((rows) => {
      res.status(200).json(rows);
    })
    .catch((err) => {
      logger.error(`Falha no Circuit Breaker: ${err.message}`);
      // Retorna 503 (Service Unavailable) para o cliente saber que é temporário
      res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente mais tarde.' });
    });
});

// Buscar Usuário por ID
apiRouter.get('/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, email, role FROM Usuarios WHERE id = ?', [userId]);
    if (rows.length > 0) res.status(200).json(rows[0]);
    else res.status(404).json({ error: 'User not found' });
  } catch (err) {
    logger.error(`Erro ao buscar user ID: ${err.message}`);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// Atualizar Usuário
apiRouter.put('/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  const { email, password } = req.body;
  const userIdFromToken = req.user.userId;
  const userRole = req.user.role;

  // Usuários só podem atualizar seu próprio perfil, admins podem atualizar qualquer um
  if (userRole !== 'admin' && userId !== userIdFromToken) {
    logger.warn(`Tentativa de atualização não autorizada. User: ${userIdFromToken}, Target: ${userId}`);
    return res.status(403).json({ error: 'Você não tem permissão para atualizar este usuário.' });
  }

  if (!email && !password) {
    return res.status(400).json({ error: 'Forneça pelo menos um campo para atualizar.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Busca o usuário atual
    const [users] = await connection.query('SELECT * FROM Usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = users[0];
    const newEmail = email || user.email;
    let newPasswordHash = user.password_hash;

    // Se forneceu nova senha, faz o hash
    if (password) {
      newPasswordHash = await bcrypt.hash(password, saltRounds);
    }

    // Atualiza no banco
    await connection.query(
      'UPDATE Usuarios SET email = ?, password_hash = ? WHERE id = ?',
      [newEmail, newPasswordHash, userId]
    );

    logger.info(`Usuário ${userId} atualizado com sucesso.`);
    res.status(200).json({ message: 'Perfil atualizado com sucesso.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      logger.warn(`Tentativa de atualização com email duplicado: ${email}`);
      return res.status(409).json({ error: 'Este email já está em uso.' });
    }
    logger.error(`Erro ao atualizar usuário: ${err.message}`);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  } finally {
    if (connection) connection.release();
  }
});

// Deletar Usuário
apiRouter.delete('/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  const userIdFromToken = req.user.userId;
  const userRole = req.user.role;

  // Usuários só podem deletar sua própria conta, admins podem deletar qualquer um
  if (userRole !== 'admin' && userId !== userIdFromToken) {
    logger.warn(`Tentativa de deleção não autorizada. User: ${userIdFromToken}, Target: ${userId}`);
    return res.status(403).json({ error: 'Você não tem permissão para deletar este usuário.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    
    // Inicia uma transação para garantir que tudo seja deletado junto
    await connection.beginTransaction();

    // 1. Deleta todas as reservas do usuário
    await connection.query('DELETE FROM Reservas WHERE user_id = ?', [userId]);
    logger.info(`Reservas do usuário ${userId} deletadas.`);

    // 2. Deleta todas as notificações do usuário
    await connection.query('DELETE FROM Notificacoes WHERE user_id = ?', [userId]);
    logger.info(`Notificações do usuário ${userId} deletadas.`);

    // 3. Deleta o usuário
    const [result] = await connection.query('DELETE FROM Usuarios WHERE id = ?', [userId]);

    if (result.affectedRows > 0) {
      // Confirma a transação
      await connection.commit();
      logger.info(`Usuário ${userId} e todos os seus dados deletados com sucesso.`);
      res.status(200).json({ message: 'Conta deletada com sucesso.' });
    } else {
      // Desfaz a transação se o usuário não foi encontrado
      await connection.rollback();
      res.status(404).json({ error: 'Usuário não encontrado.' });
    }
  } catch (err) {
    // Desfaz a transação em caso de erro
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        logger.error(`Erro ao fazer rollback: ${rollbackErr.message}`);
      }
    }
    logger.error(`Erro ao deletar usuário: ${err.message}`);
    res.status(500).json({ error: 'Erro ao deletar conta.' });
  } finally {
    if (connection) connection.release();
  }
});

// Health Check (Monitoramento)
app.get('/health', async (req, res) => {
  const healthData = {
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date(),
    memoryUsage: process.memoryUsage(),
    dbConnection: 'UNKNOWN'
  };

  try {
    const connection = await pool.getConnection();
    await connection.ping(); 
    connection.release();
    healthData.dbConnection = 'OK';
    res.status(200).json(healthData);
  } catch (err) {
    healthData.dbConnection = 'FAIL';
    healthData.status = 'DOWN';
    logger.error(`Health Check Falhou: ${err.message}`);
    res.status(503).json(healthData);
  }
});

// Registra o router
app.use('/api', apiRouter);

const server = app.listen(port, () => {
  logger.info(`Serviço de Usuários iniciado na porta ${port}`);
});

const gracefulShutdown = async (signal) => {
  logger.info(`Sinal ${signal} recebido. Fechando...`);
  server.close(async () => {
    try { await pool.end(); } catch (err) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000); 
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));