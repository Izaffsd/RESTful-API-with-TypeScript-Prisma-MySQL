import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { response } from './utils/response.js';

const app = express()

// Secure HTTP headers & hide Express fingerprint
app.use(helmet())
app.use(morgan('dev'))
app.use(cors({
  origin: ['http://localhost:3000', 'https://devlopmentserver.com'], // dev server process.env.CORS_ORIGINS?
  credentials: true
}))
app.use(express.json())

app.use('/api', routes);

app.use(express.static('public'))

app.use((_req, res) => {
  response(res, 404, 'Resource not found', null, 'RESOURCE_NOT_FOUND_404')
});

app.use(errorHandler)

export default app;
