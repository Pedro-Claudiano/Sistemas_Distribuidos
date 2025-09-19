const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const USER_SERVICE_URL = 'http://usuarios-service:3000';

app.post('/reservas', async (req, res) => {
    const { userId, room } = req.body;
    if (!userId || !room) {
        return res.status(400).json({ error: 'userId e room são obrigatórios' });
    }

    try {
        console.log(`[Reservas] Validando usuário ${userId}...`);
        // Comunicação REST com o Serviço de Usuários
        const userResponse = await axios.get(`${USER_SERVICE_URL}/users/${userId}`);

        console.log(`[Reservas] Usuário ${userResponse.data.name} validado. Criando reserva.`);
        // Lógica mínima: apenas retorna sucesso
        res.status(201).json({ 
            message: `Reserva para a sala '${room}' criada com sucesso para ${userResponse.data.name}!` 
        });

    } catch (error) {
        console.error("[Reservas] Erro ao validar usuário:", error.message);
        res.status(400).json({ error: 'Usuário não encontrado ou serviço indisponível.' });
    }
});

app.listen(port, () => {
    console.log(`Serviço de Reservas rodando na porta ${port}`);
});