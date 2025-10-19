import React from 'react';
import { Box, Button, Typography, Container, Paper, Avatar } from '@mui/material';
import { Link } from 'react-router-dom';
import LockOpenIcon from '@mui/icons-material/LockOpen';

export default function Welcome() {
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
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
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
              component={Link}
              to="/login"
              variant="contained"
              size="large"
              fullWidth
            >
              Logar
            </Button>
            <Button
              component={Link}
              to="/register"
              variant="outlined"
              size="large"
              fullWidth 
            >
              Registrar
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}