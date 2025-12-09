const amqp = require('amqplib');

let channel = null;
let connection = null;

const QUEUE_NAME = 'notifications';

// Conecta ao RabbitMQ
async function connectRabbitMQ() {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost';
      const rabbitmqUser = process.env.RABBITMQ_USER || 'admin';
      const rabbitmqPass = process.env.RABBITMQ_PASS || 'admin123';
      
      const url = `amqp://${rabbitmqUser}:${rabbitmqPass}@${rabbitmqHost}:5672`;
      
      console.log(`[RabbitMQ] Tentando conectar em: ${rabbitmqHost}...`);
      connection = await amqp.connect(url);
      channel = await connection.createChannel();
      
      // Garante que a fila existe
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      
      console.log(`[RabbitMQ] Conectado com sucesso! Fila '${QUEUE_NAME}' pronta.`);
      
      // Handlers para reconexão
      connection.on('error', (err) => {
        console.error('[RabbitMQ] Erro na conexão:', err.message);
      });
      
      connection.on('close', () => {
        console.warn('[RabbitMQ] Conexão fechada. Tentando reconectar em 5s...');
        setTimeout(connectRabbitMQ, 5000);
      });
      
      return;
    } catch (err) {
      retries++;
      console.error(`[RabbitMQ] Erro ao conectar (tentativa ${retries}/${maxRetries}):`, err.message);
      if (retries < maxRetries) {
        await new Promise(res => setTimeout(res, 5000));
      }
    }
  }
  
  console.error('[RabbitMQ] Falha ao conectar após várias tentativas.');
}

// Envia mensagem para a fila
async function sendNotification(notification) {
  try {
    if (!channel) {
      console.warn('[RabbitMQ] Canal não disponível. Tentando reconectar...');
      await connectRabbitMQ();
    }
    
    const message = JSON.stringify(notification);
    channel.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });
    console.log('[RabbitMQ] Notificação enviada:', notification);
  } catch (err) {
    console.error('[RabbitMQ] Erro ao enviar notificação:', err.message);
  }
}

// Consome mensagens da fila (para processar notificações)
async function startConsumer(onMessage) {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    
    console.log(`[RabbitMQ] Aguardando mensagens na fila '${QUEUE_NAME}'...`);
    
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg) {
        try {
          const notification = JSON.parse(msg.content.toString());
          console.log('[RabbitMQ] Mensagem recebida:', notification);
          
          // Processa a mensagem
          await onMessage(notification);
          
          // Confirma o processamento
          channel.ack(msg);
        } catch (err) {
          console.error('[RabbitMQ] Erro ao processar mensagem:', err.message);
          // Rejeita e não recoloca na fila
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (err) {
    console.error('[RabbitMQ] Erro ao iniciar consumer:', err.message);
  }
}

// Fecha a conexão
async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('[RabbitMQ] Conexão fechada com sucesso.');
  } catch (err) {
    console.error('[RabbitMQ] Erro ao fechar conexão:', err.message);
  }
}

module.exports = {
  connectRabbitMQ,
  sendNotification,
  startConsumer,
  closeRabbitMQ
};
