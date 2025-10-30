const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken'); // Necessário para validação JWT
const mysql = require('mysql2/promise'); // Driver MySQL

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
    console.log(`[Reservas] Conectado ao MySQL no host: ${process.env.DB_HOST} com sucesso!`);
    connection.release();
  })
  .catch(err => {
    console.error(`[Reservas] ERRO ao conectar ao MySQL: ${err.message}`);
  });
// ----- FIM: Conexão MySQL -----

const app = express();
// CRIAMOS UM ROUTER SEPARADO PARA A API
const apiRouter = express.Router();

const port = process.env.NODE_PORT || 3001;

app.use(cors());
app.use(express.json());

// ----- INÍCIO: Middleware de Autenticação JWT -----
// MUDANÇA: Este middleware será usado pelo apiRouter
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    console.log("[Auth - Reservas] Token não encontrado no cabeçalho Authorization");
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
     console.error("[Auth - Reservas] ERRO: JWT_SECRET não está definido!");
     return res.status(500).json({ error: 'Erro interno do servidor (JWT Config)' });
  }

  jwt.verify(token, secret, (err, userPayload) => {
    if (err) {
      console.log("[Auth - Reservas] Token inválido ou expirado:", err.message);
      return res.status(403).json({ error: 'Token inválido ou expirado.' }); // Token inválido/expirado
    }
    console.log("[Auth - Reservas] Token validado com sucesso para userId:", userPayload.userId);
    req.user = userPayload; // Adiciona o payload do token (contendo userId) ao objeto req
    next(); // Passa para a próxima função (a rota principal)
  });
}
// ----- FIM: Middleware de Autenticação JWT -----


// --- ROTA PARA CRIAR UMA NOVA RESERVA (Protegida por JWT) ---
// MUDANÇA: de app.post para apiRouter.post
apiRouter.post('/reservas', authenticateToken, async (req, res) => {
  // O userId AGORA VEM do token verificado, não do corpo da requisição
  const userId = req.user.userId;
  // Os outros dados vêm do corpo (usando os nomes das colunas SQL)
  const { room_id, start_time, end_time } = req.body;

  console.log(`[Reservas] Recebida requisição de reserva para sala ${room_id} por usuário ${userId}`);

  if (!userId || !room_id || !start_time || !end_time) {
    // userId é validado pelo token, mas verificamos os outros campos
    return res.status(400).json({ error: 'room_id, start_time e end_time são obrigatórios.' });
  }

  const newReservationId = uuidv4();
  let connection;

  try {
    connection = await pool.getConnection();

    // Executa a query SQL para inserir a nova reserva
    const [result] = await connection.query(
      'INSERT INTO Reservas (id, user_id, room_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
      [newReservationId, userId, room_id, start_time, end_time]
    );

    console.log(`[Reservas] Reserva ${newReservationId} criada com sucesso.`);
    // Retorna os dados da reserva criada
    res.status(201).json({
      id: newReservationId,
      userId, // Confirma o userId do token
      roomId: room_id, // Pode retornar camelCase para o frontend se preferir
      startTime: start_time,
      endTime: end_time
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.warn(`[Reservas] Tentativa de reserva duplicada para sala ${room_id} às ${start_time}`);
      res.status(409).json({ error: 'Esta sala já está reservada para este horário.' });
    } else {
      console.error("Erro ao criar reserva:", err);
      res.status(500).json({ error: 'Não foi possível criar a reserva.' });
    }
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTA PARA LISTAR TODAS AS RESERVAS (Protegida por JWT) ---
// MUDANÇA: de app.get para apiRouter.get
apiRouter.get('/reservas', authenticateToken, async (req, res) => {
  console.log(`[Reservas] Buscando todas as reservas.`);
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM Reservas');
    res.status(200).json(rows);
  } catch (err) {
    console.error("Erro ao buscar todas as reservas:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
     if (connection) connection.release();
  }
});

// --- ROTA PARA LISTAR RESERVAS DE UM USUÁRIO ESPECÍFICO (Protegida por JWT) ---
// MUDANÇA: de app.get para apiRouter.get
apiRouter.get('/reservas/usuario/:userId', authenticateToken, async (req, res) => {
  const requestedUserId = req.params.userId;
  // Opcional: Adicionar verificação se o usuário do token pode ver estas reservas
  console.log(`[Reservas] Buscando reservas para o usuário ${requestedUserId}`);

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM Reservas WHERE user_id = ?',
      [requestedUserId]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error(`Erro ao buscar reservas para o usuário ${requestedUserId}:`, err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTA PARA DELETAR UMA RESERVA (Protegida por JWT) ---
// MUDANÇA: de app.delete para apiRouter.delete
apiRouter.delete('/reservas/:id', authenticateToken, async (req, res) => {
  const reservationIdToDelete = req.params.id;
  const userIdFromToken = req.user.userId;
  console.log(`[Reservas] Usuário ${userIdFromToken} requisitou deletar reserva ${reservationIdToDelete}`);
  let connection;
  try {
    connection = await pool.getConnection();

    // Adiciona uma verificação extra: só permite apagar se a reserva pertencer ao usuário (ou se for admin, etc.)
    // Esta lógica pode ser ajustada conforme as regras do seu negócio.
    const [result] = await connection.query(
      'DELETE FROM Reservas WHERE id = ? AND user_id = ?', // Adiciona a condição user_id
      [reservationIdToDelete, userIdFromToken]
    );

    if (result.affectedRows > 0) {
      console.log(`[Reservas] Reserva ${reservationIdToDelete} deletada com sucesso pelo usuário ${userIdFromToken}.`);
      res.status(200).json({ message: "Reserva deletada com sucesso." });
    } else {
      // Pode ser que a reserva não exista OU não pertença ao usuário
      // Para saber a diferença, pode-se fazer um SELECT antes
      console.log(`[Reservas] Reserva ${reservationIdToDelete} não encontrada ou não pertence ao usuário ${userIdFromToken}.`);
      res.status(404).json({ error: "Reserva não encontrada ou não pertence ao usuário." });
    }
  } catch (err) {
    console.error(`Erro ao deletar reserva ${reservationIdToDelete}:`, err);
    res.status(500).json({ error: 'Não foi possível deletar a reserva.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- NOVO: Endpoint de Health Check (direto no 'app') ---
app.get('/health', async (req, res) => {
  console.log("[Health Check] Verificando saúde do serviço de reservas...");
  try {
    // Tenta obter uma conexão do pool para verificar a saúde do BD
    const connection = await pool.getConnection();
    await connection.ping(); // Verifica se o servidor MySQL responde
    connection.release();
    console.log("[Health Check] Serviço de reservas OK.");
    res.status(200).send('OK');
  } catch (err) {
    console.error("[Health Check] Serviço de reservas NÃO está saudável:", err.message);
    res.status(503).send('Service Unavailable'); // 503 Service Unavailable
  }
});

// --- NOVO: Registra o router da API com o prefixo /api ---
app.use('/api', apiRouter);


// Inicia o servidor e guarda a referência
const server = app.listen(port, () => {
  console.log(`Serviço de Reservas rodando na porta ${port}`);
});

// --- NOVO: Lógica de Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Recebido sinal ${signal}. Fechando conexões...`);
  server.close(async () => {
    console.log('[Shutdown] Servidor HTTP fechado.');
    try {
      await pool.end();
      console.log('[Shutdown] Pool do MySQL fechado com sucesso.');
    } catch (err) {
      console.error('[Shutdown] Erro ao fechar pool do MySQL:', err.message);
    } finally {
       console.log('[Shutdown] Encerrando processo.');
       process.exit(0);
    }
  });
  setTimeout(() => {
    console.error('[Shutdown] Timeout! Forçando encerramento.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));