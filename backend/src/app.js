import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;