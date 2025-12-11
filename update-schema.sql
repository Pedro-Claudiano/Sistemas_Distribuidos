-- Adiciona novas colunas e tabelas para sistema de aprovação de mudanças

USE meu_projeto_db;

-- Adiciona coluna de status na tabela Reservas
ALTER TABLE Reservas ADD COLUMN status ENUM('confirmed', 'pending_approval', 'cancelled') DEFAULT 'confirmed';

-- Cria tabela para mudanças pendentes de aprovação
CREATE TABLE IF NOT EXISTS MudancasPendentes (
    id VARCHAR(36) PRIMARY KEY,
    reserva_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    admin_id VARCHAR(36) NOT NULL,
    old_room_id VARCHAR(255) NOT NULL,
    old_start_time DATETIME NOT NULL,
    old_end_time DATETIME NOT NULL,
    new_room_id VARCHAR(255) NOT NULL,
    new_start_time DATETIME NOT NULL,
    new_end_time DATETIME NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (reserva_id) REFERENCES Reservas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Usuarios(id),
    FOREIGN KEY (admin_id) REFERENCES Usuarios(id)
);

-- Atualiza tipos de notificação
ALTER TABLE Notificacoes MODIFY COLUMN type ENUM(
    'reservation_deleted', 
    'reservation_modified', 
    'event_created',
    'change_request',
    'change_approved',
    'change_rejected',
    'change_expired'
) NOT NULL;

-- Adiciona índices para performance
CREATE INDEX idx_mudancas_status ON MudancasPendentes(status);
CREATE INDEX idx_mudancas_expires ON MudancasPendentes(expires_at);
CREATE INDEX idx_reservas_status ON Reservas(status);