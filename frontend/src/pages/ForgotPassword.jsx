import React from 'react';
import { Typography, Box, TextField, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <Box sx={{ textAlign: 'center', width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Recuperar Senha
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Por favor, insira seu email para receber as instruções.
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
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
      >
        Enviar Email de Recuperação
      </Button>
      <Typography variant="body2" align="center">
        <RouterLink to="/login">Voltar para o Login</RouterLink>
      </Typography>
    </Box>
  );
}