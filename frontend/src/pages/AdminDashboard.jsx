import { useState } from "react";
import InputField from "../components/InputField";

const mockSalas = [
  { id: 1, name: "101", location: "Prédio ADM" },
  { id: 2, name: "205", location: "Prédio de Eletrônica" },
  { id: 3, name: "Auditório", location: "Prédio Principal" },
];

export default function AdminDashboard() {
  const [view, setView] = useState('list'); // 'list', 'add', 'edit'
  const [salas, setSalas] = useState(mockSalas);
  
  // Estado para o formulário
  const [currentSala, setCurrentSala] = useState(null);
  const [nomeSala, setNomeSala] = useState("");
  const [localSala, setLocalSala] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);


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
  const handleDelete = (salaId) => {
    console.log("Deletando sala:", salaId);
    setSalas(salas.filter(s => s.id !== salaId));
    setMessage({ type: "success", text: "Sala deletada com sucesso!" });
    // Esconde a mensagem após 3s
    setTimeout(() => setMessage(null), 3000);
  };

  // Submit (Adicionar ou Editar)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nomeSala || !localSala) {
      setMessage({ type: "error", text: "Preencha todos os campos." });
      return;
    }

    setIsLoading(true);
    
    // Simulação de API
    setTimeout(() => {
      if (view === 'add') {
        // Adicionar
        const novaSala = {
          id: Date.now(), // ID temporário
          name: nomeSala,
          location: localSala
        };
        setSalas([...salas, novaSala]);
        setMessage({ type: "success", text: "Sala cadastrada com sucesso!" });
      } else {
        // Editar
        setSalas(salas.map(s => 
          s.id === currentSala.id ? { ...s, name: nomeSala, location: localSala } : s
        ));
        setMessage({ type: "success", text: "Sala atualizada com sucesso!" });
      }
      
      setIsLoading(False);
      // Volta para a lista após o sucesso
      setTimeout(() => handleCancel(), 1500); 
    }, 1000);
  };

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>
      <div className="login-container admin-dashboard">
        <h2 className="form-title">Painel do Administrador</h2>
        <p className="separator"><span>Gerenciamento de Salas</span></p>

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

