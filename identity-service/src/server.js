require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const routes = require('./routes/identity-service');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const PORT = process.env.PORT || 3001;

// connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        logger.info('Connected to MongoDB');
    })
    .catch((err) => {
        logger.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });

const redisClient = new Redis(process.env.REDIS_URL);

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info('%s %s', req.method, req.url);
    logger.info('Request body: %o', req.body);
    next();
});

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10,
    duration: 1,
});

app.use((req, res, next) => {
    rateLimiter
        .consume(req.ip)
        .then(() => {
            next();
        })
        .catch(() => {
            logger.warn('Too many requests from IP: %s', req.ip);
            res.status(429).json({ message: 'Too many requests' });
        });
});

// Ip based limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Too many requests to sensitive endpoint from IP: %s', req.ip);
        res.status(429).json({ message: 'Too many requests to this endpoint' });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});

// aply this sensitiveEndpointsLimiter to our routes
app.use('/api/auth/register', sensitiveEndpointsLimiter);
app.use('/api/auth/login', sensitiveEndpointsLimiter);

app.use('/api/auth', routes);

// error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`Identity service is running on port ${PORT}`);
});

// unhandle rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
