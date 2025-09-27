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
  Link
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

// Dados de exemplo para as salas pré-setadas
const rooms = [
  { id: '101', name: 'Sala 1' },
  { id: '102', name: 'Sala 2' },
  { id: '201', name: 'Laboratório 1' },
  { id: '305', name: 'Auditório Principal' },
];

export default function RoomSelection() {
  const [selectedRoom, setSelectedRoom] = useState('');

  const handleConfirmClick = () => {
    // Encontra o objeto da sala inteira com base no ID selecionado
    const roomDetails = rooms.find(room => room.id === selectedRoom);
    alert(`Reserva para a sala "${roomDetails.name}" confirmada!`);
    // Aqui, no futuro, você faria a chamada de API para o serviço de reservas
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 400, bgcolor: 'background.paper', p: 3, borderRadius: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Selecione uma Sala
      </Typography>
      <Divider sx={{ mb: 4 }} />

      {/* Componente de Seleção (Dropdown) */}
      <FormControl fullWidth>
        <InputLabel id="room-select-label">Salas Disponíveis</InputLabel>
        <Select
          labelId="room-select-label"
          id="room-select"
          value={selectedRoom}
          label="Salas Disponíveis"
          onChange={(e) => setSelectedRoom(e.target.value)}
        >
          {/* Mapeia o array de salas para criar as opções do menu */}
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
        // O botão fica desabilitado até que uma sala seja escolhida
        disabled={!selectedRoom}
        onClick={handleConfirmClick}
      >
        Confirmar Reserva
      </Button>
      
      <Typography variant="body2" align="center" sx={{ mt: 4 }}>
        <Link component={RouterLink} to="/">Sair e voltar para a página inicial</Link>
      </Typography>
    </Box>
  );
}
