const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_exchange";

async function connectionRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ and exchange created:", EXCHANGE_NAME);
    return channel;
  } catch (error) {
    logger.error("Error connecting to RabbitMQ:", error);
  }
}

async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await connectionRabbitMQ();
  }

  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);

  channel.consume(q.queue, (msg) => {
    if (msg.content) {
      const message = JSON.parse(msg.content.toString());
      callback(message);
      channel.ack(msg);
    }
  });

  logger.info(
    `Subscribed to exchange ${EXCHANGE_NAME} with routing key ${routingKey}`,
  );
}

module.exports = {
  connectionRabbitMQ,
  consumeEvent,
};
