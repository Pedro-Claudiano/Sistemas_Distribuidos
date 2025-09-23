import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Alert, Grid, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // 1. Inicia o estado de carregamento
    setIsLoading(true);
    setMessage(''); // Limpa mensagens antigas

    try {
      // Simulando uma chamada de API que demora 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (email === "Xena@ninha.com" && password === "1234") {
        setMessage({ type: 'success', text: 'Login bem-sucedido!' });
      } else {
        throw new Error("Email ou senha inválidos.");
      }

    } catch (error) {
      // Define a mensagem de erro se a "API" falhar
      setMessage({ type: 'error', text: error.message });
    } finally {
      // 3. Garante que o estado de carregamento seja desativado no final,
      // independentemente de sucesso ou falha.
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
      <Typography component="h1" variant="h5" align="center" gutterBottom>
        Login
      </Typography>
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
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Senha"
        type="password"
        id="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />

      <Grid container justifyContent="flex-end">
        <Grid item>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Esqueceu a senha?
          </Link>
        </Grid>
      </Grid>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Entrar'}
      </Button>
      {message && (
        <Alert severity={message.type} sx={{ width: '100%', mt: 2 }}>
          {message.text}
        </Alert>
      )}
      <Typography variant="body2" align="center">
        <RouterLink to="/">Voltar para a página inicial</RouterLink>
      </Typography>
    </Box>
  );
}