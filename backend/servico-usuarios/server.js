const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Banco de dados em memória
const users = [{ userId: '123', name: 'João da Silva' }];

app.get('/users/:userId', (req, res) => {
    console.log(`[Usuários] Buscando usuário ${req.params.userId}`);
    const user = users.find(u => u.userId === req.params.userId);
    if (user) {
        res.status(200).json(user);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.listen(port, () => {
    console.log(`Serviço de Usuários rodando na porta ${port}`);
});