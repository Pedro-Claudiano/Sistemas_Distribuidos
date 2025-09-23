import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.jsx';
import Welcome from './pages/Welcome.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword  from './pages/ForgotPassword.jsx';
import './index.css';

// Criação do roteador com o mapa do site
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // O App é o layout principal
    children: [ // As páginas são "filhas" do layout
      {
        index: true, // A rota "/" (página inicial) renderizará Welcome
        element: <Welcome />,
      },
      {
        path: "login", // A rota "/login" renderizará Login
        element: <Login />,
      },
      {
        path: "register", // A rota "/register" renderizará Register
        element: <Register />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);