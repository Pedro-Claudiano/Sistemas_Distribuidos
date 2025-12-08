import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../components/InputField.jsx';

const API_BASE_URL = '/api';

export default function Profile() {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("Carregando...");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Busca os dados do usuário ao carregar a página
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Decodifica o JWT para pegar o userId (payload está no meio do token)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userIdFromToken = payload.userId;
        setUserId(userIdFromToken);

        // Busca os dados completos do usuário
        const response = await fetch(`${API_BASE_URL}/users/${userIdFromToken}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Erro ao buscar dados do usuário');

        const userData = await response.json();
        setUserName(userData.name);
        setEmail(userData.email);
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar dados do perfil.' });
      }
    };

    fetchUserData();
  }, [navigate]);

  // Lógica de Sair (Logout)
  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  // Lógica para voltar ao Dashboard
  const handleGoToDashboard = (e) => {
    e.preventDefault();
    navigate('/dashboard'); // Navega para a página de reservas
  };

  // Lógica para Deletar a Conta
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    
    if (!window.confirm('Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita.')) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token || !userId) {
      setMessage({ type: 'error', text: 'Erro de autenticação.' });
      return;
    }
    
    setIsLoading(true);
    setMessage({ type: "error", text: "Deletando conta..." });

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao deletar conta');

      setMessage({ type: "success", text: "Conta deletada com sucesso!" });
      setTimeout(() => handleLogout(e), 2000);
      
    } catch (err) {
      setIsLoading(false);
      setMessage({ type: "error", text: "Erro ao deletar conta." });
    }
  };

  // Lógica para Atualizar Email/Senha
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (password && password !== confirmPassword) {
      setMessage({ type: "error", text: "As novas senhas não coincidem." });
      return;
    }
    
    if (!email && !password) {
       setMessage({ type: "error", text: "Nenhum campo foi alterado." });
       return;
    }

    const token = localStorage.getItem('authToken');
    if (!token || !userId) {
      setMessage({ type: 'error', text: 'Erro de autenticação.' });
      return;
    }

    setIsLoading(true);
    
    const updateData = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Erro ao atualizar perfil');

      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
      setPassword("");
      setConfirmPassword("");

    } catch (err) {
       setMessage({ type: "error", text: "Erro ao atualizar perfil." });
    } finally {
       setIsLoading(false);
    }
  };


  return (
    <>
      <a href="/dashboard" onClick={handleGoToDashboard} className="app-logo-link">
        <h1 className="app-logo">SIRESA</h1>
      </a>

      <div className="page-user-actions">
        <div className="user-actions">
          <a href="/dashboard" onClick={handleGoToDashboard} className="header-button" title="Ir para Reservas">
            Reservas
          </a>
          <a href="/login" onClick={handleLogout} className="header-icon" title="Sair">
            <i className="material-symbols-rounded">logout</i>
          </a>
        </div>
      </div>

      <div className="login-container admin-dashboard">
        <h2 className="form-title">Meu Perfil</h2>
        
        {/* Mostra o Nome (Read-Only) */}
        <div className="profile-name-display">
          <i className="material-symbols-rounded">person</i>
          <span>{userName}</span>
        </div>

        <p className="separator"><span>Alterar dados</span></p>

        <form className="login-form" onSubmit={handleUpdateProfile}>
          <InputField
            type="email"
            placeholder="Novo Endereço de Email"
            icon="mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            type="password"
            placeholder="Nova Senha (deixe em branco para não alterar)"
            icon="lock"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <InputField
            type="password"
            placeholder="Confirmar Nova Senha"
            icon="lock"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {message && (
            <div className={`form-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>

        <p className="separator"><span>Ações da Conta</span></p>

        <div className="profile-actions-wrapper">
          <button 
            className="login-button delete-action" 
            onClick={handleDeleteAccount}
            disabled={isLoading}
          >
            Deletar Minha Conta
          </button>
        </div>
      </div>
    </>
  );
}


