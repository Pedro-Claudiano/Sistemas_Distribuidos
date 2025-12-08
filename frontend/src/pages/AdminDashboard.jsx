import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";

const API_BASE_URL = '/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list', 'add', 'edit'
  const [salas, setSalas] = useState([]);
  
  // Estado para o formulário
  const [currentSala, setCurrentSala] = useState(null);
  const [nomeSala, setNomeSala] = useState("");
  const [localSala, setLocalSala] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Carrega as salas ao montar o componente
  useEffect(() => {
    fetchSalas();
  }, []);

  const fetchSalas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/salas`);
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

  // Mostra o formulário de edição
  const handleShowEditForm = (sala) => {
    setView('edit');
    setCurrentSala(sala);
    setNomeSala(sala.name);
    setLocalSala(sala.location);
    setMessage(null);
  };

  // Cancela e volta para a lista
  const handleCancel = () => {
    setView('list');
    setCurrentSala(null);
    setNomeSala("");
    setLocalSala("");
    setMessage(null);
  };

  // --- Funções de CRUD ---

  // Deletar
  const handleDelete = async (salaId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta sala?')) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage({ type: 'error', text: 'Erro de autenticação. Faça login.' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/salas/${salaId}`, {
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

  // Submit (Adicionar ou Editar)
  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    navigate('/login');
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
        const response = await fetch(`${API_BASE_URL}/salas`, {
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

        if (!response.ok) throw new Error('Erro ao criar sala');

        const novaSala = await response.json();
        setSalas([...salas, novaSala]);
        setMessage({ type: "success", text: "Sala cadastrada com sucesso!" });
      } else {
        // Editar
        const response = await fetch(`${API_BASE_URL}/salas/${currentSala.id}`, {
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

        if (!response.ok) throw new Error('Erro ao atualizar sala');

        setSalas(salas.map(s => 
          s.id === currentSala.id ? { ...s, name: nomeSala, location: localSala } : s
        ));
        setMessage({ type: "success", text: "Sala atualizada com sucesso!" });
      }
      
      setIsLoading(false);
      // Volta para a lista após o sucesso
      setTimeout(() => handleCancel(), 1500); 
    } catch (error) {
      console.error('Erro ao salvar sala:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar sala.' });
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="page-user-actions">
        <span className="welcome-message">Painel do Administrador</span>
        <div className="user-actions">
          <a href="/login" onClick={handleLogout} className="header-icon" title="Sair">
            <i className="material-symbols-rounded">logout</i>
          </a>
        </div>
      </div>

      <div className="login-container admin-dashboard">
        <h2 className="form-title">Gerenciamento de Salas</h2>
        <p className="separator"><span>Cadastro e Edição</span></p>

        {view === 'list' && (
          <div className="admin-view">
            <button 
              className="login-button add-button" 
              onClick={handleShowAddForm}
            >
              Cadastrar Nova Sala
            </button>
            
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

              {message && message.type === 'error' && (
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

