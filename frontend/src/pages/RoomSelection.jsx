import React, { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Link,
  Alert,             // Adicionado para mensagens
  CircularProgress   // Adicionado para loading
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // Adicionado useNavigate para redirecionar se não houver token

// Dados de exemplo para as salas pré-setadas
const rooms = [
  { id: '101', name: 'Sala 1' },
  { id: '102', name: 'Sala 2' },
  { id: '201', name: 'Laboratório 1' },
  { id: '305', name: 'Auditório Principal' },
];

export default function RoomSelection() {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); // Hook para navegação

  // Função de confirmação agora faz a chamada real para a API com o token
  const handleConfirmClick = async () => {
    setIsLoading(true);
    setMessage('');

    // --- LER E ENVIAR O TOKEN ---
    const token = localStorage.getItem('authToken'); // Lê o token guardado
    if (!token) {
      setMessage({ type: 'error', text: 'Erro de autenticação. Por favor, faça login novamente.' });
      setIsLoading(false);
      // Opcional: Redirecionar para o login após um tempo
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    // --- FIM LER E ENVIAR O TOKEN ---

    try {
      const roomDetails = rooms.find(room => room.id === selectedRoom);

      // --- CHAMADA DE API COM TOKEN ---
      // Dados a serem enviados (sem userId, ele virá do token no backend)
      // Ajuste as datas conforme necessário, aqui usamos placeholders
      const reservationData = {
        room_id: roomDetails.id,
        start_time: new Date().toISOString(), // Exemplo: Hora atual
        end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString() // Exemplo: Daqui a 1 hora
      };

      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <-- ENVIA O TOKEN AQUI
        },
        body: JSON.stringify(reservationData),
      });
      // --- FIM CHAMADA DE API ---

      const data = await response.json();
      if (!response.ok) {
        // Trata erros vindos do backend (ex: 409 - Conflito)
        throw new Error(data.error || 'Falha ao criar reserva.');
      }

      setMessage({ type: 'success', text: `Reserva para "${roomDetails.name}" criada com sucesso!` }); // Usa a mensagem de sucesso que fizer mais sentido
      setSelectedRoom(''); // Limpa a seleção após o sucesso

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 400, bgcolor: 'background.paper', p: 3, borderRadius: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Selecione uma Sala
      </Typography>
      <Divider sx={{ mb: 4 }} />

      <FormControl fullWidth disabled={isLoading}> {/* Desabilita durante o loading */}
        <InputLabel id="room-select-label">Salas Disponíveis</InputLabel>
        <Select
          labelId="room-select-label"
          id="room-select"
          value={selectedRoom}
          label="Salas Disponíveis"
          onChange={(e) => setSelectedRoom(e.target.value)}
        >
          {rooms.map((room) => (
            <MenuItem key={room.id} value={room.id}>
              {room.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 3 }}
        disabled={!selectedRoom || isLoading} // Desabilita se não houver sala ou se estiver carregando
        onClick={handleConfirmClick}
      >
        {/* Mostra spinner ou texto */}
        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar Reserva'}
      </Button>

      {/* Exibe a mensagem de sucesso ou erro */}
      {message && (
        <Alert severity={message.type} sx={{ width: '100%', mt: 2 }}>
          {message.text}
        </Alert>
      )}

      <Typography variant="body2" align="center" sx={{ mt: 4 }}>
        <Link component={RouterLink} to="/">Sair e voltar para a página inicial</Link>
      </Typography>
    </Box>
  );
}
