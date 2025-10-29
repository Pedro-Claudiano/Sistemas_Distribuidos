import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- MOCK DE DADOS ---
const mockRooms = [
  { id: '101', name: 'Sala 1', location: "Prédio ADM" },
  { id: '102', name: 'Sala 2', location: "Prédio ADM" },
  { id: '201', name: 'Laboratório 1', location: "Prédio de Eletrônica" },
  { id: '305', name: 'Auditório Principal', location: "Prédio Principal" },
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

// Pega a data de hoje no formato YYYY-MM-DD para o input[type="date"]
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};
// --- FIM MOCK DE DADOS ---


export default function RoomSelection() {
  const [rooms, setRooms] = useState([]);
  const [userName, setUserName] = useState("Usuário");
  
  const [selectedRoom, setSelectedRoom] = useState('');
  // Salva a data como string YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(getTodayString()); 
  const [selectedTime, setSelectedTime] = useState('');
  
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setRooms(mockRooms);
    setUserName("Yuri");
  }, []);

  useEffect(() => {
    if (selectedRoom && selectedDate) {
      setIsSlotsLoading(true);
      setAvailableSlots([]);
      setSelectedTime('');
      setMessage(null);
      
      console.log(`Buscando horários para Sala ${selectedRoom} no dia ${selectedDate}`);
      
      setTimeout(() => {
        const mockAvailable = allTimeSlots.filter(() => Math.random() > 0.3);
        setAvailableSlots(mockAvailable);
        setIsSlotsLoading(false);
      }, 1000);
    }
  }, [selectedRoom, selectedDate]); 


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
      if (!slotDetails) {
        throw new Error("Horário selecionado inválido.");
      }

      // Combina a string da data (YYYY-MM-DD) com a string da hora (HH:MM:SS)
      const startTime = new Date(`${selectedDate}T${slotDetails.start}`).toISOString();
      const endTime = new Date(`${selectedDate}T${slotDetails.end}`).toISOString();
      
      const reservationData = { room_id: selectedRoom, start_time: startTime, end_time: endTime };
      console.log("Enviando reserva:", reservationData);

      await new Promise(resolve => setTimeout(resolve, 1500));
      // ... (lógica de fetch real) ...

      const roomDetails = rooms.find(room => room.id === selectedRoom);
      setMessage({ type: 'success', text: `Reserva para "${roomDetails.name}" às ${selectedTime} criada!` });
      
      setSelectedRoom('');
      setSelectedDate(getTodayString()); 
      setSelectedTime('');
      setAvailableSlots([]);

    } catch (error) {
      setMessage({ type: 'error', text: error.message || "Falha ao criar reserva." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    // Removido o <LocalizationProvider>
    <>
      {/* 1. O logo (pego pelo CSS global) */}
      <h1 className="app-logo">SIRESA</h1>

      {/* 2. Os botões de usuário (NOVO ELEMENTO) */}
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

      {/* 3. O container principal (centralizado pelo body) */}
      <div className="login-container admin-dashboard">
        <h2 className="form-title">Reservar Sala</h2>
        <p className="separator"><span>Escolha a data, sala e horário</span></p>

        <form className="login-form" onSubmit={handleConfirmClick}>
          {/* 1. SELETOR DE SALA */}
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

          {/* 2. SELETOR DE DATA (NATIVO - SEM MUI) */}
          <div className="input-wrapper">
            <input
              type="date"
              className="input-field" // O CSS vai esconder o ícone nativo
              value={selectedDate}
              min={getTodayString()} // Não deixa reservar no passado
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={isLoading}
              required
            />
            {/* Este é o único ícone que vai aparecer (à esquerda) */}
            <i className="material-symbols-rounded">calendar_month</i>
          </div>


          {/* 3. SELETOR DE HORÁRIO */}
          <div className="input-wrapper">
            <select
              className="input-field select-field"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={!selectedRoom || !selectedDate || isSlotsLoading || isLoading}
              required
            >
              <option value="" disabled>
                {isSlotsLoading ? "Buscando horários..." : "Selecione o horário..."}
              </option>
              
              {!isSlotsLoading && availableSlots.length > 0 && (
                availableSlots.map((slot) => (
                  <option key={slot.label} value={slot.label}>
                    {slot.label}
                  </option>
                ))
              )}

              {!isSlotsLoading && availableSlots.length === 0 && selectedRoom && selectedDate && (
                <option value="" disabled>Nenhum horário disponível</option>
              )}
            </select>
            <i className="material-symbols-rounded">schedule</i>
          </div>

          {/* MENSAGENS E BOTÃO */}
          {message && (
            <div className={`form-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={!selectedTime || isLoading || isSlotsLoading}
          >
            {isLoading ? "Reservando..." : 'Confirmar Reserva'}
          </button>
        </form>
      </div>
    </>
  );
}