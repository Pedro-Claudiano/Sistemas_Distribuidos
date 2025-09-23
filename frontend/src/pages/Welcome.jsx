import React from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { Link } from 'react-router-dom'; // Importa o Link para navegação

export default function Welcome() {
  return (
    <Container maxWidth="xs">
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Bem-vindo ao Sistema de Reservas
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Escolha uma opção para continuar.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button 
            component={Link} 
            to="/login" 
            variant="contained" 
            size="large"
          >
            Logar
          </Button>
          <Button 
            component={Link} 
            to="/register" 
            variant="outlined" 
            size="large"
          >
            Registrar
          </Button>
        </Box>
      </Box>
    </Container>
  );
}