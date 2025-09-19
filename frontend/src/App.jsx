import React, { useState } from 'react';
import './App.css';

function App() {
  // Estados para armazenar os dados dos inputs do formulário
  const [userId, setUserId] = useState('');
  const [room, setRoom] = useState('');

  // Estado para armazenar as mensagens de feedback (sucesso ou erro)
  const [message, setMessage] = useState('');
  
  // Estado para controlar o status de carregamento e desabilitar o botão
  const [isLoading, setIsLoading] = useState(false);

  // Função chamada quando o formulário é enviado
  const handleSubmit = async (event) => {
    event.preventDefault(); // Impede o recarregamento da página
    
    // Validação simples para garantir que os campos não estão vazios
    if (!userId || !room) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos.' });
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Faz a chamada POST para o nosso backend.
      // A URL '/api/reservas' é interceptada pelo Nginx e redirecionada
      // para o serviço de reservas, como configuramos.
      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, room }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Se a resposta não for de sucesso (ex: 400, 404), lança um erro
        throw new Error(data.error || 'Ocorreu um erro ao criar a reserva.');
      }
      
      // Se tudo deu certo, exibe a mensagem de sucesso
      setMessage({ type: 'success', text: data.message });
      setUserId('');
      setRoom('');

    } catch (error) {
      // Se ocorrer qualquer erro, exibe a mensagem de erro
      setMessage({ type: 'error', text: error.message });
    } finally {
      // Garante que o estado de carregamento seja desativado no final
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Sistema de Reserva de Salas</h1>
        <p>Um sistema distribuído rodando com React, Node.js e Docker.</p>
      </header>

      <main>
        <form onSubmit={handleSubmit} className="reservation-form">
          <div className="form-group">
            <label htmlFor="userId">ID do Usuário</label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Ex: 123"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="room">Nome da Sala</label>
            <input
              type="text"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Ex: Sala de Reunião A"
              disabled={isLoading}
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Fazer Reserva'}
          </button>
        </form>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;