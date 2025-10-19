import React, { useState } from 'react';
import {
  Typography,
  Box,
  TextField,
  Button,
  Link,
  Container,
  Paper,
  Avatar,
  Alert
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LockResetIcon from '@mui/icons-material/LockReset';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email) {
      setMessage({ type: 'error', text: 'Por favor, preencha o campo de email.' });
      return;
    }

    setMessage({ type: 'success', text: 'Se este email estiver cadastrado, você receberá as instruções.' });
    // Lógica da API aqui
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={6}
          sx={{
            padding: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            width: '100%',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockResetIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 600 }}>
            Recuperar Senha
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3, textAlign: 'center' }}>
            Insira seu email para receber as instruções.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Endereço de Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMessage(null);
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Enviar Email de Recuperação
            </Button>

            {message && (
              <Alert severity={message.type} sx={{ width: '100%', mb: 2 }}>
                {message.text}
              </Alert>
            )}

            <Typography variant="body2" align="center">
              <Link component={RouterLink} to="/login">Voltar para o Login</Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}