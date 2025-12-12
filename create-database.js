// Script para criar database e tabelas via API
const mysql = require('mysql2/promise');

const config = {
  host: 'reservas-db.co7ei6mgk8xx.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'ReservasDB123!',
  port: 3306
};

async function createDatabase() {
  let connection;
  try {
    // Conectar sem especificar database
    connection = await mysql.createConnection(config);
    console.log('Conectado ao MySQL!');
    
    // Criar database
    await connection.execute('CREATE DATABASE IF NOT EXISTS reservas_db');
    console.log('Database reservas_db criado!');
    
    // Usar o database
    await connection.execute('USE reservas_db');
    
    // Criar tabela de usuários
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Usuarios (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'client') DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela Usuarios criada!');
    
    // Criar usuário admin padrão
    const adminId = 'admin-uuid-123';
    const adminHash = '$2b$10$rQJ5qP7QJ5qP7QJ5qP7QJ5qP7QJ5qP7QJ5qP7QJ5qP7QJ5qP7QJ5qO'; // senha: admin123
    
    await connection.execute(`
      INSERT IGNORE INTO Usuarios (id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `, [adminId, 'Admin', 'admin@exemplo.com', adminHash, 'admin']);
    
    console.log('Usuário admin criado!');
    console.log('Database configurado com sucesso!');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

createDatabase();