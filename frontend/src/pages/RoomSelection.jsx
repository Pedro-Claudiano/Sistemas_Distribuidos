import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = '/api';

const allTimeSlots = [
  { label: '08:00 - 08:50', start: '08:00:00', end: '08:50:00' },
  { label: '08:50 - 09:40', start: '08:50:00', end: '09:40:00' },
  { label: '09:40 - 10:30', start: '09:40:00', end: '10:30:00' },
  { label: '10:50 - 11:40', start: '10:50:00', end: '11:40:00' },
  { label: '11:40 - 12:30', start: '11:40:00', end: '12:30:00' },
  { label: '13:50 - 14:40', start: '13:50:00', end: '14:40:00' },
  { label: '14:40 - 15:30', start: '14:40:00', end: '15:30:00' },
  { label: '15:50 - 16:40', start: '15:50:00', end: '16:40:00' },
  { label: '16:40 - 17:30', start: '16:40:00', end: '17:30:00' },
];

// Pega data atual YYYY-MM-DD sem conversão de fuso
const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Formata YYYY-MM-DD para DD/MM (sem fuso)
const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

export default function RoomSelection() {
  const [rooms, setRooms] = useState([]);
  const [userName, setUserName] = useState("Usuário");
  
  const [selectedRoom, setSelectedRoom] = useState('');
  
  // --- MÚLTIPLAS DATAS ---
  const [selectedDates, setSelectedDates] = useState([]); 
  const [tempDate, setTempDate] = useState(getTodayString()); 
  
  const [selectedTime, setSelectedTime] = useState('');
  
  const [isEditing, setIsEditing] = useState(false); 
  const [editingReservaId, setEditingReservaId] = useState(null);

  const [myReservas, setMyReservas] = useState([]);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = verificando, true = autenticado, false = não autenticado
  const navigate = useNavigate();

  // Verifica se o usuário está autenticado e é cliente
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Admin não pode acessar dashboard de clientes
      if (payload.role === 'admin') {
        setIsAuthenticated(false);
        return;
      }
      setUserName(payload.name || "Usuário");
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Erro ao decodificar token:', e);
      setIsAuthenticated(false);
    }
  }, []);

  // Carrega salas e reservas ao montar
  useEffect(() => {
    if (isAuthenticated === true) {
      fetchRooms();
      fetchMyReservas();
    }
  }, [isAuthenticated]);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/salas`);
      if (!response.ok) throw new Error('Erro ao buscar salas');
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Erro ao buscar salas:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar salas.' });
    }
  };

  const fetchMyReservas = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      const response = await fetch(`${API_BASE_URL}/reservas/usuario/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar reservas');
      const data = await response.json();
      
      // Busca as salas se ainda não foram carregadas
      let roomsList = rooms;
      if (roomsList.length === 0) {
        const salasResponse = await fetch(`${API_BASE_URL}/salas`);
        if (salasResponse.ok) {
          roomsList = await salasResponse.json();
          setRooms(roomsList);
        }
      }
      
      // Formata as reservas para o formato esperado pelo componente
      const formattedReservas = data.map(r => {
        const room = roomsList.find(room => room.id === r.room_id);
        return {
          id: r.id,
          roomId: r.room_id,
          roomName: room ? `${room.name}` : 'Sala não encontrada',
          roomLocation: room ? room.location : '',
          date: r.start_time.split('T')[0],
          time: formatTimeRange(r.start_time, r.end_time)
        };
      });

      setMyReservas(formattedReservas);
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
    }
  };

  const formatTimeRange = (startTime, endTime) => {
    // Extrai apenas a parte do horário (HH:MM) sem conversão de fuso
    const startHour = startTime.split('T')[1]?.substring(0, 5) || '00:00';
    const endHour = endTime.split('T')[1]?.substring(0, 5) || '00:00';
    return `${startHour} - ${endHour}`;
  };

  // Carrega horários disponíveis do backend
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedRoom) return;
      
      // Usa tempDate para edição, ou a primeira data selecionada para criação
      const dateToCheck = isEditing ? tempDate : (selectedDates.length > 0 ? selectedDates[0] : tempDate);
      if (!dateToCheck) return;

      setIsSlotsLoading(true);
      setAvailableSlots([]);
      
      if (!isEditing) setSelectedTime('');

      try {
        const response = await fetch(`${API_BASE_URL}/salas/${selectedRoom}/horarios-disponiveis?date=${dateToCheck}`);
        if (!response.ok) throw new Error('Erro ao buscar horários');
        
        const slots = await response.json();
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar horários disponíveis.' });
      } finally {
        setIsSlotsLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedRoom, selectedDates, tempDate, isEditing]); 


  // --- Adicionar Data ---
  const handleAddDate = () => {
    if (!tempDate) return;
    if (selectedDates.includes(tempDate)) {
        setMessage({ type: 'error', text: 'Esta data já foi adicionada.' });
        return;
    }
    setSelectedDates([...selectedDates, tempDate].sort());
    setMessage(null);
  };

  // --- Remover Data ---
  const handleRemoveDate = (dateToRemove) => {
    setSelectedDates(selectedDates.filter(d => d !== dateToRemove));
  };

  // --- SUBMIT (CRIAR OU ATUALIZAR) ---
  const handleConfirmClick = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage({ type: 'error', text: 'Erro de autenticação. Faça login.' });
      setIsLoading(false);
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const slotDetails = allTimeSlots.find(slot => slot.label === selectedTime);
      if (!slotDetails) throw new Error("Horário selecionado inválido.");
      
      if (isEditing) {
        // ATUALIZAR não é suportado pela API atual, então vamos deletar e criar novamente
        await fetch(`${API_BASE_URL}/reservas/${editingReservaId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Cria nova reserva
        const startDateTime = `${tempDate}T${slotDetails.start}`;
        const endDateTime = `${tempDate}T${slotDetails.end}`;

        const response = await fetch(`${API_BASE_URL}/reservas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            room_id: selectedRoom,
            start_time: startDateTime,
            end_time: endDateTime
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar reserva');
        }

        setMessage({ type: 'success', text: `Reserva atualizada com sucesso!` });
        setIsEditing(false);
        setEditingReservaId(null);
      } else {
        // CRIAR (Pode ser múltiplas datas)
        if (selectedDates.length === 0) throw new Error("Selecione pelo menos uma data.");

        const promises = selectedDates.map(date => {
          const startDateTime = `${date}T${slotDetails.start}`;
          const endDateTime = `${date}T${slotDetails.end}`;

          return fetch(`${API_BASE_URL}/reservas`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              room_id: selectedRoom,
              start_time: startDateTime,
              end_time: endDateTime
            })
          });
        });

        const responses = await Promise.all(promises);
        const failedCount = responses.filter(r => !r.ok).length;

        if (failedCount > 0) {
          throw new Error(`${failedCount} reserva(s) falharam. Verifique conflitos.`);
        }

        setMessage({ type: 'success', text: `${selectedDates.length} reserva(s) criada(s) com sucesso!` });
      }
      
      // Recarrega as reservas
      await fetchMyReservas();
      
      // Limpa o formulário
      setSelectedRoom('');
      setTempDate(getTodayString());
      setSelectedDates([]); 
      setSelectedTime('');
      setAvailableSlots([]);

    } catch (error) {
      setMessage({ type: 'error', text: error.message || "Falha ao processar." });
    } finally {
      setIsLoading(false);
    }
  };

  // --- EDITAR ---
  const handleEditReserva = (reserva) => {
    setIsEditing(true);
    setEditingReservaId(reserva.id);
    
    setSelectedRoom(reserva.roomId);
    setTempDate(reserva.date); 
    setSelectedDates([]); // Limpa múltiplas pois edição é singular
    setSelectedTime(reserva.time);
    
    setMessage({ type: 'success', text: `Editando reserva do dia ${formatDateDisplay(reserva.date)}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- CANCELAR EDIÇÃO ---
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingReservaId(null);
    setSelectedRoom('');
    setTempDate(getTodayString());
    setSelectedDates([]);
    setSelectedTime('');
    setAvailableSlots([]);
    setMessage(null);
  };

  // --- DELETAR ---
  const handleDeleteReserva = async (reservaId) => {
    if (!window.confirm("Tem certeza que deseja cancelar esta reserva?")) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage({ type: 'error', text: 'Erro de autenticação. Faça login.' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reservas/${reservaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar reserva');
      }

      setMyReservas(prev => prev.filter(r => r.id !== reservaId));
      if (isEditing && editingReservaId === reservaId) {
        handleCancelEdit();
      }
      setMessage({ type: 'success', text: 'Reserva cancelada com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao deletar reserva:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao cancelar reserva.' });
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    navigate('/login');
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
                Você precisa estar logado para acessar esta página.
                <br />
                Faça login ou crie uma conta para continuar.
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
            <>
              <button 
                className="login-button" 
                onClick={() => navigate('/login')}
                style={{ marginBottom: '1rem' }}
              >
                Fazer Login
              </button>
              <br />
              <button 
                className="login-button cancel" 
                onClick={() => navigate('/register')}
              >
                Criar Conta
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="page-user-actions">
        <span className="welcome-message">Bem-vindo, {userName}</span>
        <div className="user-actions">
          <a href="/profile" className="header-icon" title="Editar Perfil">
            <i className="material-symbols-rounded">manage_accounts</i>
          </a>
          <a href="/login" onClick={handleLogout} className="header-icon" title="Sair">
            <i className="material-symbols-rounded">logout</i>
          </a>
        </div>
      </div>

      {/* --- NOVA RESERVA / EDIÇÃO --- */}
      <div className="login-container admin-dashboard" style={{ marginBottom: '2rem' }}>
        <h2 className="form-title">
            {isEditing ? 'Editar Reserva' : 'Reservar Sala'}
        </h2>
        <p className="separator"><span>
            {isEditing ? 'Altere os dados da reserva' : 'Selecione sala, datas e horário'}
        </span></p>

        <form className="login-form" onSubmit={handleConfirmClick}>
          
          {/* SALA */}
          <div className="input-wrapper">
            <select
              className="input-field select-field"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              disabled={isLoading}
              required
            >
              <option value="" disabled>Selecione a sala...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.location})
                </option>
              ))}
            </select>
            <i className="material-symbols-rounded">meeting_room</i>
          </div>

          {/* DATA (Com Múltipla Seleção) */}
          <div className="date-selection-container">
              <div className="input-wrapper" style={{ marginBottom: isEditing ? '1.5rem' : '0.5rem' }}>
                <input
                  type="date"
                  className="input-field"
                  value={tempDate}
                  min={getTodayString()} 
                  onChange={(e) => setTempDate(e.target.value)}
                  disabled={isLoading}
                  // CORREÇÃO: Força abrir calendário ao clicar
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                />
                <i className="material-symbols-rounded">calendar_month</i>
                
                {/* Botão + (Só aparece se NÃO estiver editando) */}
                {!isEditing && (
                    <button 
                        type="button" 
                        className="add-date-btn"
                        onClick={handleAddDate}
                        disabled={!tempDate || isLoading}
                    >
                        <i className="material-symbols-rounded">add</i>
                    </button>
                )}
              </div>

              {/* Lista de Datas Selecionadas */}
              {!isEditing && selectedDates.length > 0 && (
                  <div className="selected-dates-list">
                      {selectedDates.map(date => (
                          <span key={date} className="date-tag">
                              {/* Usa formatação segura */}
                              {formatDateDisplay(date)}
                              <i 
                                className="material-symbols-rounded remove-date-icon"
                                onClick={() => handleRemoveDate(date)}
                              >close</i>
                          </span>
                      ))}
                  </div>
              )}
               {!isEditing && selectedDates.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', textAlign: 'center' }}>
                    Selecione uma data e clique no <b>+</b> para adicionar.
                  </p>
              )}
          </div>

          {/* HORÁRIO */}
          <div className="input-wrapper">
            <select
              className="input-field select-field"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={!selectedRoom || (!isEditing && selectedDates.length === 0) || isSlotsLoading || isLoading}
              required
            >
              <option value="" disabled>
                {isSlotsLoading ? "Verificando disponibilidade..." : "Selecione o horário..."}
              </option>
              
              {!isSlotsLoading && availableSlots.length > 0 && (
                availableSlots.map((slot) => (
                  <option key={slot.label} value={slot.label}>
                    {slot.label}
                  </option>
                ))
              )}

              {!isSlotsLoading && availableSlots.length === 0 && selectedRoom && (
                <option value="" disabled>Nenhum horário disponível</option>
              )}
            </select>
            <i className="material-symbols-rounded">schedule</i>
          </div>

          {message && (
            <div className={`form-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
              {isEditing && (
                  <button 
                    type="button" 
                    className="login-button cancel" 
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                  >
                      Cancelar
                  </button>
              )}
              <button
                type="submit"
                className="login-button"
                disabled={!selectedTime || (!isEditing && selectedDates.length === 0) || isLoading}
              >
                {isLoading ? "Salvando..." : (isEditing ? 'Salvar Alteração' : 'Confirmar Reservas')}
              </button>
          </div>
        </form>
      </div>

      {/* --- LISTA DE RESERVAS --- */}
      <div className="login-container admin-dashboard">
        <h2 className="form-title" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Minhas Reservas</h2>
        
        <div className="room-list">
            {myReservas.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>Você ainda não tem reservas.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Sala</th>
                            <th>Prédio</th>
                            <th>Data</th>
                            <th>Horário</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myReservas.map(reserva => (
                            <tr key={reserva.id} style={editingReservaId === reserva.id ? { backgroundColor: '#f0f8ff' } : {}}>
                                <td>{reserva.roomName}</td>
                                <td>{reserva.roomLocation}</td>
                                <td>{formatDateDisplay(reserva.date)}</td>
                                <td>{reserva.time}</td>
                                <td className="room-actions">
                                    <button 
                                        onClick={() => handleEditReserva(reserva)} 
                                        className="action-btn edit"
                                        disabled={isEditing}
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteReserva(reserva.id)} 
                                        className="action-btn delete"
                                    >
                                        Cancelar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </>
  );
}