import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
<<<<<<< HEAD
  InputAdornment,
  IconButton,
  Container,
  Paper,
  Avatar,
  Link
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);
=======
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
>>>>>>> 88526a0c26a54d0a34f5a73f076cafcdad233532
  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
<<<<<<< HEAD
    if (!name || !email || !password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/users/register', {
=======
    if (!name || !email || !password) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos.' });
      return;
    }
    setIsLoading(true);
    setMessage('');

    try {
      // Faz a chamada POST para o endpoint de criação de utilizador
      const response = await fetch('/api/users', { // Note que a URL é /api/users, não /api/users/login
>>>>>>> 88526a0c26a54d0a34f5a73f076cafcdad233532
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
<<<<<<< HEAD
        throw new Error(data.error || 'Ocorreu um erro ao tentar registrar.');
      }

      setMessage({ type: 'success', text: 'Registro realizado com sucesso! Redirecionando para o login...' });
      setTimeout(() => navigate('/login'), 2000);
=======
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
>>>>>>> 88526a0c26a54d0a34f5a73f076cafcdad233532

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
<<<<<<< HEAD
      setIsLoading(false);
=======
      // Garante que o estado de carregamento seja desativado, exceto se for redirecionar logo
      if (!message || message.type !== 'success') {
         setIsLoading(false);
      }
>>>>>>> 88526a0c26a54d0a34f5a73f076cafcdad233532
    }
  };

  return (
<<<<<<< HEAD
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
            <PersonAddOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 600 }}>
            Criar Conta
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
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
              onChange={(e) => {
                setName(e.target.value);
                if (message) setMessage('');
              }}
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
              onChange={(e) => {
                setEmail(e.target.value);
                if (message) setMessage('');
              }}
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (message) setMessage('');
              }}
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
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Senha"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (message) setMessage('');
              }}
              disabled={isLoading}
              error={password !== confirmPassword && confirmPassword !== ''}
              helperText={password !== confirmPassword && confirmPassword !== '' ? 'As senhas não coincidem' : ''}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleClickShowConfirmPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
              {isLoading ? <CircularProgress size={24} /> : 'Registrar'}
            </Button>
            {message && (
              <Alert severity={message.type} sx={{ width: '100%', mt: 2, mb: 2 }}>
                {message.text}
              </Alert>
            )}
            <Typography variant="body2" align="center">
              Já tem uma conta?{' '}
              <Link component={RouterLink} to="/login">
                Faça Login
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
=======
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
>>>>>>> 88526a0c26a54d0a34f5a73f076cafcdad233532
  );
}