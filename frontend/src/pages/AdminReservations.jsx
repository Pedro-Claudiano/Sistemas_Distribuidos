import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = '/api';

export default function AdminReservations() {
  const navigate = useNavigate();
  const [reservas, setReservas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(null); // null = verificando, true = autorizado, false = não autorizado
  const [editForm, setEditForm] = useState({
    room_id: '',
    start_time: '',
    end_time: ''
  });

  // Verifica se o usuário é admin
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthorized(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin') {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  const fetchReservas = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsAuthorized(false);
      return;
    }

    try {
      // Busca reservas
      const reservasResponse = await fetch(`${API_BASE_URL}/reservas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!reservasResponse.ok) throw new Error('Erro ao buscar reservas');
      
      const reservasData = await reservasResponse.json();

      // Busca salas
      const salasResponse = await fetch(`${API_BASE_URL}/salas`);
      if (!salasResponse.ok) throw new Error('Erro ao buscar salas');
      
      const salasData = await salasResponse.json();
      setSalas(salasData);

      // Mapeia reservas com nomes das salas
      const reservasComSalas = reservasData.map(reserva => {
        const sala = salasData.find(s => s.id === reserva.room_id);
        return {
          ...reserva,
          roomName: sala ? `${sala.name} (${sala.location})` : 'Sala não encontrada'
        };
      });

      setReservas(reservasComSalas);
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar reservas.' });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchReservas();
  }, [fetchReservas]);

  const handleCancelReserva = async (reservaId) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta reserva?')) return;

    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`${API_BASE_URL}/reservas/${reservaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao cancelar reserva');

      setReservas(reservas.filter(r => r.id !== reservaId));
      setMessage({ type: 'success', text: 'Reserva cancelada com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error);
      setMessage({ type: 'error', text: 'Erro ao cancelar reserva.' });
    }
  };

  const handleProporMudanca = (reserva) => {
    setSelectedReserva(reserva);
    setEditForm({
      room_id: reserva.room_id,
      start_time: new Date(reserva.start_time).toISOString().slice(0, 16),
      end_time: new Date(reserva.end_time).toISOString().slice(0, 16)
    });
    setShowEditModal(true);
  };

  const handleSubmitMudanca = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`${API_BASE_URL}/reservas/${selectedReserva.id}/propor-mudanca`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao propor mudança');
      }

      setMessage({ type: 'success', text: 'Proposta de mudança enviada ao cliente!' });
      setShowEditModal(false);
      fetchReservas(); // Recarrega as reservas
    } catch (error) {
      console.error('Erro ao propor mudança:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'confirmed': { text: 'Confirmada', class: 'status-confirmed' },
      'pending_approval': { text: 'Aguardando Aprovação', class: 'status-pending' },
      'cancelled': { text: 'Cancelada', class: 'status-cancelled' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'status-default' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  // Tela de carregamento
  if (isAuthorized === null) {
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
  if (isAuthorized === false) {
    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
          <h2 className="form-title" style={{ color: '#e74c3c', marginBottom: '1rem' }}>Acesso Negado</h2>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            Você não tem permissão para acessar esta página.
            <br />
            Apenas administradores podem gerenciar reservas.
          </p>
          <button 
            className="login-button" 
            onClick={() => navigate('/dashboard')}
            style={{ marginBottom: '1rem' }}
          >
            Ir para Dashboard
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
          <p>Carregando reservas...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="page-user-actions">
        <span className="welcome-message">Gerenciar Reservas</span>
        <div className="user-actions">
          <button 
            onClick={() => navigate('/admin/salas')} 
            className="header-icon" 
            title="Gerenciar Salas"
          >
            <i className="material-symbols-rounded">meeting_room</i>
          </button>
          <button 
            onClick={() => navigate('/admin')} 
            className="header-icon" 
            title="Voltar ao Painel"
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
        <div className="admin-header">
          <div className="header-content">
            <h2 className="form-title">Painel Administrativo</h2>
            <p className="header-subtitle">Gerencie reservas e salas do sistema</p>
          </div>
          <div className="quick-actions">
            <button 
              className="quick-action-btn primary"
              onClick={() => navigate('/admin/salas')}
              title="Criar Nova Sala"
            >
              <i className="material-symbols-rounded">add</i>
              <span>Criar Sala</span>
            </button>
            <button 
              className="quick-action-btn secondary"
              onClick={() => window.location.reload()}
              title="Atualizar Lista"
            >
              <i className="material-symbols-rounded">refresh</i>
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {message && (
          <div className={`form-message ${message.type}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon confirmed">
              <i className="material-symbols-rounded">check_circle</i>
            </div>
            <div className="stat-content">
              <h3>{reservas.filter(r => r.status === 'confirmed').length}</h3>
              <p>Confirmadas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending">
              <i className="material-symbols-rounded">schedule</i>
            </div>
            <div className="stat-content">
              <h3>{reservas.filter(r => r.status === 'pending_approval').length}</h3>
              <p>Pendentes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cancelled">
              <i className="material-symbols-rounded">cancel</i>
            </div>
            <div className="stat-content">
              <h3>{reservas.filter(r => r.status === 'cancelled').length}</h3>
              <p>Canceladas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon total">
              <i className="material-symbols-rounded">event</i>
            </div>
            <div className="stat-content">
              <h3>{reservas.length}</h3>
              <p>Total</p>
            </div>
          </div>
        </div>

        <div className="section-header">
          <h3>Reservas Ativas</h3>
          <div className="section-actions">
            <button 
              className="filter-btn active"
              onClick={() => {/* Implementar filtro se necessário */}}
            >
              Todas
            </button>
          </div>
        </div>

        <div className="reservations-list">
          {reservas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="material-symbols-rounded">event_busy</i>
              </div>
              <h3>Nenhuma reserva encontrada</h3>
              <p>Quando os clientes fizerem reservas, elas aparecerão aqui.</p>
              <button 
                className="quick-action-btn primary"
                onClick={() => navigate('/admin/salas')}
              >
                <i className="material-symbols-rounded">add</i>
                Criar Primeira Sala
              </button>
            </div>
          ) : (
            <div className="reservations-grid">
              {reservas.map(reserva => (
                <div key={reserva.id} className="reservation-card">
                  <div className="reservation-header">
                    <h3>{reserva.roomName}</h3>
                    {getStatusBadge(reserva.status)}
                  </div>
                  
                  <div className="reservation-details">
                    <p><strong>Cliente:</strong> {reserva.user_name}</p>
                    <p><strong>Email:</strong> {reserva.user_email}</p>
                    <p><strong>Início:</strong> {formatDateTime(reserva.start_time)}</p>
                    <p><strong>Fim:</strong> {formatDateTime(reserva.end_time)}</p>
                    <p><strong>Criada em:</strong> {formatDateTime(reserva.created_at)}</p>
                  </div>

                  <div className="reservation-actions">
                    <button 
                      onClick={() => handleProporMudanca(reserva)}
                      className="action-btn edit"
                      disabled={reserva.status === 'cancelled'}
                    >
                      <i className="material-symbols-rounded">edit</i>
                      Propor Mudança
                    </button>
                    <button 
                      onClick={() => handleCancelReserva(reserva.id)}
                      className="action-btn delete"
                      disabled={reserva.status === 'cancelled'}
                    >
                      <i className="material-symbols-rounded">cancel</i>
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Propor Mudança de Reserva</h3>
            <p><strong>Cliente:</strong> {selectedReserva?.user_name}</p>
            <p><strong>Reserva Atual:</strong> {selectedReserva?.roomName}</p>
            
            <form onSubmit={handleSubmitMudanca}>
              <div className="form-group">
                <label>Nova Sala:</label>
                <input
                  type="text"
                  value={editForm.room_id}
                  onChange={(e) => setEditForm({...editForm, room_id: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Novo Início:</label>
                <input
                  type="datetime-local"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({...editForm, start_time: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Novo Fim:</label>
                <input
                  type="datetime-local"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({...editForm, end_time: e.target.value})}
                  required
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="login-button cancel"
                >
                  Cancelar
                </button>
                <button type="submit" className="login-button">
                  Enviar Proposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
        }

        .header-content h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
          font-weight: 600;
        }

        .header-subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 1rem;
        }

        .quick-actions {
          display: flex;
          gap: 1rem;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .quick-action-btn.primary {
          background: #28a745;
          color: white;
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
        }

        .quick-action-btn.primary:hover {
          background: #218838;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
        }

        .quick-action-btn.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .quick-action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #007bff;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
        }

        .stat-icon.confirmed {
          background: #d4edda;
          color: #155724;
        }

        .stat-icon.pending {
          background: #fff3cd;
          color: #856404;
        }

        .stat-icon.cancelled {
          background: #f8d7da;
          color: #721c24;
        }

        .stat-icon.total {
          background: #d1ecf1;
          color: #0c5460;
        }

        .stat-content h3 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          color: #333;
        }

        .stat-content p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #f8f9fa;
        }

        .section-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.3rem;
        }

        .section-actions {
          display: flex;
          gap: 0.5rem;
        }

        .filter-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #dee2e6;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .reservations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .reservation-card {
          border: none;
          border-radius: 12px;
          padding: 1.5rem;
          background: white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          border-left: 4px solid #007bff;
        }

        .reservation-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .reservation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 0.5rem;
        }

        .reservation-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .status-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-confirmed {
          background: #d4edda;
          color: #155724;
        }

        .status-pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-cancelled {
          background: #f8d7da;
          color: #721c24;
        }

        .reservation-details p {
          margin: 0.5rem 0;
          font-size: 0.9rem;
        }

        .reservation-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .action-btn {
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          flex: 1;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
        }

        .action-btn.edit {
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
        }

        .action-btn.edit:hover {
          background: linear-gradient(135deg, #0056b3, #004085);
          transform: translateY(-1px);
        }

        .action-btn.delete {
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
        }

        .action-btn.delete:hover {
          background: linear-gradient(135deg, #c82333, #a71e2a);
          transform: translateY(-1px);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }

        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1rem;
          background: #f8f9fa;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6c757d;
        }

        .empty-icon i {
          font-size: 2.5rem;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 1.3rem;
        }

        .empty-state p {
          margin: 0 0 2rem 0;
          color: #666;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .quick-actions {
            justify-content: center;
          }

          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .reservations-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}