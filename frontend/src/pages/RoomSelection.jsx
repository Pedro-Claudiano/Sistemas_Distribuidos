import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- MOCK DE DADOS ---
const mockRooms = [
  { id: '101', name: 'Sala 1', location: "Prédio ADM" },
  { id: '102', name: 'Sala 2', location: "Prédio ADM" },
  { id: '201', name: 'Laboratório 1', location: "Prédio de Eletrônica" },
  { id: '305', name: 'Auditório Principal', location: "Prédio Principal" },
];

// Mock de Reservas do Usuário
const mockMyReservas = [
  { id: 1, roomId: '101', roomName: "Sala 1", date: "2023-10-27", time: "08:00 - 08:50" },
];

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

  const [myReservas, setMyReservas] = useState(mockMyReservas);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setRooms(mockRooms);
    setUserName("Yuri");
  }, []);

  // Carrega horários
  useEffect(() => {
    if (selectedRoom && (selectedDates.length > 0 || tempDate)) {
      setIsSlotsLoading(true);
      setAvailableSlots([]);
      
      if (!isEditing) setSelectedTime(''); 
      
      setTimeout(() => {
        const mockAvailable = allTimeSlots.filter(() => Math.random() > 0.1);
        setAvailableSlots(mockAvailable);
        setIsSlotsLoading(false);
      }, 800);
    }
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

      const roomDetails = rooms.find(room => room.id === selectedRoom);
      
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      if (isEditing) {
        // ATUALIZAR (Edição é de uma data só por vez)
        setMyReservas(prev => prev.map(r => 
            r.id === editingReservaId 
            ? { ...r, roomId: selectedRoom, roomName: roomDetails.name, date: tempDate, time: selectedTime }
            : r
        ));
        setMessage({ type: 'success', text: `Reserva atualizada com sucesso!` });
        setIsEditing(false);
        setEditingReservaId(null);
      } else {
        // CRIAR (Pode ser múltiplas datas)
        if (selectedDates.length === 0) throw new Error("Selecione pelo menos uma data.");

        const newReservas = selectedDates.map(date => ({
            id: Date.now() + Math.random(),
            roomId: selectedRoom,
            roomName: roomDetails.name,
            date: date,
            time: selectedTime
        }));

        setMyReservas(prev => [...prev, ...newReservas]);
        setMessage({ type: 'success', text: `${newReservas.length} reserva(s) criada(s) com sucesso!` });
      }
      
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
  const handleDeleteReserva = (reservaId) => {
    if (window.confirm("Tem certeza que deseja cancelar esta reserva?")) {
        setMyReservas(prev => prev.filter(r => r.id !== reservaId));
        if (isEditing && editingReservaId === reservaId) {
            handleCancelEdit();
        }
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    navigate('/login');
  };

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
                            <th>Data</th>
                            <th>Horário</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myReservas.map(reserva => (
                            <tr key={reserva.id} style={editingReservaId === reserva.id ? { backgroundColor: '#f0f8ff' } : {}}>
                                <td>{reserva.roomName}</td>
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