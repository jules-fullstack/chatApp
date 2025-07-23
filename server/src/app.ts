import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import passport from 'passport';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import './types/index.js'; // Import types to extend Express Request

import connectDB from './config/database';
import routes from './routes';
import passportConfig from './config/passport';
import webSocketManager from './config/websocket';
import offlineNotificationService from './services/offlineNotificationService.js';

dotenv.config();

const app = express();

connectDB();

passportConfig(passport);

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI as string,
    mongoOptions: {},
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
  },
  rolling: true, // reset session expiry on activity
});

app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

// Initialize WebSocket with authentication
webSocketManager.init(app);

// Middleware to authenticate WebSocket connections
app.use('/api/chat', (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  next();
});

app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server is running' });
});

// Start periodic cleanup for offline notifications (every 10 minutes)
setInterval(() => {
  offlineNotificationService.cleanup();
}, 10 * 60 * 1000);

export default app;
