import 'express-session';

declare module 'express-session' {
  interface SessionData {
    pendingUser?: {
      email: string;
      type: 'login' | 'register';
    };
  }
}
