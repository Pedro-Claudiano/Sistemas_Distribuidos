import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";

const API_BASE_URL = 'http://3.228.1.69:3000/api';

export default function AdminRooms() {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list', 'add', 'edit'
  const [salas, setSalas] = useState([]);
  
  // Estado para o formulário
  const [currentSala, setCurrentSala] = useState(null);
  const [nomeSala, setNomeSala] = useState("");
  const [localSala, setLocalSala] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);

  // Verifica se o usuário é admin ao montar o componente
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthorized(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin') {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  // Carrega as salas ao montar o componente
  useEffect(() => {
    if (isAuthorized === true) {
      fetchSalas();
    }
  }, [isAuthorized]);

  const fetchSalas = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage({ type: 'error', text: 'Erro de autenticação. Faça login.' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar salas');
      const data = await response.json();
      setSalas(data);
    } catch (error) {
      console.error('Erro ao buscar salas:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar salas.' });
    }
  };

  const handleShowAddForm = () => {
    setView('add');
    setCurrentSala(null);
    setNomeSala("");
    setLocalSala("");
    setMessage(null);
  };

  const handleShowEditForm = (sala) => {
    setView('edit');
    setCurrentSala(sala);
    setNomeSala(sala.name);
    setLocalSala(sala.location);
    setMessage(null);
  };

  const handleCancel = () => {
    setView('list');
    setCurrentSala(null);
    setNomeSala("");
    setLocalSala("");
    setMessage(null);
  };

  const handleDelete = async (salaId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta sala?')) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage({ type: 'error', text: 'Erro de autenticação. Faça login.' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${salaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao deletar sala');

      setSalas(salas.filter(s => s.id !== salaId));
      setMessage({ type: "success", text: "Sala deletada com sucesso!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao deletar sala:', error);
      setMessage({ type: 'error', text: 'Erro ao deletar sala.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nomeSala || !localSala) {
      setMessage({ type: "error", text: "Preencha todos os campos." });
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage({ type: 'error', text: 'Erro de autenticação. Faça login.' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    setIsLoading(true);
    
    try {
      if (view === 'add') {
        // Adicionar
        const response = await fetch(`${API_BASE_URL}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: nomeSala,
            location: localSala
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao criar sala');
        }

        const novaSala = await response.json();
        setSalas([...salas, novaSala]);
        setMessage({ type: "success", text: "Sala cadastrada com sucesso!" });
      } else {
        // Editar
        const response = await fetch(`${API_BASE_URL}/rooms/${currentSala.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: nomeSala,
            location: localSala
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar sala');
        }

        setSalas(salas.map(s => 
          s.id === currentSala.id ? { ...s, name: nomeSala, location: localSala } : s
        ));
        setMessage({ type: "success", text: "Sala atualizada com sucesso!" });
      }
      
      setIsLoading(false);
      
      // Volta para a lista após 2 segundos
      setTimeout(() => {
        handleCancel();
      }, 2000); 
      
    } catch (error) {
      console.error('Erro ao salvar sala:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar sala.' });
      setIsLoading(false);
    }
  };

  // Tela de carregamento
  if (isAuthorized === null) {
    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Verificando permissões...</p>
        </div>
      </>
    );
  }

  // Tela de não autorizado
  if (isAuthorized === false) {
    return (
      <>
        <h1 className="app-logo">SIRESA</h1>
        <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
          <h2 className="form-title" style={{ color: '#e74c3c', marginBottom: '1rem' }}>Acesso Negado</h2>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            Você não tem permissão para acessar esta página.
            <br />
            Apenas administradores podem gerenciar salas.
          </p>
          <button 
            className="login-button" 
            onClick={() => navigate('/dashboard')}
            style={{ marginBottom: '1rem' }}
          >
            Ir para Dashboard
          </button>
          <br />
          <button 
            className="login-button cancel" 
            onClick={() => navigate('/login')}
          >
            Fazer Login
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="page-user-actions">
        <span className="welcome-message">Gerenciar Salas</span>
        <div className="user-actions">
          <button 
            onClick={() => navigate('/admin/reservas')} 
            className="header-icon" 
            title="Voltar às Reservas"
          >
            <i className="material-symbols-rounded">arrow_back</i>
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('authToken');
              navigate('/login');
            }} 
            className="header-icon" 
            title="Sair"
          >
            <i className="material-symbols-rounded">logout</i>
          </button>
        </div>
      </div>

      <div className="login-container admin-dashboard">
        <h2 className="form-title">Gerenciamento de Salas</h2>
        <p className="separator"><span>Cadastro e Edição</span></p>

        {view === 'list' && (
          <div className="admin-view">
            <div className="admin-actions">
              <button 
                className="login-button add-button" 
                onClick={handleShowAddForm}
              >
                Cadastrar Nova Sala
              </button>
            </div>
            
            {message && (
              <div className={`form-message ${message.type}`} style={{ marginBottom: '1rem' }}>
                {message.text}
              </div>
            )}

            <div className="room-list">
              {salas.length === 0 ? (
                <p style={{ textAlign: 'center', marginTop: '2rem' }}>Nenhuma sala cadastrada.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nome (Sala)</th>
                      <th>Local (Prédio)</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salas.map(sala => (
                      <tr key={sala.id}>
                        <td>{sala.name}</td>
                        <td>{sala.location}</td>
                        <td className="room-actions">
                          <button onClick={() => handleShowEditForm(sala)} className="action-btn edit">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(sala.id)} className="action-btn delete">
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {(view === 'add' || view === 'edit') && (
          <div className="admin-view">
            <h3 className="form-title-secondary">
              {view === 'add' ? 'Cadastrar Nova Sala' : 'Editar Sala'}
            </h3>

            <form className="login-form" onSubmit={handleSubmit}>
              <InputField
                type="text"
                placeholder="Nome da Sala (ex: 101, Auditório)"
                icon="meeting_room"
                value={nomeSala}
                onChange={(e) => setNomeSala(e.target.value)}
              />
              <InputField
                type="text"
                placeholder="Local (ex: Prédio ADM)"
                icon="business"
                value={localSala}
                onChange={(e) => setLocalSala(e.target.value)}
              />

              {message && (
                <div className={`form-message ${message.type}`}>
                  {message.text}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="login-button cancel" onClick={handleCancel}>
                  Cancelar
                </button>
                <button type="submit" className="login-button" disabled={isLoading}>
                  {isLoading ? "Salvando..." : (view === 'add' ? "Cadastrar" : "Salvar Edições")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}