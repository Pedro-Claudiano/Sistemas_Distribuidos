import React from 'react';
import { Typography, Box } from '@mui/material';
import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Página de Registro
      </Typography>
      <Typography variant="body1">
        A funcionalidade de registro será implementada aqui.
      </Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        <Link to="/">Voltar para a página inicial</Link>
      </Typography>
    </Box>
  );
}
