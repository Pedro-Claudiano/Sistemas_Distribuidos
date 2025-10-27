const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// ----- INÍCIO: Preparação para MySQL -----
// Importe o driver do MySQL (a pessoa do BD fará isso)
// const mysql = require('mysql2/promise');

// Crie a conexão com o banco de dados usando as variáveis de ambiente
// A pessoa do BD implementará esta parte
/*
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
console.log(`[Usuários] Conectando ao MySQL no host: ${process.env.DB_HOST}`);
*/
// ----- FIM: Preparação para MySQL -----


const app = express();
const port = process.env.NODE_PORT || 3000;
const saltRounds = 10;

app.use(cors());
app.use(express.json());


// --- ROTA: Criar/Registrar um novo usuário ---
app.post('/users', async (req, res) => {
  const { name, email, password } = req.body;
  console.log(`[Usuários] Recebida requisição para criar usuário com email: ${email}`);

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = uuidv4();

    // ----- LÓGICA MySQL (a ser implementada) -----
    // const connection = await pool.getConnection();
    // try {
    //   const [result] = await connection.query(
    //     'INSERT INTO Usuarios (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    //     [userId, name, email, passwordHash]
    //   );
    //   console.log(`[Usuários] Usuário ${email} criado com sucesso com ID: ${userId}`);
    //   res.status(201).json({ id: userId, name, email });
    // } finally {
    //   connection.release();
    // }
    // ----- FIM LÓGICA MySQL -----

    // Resposta temporária enquanto o BD não está conectado
    console.warn("[Usuários] Lógica de banco de dados para criar usuário ainda não implementada.");
    res.status(501).json({ message: "Funcionalidade de criação de usuário ainda não implementada com MySQL.", id: userId, name, email });

  } catch (err) {
    console.error("Erro ao processar criação de usuário:", err);
    res.status(500).json({ error: 'Não foi possível processar a requisição.' });
  }
});


// --- ROTA: Buscar um usuário pelo ID ---
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  console.log(`[Usuários] Buscando usuário ${userId}`);

  try {
    // ----- LÓGICA MySQL (a ser implementada) -----
    // const connection = await pool.getConnection();
    // try {
    //   const [rows] = await connection.query('SELECT id, name, email FROM Usuarios WHERE id = ?', [userId]);
    //   if (rows.length > 0) {
    //     res.status(200).json(rows[0]);
    //   } else {
    //     res.status(404).json({ error: 'User not found' });
    //   }
    // } finally {
    //   connection.release();
    // }
    // ----- FIM LÓGICA MySQL -----

    // Resposta temporária
    console.warn(`[Usuários] Lógica de banco de dados para buscar usuário ${userId} ainda não implementada.`);
    if (userId === 'placeholder-id') { // Simula encontrar um usuário
       res.status(200).json({ id: userId, name: "Usuário Placeholder", email: "placeholder@email.com"});
    } else {
       res.status(404).json({ error: 'User not found (simulado)' });
    }

  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- ROTA: Login do usuário ---
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[Usuários] Tentativa de login para o email: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
     // ----- LÓGICA MySQL (a ser implementada) -----
    // const connection = await pool.getConnection();
    // try {
    //   // Busca o usuário pelo email (precisa do hash da senha!)
    //   const [rows] = await connection.query('SELECT id, name, password_hash FROM Usuarios WHERE email = ?', [email]);
    //   if (rows.length > 0) {
    //     const user = rows[0];
    //     const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    //     if (isPasswordValid) {
    //       console.log(`[Usuários] Login bem-sucedido para ${email}`);
    //       res.status(200).json({
    //         message: 'Login bem-sucedido!',
    //         userId: user.id,
    //         name: user.name
    //       });
    //     } else {
    //       console.log(`[Usuários] Falha no login (senha inválida) para ${email}`);
    //       res.status(401).json({ error: 'Email ou senha inválidos.' });
    //     }
    //   } else {
    //     console.log(`[Usuários] Falha no login (usuário não encontrado) para ${email}`);
    //     res.status(401).json({ error: 'Email ou senha inválidos.' });
    //   }
    // } finally {
    //   connection.release();
    // }
    // ----- FIM LÓGICA MySQL -----

     // Resposta temporária
    console.warn(`[Usuários] Lógica de banco de dados para login de ${email} ainda não implementada.`);
     if (email === "teste@email.com" && password === "senha123") {
       res.status(200).json({ message: 'Login bem-sucedido! (simulado)', userId: 'simulado-123', name: 'Usuário Simulado'});
     } else {
       res.status(401).json({ error: 'Email ou senha inválidos. (simulado)' });
     }

  } catch (err) {
    console.error("Erro durante o login:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- ROTA: Buscar todos os usuários ---
// (Movida para antes do app.listen)
app.get('/users', async (req, res) => {
  console.log(`[Usuários] Buscando todos os usuários.`);
  
  try {
    // ----- LÓGICA MySQL (a ser implementada) -----
    // const connection = await pool.getConnection();
    // try {
    //   const [rows] = await connection.query('SELECT id, name, email FROM Usuarios');
    //   res.status(200).json(rows);
    // } finally {
    //   connection.release();
    // }
    // ----- FIM LÓGICA MySQL -----
    
    // Resposta temporária
    console.warn("[Usuários] Lógica de banco de dados para buscar todos os usuários ainda não implementada.");
    res.status(200).json([{ id: 'placeholder-id', name: "Usuário Placeholder", email: "placeholder@email.com"}]);

  } catch (err) {
    console.error("Erro ao buscar todos os usuários:", err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});


app.listen(port, () => {
  console.log(`Serviço de Usuários rodando na porta ${port}`);
});