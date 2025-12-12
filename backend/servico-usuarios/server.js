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
      
      // Configurar banco na primeira conexão
      await setupDatabaseIfNeeded();
      break; 
    } catch (err) {
      logger.error(`ERRO ao conectar ao MySQL: ${err.message}. Tentativas restantes: ${retries}`);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  if (!retries) logger.error("Falha fatal ao conectar ao MySQL.");
};

const setupDatabaseIfNeeded = async () => {
  try {
    logger.info('Verificando se o banco precisa ser configurado...');
    const connection = await pool.getConnection();
    
    // Tenta usar o database reservas_db
    await connection.execute('USE reservas_db');
    
    // Verifica se a tabela Usuarios existe
    const [tables] = await connection.execute("SHOW TABLES LIKE 'Usuarios'");
    
    if (tables.length === 0) {
      logger.info('Banco não configurado. Configurando...');
      await setupDatabase(connection);
    } else {
      logger.info('Banco já configurado!');
    }
    
    connection.release();
  } catch (err) {
    logger.error(`Erro ao verificar/configurar banco: ${err.message}`);
  }
};

const setupDatabase = async (connection) => {
  try {
    // Criar database se não existir
    await connection.execute('CREATE DATABASE IF NOT EXISTS reservas_db');
    await connection.execute('USE reservas_db');
    
    // Criar tabelas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Usuarios (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Salas (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_sala_name_location (name, location)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Reservas (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        room_id VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_room_time (room_id, start_time),
        FOREIGN KEY (user_id) REFERENCES Usuarios(id)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Eventos (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        room_id VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_event_room_time (room_id, start_time),
        FOREIGN KEY (created_by) REFERENCES Usuarios(id)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Notificacoes (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('reservation_deleted', 'reservation_modified', 'event_created') NOT NULL,
        related_id VARCHAR(36),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Usuarios(id)
      )
    `);
    
    // Criar admin padrão
    const adminId = uuidv4();
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(`
      INSERT IGNORE INTO Usuarios (id, name, email, password_hash, role) 
      VALUES (?, 'Administrador', 'admin@exemplo.com', ?, 'admin')
    `, [adminId, adminPassword]);
    
    // Criar salas de exemplo
    const salas = [
      { id: uuidv4(), name: 'Sala A1', location: 'Prédio A' },
      { id: uuidv4(), name: 'Sala B2', location: 'Prédio B' },
      { id: uuidv4(), name: 'Auditório', location: 'Prédio Principal' },
      { id: uuidv4(), name: 'Lab Informática', location: 'Prédio C' }
    ];

    for (const sala of salas) {
      await connection.execute(`
        INSERT IGNORE INTO Salas (id, name, location) 
        VALUES (?, ?, ?)
      `, [sala.id, sala.name, sala.location]);
    }
    
    logger.info('✅ Banco de dados configurado com sucesso!');
  } catch (err) {
    logger.error(`Erro ao configurar banco: ${err.message}`);
  }
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

// --- ROTAS PARA SALAS ---

// Listar Salas
apiRouter.get('/rooms', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, location, created_at FROM Salas ORDER BY name');
    res.status(200).json(rows);
  } catch (err) {
    logger.error(`Erro ao listar salas: ${err.message}`);
    res.status(500).json({ error: 'Erro ao listar salas.' });
  } finally {
    if (connection) connection.release();
  }
});

// Criar Sala (apenas admin)
apiRouter.post('/rooms', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { name, location } = req.body;
  
  if (!name || !location) {
    return res.status(400).json({ error: 'Nome e localização são obrigatórios.' });
  }
  
  let connection;
  try {
    const roomId = uuidv4();
    
    connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO Salas (id, name, location) VALUES (?, ?, ?)',
      [roomId, name, location]
    );
    
    logger.info(`Nova sala criada: ${name} - ${location} (Admin: ${req.user.userId})`);
    res.status(201).json({ id: roomId, name, location });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
       logger.warn(`Tentativa de criar sala duplicada: ${name} - ${location}`);
       res.status(409).json({ error: 'Já existe uma sala com este nome nesta localização.' });
    } else {
       logger.error(`Erro ao criar sala: ${err.message}`);
       res.status(500).json({ error: 'Erro ao criar sala.' });
    }
  } finally {
    if (connection) connection.release();
  }
});

// Atualizar Sala (apenas admin)
apiRouter.put('/rooms/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const roomId = req.params.id;
  const { name, location } = req.body;
  
  if (!name && !location) {
    return res.status(400).json({ error: 'Forneça pelo menos um campo para atualizar.' });
  }
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Busca a sala atual
    const [rooms] = await connection.query('SELECT * FROM Salas WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada.' });
    }
    
    const room = rooms[0];
    const newName = name || room.name;
    const newLocation = location || room.location;
    
    // Atualiza no banco
    await connection.query(
      'UPDATE Salas SET name = ?, location = ? WHERE id = ?',
      [newName, newLocation, roomId]
    );
    
    logger.info(`Sala ${roomId} atualizada: ${newName} - ${newLocation} (Admin: ${req.user.userId})`);
    res.status(200).json({ message: 'Sala atualizada com sucesso.', id: roomId, name: newName, location: newLocation });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      logger.warn(`Tentativa de atualização com nome/localização duplicados: ${name} - ${location}`);
      return res.status(409).json({ error: 'Já existe uma sala com este nome nesta localização.' });
    }
    logger.error(`Erro ao atualizar sala: ${err.message}`);
    res.status(500).json({ error: 'Erro ao atualizar sala.' });
  } finally {
    if (connection) connection.release();
  }
});

// Deletar Sala (apenas admin)
apiRouter.delete('/rooms/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const roomId = req.params.id;
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Inicia uma transação
    await connection.beginTransaction();
    
    // Verifica se há reservas para esta sala
    const [reservations] = await connection.query('SELECT COUNT(*) as count FROM Reservas WHERE room_id = ?', [roomId]);
    
    if (reservations[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Não é possível deletar uma sala que possui reservas.' });
    }
    
    // Deleta a sala
    const [result] = await connection.query('DELETE FROM Salas WHERE id = ?', [roomId]);
    
    if (result.affectedRows > 0) {
      await connection.commit();
      logger.info(`Sala ${roomId} deletada com sucesso (Admin: ${req.user.userId})`);
      res.status(200).json({ message: 'Sala deletada com sucesso.' });
    } else {
      await connection.rollback();
      res.status(404).json({ error: 'Sala não encontrada.' });
    }
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        logger.error(`Erro ao fazer rollback: ${rollbackErr.message}`);
      }
    }
    logger.error(`Erro ao deletar sala: ${err.message}`);
    res.status(500).json({ error: 'Erro ao deletar sala.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTAS PARA RESERVAS ---

// Listar Reservas (admin vê todas, cliente vê só as suas)
apiRouter.get('/reservas', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    let query;
    let params;
    
    if (req.user.role === 'admin') {
      // Admin vê todas as reservas com informações do usuário
      query = `
        SELECT r.*, u.name as user_name, u.email as user_email 
        FROM Reservas r 
        JOIN Usuarios u ON r.user_id = u.id 
        ORDER BY r.start_time DESC
      `;
      params = [];
    } else {
      // Cliente vê apenas suas reservas
      query = `
        SELECT r.*, u.name as user_name, u.email as user_email 
        FROM Reservas r 
        JOIN Usuarios u ON r.user_id = u.id 
        WHERE r.user_id = ? 
        ORDER BY r.start_time DESC
      `;
      params = [req.user.userId];
    }
    
    const [rows] = await connection.query(query, params);
    res.status(200).json(rows);
  } catch (err) {
    logger.error(`Erro ao listar reservas: ${err.message}`);
    res.status(500).json({ error: 'Erro ao listar reservas.' });
  } finally {
    if (connection) connection.release();
  }
});

// Criar Reserva
apiRouter.post('/reservas', authenticateToken, async (req, res) => {
  const { room_id, start_time, end_time } = req.body;
  
  if (!room_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  
  let connection;
  try {
    const reservaId = uuidv4();
    
    connection = await pool.getConnection();
    
    // Verifica se a sala existe
    const [salas] = await connection.query('SELECT id FROM Salas WHERE id = ?', [room_id]);
    if (salas.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada.' });
    }
    
    // Verifica conflitos de horário
    const [conflicts] = await connection.query(`
      SELECT id FROM Reservas 
      WHERE room_id = ? 
      AND status != 'cancelled'
      AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [room_id, start_time, start_time, end_time, end_time, start_time, end_time]);
    
    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Já existe uma reserva para este horário.' });
    }
    
    await connection.query(
      'INSERT INTO Reservas (id, user_id, room_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?)',
      [reservaId, req.user.userId, room_id, start_time, end_time, 'confirmed']
    );
    
    logger.info(`Nova reserva criada: ${reservaId} (User: ${req.user.userId})`);
    res.status(201).json({ id: reservaId, user_id: req.user.userId, room_id, start_time, end_time, status: 'confirmed' });
  } catch (err) {
    logger.error(`Erro ao criar reserva: ${err.message}`);
    res.status(500).json({ error: 'Erro ao criar reserva.' });
  } finally {
    if (connection) connection.release();
  }
});

// Cancelar Reserva
apiRouter.delete('/reservas/:id', authenticateToken, async (req, res) => {
  const reservaId = req.params.id;
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Verifica se a reserva existe e se o usuário tem permissão
    let query, params;
    if (req.user.role === 'admin') {
      query = 'SELECT * FROM Reservas WHERE id = ?';
      params = [reservaId];
    } else {
      query = 'SELECT * FROM Reservas WHERE id = ? AND user_id = ?';
      params = [reservaId, req.user.userId];
    }
    
    const [reservas] = await connection.query(query, params);
    if (reservas.length === 0) {
      return res.status(404).json({ error: 'Reserva não encontrada ou sem permissão.' });
    }
    
    // Atualiza o status para cancelada
    await connection.query(
      'UPDATE Reservas SET status = ? WHERE id = ?',
      ['cancelled', reservaId]
    );
    
    logger.info(`Reserva ${reservaId} cancelada (User: ${req.user.userId})`);
    res.status(200).json({ message: 'Reserva cancelada com sucesso.' });
  } catch (err) {
    logger.error(`Erro ao cancelar reserva: ${err.message}`);
    res.status(500).json({ error: 'Erro ao cancelar reserva.' });
  } finally {
    if (connection) connection.release();
  }
});

// Propor mudança de reserva (admin)
apiRouter.put('/reservas/:id/propor-mudanca', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const reservaId = req.params.id;
  const { room_id, start_time, end_time } = req.body;
  
  if (!room_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Verifica se a reserva existe
    const [reservas] = await connection.query('SELECT * FROM Reservas WHERE id = ?', [reservaId]);
    if (reservas.length === 0) {
      return res.status(404).json({ error: 'Reserva não encontrada.' });
    }
    
    // Verifica conflitos de horário (excluindo a própria reserva)
    const [conflicts] = await connection.query(`
      SELECT id FROM Reservas 
      WHERE room_id = ? 
      AND id != ?
      AND status != 'cancelled'
      AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [room_id, reservaId, start_time, start_time, end_time, end_time, start_time, end_time]);
    
    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Já existe uma reserva para este horário.' });
    }
    
    // Atualiza a reserva
    await connection.query(
      'UPDATE Reservas SET room_id = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
      [room_id, start_time, end_time, 'pending_approval', reservaId]
    );
    
    logger.info(`Mudança proposta para reserva ${reservaId} (Admin: ${req.user.userId})`);
    res.status(200).json({ message: 'Proposta de mudança enviada com sucesso.' });
  } catch (err) {
    logger.error(`Erro ao propor mudança: ${err.message}`);
    res.status(500).json({ error: 'Erro ao propor mudança.' });
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

// Endpoint para configurar o banco de dados
app.post('/setup/database', async (req, res) => {
  try {
    logger.info('Iniciando configuração do banco de dados...');
    
    // Conectar sem especificar database
    const setupConfig = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 30000
    };
    
    const connection = await mysql.createConnection(setupConfig);
    
    // 1. Criar database
    await connection.query('CREATE DATABASE IF NOT EXISTS reservas_db');
    await connection.query('USE reservas_db');
    logger.info('Database reservas_db criado/selecionado');
    
    // 2. Criar tabelas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Usuarios (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Salas (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_sala_name_location (name, location)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Reservas (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        room_id VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status ENUM('confirmed', 'pending_approval', 'cancelled') NOT NULL DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_room_time (room_id, start_time),
        FOREIGN KEY (user_id) REFERENCES Usuarios(id)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Eventos (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        room_id VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_event_room_time (room_id, start_time),
        FOREIGN KEY (created_by) REFERENCES Usuarios(id)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Notificacoes (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('reservation_deleted', 'reservation_modified', 'event_created') NOT NULL,
        related_id VARCHAR(36),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Usuarios(id)
      )
    `);
    
    logger.info('Tabelas criadas');
    
    // 3. Criar admin padrão
    const adminId = uuidv4();
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(`
      INSERT IGNORE INTO Usuarios (id, name, email, password_hash, role) 
      VALUES (?, 'Administrador', 'admin@exemplo.com', ?, 'admin')
    `, [adminId, adminPassword]);
    
    // 4. Criar salas de exemplo
    const salas = [
      { id: uuidv4(), name: 'Sala A1', location: 'Prédio A' },
      { id: uuidv4(), name: 'Sala B2', location: 'Prédio B' },
      { id: uuidv4(), name: 'Auditório', location: 'Prédio Principal' },
      { id: uuidv4(), name: 'Lab Informática', location: 'Prédio C' }
    ];

    for (const sala of salas) {
      await connection.execute(`
        INSERT IGNORE INTO Salas (id, name, location) 
        VALUES (?, ?, ?)
      `, [sala.id, sala.name, sala.location]);
    }
    
    await connection.end();
    
    logger.info('Banco de dados configurado com sucesso!');
    res.json({
      status: 'SUCCESS',
      message: 'Banco de dados configurado com sucesso!',
      admin: 'admin@exemplo.com / admin123',
      salas: salas.length
    });
    
  } catch (err) {
    logger.error(`Erro ao configurar banco: ${err.message}`);
    res.status(500).json({
      status: 'ERROR',
      error: err.message
    });
  }
});

// Endpoint para corrigir tabela Reservas
app.post('/fix/reservas-table', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verifica se a coluna status já existe
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'reservas_db' 
      AND TABLE_NAME = 'Reservas' 
      AND COLUMN_NAME = 'status'
    `);
    
    if (columns.length === 0) {
      logger.info('Adicionando coluna status à tabela Reservas...');
      
      // Adiciona a coluna status
      await connection.execute(`
        ALTER TABLE Reservas 
        ADD COLUMN status ENUM('confirmed', 'pending_approval', 'cancelled') NOT NULL DEFAULT 'confirmed'
      `);
      
      logger.info('Coluna status adicionada com sucesso!');
    }
    
    // Verifica a estrutura atual da tabela
    const [structure] = await connection.execute('DESCRIBE Reservas');
    
    connection.release();
    
    res.json({
      status: 'SUCCESS',
      message: 'Tabela Reservas corrigida com sucesso!',
      structure: structure
    });
    
  } catch (err) {
    logger.error(`Erro ao corrigir tabela: ${err.message}`);
    res.status(500).json({
      status: 'ERROR',
      error: err.message
    });
  }
});

// Debug endpoint para testar conexão com banco
app.get('/debug/db', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Testa conexão básica
    await connection.ping();
    
    // Tenta usar o database
    await connection.execute('USE reservas_db');
    
    // Verifica se as tabelas existem
    const [tables] = await connection.execute('SHOW TABLES');
    
    connection.release();
    
    res.json({
      status: 'OK',
      database: 'reservas_db',
      tables: tables.map(t => Object.values(t)[0]),
      host: process.env.DB_HOST,
      user: process.env.DB_USER
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      error: err.message,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
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