import React from 'react';
// Agrupa os imports da MUI
import { Box, Button, Typography, Container, Paper, Avatar } from '@mui/material';
// Importa o ícone
import LockOpenIcon from '@mui/icons-material/LockOpen';
// Importa o Link do React Router
import { Link as RouterLink } from 'react-router-dom'; // Renomeia para RouterLink para clareza

export default function Welcome() {
  return (
    // Usa Container para limitar a largura e Paper para o card
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={6}
        sx={{
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
          mt: 8, // Adiciona uma margem no topo se necessário
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOpenIcon />
        </Avatar>

        <Typography component="h1" variant="h5" sx={{ fontWeight: 600, mt: 1 }}>
          Bem-vindo ao Sistema
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Escolha uma opção para continuar.
        </Typography>

        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            component={RouterLink} // Usa o RouterLink para navegação
            to="/login"
            variant="contained"
            size="large"
            fullWidth
          >
            Logar
          </Button>
          <Button
            component={RouterLink} // Usa o RouterLink para navegação
            to="/register"
            variant="outlined"
            size="large"
            fullWidth
          >
            Registrar
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

