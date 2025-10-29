import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';

export default function App() {
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#1976d2', // azul padrão do MUI — pode trocar se quiser outra cor
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 0,
        }}
      >
        <Outlet /> {/* As páginas (Login, Register, etc.) serão renderizadas aqui */}
      </Container>
    </ThemeProvider>
  );
}
