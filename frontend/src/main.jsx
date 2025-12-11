import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import RoomSelection from './pages/RoomSelection.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminReservations from './pages/AdminReservations.jsx';
import ClientNotifications from './pages/ClientNotifications.jsx';
import Profile from './pages/Profile.jsx';
import './index.css';

// 👇 1. IMPORTANTE: Importe o componente da Demo
import EntregaDemo from './components/EntregaDemo';

// Criação do roteador com o mapa do site (MANTIDO IGUAL)
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // O App é o layout principal
    children: [ 
      {
        index: true,
        element: <Login />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path:"dashboard",
        element: <RoomSelection />,
      },
      {
        path: "admin",
        element: <AdminDashboard />,
      },
      {
        path: "admin/reservas",
        element: <AdminReservations />,
      },
      {
        path: "notifications",
        element: <ClientNotifications />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
    ],
  },
]);

// 👇 2. MUDANÇA AQUI: Lógica condicional de renderização
const root = ReactDOM.createRoot(document.getElementById('root'));

if (window.location.pathname === '/demo') {
  // Se a URL for /demo, mostra APENAS o painel e ignora o roteador
  root.render(
    <React.StrictMode>
      <EntregaDemo />
    </React.StrictMode>
  );
} else {
  // Caso contrário, carrega o seu site normal com o roteador
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}