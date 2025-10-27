import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Link,
  InputAdornment,
<<<<<<< HEAD
  IconButton,
  Container,
  Paper,
  Avatar
=======
  IconButton
>>>>>>> 88526a0c26a54d0a34f5a73f076cafcdad233532
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos.' });
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro ao tentar fazer login.');
      }

<<<<<<< HEAD
      navigate('/dashboard');
=======
      // --- ALTERAÇÃO APLICADA AQUI ---
      // Verifica se o backend enviou o token
      if (data.token) {
        localStorage.setItem('authToken', data.token); // Guarda o token no localStorage
        console.log("Token JWT guardado com sucesso."); // Mensagem para depuração
        navigate('/dashboard'); // Redireciona para o dashboard
      } else {
        // Se o backend respondeu com sucesso mas sem token, algo está errado
        console.error("Login bem-sucedido, mas token não recebido do backend.");
        throw new Error('Falha na autenticação: Token não fornecido.');
      }
      // --- FIM DA ALTERAÇÃO ---
>>>>>>> 88526a0c26a54d0a34f5a73f076cafcdad233532

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
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
=======
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%', maxWidth: 400 }}>
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
        type={showPassword ? 'text' : 'password'}
        id="password"
        autoComplete="current-password"
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
>>>>>>> 88526a0c26a54d0a34f5a73f076cafcdad233532
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
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 600 }}>
            Login
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
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
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
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
              {isLoading ? <CircularProgress size={24} /> : 'Entrar'}
            </Button>
            
            {message && (
              <Alert severity={message.type} sx={{ width: '100%', mt: 2, mb: 1 }}>
                {message.text}
              </Alert>
            )}

            {/* ----- ESTA É A PARTE CORRIGIDA ----- */}
            <Grid container sx={{ mt: 2 }} spacing={1}>
              <Grid item xs={12} sx={{ textAlign: 'right' }}>
                <Link component={RouterLink} to="/forgot-password" variant="body2">
                  Esqueceu a senha?
                </Link>
              </Grid>
              <Grid item xs={12} sx={{ textAlign: 'right' }}>
                <Link component={RouterLink} to="/register" variant="body2">
                  {"Não tem uma conta? Registre-se"}
                </Link>
              </Grid>
            </Grid>
            {/* ----- FIM DA CORREÇÃO ----- */}
            
            <Typography variant="body2" align="center" sx={{ mt: 3 }}>
              <Link component={RouterLink} to="/">
                Voltar para a página inicial
              </Link>
            </Typography>

          </Box>
        </Paper>
      </Box>
    </Container>
  );
}