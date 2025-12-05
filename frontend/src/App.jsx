import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';

// 👇 1. Importe o componente da Demo (verifique se a pasta está correta)
import EntregaDemo from './components/EntregaDemo';

export default function App() {

  // 👇 2. ADICIONE ESTE BLOCO LOGO NO INÍCIO
  // Se a URL for "/demo", renderiza o painel de apresentação e ignora o resto do app (MUI, Rotas, etc).
  if (window.location.pathname === '/demo') {
    return <EntregaDemo />;
  }

  // --- Daqui para baixo é o seu código original intacto ---

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
      {/* O Outlet renderiza as páginas (Login, Register, etc.) */}
      <Outlet />
    </ThemeProvider>
  );
}