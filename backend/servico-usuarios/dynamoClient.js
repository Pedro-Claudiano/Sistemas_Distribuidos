// backend/servico-usuarios/dynamoClient.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const region = process.env.AWS_REGION;
const endpoint = process.env.DYNAMODB_ENDPOINT;

// Configuração do cliente base do DynamoDB
const dbClient = new DynamoDBClient({
    region,
    endpoint,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// O DocumentClient simplifica o trabalho com JSON. É a forma recomendada.
const docClient = DynamoDBDocumentClient.from(dbClient);

module.exports = docClient;