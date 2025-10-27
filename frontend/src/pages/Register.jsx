import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Link,
  IconButton,
  InputAdornment
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export default function Register() {
  // Estados para os campos do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados para feedback e controlo
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name || !email || !password) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos.' });
      return;
    }
    setIsLoading(true);
    setMessage('');

    try {
      // Faz a chamada POST para o endpoint de criação de utilizador
      const response = await fetch('/api/users', { // Note que a URL é /api/users, não /api/users/login
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Trata erros específicos do backend (ex: email duplicado - 409)
        throw new Error(data.error || 'Ocorreu um erro ao tentar registar.');
      }

      // Se o registo for bem-sucedido
      setMessage({ type: 'success', text: `Utilizador ${data.name} registado com sucesso! Redirecionando para o login...` });
      
      // Limpa o formulário
      setName('');
      setEmail('');
      setPassword('');

      // Redireciona para a página de login após um pequeno atraso
      setTimeout(() => {
        navigate('/login');
      }, 2000); // Espera 2 segundos

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      // Garante que o estado de carregamento seja desativado, exceto se for redirecionar logo
      if (!message || message.type !== 'success') {
         setIsLoading(false);
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%', maxWidth: 400 }}>
      <Typography component="h1" variant="h5" align="center" gutterBottom>
        Registar Novo Utilizador
      </Typography>
      <TextField
        margin="normal"
        required
        fullWidth
        id="name"
        label="Nome Completo"
        name="name"
        autoComplete="name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isLoading}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Endereço de Email"
        name="email"
        autoComplete="email"
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
        type={showPassword ? 'text' : 'password'}
        id="password"
        autoComplete="new-password" // Importante para navegadores
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Registar'}
      </Button>
      {message && (
        <Alert severity={message.type} sx={{ width: '100%', mt: 2 }}>
          {message.text}
        </Alert>
      )}
      <Typography variant="body2" align="center">
        Já tem conta? <Link component={RouterLink} to="/login">Faça login</Link>
      </Typography>
      <Typography variant="body2" align="center" sx={{ mt: 1 }}>
        <RouterLink to="/">Voltar para a página inicial</RouterLink>
      </Typography>
    </Box>
  );
}
