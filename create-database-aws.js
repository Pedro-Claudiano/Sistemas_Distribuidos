const mysql = require('mysql2/promise');

// Configurações do RDS
const config = {
  host: 'reservas-db.co7ei6mgk8xx.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'ReservasDB123!',
  port: 3306,
  connectTimeout: 30000
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao RDS MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado ao RDS com sucesso!');

    // 1. Criar o database reservas_db
    console.log('🔄 Criando database reservas_db...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS reservas_db');
    console.log('✅ Database reservas_db criado!');

    // 2. Usar o database
    await connection.execute('USE reservas_db');
    console.log('✅ Usando database reservas_db');

    // 3. Criar tabela Usuarios
    console.log('🔄 Criando tabela Usuarios...');
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
    console.log('✅ Tabela Usuarios criada!');

    // 4. Criar tabela Salas
    console.log('🔄 Criando tabela Salas...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Salas (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_sala_name_location (name, location)
      )
    `);
    console.log('✅ Tabela Salas criada!');

    // 5. Criar tabela Reservas
    console.log('🔄 Criando tabela Reservas...');
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
    console.log('✅ Tabela Reservas criada!');

    // 6. Criar tabela Eventos
    console.log('🔄 Criando tabela Eventos...');
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
    console.log('✅ Tabela Eventos criada!');

    // 7. Criar tabela Notificacoes
    console.log('🔄 Criando tabela Notificacoes...');
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
    console.log('✅ Tabela Notificacoes criada!');

    // 8. Inserir usuário admin padrão
    console.log('🔄 Criando usuário admin padrão...');
    const bcrypt = require('bcrypt');
    const { v4: uuidv4 } = require('uuid');
    
    const adminId = uuidv4();
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(`
      INSERT IGNORE INTO Usuarios (id, name, email, password_hash, role) 
      VALUES (?, 'Administrador', 'admin@exemplo.com', ?, 'admin')
    `, [adminId, adminPassword]);
    console.log('✅ Usuário admin criado: admin@exemplo.com / admin123');

    // 9. Inserir algumas salas de exemplo
    console.log('🔄 Criando salas de exemplo...');
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
    console.log('✅ Salas de exemplo criadas!');

    console.log('\n🎉 BANCO DE DADOS CONFIGURADO COM SUCESSO!');
    console.log('📋 Resumo:');
    console.log('   - Database: reservas_db');
    console.log('   - Tabelas: Usuarios, Salas, Reservas, Eventos, Notificacoes');
    console.log('   - Admin: admin@exemplo.com / admin123');
    console.log('   - 4 salas de exemplo criadas');

  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

setupDatabase();