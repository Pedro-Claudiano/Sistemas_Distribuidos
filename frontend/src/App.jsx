import React, { useState, useMemo } from 'react';
import { 
  Container, 
  Box, 
  TextField, 
  Button, 
  Typography, 
  CssBaseline,
  CircularProgress,
  Alert,
  Switch,
  FormGroup,
  FormControlLabel
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

function App() {
  const [userId, setUserId] = useState('');
  const [room, setRoom] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [mode, setMode] = useState('dark');
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  const handleThemeChange = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userId || !room) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos.' });
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, room }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro ao criar a reserva.');
      }
      setMessage({ type: 'success', text: data.message });
      setUserId('');
      setRoom('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      {/* O Switch do tema agora fica FORA do container principal */}
      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
        <FormGroup>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={handleThemeChange} />}
            label={mode === 'dark' ? 'Escuro' : 'Claro'}
          />
        </FormGroup>
      </Box>

      {/* O Container agora só tem a responsabilidade de centralizar o formulário */}
      <Container 
        component="main" 
        maxWidth="xs"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CssBaseline />
        
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <Typography component="h1" variant="h5" align="center" gutterBottom>
              Sistema de Reserva
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              id="userId"
              label="ID do Usuário"
              name="userId"
              autoFocus
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="room"
              label="Nome da Sala"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Fazer Reserva'}
            </Button>
          </Box>
          {message && (
            <Alert severity={message.type} sx={{ width: '100%', mt: 2 }}>
              {message.text}
            </Alert>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;