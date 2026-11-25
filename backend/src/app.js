import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import routes from './routes.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

app.disable('x-powered-by');
if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);

app.use(requestLogger);
app.use(helmet());
app.use(
  cors({
    // Asal yang tidak terdaftar tidak mendapat header CORS, sehingga diblokir peramban.
    origin: (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin)),
  })
);

// Batas umum per alamat IP. Pembatas login yang lebih ketat ada di modul auth.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/v1/health',
    handler: (req, res, next) => next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi')),
  })
);

app.use(express.json({ limit: '200kb' }));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;