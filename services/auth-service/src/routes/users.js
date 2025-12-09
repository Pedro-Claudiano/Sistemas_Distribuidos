const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/rbac');
const logger = require('../utils/logger');
const CircuitBreaker = require('opossum');

const router = express.Router();
const SALT_ROUNDS = 10;

async function fetchUsersFromDB() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT id, name, email, role FROM Usuarios');
    return rows;
  } finally {
    connection.release();
  }
}

const breakerOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000
};

const breaker = new CircuitBreaker(fetchUsersFromDB, breakerOptions);

breaker.on('open', () => logger.warn('Circuit breaker opened'));
breaker.on('close', () => logger.info('Circuit breaker closed'));
breaker.on('halfOpen', () => logger.info('Circuit breaker half-open'));

router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let connection;
  try {
    const userRole = role || 'client';
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();

    connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO Usuarios (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, passwordHash, userRole]
    );

    logger.info(`User registered: ${email} (${userRole})`);
    res.status(201).json({ id: userId, name, email, role: userRole });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      logger.warn(`Duplicate registration attempt: ${email}`);
      return res.status(409).json({ error: 'Email already registered' });
    }
    logger.error(`Error creating user: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, name, password_hash, role FROM Usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      logger.warn(`Login failed: user not found (${email})`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn(`Login failed: invalid password (${email})`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    logger.info(`Login successful: ${email}`);

    const payload = { userId: user.id, name: user.name, role: user.role };
    const secret = process.env.JWT_SECRET;
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Login successful',
      userId: user.id,
      name: user.name,
      role: user.role,
      token
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  logger.info(`Admin ${req.user.userId} listing users`);

  breaker.fire()
    .then((rows) => res.status(200).json(rows))
    .catch((err) => {
      logger.error(`Circuit breaker failure: ${err.message}`);
      res.status(503).json({ error: 'Service temporarily unavailable' });
    });
});

router.get('/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, name, email, role FROM Usuarios WHERE id = ?',
      [userId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    logger.error(`Error fetching user: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
