import express, { Request, Response, NextFunction, Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
// import xss from 'xss-clean';
import hpp from 'hpp';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import societyRoutes from './routes/societyRoutes';
import houseRoutes from './routes/houseRoutes';
import electionRoutes from './routes/electionRoutes';
import voteRoutes from './routes/voteRoutes';
import resultRoutes from './routes/resultRoutes';
import grievanceRoutes from './routes/grievanceRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import webhookRoutes from './routes/webhookRoutes';

// Define error interface
interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

const app: Application = express();

// GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());
app.set('trust proxy', 1 /* number of proxies between user and server */)

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Enable CORS - Configure this before rate limiter and routes
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3002'], // Allow your frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Specify allowed methods
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'], // Specify allowed headers
  credentials: true // Allow cookies to be sent with requests
}));

// Rate limiting
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);
app.use('/api/webhooks', webhookRoutes);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
// app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: ['type', 'status', 'house', 'society']
}));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/admin/auth', adminAuthRoutes);
app.use('/api/status', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running'
  });
});

// 404 Not Found handler
app.all('*', (req: Request, res: Response) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
});

export default app;
