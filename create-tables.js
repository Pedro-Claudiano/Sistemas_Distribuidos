// create-tables.js - VERSÃO COM REQUIRE (CommonJS)
const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");

console.log("-> Script iniciado (versão CommonJS).");

const client = new DynamoDBClient({
    endpoint: "http://localhost:8000",
    region: "us-east-1",
    credentials: {
        accessKeyId: "dummykey",
        secretAccessKey: "dummysecret",
    },
});

console.log("-> Cliente DynamoDB configurado.");

const createUsersTable = async () => {
    const command = new CreateTableCommand({
        TableName: "Usuarios",
        AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" } ],
        KeySchema: [ { AttributeName: "id", KeyType: "HASH" } ],
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
    });

    try {
        await client.send(command);
        console.log("Tabela 'Usuarios' processada.");
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log("Aviso: Tabela 'Usuarios' já existe.");
        } else {
            console.error("Erro ao criar tabela 'Usuarios':", error);
        }
    }
};

const createReservasTable = async () => {
    const command = new CreateTableCommand({
        TableName: "Reservas",
        AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" } ],
        KeySchema: [ { AttributeName: "id", KeyType: "HASH" } ],
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
    });

    try {
        await client.send(command);
        console.log("Tabela 'Reservas' processada.");
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log("Aviso: Tabela 'Reservas' já existe.");
        } else {
            console.error("Erro ao criar tabela 'Reservas':", error);
        }
    }
};

const run = async () => {
    console.log("-> Iniciando criação das tabelas...");
    await createUsersTable();
    await createReservasTable();
    console.log("-> Criação das tabelas finalizada.");
};

run();