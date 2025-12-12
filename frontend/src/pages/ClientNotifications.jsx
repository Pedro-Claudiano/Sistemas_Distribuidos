import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = 'http://3.228.1.69:3000/api';

export default function ClientNotifications() {
  const navigate = useNavigate();
  const [mudancasPendentes, setMudancasPendentes] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  // Verifica se o usuário está autenticado
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'client') {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
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
      // Por enquanto, endpoints de notificações não estão implementados
      // Definindo dados vazios para não quebrar a interface
      setMudancasPendentes([]);
      setNotificacoes([]);
      
      setMessage({ type: 'info', text: 'Sistema de notificações será implementado em breve.' });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponderMudanca = async (mudancaId, aprovado) => {
    // Endpoint não implementado ainda
    setMessage({ type: 'info', text: 'Funcionalidade será implementada em breve.' });
  };

  const handleMarcarComoLida = async (notifId) => {
    // Endpoint não implementado ainda
    setMessage({ type: 'info', text: 'Funcionalidade será implementada em breve.' });
  };

  // Tela de carregamento
  if (isAuthenticated === null) {
    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Verificando permissões...</p>
        </div>
      </>
    );
  }

  // Tela de não autorizado
  if (isAuthenticated === false) {
    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
          <h2 className="form-title" style={{ color: '#e74c3c', marginBottom: '1rem' }}>Acesso Negado</h2>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            Você não tem permissão para acessar esta página.
            <br />
            Apenas clientes podem ver notificações.
          </p>
          <button 
            className="login-button" 
            onClick={() => navigate('/admin')}
            style={{ marginBottom: '1rem' }}
          >
            Ir para Admin
          </button>
          <br />
          <button 
            className="login-button cancel" 
            onClick={() => navigate('/login')}
          >
            Fazer Login
          </button>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Carregando notificações...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="page-user-actions">
        <span className="welcome-message">Notificações</span>
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

      <div className="login-container">
        <h2 className="form-title">Central de Notificações</h2>
        
        {message && (
          <div className={`form-message ${message.type}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {/* Mudanças Pendentes */}
        <div className="notification-section">
          <h3>Propostas de Mudança</h3>
          {mudancasPendentes.length === 0 ? (
            <p className="empty-message">Nenhuma proposta de mudança pendente.</p>
          ) : (
            <div className="notifications-list">
              {mudancasPendentes.map(mudanca => (
                <div key={mudanca.id} className="notification-card mudanca">
                  <div className="notification-header">
                    <h4>Proposta de Mudança - Reserva #{mudanca.reserva_id}</h4>
                    <span className="notification-date">{new Date(mudanca.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="notification-content">
                    <p><strong>Nova Sala:</strong> {mudanca.nova_sala}</p>
                    <p><strong>Novo Horário:</strong> {new Date(mudanca.novo_inicio).toLocaleString()} - {new Date(mudanca.novo_fim).toLocaleString()}</p>
                    <p><strong>Motivo:</strong> {mudanca.motivo || 'Não informado'}</p>
                  </div>
                  <div className="notification-actions">
                    <button 
                      onClick={() => handleResponderMudanca(mudanca.id, true)}
                      className="action-btn approve"
                    >
                      Aceitar
                    </button>
                    <button 
                      onClick={() => handleResponderMudanca(mudanca.id, false)}
                      className="action-btn reject"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notificações Gerais */}
        <div className="notification-section">
          <h3>Notificações</h3>
          {notificacoes.length === 0 ? (
            <p className="empty-message">Nenhuma notificação.</p>
          ) : (
            <div className="notifications-list">
              {notificacoes.map(notif => (
                <div key={notif.id} className={`notification-card ${notif.is_read ? 'read' : 'unread'}`}>
                  <div className="notification-header">
                    <h4>{notif.title}</h4>
                    <span className="notification-date">{new Date(notif.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="notification-content">
                    <p>{notif.message}</p>
                  </div>
                  {!notif.is_read && (
                    <div className="notification-actions">
                      <button 
                        onClick={() => handleMarcarComoLida(notif.id)}
                        className="action-btn mark-read"
                      >
                        Marcar como Lida
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .notification-section {
          margin-bottom: 2rem;
        }

        .notification-section h3 {
          color: #333;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #f0f0f0;
        }

        .empty-message {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 2rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .notification-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }

        .notification-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .notification-card.unread {
          border-left: 4px solid #007bff;
          background: #f8f9ff;
        }

        .notification-card.mudanca {
          border-left: 4px solid #ffc107;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .notification-header h4 {
          margin: 0;
          color: #333;
          font-size: 1.1rem;
        }

        .notification-date {
          color: #666;
          font-size: 0.9rem;
        }

        .notification-content {
          margin-bottom: 1rem;
        }

        .notification-content p {
          margin: 0.5rem 0;
          color: #555;
        }

        .notification-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .action-btn.approve {
          background: #28a745;
          color: white;
        }

        .action-btn.approve:hover {
          background: #218838;
        }

        .action-btn.reject {
          background: #dc3545;
          color: white;
        }

        .action-btn.reject:hover {
          background: #c82333;
        }

        .action-btn.mark-read {
          background: #6c757d;
          color: white;
        }

        .action-btn.mark-read:hover {
          background: #5a6268;
        }

        @media (max-width: 768px) {
          .notification-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .notification-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </>
  );
}