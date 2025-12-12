// Script para executar via ECS Exec para configurar o banco
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function fixDatabase() {
  const config = {
    host: 'reservas-db.co7ei6mgk8xx.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: 'ReservasDB123!',
    port: 3306,
    connectTimeout: 30000
  };

  let connection;
  
  try {
    console.log('🔄 Conectando ao RDS...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado!');

    // 1. Criar database
    console.log('🔄 Criando database reservas_db...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS reservas_db');
    await connection.execute('USE reservas_db');
    console.log('✅ Database configurado!');

    // 2. Criar tabelas
    console.log('🔄 Criando tabelas...');
    
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
    
    console.log('✅ Tabelas criadas!');

    // 3. Criar admin
    console.log('🔄 Criando admin...');
    const adminId = uuidv4();
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(`
      INSERT IGNORE INTO Usuarios (id, name, email, password_hash, role) 
      VALUES (?, 'Administrador', 'admin@exemplo.com', ?, 'admin')
    `, [adminId, adminPassword]);
    
    console.log('✅ Admin criado: admin@exemplo.com / admin123');

    // 4. Criar salas
    console.log('🔄 Criando salas...');
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
    
    console.log('✅ Salas criadas!');
    console.log('\n🎉 BANCO CONFIGURADO COM SUCESSO!');
    
    // 5. Verificar se funcionou
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM Usuarios');
    const [rooms] = await connection.execute('SELECT COUNT(*) as count FROM Salas');
    
    console.log(`📊 Usuários: ${users[0].count}`);
    console.log(`📊 Salas: ${rooms[0].count}`);
    
    return true;

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  } finally {
    if (connection) await connection.end();
  }
}

fixDatabase().then(success => {
  console.log(success ? '✅ Sucesso!' : '❌ Falhou!');
  process.exit(success ? 0 : 1);
});