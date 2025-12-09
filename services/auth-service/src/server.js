const express = require('express');
const cors = require('cors');
const { connectWithRetry, pool } = require('./config/database');
const usersRouter = require('./routes/users');
const logger = require('./utils/logger');

const app = express();
const port = process.env.NODE_PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use('/api/users', usersRouter);

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
    logger.error(`Health check failed: ${err.message}`);
    res.status(503).json(healthData);
  }
});

connectWithRetry().then(() => {
  const server = app.listen(port, () => {
    logger.info(`Auth Service running on port ${port}`);
  });

  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Closing connections...`);
    server.close(async () => {
      try {
        await pool.end();
        logger.info('Database pool closed');
      } catch (err) {
        logger.error(`Error closing pool: ${err.message}`);
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});
