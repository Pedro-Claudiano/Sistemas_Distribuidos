import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import RoomSelection from './pages/RoomSelection.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Profile from './pages/Profile.jsx'; // 1. IMPORTAR A NOVA PÁGINA
import './index.css';

// Criação do roteador com o mapa do site
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // O App é o layout principal
    children: [ // As páginas são "filhas" do layout
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
        path: "profile",
        element: <Profile />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
