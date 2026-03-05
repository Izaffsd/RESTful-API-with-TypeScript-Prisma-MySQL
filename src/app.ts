import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';

const app = express()

app.use(morgan('dev'))
app.use(cors({
  origin: ['http://localhost:3000', 'https://devlopmentserver.com'], // dev server process.env.CORS_ORIGINS?
  credentials: true
}))
app.use(express.json())

app.use('/api', routes);

app.use(express.static('public'))

app.use((_req, res) => {
  res.status(404).json({
    statusCode: 404,
    success: false,
    message: 'Resource not found',
    errorCode: 'RESOURCE_NOT_FOUND_404',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler)

export default app;
