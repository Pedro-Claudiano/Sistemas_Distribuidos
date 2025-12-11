import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = '/api';

export default function ClientNotifications() {
  const navigate = useNavigate();
  const [mudancasPendentes, setMudancasPendentes] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = verificando, true = autenticado, false = não autenticado

  // Verifica se o usuário está autenticado e é cliente
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Admin não pode acessar notificações de clientes
      if (payload.role === 'admin') {
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Erro ao decodificar token:', e);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated === true) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      // Busca mudanças pendentes
      const mudancasResponse = await fetch(`${API_BASE_URL}/mudancas-pendentes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (mudancasResponse.ok) {
        const mudancasData = await mudancasResponse.json();
        setMudancasPendentes(mudancasData);
      }

      // Busca notificações
      const notifResponse = await fetch(`${API_BASE_URL}/notificacoes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (notifResponse.ok) {
        const notifData = await notifResponse.json();
        setNotificacoes(notifData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponderMudanca = async (mudancaId, aprovado) => {
    const token = localStorage.getItem('authToken');
    
    try {
      const response = await fetch(`${API_BASE_URL}/mudancas/${mudancaId}/responder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ aprovado })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao responder');
      }

      const actionText = aprovado ? 'aprovada' : 'rejeitada';
      setMessage({ type: 'success', text: `Mudança ${actionText} com sucesso!` });
      
      // Remove a mudança da lista
      setMudancasPendentes(mudancasPendentes.filter(m => m.id !== mudancaId));
      
      // Recarrega as notificações
      setTimeout(() => {
        fetchData();
        setMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Erro ao responder mudança:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleMarcarComoLida = async (notifId) => {
    const token = localStorage.getItem('authToken');
    
    try {
      const response = await fetch(`${API_BASE_URL}/notificacoes/${notifId}/lida`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setNotificacoes(notificacoes.map(n => 
          n.id === notifId ? { ...n, is_read: true } : n
        ));
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} dia(s) restante(s)`;
    }
    
    return `${hours}h ${minutes}m restante(s)`;
  };

  // Tela de carregamento
  if (isAuthenticated === null) {
    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Verificando autenticação...</p>
        </div>
      </>
    );
  }

  // Tela de não autenticado ou admin tentando acessar
  if (isAuthenticated === false) {
    const token = localStorage.getItem('authToken');
    let isAdmin = false;
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        isAdmin = payload.role === 'admin';
      } catch (e) {
        // Token inválido
      }
    }

    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{isAdmin ? '🚫' : '🔒'}</div>
          <h2 className="form-title" style={{ color: '#e74c3c', marginBottom: '1rem' }}>
            {isAdmin ? 'Acesso Negado' : 'Acesso Restrito'}
          </h2>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            {isAdmin ? (
              <>
                Esta página é exclusiva para clientes.
                <br />
                Administradores devem usar o painel administrativo.
              </>
            ) : (
              <>
                Você precisa estar logado para ver suas notificações.
                <br />
                Faça login para continuar.
              </>
            )}
          </p>
          {isAdmin ? (
            <button 
              className="login-button" 
              onClick={() => navigate('/admin')}
            >
              Ir para Painel Admin
            </button>
          ) : (
            <button 
              className="login-button" 
              onClick={() => navigate('/login')}
            >
              Fazer Login
            </button>
          )}
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Carregando...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="page-user-actions">
        <span className="welcome-message">Notificações e Mudanças</span>
        <div className="user-actions">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="header-icon" 
            title="Voltar ao Dashboard"
          >
            <i className="material-symbols-rounded">arrow_back</i>
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('authToken');
              navigate('/login');
            }} 
            className="header-icon" 
            title="Sair"
          >
            <i className="material-symbols-rounded">logout</i>
          </button>
        </div>
      </div>

      <div className="login-container admin-dashboard">
        {message && (
          <div className={`form-message ${message.type}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {/* Mudanças Pendentes */}
        <div className="section">
          <h2 className="form-title">Mudanças Pendentes de Aprovação</h2>
          
          {mudancasPendentes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '1rem' }}>
              Nenhuma mudança pendente.
            </p>
          ) : (
            <div className="changes-list">
              {mudancasPendentes.map(mudanca => (
                <div key={mudanca.id} className="change-card urgent">
                  <div className="change-header">
                    <h3>Proposta de Mudança</h3>
                    <span className="time-remaining">
                      {getTimeRemaining(mudanca.expires_at)}
                    </span>
                  </div>
                  
                  <div className="change-comparison">
                    <div className="change-before">
                      <h4>Reserva Atual:</h4>
                      <p><strong>Sala:</strong> {mudanca.old_room_id}</p>
                      <p><strong>Início:</strong> {formatDateTime(mudanca.old_start_time)}</p>
                      <p><strong>Fim:</strong> {formatDateTime(mudanca.old_end_time)}</p>
                    </div>
                    
                    <div className="change-arrow">→</div>
                    
                    <div className="change-after">
                      <h4>Nova Proposta:</h4>
                      <p><strong>Sala:</strong> {mudanca.new_room_id}</p>
                      <p><strong>Início:</strong> {formatDateTime(mudanca.new_start_time)}</p>
                      <p><strong>Fim:</strong> {formatDateTime(mudanca.new_end_time)}</p>
                    </div>
                  </div>

                  <div className="change-actions">
                    <button 
                      onClick={() => handleResponderMudanca(mudanca.id, false)}
                      className="action-btn reject"
                    >
                      Rejeitar
                    </button>
                    <button 
                      onClick={() => handleResponderMudanca(mudanca.id, true)}
                      className="action-btn approve"
                    >
                      Aprovar
                    </button>
                  </div>
                  
                  <p className="change-warning">
                    ⚠️ Se você não responder até {formatDateTime(mudanca.expires_at)}, 
                    sua reserva será automaticamente cancelada.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notificações */}
        <div className="section">
          <h2 className="form-title">Histórico de Notificações</h2>
          
          {notificacoes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '1rem' }}>
              Nenhuma notificação.
            </p>
          ) : (
            <div className="notifications-list">
              {notificacoes.map(notif => (
                <div 
                  key={notif.id} 
                  className={`notification-card ${notif.is_read ? 'read' : 'unread'}`}
                  onClick={() => !notif.is_read && handleMarcarComoLida(notif.id)}
                >
                  <div className="notification-content">
                    <p>{notif.message}</p>
                    <small>{formatDateTime(notif.created_at)}</small>
                  </div>
                  {!notif.is_read && <div className="unread-indicator">●</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .section {
          margin-bottom: 2rem;
        }

        .changes-list, .notifications-list {
          margin-top: 1rem;
        }

        .change-card {
          border: 2px solid #ffc107;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          background: #fff8e1;
        }

        .change-card.urgent {
          border-color: #ff5722;
          background: #ffebee;
        }

        .change-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .time-remaining {
          background: #ff5722;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .change-comparison {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
          align-items: center;
        }

        .change-before, .change-after {
          padding: 1rem;
          border-radius: 4px;
        }

        .change-before {
          background: #f5f5f5;
        }

        .change-after {
          background: #e8f5e8;
        }

        .change-arrow {
          font-size: 1.5rem;
          font-weight: bold;
          color: #666;
          text-align: center;
        }

        .change-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .action-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          flex: 1;
        }

        .action-btn.approve {
          background: #28a745;
          color: white;
        }

        .action-btn.reject {
          background: #dc3545;
          color: white;
        }

        .change-warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 0.75rem;
          border-radius: 4px;
          margin: 0;
          font-size: 0.9rem;
          color: #856404;
        }

        .notification-card {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 0.5rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-card.unread {
          background: #f0f8ff;
          border-color: #007bff;
        }

        .notification-card.read {
          background: #f8f9fa;
          opacity: 0.7;
        }

        .notification-content {
          flex: 1;
        }

        .notification-content p {
          margin: 0 0 0.5rem 0;
        }

        .notification-content small {
          color: #666;
        }

        .unread-indicator {
          color: #007bff;
          font-size: 1.2rem;
          margin-left: 1rem;
        }

        @media (max-width: 768px) {
          .change-comparison {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          
          .change-arrow {
            transform: rotate(90deg);
          }
        }
      `}</style>
    </>
  );
}