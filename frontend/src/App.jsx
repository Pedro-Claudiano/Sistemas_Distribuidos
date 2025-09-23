import React, { useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom'; // Importante para renderizar as páginas filhas
import { Container, Box, CssBaseline, Switch, FormGroup, FormControlLabel, ThemeProvider, createTheme } from '@mui/material';

export default function App() {
  const [mode, setMode] = useState('dark');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const handleThemeChange = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
        <FormGroup>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={handleThemeChange} />}
            label={mode === 'dark' ? 'Escuro' : 'Claro'}
          />
        </FormGroup>
      </Box>
      <Container
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CssBaseline />
        <Outlet /> {/* As páginas (Welcome, Login, Register) serão renderizadas aqui */}
      </Container>
    </ThemeProvider>
  );
}