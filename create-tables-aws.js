/**
 * Script para criar tabelas no banco de dados AWS
 * 
 * Uso:
 * 1. Edite as variáveis DB_HOST, DB_PASSWORD abaixo
 * 2. Execute: node create-tables-aws.js
 */

const mysql = require('mysql2/promise');

// ========================================
// CONFIGURAÇÃO - EDITE AQUI
// ========================================
const DB_CONFIG = {
  host: 'SEU_ENDPOINT_RDS_AQUI',  // Ex: ls-xxx.us-east-1.rds.amazonaws.com
  user: 'admin',
  password: 'SuaSenhaSegura123!',  // Mesma senha usada no deploy
  database: 'reservas_db',
  port: 3306
};

// ========================================
// SQL para criar tabelas
// ========================================
const CREATE_TABLES_SQL = `
-- Cria a tabela 'Usuarios' com a coluna 'role'
CREATE TABLE IF NOT EXISTS Usuarios (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cria a tabela 'Reservas'
CREATE TABLE IF NOT EXISTS Reservas (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_room_time (room_id, start_time),
    FOREIGN KEY (user_id) REFERENCES Usuarios(id)
);
`;

// ========================================
// Função principal
// ========================================
async function createTables() {
  console.log('========================================');
  console.log('  Criando Tabelas no Banco AWS');
  console.log('========================================');
  console.log('');
  
  // Validar configuração
  if (DB_CONFIG.host === 'SEU_ENDPOINT_RDS_AQUI') {
    console.error('❌ ERRO: Você precisa editar o arquivo e configurar o DB_HOST!');
    console.log('');
    console.log('Como obter o endpoint:');
    console.log('  aws lightsail get-relational-database --relational-database-name reservas-db');
    console.log('');
    console.log('Ou para RDS:');
    console.log('  aws rds describe-db-instances --db-instance-identifier reservas-instance-1');
    console.log('');
    process.exit(1);
  }
  
  console.log('Configuração:');
  console.log(`  Host: ${DB_CONFIG.host}`);
  console.log(`  User: ${DB_CONFIG.user}`);
  console.log(`  Database: ${DB_CONFIG.database}`);
  console.log('');
  
  let connection;
  
  try {
    // Conectar ao banco
    console.log('[1/3] Conectando ao banco de dados...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Conectado com sucesso!');
    console.log('');
    
    // Criar tabelas
    console.log('[2/3] Criando tabelas...');
    
    // Dividir SQL em statements individuais
    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      await connection.query(statement);
    }
    
    console.log('✅ Tabelas criadas com sucesso!');
    console.log('');
    
    // Verificar tabelas
    console.log('[3/3] Verificando tabelas criadas...');
    const [tables] = await connection.query('SHOW TABLES');
    
    console.log('Tabelas encontradas:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  ✅ ${tableName}`);
    });
    console.log('');
    
    // Verificar estrutura das tabelas
    console.log('Estrutura da tabela Usuarios:');
    const [usuariosColumns] = await connection.query('DESCRIBE Usuarios');
    usuariosColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    console.log('');
    
    console.log('Estrutura da tabela Reservas:');
    const [reservasColumns] = await connection.query('DESCRIBE Reservas');
    reservasColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    console.log('');
    
    console.log('========================================');
    console.log('  ✅ Sucesso!');
    console.log('========================================');
    console.log('');
    console.log('Próximos passos:');
    console.log('  1. Teste a aplicação criando um usuário');
    console.log('  2. Faça login e crie uma reserva');
    console.log('  3. Verifique os logs da aplicação');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ ERRO:', error.message);
    console.error('');
    
    if (error.code === 'ENOTFOUND') {
      console.error('Possíveis causas:');
      console.error('  - Endpoint do banco incorreto');
      console.error('  - Banco ainda não está disponível (aguarde 10-15 min)');
      console.error('  - Problema de rede/DNS');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Possíveis causas:');
      console.error('  - Usuário ou senha incorretos');
      console.error('  - Banco de dados não existe');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Possíveis causas:');
      console.error('  - Security Group não permite conexão');
      console.error('  - Banco não está acessível publicamente');
      console.error('  - Firewall bloqueando porta 3306');
    }
    
    console.error('');
    console.error('Como resolver:');
    console.error('  1. Verifique se o banco está disponível:');
    console.error('     aws lightsail get-relational-database --relational-database-name reservas-db');
    console.error('');
    console.error('  2. Verifique o endpoint:');
    console.error('     aws lightsail get-relational-database --relational-database-name reservas-db | findstr address');
    console.error('');
    console.error('  3. Teste conexão com MySQL Workbench');
    console.error('');
    
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão fechada.');
    }
  }
}

// Executar
createTables().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
