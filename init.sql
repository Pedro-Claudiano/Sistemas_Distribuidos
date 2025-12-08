-- Garante que estamos usando o banco de dados correto
USE reservasdb;

-- Cria a tabela 'Usuarios' com a nova coluna 'role'
CREATE TABLE Usuarios (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'client') NOT NULL DEFAULT 'client', -- 👇 NOVA COLUNA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cria a tabela 'Salas'
CREATE TABLE Salas (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cria a tabela 'Reservas'
CREATE TABLE Reservas (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(36) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_room_time (room_id, start_time),
    FOREIGN KEY (user_id) REFERENCES Usuarios(id),
    FOREIGN KEY (room_id) REFERENCES Salas(id) ON DELETE CASCADE
);

-- Insere usuário admin padrão (email: admin, senha: admin)
INSERT INTO Usuarios (id, name, email, password_hash, role) VALUES 
('00000000-0000-0000-0000-000000000001', 'Administrador', 'admin', '$2b$10$ANU2EiKkB1W8Vdz3VgkguOlNxt3QsvMRveedwI2fbaevUT7b37tV2', 'admin');

/* --- INÍCIO: Criação do Utilizador da Aplicação --- */

-- Cria o utilizador 'admin' com a senha 'admin_password_123'
CREATE USER 'admin'@'%' IDENTIFIED WITH mysql_native_password BY 'admin_password_123';
CREATE USER 'admin'@'localhost' IDENTIFIED WITH mysql_native_password BY 'admin_password_123';

-- Dá permissões a AMBOS os utilizadores
GRANT ALL PRIVILEGES ON `reservasdb`.* TO 'admin'@'%';
GRANT ALL PRIVILEGES ON `reservasdb`.* TO 'admin'@'localhost';

/* --- FIM: Criação do Utilizador da Aplicação --- */


/* --- INÍCIO: Configuração da Replicação --- */

-- Cria o utilizador 'replicator' com a senha 'replica_password_123'
CREATE USER 'replicator'@'%' IDENTIFIED WITH mysql_native_password BY 'replica_password_123';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';

-- Aplica as permissões
FLUSH PRIVILEGES;

/* --- FIM: Configuração da Replicação --- */