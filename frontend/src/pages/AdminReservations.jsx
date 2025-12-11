import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = '/api';

export default function AdminReservations() {
  const navigate = useNavigate();
  const [reservas, setReservas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    room_id: '',
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    fetchReservas();
  }, []);

  const fetchReservas = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reservas-detalhadas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar reservas');
      
      const data = await response.json();
      setReservas(data);
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar reservas.' });
    } finally {
      setIsLoading(false);
    }
  };

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
        <h2 className="form-title">Reservas do Sistema</h2>
        
        {message && (
          <div className={`form-message ${message.type}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        <div className="reservations-list">
          {reservas.length === 0 ? (
            <p style={{ textAlign: 'center', marginTop: '2rem' }}>Nenhuma reserva encontrada.</p>
          ) : (
            <div className="reservations-grid">
              {reservas.map(reserva => (
                <div key={reserva.id} className="reservation-card">
                  <div className="reservation-header">
                    <h3>Sala {reserva.room_id}</h3>
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
                      Propor Mudança
                    </button>
                    <button 
                      onClick={() => handleCancelReserva(reserva.id)}
                      className="action-btn delete"
                      disabled={reserva.status === 'cancelled'}
                    >
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
            <p><strong>Reserva Atual:</strong> Sala {selectedReserva?.room_id}</p>
            
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
        .reservations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .reservation-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
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
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          flex: 1;
        }

        .action-btn.edit {
          background: #007bff;
          color: white;
        }

        .action-btn.delete {
          background: #dc3545;
          color: white;
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
      `}</style>
    </>
  );
}