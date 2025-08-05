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
import { authRateLimitService } from './services/authRateLimitService.js';
import { config } from './config/index.js';

const app = express();

connectDB();

passportConfig(passport);

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.database.uri,
    mongoOptions: config.database.options,
    touchAfter: 24 * 3600, // lazy session update
  }),
  cookie: {
    secure: config.session.secure,
    httpOnly: config.session.httpOnly,
    maxAge: config.session.maxAge,
  },
  rolling: config.session.rolling,
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
setInterval(
  () => {
    offlineNotificationService.cleanup();
  },
  10 * 60 * 1000,
);

// Start periodic cleanup for rate limit records (every 15 minutes)
setInterval(
  () => {
    authRateLimitService.cleanupExpiredRecords()
      .catch(error => console.error('Rate limit cleanup error:', error));
  },
  15 * 60 * 1000,
);

export default app;
