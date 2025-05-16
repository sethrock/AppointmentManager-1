import { Request, Response, NextFunction } from "express";
import { compare, hash } from "bcrypt";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { storage } from "../storage";

// Extend Express Request type to include session with userId
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, SALT_ROUNDS);
}

// Function to compare a password with a hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await compare(password, hash);
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized' });
}

// Handler for user registration
export async function registerHandler(req: Request, res: Response) {
  try {
    // Validate request body
    const parsedData = insertUserSchema.safeParse(req.body);
    
    if (!parsedData.success) {
      const validationError = fromZodError(parsedData.error);
      return res.status(400).json({ 
        message: "Validation error",
        errors: validationError.details 
      });
    }
    
    const { username, email, password } = parsedData.data;
    
    // Check if user already exists
    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: "Email already in use" });
    }
    
    const existingUserByUsername = await storage.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: "Username already in use" });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword
    });
    
    // Set session
    req.session.userId = user.id;
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
}

// Handler for user login
export async function loginHandler(req: Request, res: Response) {
  try {
    // Validate request body
    const parsedData = loginSchema.safeParse(req.body);
    
    if (!parsedData.success) {
      const validationError = fromZodError(parsedData.error);
      return res.status(400).json({ 
        message: "Validation error",
        errors: validationError.details 
      });
    }
    
    const { email, password } = parsedData.data;
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Compare password
    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Set session
    req.session.userId = user.id;
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Failed to log in" });
  }
}

// Handler for user logout
export function logoutHandler(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error logging out:", err);
      return res.status(500).json({ message: "Failed to log out" });
    }
    
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out successfully" });
  });
}

// Handler to get the current user
export async function getCurrentUserHandler(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ message: "Failed to get current user" });
  }
}