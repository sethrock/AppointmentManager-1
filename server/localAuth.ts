import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { db } from "./db";
import { Express, RequestHandler } from "express";

/**
 * Set up the local email/password authentication strategy
 */
export function setupLocalAuth(app: Express) {
  // Local strategy for email/password authentication
  passport.use('local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      // For simplicity in this demo, we're only checking the specific email
      // In a real application, you would hash passwords and store them securely
      if (email === 'serasomatic@gmail.com') {
        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        
        if (existingUser) {
          return done(null, existingUser);
        }
        
        // Create new user if not exists
        try {
          const newUser = await createLocalUser(email);
          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      } else {
        return done(null, false, { message: 'Invalid credentials' });
      }
    }
  ));
  
  // Add local auth routes
  app.post('/api/login/local', (req, res, next) => {
    console.log('Received login request:', req.body);
    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Authentication failed:', info);
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }
      
      console.log('User authenticated:', user);
      
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        
        console.log('Login successful');
        return res.json({ success: true });
      });
    })(req, res, next);
  });
}

/**
 * Get a user by email address
 */
async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

/**
 * Create a new user with local authentication
 */
async function createLocalUser(email: string) {
  // Use a numeric ID since that seems to be what the table expects
  const uniqueId = Date.now().toString();
  
  // Create a new user
  const newUser = await storage.upsertUser({
    id: uniqueId,
    email: email,
    firstName: email.split('@')[0], // Simple default name
    lastName: '',
    profileImageUrl: '',
  });
  
  return newUser;
}