const amqp = require('amqplib');

let channel = null;
let connection = null;
const QUEUE_NAME = 'notifications';

async function connect() {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const host = process.env.RABBITMQ_HOST || 'localhost';
      const user = process.env.RABBITMQ_USER || 'admin';
      const pass = process.env.RABBITMQ_PASS || 'admin123';
      const url = `amqp://${user}:${pass}@${host}:5672`;

      console.log(`[RabbitMQ] Connecting to ${host}...`);
      connection = await amqp.connect(url);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      console.log(`[RabbitMQ] Connected. Queue '${QUEUE_NAME}' ready`);

      connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err.message);
      });

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed. Reconnecting in 5s...');
        setTimeout(connect, 5000);
      });

      return;
    } catch (err) {
      retries++;
      console.error(`[RabbitMQ] Connection failed (${retries}/${maxRetries}):`, err.message);
      if (retries < maxRetries) {
        await new Promise(res => setTimeout(res, 5000));
      }
    }
  }

  console.error('[RabbitMQ] Failed to connect after multiple attempts');
}

async function sendNotification(notification) {
  try {
    if (!channel) {
      console.warn('[RabbitMQ] Channel unavailable. Reconnecting...');
      await connect();
    }

    const message = JSON.stringify(notification);
    channel.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });
    console.log('[RabbitMQ] Notification sent:', notification);
  } catch (err) {
    console.error('[RabbitMQ] Error sending notification:', err.message);
  }
}

async function startConsumer(onMessage) {
  try {
    if (!channel) await connect();

    console.log(`[RabbitMQ] Waiting for messages in queue '${QUEUE_NAME}'...`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg) {
        try {
          const notification = JSON.parse(msg.content.toString());
          console.log('[RabbitMQ] Message received:', notification);
          await onMessage(notification);
          channel.ack(msg);
        } catch (err) {
          console.error('[RabbitMQ] Error processing message:', err.message);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (err) {
    console.error('[RabbitMQ] Error starting consumer:', err.message);
  }
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('[RabbitMQ] Connection closed');
  } catch (err) {
    console.error('[RabbitMQ] Error closing connection:', err.message);
  }
}

module.exports = { connect, sendNotification, startConsumer, close };
