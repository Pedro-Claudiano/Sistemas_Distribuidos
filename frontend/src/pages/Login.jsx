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
  IconButton 
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
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
      
      // Se o login for bem-sucedido, redireciona para o dashboard
      navigate('/dashboard');

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        }}
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
