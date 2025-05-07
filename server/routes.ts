import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertAppointmentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes - all prefixed with /api
  
  // ===== Providers ===== //
  app.get("/api/providers", async (req: Request, res: Response) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ message: "Failed to retrieve providers" });
    }
  });
  
  // ===== Appointments ===== //
  
  // Get all appointments
  app.get("/api/appointments", async (req: Request, res: Response) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to retrieve appointments" });
    }
  });
  
  // Get a single appointment
  app.get("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Failed to retrieve appointment" });
    }
  });
  
  // Create a new appointment
  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      // Validate request body against schema
      const parsedData = insertAppointmentSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        const validationError = fromZodError(parsedData.error);
        return res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details 
        });
      }
      
      const newAppointment = await storage.createAppointment(parsedData.data);
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });
  
  // Update an appointment
  app.patch("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      // Partial validation - only validate fields that are included
      const partialSchema = insertAppointmentSchema.partial();
      const parsedData = partialSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        const validationError = fromZodError(parsedData.error);
        return res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details 
        });
      }
      
      const updatedAppointment = await storage.updateAppointment(id, parsedData.data);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });
  
  // Delete an appointment
  app.delete("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
