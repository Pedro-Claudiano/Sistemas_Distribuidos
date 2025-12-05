const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken'); 
const mysql = require('mysql2/promise'); 
const Redis = require('ioredis');

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
      console.log(`[Reservas] Conectado ao MySQL no host: ${process.env.DB_HOST} com sucesso!`);
      connection.release();
      break; 
    } catch (err) {
      console.error(`[Reservas] ERRO ao conectar ao MySQL: ${err.message}. Tentando novamente...`);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};
connectToMySQL();
// ----- FIM: Conexão MySQL -----


// ----- INÍCIO: Conexão Redis -----
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: null
});

redisClient.on('connect', () => console.log(`[Reservas] Redis conectado!`));
redisClient.on('error', (err) => console.error('[Reservas] Erro Redis:', err));
// ----- FIM: Conexão Redis -----


const app = express();
// 👇 MUDANÇA 1: Criar o Router
const apiRouter = express.Router();

const port = process.env.NODE_PORT || 3001;

app.use(cors());
app.use(express.json());

// ----- Middleware de Autenticação JWT -----
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: 'Token não fornecido.' });

  const secret = process.env.JWT_SECRET;
  jwt.verify(token, secret, (err, userPayload) => {
    if (err) return res.status(403).json({ error: 'Token inválido.' });
    req.user = userPayload; 
    next();
  });
}

function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    next();
  };
}

// 👇 MUDANÇA 2: Usar 'apiRouter' em vez de 'app' nas rotas

// --- CRIAR RESERVA (Com Lock) ---
apiRouter.post('/reservas', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { room_id, start_time, end_time } = req.body;

  console.log(`[Reservas] Nova reserva: ${room_id}`);

  if (!userId || !room_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }

  // LOCK
  const lockKey = `lock:room:${room_id}:time:${start_time}`;
  const lockValue = uuidv4();
  const lockTTL = 10; 

  let connection;
  let lockAcquired = false;

  try {
    const result = await redisClient.set(lockKey, lockValue, 'EX', lockTTL, 'NX');

    if (result !== 'OK') {
      console.warn(`[Lock] Conflito: ${lockKey}`);
      return res.status(409).json({ error: 'Este recurso está sendo reservado por outra pessoa.' });
    }

    lockAcquired = true;
    console.log(`[Lock] Adquirido: ${lockKey}`);

    // 👇 SLEEP PARA A DEMO (Pode remover depois se quiser, mas ajuda na apresentação)
    console.log('[Demo] Simulando processamento (3s)...');
    await new Promise(r => setTimeout(r, 3000)); 

    connection = await pool.getConnection();

    // Verificação Lógica
    const [existing] = await connection.query(
        'SELECT id FROM Reservas WHERE room_id = ? AND start_time = ?', 
        [room_id, start_time]
    );

    if (existing.length > 0) {
        return res.status(409).json({ error: 'Sala já reservada (Conflito Lógico).' });
    }

    // Inserção
    const newId = uuidv4();
    await connection.query(
      'INSERT INTO Reservas (id, user_id, room_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
      [newId, userId, room_id, start_time, end_time]
    );

    console.log(`[Reservas] Sucesso: ${newId}`);
    res.status(201).json({ id: newId, message: 'Reserva criada!' });

  } catch (err) {
    console.error("Erro reserva:", err);
    res.status(500).json({ error: 'Erro interno.' });
  } finally {
    // Release Lock
    if (lockAcquired) {
        const currentVal = await redisClient.get(lockKey);
        if (currentVal === lockValue) {
            await redisClient.del(lockKey);
            console.log(`[Lock] Liberado.`);
        }
    }
    if (connection) connection.release();
  }
});

// --- LISTAR RESERVAS (Admin) ---
apiRouter.get('/reservas', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM Reservas');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
     if (connection) connection.release();
  }
});

// --- LISTAR MINHAS RESERVAS ---
apiRouter.get('/reservas/usuario/:userId', authenticateToken, async (req, res) => {
  const reqId = req.params.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM Reservas WHERE user_id = ?', [reqId]);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// --- APAGAR RESERVA ---
apiRouter.delete('/reservas/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  const userId = req.user.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'DELETE FROM Reservas WHERE id = ? AND user_id = ?', 
      [id, userId]
    );
    if (result.affectedRows > 0) res.status(200).json({ message: "Deletada." });
    else res.status(404).json({ error: "Não encontrada." });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- Health Check ---
app.get('/health', async (req, res) => { // Mantém app.get aqui pois /health pode ser raiz ou /api/health
  res.status(200).send('OK');
});

// 👇 MUDANÇA 3: Registrar o prefixo /api
app.use('/api', apiRouter);


const server = app.listen(port, () => {
  console.log(`Serviço de Reservas rodando na porta ${port}`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] ${signal}`);
  server.close(async () => {
    try { 
        await Promise.all([pool.end(), redisClient.quit()]); 
    } catch (err) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));