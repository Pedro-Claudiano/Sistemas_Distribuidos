const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'usuarios-service' },
  transports: [
    // - Escreve todos os logs com nível `error` (e abaixo) em `error.log`
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // - Escreve todos os logs em `combined.log`
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Se não estivermos em produção, loga também no console (terminal)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;