import session from 'express-session';
import { Express } from 'express';
import { pool } from '../db';
import connectPgSimple from 'connect-pg-simple';

const PgSession = connectPgSimple(session);

// Setup session storage with PostgreSQL
export function setupSession(app: Express) {
  // Make sure we have a session secret
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required for session management');
  }
  
  // Trust the first proxy (important for cookies in production behind Replit proxy)
  app.set('trust proxy', 1);

  // Configure session middleware
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: false, // Set to false for both dev and prod in Replit's environment
        sameSite: 'lax'
      }
    })
  );
}