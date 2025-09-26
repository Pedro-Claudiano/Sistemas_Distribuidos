// backend/servico-reservas/server.js

const express = require('express');
const cors = require('cors');
const app = express();

// --- ADICIONADO: Importações necessárias para o DynamoDB e IDs ---
const docClient = require("./dynamoClient");
const { PutCommand, ScanCommand, GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');

const port = process.env.NODE_PORT || 3001; // Usando a porta 3001 como padrão para reservas

app.use(cors());
app.use(express.json());


// --- ROTA PARA CRIAR UMA NOVA RESERVA ---
app.post('/reservas', async (req, res) => {
    // Ex: { userId: "123", salaId: "sala-01", dataInicio: "2025-10-20T14:00:00Z" }
    const { userId, salaId, dataInicio, dataFim } = req.body; 
    console.log(`[Reservas] Recebida requisição de reserva para o usuário ${userId}`);

    if (!userId || !salaId || !dataInicio || !dataFim) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const novaReserva = {
        id: uuidv4(), // Chave primária da tabela de Reservas
        userId,
        salaId,
        dataInicio,
        dataFim,
        criadoEm: new Date().toISOString()
    };

    const command = new PutCommand({
        TableName: "Reservas",
        Item: novaReserva,
    });

    try {
        await docClient.send(command);
        console.log(`[Reservas] Reserva ${novaReserva.id} criada com sucesso.`);
        res.status(201).json(novaReserva);
    } catch (err) {
        console.error("Erro ao criar reserva:", err);
        res.status(500).json({ error: 'Não foi possível criar a reserva.' });
    }
});


// --- ROTA PARA LISTAR TODAS AS RESERVAS ---
app.get('/reservas', async (req, res) => {
    console.log(`[Reservas] Buscando todas as reservas.`);
    
    const command = new ScanCommand({
        TableName: "Reservas",
    });

    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (err) {
        console.error("Erro ao buscar todas as reservas:", err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});


// --- ROTA PARA LISTAR RESERVAS DE UM USUÁRIO ESPECÍFICO ---
app.get('/reservas/usuario/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log(`[Reservas] Buscando reservas para o usuário ${userId}`);

    const command = new ScanCommand({
        TableName: "Reservas",
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
            ":userId": userId,
        },
    });

    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (err) {
        console.error(`Erro ao buscar reservas para o usuário ${userId}:`, err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});


// --- ROTA PARA DELETAR UMA RESERVA ---
app.delete('/reservas/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[Reservas] Recebida requisição para deletar reserva ${id}`);

    const command = new DeleteCommand({
        TableName: "Reservas",
        Key: {
            id: id
        }
    });

    try {
        await docClient.send(command);
        console.log(`[Reservas] Reserva ${id} deletada com sucesso.`);
        res.status(200).json({ message: "Reserva deletada com sucesso." });
    } catch (err) {
        console.error(`Erro ao deletar reserva ${id}:`, err);
        res.status(500).json({ error: 'Não foi possível deletar a reserva.' });
    }
});


app.listen(port, () => {
    console.log(`Serviço de Reservas rodando na porta ${port}`);
});