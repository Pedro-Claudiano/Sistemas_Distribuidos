const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken'); // Necessário para validação JWT
const mysql = require('mysql2/promise'); // Driver MySQL
const Redis = require('ioredis'); // ----- NOVO (Passo 2) -----
const { connectRabbitMQ, sendNotification, startConsumer, closeRabbitMQ } = require('./messaging');

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

// ----- INÍCIO: Conexão RabbitMQ -----
connectRabbitMQ();

// Inicia o consumer para processar notificações
startConsumer(async (notification) => {
  // Salva a notificação no banco de dados
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO Notificacoes (id, user_id, message, type, related_id) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), notification.userId, notification.message, notification.type, notification.relatedId]
    );
    console.log(`[Notificação] Salva no banco para usuário ${notification.userId}`);
  } catch (err) {
    console.error('[Notificação] Erro ao salvar no banco:', err.message);
  } finally {
    if (connection) connection.release();
  }
});
// ----- FIM: Conexão RabbitMQ -----


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
const apiRouter = express.Router();

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
    console.log("[Auth - Reservas] Token validado com sucesso para userId:", userPayload.userId, "role:", userPayload.role);
    req.user = userPayload; // Adiciona o payload do token (contendo userId e role) ao objeto req
    next(); // Passa para a próxima função (a rota principal)
  });
}
// ----- FIM: Middleware de Autenticação JWT -----

// ----- INÍCIO: Middleware de Autorização por Role -----
function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log(`[RBAC - Reservas] Acesso negado. User: ${req.user?.userId}, Role: ${req.user?.role}, Required: ${allowedRoles}`);
      return res.status(403).json({ error: 'Acesso negado: Você não tem permissão para realizar esta ação.' });
    }
    next();
  };
}
// ----- FIM: Middleware de Autorização por Role -----


// --- ROTAS PARA SALAS ---

// Listar todas as salas (público)
apiRouter.get('/salas', async (req, res) => {
  console.log('[Salas] Listando todas as salas.');
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM Salas ORDER BY name');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erro ao listar salas:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// Criar sala (Admin only)
apiRouter.post('/salas', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { name, location } = req.body;
  const adminId = req.user.userId;

  console.log(`[Salas] Admin ${adminId} criando sala: ${name}`);

  if (!name || !location) {
    return res.status(400).json({ error: 'name e location são obrigatórios.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    
    // Verifica se já existe uma sala com o mesmo nome e local
    const [existing] = await connection.query(
      'SELECT id FROM Salas WHERE name = ? AND location = ?',
      [name, location]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Já existe uma sala com este nome neste local.' });
    }

    const salaId = uuidv4();
    await connection.query(
      'INSERT INTO Salas (id, name, location) VALUES (?, ?, ?)',
      [salaId, name, location]
    );

    console.log(`[Salas] Sala ${salaId} criada com sucesso.`);
    res.status(201).json({ id: salaId, name, location });
  } catch (err) {
    console.error('Erro ao criar sala:', err);
    // Verifica se é erro de chave duplicada
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe uma sala com este nome neste local.' });
    }
    res.status(500).json({ error: 'Não foi possível criar a sala.' });
  } finally {
    if (connection) connection.release();
  }
});

// Atualizar sala (Admin only)
apiRouter.put('/salas/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const salaId = req.params.id;
  const { name, location } = req.body;
  const adminId = req.user.userId;

  console.log(`[Salas] Admin ${adminId} atualizando sala ${salaId}`);

  if (!name && !location) {
    return res.status(400).json({ error: 'Forneça pelo menos um campo para atualizar.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    
    // Busca a sala atual
    const [salas] = await connection.query('SELECT * FROM Salas WHERE id = ?', [salaId]);
    if (salas.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada.' });
    }

    const sala = salas[0];
    const newName = name || sala.name;
    const newLocation = location || sala.location;

    await connection.query(
      'UPDATE Salas SET name = ?, location = ? WHERE id = ?',
      [newName, newLocation, salaId]
    );

    console.log(`[Salas] Sala ${salaId} atualizada com sucesso.`);
    res.status(200).json({ id: salaId, name: newName, location: newLocation });
  } catch (err) {
    console.error('Erro ao atualizar sala:', err);
    res.status(500).json({ error: 'Não foi possível atualizar a sala.' });
  } finally {
    if (connection) connection.release();
  }
});

// Deletar sala (Admin only)
apiRouter.delete('/salas/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const salaId = req.params.id;
  const adminId = req.user.userId;

  console.log(`[Salas] Admin ${adminId} deletando sala ${salaId}`);

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM Salas WHERE id = ?', [salaId]);

    if (result.affectedRows > 0) {
      console.log(`[Salas] Sala ${salaId} deletada com sucesso.`);
      res.status(200).json({ message: 'Sala deletada com sucesso.' });
    } else {
      res.status(404).json({ error: 'Sala não encontrada.' });
    }
  } catch (err) {
    console.error('Erro ao deletar sala:', err);
    res.status(500).json({ error: 'Não foi possível deletar a sala.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTA PARA BUSCAR HORÁRIOS DISPONÍVEIS ---
apiRouter.get('/salas/:salaId/horarios-disponiveis', async (req, res) => {
  const { salaId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Data é obrigatória (formato: YYYY-MM-DD)' });
  }

  console.log(`[Horários] Buscando horários disponíveis para sala ${salaId} na data ${date}`);

  // Todos os horários possíveis
  const allTimeSlots = [
    { label: '08:00 - 08:50', start: '08:00:00', end: '08:50:00' },
    { label: '08:50 - 09:40', start: '08:50:00', end: '09:40:00' },
    { label: '09:40 - 10:30', start: '09:40:00', end: '10:30:00' },
    { label: '10:50 - 11:40', start: '10:50:00', end: '11:40:00' },
    { label: '11:40 - 12:30', start: '11:40:00', end: '12:30:00' },
    { label: '13:50 - 14:40', start: '13:50:00', end: '14:40:00' },
    { label: '14:40 - 15:30', start: '14:40:00', end: '15:30:00' },
    { label: '15:50 - 16:40', start: '15:50:00', end: '16:40:00' },
    { label: '16:40 - 17:30', start: '16:40:00', end: '17:30:00' },
  ];

  let connection;
  try {
    connection = await pool.getConnection();

    // Busca todas as reservas para essa sala nessa data
    const [reservas] = await connection.query(
      `SELECT start_time, end_time FROM Reservas 
       WHERE room_id = ? 
       AND DATE(start_time) = ?`,
      [salaId, date]
    );

    // Filtra os horários que não estão reservados
    const availableSlots = allTimeSlots.filter(slot => {
      const slotStart = `${date}T${slot.start}`;
      const slotEnd = `${date}T${slot.end}`;

      // Verifica se há conflito com alguma reserva existente
      const hasConflict = reservas.some(reserva => {
        const reservaStart = reserva.start_time.toISOString().slice(0, 19);
        const reservaEnd = reserva.end_time.toISOString().slice(0, 19);
        
        // Há conflito se os horários se sobrepõem
        return slotStart < reservaEnd && slotEnd > reservaStart;
      });

      return !hasConflict;
    });

    console.log(`[Horários] ${availableSlots.length} horários disponíveis encontrados`);
    res.status(200).json(availableSlots);
  } catch (err) {
    console.error('Erro ao buscar horários disponíveis:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTA PARA CRIAR UMA NOVA RESERVA (MODIFICADA com Lock - Passo 3) ---
apiRouter.post('/reservas', authenticateToken, async (req, res) => {
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
    // Verifica se há sobreposição de horários
    // Uma reserva conflita se:
    // - Começa antes do fim da nova reserva E
    // - Termina depois do início da nova reserva
    const [existing] = await connection.query(
        `SELECT id FROM Reservas 
         WHERE room_id = ? 
         AND start_time < ? 
         AND end_time > ?`,
        [room_id, end_time, start_time]
    );

    if (existing.length > 0) {
        console.warn(`[Reservas] Conflito de horário para sala ${room_id} entre ${start_time} e ${end_time}`);
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
// Clientes veem apenas suas reservas, Admins veem todas
apiRouter.get('/reservas', authenticateToken, async (req, res) => {
  const userIdFromToken = req.user.userId;
  const userRole = req.user.role;
  
  console.log(`[Reservas] Usuário ${userIdFromToken} (${userRole}) buscando reservas.`);
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Se for ADMIN, retorna todas as reservas
    // Se for CLIENT, retorna apenas as suas
    let query, params;
    if (userRole === 'admin') {
      query = 'SELECT * FROM Reservas ORDER BY start_time DESC';
      params = [];
      console.log(`[Reservas] Admin buscando TODAS as reservas.`);
    } else {
      query = 'SELECT * FROM Reservas WHERE user_id = ? ORDER BY start_time DESC';
      params = [userIdFromToken];
      console.log(`[Reservas] Cliente buscando apenas suas reservas.`);
    }
    
    const [rows] = await connection.query(query, params);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Erro ao buscar reservas:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
     if (connection) connection.release();
  }
});

// --- ROTA PARA LISTAR RESERVAS DE UM USUÁRIO ESPECÍFICO (Protegida por JWT) ---
// Clientes só podem ver suas próprias reservas
// Admins podem ver reservas de qualquer usuário
apiRouter.get('/reservas/usuario/:userId', authenticateToken, async (req, res) => {
  const requestedUserId = req.params.userId;
  const userIdFromToken = req.user.userId;
  const userRole = req.user.role;
  
  console.log(`[Reservas] Usuário ${userIdFromToken} (${userRole}) buscando reservas do usuário ${requestedUserId}`);

  // Se não for admin e está tentando ver reservas de outro usuário, nega acesso
  if (userRole !== 'admin' && requestedUserId !== userIdFromToken) {
    console.log(`[Reservas] Acesso negado: Cliente tentando ver reservas de outro usuário.`);
    return res.status(403).json({ error: 'Você não tem permissão para ver reservas de outros usuários.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM Reservas WHERE user_id = ? ORDER BY start_time DESC',
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
// Clientes só podem deletar suas próprias reservas
// Admins podem deletar qualquer reserva (e notificam o cliente afetado)
apiRouter.delete('/reservas/:id', authenticateToken, async (req, res) => {
  const reservationIdToDelete = req.params.id;
  const userIdFromToken = req.user.userId;
  const userRole = req.user.role;
  
  console.log(`[Reservas] Usuário ${userIdFromToken} (${userRole}) requisitou deletar reserva ${reservationIdToDelete}`);
  
  let connection;
  try {
    connection = await pool.getConnection();

    // Primeiro, busca a reserva para pegar informações antes de deletar
    const [reservations] = await connection.query(
      'SELECT user_id, room_id, start_time, end_time FROM Reservas WHERE id = ?',
      [reservationIdToDelete]
    );

    if (reservations.length === 0) {
      return res.status(404).json({ error: "Reserva não encontrada." });
    }

    const reservation = reservations[0];
    const reservationOwnerId = reservation.user_id;

    // Verifica permissões
    if (userRole !== 'admin' && reservationOwnerId !== userIdFromToken) {
      return res.status(403).json({ error: "Você não tem permissão para deletar esta reserva." });
    }

    // Deleta a reserva
    await connection.query('DELETE FROM Reservas WHERE id = ?', [reservationIdToDelete]);

    console.log(`[Reservas] Reserva ${reservationIdToDelete} deletada com sucesso pelo usuário ${userIdFromToken} (${userRole}).`);

    // Se foi um ADMIN que deletou a reserva de OUTRO usuário, envia notificação
    if (userRole === 'admin' && reservationOwnerId !== userIdFromToken) {
      const notification = {
        userId: reservationOwnerId,
        message: `Sua reserva da sala ${reservation.room_id} para ${new Date(reservation.start_time).toLocaleString('pt-BR')} foi cancelada por um administrador.`,
        type: 'reservation_deleted',
        relatedId: reservationIdToDelete
      };
      
      await sendNotification(notification);
      console.log(`[Reservas] Notificação enviada ao usuário ${reservationOwnerId}`);
    }

    res.status(200).json({ message: "Reserva deletada com sucesso." });
  } catch (err) {
    console.error(`Erro ao deletar reserva ${reservationIdToDelete}:`, err);
    res.status(500).json({ error: 'Não foi possível deletar a reserva.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTA PARA ATUALIZAR UMA RESERVA (Admin only) ---
apiRouter.put('/reservas/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const reservationId = req.params.id;
  const { room_id, start_time, end_time } = req.body;
  const adminId = req.user.userId;

  console.log(`[Reservas] Admin ${adminId} atualizando reserva ${reservationId}`);

  if (!room_id && !start_time && !end_time) {
    return res.status(400).json({ error: 'Forneça pelo menos um campo para atualizar.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Busca a reserva atual
    const [reservations] = await connection.query(
      'SELECT user_id, room_id, start_time, end_time FROM Reservas WHERE id = ?',
      [reservationId]
    );

    if (reservations.length === 0) {
      return res.status(404).json({ error: 'Reserva não encontrada.' });
    }

    const oldReservation = reservations[0];
    const affectedUserId = oldReservation.user_id;

    // Atualiza os campos fornecidos
    const newRoomId = room_id || oldReservation.room_id;
    const newStartTime = start_time || oldReservation.start_time;
    const newEndTime = end_time || oldReservation.end_time;

    await connection.query(
      'UPDATE Reservas SET room_id = ?, start_time = ?, end_time = ? WHERE id = ?',
      [newRoomId, newStartTime, newEndTime, reservationId]
    );

    console.log(`[Reservas] Reserva ${reservationId} atualizada com sucesso.`);

    // Envia notificação ao usuário afetado
    const notification = {
      userId: affectedUserId,
      message: `Sua reserva foi modificada por um administrador. Nova sala: ${newRoomId}, Novo horário: ${new Date(newStartTime).toLocaleString('pt-BR')} - ${new Date(newEndTime).toLocaleString('pt-BR')}`,
      type: 'reservation_modified',
      relatedId: reservationId
    };

    await sendNotification(notification);
    console.log(`[Reservas] Notificação de modificação enviada ao usuário ${affectedUserId}`);

    res.status(200).json({
      message: 'Reserva atualizada com sucesso.',
      reservation: {
        id: reservationId,
        roomId: newRoomId,
        startTime: newStartTime,
        endTime: newEndTime
      }
    });
  } catch (err) {
    console.error(`Erro ao atualizar reserva ${reservationId}:`, err);
    res.status(500).json({ error: 'Não foi possível atualizar a reserva.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTAS PARA EVENTOS (Admin only) ---

// Criar Evento
apiRouter.post('/eventos', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { name, description, room_id, start_time, end_time } = req.body;
  const adminId = req.user.userId;

  console.log(`[Eventos] Admin ${adminId} criando evento: ${name}`);

  if (!name || !room_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'name, room_id, start_time e end_time são obrigatórios.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Verifica se a sala já está reservada nesse horário
    const [conflicts] = await connection.query(
      'SELECT id FROM Reservas WHERE room_id = ? AND start_time = ?',
      [room_id, start_time]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Esta sala já está reservada para este horário.' });
    }

    // Cria o evento
    const eventId = uuidv4();
    await connection.query(
      'INSERT INTO Eventos (id, name, description, room_id, start_time, end_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [eventId, name, description || '', room_id, start_time, end_time, adminId]
    );

    console.log(`[Eventos] Evento ${eventId} criado com sucesso.`);

    // Busca todos os usuários para notificar sobre o novo evento
    const [users] = await connection.query('SELECT id FROM Usuarios WHERE role = "client"');
    
    // Envia notificação para todos os clientes
    for (const user of users) {
      const notification = {
        userId: user.id,
        message: `Novo evento criado: "${name}" na sala ${room_id} em ${new Date(start_time).toLocaleString('pt-BR')}`,
        type: 'event_created',
        relatedId: eventId
      };
      await sendNotification(notification);
    }

    console.log(`[Eventos] Notificações enviadas para ${users.length} usuários.`);

    res.status(201).json({
      id: eventId,
      name,
      description,
      roomId: room_id,
      startTime: start_time,
      endTime: end_time,
      createdBy: adminId
    });
  } catch (err) {
    console.error('Erro ao criar evento:', err);
    res.status(500).json({ error: 'Não foi possível criar o evento.' });
  } finally {
    if (connection) connection.release();
  }
});

// Listar Eventos
apiRouter.get('/eventos', authenticateToken, async (req, res) => {
  console.log(`[Eventos] Usuário ${req.user.userId} listando eventos.`);

  let connection;
  try {
    connection = await pool.getConnection();
    const [events] = await connection.query('SELECT * FROM Eventos ORDER BY start_time DESC');
    res.status(200).json(events);
  } catch (err) {
    console.error('Erro ao listar eventos:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// Deletar Evento (Admin only)
apiRouter.delete('/eventos/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const eventId = req.params.id;
  const adminId = req.user.userId;

  console.log(`[Eventos] Admin ${adminId} deletando evento ${eventId}`);

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM Eventos WHERE id = ?', [eventId]);

    if (result.affectedRows > 0) {
      console.log(`[Eventos] Evento ${eventId} deletado com sucesso.`);
      res.status(200).json({ message: 'Evento deletado com sucesso.' });
    } else {
      res.status(404).json({ error: 'Evento não encontrado.' });
    }
  } catch (err) {
    console.error(`Erro ao deletar evento ${eventId}:`, err);
    res.status(500).json({ error: 'Não foi possível deletar o evento.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTAS PARA NOTIFICAÇÕES ---

// Listar Notificações do Usuário
apiRouter.get('/notificacoes', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  console.log(`[Notificações] Usuário ${userId} buscando suas notificações.`);

  let connection;
  try {
    connection = await pool.getConnection();
    const [notifications] = await connection.query(
      'SELECT * FROM Notificacoes WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Erro ao buscar notificações:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// Marcar Notificação como Lida
apiRouter.put('/notificacoes/:id/lida', authenticateToken, async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.userId;

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE Notificacoes SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Notificação marcada como lida.' });
    } else {
      res.status(404).json({ error: 'Notificação não encontrada.' });
    }
  } catch (err) {
    console.error('Erro ao marcar notificação:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

app.use('/api', apiRouter);

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

// --- MODIFICADO: Lógica de Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Recebido sinal ${signal}. Fechando conexões...`);
  server.close(async () => {
    console.log('[Shutdown] Servidor HTTP fechado.');
    try {
      // Tenta fechar todas as conexões
      await Promise.all([
          pool.end(),
          redisClient.quit(),
          closeRabbitMQ()
      ]);
      console.log('[Shutdown] Pool do MySQL, Redis e RabbitMQ fechados com sucesso.');
    } catch (err) {
      console.error('[Shutdown] Erro ao fechar conexões:', err.message);
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
// --- NOVAS ROTAS PARA SISTEMA DE APROVAÇÃO ---

// Rota para admin propor mudança (requer aprovação do cliente)
apiRouter.put('/reservas/:id/propor-mudanca', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const reservationId = req.params.id;
  const { room_id, start_time, end_time } = req.body;
  const adminId = req.user.userId;

  console.log(`[Mudanças] Admin ${adminId} propondo mudança para reserva ${reservationId}`);

  if (!room_id && !start_time && !end_time) {
    return res.status(400).json({ error: 'Forneça pelo menos um campo para alterar.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Busca a reserva atual
    const [reservations] = await connection.query(
      'SELECT user_id, room_id, start_time, end_time FROM Reservas WHERE id = ?',
      [reservationId]
    );

    if (reservations.length === 0) {
      return res.status(404).json({ error: 'Reserva não encontrada.' });
    }

    const oldReservation = reservations[0];
    const affectedUserId = oldReservation.user_id;

    // Verifica se a mudança é com pelo menos 2 dias de antecedência
    const currentDate = new Date();
    const reservationDate = new Date(oldReservation.start_time);
    const daysDifference = (reservationDate - currentDate) / (1000 * 60 * 60 * 24);

    if (daysDifference < 2) {
      return res.status(400).json({ error: 'Mudanças só podem ser propostas com pelo menos 2 dias de antecedência.' });
    }

    // Cria proposta de mudança
    const mudancaId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2); // Expira em 2 dias

    const newRoomId = room_id || oldReservation.room_id;
    const newStartTime = start_time || oldReservation.start_time;
    const newEndTime = end_time || oldReservation.end_time;

    await connection.query(
      `INSERT INTO MudancasPendentes 
       (id, reserva_id, user_id, admin_id, old_room_id, old_start_time, old_end_time, 
        new_room_id, new_start_time, new_end_time, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [mudancaId, reservationId, affectedUserId, adminId, 
       oldReservation.room_id, oldReservation.start_time, oldReservation.end_time,
       newRoomId, newStartTime, newEndTime, expiresAt]
    );

    // Envia notificação ao cliente
    const notification = {
      userId: affectedUserId,
      message: `O administrador propôs uma mudança na sua reserva. Nova sala: ${newRoomId}, Novo horário: ${new Date(newStartTime).toLocaleString('pt-BR')} - ${new Date(newEndTime).toLocaleString('pt-BR')}. Você tem 2 dias para aprovar.`,
      type: 'change_request',
      relatedId: mudancaId
    };

    await sendNotification(notification);
    console.log(`[Mudanças] Proposta de mudança ${mudancaId} criada e notificação enviada`);

    res.status(201).json({
      message: 'Proposta de mudança enviada ao cliente.',
      mudancaId: mudancaId,
      expiresAt: expiresAt
    });
  } catch (err) {
    console.error(`Erro ao propor mudança:`, err);
    res.status(500).json({ error: 'Não foi possível propor a mudança.' });
  } finally {
    if (connection) connection.release();
  }
});

// Rota para cliente responder à proposta de mudança
apiRouter.put('/mudancas/:id/responder', authenticateToken, async (req, res) => {
  const mudancaId = req.params.id;
  const { aprovado } = req.body; // true ou false
  const userId = req.user.userId;

  console.log(`[Mudanças] Usuário ${userId} respondendo à mudança ${mudancaId}: ${aprovado ? 'APROVADO' : 'REJEITADO'}`);

  let connection;
  try {
    connection = await pool.getConnection();

    // Busca a mudança pendente
    const [mudancas] = await connection.query(
      'SELECT * FROM MudancasPendentes WHERE id = ? AND user_id = ? AND status = "pending"',
      [mudancaId, userId]
    );

    if (mudancas.length === 0) {
      return res.status(404).json({ error: 'Mudança não encontrada ou já foi respondida.' });
    }

    const mudanca = mudancas[0];

    // Verifica se não expirou
    if (new Date() > new Date(mudanca.expires_at)) {
      await connection.query(
        'UPDATE MudancasPendentes SET status = "expired" WHERE id = ?',
        [mudancaId]
      );
      return res.status(400).json({ error: 'Esta proposta de mudança expirou.' });
    }

    if (aprovado) {
      // Aplica a mudança na reserva
      await connection.query(
        'UPDATE Reservas SET room_id = ?, start_time = ?, end_time = ? WHERE id = ?',
        [mudanca.new_room_id, mudanca.new_start_time, mudanca.new_end_time, mudanca.reserva_id]
      );

      // Marca como aprovado
      await connection.query(
        'UPDATE MudancasPendentes SET status = "approved", responded_at = NOW() WHERE id = ?',
        [mudancaId]
      );

      // Notifica o admin
      const notification = {
        userId: mudanca.admin_id,
        message: `O cliente aprovou a mudança da reserva para sala ${mudanca.new_room_id} em ${new Date(mudanca.new_start_time).toLocaleString('pt-BR')}.`,
        type: 'change_approved',
        relatedId: mudancaId
      };
      await sendNotification(notification);

      res.status(200).json({ message: 'Mudança aprovada e aplicada com sucesso.' });
    } else {
      // Marca como rejeitado
      await connection.query(
        'UPDATE MudancasPendentes SET status = "rejected", responded_at = NOW() WHERE id = ?',
        [mudancaId]
      );

      // Notifica o admin
      const notification = {
        userId: mudanca.admin_id,
        message: `O cliente rejeitou a proposta de mudança da reserva.`,
        type: 'change_rejected',
        relatedId: mudancaId
      };
      await sendNotification(notification);

      res.status(200).json({ message: 'Mudança rejeitada.' });
    }
  } catch (err) {
    console.error(`Erro ao responder mudança:`, err);
    res.status(500).json({ error: 'Não foi possível processar a resposta.' });
  } finally {
    if (connection) connection.release();
  }
});

// Rota para listar mudanças pendentes do usuário
apiRouter.get('/mudancas-pendentes', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  let connection;
  try {
    connection = await pool.getConnection();
    const [mudancas] = await connection.query(
      `SELECT m.*, r.room_id as current_room_id, r.start_time as current_start_time, r.end_time as current_end_time
       FROM MudancasPendentes m 
       JOIN Reservas r ON m.reserva_id = r.id 
       WHERE m.user_id = ? AND m.status = "pending" AND m.expires_at > NOW()
       ORDER BY m.created_at DESC`,
      [userId]
    );
    res.status(200).json(mudancas);
  } catch (err) {
    console.error('Erro ao buscar mudanças pendentes:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// Rota para admin listar todas as reservas com detalhes do usuário
apiRouter.get('/reservas-detalhadas', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  console.log(`[Reservas] Admin ${req.user.userId} buscando reservas detalhadas.`);
  
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT r.*, u.name as user_name, u.email as user_email 
       FROM Reservas r 
       JOIN Usuarios u ON r.user_id = u.id 
       ORDER BY r.start_time DESC`
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error("Erro ao buscar reservas detalhadas:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  } finally {
     if (connection) connection.release();
  }
});

// Job para cancelar mudanças expiradas (executar periodicamente)
setInterval(async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Busca mudanças expiradas
    const [expiredChanges] = await connection.query(
      'SELECT * FROM MudancasPendentes WHERE status = "pending" AND expires_at < NOW()'
    );

    for (const mudanca of expiredChanges) {
      // Marca como expirada
      await connection.query(
        'UPDATE MudancasPendentes SET status = "expired" WHERE id = ?',
        [mudanca.id]
      );

      // Cancela a reserva original
      await connection.query(
        'UPDATE Reservas SET status = "cancelled" WHERE id = ?',
        [mudanca.reserva_id]
      );

      // Notifica o cliente
      const notification = {
        userId: mudanca.user_id,
        message: `Sua reserva foi cancelada pois você não respondeu à proposta de mudança dentro do prazo.`,
        type: 'change_expired',
        relatedId: mudanca.id
      };
      await sendNotification(notification);

      console.log(`[Mudanças] Reserva ${mudanca.reserva_id} cancelada por expiração da mudança ${mudanca.id}`);
    }
  } catch (err) {
    console.error('Erro no job de limpeza:', err);
  } finally {
    if (connection) connection.release();
  }
}, 60000); // Executa a cada minuto