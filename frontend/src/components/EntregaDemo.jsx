import React, { useState, useEffect } from 'react';

const API_URL = "http://3.228.1.69:3000/api"; 

export default function EntregaDemo() {
  const [user, setUser] = useState(null); 
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  
  // 1. INICIALIZAÇÃO INTELIGENTE
  // Tenta pegar do localStorage primeiro. Se não tiver, cria uma padrão.
  const [currentRoom, setCurrentRoom] = useState(() => {
    return localStorage.getItem('demo_room_id') || "sala_demo_inicial";
  });

  // 2. SINCRONIZAÇÃO ENTRE ABAS (O "Pulo do Gato")
  useEffect(() => {
    // Função que roda quando outra aba muda o localStorage
    const handleStorageChange = (e) => {
        if (e.key === 'demo_room_id') {
            setCurrentRoom(e.newValue);
            setLogs(prev => [`[Sincronização] Sala atualizada para: ${e.newValue} (info)`, ...prev]);
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg} (${type})`, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // 3. RESETAR CENÁRIO (Atualiza LocalStorage e notifica outras abas)
  const resetScenario = () => {
    const newRoom = `sala_demo_${Math.floor(Math.random() * 1000)}`;
    
    // Salva no navegador para compartilhar com outras abas
    localStorage.setItem('demo_room_id', newRoom);
    setCurrentRoom(newRoom);
    
    setLogs([]); 
    addLog(`♻️ Cenário resetado! Nova sala alvo: ${newRoom}`, 'info');
  };

  // 0. PREPARAR BANCO
  const seedDatabase = async () => {
    addLog('Criando usuários de teste...', 'pending');
    
    const users = [
        { name: "Super Admin", email: "admin@seguro.com", password: "123", role: "admin" },
        { name: "Cliente Comum", email: "cliente@seguro.com", password: "123", role: "client" }
    ];

    for (const u of users) {
        try {
            const res = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(u)
            });
            if (res.ok) {
                addLog(`✅ Usuário criado: ${u.email} (${u.role})`, 'success');
            } else if (res.status === 409) {
                addLog(`ℹ️ Usuário ${u.email} já existe.`, 'warning');
            } else {
                addLog(`Erro ao criar ${u.email}`, 'error');
            }
        } catch (err) {
            addLog(`Erro de conexão: ${err.message}`, 'error');
        }
    }
  };

  // 1. LOGIN
  const handleLogin = async (role) => {
    const email = role === 'admin' ? 'admin@seguro.com' : 'cliente@seguro.com';
    const password = '123';

    try {
      addLog(`Tentando login como ${role.toUpperCase()}...`, 'pending');
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        setUser(data);
        addLog(`Login SUCESSO! Role: ${data.role}`, 'success');
      } else {
        addLog(`Erro Login: ${data.error}`, 'error');
      }
    } catch (err) {
      addLog(`Erro de Conexão: ${err.message}`, 'error');
    }
  };

  // 2. TESTE RBAC
  const listarUsuarios = async () => {
    if (!user) return addLog('Você precisa logar primeiro!', 'error');

    try {
      addLog(`Solicitando lista de usuários (Rota Protegida)...`, 'pending');
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        addLog(`SUCESSO: ${data.length} usuários encontrados.`, 'success');
        console.table(data); 
      } else {
        const err = await res.json();
        if (res.status === 403) {
            addLog(`⛔ BLOQUEADO (403): O usuário '${user.name}' não é Admin!`, 'error');
        } else {
            addLog(`Erro ${res.status}: ${err.error}`, 'error');
        }
      }
    } catch (err) {
        addLog(`Falha na Requisição: ${err.message}`, 'error');
    }
  };

  // 3. MONITORAMENTO
  const checkHealth = async () => {
    try {
        const res = await fetch(`https://localhost/health`); 
        const data = await res.json();
        setHealth(data);
        if (res.status === 200) {
            addLog(`Sistema SAUDÁVEL. DB: ${data.dbConnection}`, 'success');
        } else {
            addLog(`SISTEMA INSTÁVEL (Circuit Breaker?). Status: ${res.status}`, 'warning');
        }
    } catch (err) {
        addLog(`Sistema OFF: ${err.message}`, 'error');
    }
  };

  // 4. RESERVA
  const fazerReserva = async () => {
    if (!user) return addLog('Faça login primeiro!', 'error');
    
    // USA A SALA DO LOCALSTORAGE (IGUAL PARA TODOS)
    const payload = {
        room_id: currentRoom, 
        start_time: "2025-12-25T10:00:00",
        end_time: "2025-12-25T11:00:00"
    };

    addLog(`Enviando reserva para ${payload.room_id}...`, 'pending');
    
    try {
        const res = await fetch(`${API_URL}/reservas`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            addLog('✅ RESERVA CRIADA COM SUCESSO!', 'success');
        } else if (res.status === 409) {
            addLog('⛔ CONFLITO! A sala já foi reservada (Lock funcionou).', 'error');
        } else {
            addLog(`Erro: ${res.status}`, 'error');
        }
    } catch (err) {
        addLog(`Erro rede: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1>🚀 Painel de Controle</h1>
          <button onClick={seedDatabase} style={{background: '#333', color: 'white', padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer'}}>
            🛠️ Preparar Banco
          </button>
      </div>
      
      {/* STATUS BAR */}
      <div style={{ padding: '15px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <strong>Status: </strong>
            {user ? (
                <span style={{ color: user.role === 'admin' ? 'blue' : 'orange', fontWeight: 'bold' }}>
                    {user.name} ({user.role.toUpperCase()})
                </span>
            ) : <span style={{color: 'gray'}}>Não logado</span>}
        </div>
        <button onClick={() => setUser(null)} style={{padding: '5px 10px', cursor: 'pointer'}}>Sair</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* COLUNA 1 */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
            <h3>1. Segurança & RBAC</h3>
            <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                <button onClick={() => handleLogin('admin')} style={{background: '#007bff', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1}}>
                    Admin
                </button>
                <button onClick={() => handleLogin('client')} style={{background: '#28a745', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1}}>
                    Cliente
                </button>
            </div>
            <hr/>
            <button onClick={listarUsuarios} style={{width: '100%', padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
                📂 Tentar Listar Usuários
            </button>
        </div>

        {/* COLUNA 2 */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
            <h3>2. Resiliência & Concorrência</h3>
            
            <div style={{marginBottom: '15px'}}>
                <button onClick={checkHealth} style={{padding: '5px', cursor: 'pointer'}}>📡 Verificar Status</button>
                {health && <div style={{fontSize: '12px', marginTop: '5px'}}>
                    Uptime: {Math.floor(health.uptime)}s | DB: <b>{health.dbConnection}</b>
                </div>}
            </div>
            <hr/>
            <div style={{marginTop: '15px'}}>
                <strong>Teste de Race Condition:</strong><br/>
                <div style={{fontSize: '12px', marginBottom: '5px', color: '#555', padding: '5px', background: '#eee', borderRadius: '4px'}}>
                    Sala Alvo (Sync): <b>{currentRoom}</b>
                </div>
                
                <button onClick={fazerReserva} style={{width: '100%', padding: '15px', background: 'purple', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px'}}>
                    ⚡ TENTAR RESERVA
                </button>

                <button onClick={resetScenario} style={{width: '100%', padding: '5px', background: 'transparent', border: '1px dashed #999', color: '#555', cursor: 'pointer'}}>
                    🔄 Resetar Teste (Nova Sala)
                </button>
            </div>
        </div>
      </div>

      {/* LOGS */}
      <div style={{ marginTop: '20px', background: '#222', color: '#0f0', padding: '15px', borderRadius: '8px', height: '300px', display: 'flex', flexDirection: 'column' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', paddingBottom: '10px', marginBottom: '10px'}}>
            <h4 style={{margin: 0, color: 'white'}}>LOGS DO SISTEMA:</h4>
            <button onClick={clearLogs} style={{background: 'transparent', border: '1px solid #555', color: '#aaa', cursor: 'pointer', fontSize: '12px', padding: '2px 8px', borderRadius: '4px'}}>
                Limpar Logs 🗑️
            </button>
        </div>
        <div style={{overflowY: 'auto', flex: 1, fontFamily: 'monospace'}}>
            {logs.map((log, i) => (
                <div key={i} style={{ 
                    marginBottom: '5px', 
                    color: log.includes('(error)') ? '#ff4444' : log.includes('(success)') ? '#00cc00' : log.includes('(warning)') ? 'orange' : '#ccc' 
                }}>
                    {log}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}