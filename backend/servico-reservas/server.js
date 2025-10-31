const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken'); // Necessário para validação JWT
const mysql = require('mysql2/promise'); // Driver MySQL
const Redis = require('ioredis'); // ----- NOVO (Passo 2) -----

// ----- INÍCIO: Conexão MySQL (MODIFICADO COM RETENTATIVAS) -----
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Adiciona um timeout para a tentativa de conexão
  connectTimeout: 10000 
});

// Função para tentar conectar ao MySQL com retentativas
const connectToMySQL = async () => {
  let retries = 5; // Tenta 5 vezes
  while (retries) {
    try {
      const connection = await pool.getConnection();
      console.log(`[Reservas] Conectado ao MySQL no host: ${process.env.DB_HOST} com sucesso!`);
      connection.release();
      break; // Sucesso, sai do loop
    } catch (err) {
      console.error(`[Reservas] ERRO ao conectar ao MySQL: ${err.message}. Tentando novamente em 5s... (${retries} tentativas restantes)`);
      retries -= 1;
      // Espera 5 segundos antes de tentar de novo
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  
  if (!retries) {
      console.error("[Reservas] Falha ao conectar ao MySQL após várias tentativas. Encerrando.");
      // Em produção, você pode querer que o container pare se não conseguir conectar
      // process.exit(1); 
  }
};

// Inicia a tentativa de conexão
connectToMySQL();
// ----- FIM: Conexão MySQL (MODIFICADO COM RETENTATIVAS) -----


// ----- NOVO: Conexão Redis (Passo 2) -----
// Cria a instância do cliente Redis.
// Ele automaticamente usa a variável de ambiente REDIS_HOST que definimos!
const redisClient = new Redis({
  host: process.env.REDIS_HOST, // Pega 'redis_lock' do docker-compose
  port: 6379,                   // Porta padrão do Redis
  maxRetriesPerRequest: null    // Tenta reconectar para sempre
});

// Eventos para monitorar a conexão
redisClient.on('connect', () => {
  console.log(`[Reservas] Conectado ao Redis no host: ${process.env.REDIS_HOST} com sucesso!`);
});

redisClient.on('error', (err) => {
  console.error('[Reservas] ERRO na conexão com o Redis:', err);
});
// ----- FIM: Conexão Redis -----

console.log(`[Reservas] Tentando conectar ao Redis no host: '${process.env.REDIS_HOST}'`);

const app = express();
const port = process.env.NODE_PORT || 3001;

app.use(cors());
app.use(express.json());

// ----- INÍCIO: Middleware de Autenticação JWT -----
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


// --- ROTA PARA CRIAR UMA NOVA RESERVA (MODIFICADA com Lock - Passo 3) ---
app.post('/reservas', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { room_id, start_time, end_time } = req.body;

  console.log(`[Reservas] Recebida requisição de reserva para sala ${room_id} por usuário ${userId}`);

  if (!userId || !room_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'room_id, start_time e end_time são obrigatórios.' });
  }

  // --- INÍCIO DA LÓGICA DE LOCK (Exclusão Mútua) ---
  
  // 1. Define uma chave única para este recurso (sala + horário de início)
  // Usamos um formato simples para garantir que reservas conflitantes usem a mesma chave.
  const lockKey = `lock:room:${room_id}:time:${start_time}`;
  const lockValue = uuidv4(); // Um valor único para identificar nosso lock
  const lockTTL = 10; // Lock expira em 10 segundos (para evitar travar para sempre)

  let connection;
  let lockAcquired = false;

  try {
    // 2. Tenta adquirir o lock (SET if Not eXists, com Expiração)
    const result = await redisClient.set(lockKey, lockValue, 'EX', lockTTL, 'NX');

    if (result !== 'OK') {
      // Se 'result' não for 'OK', significa que 'NX' falhou (a chave já existe)
      console.warn(`[Lock] Conflito de lock para a chave: ${lockKey}`);
      // Retorna 409 Conflict (ou 423 Locked)
      return res.status(409).json({ error: 'Este recurso está sendo reservado por outra pessoa. Tente novamente em alguns segundos.' });
    }

    lockAcquired = true;
    console.log(`[Lock] Lock adquirido com sucesso para a chave: ${lockKey}`);

    // --- FIM DA LÓGICA DE LOCK ---
    
    // 3. Se o lock foi adquirido, prossiga com a lógica de banco de dados
    connection = await pool.getConnection();

    // *** CHECAGEM DE CONFLITO NO BANCO (IMPORTANTE) ***
    // Mesmo com o lock, devemos verificar se a reserva já existe
    // (o lock só previne 'race conditions', não reservas duplicadas lógicas)
    const [existing] = await connection.query(
        'SELECT id FROM Reservas WHERE room_id = ? AND start_time = ?', // Simplificado
        [room_id, start_time]
    );

    if (existing.length > 0) {
        console.warn(`[Reservas] Tentativa de reserva duplicada (lógica) para sala ${room_id}`);
        // Nota: O erro 409 aqui é diferente do erro 409 do lock
        return res.status(409).json({ error: 'Esta sala já está reservada para este horário.' });
    }

    // 4. Insere a nova reserva no banco
    const newReservationId = uuidv4();
    await connection.query(
      'INSERT INTO Reservas (id, user_id, room_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
      [newReservationId, userId, room_id, start_time, end_time]
    );

    console.log(`[Reservas] Reserva ${newReservationId} criada com sucesso.`);
    
    // 5. Retorna sucesso
    res.status(201).json({
      id: newReservationId,
      userId,
      roomId: room_id,
      startTime: start_time,
      endTime: end_time
    });

  } catch (err) {
    // Trata erros de banco de dados ou outros
    console.error("Erro ao criar reserva:", err);
    res.status(500).json({ error: 'Não foi possível criar a reserva.' });
  
  } finally {
    // 6. LIBERA O LOCK (crucial!)
    // O 'finally' garante que o lock seja liberado mesmo se o código falhar.
    if (lockAcquired) {
        // Apenas deleta o lock se formos nós que o pegamos (opcional, mas boa prática)
        // Para uma versão simples, `redisClient.del(lockKey)` é suficiente.
        const currentLockValue = await redisClient.get(lockKey);
        if (currentLockValue === lockValue) {
            await redisClient.del(lockKey);
            console.log(`[Lock] Lock liberado com sucesso para a chave: ${lockKey}`);
        } else {
            console.warn(`[Lock] Lock ${lockKey} não foi liberado (pode ter expirado ou mudado).`);
        }
    }
    
    // Libera a conexão do MySQL
    if (connection) connection.release();
  }
});

// --- ROTA PARA LISTAR TODAS AS RESERVAS (Protegida por JWT) ---
app.get('/reservas', authenticateToken, async (req, res) => {
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
app.get('/reservas/usuario/:userId', authenticateToken, async (req, res) => {
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
app.delete('/reservas/:id', authenticateToken, async (req, res) => {
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

// --- Endpoint de Health Check ---
app.get('/health', async (req, res) => {
  console.log("[Health Check] Verificando saúde do serviço de reservas...");
  try {
    // Tenta obter uma conexão do pool para verificar a saúde do BD
    const connection = await pool.getConnection();
    await connection.ping(); // Verifica se o servidor MySQL responde
    connection.release();
    
    // ----- MODIFICADO (Passo 2) -----
    // Verifica a saúde do Redis
    await redisClient.ping();
    
    console.log("[Health Check] Serviço de reservas e conexões (MySQL, Redis) OK.");
    res.status(200).send('OK');
  } catch (err) {
    console.error("[Health Check] Serviço de reservas NÃO está saudável:", err.message);
    res.status(503).send('Service Unavailable'); // 503 Service Unavailable
  }
});


// Inicia o servidor e guarda a referência
const server = app.listen(port, () => {
  console.log(`Serviço de Reservas rodando na porta ${port}`);
});

// --- MODIFICADO: Lógica de Graceful Shutdown (Passo 2) ---
const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Recebido sinal ${signal}. Fechando conexões...`);
  server.close(async () => {
    console.log('[Shutdown] Servidor HTTP fechado.');
    try {
      // Tenta fechar ambas as conexões
      await Promise.all([
          pool.end(),
          redisClient.quit()
      ]);
      console.log('[Shutdown] Pool do MySQL e conexão Redis fechados com sucesso.');
    } catch (err) {
      console.error('[Shutdown] Erro ao fechar conexões de banco de dados:', err.message);
    } finally {
       console.log('[Shutdown] Encerrando processo.');
       process.exit(0);
    }
  });
  setTimeout(() => {
    console.error('[Shutdown] Timeout! Forçando encerrando.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));