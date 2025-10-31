import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';

// Vamos manter o tema do MUI, caso você queira usar
// componentes dele dentro das páginas, mas vamos remover
// o 'Container' daqui para deixar o 'index.css' controlar o layout.
export default function App() {
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#5F41E4', // Usando a cor primária do seu CSS
      },
    },
    typography: {
      fontFamily: '"Montserrat", sans-serif', // Usando a fonte do seu CSS
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* O Outlet agora renderiza as páginas (Login, Register, etc.) 
        diretamente. O seu 'index.css' vai aplicar o fundo roxo
        ao 'body' e o '.login-container' vai se centralizar.
      */}
      <Outlet />
    </ThemeProvider>
  );
}
