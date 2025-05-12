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
      passwordField: 'password',
      passReqToCallback: true // Pass request to callback
    },
    async (req: any, email: string, password: string, done: any) => {
      // For simplicity in this demo, we're only checking the specific email
      // In a real application, you would hash passwords and store them securely
      console.log('Local strategy authenticating with:', { email, requestBody: req.body });
      
      if (email === 'serasomatic@gmail.com') {
        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        
        if (existingUser) {
          console.log('Found existing user:', existingUser);
          return done(null, existingUser);
        }
        
        // Create new user if not exists
        try {
          console.log('Creating new user for email:', email);
          const newUser = await createLocalUser(email);
          console.log('New user created:', newUser);
          return done(null, newUser);
        } catch (error) {
          console.error('Error creating user:', error);
          return done(error);
        }
      } else {
        console.log('Email not recognized:', email);
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
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    console.log('Found user by email:', user);
    return user;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Create a new user with local authentication
 */
async function createLocalUser(email: string) {
  // Use a smaller ID that fits in PostgreSQL integer range (max 2147483647)
  const uniqueId = "999999";
  
  console.log(`Creating user with ID: ${uniqueId}`);
  
  // Username is required, extract from email
  const username = email.split('@')[0];
  
  // Create a new user with a dummy password for demo purposes
  // In production, you would hash the password
  const newUser = await storage.upsertUser({
    id: uniqueId,
    username: username,
    password: "dummy-password", // Set a password to satisfy the not-null constraint 
    email: email,
    firstName: username, // Simple default name
    lastName: '',
    profileImageUrl: '',
  });
  
  return newUser;
}