import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertAppointmentSchema } from "@shared/schema";
import { handleNewAppointmentNotifications, handleAppointmentStatusNotifications } from "./services/notificationService";
import { testEmailSending, testCalendarConnection } from "./services/testService";
import { importAppointmentsFromJson, validateImportFile } from "./services/importService";
import { log } from "./vite";
import multer from "multer";
import path from "path";

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
      
      // Send notifications for the new appointment (async)
      handleNewAppointmentNotifications(newAppointment)
        .then(async (result) => {
          log(`Notifications processed for new appointment ${newAppointment.id}`, 'routes');
        })
        .catch(error => {
          log(`Error processing notifications for appointment ${newAppointment.id}: ${error}`, 'routes');
        });
      
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
      
      // Get the current appointment to track status changes
      const currentAppointment = await storage.getAppointment(id);
      if (!currentAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Store the previous status to detect changes
      const previousStatus = currentAppointment.dispositionStatus || null;
      
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
      
      // Handle notifications when disposition status changes
      if (parsedData.data.dispositionStatus && 
          parsedData.data.dispositionStatus !== previousStatus) {
        
        // Process notifications asynchronously to not block the response
        handleAppointmentStatusNotifications(updatedAppointment, previousStatus)
          .then(() => {
            log(`Status notifications processed for appointment ${id} (${previousStatus} -> ${updatedAppointment.dispositionStatus})`, 'routes');
          })
          .catch(error => {
            log(`Error processing status notifications for appointment ${id}: ${error}`, 'routes');
          });
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
  
  // ===== Import Data ===== //
  
  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Accept any file with .json extension regardless of mimetype
      if (file.originalname.toLowerCase().endsWith('.json')) {
        cb(null, true);
      } else {
        cb(new Error('Only JSON files are allowed'));
      }
    }
  });
  
  // Validate import file
  app.post("/api/import/validate", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
      
      const filePath = req.file.path;
      const result = await validateImportFile(filePath);
      
      res.json({
        message: `Validation completed. Valid: ${result.valid}, Invalid: ${result.invalid}`,
        ...result
      });
    } catch (error) {
      console.error("Error validating import file:", error);
      res.status(500).json({ 
        message: `Error validating import file: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Import appointments from file
  app.post("/api/import/appointments", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
      
      const filePath = req.file.path;
      const result = await importAppointmentsFromJson(filePath);
      
      res.json({
        message: `Import completed. Imported ${result.success} appointments, Failed: ${result.failed}`,
        ...result
      });
    } catch (error) {
      console.error("Error importing appointments:", error);
      res.status(500).json({ 
        message: `Error importing appointments: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // ===== Test Endpoints ===== //
  
  // Test email notification
  app.post("/api/test/email", async (req: Request, res: Response) => {
    try {
      const success = await testEmailSending();
      if (success) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully. Check the email address configured in NOTIFICATION_EMAIL." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test email. Check server logs for details." 
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error sending test email: ${error}` 
      });
    }
  });
  
  // Test Google Calendar connection
  app.post("/api/test/calendar", async (req: Request, res: Response) => {
    try {
      const success = await testCalendarConnection();
      if (success) {
        res.json({ 
          success: true, 
          message: "Successfully connected to Google Calendar API." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to connect to Google Calendar API. Check server logs for details or make sure GOOGLE_REFRESH_TOKEN is configured." 
        });
      }
    } catch (error) {
      console.error("Error testing calendar connection:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error testing calendar connection: ${error}` 
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
